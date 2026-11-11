// YALLA KIDS API: parent accounts, subscriptions and the live-talk token service. No dependencies (Node 20+).
// Listens on 127.0.0.1 only; Caddy proxies /api/* and /preview/api/* here. A second port (ADMIN_PORT)
// serves the admin commands to server/admin.mjs and is never proxied.
// Keys never leave this process. No audio, transcripts or children's data are handled or stored:
// an account is a parent's phone number (or email + password hash), consent dates and the subscription.
import http from 'node:http';
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { openStore } from './lib/store.mjs';
import { PLANS, LIVE, entitled, publicPlans, addDays } from './lib/plans.mjs';
import { hashPassword, checkPassword, DUMMY_HASH, newToken, sha256, newId, limiter, validEmail, validPassword } from './lib/auth.mjs';
import { getProvider } from './lib/billing.mjs';
import { getSms, normalizePhone, maskPhone, codeBook } from './lib/sms.mjs';
import { waBook, waSignatureOk, inboundTexts, findWaCode, waReply, waPing } from './lib/whatsapp.mjs';

// Versions of the documents a parent agrees to at sign-up. Bump when the text changes.
export const TERMS_VERSION = '2026-11-draft';
export const PRIVACY_VERSION = '2026-11-draft';

const SESSION_DAYS = 365;   // parents stay signed in on their own device; password change or logout ends it
const COOKIE = 'yk_sid';
const MAX_BODY = 16 * 1024;

const ilDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
export const ilDay = (d = new Date()) => ilDate.format(d);               // YYYY-MM-DD, Israel time
export const ilMonth = (d = new Date()) => ilDay(d).slice(0, 7);         // YYYY-MM

// Optional support module (server/lib/support.mjs, owned by the support thread). Absent = no support routes.
let supportMod = null;
try { supportMod = await import('./lib/support.mjs'); } catch (e) { if (!(e.code === 'ERR_MODULE_NOT_FOUND' && String(e.message).includes('support.mjs'))) throw e; }

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
  const provider = getProvider(env, {
    onCheckout: (ref, info) => { if (db.checkouts[ref]) { db.checkouts[ref].process = info; save(); } },
    checkoutProcess: (ref) => (db.checkouts[ref] && !db.checkouts[ref].done && db.checkouts[ref].process) || null,
  });
  const sms = getSms(env);
  const SMS_ECHO = env.SMS_DEV_ECHO === '1' && sms.name === 'mock';   // tests/dev only: return the code in the answer
  const SMS_DAY_CAP = num('SMS_DAY_CAP', 200);                       // cost guard: SMS messages per day, all families
  let smsDay = { d: '', n: 0 };
  const codes = codeBook();
  const wa = waBook();
  const WA_NUMBER = (env.WA_NUMBER || '').replace(/\D/g, '');            // the business number parents message, digits only
  const WA_ON = !!(WA_NUMBER && env.WA_APP_SECRET);

  // Read-only account facts for other modules (support). Phone is masked; no child data exists to share.
  function facts(aid) {
    const a = db.accounts[aid]; if (!a) return null;
    const u = usage(`a:${a.id}`), live = PLANS[a.sub?.plan]?.live || LIVE, extra = bonusMin(a);
    return { id: a.id, phone: maskPhone(a.phone), email: a.email || null, created: a.created, liveTalk: !!a.liveTalk,
      plan: a.sub?.plan || null, status: a.sub?.status || null, periodEnd: a.sub?.periodEnd || null, entitled: entitled(a.sub),
      usage: { todayMin: u.day, monthMin: u.month, dayCapMin: live.dayMin + extra, monthCapMin: live.monthMin + extra } };
  }
  // Today's extra live-talk minutes given by support as an apology (resets the next Israel day).
  const bonusMin = (a) => (a?.bonus?.day === ilDay() ? a.bonus.min : 0);
  const hooks = {
    async sendSms(aid, text) {
      const a = db.accounts[aid]; if (!a?.phone) return false;
      const d = ilDay(); if (smsDay.d !== d) smsDay = { d, n: 0 };
      if (smsDay.n >= SMS_DAY_CAP) return false;
      try { await sms.send(a.phone, String(text).slice(0, 300)); smsDay.n++; return true; } catch { return false; }
    },
    grantDays(aid, days) {
      const a = db.accounts[aid]; days = Math.min(Math.max(+days || 0, 1), 90); if (!a) return null;
      const s0 = a.sub && entitled(a.sub) ? a.sub : { plan: 'pilot', status: 'pilot', cancelAtPeriodEnd: false };
      a.sub = { ...s0, periodEnd: addDays(s0.periodEnd, days) }; save(); audit({ ev: 'support_grant_days', aid, days });
      return a.sub.periodEnd;
    },
    compensate(aid, min = 3) {
      const a = db.accounts[aid]; if (!a) return false;
      a.bonus = { day: ilDay(), min: Math.min(bonusMin(a) + Math.min(+min || 3, 6), 6) }; save(); audit({ ev: 'support_compensate', aid, min: a.bonus.min });
      return true;
    },
    health: () => ({ api: true, liveTalk: LIVE_ON && !!KEY, billing: BILLING_ON, whatsapp: WA_ON }),
  };
  const support = supportMod?.createSupport?.({ dir: DIR, env, audit, facts, listAccountIds: () => Object.keys(db.accounts), ...hooks }) || null;
  const care = (aid, what) => { try { support?.care?.(aid, what); } catch {} };
  if (!db.byPhone) db.byPhone = {};

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
      phone: maskPhone(acc.phone), email: acc.email || null, created: acc.created, liveTalk: !!acc.liveTalk,
      subscription: sub && { plan: sub.plan, planName: plan?.name, status: sub.status, periodEnd: sub.periodEnd, cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd },
      entitled: entitled(sub),
      liveTalkUsage: { todayMin: u.day, monthMin: u.month, dayCapMin: live.dayMin + bonusMin(acc), monthCapMin: live.monthMin + bonusMin(acc) },
      billingOpen: BILLING_ON,
    };
  }

  const waNudge = limiter(1, 864e5);
  const waIp = limiter(20, 3600e3), smsPhone = limiter(3, 15 * 60e3), smsIp = limiter(10, 3600e3), verifyIp = limiter(30, 15 * 60e3);
  const loginIp = limiter(10, 15 * 60e3), loginEmail = limiter(5, 15 * 60e3), signupIp = limiter(5, 3600e3), redeemIp = limiter(10, 3600e3);

  // ---------- subscription state changes (one place, audited, idempotent) ----------
  function applyEvent(ev) {
    if (ev.id && db.processed.includes(ev.id)) return { ok: true, duplicate: true };
    const co = ev.ref && db.checkouts[ev.ref];
    const acc = co ? db.accounts[co.aid] : ev.providerRef ? Object.values(db.accounts).find((a) => a.sub?.providerRef === ev.providerRef) : null;
    if (!acc) { audit({ ev: 'webhook_unmatched', type: ev.type, id: ev.id }); return { ok: false }; }
    const prev = acc.sub || {};
    if (ev.type === 'paid') {
      const plan = PLANS[ev.plan || co?.plan || prev.plan]; if (!plan || !plan.purchasable) return { ok: false };
      // A paid plan replaces the pilot; renewals extend from the current end, never shorten it.
      const base = prev.status === 'pilot' ? null : prev.periodEnd;
      acc.sub = { plan: plan.id, status: 'active', periodEnd: ev.periodEnd || addDays(base, plan.days), provider: provider.name,
        providerRef: prev.providerRef && prev.status !== 'pilot' && !co ? prev.providerRef : ev.providerRef || prev.providerRef,
        // keep the standing order's first identifiers: they are what cancelling needs
        providerMeta: (!co && prev.providerMeta) || ev.providerMeta || prev.providerMeta,
        cancelAtPeriodEnd: false, since: prev.since || new Date().toISOString() };
      if (co) co.done = true;
    } else if (ev.type === 'failed') {
      if (prev.status === 'active') { acc.sub = { ...prev, status: 'past_due' }; care(acc.id, 'payment_failed'); }
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
    if (path === '/api/plans' && M === 'GET') return send(res, 200, { plans: publicPlans(), billingOpen: BILLING_ON, needsName: !!provider.needsName, whatsapp: WA_ON, terms: TERMS_VERSION, privacy: PRIVACY_VERSION });

    // Provider webhooks: no cookie, no CSRF check, authenticity comes from the provider's signature.
    const wh = path.match(/^\/api\/billing\/webhook\/([a-z]+)$/);
    if (wh && M === 'POST') {
      if (wh[1] !== provider.name) return send(res, 404, { error: 'not found' });
      const raw = await readBody(req); let ev = null;
      try { ev = await provider.parseWebhook({ headers: req.headers, raw, query: url.searchParams }); } catch {}
      if (!ev) { audit({ ev: 'webhook_rejected', ip: ipOf(req) }); return send(res, 401, { error: 'bad signature' }); }
      return send(res, 200, applyEvent(ev));
    }

    // WhatsApp webhook (Meta). GET = subscription check, POST = signed message events. Outside basic auth.
    if (path === '/api/whatsapp/webhook' && M === 'GET') {
      const q = url.searchParams;
      if (q.get('hub.mode') === 'subscribe' && env.WA_VERIFY_TOKEN && q.get('hub.verify_token') === env.WA_VERIFY_TOKEN) { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(q.get('hub.challenge') || ''); }
      return send(res, 403, { error: 'forbidden' });
    }
    if (path === '/api/whatsapp/webhook' && M === 'POST') {
      const raw = await readBody(req);
      if (!waSignatureOk(env.WA_APP_SECRET, raw, req.headers['x-hub-signature-256'])) { audit({ ev: 'wa_webhook_rejected', ip: ipOf(req) }); return send(res, 401, { error: 'bad signature' }); }
      let body = {}; try { body = JSON.parse(raw); } catch {}
      for (const m of inboundTexts(body)) {
        const code = findWaCode(m.text); const p = code && wa.get(code);
        if (!p) {
          // Not a live sign-in code: one short pointer to help per number per day (free inside the 24-hour window).
          if (waNudge(m.from)) waReply(env, m.from, code ? 'הקוד הזה כבר לא בתוקף. אפשר לבקש קוד חדש באתר 🙂' : `שלום! כאן YALLA KIDS 👋 לשאלות ועזרה: ${env.PUBLIC_URL || ''}/help/`);
          continue;
        }
        if (p.phone) continue;
        const phone = normalizePhone(m.from);
        if (!phone) { waReply(env, m.from, 'כרגע אפשר להתחבר רק עם מספר נייד ישראלי.'); continue; }
        if (p.purpose === 'confirm' && db.accounts[p.aid]?.phone !== phone) { waReply(env, m.from, 'צריך לשלוח את הקוד מהטלפון שרשום בחשבון.'); continue; }
        p.phone = phone;
        waReply(env, m.from, p.purpose === 'confirm' ? 'אושר ✅ אפשר לחזור ל-YALLA KIDS.' : 'מחוברים ✅ אפשר לחזור ל-YALLA KIDS.');
      }
      return send(res, 200, { ok: true });   // always 200 to Meta once the signature is good
    }

    if (path === '/api/mika-session' && M === 'GET') return mikaSession(req, res);

    if (M === 'POST' && path.startsWith('/api/') && !csrfOk(req)) return send(res, 403, { error: 'bad origin' });

    // ---------- sign in with phone + SMS code (signs up a new parent on first use) ----------
    async function sendCode(key, phone, ip) {
      if (!smsIp(ip)) return { status: 429, body: { error: 'too_many', retryAfterSec: 3600 } };
      const d = ilDay(); if (smsDay.d !== d) smsDay = { d, n: 0 };
      if (smsDay.n >= SMS_DAY_CAP) { audit({ ev: 'sms_day_cap' }); return { status: 503, body: { error: 'sms_unavailable' } }; }
      if (!smsPhone(phone)) return { status: 429, body: { error: 'too_many', retryAfterSec: 900 } };
      const r = codes.issue(key);
      if (r.wait) return { status: 429, body: { error: 'too_many', retryAfterSec: r.wait } };
      try { await sms.send(phone, `קוד הכניסה ל-YALLA KIDS: ${r.code}\nאל תמסרו אותו לאף אחד.`); } catch { return { status: 502, body: { error: 'sms_unavailable' } }; }
      smsDay.n++;
      return { status: 200, body: { sent: true, resendInSec: 60, ...(SMS_ECHO && { devCode: r.code }) } };
    }

    if (path === '/api/auth/code' && M === 'POST') {
      const phone = normalizePhone((await json(req)).phone);
      if (!phone) return send(res, 400, { error: 'bad_phone' });
      const r = await sendCode(`login:${phone}`, phone, ipOf(req));
      return send(res, r.status, r.body);
    }

    if (path === '/api/auth/verify' && M === 'POST') {
      if (!verifyIp(ipOf(req))) return send(res, 429, { error: 'too_many' });
      const b = await json(req); const phone = normalizePhone(b.phone);
      if (!phone) return send(res, 400, { error: 'bad_phone' });
      let acc = db.accounts[db.byPhone[phone]];
      const isNew = !acc; const consented = b.acceptTerms === true && b.parentAdult === true;
      // A new parent must accept first; the code stays valid while they tick the boxes.
      const c = codes.check(`login:${phone}`, b.code, !isNew || consented);
      if (c === 'expired') return send(res, 410, { error: 'code_expired' });
      if (c === 'bad') { audit({ ev: 'code_failed', ip: ipOf(req) }); return send(res, 401, { error: 'bad_code' }); }
      if (isNew) {
        if (!consented) return send(res, 400, { error: 'consent_required' });
        if (!SIGNUP_ON) return send(res, 403, { error: 'signup_closed' });
        const now = new Date().toISOString();
        acc = { id: newId('acc'), phone, created: now, liveTalk: false,
          consent: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION, parentAdult: true, at: now }, sub: null };
        db.accounts[acc.id] = acc; db.byPhone[phone] = acc.id; audit({ ev: 'signup', aid: acc.id, via: 'phone' });
      }
      return send(res, isNew ? 201 : 200, view(acc), { 'set-cookie': startSession(res, acc) });
    }

    const waStart = (purpose, aid) => {
      if (!WA_ON) return [503, { error: 'wa_unavailable' }];
      if (!waIp(ipOf(req))) return [429, { error: 'too_many', retryAfterSec: 600 }];
      const o = wa.open(purpose, aid); if (!o) return [503, { error: 'wa_unavailable' }];
      const text = `${purpose === 'confirm' ? 'אישור' : 'כניסה'} ל-YALLA KIDS: ${o.code}`;
      return [200, { ...o, waLink: `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, expiresInSec: 600 }];
    };
    if (path === '/api/auth/wa/start' && M === 'POST') { const [st, body] = waStart('login', null); return send(res, st, body); }

    if (path === '/api/auth/wa/finish' && M === 'POST') {
      const b = await json(req); const p = wa.get(String(b.code || ''));
      if (!p || p.purpose !== 'login') return send(res, 410, { error: 'code_expired' });
      if (p.secret !== b.secret) return send(res, 404, { error: 'not found' });
      if (!p.phone) return send(res, 202, { pending: true });
      let acc = db.accounts[db.byPhone[p.phone]]; const isNew = !acc;
      if (isNew) {
        if (!(b.acceptTerms === true && b.parentAdult === true)) return send(res, 400, { error: 'consent_required' });
        if (!SIGNUP_ON) return send(res, 403, { error: 'signup_closed' });
        const now = new Date().toISOString();
        acc = { id: newId('acc'), phone: p.phone, created: now, liveTalk: false,
          consent: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION, parentAdult: true, at: now }, sub: null };
        db.accounts[acc.id] = acc; db.byPhone[p.phone] = acc.id; audit({ ev: 'signup', aid: acc.id, via: 'whatsapp' });
      }
      wa.drop(String(b.code));
      return send(res, isNew ? 201 : 200, view(acc), { 'set-cookie': startSession(res, acc) });
    }

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
    // Support hook: the module gets the signed-in parent (or null) and read-only facts, never child data.
    if (path.startsWith('/api/support/') && support) return support.route(req, res, path, accountOf(req) && facts(accountOf(req).id), { send, json, ipOf });

    if (!path.startsWith('/api/account/') && !path.startsWith('/api/billing/') && !path.startsWith('/api/pilot/')) return send(res, 404, { error: 'not found' });
    if (path === '/api/billing/mock/pay' && M === 'GET' && provider.name === 'mock') return mockPay(req, res, url);
    const acc = accountOf(req);
    if (!acc) return send(res, 401, { error: 'login_required' });

    if (path === '/api/account/me' && M === 'GET') return send(res, 200, view(acc));

    // Step-up for sensitive actions: a fresh SMS code to the account's phone (or the password, for email accounts).
    if (path === '/api/account/confirm-code' && M === 'POST') {
      if (!acc.phone) return send(res, 400, { error: 'no_phone' });
      const r = await sendCode(`confirm:${acc.id}`, acc.phone, ipOf(req));
      return send(res, r.status, r.body);
    }
    if (path === '/api/account/confirm-wa' && M === 'POST') {
      if (!acc.phone) return send(res, 400, { error: 'no_phone' });
      const [st, body] = waStart('confirm', acc.id); return send(res, st, body);
    }
    const stepUp = (b) => {
      if (b.waCode !== undefined) {
        const p = wa.get(String(b.waCode));
        if (!p || p.purpose !== 'confirm' || p.aid !== acc.id || p.secret !== b.waSecret) return [410, 'code_expired'];
        if (!p.phone) return [409, 'not_confirmed_yet'];
        wa.drop(String(b.waCode)); return null;
      }
      if (acc.phone && b.code !== undefined) { const c = codes.check(`confirm:${acc.id}`, b.code); return c === 'ok' ? null : c === 'expired' ? [410, 'code_expired'] : [401, 'bad_code']; }
      if (!loginEmail(acc.email || acc.id)) return [429, 'too_many'];
      return acc.pw && checkPassword(String(b.password || ''), acc.pw) ? null : [401, acc.phone ? 'bad_code' : 'bad_login'];
    };

    if (path === '/api/account/live-talk' && M === 'POST') {
      const b = await json(req);
      // Turning live talk ON is a consent step: it needs the parent's password, so a child holding a signed-in tablet can't.
      if (b.enabled === true) {
        if (!entitled(acc.sub)) return send(res, 409, { error: 'no_plan' });
        const e = stepUp(b); if (e) return send(res, e[0], { error: e[1] });
      }
      acc.liveTalk = b.enabled === true;
      acc.consent.liveTalkAt = acc.liveTalk ? new Date().toISOString() : null; save(); audit({ ev: 'live_talk_consent', aid: acc.id, on: acc.liveTalk });
      return send(res, 200, view(acc));
    }

    if (path === '/api/account/password' && M === 'POST') {
      const b = await json(req); if (!acc.pw) return send(res, 400, { error: 'no_password' });
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
      const e = stepUp(b); if (e) return send(res, e[0], { error: e[1] });
      if (acc.sub?.providerRef && acc.sub.status !== 'canceled') { try { await provider.cancel(acc.sub); } catch { return send(res, 502, { error: 'cancel_failed' }); } }
      if (acc.email) delete db.byEmail[acc.email]; if (acc.phone) delete db.byPhone[acc.phone]; delete db.accounts[acc.id];
      for (const [k, v] of Object.entries(db.sessions)) if (v.aid === acc.id) delete db.sessions[k];
      for (const [k, v] of Object.entries(db.checkouts)) if (v.aid === acc.id) delete db.checkouts[k];
      save(); audit({ ev: 'account_deleted', aid: acc.id }); try { support?.forget?.(acc.id); } catch {}
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
      const cb = await json(req); const plan = PLANS[cb.plan];
      if (!plan || !plan.purchasable) return send(res, 400, { error: 'bad_plan' });
      // Grow needs the payer's full name for the tax invoice. It goes to Grow only; we don't store it.
      const fullName = String(cb.fullName || '').trim().replace(/\s+/g, ' ');
      if (provider.needsName && (fullName.length > 60 || fullName.split(' ').filter((w) => w.length >= 2).length < 2)) return send(res, 400, { error: 'name_required' });
      if (acc.sub?.status === 'active' && entitled(acc.sub)) return send(res, 409, { error: 'already_subscribed' });
      const ref = newId('co');
      db.checkouts[ref] = { aid: acc.id, plan: plan.id, at: new Date().toISOString() };
      for (const [k, v] of Object.entries(db.checkouts)) if (Date.parse(v.at) < Date.now() - 30 * 864e5) delete db.checkouts[k];
      save();
      try {
        const base = env.PUBLIC_URL || '';
        const { url: payUrl } = await provider.createCheckout({ ref, plan, email: acc.email, phone: acc.phone, fullName, returnUrl: `${base}/account/?paid=1`, cancelUrl: `${base}/account/`, notifyUrl: `${base}/api/billing/webhook/${provider.name}` });
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
      who = `a:${acc.id}`; const base = PLANS[acc.sub.plan]?.live || LIVE, extra = bonusMin(acc);
      live = { ...base, dayMin: base.dayMin + extra, monthMin: base.monthMin + extra };
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
      if (!r.ok) { if (acc) care(acc.id, 'live_talk_failed'); return send(res, 502, { error: `upstream ${r.status}` }); }
      const { token, conversation_id: cid } = await r.json();
      appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), who, min, ...(cid ? { cid } : {}) }) + '\n');
      // maxSec: the client must end the call by then (the agent's own max duration is the hard stop).
      return send(res, 200, { token, maxSec: Math.round(min * 60) });
    } catch { if (acc) care(acc.id, 'live_talk_failed'); return send(res, 502, { error: 'upstream unreachable' }); }
  }

  // ---------- admin (127.0.0.1:ADMIN_PORT only, bearer token) ----------
  // What is configured, what is missing, and what to paste where. Never prints a secret, only whether it is set.
  async function selfcheck(ping) {
    const has = (k) => !!(env[k] && String(env[k]).trim());
    const pub = env.PUBLIC_URL || '';
    const miss = (keys) => keys.filter((k) => !has(k));
    const grow = { provider: provider.name, charging: BILLING_ON, sandbox: env.GROW_SANDBOX === '1',
      missing: miss(['GROW_USER_ID', 'GROW_PAGE_CODE_RECURRING', 'GROW_PAGE_CODE_ONETIME', 'GROW_WEBHOOK_KEY', 'PUBLIC_URL']),
      notifyUrl: `${pub}/api/billing/webhook/grow?k=…`, note: 'Grow gets the notify address with every checkout; nothing to paste at Grow.' };
    if (env.GROW_WEBHOOK_KEY && String(env.GROW_WEBHOOK_KEY).length < 24) grow.missing.push('GROW_WEBHOOK_KEY (too short: openssl rand -hex 24)');
    const whatsapp = { signIn: WA_ON, number: WA_NUMBER || null, replies: has('WA_TOKEN') && has('WA_PHONE_NUMBER_ID'),
      missing: miss(['WA_NUMBER', 'WA_APP_SECRET', 'WA_VERIFY_TOKEN']), pasteInMeta: { callbackUrl: `${pub}/api/whatsapp/webhook`, verifyToken: has('WA_VERIFY_TOKEN') ? 'the WA_VERIFY_TOKEN value' : null, field: 'messages' } };
    if (ping) whatsapp.ping = await waPing(env);
    const warnings = [];
    if (!/^https:\/\//.test(pub)) warnings.push('PUBLIC_URL must start with https://');
    if (env.MOCK_PAY === '1') warnings.push('MOCK_PAY=1 must never be on the live server');
    if (env.SMS_DEV_ECHO === '1') warnings.push('SMS_DEV_ECHO=1 must never be on the live server');
    if (BILLING_ON && provider.name === 'mock') warnings.push('charging is on with the mock provider');
    if (BILLING_ON && provider.name === 'grow' && grow.missing.length) warnings.push('charging is on but Grow keys are missing');
    return { ok: !warnings.length, grow, whatsapp, sms: { provider: env.SMS_PROVIDER || 'mock', sendsReal: (env.SMS_PROVIDER || 'mock') !== 'mock' }, liveTalk: LIVE_ON && !!KEY, warnings };
  }

  async function admin(req, res) {
    // The support console page itself holds no data; it asks for the token and calls /support/* with it.
    if (req.method === 'GET' && new URL(req.url, 'http://x').pathname === '/support/console' && support) return support.admin(req, res, '/support/console', { send, json });
    const tok = env.ADMIN_TOKEN;
    if (!tok || req.headers.authorization !== `Bearer ${tok}`) return send(res, 401, { error: 'unauthorized' });
    if (new URL(req.url, 'http://x').pathname.startsWith('/support/') && support) return support.admin(req, res, new URL(req.url, 'http://x').pathname, { send, json });
    const path = new URL(req.url, 'http://x').pathname; const b = req.method === 'POST' ? await json(req) : {};
    const find = (who) => db.accounts[db.byEmail[String(who || '').toLowerCase()] || db.byPhone[normalizePhone(who)]];
    if (path === '/selfcheck') return send(res, 200, await selfcheck(new URL(req.url, 'http://x').searchParams.get('ping') === '1'));
    if (path === '/pilot-codes') {
      const n = Math.min(+b.count || 1, 200), days = +b.days || PLANS.pilot.days, codes = [];
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < n; i++) {
        const c = 'YALLA-' + [...randomBytes(6)].map((x) => abc[x % abc.length]).join('');
        db.pilotCodes[c] = { days, created: new Date().toISOString(), note: b.note || '' }; codes.push(c);
      }
      save(); audit({ ev: 'admin_pilot_codes', n, days }); return send(res, 200, { codes, days });
    }
    if (path === '/accounts') return send(res, 200, { accounts: Object.values(db.accounts).map((a) => ({ phone: a.phone, email: a.email, created: a.created, liveTalk: a.liveTalk, sub: a.sub, entitled: entitled(a.sub), usage: usage(`a:${a.id}`) })) });
    if (path === '/grant') {
      const a = find(b.email || b.phone); const plan = PLANS[b.plan]; if (!a || !plan) return send(res, 404, { error: 'no such account or plan' });
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
  return { server: http.createServer(wrap(route)), adminServer: http.createServer(wrap(admin)), db, hooks, close: () => { clearInterval(timer); clearInterval(pruneTimer); }, prune };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const app = createApp();
  app.server.listen(+process.env.PORT || 8090, '127.0.0.1');
  if (process.env.ADMIN_TOKEN) app.adminServer.listen(+process.env.ADMIN_PORT || 8091, '127.0.0.1');
}
