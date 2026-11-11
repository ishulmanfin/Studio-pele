// Run: node --test server/test/support.test.mjs   (no network)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createApp } from '../yalla-api.mjs';
import { createSupport, scrub, cleanDiag } from '../lib/support.mjs';

const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));
async function boot(t) {
  const dir = mkdtempSync(`${tmpdir()}/yks-`);
  const app = createApp({ DATA_DIR: dir, COOKIE_INSECURE: '1', ADMIN_TOKEN: 'adm', SMS_DEV_ECHO: '1' });
  const base = await listen(app.server), adminBase = await listen(app.adminServer);
  let cookie = '';
  const req = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(cookie && { cookie }) }, body: body && JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const adm = async (path, body) => { const r = await fetch(adminBase + path, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer adm', 'content-type': 'application/json' }, body: body && JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  const signIn = async (phone = '0541112222') => { const c = await req('POST', '/api/auth/code', { phone }); return req('POST', '/api/auth/verify', { phone, code: c.body.devCode, acceptTerms: true, parentAdult: true }); };
  const stop = () => { app.close(); app.server.close(); app.adminServer.close(); };
  t?.after(stop);
  return { req, adm, signIn, dir, stop, newSession: () => { cookie = ''; } };
}

test('scrub removes personal details a parent may paste', () => {
  const s = scrub('call me 050-123-4567 or mail a.b@x.co.il, id 123456789, card 4580 1234 5678 9012');
  assert.doesNotMatch(s, /4567|a\.b@|123456789|9012/);
  assert.match(s, /\[טלפון הוסר\]/);
});

test('diagnostics keep only technical whitelisted fields', () => {
  const d = cleanDiag({ os: 'iOS', mic: 'denied', childName: 'Noa', email: 'p@x.com', errors: ['fail at https://x.y/z?u=1 for p@x.com'], fixes: ['cache', 'rm -rf'] });
  assert.equal(d.childName, undefined); assert.equal(d.email, undefined);
  assert.doesNotMatch(d.errors[0], /x\.y|p@x/); assert.deepEqual(d.fixes, ['cache']);
});

test('parent ticket flow: diagnostics, ticket, team reply, rating, owner overview', async (t0) => {
  const s = await boot(t0);
  assert.equal((await s.req('GET', '/api/support/status')).status, 200, 'status is public');
  assert.equal((await s.req('GET', '/api/support/tickets')).status, 401);
  await s.signIn();
  const d = await s.req('POST', '/api/support/diagnostics', { os: 'iOS', mic: 'denied', online: true, apiOk: true, standalone: false });
  assert.equal(d.status, 201); assert.ok(d.body.hints.includes('mic_denied')); assert.ok(d.body.hints.includes('ios_add_to_home'));
  assert.equal((await s.req('POST', '/api/support/tickets', { topic: 'sound', text: '  ' })).status, 400);
  const t = await s.req('POST', '/api/support/tickets', { topic: 'sound', text: 'אין קול. הטלפון שלי 0521234567', diagId: d.body.diagId });
  assert.equal(t.status, 201); assert.doesNotMatch(t.body.msgs[0].text, /0521234567/);
  const list = await s.adm('/support/tickets?state=open');
  assert.equal(list.body.tickets.length, 1); assert.equal(list.body.tickets[0].family.phone, '054-***-2222');
  const full = await s.adm(`/support/tickets/${t.body.id}`);
  assert.equal(full.body.diag.mic, 'denied'); assert.ok(full.body.timeline.some((e) => e.ev === 'diagnostics'));
  await s.adm(`/support/tickets/${t.body.id}/note`, { text: 'internal only' });
  await s.adm(`/support/tickets/${t.body.id}/reply`, { text: 'נסו לאשר מיקרופון בהגדרות' });
  const mine = await s.req('GET', '/api/support/tickets');
  assert.equal(mine.body.tickets[0].state, 'waiting'); assert.equal(mine.body.tickets[0].unread, true);
  assert.equal(mine.body.tickets[0].msgs.length, 2, 'internal notes stay hidden from the parent');
  assert.equal((await s.req('POST', `/api/support/tickets/${t.body.id}/rate`, { score: 5 })).status, 200);
  const ov = await s.adm('/support/overview');
  assert.equal(ov.body.csat, 5); assert.equal(ov.body.medianFirstReplyMin, 0);
  assert.equal((await s.adm('/support/action', { ticket: t.body.id, action: 'grant_days', days: 7 })).status, 200);
  assert.ok((await s.adm(`/support/tickets/${t.body.id}`)).body.family.periodEnd, 'grant started a plan');
  assert.equal((await s.adm('/support/action', { ticket: t.body.id, action: 'pause' })).status, 501, 'pause is not offered by the host');
  assert.equal((await s.adm('/support/nothing')).status, 404);
  s.newSession(); await s.signIn('0549998888');
  assert.equal((await s.req('GET', `/api/support/tickets/${t.body.id}`)).status, 404, 'another family cannot read it');
});

test('cancel intent records the reason and offers help', async (t0) => {
  const s = await boot(t0); await s.signIn();
  const r = await s.req('POST', '/api/support/cancel-intent', { reason: 'tech' });
  assert.ok(r.body.offers.some((o) => o.id === 'help'));
  assert.equal((await s.adm('/support/overview')).body.cancelReasons30d.tech, 1);
});

test('proactive care: once a week per kind, compensates, notifies, and forget() wipes the family', async () => {
  const dir = mkdtempSync(`${tmpdir()}/yks-`); const sent = [], comp = [];
  const sup = createSupport({ dir, facts: (aid) => ({ id: aid }), sendSms: (aid, text) => sent.push([aid, text]), compensate: (aid) => comp.push(aid) });
  const t = sup.care('acc_1', 'live_talk_failed');
  assert.ok(t); assert.equal(t.state, 'waiting'); assert.deepEqual(comp, ['acc_1']); assert.equal(sent.length, 1);
  assert.equal(sup.care('acc_1', 'live_talk_failed'), null, 'cool-down');
  sup.forget('acc_1');
  assert.equal(Object.keys(JSON.parse(readFileSync(`${dir}/support.json`, 'utf8')).tickets).length, 0);
});
