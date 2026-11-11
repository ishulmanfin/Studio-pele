// YALLA KIDS support and customer service. No dependencies (Node 20+).
// Plugs into yalla-api.mjs through a small hook; it never touches accounts or billing directly.
// The host passes `hooks` for anything that changes a subscription, so this module has no money logic.
//
// Privacy: we keep the parent's ticket text, a technical-only device snapshot, and ratings.
// Nothing about the child. Ticket text is scrubbed of phone numbers, emails, ID and card numbers
// before it is stored, and the form asks the parent not to write the child's name.
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

export const TOPICS = ['billing', 'live_talk', 'sound', 'login', 'content', 'idea', 'other'];
export const STATES = ['open', 'waiting', 'solved'];          // waiting = waiting for the parent
const MAX_TEXT = 2000, MAX_MSGS = 60, KEEP_SOLVED_DAYS = 180, KEEP_DIAG_DAYS = 30;
// Proactive care: what we tell a parent when the server sees a problem first.
export const CARE = {
  live_talk_failed: { topic: 'live_talk', text: 'שמנו לב שהשיחה עם מאיה לא הצליחה להתחבר היום. כבר בדקנו, והוספנו לכם 3 דקות שיחה מתנה להיום. אם זה חוזר, אפשר לענות כאן ונטפל.', bonus: true },
  payment_failed: { topic: 'billing', text: 'החיוב האחרון לא עבר. לא נורא: הגישה נשארת פתוחה עוד 3 ימים. אפשר לעדכן אמצעי תשלום באזור ההורים, ואם משהו לא ברור, פשוט לענות כאן.' },
  app_errors: { topic: 'sound', text: 'שמנו לב לכמה תקלות טכניות במכשיר שלכם. אולי כדאי לנסות "תיקון מהיר" במרכז העזרה. אם זה לא עוזר, ענו כאן ונמשיך יחד.' },
};
const CARE_COOLDOWN_DAYS = 7;                                   // at most one care note of each kind a week

// The owner's console is one self-contained page (CSS, JS and fonts inlined), because only
// GET /support/console skips the admin token on the host. It holds no data; it asks for the token.
const CONSOLE_DIR = new URL('../../support/console/', import.meta.url);
const CONSOLE_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: 'self'; connect-src 'self'; frame-ancestors 'none'" };
let consoleCache = null;
function consolePage() {
  if (consoleCache) return consoleCache;
  const rd = (f, enc = 'utf8') => readFileSync(new URL(f, CONSOLE_DIR), enc);
  const css = rd('console.css').replace(/url\(\/support\/console\/fonts\/([\w-]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${rd(`fonts/${f}`, 'base64')})`);
  const js = rd('console.js').replace(/<\/script/gi, '<\\/script');
  consoleCache = rd('index.html')
    .replace(/<link rel="stylesheet" href="\/support\/console\/console\.css">/, () => `<style>${css}</style>`)
    .replace(/<script type="module" src="\/support\/console\/console\.js"><\/script>/, () => `<script type="module">${js}</script>`);
  return consoleCache;
}
const id = (p) => `${p}_${randomBytes(6).toString('hex')}`;
const iso = (t = Date.now()) => new Date(t).toISOString();

// Remove personal details a parent may paste by mistake. Keeps the text readable.
export function scrub(s) {
  return String(s || '').slice(0, MAX_TEXT)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[מייל הוסר]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[מספר כרטיס הוסר]')
    .replace(/(?:\+?972[ -]?|0)5\d(?:[ -]?\d){7}\b/g, '[טלפון הוסר]')
    .replace(/\b\d{9}\b/g, '[מספר זהות הוסר]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
}

// Technical device snapshot. Only whitelisted, non-identifying fields survive.
export function cleanDiag(d = {}) {
  const str = (v, n = 80) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const num = (v) => (Number.isFinite(+v) ? Math.round(+v) : undefined);
  const pick = (v, list) => (list.includes(v) ? v : undefined);
  return {
    app: str(d.app, 24), os: str(d.os, 24), osVersion: str(d.osVersion, 16), browser: str(d.browser, 24), browserVersion: str(d.browserVersion, 16),
    device: pick(d.device, ['tablet', 'phone', 'desktop']), screen: str(d.screen, 16), standalone: d.standalone === true,
    online: d.online !== false, rttMs: num(d.rttMs), downMbps: num(d.downMbps), apiOk: d.apiOk === true, apiMs: num(d.apiMs),
    mic: pick(d.mic, ['granted', 'denied', 'prompt', 'unsupported']), audioUnlocked: d.audioUnlocked === true,
    storageMb: num(d.storageMb), swVersion: str(d.swVersion, 24), lang: str(d.lang, 8),
    errors: (Array.isArray(d.errors) ? d.errors : []).slice(-10).map((e) => scrub(str(e?.msg ?? e, 160)).replace(/https?:\/\/\S+/g, '[url]')),
    fixes: (Array.isArray(d.fixes) ? d.fixes : []).filter((f) => ['cache', 'mic', 'audio', 'reload', 'update'].includes(f)).slice(0, 5),
  };
}

// Host contract (yalla-api.mjs): createSupport({ dir, env, audit, facts, listAccountIds, ...hooks }).
// Optional hooks the host may add later; each action shows as "not available" until it exists:
//   grantDays(aid, days), compensate(aid, kind), pause(aid, days), requestRefund(aid, days, meta),
//   sendSms(aid, text), health() -> { api, liveTalk, billing }, events(aid) -> [{ t, ev, ... }].
export function createSupport({ dir, env = {}, audit: hostAudit, facts, listAccountIds, now = () => Date.now(), hooks: extra = {}, ...rest } = {}) {
  const hooks = { audit: hostAudit, family: facts, ...rest, ...extra };
  // Parent notices go by SMS when the host offers it (short, links to the help center, no details).
  if (!hooks.notify && hooks.sendSms) hooks.notify = (aid, n) => hooks.sendSms(aid, n.kind === 'reply' ? 'YALLA KIDS: יש תשובה חדשה לפנייה שלכם באזור ההורים > עזרה' : 'YALLA KIDS: השארנו לכם הודעה באזור ההורים > עזרה');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = `${dir}/support.json`;
  const empty = () => ({ v: 1, tickets: {}, diags: {}, care: {}, cancels: [], incidents: [] });
  const db = existsSync(file) ? { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) } : empty();
  const save = () => { const tmp = `${file}.tmp`; writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 }); const fd = openSync(tmp, 'r'); fsyncSync(fd); closeSync(fd); renameSync(tmp, file); };
  const audit = hooks.audit || (() => {});
  void env; void listAccountIds;

  // ---------- core ----------
  function addMsg(t, from, text, extra = {}) {
    if (t.msgs.length >= MAX_MSGS) return false;
    t.msgs.push({ id: id('m'), from, text: scrub(text), at: iso(now()), ...extra });
    t.updated = iso(now());
    if (from === 'team' && !extra.internal && !t.firstReply) t.firstReply = t.updated;
    if (from === 'parent') { if (t.state !== 'open') t.state = 'open'; t.unreadTeam = true; } else if (!extra.internal) { t.unreadParent = true; if (t.state === 'open' && from === 'team') t.state = 'waiting'; }
    return true;
  }
  function openTicket(aid, { topic, text, diagId, source = 'parent', subject } = {}) {
    const t = { id: id('t'), aid, topic: TOPICS.includes(topic) ? topic : 'other', state: 'open', source, subject: scrub(subject || '').slice(0, 80) || null,
      created: iso(now()), updated: iso(now()), firstReply: null, diagId: diagId && db.diags[diagId]?.aid === aid ? diagId : null, rating: null, msgs: [] };
    addMsg(t, source === 'care' ? 'team' : 'parent', text);
    if (source === 'care') t.state = 'waiting';
    db.tickets[t.id] = t; save(); audit({ ev: 'support_ticket', aid, tid: t.id, topic: t.topic, source });
    hooks.onTicket?.(t);
    return t;
  }
  const parentView = (t) => ({ id: t.id, topic: t.topic, source: t.source, subject: t.subject, state: t.state, created: t.created, updated: t.updated, rating: t.rating, unread: !!t.unreadParent,
    msgs: t.msgs.filter((m) => !m.internal).map(({ from, text, at }) => ({ from, text, at })) });
  const mine = (aid) => Object.values(db.tickets).filter((t) => t.aid === aid).sort((a, b) => b.updated.localeCompare(a.updated));

  // Proactive care, called by the host when it sees a problem: care(aid, 'live_talk_failed').
  function care(aid, kind, { force = false } = {}) {
    const c = CARE[kind]; if (!c || !aid) return null;
    const key = `${aid}:${kind}`, last = Date.parse(db.care[key] || 0);
    if (!force && now() - last < CARE_COOLDOWN_DAYS * 864e5) return null;
    if (mine(aid).some((t) => t.state !== 'solved' && t.topic === c.topic)) return null;   // already talking about it
    db.care[key] = iso(now());
    const t = openTicket(aid, { topic: c.topic, text: c.text, source: 'care' });
    if (c.bonus) { try { hooks.compensate?.(aid, kind); t.msgs.push({ id: id('m'), from: 'system', text: 'ניתנו 3 דקות שיחה מתנה להיום', at: iso(now()), internal: true }); } catch {} }
    try { hooks.notify?.(aid, { kind: 'care', ticket: t.id, text: c.text }); } catch {}
    save(); return t;
  }

  // ---------- numbers for the owner ----------
  function overview() {
    const all = Object.values(db.tickets), open = all.filter((t) => t.state === 'open');
    const replied = all.filter((t) => t.firstReply && t.source === 'parent').map((t) => (Date.parse(t.firstReply) - Date.parse(t.created)) / 60e3);
    const rated = all.filter((t) => t.rating), weekAgo = now() - 7 * 864e5;
    const byTopic = Object.fromEntries(TOPICS.map((k) => [k, open.filter((t) => t.topic === k).length]));
    const reasons = {}; for (const c of db.cancels) if (Date.parse(c.at) > now() - 30 * 864e5) reasons[c.reason] = (reasons[c.reason] || 0) + 1;
    return {
      open: open.length, waiting: all.filter((t) => t.state === 'waiting').length, newThisWeek: all.filter((t) => Date.parse(t.created) > weekAgo).length,
      oldestOpenMin: open.length ? Math.round((now() - Math.min(...open.map((t) => Date.parse(t.updated)))) / 60e3) : 0,
      medianFirstReplyMin: replied.length ? Math.round(replied.sort((a, b) => a - b)[Math.floor(replied.length / 2)]) : null,
      csat: rated.length ? Math.round((rated.reduce((s, t) => s + t.rating, 0) / rated.length) * 10) / 10 : null, rated: rated.length,
      proactive: all.filter((t) => t.source === 'care' && Date.parse(t.created) > weekAgo).length, byTopic, cancelReasons30d: reasons,
      incidents: db.incidents.filter((i) => !i.resolved),
    };
  }

  // Public status page data: no accounts, no numbers about families.
  async function status() {
    let h = {}; try { h = (await hooks.health?.()) || {}; } catch {}
    const inc = db.incidents.filter((i) => !i.resolved).map(({ title, level, at }) => ({ title, level, at }));
    const svc = (k) => (h[k] === false ? 'down' : inc.some((i) => i.level === 'down') ? 'degraded' : 'ok');
    return { at: iso(now()), services: { app: 'ok', account: svc('api'), liveTalk: svc('liveTalk'), payments: svc('billing') }, incidents: inc };
  }

  function prune() {
    const t0 = now(); let n = 0;
    for (const [k, t] of Object.entries(db.tickets)) if (t.state === 'solved' && t0 - Date.parse(t.updated) > KEEP_SOLVED_DAYS * 864e5) { delete db.tickets[k]; n++; }
    for (const [k, d] of Object.entries(db.diags)) if (t0 - Date.parse(d.at) > KEEP_DIAG_DAYS * 864e5) { delete db.diags[k]; n++; }
    db.cancels = db.cancels.filter((c) => t0 - Date.parse(c.at) < 365 * 864e5);
    if (n) save(); return n;
  }
  // Called by the host when a parent deletes their account.
  function forget(aid) {
    for (const [k, t] of Object.entries(db.tickets)) if (t.aid === aid) delete db.tickets[k];
    for (const [k, d] of Object.entries(db.diags)) if (d.aid === aid) delete db.diags[k];
    for (const k of Object.keys(db.care)) if (k.startsWith(`${aid}:`)) delete db.care[k];
    db.cancels = db.cancels.map((c) => (c.aid === aid ? { ...c, aid: null } : c)); save();
  }

  // ---------- rate limit (per account) ----------
  const hits = new Map();
  const allow = (key, max, perMin) => { const t = now(), a = (hits.get(key) || []).filter((x) => t - x < perMin * 60e3); if (a.length >= max) return false; a.push(t); hits.set(key, a); return true; };

  // ---------- parent routes: /api/support/* ----------
  // The host calls route(...) for every /api/support/ path, after its CSRF check, with the signed-in
  // account (or null) and its own send/json helpers. Returns true when it answered.
  async function route(req, res, path, acc, { send, json }) {
    const M = req.method;
    if (path === '/api/support/status' && M === 'GET') { send(res, 200, await status()); return true; }
    if (!acc) { send(res, 401, { error: 'login_required' }); return true; }
    const aid = acc.id;

    if (path === '/api/support/diagnostics' && M === 'POST') {
      if (!allow(`d:${aid}`, 10, 60)) { send(res, 429, { error: 'too_many' }); return true; }
      const d = { id: id('d'), aid, at: iso(now()), ...cleanDiag(await json(req)) };
      db.diags[d.id] = d; save();
      if (d.errors.length >= 5) care(aid, 'app_errors');
      send(res, 201, { diagId: d.id, hints: hintsFor(d), tips: tipsFor(d) }); return true;
    }
    if (path === '/api/support/tickets' && M === 'GET') { send(res, 200, { tickets: mine(aid).map(parentView) }); return true; }
    if (path === '/api/support/tickets' && M === 'POST') {
      const b = await json(req);
      if (!scrub(b.text)) { send(res, 400, { error: 'empty' }); return true; }
      const openNow = mine(aid).filter((t) => t.state !== 'solved');
      if (openNow.length >= 5) { send(res, 409, { error: 'too_many_open', ticket: openNow[0].id }); return true; }
      if (!allow(`t:${aid}`, 5, 60)) { send(res, 429, { error: 'too_many' }); return true; }
      send(res, 201, parentView(openTicket(aid, b))); return true;
    }
    const m = path.match(/^\/api\/support\/tickets\/(t_[a-f0-9]{12})(?:\/(reply|rate|read|solve))?$/);
    if (m) {
      const t = db.tickets[m[1]];
      if (!t || t.aid !== aid) { send(res, 404, { error: 'not found' }); return true; }
      if (!m[2] && M === 'GET') { send(res, 200, parentView(t)); return true; }
      const b = M === 'POST' ? await json(req) : {};
      if (m[2] === 'reply' && M === 'POST') {
        if (!scrub(b.text)) { send(res, 400, { error: 'empty' }); return true; }
        if (!allow(`r:${aid}`, 20, 60)) { send(res, 429, { error: 'too_many' }); return true; }
        if (!addMsg(t, 'parent', b.text)) { send(res, 409, { error: 'ticket_full' }); return true; }
        t.unreadParent = false; save(); hooks.onTicket?.(t); send(res, 200, parentView(t)); return true;
      }
      if (m[2] === 'read' && M === 'POST') { t.unreadParent = false; save(); send(res, 200, { ok: true }); return true; }
      if (m[2] === 'solve' && M === 'POST') { t.state = 'solved'; t.updated = iso(now()); save(); send(res, 200, parentView(t)); return true; }
      if (m[2] === 'rate' && M === 'POST') {
        const r = Math.round(+b.score); if (!(r >= 1 && r <= 5)) { send(res, 400, { error: 'bad_score' }); return true; }
        t.rating = r; if (b.note) addMsg(t, 'parent', `דירוג: ${b.note}`, { internal: true }); save(); audit({ ev: 'support_rating', tid: t.id, r }); send(res, 200, parentView(t)); return true;
      }
    }
    // Before a parent cancels: record why (one tap) and offer a pause instead. The host decides what a pause is.
    if (path === '/api/support/cancel-intent' && M === 'POST') {
      const b = await json(req); const reason = ['price', 'not_using', 'child_bored', 'tech', 'other'].includes(b.reason) ? b.reason : 'other';
      db.cancels.push({ aid, reason, at: iso(now()) }); save();
      const offers = [];
      if (hooks.pause) offers.push({ id: 'pause', days: 30, text: 'להקפיא את המנוי לחודש, בלי חיוב, ולחזור מתי שנוח' });
      if (reason === 'tech') offers.push({ id: 'help', text: 'לתת לנו לתקן: נפתח פנייה ונחזור אליכם היום' });
      if (reason === 'child_bored') offers.push({ id: 'help', text: 'לקבל מאיתנו רעיונות למשחקים שמתאימים לגיל, בלי עלות' });
      send(res, 200, { offers }); return true;
    }
    if (path === '/api/support/pause' && M === 'POST') {
      if (!hooks.pause) { send(res, 501, { error: 'not_available' }); return true; }
      const r = await hooks.pause(aid, 30); audit({ ev: 'support_pause', aid }); send(res, r?.ok === false ? 409 : 200, r || { ok: true }); return true;
    }
    send(res, 404, { error: 'not found' }); return true;
  }

  // Self-help hints from the snapshot, shown before a ticket is opened.
  function hintsFor(d) {
    const h = [];
    if (!d.online) h.push('offline');
    if (d.mic === 'denied') h.push('mic_denied');
    if (d.mic === 'unsupported') h.push('mic_unsupported');
    if (!d.audioUnlocked) h.push('audio_locked');
    if (d.rttMs > 600 || (d.downMbps !== undefined && d.downMbps < 2)) h.push('slow_network');
    if (!d.apiOk) h.push('server_unreachable');
    if (d.storageMb !== undefined && d.storageMb < 50) h.push('low_storage');
    return h;
  }
  // Suggestions that are not faults: shown apart, so a healthy device still reads "all good".
  const tipsFor = (d) => (d.os === 'iOS' && !d.standalone ? ['ios_add_to_home'] : []);

  // ---------- owner routes: /support/* on the admin port (host checks the admin token first) ----------
  async function admin(req, res, path, { send, json }) {
    const M = req.method, b = M === 'POST' ? await json(req) : {};
    const url = new URL(req.url, 'http://x');
    if (path === '/support/overview') { send(res, 200, overview()); return true; }
    if (path === '/support/tickets') {
      const st = url.searchParams.get('state'); const q = (url.searchParams.get('q') || '').toLowerCase();
      const list = Object.values(db.tickets).filter((t) => (!st || t.state === st) && (!q || t.msgs.some((m) => m.text.toLowerCase().includes(q))))
        .sort((a, b2) => (a.state === 'open') - (b2.state === 'open') || b2.updated.localeCompare(a.updated)).reverse().slice(0, 200);
      send(res, 200, { tickets: list.map((t) => ({ id: t.id, topic: t.topic, state: t.state, source: t.source, created: t.created, updated: t.updated,
        waitingMin: t.state === 'open' ? Math.round((now() - Date.parse(t.updated)) / 60e3) : 0, rating: t.rating, unread: !!t.unreadTeam,
        preview: t.msgs.filter((x) => x.from !== 'system').pop()?.text.slice(0, 120), family: safeFamily(t.aid) })) });
      return true;
    }
    const m = path.match(/^\/support\/tickets\/(t_[a-f0-9]{12})(?:\/(reply|note|state))?$/);
    if (m) {
      const t = db.tickets[m[1]]; if (!t) { send(res, 404, { error: 'not found' }); return true; }
      if (!m[2]) { t.unreadTeam = false; save(); send(res, 200, { ...t, diag: t.diagId ? db.diags[t.diagId] : null, family: safeFamily(t.aid), timeline: timeline(t.aid) }); return true; }
      if (m[2] === 'reply' && b.text) { addMsg(t, 'team', b.text); t.unreadTeam = false; save(); try { hooks.notify?.(t.aid, { kind: 'reply', ticket: t.id, text: scrub(b.text) }); } catch {} send(res, 200, { ok: true }); return true; }
      if (m[2] === 'note' && b.text) { addMsg(t, 'team', b.text, { internal: true }); save(); send(res, 200, { ok: true }); return true; }
      if (m[2] === 'state' && STATES.includes(b.state)) { t.state = b.state; t.updated = iso(now()); save(); send(res, 200, { ok: true }); return true; }
      send(res, 400, { error: 'bad request' }); return true;
    }
    if (path === '/support/action' && M === 'POST') {
      const t = db.tickets[b.ticket]; if (!t) { send(res, 404, { error: 'no ticket' }); return true; }
      const fn = { grant_days: hooks.grantDays, bonus_call: hooks.compensate, refund_request: hooks.requestRefund, pause: hooks.pause }[b.action];
      if (!fn) { send(res, 501, { error: 'not_available' }); return true; }
      const days = Math.min(Math.max(+b.days || 7, 1), 60);
      const r = await fn(t.aid, b.action === 'bonus_call' ? 'manual' : days, { ticket: t.id, reason: scrub(b.reason || '') });
      const label = { grant_days: `הוענקו ${days} ימי מנוי`, bonus_call: 'ניתנו דקות שיחה מתנה להיום', refund_request: 'נשלחה בקשת החזר', pause: `המנוי הוקפא ל-${days} ימים` }[b.action];
      addMsg(t, 'system', label, { internal: true }); save();
      audit({ ev: 'support_action', aid: t.aid, tid: t.id, action: b.action }); send(res, 200, r || { ok: true }); return true;
    }
    if (path === '/support/care' && M === 'POST') { const t = care(b.aid || db.tickets[b.ticket]?.aid, b.kind, { force: true }); send(res, t ? 200 : 409, t ? { ticket: t.id } : { error: 'skipped' }); return true; }
    if (path === '/support/incident' && M === 'POST') {
      if (b.resolve) db.incidents.forEach((i) => { if (i.id === b.resolve) i.resolved = iso(now()); });
      else db.incidents.push({ id: id('i'), title: scrub(b.title).slice(0, 120), level: b.level === 'down' ? 'down' : 'degraded', at: iso(now()) });
      db.incidents = db.incidents.slice(-50); save(); send(res, 200, { incidents: db.incidents }); return true;
    }
    if (path === '/support/console' && M === 'GET') { res.writeHead(200, CONSOLE_HEADERS); res.end(consolePage()); return true; }
    send(res, 404, { error: 'not found' }); return true;
  }
  // What the owner sees about a family: never the child, only the parent's plan facts from the host.
  function safeFamily(aid) { try { return hooks.family?.(aid) || { aid }; } catch { return { aid }; } }
  function timeline(aid) {
    const ev = []; try { ev.push(...(hooks.events?.(aid) || [])); } catch {}
    for (const t of mine(aid)) ev.push({ t: t.created, ev: t.source === 'care' ? 'care_note' : 'ticket', topic: t.topic, tid: t.id });
    for (const d of Object.values(db.diags)) if (d.aid === aid) ev.push({ t: d.at, ev: 'diagnostics', hints: hintsFor(d) });
    for (const c of db.cancels) if (c.aid === aid) ev.push({ t: c.at, ev: 'cancel_intent', reason: c.reason });
    return ev.sort((a, b) => b.t.localeCompare(a.t)).slice(0, 60);
  }

  return { db, route, admin, care, overview, status, prune, forget, openTicket };
}
