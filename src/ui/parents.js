// אזור הורים: שער, סיכום מבוסס ראיות, הגדרות, פרופילים ומחיקת נתונים.
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { SEASON } from '../content/season.js';
import { voiceReport, listen, say, unlockAudio, voiceStatus, hasRecording } from '../engine/voice.js';
import { PACKS, SOURCES, reviewPack } from '../content/library.js';
import { prop } from '../art/puppets.js';
import * as GROW from '../engine/growth.js';
import { POOL } from '../content/cafe.js';

export function parentGate(root, { onPass, onCancel }) {
  const a = 11 + Math.floor(Math.random() * 9);
  const b = 5 + Math.floor(Math.random() * 5);
  const ans = a + b;
  const opts = [...new Set([ans, ans + 1, ans - 2, ans + 10])].sort(() => Math.random() - 0.5);
  root.innerHTML = `<div class="gate" dir="rtl">
    <div class="gate-card">
      <h2>אזור הורים</h2>
      <p>כדי להיכנס, בחרו את התשובה:</p>
      <p class="gate-q">כמה זה ${numHe(a)} ועוד ${numHe(b)}?</p>
      <div class="gate-opts">${opts.map((o) => `<button data-v="${o}">${o}</button>`).join('')}</div>
      <button class="gate-cancel">חזרה לסטודיו</button>
    </div></div>`;
  root.querySelectorAll('.gate-opts button').forEach((btn) => btn.addEventListener('click', () => {
    if (+btn.dataset.v === ans) onPass(); else onCancel();
  }));
  root.querySelector('.gate-cancel').addEventListener('click', onCancel);
}

const NUM = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'אחת־עשרה', 'שתים־עשרה', 'שלוש־עשרה', 'ארבע־עשרה', 'חמש־עשרה', 'שש־עשרה', 'שבע־עשרה', 'שמונה־עשרה', 'תשע־עשרה'];
const numHe = (n) => NUM[n] || String(n);

export function parentArea(root, { onExit }) {
  let tab = 'summary';
  const render = () => {
    root.innerHTML = `<div class="parents" dir="rtl">
      <header><h1>אזור הורים</h1><button class="p-exit">חזרה לסטודיו</button></header>
      <nav>${[['summary', 'מה למדו'], ['settings', 'הגדרות'], ['profiles', 'פרופילים'], ['library', 'ספריית תוכן'], ['season', 'העונה'], ['data', 'נתונים ופרטיות']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>
      <main>${TABS[tab]()}</main></div>`;
    root.querySelector('.p-exit').onclick = onExit;
    root.querySelectorAll('nav button').forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
    BIND[tab]?.(root, render);
  };
  render();
}

// ---------------- סיכום ----------------
function childSummary(p) {
  const items = P.allItems(p.id);
  const ids = Object.keys(items).filter((id) => VOCAB[id]);
  const sess = P.sessions(p.id);
  const minutes = Math.round(sess.reduce((s, x) => s + ((x.end || x.start) - x.start), 0) / 60000);
  if (!ids.length) return `<section class="child"><h2>${esc(p.name)}</h2><p class="muted">עוד אין ראיות מהמשחק.</p></section>`;

  const rows = ids.map((id) => ({ id, st: P.stage(p.id, id), it: items[id], v: VOCAB[id] }))
    .sort((a, b) => b.st - a.st || a.id.localeCompare(b.id));
  const understood = rows.filter((r) => r.st >= 3);
  const usedRows = rows.filter((r) => r.it.usedTouch + r.it.usedSpoken > 0);
  const helpRows = rows.filter((r) => r.it.helped + r.it.misses > 0 && r.st < 3);

  const evidence = (r) => {
    const it = r.it; const parts = [];
    if (it.independent) parts.push(`בחרה נכון בלי עזרה ${it.independent}×`);
    if (it.sillyOnly) parts.push(`נכון מול מסיח מצחיק ${it.sillyOnly}×`);
    if (it.helped) parts.push(`נכון אחרי רמז ${it.helped}×`);
    if (it.misses) parts.push(`בחירה אחרת ${it.misses}×`);
    if (it.usedTouch) parts.push(`הרכיבה בעצמה במגע ${it.usedTouch}×`);
    if (it.usedSpoken) parts.push(`נאמר בקול ${it.usedSpoken}× (לפי זיהוי דיבור, לא ודאי)`);
    if (it.usedModeled) parts.push(`חזרה אחרי הדגמה ${it.usedModeled}×`);
    if (it.transfer) parts.push(`הצליחה בהקשר חדש ${it.transfer}×`);
    if (!parts.length) parts.push(`שמעה ${it.exposures}×`);
    return parts.join(' · ');
  };
  const caution = (r) => {
    const n = r.it.sessions.length;
    if (r.st >= 3 && n < 2) return 'נצפה במפגש אחד בלבד – כדאי לראות שוב לפני שמסיקים.';
    if (r.st === 3 && r.it.independent === 2) return 'ראיות ראשונות.';
    if (r.it.misses > r.it.independent + r.it.helped) return 'עוד לא ברור; ייתכן שהבחירות היו ניסוי ולא אי־הבנה.';
    return '';
  };

  return `<section class="child">
    <h2>${esc(p.name)} <small>${sess.length} מפגשים · כ־${minutes} דקות</small></h2>
    <div class="cards3">
      <div><h3>מה הבינה</h3>${understood.length ? `<ul>${understood.map((r) => `<li><b lang="en" dir="ltr">${r.v.en}</b> (${r.v.he})</li>`).join('')}</ul>` : '<p class="muted">עוד אין מספיק ראיות להבנה עצמאית.</p>'}</div>
      <div><h3>ביטויים שהשתמשה בהם</h3>${usedRows.length ? `<ul>${usedRows.map((r) => `<li><b lang="en" dir="ltr">${r.v.en}</b> – ${r.it.usedSpoken ? 'בקול (זיהוי לא ודאי)' : 'במגע, בהרכבת בקשה'}</li>`).join('')}</ul>` : '<p class="muted">עוד לא.</p>'}</div>
      <div><h3>איפה נעזרה</h3>${helpRows.length ? `<ul>${helpRows.map((r) => `<li><b lang="en" dir="ltr">${r.v.en}</b> (${r.v.he})</li>`).join('')}</ul>` : '<p class="muted">לא נרשם צורך בעזרה.</p>'}</div>
    </div>
    <details><summary>כל הראיות לפי מילה</summary>
      <table><thead><tr><th>מילה / מבנה</th><th>שלב</th><th>על מה זה מבוסס</th><th>הערה</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td><b lang="en" dir="ltr">${r.v.en}</b><br><small>${r.v.he}</small></td><td><span class="stage s${r.st}">${r.st} · ${P.STAGE_LABELS[r.st]}</span></td><td>${evidence(r)}</td><td><small>${caution(r)}</small></td></tr>`).join('')}
      </tbody></table></details>
    <div class="offscreen"><h3>לשחק מחוץ למסך</h3><ul>${ideas(p, rows).map((x) => `<li>${x}</li>`).join('')}</ul></div>
    ${interestsLine(p)}
    ${missionBlock(p.id)}
  </section>`;
}

function ideas(p, rows) {
  const has = (id) => rows.some((r) => r.id === id);
  const st = (id) => rows.find((r) => r.id === id)?.st || 0;
  const out = [];
  const foods = rows.filter((r) => ['apple', 'banana', 'cookie', 'water', 'milk', 'juice'].includes(r.id) && r.st >= 1).map((r) => r.v.en);
  if (p.track === 'younger') {
    if (foods.length) out.push(`בארוחת ביניים שימו שני דברים על השולחן ובקשו בחיוך: <b lang="en">"${cap(foods[0])}, please"</b>. היא מגישה – אתם אוכלים בהגזמה.`);
    out.push('משחק "פותחים–סוגרים": קופסה עם צעצוע בפנים. אומרים <b lang="en">"Open!"</b> ו־<b lang="en">"Close!"</b> לפני כל פעולה.');
    if (st('hello') >= 1) out.push('נפנופי <b lang="en">Hello</b> ו־<b lang="en">Bye</b> לבובות לפני השינה.');
  } else {
    out.push('מסעדת צעצועים בסלון: היא המלצרית, אתם מזמינים <b lang="en">"I want…"</b>; אחר כך מתחלפים והיא מזמינה <b lang="en">"Can I have…, please?"</b>.');
    if (has('s_category')) out.push('בקשה עם כמה תשובות נכונות: <b lang="en">"Something cold, please"</b> ליד המקרר – ותנו לה לבחור.');
    if (st('s_and') < 3) out.push('שני דברים ברצף: <b lang="en">"A cookie and water, please"</b> – בקצב שלה, בלי למהר.');
  }
  return out;
}

function interestsLine(p) {
  const i = store.interests(p.id);
  const names = { music: 'מוזיקה ובום', animals: 'חיות וטוטו', food: 'בית הקפה', dress: 'תחפושות', people: 'הדמויות' };
  const top = Object.entries(i).filter(([k]) => names[k]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const foods = Object.entries(i).filter(([k]) => k.startsWith('food:')).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => VOCAB[k.slice(5)]?.he).filter(Boolean);
  if (!top.length && !foods.length) return '';
  return `<p class="muted">לפי הבחירות שלה במשחק (ספירת מגעים, לא ניחוש רגשות): ${top.map(([k, n]) => `${names[k]} (${n})`).join(', ')}${foods.length ? `. בחרה לבית הקפה: ${foods.join(', ')}` : ''}.</p>`;
}

function missionBlock(owner, title = '') {
  const m = store.mission(owner);
  if (!m) return '';
  const n = m.homeReports.length;
  return `<div class="home-mission"><h3>${title || 'משחק לבית מהביקור האחרון'}</h3>
    <p><b lang="en" dir="ltr">${esc(m.phrase)}</b></p><p>${esc(m.parent)}</p>
    <p><button data-home="${owner}">שיחקנו את זה בבית</button> ${n ? `<span class="ok">סימנתם ${n}×</span>` : ''}</p>
    <p class="muted">הדיווח שלכם נשמר בנפרד. הוא לא משנה את השלבים בסיכום, כי הם מבוססים רק על מה שהילדה עשתה במשחק.</p></div>`;
}

// ---------------- לשוניות ----------------
const TABS = {
  summary: () => `<p class="lead">הסיכום מבוסס רק על פעולות במשחק. השלמת פרק לא נחשבת כשליטה, וזיהוי דיבור לא ודאי לא נחשב כטעות.</p>
    ${store.profiles().map(childSummary).join('')}
    ${missionBlock('sisters', 'משחק לבית מהביקור המשותף')}
    <details class="legend"><summary>מה אומר כל שלב?</summary><ol>
      <li>נחשפה – שמעה את המילה בהקשר.</li><li>זיהתה עם עזרה – בחרה נכון אחרי רמז, או מול מסיח מצחיק כמו נעל.</li>
      <li>הבינה בלי עזרה – לפחות פעמיים בלי רמז, מול חלופה אמיתית.</li><li>השתמשה בהקשר מוכר – הרכיבה או אמרה את הבקשה בעצמה.</li>
      <li>הצליחה בהקשר חדש – הצלחה עם אורח, ניסוח או מקום אחרים.</li></ol></details>`,
  settings: () => {
    const s = store.settings();
    const vr = voiceReport();
    return `<div class="form">
      ${toggle('voice', 'הקראה בקול', s.voice)}
      ${toggle('deviceVoice', 'הקראת המכשיר כגיבוי (קול רובוטי, כבוי כברירת מחדל). כשכבוי, שורות שעוד לא הוקלטו נשמעות כמלמול הדמות עם בועת טקסט', s.deviceVoice)}
      ${toggle('captions', 'בועות טקסט (עוזר להורים לעקוב)', s.captions)}
      ${toggle('sfx', 'צלילים ואפקטים', s.sfx)}
      ${toggle('reduceMotion', 'הפחתת תנועה', s.reduceMotion)}
      <label>קצב הדיבור באנגלית <input type="range" min="0.6" max="1.1" step="0.05" data-k="rate" value="${s.rate}"><span>${s.rate}</span></label>
      <label>קול באנגלית <select data-k="enVoice"><option value="">אוטומטי</option>${vr.en.map((n) => `<option ${n === s.enVoice ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label>קול בעברית <select data-k="heVoice"><option value="">אוטומטי</option>${vr.he.map((n) => `<option ${n === s.heVoice ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label>זמן מפגש מומלץ <select data-k="sessionMinutes">${[5, 10, 15, 20].map((m) => `<option value="${m}" ${m === s.sessionMinutes ? 'selected' : ''}>${m} דקות</option>`).join('')}</select></label>
      <p class="muted">כשהזמן עובר, הפרק מקצר את עצמו ומגיע לסיום רגוע. אין טיימר גלוי לילדות.</p>
      <button class="test-voice">בדיקת קול</button>
      <div class="diag">
        <b>קולות הדמויות:</b> ${voiceStatus.recorded ? `${voiceStatus.recorded} שורות מוקלטות בקולות הדמויות` : '<span class="warn">עוד לא הוקלטו קולות לדמויות – כרגע נשמעת הקראת המכשיר כגיבוי זמני</span>'}${voiceStatus.missing.size ? ` · ${voiceStatus.missing.size} שורות בלי הקלטה במפגש הזה` : ''}<br>
        <b>גיבוי – הקראת המכשיר:</b><br>
        הקראה: ${vr.tts ? 'כן' : 'לא'} · קולות באנגלית: ${vr.en.length || '<span class="warn">אין – הדמויות ידברו בצלילים ובבועות בלבד</span>'} · קולות בעברית: ${vr.he.length || '<span class="warn">אין – ההנחיות בעברית יוצגו כבועה לקריאת הורה</span>'}<br>
        זיהוי דיבור: ${vr.recognition ? 'זמין' : 'לא זמין בדפדפן הזה (המשחק מלא גם בלי)'}
      </div>
      <h3>מיקרופון</h3>
      ${toggle('micAllowed', 'לאפשר מיקרופון (הזמנה לדבר ברגעים מתאימים, ו"טוטו מדבר בקול שלי" במסך הבית)', s.micAllowed, !vr.recognition && !navigator.mediaDevices?.getUserMedia)}
      <p class="muted">המיקרופון נפתח רק כשהילדה לוחצת על כפתור המיקרופון, עם נקודה אדומה מהבהבת בזמן ההאזנה. האפליקציה לא שומרת הקלטות ולא תמלולים. שימו לב: בחלק מהדפדפנים (למשל Chrome) הזיהוי עצמו מתבצע בשרתי ספק הדפדפן. זיהוי לא ודאי לעולם לא נחשב טעות, ואין ציון הגייה.</p>
      <p class="muted"><b>טוטו מדבר בקול שלי:</b> כשהמיקרופון מאושר, במסך הבית מופיע כפתור כתום. מחזיקים, מדברים ומשחררים, וטוטו משמיע את זה מיד בקול גור. ההקלטה נמצאת רק בזיכרון של המכשיר כמה שניות ונמחקת אחרי ההשמעה. היא לא נשמרת ולא נשלחת. לא בודקים ולא מנקדים את מה שנאמר.</p>
      ${vr.recognition ? '<button class="test-mic">בדיקת מיקרופון: אמרו "hello"</button><span class="mic-res"></span>' : ''}
    </div>`;
  },
  profiles: () => `<div class="form">${store.profiles().map((p) => `<fieldset><legend>${esc(p.name)}</legend>
      <label>שם <input data-p="${p.id}" data-f="name" value="${esc(p.name)}"></label>
      <label>מסלול <select data-p="${p.id}" data-f="track"><option value="younger" ${p.track === 'younger' ? 'selected' : ''}>צעיר (בערך גיל 3): פעולה אחת, שתי אפשרויות</option><option value="older" ${p.track === 'older' ? 'selected' : ''}>בוגר (בערך גיל 5): תפקיד, בקשות ושימוש</option></select></label>
      <button data-resetsym="${p.id}">בחירת סמל מחדש</button></fieldset>`).join('')}</div>`,
  library: () => {
    const kids = store.profiles();
    const growth = kids.map((p) => {
      const r = GROW.growthReport(p.id, p.track, p.track === 'younger' ? POOL.younger : POOL.pantry);
      const next = r.fresh ? `<b>${esc(VOCAB[r.fresh].he)}</b> <span lang="en" dir="ltr">(${esc(VOCAB[r.fresh].en)})</span> – תופיע בביקור הבא` : 'אין כרגע מילה חדשה שמחכה (אשרו חבילה, או שהמילים הקיימות עוד מתבססות)';
      return `<li><b>${esc(p.name)}:</b> ${Math.round(r.ready * 100)}% מהמילים שפגשה מבוססות אצלה (נדרש ${Math.round(r.threshold * 100)}% כדי לפתוח מילה מהספרייה). המילה הבאה: ${next}.</li>`;
    }).join('');
    return `<p class="lead">תוכן חדש נכנס לכאן כטיוטה. הוא מגיע לילדות רק אחרי שאתם מאשרים אותו, ואז נפתח לאט: מילה חדשה אחת בביקור, ורק כשהמילים הקודמות כבר מבוססות אצל אותה ילדה. אין חיפוש פתוח ואין תוכן שנשאב מהרשת בזמן משחק.</p>
    <ul class="growth">${growth}</ul>
    ${PACKS.map((pk) => {
      const status = store.packStatus(pk.id);
      const rv = reviewPack(pk, { hasArt: () => true, hasVoice: (l) => hasRecording('lulu', 'en', l) });
      const who = pk.tracks.map((t) => (t === 'younger' ? 'אלמה (מסלול צעיר)' : 'שייה (מסלול בוגר)')).join(' ו');
      return `<section class="pack ${status}" data-pack="${pk.id}">
        <header><h2>${esc(pk.title)}</h2><span class="pill ${status}">${status === 'approved' ? 'מאושר ופתוח' : status === 'declined' ? 'לא עכשיו' : 'טיוטה – מחכה לאישור'}</span></header>
        <div class="pack-art">${pk.items.map((i) => `<figure><svg viewBox="-75 -80 150 160" width="84" height="90">${prop(i.id)}</svg><figcaption><span lang="en" dir="ltr">${esc(i.en)}</span> · ${esc(i.he)}</figcaption></figure>`).join('')}</div>
        <p>${esc(pk.blurb)} <span class="muted">מיועד ל${who}.</span></p>
        <ul class="checks">${rv.checks.map((c) => `<li class="${c.ok ? 'ok' : 'warn'}">${c.ok ? '✓' : '✗'} ${c.label}: <span class="muted">${esc(c.note)}</span></li>`).join('')}
          <li class="${rv.voiced === rv.lines.length ? 'ok' : 'muted'}">${rv.voiced === rv.lines.length ? '✓ קול: מוקלט בקולות הדמויות' : `קול: ${rv.voiced} מתוך ${rv.lines.length} משפטים מוקלטים. השאר יישמעו בקול הגיבוי עד ההקלטה.`}</li></ul>
        <p class="lines">${rv.lines.map((l) => `<button class="hear" data-line="${esc(l)}" lang="en" dir="ltr">▶ ${esc(l)}</button>`).join(' ')}</p>
        <div class="pack-actions">${status === 'approved'
          ? '<button data-st="draft">להחזיר לטיוטה</button>'
          : `<button class="primary" data-st="approved" ${rv.ok ? '' : 'disabled'}>לאשר ולפתוח לילדות</button>${status === 'declined' ? '' : '<button data-st="declined">לא עכשיו</button>'}`}</div>
      </section>`;
    }).join('')}
    <p class="muted">מקור בחירת המילים: ${esc(SOURCES.starters.name)} (${esc(SOURCES.starters.use)}). האיורים, המשפטים והקולות נוצרו לסטודיו. החזרה לטיוטה לא מוחקת את מה שהילדות כבר למדו.</p>`;
  },
  season: () => `<p class="lead">העונה הראשונה. רק פרקים שעברו בדיקת שפה, גיל, זכויות ואיכות נפתחים לילדות; השאר מופיעים בסטודיו מכוסים בבד.</p>
    <table><thead><tr><th>פרק</th><th>אלמה</th><th>שייה</th><th>תוצר</th><th>מצב</th></tr></thead><tbody>
    ${SEASON.map((e) => `<tr><td><b>${e.title}</b></td><td>${e.younger.goal}</td><td>${e.older.goal}</td><td>${e.product}</td><td>${e.review === 'approved' ? '<span class="ok">פתוח</span>' : e.review === 'partial' ? 'חלקי' : 'בתכנון'}</td></tr>`).join('')}</tbody></table>`,
  data: () => `<div class="form">
      <p>${store.persistent ? 'הנתונים נשמרים במכשיר הזה בלבד (בדפדפן). שום דבר לא נשלח לשרת.' : '<span class="warn">השמירה לא זמינה בתצוגה הזו – ההתקדמות תימחק בסגירת הדף.</span>'}</p>
      <p>אין פרסומות, אין רכישות, אין דירוגים ואין רצף יומי.</p>
      ${store.profiles().map((p) => `<button class="danger" data-del="${p.id}">מחיקת הנתונים של ${esc(p.name)}</button>`).join(' ')}
      <button class="danger" data-delall="1">מחיקת הכול</button>
      <div class="confirm-del" hidden><p>למחוק? אי אפשר לשחזר.</p><button class="danger yes">כן, למחוק</button><button class="no">ביטול</button></div>
    </div>`,
};

const BIND = {
  summary(root, render) {
    root.querySelectorAll('[data-home]').forEach((b) => (b.onclick = () => { store.reportHome(b.dataset.home); render(); }));
  },
  settings(root, render) {
    root.querySelectorAll('[data-toggle]').forEach((i) => (i.onchange = () => { store.setSetting(i.dataset.toggle, i.checked); render(); }));
    root.querySelectorAll('select[data-k], input[type=range][data-k]').forEach((i) => (i.onchange = () => {
      const v = i.type === 'range' || i.dataset.k === 'sessionMinutes' ? +i.value : i.value; store.setSetting(i.dataset.k, v); render();
    }));
    root.querySelector('.test-voice').onclick = async () => { unlockAudio(); await say('mika', 'Hello! Banana, please.', 'en'); await say('mika', 'שלום! זאת מיקה.', 'he'); };
    const tm = root.querySelector('.test-mic');
    if (tm) tm.onclick = async () => {
      const out = root.querySelector('.mic-res'); out.textContent = ' מקשיב…';
      const prev = store.settings().micAllowed; store.data.settings.micAllowed = true;
      const r = await listen(['hello', 'hi']);
      store.data.settings.micAllowed = prev;
      out.textContent = r.status === 'match' ? ' נשמע "hello" ✓' : r.status === 'unsure' ? ' נשמע משהו, לא בטוח מה. זה בסדר.' : ' לא נשמע כלום (או שאין הרשאה).';
    };
  },
  library(root, render) {
    root.querySelectorAll('.pack [data-st]').forEach((b) => (b.onclick = () => { store.setPackStatus(b.closest('.pack').dataset.pack, b.dataset.st); render(); }));
    root.querySelectorAll('.hear').forEach((b) => (b.onclick = () => { unlockAudio(); say('lulu', b.dataset.line, 'en'); }));
  },
  profiles(root, render) {
    root.querySelectorAll('[data-p]').forEach((i) => (i.onchange = () => { store.updateProfile(i.dataset.p, { [i.dataset.f]: i.value.trim() || i.value }); render(); }));
    root.querySelectorAll('[data-resetsym]').forEach((b) => (b.onclick = () => { store.updateProfile(b.dataset.resetsym, { symbol: null }); render(); }));
  },
  data(root, render) {
    const box = root.querySelector('.confirm-del');
    const ask = (fn) => { box.hidden = false; box.querySelector('.yes').onclick = () => { fn(); render(); }; box.querySelector('.no').onclick = () => (box.hidden = true); };
    root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => ask(() => store.deleteChild(b.dataset.del))));
    root.querySelector('[data-delall]').onclick = () => ask(() => store.deleteAll());
  },
};

function toggle(k, label, on, disabled = false) {
  return `<label class="tog"><input type="checkbox" data-toggle="${k}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span></label>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
