// בדיקת "השיעור של מיקה": שלושה שיעורים לשייה, שיעור לאלמה, ושיעור ביחד – בדפדפן טאבלט (מגע).
// ילדה רובוטית עונה נכון (חוץ מטעות אחת), ובודקים: אין שגיאות, השיעור נגמר, הרמה עולה, החד-קרן נשמר.
// הפעלה: node server.js & node tests/lesson.mjs [--shots]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/?fast';
const SHOTS = process.argv.includes('--shots');
if (SHOTS) fs.mkdirSync('shots', { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
const pg = await ctx.newPage();
const errors = [];
pg.on('pageerror', (e) => errors.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
pg.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };
const tap = (sel) => pg.evaluate((s) => { const el = document.querySelector(s); el?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return !!el; }, sel);

await pg.goto(BASE);
await pg.evaluate(() => { localStorage.clear(); const d = { version: 1, profiles: { shaya: { id: 'shaya', name: 'שייה', track: 'older', symbol: 'star', color: '#FF4F8B' }, alma: { id: 'alma', name: 'אלמה', track: 'younger', symbol: 'moon', color: '#22D3A6' } } }; localStorage.setItem('studio-pele:v1', JSON.stringify(d)); });
await pg.reload();

async function lesson(who, { wrongOnce = false, shot = '' } = {}) {
  await pg.waitForSelector('.who-card', { timeout: 10000 });
  await tap(`.who-card[data-id="${who}"]`);
  await pg.waitForSelector('.lesson-door', { timeout: 10000 });
  await pg.waitForTimeout(300);
  await tap('.lesson-door');
  await pg.waitForSelector('.stage.lesson', { timeout: 10000 });
  const t0 = Date.now(); let wrong = !wrongOnce; let shots = 0; let taps = 0;
  while (Date.now() - t0 < 180000) {
    if (await pg.$('.home-hud')) break;
    if (SHOTS && shot && shots < 4 && taps % 3 === 0) { await pg.screenshot({ path: `shots/${shot}-${shots++}.png` }); }
    const act = await pg.evaluate((wrong) => {
      const fire = (el) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      const uni = document.querySelector('.uni-wrap.armed'); if (uni) { fire(uni); return 'uni'; }
      const p = (window.__lastPrompt || '').toLowerCase();
      const yes = document.querySelector('[data-id="m-yes"]'); const no = document.querySelector('[data-id="m-no"]');
      if (yes && no && !yes.dataset.t) {
        const easel = document.querySelector('[data-id^="easel-"]'); const w = easel?.dataset.id.slice(6) || '';
        const named = (p.match(/is this (?:an? )?(\w+)/) || [])[1] || '';
        yes.dataset.t = 1; fire(w.replace('c_', '') === named ? yes : no); return 'yn';
      }
      const armed = [...document.querySelectorAll('.armed')];
      if (!armed.length) return null;
      const word = (e) => (e.dataset.id || '').split('-')[1] || '';
      const want = armed.filter((e) => { const w = word(e).replace('c_', ''); return w && new RegExp(`\\b${w}\\b`).test(p); });
      if (!wrong && want.length && armed.length > 1) { const x = armed.find((e) => !want.includes(e)); fire(x); return 'wrong'; }
      fire(want[0] || armed[0]); return 'tap';
    }, wrong);
    if (act === 'wrong') wrong = true;
    if (act) taps++;
    await pg.waitForTimeout(act ? 450 : 150);
  }
  const mem = await pg.evaluate((who) => JSON.parse(localStorage.getItem('studio-pele:v1')).teacher?.[who], who);
  await tap('.hud-back');
  return { mem, taps };
}

const s1 = await lesson('shaya', { wrongOnce: true, shot: 'shaya1' });
check('שייה: שיעור ראשון נגמר וחזר הביתה', !!s1.mem && s1.mem.lessons.length === 1, `taps ${s1.taps}`);
check('שייה: נבחר חד-קרן', !!s1.mem?.unicorn, s1.mem?.unicorn);
check('שייה: מתחילה ברמה 2', s1.mem?.lessons[0].level === 2, `acc ${s1.mem?.lessons[0].acc}`);
const s2 = await lesson('shaya');
check('שייה: שיעור שני', s2.mem?.lessons.length === 2, `acc ${s2.mem?.lessons[1].acc} level ${s2.mem?.level}`);
check('שייה: הרמה עלתה אחרי שני שיעורים מצליחים', s2.mem?.level === 3 || s1.mem?.lessons[0].acc < 0.85, `level ${s2.mem?.level}`);
// מחר: עוד שיעור (מגבלת שניים ביום)
await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('studio-pele:v1')); for (const l of d.teacher.shaya.lessons) l.at -= 864e5; localStorage.setItem('studio-pele:v1', JSON.stringify(d)); });
await pg.reload();
const s3 = await lesson('shaya', { shot: 'shaya3' });
check('שייה: שיעור שלישי ברמה החדשה', s3.mem?.lessons.length === 3, `level ${s3.mem?.lessons[2].level}, new ${s3.mem?.lessons[2].words}`);
const a1 = await lesson('alma', { wrongOnce: true, shot: 'alma1' });
check('אלמה: שיעור ראשון ברמה 1', a1.mem?.lessons[0].level === 1, `words ${a1.mem?.lessons[0].words}`);
await pg.waitForSelector('.who-card');
await tap('.who-card[data-id="together"]');
await pg.waitForSelector('.lesson-door'); await pg.waitForTimeout(300); await tap('.lesson-door');
await pg.waitForSelector('.stage.lesson');
const t0 = Date.now();
while (Date.now() - t0 < 240000 && !(await pg.$('.home-hud'))) {
  await pg.evaluate(() => {
    const fire = (el) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const p = (window.__lastPrompt || '').toLowerCase();
    const armed = [...document.querySelectorAll('.armed')];
    const want = armed.find((e) => { const w = ((e.dataset.id || '').split('-')[1] || '').replace('c_', ''); return w && new RegExp(`\\b${w}\\b`).test(p); });
    const yes = document.querySelector('[data-id="m-yes"]');
    if (yes && !yes.dataset.t) { yes.dataset.t = 1; fire(yes); return; }
    if (want || armed[0]) fire(want || armed[0]);
  });
  await pg.waitForTimeout(400);
}
const both = await pg.evaluate(() => JSON.parse(localStorage.getItem('studio-pele:v1')).teacher);
check('ביחד: שיעור לשתיהן', both.shaya.lessons.length === 4 && both.alma.lessons.length === 2);
check('אין שגיאות בדפדפן', errors.length === 0, errors.slice(0, 3).join(' | '));
await b.close();
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `${bad} נכשלו` : 'הכל עבר');
process.exit(bad ? 1 : 0);
