// בדיקת מסלול קריטי בדפדפן טאבלט (מגע): אלמה, שייה, ביקור חוזר, אחיות, שער הורים, הפרדת פרופילים, שמירה.
// רץ במצב ?fast (קיצור המתנות; בלי הקראה). אין כאן טענה לבדיקה עם ילדות.
// הפעלה: node server.js & node tests/critical-path.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/?fast';
const SHOTS = process.argv.includes('--shots');

const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const [VW, VH] = (process.env.VP || '1180x820').split('x').map(Number);
const ctx = await b.newContext({ viewport: { width: VW, height: VH }, hasTouch: true, isMobile: false, permissions: ['microphone'] });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message));
pg.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };
const tapSel = async (sel) => {
  const ok = await pg.evaluate((s) => { const el = document.querySelector(s); el?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return !!el; }, sel);
  // דלת של משחק: מיקה אומרת לאן נכנסים ואז עוברים – מחכים שהסטודיו ייסגר
  if (/-door/.test(sel)) await pg.waitForSelector('.home-hud', { state: 'detached', timeout: 8000 }).catch(() => {});
  return ok;
};

/** "ילדה רובוטית": מגיבה למה שמחכה למגע. wrongOnce = טועה פעם אחת בכוונה. */
async function autoplay({ wrongOnce = false, until = '.who-card, .home-hud', maxMs = 120000, shotAt = {} }) {
  const t0 = Date.now(); let wrongDone = !wrongOnce; let n = 0;
  while (Date.now() - t0 < maxMs) {
    if (await pg.$(until)) return true;
    if (SHOTS) for (const [sel, name] of [['.letters-panel', 'letters'], ['.mission-card', 'mission']]) { const k = name + (globalThis.__shotN = globalThis.__shotN || {})[name]; if (!globalThis.__shotN[name] && await pg.$(sel)) { globalThis.__shotN[name] = 1; await pg.waitForTimeout(500); await pg.screenshot({ path: `shots/${name}.png` }); } }
    const act = await pg.evaluate((wrongDone) => {
      const tap = (el, type = 'pointerup') => el.dispatchEvent(new PointerEvent(type, { bubbles: true }));
      const pr = document.querySelector('.pour-ready');
      if (pr && !pr.dataset.t) { pr.dataset.t = 1; tap(pr, 'pointerdown'); return 'pour'; }
      const row = document.querySelector('.tiles:not([hidden]):not(.demoing) .tile-row');
      if (row && !row.dataset.t) {
        row.dataset.t = 1; const ts = [...row.querySelectorAll('.tile')];
        tap(ts.find((t) => t.dataset.k === 'ask')); tap(ts[1]); tap(ts.find((t) => t.dataset.k === 'please'));
        return 'tiles';
      }
      const armed = [...document.querySelectorAll('.armed')].filter((e) => !e.closest('.gone'));
      if (!armed.length) return null;
      const id = (e) => e.dataset.id || e.dataset.actor || '';
      const p = (window.__lastPrompt || '').toLowerCase();
      const ids = armed.map(id);
      let want = armed.filter((e) => id(e) && p.includes(id(e)));
      if (p.includes('hmm…')) want = want.sort((a, b) => p.lastIndexOf(id(b)) - p.lastIndexOf(id(a))).slice(0, 1);
      if (p.includes('something cold')) want = armed.filter((e) => ['water', 'milk', 'juice', 'lemonade'].includes(id(e)));
      if (p.includes('something to eat')) want = armed.filter((e) => ['apple', 'banana', 'cookie', 'orange', 'strawberry', 'grapes', 'carrot', 'cake'].includes(id(e)));
      if (!wrongDone && want.length && armed.length > want.length) {
        const w = armed.find((e) => !want.includes(e)); tap(w); return 'wrong:' + id(w);
      }
      // בלי התאמה לבקשה: לבחור משהו שעוד לא נבחר לאחרונה (כמו ילדה שמנסה דברים חדשים)
      window.__seen = window.__seen || {};
      const fresh = armed.filter((e) => !window.__seen[id(e)]);
      const el = want[0] || (fresh.length ? fresh[0] : armed[Math.floor(Math.random() * armed.length)]);
      window.__seen[id(el)] = (window.__seen[id(el)] || 0) + 1;
      if (Object.keys(window.__seen).length > 12) window.__seen = {};
      tap(el); return 'tap:' + (id(el) || el.getAttribute('class'));
    }, wrongDone);
    if (act?.startsWith('wrong')) wrongDone = true;
    if (act) { n++; if (shotAt[n] && SHOTS) await pg.screenshot({ path: `shots/${shotAt[n]}.png` }); }
    await pg.waitForTimeout(act ? 120 : 60);
  }
  console.log('  נתקע:', await pg.evaluate(() => ({ prompt: window.__lastPrompt, armed: [...document.querySelectorAll('.armed')].map((e) => e.dataset.id || e.dataset.actor || e.getAttribute('class')), bubble: document.querySelector('.bubble')?.textContent, pour: [...document.querySelectorAll('.pour-ready')].map((e) => e.dataset.t + ':' + e.dataset.id), cups: document.querySelectorAll('.cup').length })));
  await pg.screenshot({ path: 'shots/stuck.png' });
  return false;
}
const P_stage = (it) => { const u = it.usedTouch + it.usedSpoken; if (it.transfer > 0 && (it.independent >= 2 || u > 0)) return 5; if (u > 0) return 4; if (it.independent >= 2) return 3; if (it.helped > 0 || it.sillyOnly > 0 || it.independent === 1 || it.usedModeled > 0) return 2; return it.exposures > 0 ? 1 : 0; };
const store = () => pg.evaluate(() => JSON.parse(localStorage.getItem('studio-pele:v1') || '{}'));

// ---------- 1. אלמה, ביקור ראשון ----------
await pg.goto(BASE);
await pg.evaluate(() => localStorage.clear());
await pg.reload();
await tapSel('.who-card[data-id=alma]');
await pg.waitForSelector('.sym-btn');
await tapSel('.sym-btn[data-k=fish]');
await pg.waitForSelector('.cafe-door');
await pg.waitForTimeout(300);
await tapSel('.cafe-door');
await pg.waitForSelector('.hud-replay');
check('אלמה: מיקרופון לא מוצג בלי אישור הורה', !(await pg.$('.mic-btn.show')));
let ok = await autoplay({ wrongOnce: true, until: '.home-hud', shotAt: { 6: 'alma-round', 14: 'alma-later' } });
check('אלמה: הפרק הושלם במגע בלבד', ok);
let s = await store();
const almaItems = s.progress?.alma?.items || {};
check('אלמה: נרשמו ראיות לבננה', !!almaItems.banana && (almaItems.banana.independent + almaItems.banana.sillyOnly + almaItems.banana.helped) > 0, JSON.stringify(almaItems.banana || {}));
check('אלמה: טעות נרשמה כ"בחירה אחרת", לא נחסמה', Object.values(almaItems).some((i) => i.misses > 0));
check('אלמה: התפריט נשמר', (s.creations?.alma?.cafe?.items || []).length >= 2, JSON.stringify(s.creations?.alma?.cafe));
check('משחק לבית: כרטיס נשמר לאלמה מתוך מה שהגישה', !!s.missions?.alma?.phrase && /, please\.$/.test(s.missions.alma.phrase), s.missions?.alma?.phrase);
check('הפרדת פרופילים: לשייה אין ראיות אחרי משחק של אלמה', !s.progress?.shaya || !Object.keys(s.progress.shaya.items || {}).length);
if (SHOTS) await pg.screenshot({ path: 'shots/home-after-alma.png' });

// ---------- 2. שמירה אחרי רענון + ביקור חוזר ----------
await pg.reload();
await tapSel('.who-card[data-id=alma]');
await pg.waitForSelector('.cafe-door');
check('שמירה: התפריט מופיע על הדוכן אחרי רענון', (await pg.$$('.cafe-booth .prop')).length >= 2);
await pg.waitForTimeout(300);
await tapSel('.cafe-door');
await pg.waitForSelector('.hud-replay');
await pg.waitForTimeout(200);
check('ביקור חוזר: התפריט על הלוח בבית הקפה', (await pg.$$('.menu-slots .prop')).length >= 2);
ok = await autoplay({ until: '.home-hud', shotAt: { 8: 'alma-return' } });
s = await store();
check('ביקור חוזר: הושלם, אורח חדש (ינשוף)', ok && (s.creations?.alma?.cafe?.guests || []).includes('owl'));
check('ביקור חוזר: מילה חדשה אחת (cookie) נחשפה', !!s.progress?.alma?.items?.cookie);

// ---------- 3. שייה ----------
await tapSel('.hud-back');
await pg.waitForSelector('.who-card');
await tapSel('.who-card[data-id=shaya]');
await pg.waitForSelector('.sym-btn');
check('סמל של אחות תפוס – לא ניתן לבחור', await pg.$eval('.sym-btn[data-k=fish]', (e) => e.disabled));
await tapSel('.sym-btn[data-k=star]');
await pg.waitForSelector('.cafe-door');
check('שייה: בית קפה ריק משלה (יצירה נפרדת מאלמה)', (await pg.$$('.cafe-booth .prop')).length === 0);
await pg.waitForTimeout(300);
await tapSel('.cafe-door');
ok = await autoplay({ wrongOnce: true, until: '.home-hud', shotAt: { 3: 'shaya-stock', 12: 'shaya-round', 30: 'shaya-later', 33: 'shaya-letters', 36: 'shaya-mission' } });
s = await store();
const sh = s.progress?.shaya?.items || {};
check('שייה: הפרק הושלם במגע בלבד', ok);
check('שייה: נרשם שימוש ב-"Can I have" (מוגדר כהדגמה בפעם הראשונה)', !!sh.s_canihave && (sh.s_canihave.usedModeled + sh.s_canihave.usedTouch) > 0, JSON.stringify(sh.s_canihave || {}));
check('שייה: מבנים נפרדים נמדדו (please / I want / קטגוריה)', ['s_please', 's_iwant', 's_category'].every((k) => sh[k]));
check('שייה: תפריט עם שם ומנה מיוחדת נשמר', !!s.creations?.shaya?.cafe?.name && !!s.creations?.shaya?.cafe?.special, JSON.stringify(s.creations?.shaya?.cafe));
check('שייה: צליל אות נמדד (השלמת האות הראשונה בתפריט)', Object.keys(sh).some((k) => k.startsWith('ph_')), Object.keys(sh).filter((k) => k.startsWith('ph_')).join(','));
check('שייה: משחק לבית נשמר', !!s.creations && !!s.missions?.shaya?.phrase, s.missions?.shaya?.phrase);
check('הפרדת פרופילים: ראיות של שייה לא נכנסו לאלמה', !s.progress.alma.items.s_canihave);

// ---------- 4. אחיות ----------
await tapSel('.hud-back');
await pg.waitForSelector('.who-card');
const before = await store();
await tapSel('.who-card[data-id=together]');
await pg.waitForSelector('.cafe-door');
await pg.waitForTimeout(300);
await tapSel('.cafe-door');
await pg.waitForSelector('.turn-chip');
ok = await autoplay({ until: '.home-hud', shotAt: { 10: 'sisters' } });
s = await store();
check('אחיות: הפרק הושלם', ok);
check('אחיות: יצירה משותפת נשמרה', (s.creations?.sisters?.cafe?.items || []).length > 0);
const sessA = s.progress.alma.sessions.length - before.progress.alma.sessions.length;
const sessS = s.progress.shaya.sessions.length - before.progress.shaya.sessions.length;
check('אחיות: התקדמות נרשמה לכל אחת בנפרד', sessA === 1 && sessS === 1);

// ---------- 4ב. אולפן הלהקה ----------
async function playBand(kid, shot) {
  await tapSel('.hud-back'); await pg.waitForSelector('.who-card');
  await tapSel(`.who-card[data-id=${kid}]`);
  await pg.waitForSelector('.band-door'); await pg.waitForTimeout(300);
  await tapSel('.band-door');
  await pg.waitForSelector('.stage-curtain');
  const r = await autoplay({ until: '.home-hud', shotAt: shot ? { [shot[0]]: shot[1] } : {} });
  return r;
}
ok = await playBand('alma', [9, 'band-alma']);
s = await store();
const ab = s.progress.alma.items;
check('להקה (אלמה): הפרק הושלם במגע', ok);
check('להקה (אלמה): נמדדו Go ו־Stop', !!ab.go && !!ab.stop && P_stage(ab.stop) >= 2, JSON.stringify(ab.stop || {}));
check('להקה (אלמה): מילה מבית הקפה הצליחה בהקשר חדש (שיר)', Object.entries(ab).some(([k, v]) => v.successContexts?.includes('band:song') && v.successContexts.some((c) => c.startsWith('cafe'))));
check('להקה (אלמה): השיר נשמר', (s.creations?.alma?.band?.words || []).length >= 2, JSON.stringify(s.creations?.alma?.band));
ok = await playBand('alma', [6, 'band-alma-return']);
s = await store();
check('להקה (אלמה, ביקור חוזר): Fast / Slow נפתחו אחרי ש־Go/Stop התבססו', ok && !!s.progress.alma.items.fast);
ok = await playBand('shaya', [8, 'band-shaya']);
s = await store();
const sb = s.progress.shaya.items;
check('להקה (שייה): הבינה הוראת ניצוח ונתנה הוראה בעצמה', ok && !!sb.s_play && sb.s_play.usedTouch > 0, JSON.stringify(sb.s_play || {}));
check('להקה (שייה): שיר מהתפריט שלה נשמר', (s.creations?.shaya?.band?.words || []).length === 4);
await tapSel('.hud-back'); await pg.waitForSelector('.who-card');
await tapSel('.who-card[data-id=together]');
await pg.waitForSelector('.band-door'); await pg.waitForTimeout(300);
await tapSel('.band-door');
ok = await autoplay({ until: '.home-hud' });
s = await store();
check('להקה (אחיות): הושלם ונשמר כיצירה משותפת', ok && !!s.creations?.sisters?.band);

// ---------- 4ב2. טוטו טועה! ----------
for (const kid of ['alma', 'shaya']) {
  await tapSel('.hud-back'); await pg.waitForSelector('.who-card');
  await tapSel(`.who-card[data-id=${kid}]`);
  await pg.waitForSelector('.silly-door'); await pg.waitForTimeout(300);
  await tapSel('.silly-door');
  await pg.waitForSelector('.prop-wrap[data-id=yes]', { timeout: 15000 });
  if (SHOTS && kid === 'shaya') { await pg.waitForTimeout(700); await pg.screenshot({ path: 'shots/silly.png' }); }
  ok = await autoplay({ until: '.home-hud' });
  s = await store();
  const judged = Object.values(s.progress[kid].items).filter((i) => i.contexts?.includes('toto:silly') || i.successContexts?.includes('toto:silly') || i.sessions);
  check(`טוטו טועה (${kid}): הושלם ונרשמו שיפוטים`, ok && Object.values(s.progress[kid].items).some((i) => (i.successContexts || []).includes('toto:silly') || i.misses > 0) && (s.interests[kid].silly || 0) >= 3);
}
await tapSel('.hud-back'); await pg.waitForSelector('.who-card');
await tapSel('.who-card[data-id=together]');
await pg.waitForSelector('.silly-door'); await pg.waitForTimeout(300);
await tapSel('.silly-door');
ok = await autoplay({ until: '.home-hud' });
check('טוטו טועה (אחיות): הושלם בתורות', ok);
await tapSel('.hud-back'); await pg.waitForSelector('.who-card');
await tapSel('.who-card[data-id=alma]');
await pg.waitForSelector('.home-hud');

// ---------- 4ג. טוטו מדבר בקול שלי ----------
check('בובת קול: לא מוצגת בלי אישור מיקרופון', await pg.$eval('.puppet-btn', (e) => e.hidden));
await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('studio-pele:v1')); d.settings.micAllowed = true; localStorage.setItem('studio-pele:v1', JSON.stringify(d)); });
await pg.reload();
await tapSel('.who-card[data-id=alma]');
await pg.waitForSelector('.home-hud');
await pg.waitForTimeout(400);
const pv = await pg.$eval('.puppet-btn', (e) => !e.hidden);
const down = () => pg.evaluate(() => document.querySelector('.puppet-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const up = () => pg.evaluate(() => document.querySelector('.puppet-btn').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
await down(); await pg.waitForTimeout(600);           // טוטו מציג מילה
await down(); await pg.waitForTimeout(400);
const rec = await pg.$eval('.puppet-btn', (e) => e.classList.contains('listening'));
await pg.waitForTimeout(900); await up(); await pg.waitForTimeout(3000);
const after = await pg.$eval('.puppet-btn', (e) => e.classList.contains('listening'));
check('בובת קול: מוצגת באישור, נקודה אדומה בזמן הקלטה, נסגרת בשחרור', pv && rec && !after, JSON.stringify({ pv, rec, after }));
s = await store();
check('בובת קול: שום הקלטה לא נשמרה באחסון', !JSON.stringify(s).includes('audio') && (s.interests?.alma?.talk || 0) >= 1);
await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('studio-pele:v1')); d.settings.micAllowed = false; localStorage.setItem('studio-pele:v1', JSON.stringify(d)); });

// ---------- 5. שער הורים ----------
await tapSel('.parent-door');
await pg.waitForSelector('.gate-q');
const wrong = await pg.evaluate(() => {
  const q = document.querySelector('.gate-q').textContent; return [...document.querySelectorAll('.gate-opts button')].map((b) => +b.dataset.v);
});
// תשובה שגויה מחזירה לסטודיו
await pg.evaluate(() => { const bs = [...document.querySelectorAll('.gate-opts button')]; bs.sort((a, b) => +b.dataset.v - +a.dataset.v)[0].click(); });
await pg.waitForTimeout(200);
const inArea = !!(await pg.$('.parents'));
check('שער הורים: תשובה שגויה לא פותחת (התשובה הגבוהה היא תמיד שגויה)', !inArea);
await tapSel('.parent-door');
await pg.waitForSelector('.gate-q');
await pg.evaluate(() => {
  const NUM = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'אחת־עשרה', 'שתים־עשרה', 'שלוש־עשרה', 'ארבע־עשרה', 'חמש־עשרה', 'שש־עשרה', 'שבע־עשרה', 'שמונה־עשרה', 'תשע־עשרה'];
  const m = document.querySelector('.gate-q').textContent.match(/כמה זה (\S+) ועוד (\S+)\?/);
  const v = NUM.indexOf(m[1]) + NUM.indexOf(m[2]);
  [...document.querySelectorAll('.gate-opts button')].find((b) => +b.dataset.v === v).click();
});
await pg.waitForSelector('.parents');
const summary = await pg.textContent('.parents main');
check('אזור הורים: סיכום מציג ראיות ואי־ודאות', /בחרה נכון|נכון אחרי רמז|נכון מול מסיח/.test(summary) && /לשחק מחוץ למסך/.test(summary));
const stagesBefore = JSON.stringify((await store()).progress.alma.items);
await pg.click('[data-home=alma]');
s = await store();
check('דיווח הורה על משחק בבית נשמר בנפרד ולא שינה ראיות', s.missions.alma.homeReports.length === 1 && JSON.stringify(s.progress.alma.items) === stagesBefore);
if (SHOTS) { await pg.evaluate(() => document.querySelector('.child details')?.setAttribute('open', '')); await pg.screenshot({ path: 'shots/parents-summary.png', fullPage: true }); }
await pg.click('nav button[data-t=settings]');
check('הגדרות: אבחון קול ומיקרופון מוצג', /זיהוי דיבור/.test(await pg.textContent('.parents main')));

// ---------- 6. ספריית תוכן: טיוטה → אישור הורה → צמיחה הדרגתית ----------
const PACK_WORDS = { fruits1: ['orange', 'strawberry', 'grapes'], drinks1: ['lemonade'], garden1: ['carrot', 'cake'] };
const allPack = Object.values(PACK_WORDS).flat();
s = await store();
check('ספרייה: לפני אישור הורה אף מילה מהספרייה לא הגיעה לילדות', !allPack.some((w) => s.progress.alma.items[w] || s.progress.shaya.items[w]));
await pg.click('nav button[data-t=library]');
check('ספרייה: שלוש חבילות מוצגות כטיוטה עם בדיקות', (await pg.$$('.pack.draft')).length === 3 && (await pg.$$('.pack .checks li.ok')).length >= 12);
if (SHOTS) await pg.screenshot({ path: 'shots/parents-library.png', fullPage: true });
await pg.click('.pack[data-pack=fruits1] [data-st=approved]');
await pg.click('.pack[data-pack=drinks1] [data-st=approved]');
await pg.click('.pack[data-pack=garden1] [data-st=declined]');
s = await store();
check('ספרייה: האישור נשמר', s.library.fruits1.status === 'approved' && s.library.garden1.status === 'declined');
// מדמים ששתי הילדות כבר ביססו את המילים הקיימות (כאילו עברו כמה ביקורים)
await pg.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('studio-pele:v1'));
  for (const [pid, ids] of [['alma', ['banana', 'apple', 'water', 'cookie']], ['shaya', ['milk', 'water', 'juice', 'apple', 'banana', 'cookie']]]) {
    for (const id of ids) {
      const it = d.progress[pid].items[id] || (d.progress[pid].items[id] = { exposures: 1, helped: 0, sillyOnly: 0, independent: 0, misses: 0, usedTouch: 0, usedSpoken: 0, usedModeled: 0, transfer: 0, contexts: [], successContexts: [], lastSeen: 0, sessions: [] });
      it.independent = Math.max(it.independent, 3); it.exposures = Math.max(1, it.exposures);
    }
  }
  localStorage.setItem('studio-pele:v1', JSON.stringify(d));
});
await pg.reload();
for (const kid of ['alma', 'shaya']) {
  await tapSel(`.who-card[data-id=${kid}]`);
  await pg.waitForSelector('.cafe-door'); await pg.waitForTimeout(300);
  await tapSel('.cafe-door');
  await pg.waitForSelector('.hud-replay');
  ok = await autoplay({ until: '.home-hud', shotAt: kid === 'shaya' ? { 2: 'shaya-pantry-grows' } : { 3: 'alma-new-word' } });
  s = await store();
  const got = allPack.filter((w) => s.progress[kid].items[w]);
  check(`צמיחה (${kid}): נפתחה בדיוק מילה חדשה אחת, מחבילה מאושרת`, ok && got.length === 1 && !PACK_WORDS.garden1.includes(got[0]), got.join(','));
  await tapSel('.hud-back'); await pg.waitForSelector('.who-card');
}
await tapSel('.parent-door');
await pg.waitForSelector('.gate-q');
await pg.evaluate(() => {
  const NUM = ['אפס', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר', 'אחת־עשרה', 'שתים־עשרה', 'שלוש־עשרה', 'ארבע־עשרה', 'חמש־עשרה', 'שש־עשרה', 'שבע־עשרה', 'שמונה־עשרה', 'תשע־עשרה'];
  const m = document.querySelector('.gate-q').textContent.match(/כמה זה (\S+) ועוד (\S+)\?/);
  const v = NUM.indexOf(m[1]) + NUM.indexOf(m[2]);
  [...document.querySelectorAll('.gate-opts button')].find((b) => +b.dataset.v === v).click();
});
await pg.waitForSelector('.parents');

await pg.click('nav button[data-t=data]');
await pg.click('[data-del=alma]');
await pg.click('.confirm-del .yes');
s = await store();
check('מחיקת נתונים של ילדה אחת לא נוגעת באחרת', !s.progress.alma && !!s.progress.shaya);

if (process.argv.includes('--collect')) {
  const fs = await import('node:fs');
  const said = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('said') || '[]'));
  const f = 'tools/voices/said.json';
  const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
  fs.writeFileSync(f, JSON.stringify([...new Set([...prev, ...said])].sort(), null, 1));
  console.log('שורות שנאספו:', said.length);
}
console.log('\nשגיאות בקונסול:', errors.length ? errors : 'אין');
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} עברו`);
await b.close();
process.exit(failed || errors.length ? 1 : 0);
