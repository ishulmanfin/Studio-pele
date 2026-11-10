// YALLA KIDS API: parent accounts, subscriptions and the live-talk token service. No dependencies (Node 20+).
// Listens on 127.0.0.1 only; Caddy proxies /api/* and /preview/api/* here. A second port (ADMIN_PORT)
// serves the admin commands to server/admin.mjs and is never proxied.
// Keys never leave this process. No audio, transcripts or children's data are handled or stored:
// an account is a parent's email, a password hash, consent dates and the subscription.
import http from 'node:http';
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { openStore } from './lib/store.mjs';
import { PLANS, LIVE, entitled, publicPlans, addDays } from './lib/plans.mjs';
import { hashPassword, checkPassword, DUMMY_HASH, newToken, sha256, newId, limiter, validEmail, validPassword } from './lib/auth.mjs';
import { getProvider } from './lib/billing.mjs';

// Versions of the documents a parent agrees to at sign-up. Bump when the text changes.
export const TERMS_VERSION = '2026-11-draft';
export const PRIVACY_VERSION = '2026-11-draft';

const SESSION_DAYS = 30;
const COOKIE = 'yk_sid';
const MAX_BODY = 16 * 1024;

const ilDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
export const ilDay = (d = new Date()) => ilDate.format(d);               // YYYY-MM-DD, Israel time
export const ilMonth = (d = new Date()) => ilDay(d).slice(0, 7);         // YYYY-MM

export function createApp(env = process.env) {
  const on = (k) => env[k] === '1';
  const num = (k, d) => (env[k] !== undefined && env[k] !== '' ? +env[k] : d);
  const KEY = env.ELEVENLABS_AGENT_KEY;
  const AGENT = env.MIKA_AGENT_ID || '';
  const ELEVEN = env.ELEVEN_API || 'https://api.elevenlabs.io';
  const LIVE_ON = on('LIVE_TALK_ENABLED');
  const BILLING_ON = on('BILLING_ENABLED');            // master switch for charging. Off until the owner says go.
  const SIGNUP_ON = env.SIGNUP_ENABLED !== '0';
  const LEGACY = on('LEGACY_FAMILY_LOGIN');            // old behaviour: caps per Caddy basic-auth login, no account needed
  const GLOBAL_DAY_MIN = num('GLOBAL_DAY_MIN', 120);
  const PER_HOUR = num('PER_HOUR', 4);
  const SESSION_MIN = num('SESSION_MIN', LIVE.sessionMin);
  const LEGACY_DAY_MIN = num('LOGIN_DAY_MIN', 5);
  const ORIGINS = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const SECURE = env.COOKIE_INSECURE !== '1';
  const DIR = env.DATA_DIR || '/var/lib/yalla-api';
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const LOG = `${DIR}/sessions.jsonl`;                   // {t, who, min, cid} only
  const REC = `${DIR}/reconciled.json`;                  // cid -> real minutes (0 = never connected)

  const { db, save, audit } = openStore(DIR);
  const provider = getProvider(env);

  // ---------- live-talk usage ----------
  let rec = {}; try { rec = JSON.parse(readFileSync(REC, 'utf8')); } catch {}
  const readLog = () => (existsSync(LOG) ? readFileSync(LOG, 'utf8').split('\n') : []).map((l) => { try { return l && JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const whoOf = (r) => r.who || (r.login ? `f:${r.login}` : '');
  const minOf = (r) => (r.cid && r.cid in rec ? rec[r.cid] : r.min);

  // A session is reserved at its full length when the token is issued. Once it must be over, ask
  // ElevenLabs how long it really ran. Never connected (404) = 0 minutes, so failed attempts cost nothing.
  let busy = false;
  // For the family asking right now (`who`), also check calls that are not due yet: if ElevenLabs says
  // the call has ended, its real length frees the rest of the day at once (a 20-second call costs 20 s).
  async function reconcile(who) {
    if (busy || !KEY) return; busy = true;
    try {
      const m = ilMonth(); let n = 0, changed = false;
      for (const r of readLog()) {
        if (!r.cid || r.cid in rec || ilMonth(new Date(r.t)) !== m) continue;
        const isDue = Date.parse(r.t) <= Date.now() - ((r.min || SESSION_MIN) + 1) * 60e3;
        if ((!isDue && !(who && whoOf(r) === who)) || n++ >= 5) continue;
        try {
          const x = await fetch(`${ELEVEN}/v1/convai/conversations/${encodeURIComponent(r.cid)}`, { headers: { 'xi-api-key': KEY }, signal: AbortSignal.timeout(4000) });
          if (x.status === 404) { if (isDue) { rec[r.cid] = 0; changed = true; } }   // early 404 = not connected YET
          else if (x.ok) {
            const j = await x.json(); const s = j?.metadata?.call_duration_secs;
            const ended = isDue || ['done', 'failed'].includes(j?.status);
            if (ended && typeof s === 'number') { rec[r.cid] = Math.min(r.min, Math.round((s / 60) * 100) / 100); changed = true; }
          }
        } catch {}
      }
      if (changed) writeFileSync(REC, JSON.stringify(rec));
    } finally { busy = false; }
  }
  const timer = setInterval(reconcile, 120e3); timer.unref();

  // Retention (stated in the privacy notice): call minutes 12 months, audit log 90 days. Runs at start and daily.
  const AUDIT_DAYS = num('AUDIT_KEEP_DAYS', 90), MINUTES_DAYS = num('MINUTES_KEEP_DAYS', 365);
  function prune() {
    const keep = (file, days) => {
      if (!existsSync(file)) return;
      const cut = Date.now() - days * 864e5; const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
      const kept = lines.filter((l) => { try { return Date.parse(JSON.parse(l).t) >= cut; } catch { return false; } });
      if (kept.length !== lines.length) writeFileSync(file, kept.map((l) => l + '\n').join(''), { mode: 0o600 });
      return kept;
    };
    keep(`${DIR}/audit.jsonl`, AUDIT_DAYS);
    const kept = keep(LOG, MINUTES_DAYS);
    if (kept) { const live = new Set(kept.map((l) => { try { return JSON.parse(l).cid; } catch { return null; } })); let ch = false;
      for (const k of Object.keys(rec)) if (!live.has(k)) { delete rec[k]; ch = true; } if (ch) writeFileSync(REC, JSON.stringify(rec)); }
  }
  prune(); const pruneTimer = setInterval(prune, 864e5); pruneTimer.unref();

  function usage(who) {
    const d = ilDay(), m = ilMonth(), hourAgo = Date.now() - 3600e3;
    let day = 0, month = 0, allDay = 0, recent = 0, raw = 0;
    for (const r of readLog()) {
      const t = new Date(r.t); if (ilMonth(t) !== m) continue;
      const min = minOf(r); const today = ilDay(t) === d;
      if (today) allDay += min;
      if (whoOf(r) !== who) continue;
      month += min; if (today) day += min;
      if (Date.parse(r.t) > hourAgo) { raw++; if (min > 0) recent++; }
    }
    const r2 = (x) => Math.round(x * 100) / 100;
    return { day: r2(day), month: r2(month), allDay: r2(allDay), recent, raw };
  }

  // ---------- http helpers ----------
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  const send = (res, code, body, extra = {}) => { res.writeHead(code, { ...headers, ...extra }); res.end(JSON.stringify(body)); };
  const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
  });
  const json = async (req) => { const raw = await readBody(req); try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error('bad json'), { code: 400 }); } };
  // Caddy appends the real client address as the LAST X-Forwarded-For entry; earlier entries come from the client and can be forged.
  const ipOf = (req) => (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress || '?';
  const cookieOf = (req) => { const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`)); return m && m[1]; };
  const basicLogin = (req) => { try { return Buffer.from((req.headers.authorization || '').replace(/^Basic\s+/i, ''), 'base64').toString().split(':')[0] || ''; } catch { return ''; } };
  const sessionCookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;

  // State-changing calls from the browser must be same-origin JSON (blocks cross-site form posts).
  function csrfOk(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return false;
    const o = req.headers.origin; if (!o) return true;            // same-origin fetch from older Safari may omit it
    if (ORIGINS.length) return ORIGINS.includes(o);
    try { return new URL(o).host === req.headers.host || new URL(o).host === req.headers['x-forwarded-host']; } catch { return false; }
  }

  function accountOf(req) {
    const t = cookieOf(req); if (!t) return null;
    const s = db.sessions[sha256(t)]; if (!s) return null;
    if (Date.parse(s.exp) < Date.now()) { delete db.sessions[sha256(t)]; save(); return null; }
    return db.accounts[s.aid] || null;
  }
  function startSession(res, acc) {
    const token = newToken();
    db.sessions[sha256(token)] = { aid: acc.id, exp: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString() };
    for (const [k, v] of Object.entries(db.sessions)) if (Date.parse(v.exp) < Date.now()) delete db.sessions[k];
    save();
    return sessionCookie(token, SESSION_DAYS * 86400);
  }
  function view(acc) {
    const sub = acc.sub || null; const plan = sub && PLANS[sub.plan];
    const u = usage(`a:${acc.id}`); const live = plan?.live || LIVE;
    return {
      email: acc.email, created: acc.created, liveTalk: !!acc.liveTalk,
      subscription: sub && { plan: sub.plan, planName: plan?.name, status: sub.status, periodEnd: sub.periodEnd, cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd },
      entitled: entitled(sub),
      liveTalkUsage: { todayMin: u.day, monthMin: u.month, dayCapMin: live.dayMin, monthCapMin: live.monthMin },
      billingOpen: BILLING_ON,
    };
  }

  const loginIp = limiter(10, 15 * 60e3), loginEmail = limiter(5, 15 * 60e3), signupIp = limiter(5, 3600e3), redeemIp = limiter(10, 3600e3);

  // ---------- subscription state changes (one place, audited, idempotent) ----------
  function applyEvent(ev) {
    if (ev.id && db.processed.includes(ev.id)) return { ok: true, duplicate: true };
    const co = ev.ref && db.checkouts[ev.ref];
    const acc = co ? db.accounts[co.aid] : Object.values(db.accounts).find((a) => a.sub?.providerRef && a.sub.providerRef === ev.providerRef);
    if (!acc) { audit({ ev: 'webhook_unmatched', type: ev.type, id: ev.id }); return { ok: false }; }
    const prev = acc.sub || {};
    if (ev.type === 'paid') {
      const plan = PLANS[ev.plan || co?.plan || prev.plan]; if (!plan || !plan.purchasable) return { ok: false };
      // A paid plan replaces the pilot; renewals extend from the current end, never shorten it.
      const base = prev.status === 'pilot' ? null : prev.periodEnd;
      acc.sub = { plan: plan.id, status: 'active', periodEnd: ev.periodEnd || addDays(base, plan.days), provider: provider.name,
        providerRef: ev.providerRef || prev.providerRef, cancelAtPeriodEnd: false, since: prev.since || new Date().toISOString() };
      if (co) co.done = true;
    } else if (ev.type === 'failed') {
      if (prev.status === 'active') acc.sub = { ...prev, status: 'past_due' };
    } else if (ev.type === 'canceled') {
      if (prev.status) acc.sub = { ...prev, status: 'canceled', cancelAtPeriodEnd: true };
    } else return { ok: false };
    if (ev.id) { db.processed.push(ev.id); if (db.processed.length > 2000) db.processed.splice(0, 500); }
    save(); audit({ ev: `billing_${ev.type}`, aid: acc.id, plan: acc.sub?.plan, status: acc.sub?.status, periodEnd: acc.sub?.periodEnd });
    return { ok: true };
  }

  // ---------- routes ----------
  async function route(req, res) {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname.replace(/^\/preview/, '');
    const M = req.method;

    if (path === '/api/health') return send(res, 200, { ok: true, liveTalk: LIVE_ON && !!KEY, billing: BILLING_ON });
    if (path === '/api/plans' && M === 'GET') return send(res, 200, { plans: publicPlans(), billingOpen: BILLING_ON, terms: TERMS_VERSION, privacy: PRIVACY_VERSION });

    // Provider webhooks: no cookie, no CSRF check, authenticity comes from the provider's signature.
    const wh = path.match(/^\/api\/billing\/webhook\/([a-z]+)$/);
    if (wh && M === 'POST') {
      if (wh[1] !== provider.name) return send(res, 404, { error: 'not found' });
      const raw = await readBody(req); let ev = null;
      try { ev = provider.parseWebhook({ headers: req.headers, raw }); } catch {}
      if (!ev) { audit({ ev: 'webhook_rejected', ip: ipOf(req) }); return send(res, 401, { error: 'bad signature' }); }
      return send(res, 200, applyEvent(ev));
    }

    if (path === '/api/mika-session' && M === 'GET') return mikaSession(req, res);

    if (M === 'POST' && path.startsWith('/api/') && !csrfOk(req)) return send(res, 403, { error: 'bad origin' });

    if (path === '/api/account/signup' && M === 'POST') {
      if (!SIGNUP_ON) return send(res, 403, { error: 'signup_closed' });
      const b = await json(req); const email = String(b.email || '').trim().toLowerCase();
      if (!validEmail(email)) return send(res, 400, { error: 'bad_email' });
      if (!validPassword(b.password)) return send(res, 400, { error: 'weak_password' });
      if (b.acceptTerms !== true || b.parentAdult !== true) return send(res, 400, { error: 'consent_required' });
      // Counted only for complete forms, so a parent fixing typos is never locked out.
      if (!signupIp(ipOf(req))) return send(res, 429, { error: 'too_many_signups' });
      if (db.byEmail[email]) return send(res, 409, { error: 'exists' });
      const now = new Date().toISOString();
      const acc = { id: newId('acc'), email, pw: hashPassword(b.password), created: now, liveTalk: false,
        consent: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION, parentAdult: true, at: now }, sub: null };
      db.accounts[acc.id] = acc; db.byEmail[email] = acc.id; save(); audit({ ev: 'signup', aid: acc.id });
      return send(res, 201, view(acc), { 'set-cookie': startSession(res, acc) });
    }

    if (path === '/api/account/login' && M === 'POST') {
      const b = await json(req); const email = String(b.email || '').trim().toLowerCase();
      if (!loginIp(ipOf(req)) || !loginEmail(email)) return send(res, 429, { error: 'too_many' });
      const acc = db.accounts[db.byEmail[email]];
      if (!checkPassword(String(b.password || ''), acc ? acc.pw : DUMMY_HASH) || !acc) { audit({ ev: 'login_failed', ip: ipOf(req) }); return send(res, 401, { error: 'bad_login' }); }
      return send(res, 200, view(acc), { 'set-cookie': startSession(res, acc) });
    }

    if (path === '/api/account/logout' && M === 'POST') {
      const t = cookieOf(req); if (t) { delete db.sessions[sha256(t)]; save(); }
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
    }

    // Everything below needs a signed-in parent.
    if (!path.startsWith('/api/account/') && !path.startsWith('/api/billing/') && !path.startsWith('/api/pilot/')) return send(res, 404, { error: 'not found' });
    if (path === '/api/billing/mock/pay' && M === 'GET' && provider.name === 'mock') return mockPay(req, res, url);
    const acc = accountOf(req);
    if (!acc) return send(res, 401, { error: 'login_required' });

    if (path === '/api/account/me' && M === 'GET') return send(res, 200, view(acc));

    if (path === '/api/account/live-talk' && M === 'POST') {
      const b = await json(req);
      // Turning live talk ON is a consent step: it needs the parent's password, so a child holding a signed-in tablet can't.
      if (b.enabled === true) {
        if (!entitled(acc.sub)) return send(res, 409, { error: 'no_plan' });
        if (!loginEmail(acc.email)) return send(res, 429, { error: 'too_many' });
        if (!checkPassword(String(b.password || ''), acc.pw)) return send(res, 401, { error: 'bad_login' });
      }
      acc.liveTalk = b.enabled === true;
      acc.consent.liveTalkAt = acc.liveTalk ? new Date().toISOString() : null; save(); audit({ ev: 'live_talk_consent', aid: acc.id, on: acc.liveTalk });
      return send(res, 200, view(acc));
    }

    if (path === '/api/account/password' && M === 'POST') {
      const b = await json(req);
      if (!loginEmail(acc.email)) return send(res, 429, { error: 'too_many' });
      if (!checkPassword(String(b.oldPassword || ''), acc.pw)) return send(res, 401, { error: 'bad_login' });
      if (!validPassword(b.newPassword)) return send(res, 400, { error: 'weak_password' });
      acc.pw = hashPassword(b.newPassword);
      for (const [k, v] of Object.entries(db.sessions)) if (v.aid === acc.id) delete db.sessions[k]; // sign out everywhere
      audit({ ev: 'password_changed', aid: acc.id });
      return send(res, 200, view(acc), { 'set-cookie': startSession(res, acc) });
    }

    if (path === '/api/account/delete' && M === 'POST') {
      const b = await json(req);
      if (!checkPassword(String(b.password || ''), acc.pw)) return send(res, 401, { error: 'bad_login' });
      if (acc.sub?.providerRef && acc.sub.status !== 'canceled') { try { await provider.cancel(acc.sub); } catch { return send(res, 502, { error: 'cancel_failed' }); } }
      delete db.byEmail[acc.email]; delete db.accounts[acc.id];
      for (const [k, v] of Object.entries(db.sessions)) if (v.aid === acc.id) delete db.sessions[k];
      for (const [k, v] of Object.entries(db.checkouts)) if (v.aid === acc.id) delete db.checkouts[k];
      save(); audit({ ev: 'account_deleted', aid: acc.id });
      return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
    }

    if (path === '/api/pilot/redeem' && M === 'POST') {
      if (!redeemIp(ipOf(req))) return send(res, 429, { error: 'too_many' });
      const code = String((await json(req)).code || '').trim().toUpperCase();
      const pc = db.pilotCodes[code];
      if (!pc || pc.usedBy) return send(res, 404, { error: 'bad_code' });
      if (entitled(acc.sub) && acc.sub.status !== 'pilot') return send(res, 409, { error: 'already_subscribed' });
      pc.usedBy = acc.id; pc.usedAt = new Date().toISOString();
      acc.sub = { plan: 'pilot', status: 'pilot', periodEnd: addDays(acc.sub?.status === 'pilot' ? acc.sub.periodEnd : null, pc.days || PLANS.pilot.days), cancelAtPeriodEnd: false };
      save(); audit({ ev: 'pilot_redeemed', aid: acc.id, code });
      return send(res, 200, view(acc));
    }

    if (path === '/api/billing/checkout' && M === 'POST') {
      if (!BILLING_ON) return send(res, 503, { error: 'billing_closed' });
      const plan = PLANS[(await json(req)).plan];
      if (!plan || !plan.purchasable) return send(res, 400, { error: 'bad_plan' });
      if (acc.sub?.status === 'active' && entitled(acc.sub)) return send(res, 409, { error: 'already_subscribed' });
      const ref = newId('co');
      db.checkouts[ref] = { aid: acc.id, plan: plan.id, at: new Date().toISOString() };
      for (const [k, v] of Object.entries(db.checkouts)) if (Date.parse(v.at) < Date.now() - 30 * 864e5) delete db.checkouts[k];
      save();
      try {
        const base = env.PUBLIC_URL || '';
        const { url: payUrl } = await provider.createCheckout({ ref, plan, email: acc.email, returnUrl: `${base}/account/?paid=1`, notifyUrl: `${base}/api/billing/webhook/${provider.name}` });
        audit({ ev: 'checkout_started', aid: acc.id, plan: plan.id });
        return send(res, 200, { url: payUrl });
      } catch { return send(res, 502, { error: 'provider_unavailable' }); }
    }

    if (path === '/api/billing/cancel' && M === 'POST') {
      const s = acc.sub; if (!s || s.status === 'pilot' || !entitled(s)) return send(res, 409, { error: 'nothing_to_cancel' });
      try { if (s.providerRef) await provider.cancel(s); } catch { return send(res, 502, { error: 'cancel_failed' }); }
      acc.sub = { ...s, status: 'canceled', cancelAtPeriodEnd: true, canceledAt: new Date().toISOString() };
      save(); audit({ ev: 'canceled_by_parent', aid: acc.id, periodEnd: s.periodEnd });
      return send(res, 200, view(acc));
    }

    return send(res, 404, { error: 'not found' });
  }

  // Test stand-in for the provider's hosted page: pays at once and fires the same webhook path.
  function mockPay(req, res, url) {
    if (env.MOCK_PAY !== '1') return send(res, 404, { error: 'not found' });
    const ref = url.searchParams.get('ref'); const co = db.checkouts[ref];
    if (!co || co.done) return send(res, 404, { error: 'bad_ref' });
    applyEvent({ id: `mock_${ref}`, type: 'paid', ref, providerRef: `mock_sub_${co.aid}`, plan: co.plan });
    res.writeHead(302, { location: `${env.BASE_PATH || ''}/account/?paid=1` }); return res.end();
  }

  async function mikaSession(req, res) {
    if (!LIVE_ON || !KEY || !AGENT) return send(res, 503, { error: 'live talk not configured' });
    let who, live;
    const acc = accountOf(req);
    if (acc) {
      if (!entitled(acc.sub)) return send(res, 402, { error: 'subscription_required' });
      if (!acc.liveTalk) return send(res, 403, { error: 'parent_consent_required' });
      who = `a:${acc.id}`; live = PLANS[acc.sub.plan]?.live || LIVE;
    } else if (LEGACY && basicLogin(req)) {
      who = `f:${basicLogin(req)}`; live = { sessionMin: SESSION_MIN, dayMin: LEGACY_DAY_MIN, monthMin: Infinity };
    } else return send(res, 401, { error: 'login_required' });

    await reconcile(who);
    const u = usage(who);
    const sessMin = Math.min(SESSION_MIN, live.sessionMin);
    const left = Math.min(sessMin, live.dayMin - u.day, live.monthMin - u.month);
    if (u.allDay + sessMin > GLOBAL_DAY_MIN) return send(res, 503, { error: 'mika is resting' });
    if (live.monthMin - u.month < 1) return send(res, 429, { error: 'monthly limit' });
    if (left < 1) {
      // A call that just ended may still be counted at its full reservation until ElevenLabs reports it: ask to retry.
      const pending = readLog().some((r) => whoOf(r) === who && r.cid && !(r.cid in rec) && ilDay(new Date(r.t)) === ilDay());
      return send(res, 429, pending ? { error: 'please wait', retryAfterSec: 20 } : { error: 'daily limit' });
    }
    if (u.recent >= PER_HOUR || u.raw >= PER_HOUR * 3) return send(res, 429, { error: 'too many sessions' });
    const min = Math.floor(left * 2) / 2;   // half-minute steps
    try {
      const r = await fetch(`${ELEVEN}/v1/convai/conversation/token?agent_id=${encodeURIComponent(AGENT)}`, { headers: { 'xi-api-key': KEY }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return send(res, 502, { error: `upstream ${r.status}` });
      const { token, conversation_id: cid } = await r.json();
      appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), who, min, ...(cid ? { cid } : {}) }) + '\n');
      // maxSec: the client must end the call by then (the agent's own max duration is the hard stop).
      return send(res, 200, { token, maxSec: Math.round(min * 60) });
    } catch { return send(res, 502, { error: 'upstream unreachable' }); }
  }

  // ---------- admin (127.0.0.1:ADMIN_PORT only, bearer token) ----------
  async function admin(req, res) {
    const tok = env.ADMIN_TOKEN;
    if (!tok || req.headers.authorization !== `Bearer ${tok}`) return send(res, 401, { error: 'unauthorized' });
    const path = new URL(req.url, 'http://x').pathname; const b = req.method === 'POST' ? await json(req) : {};
    const find = (email) => db.accounts[db.byEmail[String(email || '').toLowerCase()]];
    if (path === '/pilot-codes') {
      const n = Math.min(+b.count || 1, 200), days = +b.days || PLANS.pilot.days, codes = [];
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < n; i++) {
        const c = 'YALLA-' + [...randomBytes(6)].map((x) => abc[x % abc.length]).join('');
        db.pilotCodes[c] = { days, created: new Date().toISOString(), note: b.note || '' }; codes.push(c);
      }
      save(); audit({ ev: 'admin_pilot_codes', n, days }); return send(res, 200, { codes, days });
    }
    if (path === '/accounts') return send(res, 200, { accounts: Object.values(db.accounts).map((a) => ({ email: a.email, created: a.created, liveTalk: a.liveTalk, sub: a.sub, entitled: entitled(a.sub), usage: usage(`a:${a.id}`) })) });
    if (path === '/grant') {
      const a = find(b.email); const plan = PLANS[b.plan]; if (!a || !plan) return send(res, 404, { error: 'no such account or plan' });
      a.sub = { plan: plan.id, status: plan.id === 'pilot' ? 'pilot' : 'active', periodEnd: addDays(null, +b.days || plan.days), cancelAtPeriodEnd: false, provider: 'manual' };
      save(); audit({ ev: 'admin_grant', aid: a.id, plan: plan.id }); return send(res, 200, { ok: true, sub: a.sub });
    }
    if (path === '/reset-password') {
      const a = find(b.email); if (!a) return send(res, 404, { error: 'no such account' });
      const pw = randomBytes(9).toString('base64url'); a.pw = hashPassword(pw);
      for (const [k, v] of Object.entries(db.sessions)) if (v.aid === a.id) delete db.sessions[k];
      save(); audit({ ev: 'admin_password_reset', aid: a.id }); return send(res, 200, { tempPassword: pw });
    }
    if (path === '/event') return send(res, 200, applyEvent(b));    // manual fix-up, same rules as a webhook
    return send(res, 404, { error: 'not found' });
  }

  const wrap = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (e) { if (!res.headersSent) send(res, e.code === 413 ? 413 : e.code === 400 ? 400 : 500, { error: e.code === 413 ? 'too large' : e.code === 400 ? 'bad json' : 'server error' }); }
  };
  return { server: http.createServer(wrap(route)), adminServer: http.createServer(wrap(admin)), db, close: () => { clearInterval(timer); clearInterval(pruneTimer); }, prune };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const app = createApp();
  app.server.listen(+process.env.PORT || 8090, '127.0.0.1');
  if (process.env.ADMIN_TOKEN) app.adminServer.listen(+process.env.ADMIN_PORT || 8091, '127.0.0.1');
}
