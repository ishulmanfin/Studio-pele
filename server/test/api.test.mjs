// Run: node --test server/test/   (no network; ElevenLabs is a local stub)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createApp, ilDay } from '../yalla-api.mjs';
import { hmac } from '../lib/billing.mjs';
import { entitled } from '../lib/plans.mjs';

let eleven, elevenUrl, durations = {};
const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));
before(async () => {
  let n = 0;
  eleven = http.createServer((req, res) => {
    if (req.url.startsWith('/v1/convai/conversation/token')) { res.end(JSON.stringify({ token: 'tok', conversation_id: `c${++n}` })); return; }
    const m = req.url.match(/conversations\/(c\d+)/);
    if (m && m[1] in durations) { res.end(JSON.stringify({ status: 'done', metadata: { call_duration_secs: durations[m[1]] } })); return; }
    res.writeHead(404); res.end('{}');
  });
  elevenUrl = await listen(eleven);
});
after(() => eleven.close());

async function boot(extra = {}) {
  const dir = mkdtempSync(`${tmpdir()}/yk-`);
  const env = { DATA_DIR: dir, ELEVENLABS_AGENT_KEY: 'k', MIKA_AGENT_ID: 'agent', ELEVEN_API: elevenUrl, LIVE_TALK_ENABLED: '1',
    COOKIE_INSECURE: '1', ADMIN_TOKEN: 'adm', BILLING_WEBHOOK_SECRET: 'whsec', ...extra };
  const app = createApp(env);
  const base = await listen(app.server), adminBase = await listen(app.adminServer);
  let cookie = '';
  const req = async (method, path, body, hdrs = {}) => {
    const r = await fetch(base + path, { method, redirect: 'manual', headers: { 'content-type': 'application/json', ...(cookie && { cookie }), ...hdrs }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0].endsWith('=') ? '' : sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, body: j, headers: r.headers };
  };
  const adm = async (path, body) => (await fetch(adminBase + path, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer adm', 'content-type': 'application/json' }, body: body && JSON.stringify(body) })).json();
  const stop = () => { app.close(); app.server.close(); app.adminServer.close(); };
  return { req, adm, stop, dir, app, env, adminUrl: adminBase, setCookie: (c) => { cookie = c; }, getCookie: () => cookie };
}
const SIGNUP = { email: 'Parent@Example.com', password: 'correct horse', acceptTerms: true, parentAdult: true };

test('sign-up needs consent, valid email and a real password; email is case-insensitive', async () => {
  const s = await boot();
  assert.equal((await s.req('POST', '/api/account/signup', { ...SIGNUP, acceptTerms: false })).body.error, 'consent_required');
  assert.equal((await s.req('POST', '/api/account/signup', { ...SIGNUP, password: 'short' })).body.error, 'weak_password');
  assert.equal((await s.req('POST', '/api/account/signup', { ...SIGNUP, email: 'nope' })).body.error, 'bad_email');
  const r = await s.req('POST', '/api/account/signup', SIGNUP);
  assert.equal(r.status, 201); assert.equal(r.body.email, 'parent@example.com'); assert.equal(r.body.liveTalk, false);
  assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.equal((await s.req('POST', '/api/account/signup', { ...SIGNUP, email: 'PARENT@example.com' })).status, 409);
  const db = JSON.parse(readFileSync(`${s.dir}/accounts.json`, 'utf8'));
  assert.ok(!JSON.stringify(db).includes('correct horse'), 'password is never stored');
  s.stop();
});

test('login, logout, wrong password, and brute-force lockout', async () => {
  const s = await boot();
  await s.req('POST', '/api/account/signup', SIGNUP);
  await s.req('POST', '/api/account/logout', {});
  assert.equal((await s.req('GET', '/api/account/me')).status, 401);
  assert.equal((await s.req('POST', '/api/account/login', { email: SIGNUP.email, password: 'wrong pass' })).status, 401);
  assert.equal((await s.req('POST', '/api/account/login', { email: 'nobody@x.com', password: 'whatever1' })).status, 401);
  assert.equal((await s.req('POST', '/api/account/login', { email: SIGNUP.email, password: SIGNUP.password })).status, 200);
  assert.equal((await s.req('GET', '/api/account/me')).body.email, 'parent@example.com');
  for (let i = 0; i < 5; i++) await s.req('POST', '/api/account/login', { email: SIGNUP.email, password: 'wrong pass' });
  assert.equal((await s.req('POST', '/api/account/login', { email: SIGNUP.email, password: SIGNUP.password })).status, 429);
  s.stop();
});

test('cross-site posts and form posts are refused', async () => {
  const s = await boot();
  assert.equal((await s.req('POST', '/api/account/signup', SIGNUP, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await s.req('POST', '/api/account/signup', 'email=a', { 'content-type': 'application/x-www-form-urlencoded' })).status, 403);
  s.stop();
});

test('live talk needs a subscription AND the parent switch; then caps 3 min/day', async () => {
  const s = await boot();
  assert.equal((await s.req('GET', '/api/mika-session')).status, 401);
  await s.req('POST', '/api/account/signup', SIGNUP);
  assert.equal((await s.req('GET', '/api/mika-session')).body.error, 'subscription_required');
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, password: SIGNUP.password })).body.error, 'no_plan');
  const { codes } = await s.adm('/pilot-codes', { count: 2 });
  assert.equal((await s.req('POST', '/api/pilot/redeem', { code: 'YALLA-NOPE' })).status, 404);
  const red = await s.req('POST', '/api/pilot/redeem', { code: codes[0].toLowerCase() });
  assert.equal(red.status, 200); assert.equal(red.body.subscription.status, 'pilot'); assert.equal(red.body.entitled, true);
  assert.equal((await s.req('GET', '/api/mika-session')).body.error, 'parent_consent_required');
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true })).status, 401, 'password needed to switch on');
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, password: 'wrong pass' })).status, 401);
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, password: SIGNUP.password })).body.liveTalk, true);
  const ok = await s.req('GET', '/api/mika-session');
  assert.equal(ok.status, 200); assert.equal(ok.body.token, 'tok'); assert.equal(ok.body.maxSec, 180);
  const again = await s.req('GET', '/api/mika-session');   // still in progress at ElevenLabs: retry, not "tomorrow"
  assert.equal(again.body.error, 'please wait'); assert.equal(again.body.retryAfterSec, 20);
  durations.c1 = 20;                                       // the call ended after 20 s
  const third = await s.req('GET', '/api/mika-session');
  assert.equal(third.status, 200); assert.equal(third.body.maxSec, 150);
  durations.c2 = 150; durations.c1 = 20;
  assert.equal((await s.req('GET', '/api/mika-session')).body.error, 'daily limit');
  const me = (await s.req('GET', '/api/account/me')).body;
  assert.deepEqual([me.liveTalkUsage.todayMin, me.liveTalkUsage.dayCapMin, me.liveTalkUsage.monthCapMin], [2.83, 3, 30]);
  // A used code cannot be used again, even by another family.
  await s.req('POST', '/api/account/logout', {});
  await s.req('POST', '/api/account/signup', { ...SIGNUP, email: 'b@example.com' });
  assert.equal((await s.req('POST', '/api/pilot/redeem', { code: codes[0] })).status, 404);
  s.stop();
});

test('a short real call frees the rest of the day; the month cap holds at 30 min', async () => {
  const s = await boot();
  await s.req('POST', '/api/account/signup', SIGNUP);
  await s.adm('/grant', { email: SIGNUP.email, plan: 'monthly' });
  await s.req('POST', '/api/account/live-talk', { enabled: true, password: SIGNUP.password });
  const aid = Object.keys(s.app.db.accounts)[0];
  // Seed the log: earlier this month 28.5 minutes, plus a call today that really lasted 60 s.
  const old = new Date(Date.now() - 20 * 60e3).toISOString();
  const lines = [];
  const earlier = new Date(Date.now() - 864e5);
  if (ilDay(earlier).slice(0, 7) === ilDay().slice(0, 7)) for (let i = 0; i < 9; i++) lines.push({ t: earlier.toISOString(), who: `a:${aid}`, min: 3 });
  lines.push({ t: old, who: `a:${aid}`, min: 3, cid: 'c900' });
  durations.c900 = 60;
  writeFileSync(`${s.dir}/sessions.jsonl`, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  const r = await s.req('GET', '/api/mika-session');
  if (lines.length > 1) { // 27 + 1 used: 2 min left in the month, below today's 2 min left too
    assert.equal(r.status, 200); assert.equal(r.body.maxSec, 120);
    assert.equal((await s.req('GET', '/api/mika-session')).body.error, 'monthly limit');
  } else {               // first day of the month: only the daily rule applies (1 used, 2 left)
    assert.equal(r.status, 200); assert.equal(r.body.maxSec, 120);
    assert.equal((await s.req('GET', '/api/mika-session')).body.error, 'daily limit');
  }
  s.stop();
});

test('charging is closed by default; nothing can be bought', async () => {
  const s = await boot();
  await s.req('POST', '/api/account/signup', SIGNUP);
  assert.equal((await s.req('GET', '/api/plans')).body.billingOpen, false);
  assert.equal((await s.req('POST', '/api/billing/checkout', { plan: 'monthly' })).body.error, 'billing_closed');
  assert.equal((await s.req('GET', '/api/billing/mock/pay?ref=x')).status, 404);
  s.stop();
});

test('full paid flow with the mock provider: checkout, pay, cancel keeps access to period end', async () => {
  const s = await boot({ BILLING_ENABLED: '1', MOCK_PAY: '1' });
  await s.req('POST', '/api/account/signup', SIGNUP);
  assert.equal((await s.req('POST', '/api/billing/checkout', { plan: 'pilot' })).body.error, 'bad_plan');
  const co = await s.req('POST', '/api/billing/checkout', { plan: 'yearly' });
  assert.equal(co.status, 200);
  const pay = await s.req('GET', co.body.url);
  assert.equal(pay.status, 302);
  let me = (await s.req('GET', '/api/account/me')).body;
  assert.equal(me.subscription.plan, 'yearly'); assert.equal(me.subscription.status, 'active'); assert.equal(me.entitled, true);
  const days = (Date.parse(me.subscription.periodEnd) - Date.now()) / 864e5; assert.ok(days > 364 && days <= 365);
  assert.equal((await s.req('GET', co.body.url)).status, 404, 'a checkout pays only once');
  assert.equal((await s.req('POST', '/api/billing/checkout', { plan: 'monthly' })).body.error, 'already_subscribed');
  me = (await s.req('POST', '/api/billing/cancel', {})).body;
  assert.equal(me.subscription.status, 'canceled'); assert.equal(me.subscription.cancelAtPeriodEnd, true); assert.equal(me.entitled, true);
  s.stop();
});

test('webhooks: bad signature refused, renewal extends, failure has 3-day grace, events are idempotent', async () => {
  const s = await boot({ BILLING_ENABLED: '1', MOCK_PAY: '1' });
  await s.req('POST', '/api/account/signup', SIGNUP);
  const co = await s.req('POST', '/api/billing/checkout', { plan: 'monthly' });
  const ref = new URL(co.body.url, 'http://x').searchParams.get('ref');
  const hook = (ev, sig) => { const raw = JSON.stringify(ev); return s.req('POST', '/api/billing/webhook/mock', raw, { 'x-signature': sig ?? hmac('whsec', raw), cookie: '' }); };
  assert.equal((await hook({ id: 'e1', type: 'paid', ref }, 'bad')).status, 401);
  assert.equal((await hook({ id: 'e1', type: 'paid', ref, providerRef: 'sub_1' })).body.ok, true);
  const end1 = Date.parse((await s.req('GET', '/api/account/me')).body.subscription.periodEnd);
  assert.equal((await hook({ id: 'e1', type: 'paid', ref, providerRef: 'sub_1' })).body.duplicate, true);
  await hook({ id: 'e2', type: 'paid', providerRef: 'sub_1' });          // renewal, matched by provider ref
  const end2 = Date.parse((await s.req('GET', '/api/account/me')).body.subscription.periodEnd);
  assert.ok(Math.abs(end2 - end1 - 30 * 864e5) < 5000);
  await hook({ id: 'e3', type: 'failed', providerRef: 'sub_1' });
  assert.equal((await s.req('GET', '/api/account/me')).body.subscription.status, 'past_due');
  assert.equal(entitled({ status: 'past_due', periodEnd: new Date(Date.now() - 2 * 864e5).toISOString() }), true);
  assert.equal(entitled({ status: 'past_due', periodEnd: new Date(Date.now() - 4 * 864e5).toISOString() }), false);
  assert.equal(entitled({ status: 'canceled', periodEnd: new Date(Date.now() - 1000).toISOString() }), false);
  s.stop();
});

test('delete account removes the parent data and signs out', async () => {
  const s = await boot();
  await s.req('POST', '/api/account/signup', SIGNUP);
  assert.equal((await s.req('POST', '/api/account/delete', { password: 'wrong pass' })).status, 401);
  assert.equal((await s.req('POST', '/api/account/delete', { password: SIGNUP.password })).status, 200);
  assert.equal((await s.req('GET', '/api/account/me')).status, 401);
  assert.ok(!readFileSync(`${s.dir}/accounts.json`, 'utf8').includes('parent@example.com'));
  s.stop();
});

test('password change signs out other devices; admin reset works', async () => {
  const s = await boot();
  await s.req('POST', '/api/account/signup', SIGNUP);
  const other = s.getCookie();
  await s.req('POST', '/api/account/password', { oldPassword: SIGNUP.password, newPassword: 'new password 1' });
  const mine = s.getCookie();
  s.setCookie(other); assert.equal((await s.req('GET', '/api/account/me')).status, 401);
  s.setCookie(mine); assert.equal((await s.req('GET', '/api/account/me')).status, 200);
  const { tempPassword } = await s.adm('/reset-password', { email: SIGNUP.email });
  assert.equal((await s.req('POST', '/api/account/login', { email: SIGNUP.email, password: tempPassword })).status, 200);
  s.stop();
});

test('admin port refuses requests without the token; legacy family login still works when switched on', async () => {
  const s = await boot({ LEGACY_FAMILY_LOGIN: '1', LOGIN_DAY_MIN: '3' });
  assert.equal((await fetch(s.adminUrl + '/accounts')).status, 401);
  const basic = { authorization: 'Basic ' + Buffer.from('yalla:pw').toString('base64') };
  const r = await s.req('GET', '/api/mika-session', undefined, basic);
  assert.equal(r.status, 200);
  assert.equal((await s.req('GET', '/api/mika-session', undefined, basic)).body.error, 'please wait', 'call not reported ended yet');
  s.stop();
  const t = await boot();
  assert.equal((await t.req('GET', '/api/mika-session', undefined, basic)).status, 401, 'no legacy by default');
  t.stop();
});

test('retention: audit older than 90 days and minutes older than 12 months are deleted', async () => {
  const s = await boot();
  const old = (d) => new Date(Date.now() - d * 864e5).toISOString();
  writeFileSync(`${s.dir}/audit.jsonl`, [old(100), old(10)].map((t) => JSON.stringify({ t, ev: 'x' })).join('\n') + '\n');
  writeFileSync(`${s.dir}/sessions.jsonl`, [[old(400), 'c1'], [old(100), 'c2']].map(([t, cid]) => JSON.stringify({ t, who: 'a:x', min: 3, cid })).join('\n') + '\n');
  writeFileSync(`${s.dir}/reconciled.json`, '{"c1":1,"c2":2}');
  s.stop();
  const t = await boot({ DATA_DIR: s.dir });   // prune runs at start
  assert.equal(readFileSync(`${s.dir}/audit.jsonl`, 'utf8').trim().split('\n').length, 1);
  assert.ok(!readFileSync(`${s.dir}/sessions.jsonl`, 'utf8').includes('c1'));
  assert.deepEqual(JSON.parse(readFileSync(`${s.dir}/reconciled.json`, 'utf8')), { c2: 2 });
  t.stop();
});

test('signup limit counts only complete forms and uses the address Caddy appended', async () => {
  const s = await boot();
  for (let i = 0; i < 8; i++) await s.req('POST', '/api/account/signup', { ...SIGNUP, password: 'x' }, { 'x-forwarded-for': '9.9.9.9' });
  for (let i = 0; i < 5; i++) assert.equal((await s.req('POST', '/api/account/signup', { ...SIGNUP, email: `p${i}@example.com` }, { 'x-forwarded-for': `${i}.1.1.1, 9.9.9.9` })).status, 201);
  assert.equal((await s.req('POST', '/api/account/signup', { ...SIGNUP, email: 'p9@example.com' }, { 'x-forwarded-for': '7.7.7.7, 9.9.9.9' })).body.error, 'too_many_signups');
  s.stop();
});
