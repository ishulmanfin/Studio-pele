// YALLA KIDS help center: parent gate, searchable answers, live device check-up, tickets. No dependencies, no trackers.
const BASE = location.pathname.startsWith('/preview/') ? '/preview' : '';
const TEACHER = 'מאיה';                       // the live-talk teacher's name, used in every answer below
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = (area, key, fallback) => ({
  get() { try { return JSON.parse(area.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(v) { try { area.setItem(key, JSON.stringify(v)); } catch {} },
});

// Tiny DOM builder: h('p', { class: 'soft' }, 'text', node). Text always goes in as text, never as HTML.
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'html') el.innerHTML = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat().filter((x) => x != null && x !== false));
  return el;
}
const ICON = {
  check: '<path d="M5 12.5l4.500 4.500L19 7.500"/>', device: '<rect x="5" y="2.500" width="14" height="19" rx="3"/><path d="M10.500 18h3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.200 3 14.800 0 18M12 3c-3 3.200-3 14.800 0 18"/>',
  wifi: '<path d="M2.500 9a14 14 0 0 1 19 0M5.800 12.600a9 9 0 0 1 12.400 0M9 16.100a4.300 4.300 0 0 1 6 0"/><circle cx="12" cy="19.300" r=".8"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v3"/>',
  sound: '<path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500zM15.500 9a4.200 4.200 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11"/>',
  gauge: '<path d="M4 17a8.500 8.500 0 1 1 16 0M12 14l4-5"/><circle cx="12" cy="14.500" r="1"/>',
  cloud: '<path d="M7 18.500a4.500 4.500 0 0 1-.6-8.960A6 6 0 0 1 18 11a3.800 3.800 0 0 1-.5 7.500z"/>',
  box: '<path d="M4 8l8-4 8 4v8.500l-8 4-8-4zM4 8l8 4 8-4M12 12v8.500"/>', home: '<path d="M4 11l8-7 8 7v8.500a1.500 1.500 0 0 1-1.500 1.500h-13A1.500 1.500 0 0 1 4 19.500z"/><path d="M12 9.500v6M9 12.500h6"/>',
  refresh: '<path d="M19.500 12a7.500 7.500 0 1 1-2.200-5.300M19.500 4v4h-4"/>', pulse: '<path d="M3 12h4l2.500-6 4 12 2.500-6h5"/>',
  shield: '<path d="M12 3l7 3v5.500c0 4.200-2.900 7.600-7 9-4.100-1.400-7-4.800-7-9V6z"/><path d="M9 12l2.200 2.200L15.200 10"/>',
  spark: '<path d="M12 2.500l1.900 5.600 5.600 1.900-5.600 1.900L12 17.500l-1.900-5.600L4.500 10l5.600-1.900z"/>',
};
const ico = (name, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.500l2.300 7.200 7.200 2.300-7.200 2.300L12 20.500l-2.300-7.200L2.500 11l7.200-2.300z"/></svg>';

async function api(path, body) {
  const r = await fetch(`${BASE}/api${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body && JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || r.status), { code: j.error, status: r.status });
  return j;
}
const accountUrl = `${BASE}/account/`;
// One friendly sentence for any failed request. 401 and 429 get their own words; nothing here is ever red.
function problem(e) {
  if (e.status === 401) return h('span', {}, 'צריך להיכנס לחשבון. ', h('a', { href: accountUrl }, 'כניסה לאזור ההורים'));
  if (e.status === 429) return 'נסו שוב בעוד רגע.';
  if (e.code === 'ticket_full') return 'השיחה הזו ארוכה מאוד. פתחו פנייה חדשה ונמשיך שם.';
  if (e.code === 'empty') return 'כתבו כמה מילים ונשלח.';
  return navigator.onLine === false ? 'אין חיבור לאינטרנט כרגע. נסו שוב כשהחיבור חוזר.' : 'זה לא הצליח הפעם. נסו שוב בעוד רגע.';
}
const say = (el, msg) => el.replaceChildren(...(msg ? [msg] : []));

// ---------- dates ----------
const TZ = 'Asia/Jerusalem';
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const clock = (iso) => new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
function dayName(iso) {
  const k = dayKey(iso);
  if (k === dayKey(Date.now())) return 'היום';
  if (k === dayKey(Date.now() - 864e5)) return 'אתמול';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', timeZone: TZ });
}
const ltr = (text) => h('bdi', { dir: 'ltr' }, text);

// ---------- parent gate: the same sum in words as the parents' area; 2 wrong = 60 s lock that survives a reload ----------
const ONES = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע'];
const TEENS = ['עשר', 'אחת עשרה', 'שתים עשרה', 'שלוש עשרה', 'ארבע עשרה', 'חמש עשרה', 'שש עשרה', 'שבע עשרה', 'שמונה עשרה', 'תשע עשרה'];
const TENS = { 2: 'עשרים', 3: 'שלושים' };
const words = (n) => (n < 10 ? ONES[n] : n < 20 ? TEENS[n - 10] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ו' + ONES[n % 10] : ''));
const rand = (a, b) => a + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 * (b - a + 1));
const GS = store(localStorage, 'yk-gate-lock', { wrong: 0, until: 0 });   // shared with account.js on purpose
let answer = 0, typed = '', wrong = GS.get().wrong || 0, lockedUntil = GS.get().until || 0;
const gateOpen = () => Date.now() - +(sessionStorage.getItem('yk-gate') || 0) < 15 * 60e3;

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
  if (++wrong >= 2) { wrong = 0; lockedUntil = Date.now() + 60e3; GS.set({ wrong, until: lockedUntil }); lockGate(); }
  else { GS.set({ wrong, until: lockedUntil }); $('gate-msg').textContent = 'לא נכון. נסו תרגיל אחר.'; newQuestion(); }
}
function lockGate() {
  const keys = $('gate-pad').querySelectorAll('button'); keys.forEach((b) => (b.disabled = true));
  const tick = () => {
    const s = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (s > 0) { $('gate-msg').textContent = s === 1 ? 'נעול. אפשר לנסות שוב בעוד שנייה.' : `נעול. אפשר לנסות שוב בעוד ${s} שניות.`; setTimeout(tick, 1000); }
    else { $('gate-msg').textContent = ''; keys.forEach((b) => (b.disabled = !b.textContent)); newQuestion(); }
  };
  tick();
}
function buildPad() {
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
    const b = h('button', { type: 'button', 'aria-label': k === '⌫' ? 'מחיקה' : null }, k);
    if (!k) { b.disabled = true; b.style.visibility = 'hidden'; } else b.addEventListener('click', () => gateKey(k));
    $('gate-pad').append(b);
  }
  document.addEventListener('keydown', (e) => { if (!$('gate').hidden && /^[0-9]$|^Backspace$/.test(e.key)) gateKey(e.key === 'Backspace' ? '⌫' : e.key); });
}

// ---------- answers ----------
const CATS = [['start', 'התחלה'], ['sound', 'קול ומיקרופון'], ['live', `שיחה עם ${TEACHER}`], ['billing', 'מנוי ותשלום'], ['privacy', 'פרטיות'], ['install', 'התקנה על המסך הראשי']];
// Each answer: [category, question, answer as small HTML (static text written here, never user input), extra search words].
const FAQ = [
  ['start', 'מה זה YALLA KIDS, ולאיזה גיל זה מתאים?', `<p>YALLA KIDS היא סביבת משחק לילדים בני 3 עד 7 שלומדים אנגלית דרך משחקים, שירים ודמויות. הילדים לא צריכים לדעת לקרוא: הכול מוסבר בקול ובתמונות.</p>`, 'גילאים אנגלית'],
  ['start', 'איך מתחילים?', `<ol><li>נכנסים ל<a href="${accountUrl}">אזור ההורים</a> עם מספר הטלפון ומקבלים קוד ב-SMS.</li><li>מזינים קוד פיילוט, או בוחרים מסלול.</li><li>חוזרים למסך הראשי ונותנים לילד לבחור משחק.</li></ol>`, 'הרשמה כניסה קוד התחברות'],
  ['start', 'כמה זמן כדאי לשחק בכל פעם?', `<p>לרוב הילדים בגיל הזה מתאימים מפגשים קצרים, 10 עד 15 דקות, כמה פעמים בשבוע. עדיף קצר ושמח מארוך ומעייף. כשנגמר הכוח, סוגרים וממשיכים מחר.</p>`, 'זמן מסך דקות'],
  ['sound', 'אין קול. מה עושים?', `<ol><li>בודקים שהמכשיר לא על מצב שקט ושעוצמת הקול פתוחה.</li><li>נוגעים פעם אחת במסך: דפדפנים מפעילים קול רק אחרי נגיעה.</li><li>אם מחוברות אוזניות Bluetooth, מנתקים ומנסים שוב.</li></ol><p>לא עזר? <a href="#checkup">הבדיקה המהירה</a> מוצאת את רוב תקלות הקול תוך כמה שניות.</p>`, 'שקט לא שומעים ווליום רמקול אוזניות'],
  ['sound', `המיקרופון לא עובד, או ש${TEACHER} לא שומעת`, `<p>בדרך כלל ההרשאה למיקרופון נחסמה בטעות.</p><p><b>באייפד ובאייפון:</b> הגדרות, Safari, מיקרופון, ובוחרים "אפשר".</p><p><b>באנדרואיד:</b> לוחצים על סמל המנעול ליד כתובת האתר, הרשאות, מיקרופון, ובוחרים "התר".</p><p>אחר כך חוזרים למשחק ומרעננים את העמוד.</p>`, 'הרשאה חסום mic לא שומעת'],
  ['sound', 'בשביל מה צריך מיקרופון?', `<p>המיקרופון משמש רק לשיחה החיה עם ${TEACHER}, ורק אחרי שהורה אישר אותה. בכל שאר המשחקים המיקרופון כבוי.</p>`, 'הרשאות למה'],
  ['live', `מה זו השיחה החיה עם ${TEACHER}?`, `<p>${TEACHER} היא מורה ממוחשבת (AI) שמדברת עם הילד באנגלית פשוטה, בקול. הקול של הילד עובר בזמן אמת לספק הקול שלנו כדי ש${TEACHER} תוכל לענות. השיחה לא מוקלטת ולא נשמרת, ושם הילד לא נשלח.</p>`, 'בינה מלאכותית ai מורה שיחה'],
  ['live', 'כמה זמן אפשר לדבר?', `<p>עד <bdi dir="ltr">3</bdi> דקות בכל שיחה, עד <bdi dir="ltr">3</bdi> דקות ביום, ועד <bdi dir="ltr">30</bdi> דקות בחודש. שיחות קצרות שומרות על ריכוז, ומשאירות טעם של עוד.</p>`, 'מגבלה דקות הגבלה נגמר זמן'],
  ['live', 'איך מפעילים או מכבים את השיחה החיה?', `<p>רק הורה יכול להפעיל: ב<a href="${accountUrl}">אזור ההורים</a> מסמנים את האישור ומאשרים עם קוד שמגיע ב-SMS. לכבות אפשר בכל רגע, בלחיצה אחת ובלי קוד.</p>`, 'אישור הורה הפעלה כיבוי sms'],
  ['live', 'השיחה לא מתחברת', `<ol><li>בודקים שהמיקרופון מאושר (ראו "המיקרופון לא עובד").</li><li>בודקים שהחיבור לאינטרנט יציב.</li><li>ייתכן שהדקות של היום או של החודש נגמרו. המונה מופיע ב<a href="${accountUrl}">אזור ההורים</a>.</li></ol><p>אם זה ממשיך, מריצים <a href="#checkup">בדיקה מהירה</a> ופותחים פנייה. הבדיקה מצורפת אוטומטית.</p>`, 'נתקע לא עונה מתנתק תקלה'],
  ['billing', 'כמה זה עולה?', `<p>בתקופת הפיילוט, מי שקיבל קוד נהנה מ-<bdi dir="ltr">60</bdi> ימים בחינם, בלי אמצעי תשלום. אחר כך אפשר לבחור מסלול: חודשי ב-<bdi dir="ltr">39 ₪</bdi> לחודש, או שנתי ב-<bdi dir="ltr">349 ₪</bdi> לשנה.</p>`, 'מחיר עלות פיילוט חינם שנתי חודשי שקל'],
  ['billing', 'איך מבטלים את המנוי?', `<p>בלחיצה אחת ב<a href="${accountUrl}">אזור ההורים</a>, בלי טלפונים ובלי טפסים. אחרי הביטול לא יהיו חיובים נוספים, והגישה נשארת פתוחה עד סוף התקופה שכבר שולמה.</p>`, 'ביטול להפסיק חיוב'],
  ['billing', 'מגיע לי החזר כספי?', `<p>החזרים ניתנים לפי החוק. פותחים <a href="#new">פנייה בנושא תשלום</a>, ואנחנו בודקים ועונים בהקדם.</p>`, 'זיכוי כסף חזרה חיוב שגוי'],
  ['privacy', 'איזה מידע נשמר אצלכם?', `<p>אנחנו לא שומרים שום מידע על הילד. מה שנשמר הוא מספר הטלפון של ההורה, המסלול, ומונה דקות השיחה.</p><p>פניות לתמיכה נשמרות עד <bdi dir="ltr">180</bdi> יום אחרי שנפתרו, ואז נמחקות. תמונת המצב הטכנית של המכשיר נמחקת אחרי <bdi dir="ltr">30</bdi> יום.</p>`, 'נתונים מידע אישי מחיקה שמירה'],
  ['privacy', 'מה בדיוק נאסף בבדיקה המהירה?', `<p>רק פרטים טכניים: סוג המכשיר והדפדפן, גודל המסך, מצב החיבור, האם המיקרופון והקול מאושרים, והמקום הפנוי. אין בה שמות, תמונות, הקלטות או מיקום.</p>`, 'אבחון בדיקה טכנית מכשיר'],
  ['install', 'איך מוסיפים למסך הבית באייפד או באייפון?', `<ol><li>פותחים את YALLA KIDS בדפדפן Safari.</li><li>לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה).</li><li>בוחרים "הוסף למסך הבית", ואז "הוסף".</li></ol><p>מעכשיו המשחק נפתח במסך מלא, כמו אפליקציה.</p>`, 'אייפון אייפד ios ספארי אפליקציה התקנה'],
  ['install', 'איך מתקינים באנדרואיד?', `<ol><li>פותחים את YALLA KIDS בדפדפן Chrome.</li><li>לוחצים על שלוש הנקודות למעלה.</li><li>בוחרים "התקנת האפליקציה" או "הוספה למסך הבית".</li></ol>`, 'android כרום טאבלט סמסונג אפליקציה'],
];
const plain = (s) => s.replace(/<[^>]+>/g, ' ').replace(/[֑-ׇ"'׳״.,:?!()-]/g, ' ').toLowerCase();
let faqCat = '';

function highlight(root, terms) {
  if (!terms.length) return;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    const parts = n.nodeValue.split(re); if (parts.length < 2) continue;
    n.replaceWith(...parts.map((p, i) => (i % 2 ? h('mark', {}, p) : p)));
  }
}
function renderFaq() {
  const terms = plain($('faq-q').value).split(/\s+/).filter((t) => t.length > 1);
  const hits = FAQ.filter(([cat, q, a, extra]) => (!faqCat || terms.length || cat === faqCat) && terms.every((t) => plain(`${q} ${a} ${extra}`).includes(t)));
  $('faq-list').replaceChildren(...CATS.filter(([id]) => hits.some((f) => f[0] === id)).map(([id, name]) =>
    h('div', { class: 'faq-group' }, h('h3', {}, name), h('div', { class: 'cols' }, hits.filter((f) => f[0] === id).map(([, q, a]) => {
      const qa = h('details', { class: 'qa', open: terms.length > 0 && hits.length <= 3 }, h('summary', {}, h('span', {}, q)), h('div', { class: 'a', html: a }));
      highlight(qa, terms); return qa;
    })))));
  $('faq-empty').hidden = hits.length > 0;
  $('faq-count').textContent = terms.length ? (hits.length === 1 ? 'תשובה אחת' : hits.length ? `${hits.length} תשובות` : '') : '';
  $('faq-cats').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(!terms.length && b.dataset.cat === faqCat)));
}
function buildFaq() {
  $('faq-cats').append(...[['', 'הכול'], ...CATS].map(([id, name]) => h('button', { type: 'button', 'data-cat': id, 'aria-pressed': 'false', onclick: () => { faqCat = id; $('faq-q').value = ''; renderFaq(); } }, name)));
  $('faq-q').addEventListener('input', renderFaq);
  $('faq-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('faq').scrollIntoView(); e.target.blur(); } });
  renderFaq();
}

// ---------- live status strip ----------
const SERVICES = [['app', 'המשחקים'], ['account', 'אזור ההורים'], ['liveTalk', `שיחה עם ${TEACHER}`], ['payments', 'תשלומים']];
const SERVICE_STATE = { ok: 'עובד', degraded: 'איטי מהרגיל', down: 'בהפסקה קצרה' };
function renderStatus(st) {
  const sv = st?.services || {}, inc = st?.incidents || [];
  const off = SERVICES.filter(([k]) => sv[k] && sv[k] !== 'ok');
  const ok = !!st && !off.length && !inc.length;
  const title = !st ? 'לא הצלחנו לבדוק את המערכות' : ok ? 'הכול עובד' : off.length === 1 ? `${off[0][1]}: ${SERVICE_STATE[sv[off[0][0]]]}` : 'חלק מהשירותים בטיפול';
  $('status').className = `status glass ${ok ? 'ok' : 'warn'}`; $('status-pill').className = `status-pill ${ok ? 'ok' : 'warn'}`;
  $('status-h').textContent = $('status-pill-t').textContent = title;
  $('status-sub').replaceChildren(...(!st ? ['ייתכן שאין חיבור לאינטרנט.'] : [ok ? 'כל המערכות פעילות. נבדק ב-' : 'אנחנו על זה. נבדק ב-', ltr(clock(st.at))]));
  $('services').replaceChildren(...SERVICES.map(([k, name]) => h('li', { class: sv[k] || 'ok' }, h('span', { class: 'n' }, name), h('span', { class: 's' }, st ? SERVICE_STATE[sv[k]] || SERVICE_STATE.ok : 'לא ידוע'))));
  $('incidents').hidden = !inc.length;
  $('incidents').replaceChildren(...inc.map((i) => h('li', { class: i.level }, h('span', {}, i.title), h('time', { datetime: i.at }, `${dayName(i.at)} `, ltr(clock(i.at))))));
}
async function loadStatus() { try { renderStatus(await api('/support/status')); } catch { renderStatus(null); } }

// ---------- the dial ----------
const N = 12, R = 100, C = 2 * Math.PI * R;
function buildDial(el, core) {
  const nodes = Array.from({ length: N }, (_, i) => { const a = (i / N) * 2 * Math.PI - Math.PI / 2; return `<circle class="node" style="--i:${i}" cx="${(120 + R * Math.cos(a)).toFixed(1)}" cy="${(120 + R * Math.sin(a)).toFixed(1)}" r="6"/>`; }).join('');
  el.innerHTML = `<div class="sweep"></div><svg viewBox="0 0 240 240" aria-hidden="true"><defs><linearGradient id="g-${el.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF4F8B"/><stop offset="1" stop-color="#FFD23F"/></linearGradient></defs>
    <circle class="track" cx="120" cy="120" r="${R}"/><circle class="arc" cx="120" cy="120" r="${R}" stroke="url(#g-${el.id})" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"/>${nodes}</svg><div class="core"></div>`;
  el.querySelector('.core').innerHTML = core;
}
function dialSet(el, done, states) {
  el.querySelector('.arc').setAttribute('stroke-dashoffset', (C * (1 - done / N)).toFixed(1));
  el.querySelectorAll('.node').forEach((n, i) => n.setAttribute('class', `node ${states[i] || ''}`));
}

// ---------- check-up: collect a technical snapshot, one visible step at a time ----------
function detect() {
  const ua = navigator.userAgent, touch = navigator.maxTouchPoints > 1; let m, os = 'other', osVersion = '', browser = 'other', browserVersion = '', device = 'desktop';
  if ((m = ua.match(/(iPhone|iPad|iPod).*? OS (\d+[_.]\d+)/))) { os = 'iOS'; osVersion = m[2].replace('_', '.'); device = m[1] === 'iPad' ? 'tablet' : 'phone'; }
  else if (/Macintosh/.test(ua) && touch) { os = 'iOS'; osVersion = (ua.match(/Version\/(\d+\.\d+)/) || [])[1] || ''; device = 'tablet'; }   // iPadOS sends a Mac user agent
  else if ((m = ua.match(/Android (\d+(?:\.\d+)?)/))) { os = 'Android'; osVersion = m[1]; device = /Mobile/.test(ua) ? 'phone' : 'tablet'; }
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if ((m = ua.match(/Windows NT (\d+\.\d+)/))) { os = 'Windows'; osVersion = m[1]; }
  else if ((m = ua.match(/Mac OS X (\d+[_.]\d+)/))) { os = 'macOS'; osVersion = m[1].replace('_', '.'); }
  else if (/Linux/.test(ua)) os = 'Linux';
  for (const [name, re] of [['Edge', /Edg(?:A|iOS)?\/(\d+)/], ['Samsung Internet', /SamsungBrowser\/(\d+)/], ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/], ['Chrome', /(?:Chrome|CriOS)\/(\d+)/], ['Safari', /Version\/(\d+(?:\.\d+)?).*Safari/]]) {
    if ((m = ua.match(re))) { browser = name; browserVersion = m[1]; break; }
  }
  return { os, osVersion, browser, browserVersion, device };
}
async function micState() {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  try { const p = await navigator.permissions.query({ name: 'microphone' }); return ['granted', 'denied'].includes(p.state) ? p.state : 'prompt'; } catch { return 'prompt'; }   // Safari has no such query
}
let audioCtx = null;
async function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  try {
    audioCtx = audioCtx || new AC();
    if (audioCtx.state !== 'running') await Promise.race([audioCtx.resume(), wait(900)]);
    const src = audioCtx.createBufferSource(); src.buffer = audioCtx.createBuffer(1, 1, 22050); src.connect(audioCtx.destination); src.start(0);   // one silent sample
    return audioCtx.state === 'running';
  } catch { return false; }
}
async function pingApi() {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000), t0 = performance.now();
  try {
    const r = await fetch(`${BASE}/api/support/status`, { cache: 'no-store', credentials: 'same-origin', signal: ctl.signal });
    const st = r.ok ? await r.json() : null; if (st) renderStatus(st);
    return { apiOk: r.ok, apiMs: Math.round(performance.now() - t0) };
  } catch { return { apiOk: false, apiMs: Math.round(performance.now() - t0) }; } finally { clearTimeout(timer); }
}
const L = (text) => `\u2066${text}\u2069`;      // keeps a Latin or numeric value in its own left-to-right island
const DEVICE_HE = { tablet: 'טאבלט', phone: 'טלפון', desktop: 'מחשב' };
const MIC_HE = { granted: ['ok', 'מאושר'], prompt: ['info', 'יבקש אישור בשיחה הראשונה'], denied: ['warn', 'חסום'], unsupported: ['warn', 'לא נתמך בדפדפן הזה'] };
// Each step fills part of the snapshot `d` and returns [state, text] for its row. States: ok, warn, info.
const CHECKS = [
  ['המכשיר', async (d) => { Object.assign(d, detect()); return ['ok', `${DEVICE_HE[d.device]} · ${d.os === 'other' ? 'מערכת לא מזוהה' : L(`${d.os} ${d.osVersion}`.trim())}`]; }],
  ['הדפדפן', async (d) => ['ok', d.browser === 'other' ? 'לא מזוהה' : L(`${d.browser} ${d.browserVersion}`.trim())]],
  ['המסך', async (d) => { d.screen = `${screen.width}x${screen.height}@${Math.round((devicePixelRatio || 1) * 10) / 10}`; return ['ok', L(`${screen.width} × ${screen.height}`)]; }],
  ['חיבור לאינטרנט', async (d) => { d.online = navigator.onLine !== false; return d.online ? ['ok', 'מחובר'] : ['warn', 'אין חיבור']; }],
  ['השרת שלנו', async (d) => { Object.assign(d, await pingApi()); return d.apiOk ? ['ok', `ענה תוך ${L(`${d.apiMs} ms`)}`] : ['warn', 'לא ענה']; }],
  ['מהירות הרשת', async (d) => {
    const c = navigator.connection; if (c && Number.isFinite(c.rtt) && c.rtt > 0) d.rttMs = c.rtt; if (c && Number.isFinite(c.downlink) && c.downlink > 0) d.downMbps = c.downlink;
    const slow = d.rttMs > 600 || d.downMbps < 2 || (d.apiOk && d.apiMs > 2500);
    return [slow ? 'warn' : d.apiOk ? 'ok' : 'info', slow ? 'איטית' : d.downMbps ? L(`${d.downMbps} Mbps`) : d.apiOk ? 'טובה' : 'לא נמדדה'];
  }],
  ['מיקרופון', async (d) => { d.mic = await micState(); return MIC_HE[d.mic]; }],
  ['קול', async (d) => { d.audioUnlocked = await unlockAudio(); return d.audioUnlocked ? ['ok', 'פועל'] : ['warn', 'עוד לא הופעל']; }],
  ['מקום פנוי', async (d) => {
    try { const e = await navigator.storage.estimate(); d.storageMb = Math.max(0, Math.round((e.quota - e.usage) / 1048576)); } catch { return ['info', 'לא נמדד']; }
    return [d.storageMb < 50 ? 'warn' : 'ok', L(d.storageMb >= 1024 ? `${Math.round(d.storageMb / 102.4) / 10} GB` : `${d.storageMb} MB`)];
  }],
  ['מסך הבית', async (d) => { d.standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; return d.standalone ? ['ok', 'מותקן'] : ['info', 'נפתח בדפדפן']; }],
  ['גרסת המשחק', async (d) => {
    let reg = false, ver = ''; try { reg = (await navigator.serviceWorker.getRegistrations()).length > 0; ver = ((await caches.keys()).find((k) => /-v\d+$/.test(k)) || '').match(/v\d+$/)?.[0] || ''; } catch {}
    d.swVersion = ver || (reg ? 'active' : 'none');
    return ver ? ['ok', `${L(ver)}, מוכנה גם בלי רשת`] : reg ? ['ok', 'מעודכנת'] : ['info', 'תיטען בכניסה הבאה'];
  }],
  ['תקלות אחרונות', async (d) => { d.errors = store(sessionStorage, 'yk_errors', []).get().slice(-10).map((e) => String(e?.msg ?? e).slice(0, 160)); return d.errors.length ? ['warn', d.errors.length === 1 ? 'תקלה אחת נרשמה' : `${d.errors.length} תקלות נרשמו`] : ['ok', 'אין']; }],
];
// The same rules as the server's hintsFor(), used only when the parent is signed out or the server can't be reached.
function localHints(d) {
  const x = [];
  if (!d.online) x.push('offline'); if (d.mic === 'denied') x.push('mic_denied'); if (d.mic === 'unsupported') x.push('mic_unsupported'); if (!d.audioUnlocked) x.push('audio_locked');
  if (d.rttMs > 600 || d.downMbps < 2) x.push('slow_network'); if (!d.apiOk) x.push('server_unreachable'); if (d.storageMb < 50) x.push('low_storage'); 
  return x;
}
const localTips = (d) => (d.os === 'iOS' && !d.standalone ? ['ios_add_to_home'] : []);

const FIXES = store(sessionStorage, 'yk_fixes', []);          // quick fixes tried in this visit, sent with the next snapshot
const DIAG = store(sessionStorage, 'yk_diag', null);          // { id, at } of the last saved snapshot, attached to a new ticket
const recordFix = (name) => FIXES.set([...new Set([...FIXES.get(), name])].slice(-5));
let snap = null, scanning = false, dirty = false, signedIn = null;
let armed = false;                                            // true once the parent tapped "start": sound can only be unlocked from a tap

const FIX = {
  cache: { label: 'ניקוי מטמון', icon: 'box', async run() {
    if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    if (navigator.serviceWorker) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    return 'המטמון נוקה. בכניסה הבאה למשחק הכול ייטען מחדש.';
  } },
  mic: { label: 'אישור מיקרופון', icon: 'mic', async run() {
    try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()); }
    catch { throw new Error('הדפדפן עדיין חוסם את המיקרופון. צריך לאשר אותו בהגדרות, לפי ההסבר כאן.'); }
    if (snap) snap.mic = 'granted'; return 'המיקרופון מאושר.';
  } },
  audio: { label: 'הפעלת קול', icon: 'sound', async run() {
    if (!(await unlockAudio())) throw new Error('הקול עדיין לא הופעל. בדקו שהמכשיר לא על מצב שקט.');
    if (snap) snap.audioUnlocked = true; return 'הקול פועל.';
  } },
  reload: { label: 'טעינה מחדש', icon: 'refresh', async run() { sessionStorage.setItem('yk_recheck', '1'); location.reload(); return 'טוענים מחדש'; } },
};
async function runFix(name, btn, msgEl) {
  btn.disabled = true;
  try { const text = await FIX[name].run(); recordFix(name); dirty = true; say(msgEl, text); return true; }
  catch (e) { say(msgEl, e.message || 'זה לא הצליח הפעם.'); return false; }
  finally { btn.disabled = false; }
}
// What each server hint means for a parent, and the one-tap fix when there is one.
const HINTS = {
  offline: { icon: 'wifi', title: 'אין חיבור לאינטרנט', text: 'המכשיר לא מחובר כרגע. בדקו שה-Wi-Fi דלוק ושמצב טיסה כבוי, ואז בדקו שוב.' },
  mic_denied: { icon: 'mic', title: 'המיקרופון חסום', fix: 'mic', fixLabel: 'לבקש הרשאה שוב',
    text: `בלי מיקרופון ${TEACHER} לא יכולה לשמוע. אם הלחיצה לא פותחת חלון אישור: באייפד, הגדרות ← Safari ← מיקרופון. באנדרואיד, סמל המנעול ליד הכתובת ← הרשאות.` },
  mic_unsupported: { icon: 'mic', title: 'הדפדפן הזה לא תומך במיקרופון', text: 'המשחקים יעבדו, אבל לשיחה החיה צריך Safari באייפד ובאייפון, או Chrome באנדרואיד, בגרסה עדכנית.' },
  audio_locked: { icon: 'sound', title: 'הקול עוד לא הופעל', fix: 'audio', fixLabel: 'להפעיל קול', text: 'דפדפנים מפעילים קול רק אחרי נגיעה. לחיצה אחת כאן פותחת אותו. בדקו גם שהמכשיר לא על מצב שקט.' },
  slow_network: { icon: 'gauge', title: 'החיבור איטי', text: 'המשחקים יעבדו, אבל השיחה החיה עלולה להיקטע. נסו להתקרב לנתב, או לעבור לרשת אחרת.' },
  server_unreachable: { icon: 'cloud', title: 'לא הצלחנו להגיע לשרת', fix: 'reload', fixLabel: 'לטעון מחדש', text: 'ייתכן שזו תקלה זמנית אצלנו או ברשת שלכם. משחקים שכבר נטענו ממשיכים לעבוד גם בלי חיבור.' },
  low_storage: { icon: 'box', title: 'נשאר מעט מקום במכשיר', fix: 'cache', fixLabel: 'לנקות מטמון', text: 'כשהזיכרון כמעט מלא, קולות ותמונות לא נשמרים. ניקוי המטמון מפנה מקום, והכול נטען מחדש בכניסה הבאה.' },
  ios_add_to_home: { icon: 'home', title: 'כדאי להוסיף למסך הבית', text: 'כך המשחק נפתח במסך מלא, בלי שורת הכתובת, והקול יציב יותר. ב-Safari: כפתור השיתוף ← "הוסף למסך הבית".' },
};
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>';

function renderHints(hints, saved, tips = []) {
  const fixes = hints.filter((k) => HINTS[k]).length;
  const cards = [...hints, ...tips].filter((k) => HINTS[k]).map((k, i) => {
    const x = HINTS[k], msg = h('span', { class: 'act-msg', role: 'status' });
    const card = h('article', { class: 'hint', style: `--i:${i}` }, h('span', { class: 'badge', html: ico(x.icon) }), h('h3', {}, x.title), h('p', {}, x.text));
    if (x.fix) card.append(h('div', { class: 'act' }, h('button', { class: 'btn gold sm', type: 'button', onclick: async (e) => {
      if (await runFix(x.fix, e.currentTarget, msg)) { card.classList.add('fixed'); card.querySelector('.badge').innerHTML = ico('check'); e.currentTarget.hidden = true; }
    } }, x.fixLabel), msg));
    return card;
  });
  $('fix-h').textContent = fixes ? 'מה אפשר לעשות עכשיו' : cards.length ? 'הכול תקין, ועוד טיפ קטן' : 'הבדיקה עברה בהצלחה';
  $('hints').replaceChildren(...(cards.length ? cards : [h('div', { class: 'allgood', html: ico('shield') }, h('div', {}, h('strong', {}, 'המכשיר מוכן למשחק'), h('span', { class: 'soft' }, 'לא מצאנו שום דבר שדורש תיקון. אם משהו עדיין מפריע, כתבו לנו ונבדוק יחד.')))]));
  say($('scan-id'), saved ? h('span', {}, 'הבדיקה נשמרה ותצורף לפנייה · ', ltr(saved)) : signedIn === false ? h('span', {}, 'כדי לצרף את הבדיקה לפנייה צריך ', h('a', { href: accountUrl }, 'להיכנס לחשבון'), '.') : '');
  $('scan-result').hidden = false;
}
// Save the snapshot. Signed out, rate limited or offline: fall back to the same rules locally, without an id.
async function sendSnapshot() {
  try { const r = await api('/support/diagnostics', { ...snap, fixes: FIXES.get() }); signedIn = true; DIAG.set({ id: r.diagId, at: Date.now() }); dirty = false; return r; }
  catch (e) { if (e.status === 401) signedIn = false; return { diagId: null, hints: localHints(snap), tips: localTips(snap) }; }
}
const checkRows = () => CHECKS.map(([name]) => h('li', {}, h('span', { class: 'mark', html: TICK }), h('span', { class: 'name' }, name), h('span', { class: 'val' })));
// Opened without a tap (a direct link, or after "reload"): wait for one, so the sound test is honest.
function readyCheckup(reloaded) {
  buildDial($('dial'), ico('pulse')); $('dial').className = 'dial idle';
  $('scan-result').hidden = true; $('scan-start').hidden = false; $('checks').replaceChildren(...checkRows());
  $('scan-title').textContent = reloaded ? 'נטען מחדש. בודקים שוב?' : 'מוכנים לבדיקה';
  $('scan-sub').textContent = '12 בדיקות קצרות למכשיר, לקול, למיקרופון ולחיבור.';
}
async function runCheckup() {
  if (scanning) return; scanning = true; armed = false; $('scan-start').hidden = true;
  const dial = $('dial'), states = [], step = calm ? 40 : 420;
  buildDial(dial, '<b>0</b><span>מתוך 12</span>'); dial.className = 'dial run';
  $('scan-result').hidden = true; $('scan-title').textContent = 'בודקים את המכשיר'; $('scan-sub').textContent = 'זה לוקח כמה שניות.'; say($('tool-msg'), '');
  const rows = checkRows();
  $('checks').replaceChildren(...rows);
  snap = { app: 'help', lang: (navigator.language || '').slice(0, 8) };
  for (let i = 0; i < CHECKS.length; i++) {
    rows[i].className = 'now'; states[i] = 'now'; dialSet(dial, i, states);
    const [[state, text]] = await Promise.all([CHECKS[i][1](snap).catch(() => ['info', 'לא נבדק']), wait(step)]);
    rows[i].className = `done ${state}`; rows[i].querySelector('.val').textContent = text; states[i] = state;
    dial.querySelector('.core b').textContent = i + 1; dialSet(dial, i + 1, states);
  }
  const { diagId, hints, tips = [] } = await sendSnapshot();
  const n = hints.filter((k) => HINTS[k]).length;
  dial.className = `dial ${n ? 'done-warn' : 'done-ok'}`;
  dial.querySelector('.core').innerHTML = n ? `<b>${n}</b><span>${n === 1 ? 'דבר אחד לתקן' : 'דברים לתקן'}</span>` : `${ico('check')}<span>הכול תקין</span>`;
  $('scan-title').textContent = n ? (n === 1 ? 'מצאנו דבר אחד' : `מצאנו ${n} דברים`) : 'הכול נראה מצוין';
  $('scan-sub').textContent = n ? 'כמעט תמיד אפשר לסדר את זה בלחיצה.' : 'המכשיר, הקול והחיבור תקינים.';
  renderHints(hints, diagId, tips); scanning = false;
  if (!calm) $('scan-result').scrollIntoView({ block: 'nearest' });
}
function buildTools() {
  $('tools').append(...Object.entries(FIX).map(([name, f]) => h('button', { class: 'btn ghost sm', type: 'button', html: ico(f.icon), onclick: (e) => runFix(name, e.currentTarget, $('tool-msg')) }, f.label)));
  $('scan-again').onclick = $('scan-start').onclick = () => { unlockAudio(); scrollTo({ top: 0 }); runCheckup(); };
  // Any link into the check-up counts as the tap that may unlock sound.
  document.addEventListener('click', (e) => { if (e.target.closest?.('a[href="#checkup"]')) { armed = true; unlockAudio(); } });
  $('scan-ticket').onclick = async (e) => { e.currentTarget.disabled = true; if (dirty && snap) await sendSnapshot(); e.currentTarget.disabled = false; location.hash = '#new'; };
}

// ---------- tickets ----------
const TOPICS = [['billing', 'תשלום'], ['live_talk', `שיחה עם ${TEACHER}`], ['sound', 'קול'], ['login', 'כניסה'], ['content', 'תוכן'], ['idea', 'רעיון'], ['other', 'אחר']];
const topicName = (k) => (TOPICS.find(([id]) => id === k) || TOPICS[6])[1];
const STATE_HE = { open: 'אצלנו בטיפול', waiting: 'מחכה לתשובה שלכם', solved: 'נפתרה' };
const isCare = (t) => t.source === 'care';                 // the server opened it after noticing a problem first
const careTag = () => h('span', { class: 'care-tag', html: SPARK }, 'שמנו לב לפניכם');
let tickets = [], current = null, topic = '';

function signInCard() { const n = $('tpl-signin').content.cloneNode(true); n.querySelector('[data-account]').href = accountUrl; return n; }
async function loadTickets() {
  try { tickets = (await api('/support/tickets')).tickets; signedIn = true; }
  catch (e) { if (e.status === 401) { signedIn = false; tickets = []; } else throw e; }
  $('nav-unread').hidden = !tickets.some((t) => t.unread);
  return tickets;
}
function renderTickets() {
  if (signedIn === false) return $('tickets').replaceChildren(signInCard());
  if (!tickets.length) return $('tickets').replaceChildren(h('div', { class: 'empty glass' }, h('strong', {}, 'עוד אין פניות'), h('p', { class: 'soft' }, 'כשתכתבו לנו, השיחה תופיע כאן.'), h('a', { class: 'btn ghost', href: '#' }, 'לחפש תשובה בשאלות הנפוצות')));
  $('tickets').replaceChildren(h('div', { class: 'tk-list' }, tickets.map((t) => {
    const last = t.msgs[t.msgs.length - 1];
    return h('a', { class: `tk${t.unread ? ' unread' : ''}`, href: `#t/${t.id}` },
      h('span', { class: 'tk-top' }, h('span', { class: 'tk-topic' }, topicName(t.topic)), isCare(t) && careTag(), t.unread && h('span', { class: 'pill new' }, 'תשובה חדשה')),
      h('span', { class: 'tk-prev' }, `${last?.from === 'parent' ? 'אתם: ' : ''}${last?.text || ''}`),
      h('span', { class: 'tk-side' }, h('span', { class: `pill ${t.state}` }, STATE_HE[t.state]), h('span', {}, `${dayName(t.updated)} `, ltr(clock(t.updated)))));
  })));
}
// Five drawn faces instead of emoji glyphs, so they look the same on every tablet.
const MOUTHS = ['M8.200 16.400q3.800-3.600 7.600 0', 'M8.600 15.900q3.400-1.800 6.800 0', 'M8.600 15.400h6.800', 'M8.400 14.600q3.600 2.600 7.200 0', 'M7.600 13.800q4.400 5 8.800 0z'];
const FACE_HE = ['ממש לא', 'לא כל כך', 'בסדר', 'טוב', 'מצוין'];
const face = (i) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="f-bg" cx="12" cy="12" r="10.500"/><circle class="f-eye" cx="8.800" cy="9.800" r="1.250"/><circle class="f-eye" cx="15.200" cy="9.800" r="1.250"/><path class="${i === 4 ? 'f-eye' : 'f-ln'}" d="${MOUTHS[i]}"/></svg>`;

function renderRate(t) {
  const teamSpoke = t.msgs.some((m, i) => m.from === 'team' && i > 0) || isCare(t);
  $('rate').hidden = !(t.rating || t.state === 'solved' || teamSpoke);
  if ($('rate').hidden) return;
  $('rate').className = `rate${t.rating ? ' rated' : ''}`;
  $('rate').replaceChildren(
    h('strong', {}, t.rating ? 'תודה, זה עוזר לנו להשתפר' : 'איך היה השירות?'),
    h('div', { class: 'faces', role: 'group', 'aria-label': 'דירוג השירות' }, FACE_HE.map((name, i) => h('button', { class: 'face', type: 'button', 'aria-label': name, 'aria-pressed': String(t.rating === i + 1), html: face(i),
      onclick: async () => { try { showThread(await api(`/support/tickets/${t.id}/rate`, { score: i + 1 }), true); } catch (e) { say($('reply-msg'), problem(e)); } } }))),
    h('div', { class: 'scale' }, h('span', {}, FACE_HE[0]), h('span', {}, FACE_HE[4])));
}
function showThread(t, keepScroll) {
  current = t; const i = tickets.findIndex((x) => x.id === t.id); if (i >= 0) tickets[i] = t;
  $('thread-head').replaceChildren(h('h1', {}, topicName(t.topic)), ...(isCare(t) ? [careTag()] : []), h('span', { class: `pill ${t.state}` }, STATE_HE[t.state]),
    h('span', { class: 'when' }, `נפתחה ${dayName(t.created)} · מספר פנייה `, ltr(t.id.slice(2, 8).toUpperCase())));
  let day = ''; const out = [];
  t.msgs.forEach((m, idx) => {
    if (dayKey(m.at) !== day) { day = dayKey(m.at); out.push(h('span', { class: 'day' }, dayName(m.at))); }
    const mine = m.from === 'parent', care = idx === 0 && isCare(t);
    out.push(h('div', { class: `msg ${mine ? 'parent' : 'team'}${care ? ' care' : ''}` }, h('div', { class: 'bubble' }, care && careTag(), m.text),
      h('span', { class: 'meta' }, mine ? 'אתם · ' : 'צוות YALLA KIDS · ', ltr(clock(m.at))), !mine && h('span', { class: 'who', 'aria-hidden': 'true' }, 'YK')));
  });
  if (t.state === 'solved') out.push(h('p', { class: 'closed' }, 'הפנייה נסגרה. אם משהו חוזר, פשוט כותבים כאן והיא נפתחת מחדש.'));
  $('msgs').replaceChildren(...out); $('solve').hidden = t.state === 'solved';
  renderRate(t);
  if (t.unread) api(`/support/tickets/${t.id}/read`, {}).then(() => { t.unread = false; $('nav-unread').hidden = !tickets.some((x) => x.unread); }).catch(() => {});
  if (!keepScroll) requestAnimationFrame(() => ($('rate').hidden ? $('f-reply') : $('rate')).scrollIntoView({ block: 'nearest' }));
}
async function openThread(id) {
  say($('reply-msg'), ''); $('f-reply').reset();
  try { showThread(tickets.find((t) => t.id === id) || await api(`/support/tickets/${id}`)); }
  catch { location.hash = '#tickets'; }
}
function renderAttach() {
  const d = DIAG.get(), fresh = d && Date.now() - d.at < 6 * 36e5;
  $('attach').hidden = !fresh;
  if (fresh) $('attach').replaceChildren(h('span', { html: ico('shield') }), h('span', {}, 'הבדיקה הטכנית מצורפת · ', ltr(d.id)), h('button', { type: 'button', onclick: () => { DIAG.set(null); renderAttach(); } }, 'להסיר'));
}
function showNew() {
  const form = $('f-new'); if (signedIn === false) return form.replaceChildren(signInCard());
  renderAttach(); say($('new-msg'), '');
}
function buildTickets() {
  $('topics').append(...TOPICS.map(([id, name]) => h('button', { type: 'button', 'aria-pressed': 'false', onclick: (e) => { topic = id; $('topics').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, name)));
  $('f-new').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, text = f.text.value.trim(), btn = f.querySelector('[type=submit]');
    if (!text) { say($('new-msg'), 'כתבו בכמה מילים מה קרה.'); f.text.focus(); return; }
    btn.disabled = true; say($('new-msg'), '');
    try {
      const d = DIAG.get(); const t = await api('/support/tickets', { topic: topic || 'other', text, diagId: !$('attach').hidden && d ? d.id : undefined });
      tickets.unshift(t); f.reset(); topic = ''; $('topics').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); DIAG.set(null);
      location.hash = `#t/${t.id}`;
    } catch (err) { if (err.status === 401) { signedIn = false; showNew(); } else say($('new-msg'), err.code === 'too_many_open' ? 'יש לכם כבר כמה פניות פתוחות. אפשר להמשיך באחת מהן ב"הפניות שלי".' : problem(err)); }
    finally { btn.disabled = false; }
  });
  $('f-reply').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target, text = f.text.value.trim(), btn = f.querySelector('[type=submit]'); if (!text || !current) return;
    btn.disabled = true; say($('reply-msg'), '');
    try { showThread(await api(`/support/tickets/${current.id}/reply`, { text })); f.reset(); } catch (err) { say($('reply-msg'), problem(err)); } finally { btn.disabled = false; }
  });
  $('solve').onclick = async () => { try { showThread(await api(`/support/tickets/${current.id}/solve`, {})); } catch (err) { say($('reply-msg'), problem(err)); } };
}

// ---------- views ----------
const VIEWS = ['home', 'checkup', 'tickets', 'thread', 'new'];
let poll = 0, reloaded = false;
async function route() {
  const hash = location.hash.slice(1), id = hash.match(/^t\/(t_[a-f0-9]{12})$/)?.[1];
  const view = id ? 'thread' : ['checkup', 'tickets', 'new'].includes(hash) ? hash : 'home';
  for (const v of VIEWS) $(`v-${v}`).hidden = v !== view;
  document.querySelectorAll('.tabs a').forEach((a) => (a.dataset.tab === (view === 'thread' ? 'tickets' : view === 'checkup' ? 'home' : view) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  clearInterval(poll);
  if (view === 'home') { const target = hash && document.getElementById(hash); if (target) target.scrollIntoView(); else scrollTo({ top: 0 }); return; }
  scrollTo({ top: 0 });
  if (view === 'checkup') return armed ? runCheckup() : readyCheckup(reloaded);
  if (view === 'new') return showNew();
  if (view === 'tickets') renderTickets(); else await openThread(id);
  // While a conversation is on screen, look for a new answer every 30 seconds.
  poll = setInterval(async () => {
    if (document.hidden || signedIn === false) return;
    try { await loadTickets(); } catch { return; }
    if (view === 'tickets') renderTickets();
    else { const t = tickets.find((x) => x.id === id); if (t && (t.updated !== current?.updated || t.msgs.length !== current?.msgs.length)) showThread(t); }
  }, 30e3);
}

async function start() {
  if (!gateOpen()) { $('gate').hidden = false; $('shell').hidden = true; newQuestion(); if (Date.now() < lockedUntil) lockGate(); return; }
  $('gate').hidden = true; $('shell').hidden = false;
  loadStatus(); await loadTickets().catch(() => {});
  if (sessionStorage.getItem('yk_recheck')) { sessionStorage.removeItem('yk_recheck'); reloaded = true; if (location.hash !== '#checkup') { location.hash = '#checkup'; return; } }
  route();
}

buildPad(); buildFaq(); buildTools(); buildTickets();
buildDial($('dial-idle'), ico('pulse'));
for (const [id, path] of [['to-account', ''], ['f-privacy', 'privacy.html'], ['f-terms', 'terms.html']]) $(id).href = accountUrl + path;
addEventListener('hashchange', () => { if (gateOpen()) route(); else start(); });
start();
