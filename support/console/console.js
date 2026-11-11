// YALLA KIDS control room: the owner's support console. Same origin as the admin port; every call carries the admin token.
// The token lives in sessionStorage (this tab only). Everything from the server is rendered as text, never as HTML.
const $ = (id) => document.getElementById(id);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v === false || v == null) continue; if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v); }
  el.append(...kids.flat().filter((x) => x != null && x !== false)); return el;
}
const ltr = (t) => h('bdi', { dir: 'ltr' }, String(t));

let token = sessionStorage.getItem('yk-admin') || '';
async function call(path, body) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, ...(body && { 'content-type': 'application/json' }) }, body: body && JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401) { signOut('הטוקן לא התקבל. נסו שוב.'); throw Object.assign(new Error('unauthorized'), { status: 401 }); }
  if (!r.ok) throw Object.assign(new Error(j.error || String(r.status)), { status: r.status, code: j.error });
  return j;
}

// ---------- words ----------
const TOPIC = { billing: 'תשלום', live_talk: 'שיחה עם מאיה', sound: 'קול', login: 'כניסה', content: 'תוכן', idea: 'רעיון', other: 'אחר' };
const STATE = { open: 'פתוחה', waiting: 'ממתינה להורה', solved: 'נפתרה' };
const REASON = { price: 'יקר לי', not_using: 'לא משתמשים', child_bored: 'הילד השתעמם', tech: 'בעיה טכנית', other: 'אחר' };
const PLAN = { pilot: 'פיילוט', monthly: 'חודשי', yearly: 'שנתי' };
const SUB = { pilot: 'פיילוט חינמי', active: 'מנוי פעיל', canceled: 'בוטל', past_due: 'בעיה בתשלום', paused: 'מוקפא' };
const HINT = { offline: 'בלי רשת', mic_denied: 'מיקרופון חסום', mic_unsupported: 'אין תמיכה במיקרופון', audio_locked: 'קול נעול', slow_network: 'רשת איטית', server_unreachable: 'השרת לא ענה', low_storage: 'מעט מקום', ios_add_to_home: 'לא מותקן במסך הבית' };
const EVENT = { ticket: 'פנייה נפתחה', care_note: 'הודעה יזומה נשלחה', diagnostics: 'בדיקה טכנית', cancel_intent: 'כוונת ביטול' };
// Quick replies. Square brackets mark what to fill in before sending.
const TEMPLATES = [
  ['קיבלנו', 'שלום, תודה שכתבתם. קיבלנו את הפנייה ואנחנו בודקים. נחזור אליכם עוד היום.'],
  ['מיקרופון', 'כדי שמאיה תשמע צריך לאשר מיקרופון. באייפד: הגדרות ← Safari ← מיקרופון ← אפשר. באנדרואיד: סמל המנעול ליד הכתובת ← הרשאות ← מיקרופון. אחר כך מרעננים את העמוד. עזר?'],
  ['קול', 'שלוש בדיקות קצרות לקול: לוודא שהמכשיר לא על שקט, לגעת פעם אחת במסך, ולנתק אוזניות Bluetooth. אם עדיין אין קול, הריצו "בדיקה מהירה" במרכז העזרה ונראה את התוצאה אצלנו.'],
  ['תשלום', 'בדקנו את החיוב: [מה מצאנו]. אם משהו עדיין לא מסתדר, ענו כאן ונטפל מיד.'],
  ['פיצוי', 'מצטערים על התקלה. הוספנו לכם [מספר] ימים במתנה, והם כבר מופיעים באזור ההורים. תודה על הסבלנות.'],
  ['סגירה', 'שמחים שהסתדר. אם משהו חוזר, פשוט עונים כאן והפנייה נפתחת מחדש. המשך משחק נעים!'],
];
const ACTIONS = [['grant_days', 'ימי מנוי במתנה'], ['bonus_call', 'שיחת בונוס היום'], ['refund_request', 'בקשת החזר'], ['pause', 'הקפאת מנוי']];

// ---------- time ----------
const TZ = 'Asia/Jerusalem';
const mins = (m) => (m == null ? 'אין' : m < 1 ? 'עכשיו' : m < 60 ? `${m} דק׳` : m < 1440 ? `${Math.round(m / 6) / 10} שע׳` : `${Math.round(m / 144) / 10} ימים`);
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const clock = (iso) => new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const date = (iso) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const when = (iso) => (dayKey(iso) === dayKey(Date.now()) ? clock(iso) : `${new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: TZ })} ${clock(iso)}`);
const sla = (t) => (t.state !== 'open' ? '' : t.waitingMin < 60 ? 'sla-mint' : t.waitingMin < 240 ? 'sla-gold' : 'sla-pink');

// ---------- state ----------
const S = { filter: '', q: '', list: [], sel: null, ticket: null, sig: '', mode: 'reply', level: 'degraded', lastOk: 0 };

// ---------- KPI tiles ----------
function kpi(label, value, unit, sub, tone, extra) {
  return h('article', { class: `kpi ${tone || ''}` }, h('span', { class: 'l' }, label), h('span', { class: 'v' }, unit && h('small', {}, unit), String(value)), extra, h('span', { class: 's' }, sub));
}
const split = (m) => (m == null ? ['—', ''] : m < 60 ? [m, 'דק׳'] : m < 1440 ? [Math.round(m / 6) / 10, 'שע׳'] : [Math.round(m / 144) / 10, 'ימים']);
function renderOverview(o) {
  const [old, oldU] = split(o.open ? o.oldestOpenMin : null), [first, firstU] = split(o.medianFirstReplyMin);
  const oldTone = !o.open ? 'mint' : o.oldestOpenMin < 60 ? 'mint' : o.oldestOpenMin < 240 ? 'gold' : 'pink';
  $('kpis').replaceChildren(
    kpi('פתוחות', o.open, '', o.open ? 'מחכות לתשובה שלנו' : 'התיבה נקייה', o.open ? 'pink' : 'mint'),
    kpi('ממתינות להורה', o.waiting, '', 'הכדור אצלם'),
    kpi('חדשות השבוע', o.newThisWeek, '', '7 הימים האחרונים'),
    kpi('הוותיקה ביותר', old, oldU, o.open ? 'מאז העדכון האחרון' : 'אין פניות פתוחות', oldTone),
    kpi('תגובה ראשונה', first, firstU, 'חציון, פניות של הורים', o.medianFirstReplyMin == null ? '' : o.medianFirstReplyMin <= 60 ? 'mint' : o.medianFirstReplyMin <= 240 ? 'gold' : 'pink'),
    kpi('שביעות רצון', o.csat ?? '—', o.csat ? 'מתוך 5' : '', o.rated ? `${o.rated} דירוגים` : 'עוד אין דירוגים', 'gold',
      h('span', { class: 'stars' }, [1, 2, 3, 4, 5].map((i) => h('i', { class: o.csat && i <= Math.round(o.csat) ? 'on' : '' })))),
    kpi('טיפול יזום', o.proactive, '', 'הודעות יזומות השבוע', 'mint'));
  bars($('by-topic'), Object.keys(TOPIC).map((k) => [TOPIC[k], o.byTopic?.[k] || 0]));
  bars($('cancel-reasons'), Object.keys(REASON).map((k) => [REASON[k], o.cancelReasons30d?.[k] || 0]));
  const inc = o.incidents || [];
  $('incidents').replaceChildren(...(inc.length ? inc.map((i) => h('li', { class: i.level },
    h('span', { class: 'lv' }, i.level === 'down' ? 'השבתה' : 'האטה'), h('span', { class: 'ti' }, i.title), h('time', {}, when(i.at)),
    h('button', { class: 'btn ghost sm', type: 'button', onclick: () => incident({ resolve: i.id }) }, 'סיום האירוע'))) : [h('li', { class: 'calm' }, 'אין אירועים פעילים. ההורים רואים "הכול עובד".')]));
}
function bars(el, rows) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  el.replaceChildren(...rows.map(([k, n]) => h('div', { class: `bar${n ? '' : ' zero'}` }, h('span', { class: 'k' }, k), h('span', { class: 't' }, h('span', { class: 'f', style: `width:${(n / max) * 100}%` })), h('span', { class: 'n' }, String(n)))));
}
async function incident(body) {
  try { await call('/support/incident', body); $('inc-msg').textContent = ''; await refresh(); } catch (e) { if (e.status !== 401) $('inc-msg').textContent = 'זה לא נשמר. נסו שוב.'; }
}

// ---------- inbox ----------
function renderList() {
  const rows = S.list.map((t) => h('button', { class: `row ${sla(t)}${t.unread ? ' is-unread' : ''}`, type: 'button', role: 'option', 'aria-selected': String(t.id === S.sel), 'data-id': t.id, onclick: () => select(t.id) },
    h('span', { class: 'r1' }, t.unread && h('span', { class: 'unread', title: 'לא נקרא' }), h('span', { class: 'topic' }, TOPIC[t.topic] || t.topic),
      t.source === 'care' && h('span', { class: 'tag care' }, 'יזום'), t.state !== 'open' && h('span', { class: `tag ${t.state}` }, STATE[t.state]), t.rating && h('span', { class: 'tag' }, `דירוג ${t.rating}`)),
    h('span', { class: 'wait' }, t.state === 'open' ? `ממתינה ${mins(t.waitingMin)}` : when(t.updated)),
    h('span', { class: 'prev' }, t.preview || ''),
    h('span', { class: 'fam' }, ltr(t.family?.phone || '—'), t.family?.plan ? ` · ${PLAN[t.family.plan] || t.family.plan}` : '')));
  $('list').replaceChildren(...(rows.length ? rows : [h('div', { class: 'none' }, h('strong', {}, S.q ? 'אין תוצאות' : 'אין כאן פניות'), h('span', {}, S.q ? 'נסו מילה אחרת.' : 'שקט זה טוב.'))]));
}
function buildFilters() {
  $('filters').replaceChildren(...[['', 'הכול'], ['open', 'פתוחות'], ['waiting', 'ממתינות'], ['solved', 'נפתרו']].map(([v, name]) =>
    h('button', { type: 'button', 'aria-pressed': String(S.filter === v), onclick: () => { S.filter = v; buildFilters(); loadList(); } }, name)));
}
async function loadList() {
  const p = new URLSearchParams(); if (S.filter) p.set('state', S.filter); if (S.q) p.set('q', S.q);
  S.list = (await call(`/support/tickets?${p}`)).tickets; renderList();
}

// ---------- ticket ----------
function renderTicket(t) {
  $('t-head').replaceChildren(h('h2', {}, TOPIC[t.topic] || t.topic), ...(t.source === 'care' ? [h('span', { class: 'tag care' }, 'טיפול יזום')] : []), h('span', { class: 'id' }, ltr(t.id)),
    ...(t.rating ? [h('span', { class: 'rating' }, `דירוג ${t.rating} מתוך 5`)] : []),
    h('div', { class: 'seg', role: 'group', 'aria-label': 'מצב הפנייה' }, Object.entries(STATE).map(([v, name]) => h('button', { type: 'button', 'aria-pressed': String(t.state === v), onclick: () => act(() => call(`/support/tickets/${t.id}/state`, { state: v })) }, name))));
  let day = ''; const out = [];
  for (const m of t.msgs) {
    if (dayKey(m.at) !== day) { day = dayKey(m.at); out.push(h('div', { class: 'm system' }, h('span', { class: 'b' }, date(m.at)))); }
    const kind = m.from === 'system' ? 'system' : m.internal ? 'note' : m.from;
    const who = kind === 'note' ? (m.from === 'parent' ? 'הערת דירוג מההורה' : 'הערה פנימית · ההורה לא רואה') : kind === 'team' ? 'הצוות' : kind === 'parent' ? 'ההורה' : 'מערכת';
    out.push(h('div', { class: `m ${kind}` }, h('div', { class: 'b' }, m.text), h('span', { class: 'meta' }, `${who} · `, ltr(clock(m.at)))));
  }
  $('conv').replaceChildren(...out); $('conv').scrollTop = $('conv').scrollHeight;
  renderSide(t);
}
const dd = (label, value, tone) => [h('dt', {}, label), h('dd', { class: tone || '', title: typeof value === 'string' ? value : null }, value)];
const yes = (v, good = 'כן', bad = 'לא') => (v ? [good, 'good'] : [bad, 'warn']);
function renderSide(t) {
  const f = t.family || {}, u = f.usage, d = t.diag;
  const meter = (label, used, cap) => h('div', { class: 'meter' }, h('div', {}, h('span', {}, label), h('span', {}, ltr(`${used} / ${cap}`), ' דק׳')), h('i', {}, h('b', { style: `width:${Math.min(100, cap ? (used / cap) * 100 : 0)}%` })));
  const family = h('section', { class: 'card' }, h('h2', {}, 'המשפחה'),
    ltr(f.phone || 'בלי טלפון'), // styled below
    h('div', { class: 'fam-plan' }, h('span', { class: `tag ${f.entitled ? 'solved' : ''}` }, SUB[f.status] || 'ללא מנוי'), f.plan && h('span', { class: 'tag' }, `מסלול ${PLAN[f.plan] || f.plan}`), h('span', { class: `tag ${f.liveTalk ? 'open' : ''}` }, f.liveTalk ? 'שיחה חיה מאושרת' : 'שיחה חיה כבויה')),
    h('dl', { class: 'spec' }, f.periodEnd && dd(f.status === 'active' ? 'מתחדש ב' : 'בתוקף עד', date(f.periodEnd)), f.created && dd('הצטרפו', date(f.created))),
    u && meter('שיחה חיה היום', u.todayMin, u.dayCapMin), u && meter('החודש', u.monthMin, u.monthCapMin));
  family.querySelector('bdi').className = 'fam-phone';

  const device = h('section', { class: 'card' }, h('h2', {}, 'המכשיר', d && h('span', { class: 'dim sm' }, when(d.at))),
    d ? h('dl', { class: 'spec' },
      dd('מערכת', ltr(`${d.os || '?'} ${d.osVersion || ''}`.trim())), dd('דפדפן', ltr(`${d.browser || '?'} ${d.browserVersion || ''}`.trim())),
      dd('סוג', { tablet: 'טאבלט', phone: 'טלפון', desktop: 'מחשב' }[d.device] || 'לא ידוע'), d.screen && dd('מסך', ltr(d.screen)),
      dd('מסך הבית', ...yes(d.standalone, 'מותקן', 'בדפדפן')), dd('רשת', ...yes(d.online, 'מחובר', 'מנותק')),
      dd('השרת', d.apiOk ? ltr(`${d.apiMs ?? '?'} ms`) : 'לא ענה', d.apiOk ? 'good' : 'bad'),
      d.rttMs != null && dd('השהיה', ltr(`${d.rttMs} ms`), d.rttMs > 600 ? 'warn' : ''), d.downMbps != null && dd('הורדה', ltr(`${d.downMbps} Mbps`), d.downMbps < 2 ? 'warn' : ''),
      dd('מיקרופון', { granted: 'מאושר', denied: 'חסום', prompt: 'טרם נשאל', unsupported: 'לא נתמך' }[d.mic] || 'לא ידוע', d.mic === 'granted' ? 'good' : d.mic === 'denied' || d.mic === 'unsupported' ? 'bad' : ''),
      dd('קול', ...yes(d.audioUnlocked, 'פועל', 'נעול')), d.storageMb != null && dd('מקום פנוי', ltr(`${d.storageMb} MB`), d.storageMb < 50 ? 'bad' : ''),
      d.swVersion && dd('גרסה', ltr(d.swVersion)), d.lang && dd('שפה', ltr(d.lang)), d.fixes?.length ? dd('תיקונים שנוסו', ltr(d.fixes.join(', '))) : null)
      : h('p', { class: 'dim sm' }, 'לפנייה הזו לא צורפה בדיקה טכנית.'),
    d?.errors?.length ? h('ul', { class: 'errs' }, d.errors.map((e) => h('li', {}, e))) : null);

  const days = h('input', { type: 'number', min: '1', max: '60', value: '7', 'aria-label': 'ימים' }), reason = h('input', { placeholder: 'סיבה (נשמרת ביומן)', 'aria-label': 'סיבה', maxlength: '200' }), note = h('p', { class: 'msg sm', role: 'status' });
  const actions = h('section', { class: 'card' }, h('h2', {}, 'פעולות'), h('div', { class: 'act-opts' }, days, reason),
    h('div', { class: 'acts' }, ACTIONS.map(([id, name]) => {
      const b = h('button', { class: 'btn ghost sm', type: 'button' }, name); let armed = 0;
      b.onclick = async () => {
        if (!armed) { armed = setTimeout(() => { armed = 0; b.textContent = name; b.classList.remove('sure'); }, 3500); b.textContent = 'לאשר?'; b.classList.add('sure'); return; }   // second tap confirms
        clearTimeout(armed); armed = 0; b.classList.remove('sure'); b.textContent = name; b.disabled = true; note.textContent = '';
        try { await call('/support/action', { ticket: t.id, action: id, days: +days.value || 7, reason: reason.value }); note.textContent = `בוצע: ${name}.`; await openTicket(t.id, true); }
        catch (e) { if (e.status === 501) { b.textContent = `${name} · עדיין לא מחובר`; b.classList.add('off'); note.textContent = 'הפעולה הזו עדיין לא מחוברת לשרת.'; return; } if (e.status !== 401) note.textContent = 'הפעולה לא הצליחה. נסו שוב.'; }
        b.disabled = false;
      };
      return b;
    })), note);

  const timeline = h('section', { class: 'card' }, h('h2', {}, 'ציר זמן'), h('ul', { class: 'tl' }, (t.timeline || []).slice(0, 14).map((e) => h('li', { class: e.ev },
    h('span', {}, EVENT[e.ev] || e.ev, e.topic ? ` · ${TOPIC[e.topic] || e.topic}` : '', e.reason ? ` · ${REASON[e.reason] || e.reason}` : '', e.hints?.length ? ` · ${e.hints.map((x) => HINT[x] || x).join(', ')}` : e.ev === 'diagnostics' ? ' · תקין' : ''),
    h('time', {}, when(e.t))))));
  $('side').replaceChildren(family, device, actions, timeline);
}
const signature = (t) => `${t.id}|${t.updated}|${t.state}|${t.msgs.length}|${t.rating}|${t.timeline?.length}`;
async function openTicket(id, force) {
  const t = await call(`/support/tickets/${id}`); if (S.sel !== id) return;
  S.ticket = t; const sig = signature(t); if (force || sig !== S.sig) { S.sig = sig; renderTicket(t); }
}
function show(view) {
  $('overview').hidden = view !== 'overview'; $('ticket').hidden = view !== 'ticket'; $('side').hidden = view !== 'ticket';
  document.querySelector('.work').classList.toggle('has-ticket', view === 'ticket'); $('to-overview').disabled = view === 'overview';
}
async function select(id) {
  if (!id) { S.sel = S.ticket = null; S.sig = ''; show('overview'); renderList(); return; }
  S.sel = id; S.sig = ''; $('compose-msg').textContent = ''; show('ticket');
  $('list').querySelectorAll('.row').forEach((r) => r.setAttribute('aria-selected', String(r.dataset.id === id)));
  $('list').querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  try { await openTicket(id, true); const row = S.list.find((t) => t.id === id); if (row?.unread) { row.unread = false; renderList(); } } catch (e) { if (e.status === 404) select(null); }
}
// Run a change, then pull fresh numbers so every panel agrees.
async function act(fn) {
  try { await fn(); await refresh(); return true; } catch (e) { if (e.status !== 401) $('compose-msg').textContent = 'זה לא נשמר. נסו שוב.'; return false; }
}
function setMode(m) {
  S.mode = m; $('mode').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === m)));
  $('f-compose').classList.toggle('note', m === 'note'); $('tpls').hidden = m === 'note';
  $('text').placeholder = m === 'note' ? 'הערה פנימית. ההורה לא רואה אותה.' : 'כתבו תשובה להורה';
  $('send').textContent = m === 'note' ? 'שמירת הערה' : 'שליחה להורה'; $('send').className = `btn ${m === 'note' ? 'note' : 'primary'}`;
}

// ---------- refresh loop ----------
async function refresh() {
  try {
    const [o] = await Promise.all([call('/support/overview'), loadList()]); renderOverview(o);
    if (S.sel) await openTicket(S.sel).catch((e) => { if (e.status === 404) select(null); });
    S.lastOk = Date.now(); $('live').classList.remove('off'); tickLive();
  } catch (e) { if (e.status !== 401) { $('live').classList.add('off'); $('live-t').textContent = 'אין חיבור לשרת. מנסה שוב.'; } }
}
function tickLive() { if (!S.lastOk || $('live').classList.contains('off')) return; const s = Math.round((Date.now() - S.lastOk) / 1000); $('live-t').replaceChildren(s < 5 ? 'מעודכן עכשיו' : 'עודכן לפני ', s < 5 ? '' : ltr(s), s < 5 ? '' : ' שנ׳'); }

// ---------- session ----------
let timers = [];
function signOut(msg) {
  token = ''; sessionStorage.removeItem('yk-admin'); timers.forEach(clearInterval); timers = [];
  $('app').hidden = true; $('login').hidden = false; $('login-msg').textContent = msg || ''; $('token').value = ''; $('token').focus();
}
async function enter() {
  $('login').hidden = true; $('app').hidden = false; buildFilters(); setMode('reply'); show(S.sel ? 'ticket' : 'overview');
  await refresh(); if (!token) return;
  timers = [setInterval(() => { if (!document.hidden) refresh(); }, 30e3), setInterval(tickLive, 1000)];
}

function wire() {
  $('f-login').addEventListener('submit', (e) => { e.preventDefault(); token = $('token').value.trim(); if (!token) return; sessionStorage.setItem('yk-admin', token); enter(); });
  $('logout').onclick = () => signOut(''); $('to-overview').onclick = () => select(null);
  let typing = 0; $('q').addEventListener('input', (e) => { clearTimeout(typing); typing = setTimeout(() => { S.q = e.target.value.trim(); loadList().catch(() => {}); }, 220); });
  $('mode').querySelectorAll('button').forEach((b) => (b.onclick = () => { setMode(b.dataset.v); $('text').focus(); }));
  $('tpls').append(...TEMPLATES.map(([name, text]) => h('button', { type: 'button', title: text, onclick: () => { const ta = $('text'); ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${text}` : text; ta.focus(); } }, name)));
  $('f-compose').addEventListener('submit', async (e) => {
    e.preventDefault(); const text = $('text').value.trim(); if (!text || !S.sel) return;
    $('send').disabled = true; $('compose-msg').textContent = '';
    if (await act(() => call(`/support/tickets/${S.sel}/${S.mode === 'note' ? 'note' : 'reply'}`, { text }))) { $('text').value = ''; $('compose-msg').textContent = S.mode === 'note' ? 'ההערה נשמרה.' : 'נשלח להורה.'; }
    $('send').disabled = false;
  });
  $('text').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('f-compose').requestSubmit(); } });
  $('inc-level').querySelectorAll('button').forEach((b) => (b.onclick = () => { S.level = b.dataset.v; $('inc-level').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
  $('f-incident').addEventListener('submit', async (e) => { e.preventDefault(); const title = e.target.title.value.trim(); if (!title) return e.target.title.focus(); await incident({ title, level: S.level }); e.target.reset(); });
  // Keyboard: J/K walk the inbox, R reply, N note, / search, Esc back to the overview.
  document.addEventListener('keydown', (e) => {
    if ($('app').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const inField = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);
    if (e.key === 'Escape') { if (inField) document.activeElement.blur(); else select(null); return; }
    if (inField) return;
    const k = e.key.toLowerCase(), i = S.list.findIndex((t) => t.id === S.sel);
    if (k === 'j' || k === 'k') { const next = S.list[k === 'j' ? Math.min(S.list.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)]; if (next) select(next.id); }
    else if ((k === 'r' || k === 'n') && S.sel) { e.preventDefault(); setMode(k === 'n' ? 'note' : 'reply'); $('text').focus(); }
    else if (k === '/') { e.preventDefault(); $('q').focus(); }
  });
}

wire();
if (token) enter(); else signOut('');
