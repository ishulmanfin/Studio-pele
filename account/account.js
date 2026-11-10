// YALLA KIDS parents' area: gate, sign-in, subscription, live-talk consent. No dependencies, no trackers.
const BASE = location.pathname.startsWith('/preview/') ? '/preview' : '';
const $ = (id) => document.getElementById(id);
const show = (id) => { for (const s of ['gate', 'auth', 'dash']) $(s).hidden = s !== id; };

const ERR = {
  bad_email: 'האימייל לא נראה תקין.', weak_password: 'הסיסמה צריכה להיות באורך 8 תווים לפחות.', consent_required: 'צריך לסמן את שתי ההצהרות.',
  exists: 'כבר יש חשבון עם האימייל הזה. אפשר להיכנס.', bad_login: 'האימייל או הסיסמה לא נכונים.', too_many: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.',
  bad_code: 'הקוד לא נמצא או שכבר נוצל.', already_subscribed: 'יש לכם כבר מנוי פעיל.', billing_closed: 'התשלום עוד לא נפתח.',
  provider_unavailable: 'שירות התשלום לא זמין כרגע. נסו שוב מאוחר יותר.', cancel_failed: 'הביטול לא הצליח מול חברת הסליקה. נסו שוב או כתבו לנו.',
  nothing_to_cancel: 'אין מנוי פעיל לביטול.', signup_closed: 'ההרשמה סגורה כרגע.', login_required: 'צריך להתחבר מחדש.', bad_origin: 'הבקשה נחסמה. רעננו את העמוד.',
};
const PW_ERR = { bad_login: 'הסיסמה לא נכונה.' };
const errText = (e) => ERR[e] || 'משהו השתבש. נסו שוב.';

async function api(path, body) {
  const r = await fetch(`${BASE}/api${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body && JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || r.status), { code: j.error, status: r.status });
  return j;
}
// Disable a form's buttons while a request runs, show its error in place.
async function busy(form, msgEl, fn, errs = {}) {
  const btns = form.querySelectorAll('button'); btns.forEach((b) => (b.disabled = true)); msgEl.textContent = '';
  try { await fn(); } catch (e) { msgEl.textContent = errs[e.code] || errText(e.code); if (e.status === 401 && e.code === 'login_required') show('auth'); }
  finally { btns.forEach((b) => (b.disabled = false)); }
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

// ---------- sign in / sign up ----------
let mode = 'login';
function setMode(m) {
  mode = m;
  $('tab-login').setAttribute('aria-selected', m === 'login'); $('tab-signup').setAttribute('aria-selected', m === 'signup');
  document.querySelectorAll('.signup-only').forEach((el) => (el.hidden = m !== 'signup'));
  $('f-auth').password.autocomplete = m === 'signup' ? 'new-password' : 'current-password';
  $('auth-submit').textContent = m === 'signup' ? 'יצירת חשבון' : 'כניסה'; $('auth-msg').textContent = '';
}

// ---------- dashboard ----------
const fmtDate = (iso) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jerusalem' });
const shekels = (ag) => (ag / 100).toLocaleString('he-IL', { maximumFractionDigits: 0 });
let me = null, plans = [];

function render() {
  const s = me.subscription;
  $('who').textContent = me.email;
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
  $('live-toggle').checked = me.liveTalk;

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
  [me, { plans }] = await Promise.all([api('/account/me'), api('/plans')]);
  render(); show('dash');
}

async function start() {
  if (!gateOpen()) { show('gate'); newQuestion(); if (Date.now() < lockedUntil) lock(); return; }
  try { await loadDash(); if (new URLSearchParams(location.search).get('paid')) notice('תודה! התשלום התקבל והמנוי פעיל.'); }
  catch (e) { if (e.status === 401) { show('auth'); setMode('login'); } else { show('auth'); $('auth-msg').textContent = errText(e.code); } }
}

function wire() {
  buildPad();
  document.addEventListener('keydown', (e) => { if (!$('gate').hidden && /^[0-9]$|^Backspace$/.test(e.key)) gateKey(e.key === 'Backspace' ? '⌫' : e.key); });
  $('tab-login').onclick = () => setMode('login'); $('tab-signup').onclick = () => setMode('signup');
  $('f-auth').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('auth-msg'), async () => {
      const body = { email: f.email.value.trim(), password: f.password.value };
      if (mode === 'signup') Object.assign(body, { parentAdult: f.parentAdult.checked, acceptTerms: f.acceptTerms.checked });
      me = await api(mode === 'signup' ? '/account/signup' : '/account/login', body);
      f.reset(); await loadDash(); if (mode === 'signup') notice('החשבון נוצר. אם קיבלתם קוד פיילוט, הזינו אותו למטה.');
    });
  });
  // Switching live talk ON asks for the parent's password; switching it OFF never does.
  $('live-toggle').addEventListener('change', (e) => {
    $('live-msg').textContent = '';
    if (e.target.checked) { e.target.checked = false; $('f-live').hidden = false; $('f-live').password.focus(); return; }
    e.target.disabled = true;
    api('/account/live-talk', { enabled: false }).then((j) => { me = j; render(); }).catch(() => { e.target.checked = true; }).finally(() => { e.target.disabled = false; });
  });
  $('live-cancel').onclick = () => { $('f-live').reset(); $('f-live').hidden = true; $('live-msg').textContent = ''; };
  $('f-live').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('live-msg'), async () => { me = await api('/account/live-talk', { enabled: true, password: f.password.value }); f.reset(); f.hidden = true; render(); }, PW_ERR);
  });
  $('f-pilot').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('pilot-msg'), async () => { me = await api('/pilot/redeem', { code: f.code.value }); f.reset(); render(); notice('הפיילוט הופעל. תיהנו!'); });
  });
  $('cancel-open').onclick = () => { $('cancel-confirm').hidden = false; $('cancel-open').hidden = true; $('cancel-yes').focus(); };
  $('cancel-no').onclick = () => { $('cancel-confirm').hidden = true; $('cancel-open').hidden = false; };
  $('cancel-yes').onclick = () => busy($('cancel-confirm'), $('sub-detail'), async () => { me = await api('/billing/cancel', {}); render(); notice('המנוי בוטל. לא יהיו חיובים נוספים.'); });
  $('f-pass').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('pass-msg'), async () => { me = await api('/account/password', { oldPassword: f.oldPassword.value, newPassword: f.newPassword.value }); f.reset(); f.closest('details').open = false; notice('הסיסמה עודכנה. מכשירים אחרים נותקו.'); }, PW_ERR);
  });
  $('f-delete').addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target;
    busy(f, $('delete-msg'), async () => { await api('/account/delete', { password: f.password.value }); me = null; f.reset(); show('auth'); setMode('signup'); $('auth-msg').textContent = 'החשבון נמחק.'; }, PW_ERR);
  });
  $('logout').onclick = async () => { try { await api('/account/logout', {}); } catch {} show('auth'); setMode('login'); };
}

wire(); start();
