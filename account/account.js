// YALLA KIDS parents' area: gate, WhatsApp sign-in (SMS code as the fallback), subscription, live-talk consent. No dependencies, no trackers.
const BASE = location.pathname.startsWith('/preview/') ? '/preview' : '';
const $ = (id) => document.getElementById(id);
const show = (id) => { for (const s of ['gate', 'auth', 'dash']) $(s).hidden = s !== id; };

const ERR = {
  bad_phone: 'מספר הטלפון לא נראה תקין.', bad_code: 'הקוד לא נכון.', code_expired: 'הקוד פג תוקף. שלחו קוד חדש.', consent_required: 'צריך לסמן את שתי ההצהרות.',
  too_many: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.', wa_unavailable: 'וואטסאפ לא זמין כרגע. אפשר לקבל קוד ב-SMS.', sms_unavailable: 'שליחת ה-SMS לא זמינה כרגע. נסו שוב מאוחר יותר.', already_subscribed: 'יש לכם כבר מנוי פעיל.', billing_closed: 'התשלום עוד לא נפתח.',
  provider_unavailable: 'שירות התשלום לא זמין כרגע. נסו שוב מאוחר יותר.', cancel_failed: 'הביטול לא הצליח מול חברת הסליקה. נסו שוב או כתבו לנו.',
  too_many_signups: 'נרשמו יותר מדי חשבונות מהרשת הזו. אפשר לנסות שוב בעוד שעה.', no_plan: 'צריך קוד פיילוט או מסלול כדי להפעיל שיחה חיה.',
  nothing_to_cancel: 'אין מנוי פעיל לביטול.', signup_closed: 'ההרשמה סגורה כרגע.', login_required: 'צריך להתחבר מחדש.', bad_origin: 'הבקשה נחסמה. רעננו את העמוד.',
};
// In the pilot card "bad_code" is about the pilot code, not the SMS code.
const PILOT_ERR = { bad_code: 'הקוד לא נמצא או שכבר נוצל.' };
const errText = (e) => ERR[e] || 'משהו השתבש. נסו שוב.';

async function api(path, body) {
  const r = await fetch(`${BASE}/api${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body && JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || r.status), { code: j.error, status: r.status, retryAfterSec: j.retryAfterSec });
  return j;
}
// Disable a form's buttons while a request runs, show its error in place.
async function busy(form, msgEl, fn, errs = {}) {
  const btns = form.querySelectorAll('button'); btns.forEach((b) => (b.disabled = true)); msgEl.textContent = '';
  try { await fn(); } catch (e) { msgEl.textContent = e.code === 'too_many' && e.retryAfterSec <= 120 ? `אפשר לבקש קוד חדש בעוד ${e.retryAfterSec} שניות.` : errs[e.code] || errText(e.code); if (e.status === 401 && e.code === 'login_required') enterAuth(); }
  finally { btns.forEach((b) => (b.disabled = !!b.dataset.cool)); }
}

// ---------- parent gate: a sum written in words, typed on a number pad; 2 wrong = 60 s lock ----------
const ONES = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
const TEENS = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
const TENS = { 2: 'עשרים', 3: 'שלושים' };
const words = (n) => (n < 10 ? ONES[n] : n < 20 ? TEENS[n - 10] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ו' + ONES[n % 10] : ''));
const rand = (a, b) => a + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * (b - a + 1));
// Wrong count and lock survive a reload (a child can't clear them by refreshing the page).
const GS = { get: () => { try { return JSON.parse(localStorage.getItem('yk-gate-lock')) || { wrong: 0, until: 0 }; } catch { return { wrong: 0, until: 0 }; } },
  set: (v) => { try { localStorage.setItem('yk-gate-lock', JSON.stringify(v)); } catch {} } };
let answer = 0, typed = '', wrong = GS.get().wrong, lockedUntil = GS.get().until;

function newQuestion() {
  const a = rand(11, 29), b = rand(3, 9); answer = a + b; typed = '';
  $('gate-q').textContent = `כמה זה ${words(a)} ועוד ${words(b)}?`; $('gate-input').textContent = '';
}
function gateKey(k) {
  if (Date.now() < lockedUntil) return;
  if (k === '⌫') typed = typed.slice(0, -1); else if (typed.length < 2) typed += k;
  $('gate-input').textContent = typed;
  if (typed.length < 2) return;
  if (+typed === answer) { wrong = 0; GS.set({ wrong: 0, until: 0 }); sessionStorage.setItem('yk-gate', String(Date.now())); $('gate-msg').textContent = ''; return start(); }
  if (++wrong >= 2) {
    wrong = 0; lockedUntil = Date.now() + 60e3; GS.set({ wrong, until: lockedUntil }); lock();
  } else { GS.set({ wrong, until: lockedUntil }); $('gate-msg').textContent = 'לא נכון. נסו תרגיל אחר.'; newQuestion(); }
}
function lock() {
  $('gate-pad').querySelectorAll('button').forEach((b) => (b.disabled = true));
  const tick = () => { const s = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (s > 0) { $('gate-msg').textContent = (s === 1 ? 'נעול. אפשר לנסות שוב בעוד שנייה.' : `נעול. אפשר לנסות שוב בעוד ${s} שניות.`); setTimeout(tick, 1000); }
      else { $('gate-msg').textContent = ''; $('gate-pad').querySelectorAll('button').forEach((b) => (b.disabled = false)); newQuestion(); } };
  tick();
}
function buildPad() {
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = k;
    if (!k) { b.disabled = true; b.style.visibility = 'hidden'; } else { b.addEventListener('click', () => gateKey(k)); if (k === '⌫') b.setAttribute('aria-label', 'מחיקה'); }
    $('gate-pad').append(b);
  }
}
// The gate holds for 15 minutes in this tab.
const gateOpen = () => Date.now() - +(sessionStorage.getItem('yk-gate') || 0) < 15 * 60e3;

// ---------- sign in with a phone and an SMS code (the same flow signs up a new parent) ----------
const digits = (v) => v.replace(/\D/g, '').slice(0, 6);
// "Send again" stays disabled while the server's resend window counts down.
function cooldown(btn, sec) {
  clearInterval(btn._t); const label = btn.dataset.label || (btn.dataset.label = btn.textContent); let left = Math.max(0, Math.round(sec) || 0);
  const tick = () => { if (left > 0) { btn.dataset.cool = '1'; btn.disabled = true; btn.textContent = `${label} (${left--})`; } else { clearInterval(btn._t); delete btn.dataset.cool; btn.disabled = false; btn.textContent = label; } };
  tick(); if (left >= 0 && btn.dataset.cool) btn._t = setInterval(tick, 1000);
}
// 0501234567 or +972501234567 is shown as 050-***-4567.
const maskPhone = (p) => { if (String(p).includes('*')) return p; let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('972')) d = '0' + d.slice(3); return d.length >= 9 ? `${d.slice(0, 3)}-***-${d.slice(-4)}` : '***'; };
let phone = '';
function authStep(step) {
  $('f-phone').hidden = step !== 'phone'; $('f-code').hidden = step !== 'code'; $('wa-login').hidden = step !== 'wa'; $('to-sms').hidden = step !== 'wa';
  if (step !== 'wa') loginWa.stop();
  $('auth-msg').textContent = ''; $('code-msg').textContent = '';
  if (step === 'phone') { $('f-code').reset(); $('consent').hidden = true; }
}
async function sendLoginCode(form, msgEl) {
  await busy(form, msgEl, async () => {
    const j = await api('/auth/code', { phone });
    $('code-to').textContent = phone; authStep('code'); cooldown($('resend'), j.resendInSec ?? 60); $('f-code').code.focus();
  });
}
function verifyCode() {
  const f = $('f-code'), needConsent = !$('consent').hidden;
  if (f.code.value.length < 6) { $('code-msg').textContent = ERR.bad_code; return; }
  if (needConsent && !(f.parentAdult.checked && f.acceptTerms.checked)) { $('code-msg').textContent = ERR.consent_required; return; }
  busy(f, $('code-msg'), async () => {
    const body = { phone, code: f.code.value };
    if (needConsent) Object.assign(body, { parentAdult: true, acceptTerms: true });
    try { me = await api('/auth/verify', body); }
    catch (e) {
      // A new parent: the same code stays valid, we only need the two consents.
      if (e.code === 'consent_required' && !needConsent) { $('consent').hidden = false; f.parentAdult.focus(); return; }
      if (e.code === 'bad_code' || e.code === 'code_expired') { f.code.value = ''; f.code.focus(); }
      throw e;
    }
    authStep('phone'); $('f-phone').reset(); await loadDash();
    if (needConsent) notice('החשבון נוצר. אם קיבלתם קוד פיילוט, הזינו אותו למטה.');
  });
}
// ---------- WhatsApp: the parent sends us a ready-made message with a one-time code; we wait for it ----------
// One block of markup (button + QR + waiting line) serves sign-in, live-talk approval and account deletion.
// `attempt(session)` asks the server; it returns true when done and false while the message has not arrived yet.
let waAvail = null;
function drawQr(el, link) {
  el.replaceChildren(); if (typeof window.qrcode !== 'function') return;
  try { const q = window.qrcode(0, 'M'); q.addData(link); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch {}
}
function waFlow(root, startPath, attempt) {
  const q = (c) => root.querySelector(c); let timer = 0, run = 0, asking = false;
  const stop = () => { clearTimeout(timer); run++; };
  const expire = () => { stop(); q('.wa-live').hidden = true; q('.wa-expired').hidden = false; };
  let tick = () => {};
  async function begin() {
    stop(); const my = run; q('.wa-expired').hidden = true; q('.wa-msg').textContent = ''; root.classList.remove('sent');
    q('.wa-wait-t').textContent = 'הדף יתעדכן לבד אחרי השליחה.';
    let s; try { s = await api(startPath, {}); } catch (e) { if (my === run && e.code !== 'wa_unavailable') q('.wa-msg').textContent = errText(e.code); return false; }
    if (my !== run) return false;
    q('.wa-btn').href = s.waLink; drawQr(q('.wa-qr'), s.waLink); q('.wa-live').hidden = false;
    const until = Date.now() + (s.expiresInSec || 600) * 1000;
    tick = async () => {
      if (my !== run || asking) return; clearTimeout(timer);
      if (Date.now() > until) return expire();
      if (document.visibilityState === 'visible' && root.offsetParent) {
        asking = true;
        try { if (await attempt(s)) { if (my === run) stop(); return; } }
        catch (e) { if (my !== run) return; if (e.code === 'code_expired' || e.status === 404) return expire(); q('.wa-msg').textContent = errText(e.code); }
        finally { asking = false; }
      }
      if (my === run) timer = setTimeout(tick, 2000);
    };
    timer = setTimeout(tick, 2000); return true;
  }
  q('.wa-btn').addEventListener('click', () => { root.classList.add('sent'); q('.wa-wait-t').textContent = 'מחכים להודעה שלכם…'; });
  q('.wa-restart').addEventListener('click', begin);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });   // back from WhatsApp: check right away
  return { begin, stop, poke: () => tick() };
}
let waConsent = false;
const loginWa = waFlow($('wa-login'), '/auth/wa/start', async (s) => {
  const f = $('f-wa-consent'); if (!f.hidden && !waConsent) return false;   // waiting for the two ticks
  const body = { code: s.code, secret: s.secret }; if (waConsent) Object.assign(body, { parentAdult: true, acceptTerms: true });
  let j; try { j = await api('/auth/wa/finish', body); }
  catch (e) { if (e.code === 'consent_required') { waConsent = false; if (f.hidden) { f.hidden = false; $('wa-login').classList.add('got'); f.parentAdult.focus(); } return false; } throw e; }
  if (j.pending) return false;
  const isNew = waConsent; me = j; resetWaLogin(); await loadDash();
  if (isNew) notice('החשבון נוצר. אם קיבלתם קוד פיילוט, הזינו אותו למטה.');
  return true;
});
function resetWaLogin() { waConsent = false; $('f-wa-consent').reset(); $('f-wa-consent').hidden = true; $('wa-login').classList.remove('got'); }
// Show the sign-in screen: WhatsApp first when the server has it, otherwise (or when it fails) the SMS flow, quietly.
async function enterAuth(msg = '') {
  if (waAvail === null) { try { waAvail = !!(await api('/plans')).whatsapp; } catch { waAvail = false; } }
  document.querySelectorAll('[data-wa]').forEach((el) => (el.hidden = !waAvail));
  show('auth'); resetWaLogin();
  if (waAvail) { authStep('wa'); if (!(await loginWa.begin())) { waAvail = false; document.querySelectorAll('[data-wa]').forEach((el) => (el.hidden = true)); authStep('phone'); } }
  else authStep('phone');
  $('auth-msg').textContent = msg; if (msg && waAvail) $('wa-login').querySelector('.wa-msg').textContent = msg;
}

// Step-up for sensitive actions: a fresh code to the account's own phone.
async function sendConfirm(form, msgEl, resendBtn) {
  let ok = false;
  await busy(form, msgEl, async () => { const j = await api('/account/confirm-code', {}); ok = true; if (resendBtn) cooldown(resendBtn, j.resendInSec ?? 60); });
  return ok;
}

// ---------- dashboard ----------
const fmtDate = (iso) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' });
const shekels = (ag) => (ag / 100).toLocaleString('he-IL', { maximumFractionDigits: 0 });
let me = null, plans = [];

function render() {
  const s = me.subscription;
  $('who').textContent = maskPhone(me.phone); document.querySelectorAll('.my-phone').forEach((el) => (el.textContent = maskPhone(me.phone)));
  const st = $('sub-status'); st.classList.toggle('on', me.entitled);
  if (!s || !me.entitled) { st.textContent = 'אין מנוי פעיל'; $('sub-detail').textContent = s ? `המנוי הסתיים ב-${fmtDate(s.periodEnd)}.` : 'אפשר להצטרף לפיילוט עם קוד, או לבחור מסלול.'; }
  else if (s.status === 'pilot') { st.textContent = 'פיילוט חינמי'; $('sub-detail').textContent = `בתוקף עד ${fmtDate(s.periodEnd)}. אין חיוב.`; }
  else if (s.status === 'canceled') { st.textContent = `${s.planName}: בוטל`; $('sub-detail').textContent = `לא נחייב יותר. הגישה נשארת עד ${fmtDate(s.periodEnd)}.`; }
  else if (s.status === 'past_due') { st.textContent = `${s.planName}: בעיה בתשלום`; $('sub-detail').textContent = 'החיוב האחרון לא עבר. עדכנו את אמצעי התשלום בתוך 3 ימים, אחרת הגישה תיעצר.'; }
  else { st.textContent = `${s.planName}: פעיל`; $('sub-detail').textContent = `מתחדש ב-${fmtDate(s.periodEnd)}.`; }
  const canCancel = me.entitled && s && ['active', 'past_due'].includes(s.status);
  $('cancel-box').hidden = !canCancel; $('cancel-confirm').hidden = true; $('cancel-open').hidden = false;
  if (canCancel) $('cancel-until').textContent = fmtDate(s.periodEnd);

  const u = me.liveTalkUsage;
  $('use-day').max = u.dayCapMin; $('use-day').value = Math.min(u.todayMin, u.dayCapMin); $('use-day-t').textContent = `${u.todayMin} מתוך ${u.dayCapMin} דק׳`;
  $('use-month').max = u.monthCapMin; $('use-month').value = Math.min(u.monthMin, u.monthCapMin); $('use-month-t').textContent = `${u.monthMin} מתוך ${u.monthCapMin} דק׳`;
  $('live-toggle').checked = me.liveTalk; $('live-toggle').disabled = !me.entitled && !me.liveTalk;
  $('live-msg').textContent = me.entitled ? '' : ERR.no_plan;

  const paid = me.entitled && s && s.status !== 'pilot';
  $('pilot-card').hidden = paid;
  $('plans-card').hidden = me.entitled && s && ['active', 'past_due'].includes(s.status);
  $('plans-closed').hidden = me.billingOpen;
  $('plans').replaceChildren(...plans.map((p) => {
    const el = document.createElement('div'); el.className = 'plan' + (p.months === 12 ? ' best' : '');
    const perMonth = p.months > 1 ? `<span class="muted small">${(p.priceAgorot / 100 / p.months).toFixed(0)} ₪ לחודש</span>` : '<span class="muted small">חיוב חודשי</span>';
    el.innerHTML = `${p.months === 12 ? '<span class="tag">הכי משתלם</span>' : ''}<b></b><span class="price">${shekels(p.priceAgorot)} ₪</span>${perMonth}<button class="primary" type="button"></button>`;
    el.querySelector('b').textContent = p.name;
    const btn = el.querySelector('button'); btn.textContent = me.billingOpen ? 'להצטרף' : 'ייפתח בקרוב'; btn.disabled = !me.billingOpen;
    btn.addEventListener('click', () => busy(el, $('plans-msg'), async () => { const { url } = await api('/billing/checkout', { plan: p.id }); location.assign(url); }));
    return el;
  }));
}
function notice(text) { $('notice').textContent = text; $('notice').hidden = !text; }

async function loadDash() {
  let plansView; [me, plansView] = await Promise.all([api('/account/me'), api('/plans')]); plans = plansView.plans;
  if (waAvail === null) waAvail = !!plansView.whatsapp; document.querySelectorAll('[data-wa]').forEach((el) => (el.hidden = !waAvail));
  loginWa.stop(); render(); show('dash');
}

async function start() {
  if (!gateOpen()) { show('gate'); newQuestion(); if (Date.now() < lockedUntil) lock(); return; }
  try { await loadDash(); if (new URLSearchParams(location.search).get('paid')) notice('תודה! התשלום התקבל והמנוי פעיל.'); }
  catch (e) { await enterAuth(e.status !== 401 ? errText(e.code) : ''); }
}

function wire() {
  buildPad();
  document.addEventListener('keydown', (e) => { if (!$('gate').hidden && /^[0-9]$|^Backspace$/.test(e.key)) gateKey(e.key === 'Backspace' ? '⌫' : e.key); });
  $('f-phone').addEventListener('submit', (e) => { e.preventDefault(); phone = e.target.phone.value.trim(); sendLoginCode(e.target, $('auth-msg')); });
  $('f-code').addEventListener('submit', (e) => { e.preventDefault(); verifyCode(); });
  // The code submits itself on the 6th digit (also when iOS fills it from the SMS).
  $('f-code').code.addEventListener('input', (e) => { e.target.value = digits(e.target.value); if (e.target.value.length === 6 && $('consent').hidden) verifyCode(); });
  $('consent').addEventListener('change', () => { $('code-msg').textContent = ''; });
  $('resend').onclick = () => { $('f-code').code.value = ''; sendLoginCode($('f-code'), $('code-msg')); };
  $('other-phone').onclick = () => { authStep('phone'); $('f-phone').phone.focus(); };
  $('to-sms').onclick = () => { authStep('phone'); $('f-phone').phone.focus(); };
  $('to-wa').onclick = () => enterAuth();
  $('f-wa-consent').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target, m = $('wa-login').querySelector('.wa-msg');
    if (!(f.parentAdult.checked && f.acceptTerms.checked)) { m.textContent = ERR.consent_required; return; }
    m.textContent = ''; waConsent = true; loginWa.poke();
  });
  $('f-wa-consent').addEventListener('change', () => { $('wa-login').querySelector('.wa-msg').textContent = ''; });
  // Switching live talk ON asks the parent to confirm from their phone (WhatsApp first, SMS code as a fallback); switching it OFF never does.
  const liveWa = waFlow($('wa-live'), '/account/confirm-wa', async (s) => {
    try { me = await api('/account/live-talk', { enabled: true, waCode: s.code, waSecret: s.secret }); } catch (e) { if (e.code === 'not_confirmed_yet') return false; throw e; }
    $('live-wa-box').hidden = true; render(); return true;
  });
  const liveSms = async () => { const f = $('f-live'); f.reset(); f.hidden = false; if (await sendConfirm(f, $('live-msg'), $('live-resend'))) f.code.focus(); else f.hidden = true; };
  const closeLiveWa = () => { liveWa.stop(); $('live-wa-box').hidden = true; };
  $('live-wa-cancel').onclick = closeLiveWa;
  $('live-wa-sms').onclick = () => { closeLiveWa(); liveSms(); };
  $('live-toggle').addEventListener('change', async (e) => {
    $('live-msg').textContent = '';
    if (e.target.checked) {
      e.target.checked = false; $('f-live').hidden = true;
      if (waAvail) { $('live-wa-box').hidden = false; if (await liveWa.begin()) return; $('live-wa-box').hidden = true; }
      await liveSms(); return;
    }
    closeLiveWa();
    e.target.disabled = true;
    api('/account/live-talk', { enabled: false }).then((j) => { me = j; render(); }).catch(() => { e.target.checked = true; }).finally(() => { e.target.disabled = false; });
  });
  $('live-cancel').onclick = () => { $('f-live').reset(); $('f-live').hidden = true; $('live-msg').textContent = ''; };
  $('live-resend').onclick = () => sendConfirm($('f-live'), $('live-msg'), $('live-resend'));
  const submitLive = () => { const f = $('f-live'); busy(f, $('live-msg'), async () => { me = await api('/account/live-talk', { enabled: true, code: f.code.value }); f.reset(); f.hidden = true; render(); }).then(() => { if (!f.hidden) { f.code.value = ''; f.code.focus(); } }); };
  $('f-live').addEventListener('submit', (e) => { e.preventDefault(); submitLive(); });
  $('f-live').code.addEventListener('input', (e) => { e.target.value = digits(e.target.value); if (e.target.value.length === 6) submitLive(); });
  $('f-pilot').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('pilot-msg'), async () => { me = await api('/pilot/redeem', { code: f.code.value }); f.reset(); render(); notice('הפיילוט הופעל. תיהנו!'); }, PILOT_ERR);
  });
  $('cancel-open').onclick = () => { $('cancel-confirm').hidden = false; $('cancel-open').hidden = true; $('cancel-yes').focus(); };
  $('cancel-no').onclick = () => { $('cancel-confirm').hidden = true; $('cancel-open').hidden = false; };
  $('cancel-yes').onclick = () => busy($('cancel-confirm'), $('sub-detail'), async () => { me = await api('/billing/cancel', {}); render(); notice('המנוי בוטל. לא יהיו חיובים נוספים.'); });
  $('f-delete').code.addEventListener('input', (e) => { e.target.value = digits(e.target.value); });
  const delWa = waFlow($('wa-delete'), '/account/confirm-wa', async (s) => {
    try { await api('/account/delete', { waCode: s.code, waSecret: s.secret }); } catch (e) { if (e.code === 'not_confirmed_yet') return false; throw e; }
    deleted(); return true;
  });
  const closeDelWa = () => { delWa.stop(); $('delete-wa-box').hidden = true; $('delete-wa').hidden = !waAvail; };
  const deleted = () => { me = null; closeDelWa(); $('f-delete').reset(); $('delete-step').hidden = true; $('f-delete').closest('details').open = false; enterAuth('החשבון נמחק.'); };
  $('delete-wa').onclick = async () => { $('delete-msg').textContent = ''; $('delete-wa').hidden = true; $('delete-wa-box').hidden = false; if (!(await delWa.begin())) closeDelWa(); };
  $('delete-wa-cancel').onclick = closeDelWa;
  $('delete-send').onclick = async () => { closeDelWa(); if (await sendConfirm($('f-delete'), $('delete-msg'), $('delete-send'))) { $('delete-step').hidden = false; $('f-delete').code.focus(); } };
  $('f-delete').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('delete-msg'), async () => { await api('/account/delete', { code: f.code.value }); deleted(); });
  });
  $('logout').onclick = async () => { try { await api('/account/logout', {}); } catch {} me = null; closeLiveWa(); closeDelWa(); enterAuth(); };
}

wire(); start();
