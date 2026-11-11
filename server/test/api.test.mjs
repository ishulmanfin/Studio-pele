// Run: node --test server/test/   (no network; ElevenLabs is a local stub)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createApp, ilDay } from '../yalla-api.mjs';
import { hmac } from '../lib/billing.mjs';
import { createHmac } from 'node:crypto';
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
    COOKIE_INSECURE: '1', ADMIN_TOKEN: 'adm', SMS_DEV_ECHO: '1', BILLING_WEBHOOK_SECRET: 'whsec', ...extra };
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

test('phone sign-in: SMS code, consent for new parents, step-up code for live talk and delete', async () => {
  const s = await boot();
  assert.equal((await s.req('POST', '/api/auth/code', { phone: '03-1234567' })).body.error, 'bad_phone');
  const c1 = await s.req('POST', '/api/auth/code', { phone: '050-123 4567' });
  assert.equal(c1.status, 200); assert.match(c1.body.devCode, /^\d{6}$/);
  assert.equal((await s.req('POST', '/api/auth/code', { phone: '+972501234567' })).body.error, 'too_many', 'resend waits 60 s');
  const wrong = c1.body.devCode === '000000' ? '111111' : '000000';
  assert.equal((await s.req('POST', '/api/auth/verify', { phone: '0501234567', code: wrong })).body.error, 'bad_code');
  assert.equal((await s.req('POST', '/api/auth/verify', { phone: '0501234567', code: c1.body.devCode })).body.error, 'consent_required');
  const v = await s.req('POST', '/api/auth/verify', { phone: '0501234567', code: c1.body.devCode, acceptTerms: true, parentAdult: true });
  assert.equal(v.status, 201); assert.equal(v.body.phone, '050-***-4567');
  assert.equal((await s.req('POST', '/api/auth/verify', { phone: '0501234567', code: c1.body.devCode, acceptTerms: true, parentAdult: true })).body.error, 'code_expired', 'a code works once');
  await s.adm('/grant', { phone: '0501234567', plan: 'pilot' });
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, code: '123456' })).body.error, 'code_expired', 'no code was sent yet');
  const cc = await s.req('POST', '/api/account/confirm-code', {});
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, code: cc.body.devCode === '000000' ? '111111' : '000000' })).body.error, 'bad_code');
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, code: cc.body.devCode })).body.liveTalk, true);
  s.stop();
  // Five wrong codes burn the code.
  const t = await boot();
  const k = await t.req('POST', '/api/auth/code', { phone: '0529999999' });
  const bad = k.body.devCode === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) await t.req('POST', '/api/auth/verify', { phone: '0529999999', code: bad });
  assert.equal((await t.req('POST', '/api/auth/verify', { phone: '0529999999', code: k.body.devCode })).body.error, 'code_expired');
  t.stop();
});

test('phone account: stored in E.164; admin finds it by phone', async () => {
  const s = await boot();
  const signIn = async (extra = {}) => { const c = await s.req('POST', '/api/auth/code', { phone: '0541112222' }); return s.req('POST', '/api/auth/verify', { phone: '0541112222', code: c.body.devCode, ...extra }); };
  assert.equal((await signIn({ acceptTerms: true, parentAdult: true })).status, 201);
  await s.req('POST', '/api/account/logout', {});
  const acc = (await s.adm('/accounts')).accounts[0]; assert.equal(acc.phone, '+972541112222');
  s.stop();
});

test('support hooks: compensate adds 3 minutes today, grantDays extends, health', async () => {
  const s = await boot();
  const c = await s.req('POST', '/api/auth/code', { phone: '0533334444' });
  await s.req('POST', '/api/auth/verify', { phone: '0533334444', code: c.body.devCode, acceptTerms: true, parentAdult: true });
  await s.adm('/grant', { phone: '0533334444', plan: 'pilot' });
  const cc = await s.req('POST', '/api/account/confirm-code', {});
  await s.req('POST', '/api/account/live-talk', { enabled: true, code: cc.body.devCode });
  durations.c_dummy = 0;
  const first = await s.req('GET', '/api/mika-session'); assert.equal(first.status, 200);
  const blocked = await s.req('GET', '/api/mika-session'); assert.equal(blocked.status, 429);
  // The hooks are exercised directly through a fake support module surface.
  const aid = Object.keys(s.app.db.accounts)[0];
  assert.equal(s.app.hooks.compensate(aid), true);
  assert.equal((await s.req('GET', '/api/account/me')).body.liveTalkUsage.dayCapMin, 6);
  const before = Date.parse(s.app.db.accounts[aid].sub.periodEnd);
  const after = Date.parse(s.app.hooks.grantDays(aid, 7));
  assert.ok(Math.abs(after - before - 7 * 864e5) < 5000);
  assert.deepEqual(s.app.hooks.health(), { api: true, liveTalk: true, billing: false, whatsapp: false });
  s.stop();
});

test('WhatsApp reverse sign-in: parent sends the code, signed webhook links the phone; confirm for live talk', async () => {
  const s = await boot({ WA_NUMBER: '+972 3 000 0000', WA_APP_SECRET: 'appsec', WA_VERIFY_TOKEN: 'vt' });
  assert.equal((await s.req('GET', '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=42')).status, 200);
  const st = await s.req('POST', '/api/auth/wa/start', {});
  assert.equal(st.status, 200); assert.match(st.body.code, /^YK-[A-Z0-9]{8}$/);
  assert.ok(st.body.waLink.startsWith('https://wa.me/97230000000?text='));
  assert.equal((await s.req('POST', '/api/auth/wa/finish', { code: st.body.code, secret: st.body.secret })).status, 202);
  const hook = (from, text, sig) => { const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from, type: 'text', text: { body: text } }] } }] }] });
    return s.req('POST', '/api/whatsapp/webhook', raw, { 'x-hub-signature-256': sig ?? 'sha256=' + createHmac('sha256', 'appsec').update(raw).digest('hex'), cookie: '' }); };
  assert.equal((await hook('972501112233', `כניסה: ${st.body.code}`, 'sha256=bad')).status, 401);
  assert.equal((await hook('972501112233', `כניסה ל-YALLA KIDS: ${st.body.code.toLowerCase()}`)).status, 200);
  assert.equal((await s.req('POST', '/api/auth/wa/finish', { code: st.body.code, secret: 'wrong' })).status, 404, 'only the browser that started it');
  assert.equal((await s.req('POST', '/api/auth/wa/finish', { code: st.body.code, secret: st.body.secret })).body.error, 'consent_required');
  const done = await s.req('POST', '/api/auth/wa/finish', { code: st.body.code, secret: st.body.secret, acceptTerms: true, parentAdult: true });
  assert.equal(done.status, 201); assert.equal(done.body.phone, '050-***-2233');
  assert.equal((await s.req('POST', '/api/auth/wa/finish', { code: st.body.code, secret: st.body.secret })).status, 410, 'used once');
  await s.adm('/grant', { phone: '0501112233', plan: 'pilot' });
  const cf = await s.req('POST', '/api/account/confirm-wa', {});
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, waCode: cf.body.code, waSecret: cf.body.secret })).body.error, 'not_confirmed_yet');
  await hook('972529999999', cf.body.code);   // someone else's phone: ignored
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, waCode: cf.body.code, waSecret: cf.body.secret })).body.error, 'not_confirmed_yet');
  await hook('972501112233', cf.body.code);
  assert.equal((await s.req('POST', '/api/account/live-talk', { enabled: true, waCode: cf.body.code, waSecret: cf.body.secret })).body.liveTalk, true);
  s.stop();
  const t = await boot();
  assert.equal((await t.req('POST', '/api/auth/wa/start', {})).body.error, 'wa_unavailable');
  t.stop();
});

test('Grow: hosted page, secret-key callback, processId match, renewal, failure, cancel stops the standing order', async () => {
  const calls = [];
  const grow = http.createServer(async (req, res) => {
    let raw = ''; for await (const c of req) raw += c;
    const f = Object.fromEntries(new URLSearchParams(raw)); const method = req.url.split('/').pop(); calls.push({ method, f });
    const data = method === 'createPaymentProcess' ? { processId: 777, processToken: 'pt', url: 'https://pay.example/p/777' } : {};
    res.end(JSON.stringify({ status: 1, err: '', data }));
  });
  const growUrl = await listen(grow);
  const s = await boot({ BILLING_ENABLED: '1', BILLING_PROVIDER: 'grow', GROW_API_BASE: growUrl, GROW_USER_ID: 'u1',
    GROW_PAGE_CODE_RECURRING: 'rec', GROW_PAGE_CODE_ONETIME: 'one', GROW_WEBHOOK_KEY: 'gk', PUBLIC_URL: 'https://yalla.example' });
  try {
    await s.req('POST', '/api/account/signup', SIGNUP);
    assert.equal((await s.req('GET', '/api/plans')).body.needsName, true);
    assert.equal((await s.req('POST', '/api/billing/checkout', { plan: 'monthly', fullName: 'Dana' })).body.error, 'name_required');
    const co = await s.req('POST', '/api/billing/checkout', { plan: 'monthly', fullName: '  Dana   Levi ' });
    assert.equal(co.body.url, 'https://pay.example/p/777');
    const cp = calls.find((c) => c.method === 'createPaymentProcess').f;
    assert.equal(cp.pageCode, 'rec'); assert.equal(cp.sum, '39.00'); assert.equal(cp['pageField[fullName]'], 'Dana Levi');
    assert.equal(cp.notifyUrl, 'https://yalla.example/api/billing/webhook/grow?k=gk');
    const ref = cp.cField1; assert.ok(ref);
    const form = (d) => new URLSearchParams({ status: '1', err: '', ...Object.fromEntries(Object.entries(d).map(([k, v]) => [`data[${k}]`, v])) }).toString();
    const hook = (d, k = 'gk') => s.req('POST', `/api/billing/webhook/grow?k=${k}`, form(d), { 'content-type': 'application/x-www-form-urlencoded', cookie: '' });
    const first = { 'customFields][cField1': ref, 'customFields][cField2': 'monthly', processId: '777', transactionId: 't1', transactionToken: 'tt', asmachta: 'a1', directDebitId: 'dd9', statusCode: '2', sum: '39' };
    assert.equal((await hook(first, 'wrong')).status, 401, 'wrong secret key');
    assert.equal((await hook({ ...first, processId: '666' })).status, 401, 'not the checkout we opened');
    assert.equal((await hook(first)).body.ok, true);
    assert.ok(calls.some((c) => c.method === 'approveTransaction' && c.f.transactionId === 't1'), 'payment confirmed back to Grow');
    let me = (await s.req('GET', '/api/account/me')).body;
    assert.equal(me.subscription.status, 'active'); assert.equal(me.subscription.plan, 'monthly');
    assert.equal((await hook(first)).body.duplicate, true);
    const end1 = Date.parse(me.subscription.periodEnd);
    // A renewal: new transaction on the same standing order, new processId.
    await hook({ processId: '901', transactionId: 't2', transactionToken: 'tt2', directDebitId: 'dd9', statusCode: '2' });
    me = (await s.req('GET', '/api/account/me')).body;
    assert.ok(Math.abs(Date.parse(me.subscription.periodEnd) - end1 - 30 * 864e5) < 5000);
    await hook({ processId: '902', transactionId: 't3', directDebitId: 'dd9', statusCode: '3' });
    assert.equal((await s.req('GET', '/api/account/me')).body.subscription.status, 'past_due');
    me = (await s.req('POST', '/api/billing/cancel', {})).body;
    assert.equal(me.subscription.status, 'canceled');
    const stop = calls.find((c) => c.method === 'updateDirectDebit').f;
    assert.equal(stop.transactionToken, 'tt'); assert.equal(stop.changeStatus, '2', 'the first standing-order token is the one cancelled');
  } finally { s.stop(); grow.close(); }
});

test('Grow yearly is one payment: one-time page, cancel calls nothing at Grow', async () => {
  const calls = [];
  const grow = http.createServer(async (req, res) => {
    let raw = ''; for await (const c of req) raw += c; calls.push(req.url.split('/').pop());
    res.end(JSON.stringify({ status: 1, data: { processId: 5, processToken: 'p', url: 'https://pay.example/5' } }));
  });
  const growUrl = await listen(grow);
  const s = await boot({ BILLING_ENABLED: '1', BILLING_PROVIDER: 'grow', GROW_API_BASE: growUrl, GROW_USER_ID: 'u1',
    GROW_PAGE_CODE_RECURRING: 'rec', GROW_PAGE_CODE_ONETIME: 'one', GROW_WEBHOOK_KEY: 'gk' });
  try {
    await s.req('POST', '/api/account/signup', SIGNUP);
    await s.req('POST', '/api/billing/checkout', { plan: 'yearly', fullName: 'Dana Levi' });
    const ref = [...Object.keys(s.app.db.checkouts)][0];
    const raw = new URLSearchParams({ status: '1', 'data[cField1]': ref, 'data[processId]': '5', 'data[transactionId]': 'y1', 'data[transactionToken]': 'yt', 'data[statusCode]': '2' }).toString();
    assert.equal((await s.req('POST', '/api/billing/webhook/grow?k=gk', raw, { 'content-type': 'application/x-www-form-urlencoded', cookie: '' })).body.ok, true);
    assert.equal((await s.req('GET', '/api/account/me')).body.subscription.plan, 'yearly');
    assert.equal((await s.req('POST', '/api/billing/cancel', {})).body.subscription.status, 'canceled');
    assert.ok(!calls.includes('updateDirectDebit'));
  } finally { s.stop(); grow.close(); }
});

test('owner self-check: shows what is missing without secrets; WhatsApp ping and the help nudge use the Graph API', async () => {
  const sent = [];
  const graph = http.createServer(async (req, res) => {
    let raw = ''; for await (const c of req) raw += c;
    if (req.headers.authorization !== 'Bearer watok') { res.writeHead(401); return res.end(JSON.stringify({ error: { message: 'bad token' } })); }
    if (req.method === 'GET') return res.end(JSON.stringify({ verified_name: 'YALLA KIDS', display_phone_number: '+972 3-000-0000', quality_rating: 'GREEN' }));
    sent.push(JSON.parse(raw)); res.end('{}');
  });
  const graphUrl = await listen(graph);
  const s = await boot({ WA_NUMBER: '97230000000', WA_APP_SECRET: 'appsec-very-secret', WA_VERIFY_TOKEN: 'vt', WA_TOKEN: 'watok', WA_PHONE_NUMBER_ID: '123',
    WA_GRAPH_BASE: graphUrl, PUBLIC_URL: 'https://yalla.example', BILLING_PROVIDER: 'grow', GROW_USER_ID: 'u1' });
  try {
    const sc = await s.adm('/selfcheck?ping=1');
    assert.equal(sc.whatsapp.signIn, true); assert.equal(sc.whatsapp.ping.ok, true); assert.equal(sc.whatsapp.ping.name, 'YALLA KIDS');
    assert.equal(sc.whatsapp.pasteInMeta.callbackUrl, 'https://yalla.example/api/whatsapp/webhook');
    assert.deepEqual(sc.grow.missing, ['GROW_PAGE_CODE_RECURRING', 'GROW_PAGE_CODE_ONETIME', 'GROW_WEBHOOK_KEY']);
    assert.ok(!JSON.stringify(sc).includes('appsec-very-secret') && !JSON.stringify(sc).includes('watok'), 'no secret in the report');
    assert.equal((await fetch(s.adminUrl + '/selfcheck')).status, 401);
    const hook = (text) => { const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: '972501112233', type: 'text', text: { body: text } }] } }] }] });
      return s.req('POST', '/api/whatsapp/webhook', raw, { 'x-hub-signature-256': 'sha256=' + createHmac('sha256', 'appsec-very-secret').update(raw).digest('hex'), cookie: '' }); };
    await hook('שלום, יש לי שאלה'); await hook('עוד שאלה');
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(sent.length, 1, 'one pointer to help per number per day');
    assert.match(sent[0].text.body, /https:\/\/yalla\.example\/help\//);
  } finally { s.stop(); graph.close(); }
});
