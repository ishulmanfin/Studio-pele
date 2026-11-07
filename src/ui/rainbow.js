// "הקשת" – צבעים באנגלית וידע כללי. קשת אפורה בשמיים; מיקה אומרת צבע באנגלית ("Red!"),
// או לשייה שואלת "באיזה צבע השמש?". נוגעים בצנצנת הנכונה – המכחול עף והפס בקשת נצבע.
// צבע אחר: מיקה אומרת את שמו באנגלית ומבקשת שוב. בסוף: הקשת מלאה, השמש מחייכת ועובדה על קשתות.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { studioSet } from '../art/sets.js';
import { PAINT } from '../art/puppets.js';
import { sfx, unlockAudio } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { LINES, BANDS, QUESTIONS, FACTS } from '../content/rainbow.js';
import { LINES as BANDL } from '../content/band.js';
import { hudHtml } from './cafe.js';

const NS = 'http://www.w3.org/2000/svg';
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CX = 800; const CY = 820; const R0 = 560; const W = 50;

export async function runRainbow(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: studioSet('day') });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true, stage: st });
  const mika = st.addActor('mika', 200, 960, { scale: 0.75 });
  const toto = st.addActor('toto', 1360, 985, { scale: 0.56, flip: true }); // לא מוסתר מאחורי כפתור השמיעה
  for (const p of players) P.beginSession(p.id, 'rainbow');

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => { c.classList.remove('show'); st.replay().catch(() => {}); }; // ממשיכים: מיקה חוזרת על הבקשה שנקטעה
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  // הקשת: פס אפור לכל צבע, ומעליו פס צבעוני שמתמלא משמאל לימין
  const rb = document.createElementNS(NS, 'g'); rb.classList.add('rainbow');
  const arc = (r) => `M${CX - r},${CY} A${r},${r} 0 0 1 ${CX + r},${CY}`;
  rb.innerHTML = BANDS.map((c, i) => { const r = R0 - i * W; return `<path d="${arc(r)}" fill="none" stroke="#2A1A5E" stroke-width="${W + 6}" opacity=".9"/>`; }).join('')
    + BANDS.map((c, i) => { const r = R0 - i * W; return `<path d="${arc(r)}" fill="none" stroke="${i % 2 ? '#E4E1EE' : '#D7D3E6'}" stroke-width="${W - 2}"/>`; }).join('')
    + BANDS.map((c, i) => { const r = R0 - i * W; const len = Math.PI * r; return `<path class="rb-band" data-c="${c}" d="${arc(r)}" fill="none" stroke="${PAINT[c]}" stroke-width="${W - 2}" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"/>`; }).join('')
    + `<g fill="#fff" stroke="#2A1A5E" stroke-width="5"><ellipse cx="${CX - R0 + 80}" cy="${CY}" rx="150" ry="56"/><ellipse cx="${CX + R0 - 80}" cy="${CY}" rx="150" ry="56"/></g>`;
  st.layers.back.appendChild(rb);
  const paintBand = (c) => {
    const p = rb.querySelector(`.rb-band[data-c="${c}"]`);
    p.animate([{ strokeDashoffset: p.getAttribute('stroke-dashoffset') }, { strokeDashoffset: 0 }], { duration: window.__FAST ? 50 : 1100, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  };

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    for (const p of players) P.endSession(p.id);
    fun.destroy(); st.destroy();
    onDone?.({ early, overTime: false });
  }

  try {
    const seen = players.some((p) => (store.interests(p.id).rainbow || 0) > 0);
    mika.anim('wave', 900);
    if (!seen) await st.say('mika', LINES.intro, 'he');
    let firstRound = !seen; let saidQ = false; let saidAgain = false;
    for (let i = 0; i < BANDS.length; i++) {
      const kid = sisters ? players[i % players.length] : players[0];
      const younger = kid.track === 'younger';
      if (sisters) { setTurn(kid.id); await st.say('mika', BANDL.mika.turnOf(kid.name), 'he'); }
      const target = BANDS[i];
      // שייה: מהסבב השלישי – לסירוגין שאלת ידע בעברית
      const askQ = !younger && i >= 2 && i % 2 === 0;
      if (askQ && !saidQ) { saidQ = true; await st.say('mika', LINES.introQ, 'he'); }
      const n = younger ? 3 : 4;
      const set = shuffle([target, ...shuffle(BANDS.filter((c) => c !== target)).slice(0, n - 1)]);
      const gap = n === 3 ? 230 : 200; const x0 = CX - (gap * (n - 1)) / 2;
      const pots = set.map((c, k) => {
        const x = x0 + gap * k;
        const pr = st.addProp(c, x, 1300, { scale: 0.95, layer: 'front', id: `pot-${c}` });
        pr.el.classList.add('armed', 'paint-pot');
        pr.fly(x, 915, 0.95, 420 + k * 90);
        return pr;
      });
      sfx.pop();
      await st.wait(650);
      const q = askQ ? pick(QUESTIONS[target]) : null;
      const prompt = () => (q ? st.say('mika', q, 'he', { prompt: true }) : st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { prompt: true }));
      let wrongs = 0; let help = 0; let asked = false;
      const tp = pots[set.indexOf(target)];
      const pickedP = new Promise((resolve) => {
        const stops = [];
        if (firstRound) stops.push(st.timer(1600, () => { st.hand(tp.el, { taps: 3 }).catch(() => {}); }));
        stops.push(st.timer(8000, () => { help = 1; prompt().catch(() => {}); }));
        stops.push(st.timer(15000, () => { help = 2; st.say('mika', LINES.tapIt, 'he').catch(() => {}); tp.pulse(true); }));
        pots.forEach((pr, k) => pr.el.addEventListener('pointerup', () => {
          if (!pr.el.classList.contains('armed')) return;
          if (set[k] === target) { stops.forEach((s) => s()); pots.forEach((x) => x.el.classList.remove('armed')); resolve(pr); return; }
          sfx.boing(); pr.wiggle();
          if (!asked) return;
          wrongs++; if (wrongs >= 2) { help = Math.max(help, 2); tp.pulse(true); } // אחרי שתי נגיעות – רמז ברור
          st.hush();
          (async () => {
            await st.say('mika', `${cap(VOCAB[set[k]].en)}!`, 'en');
            if (!saidAgain) { saidAgain = true; await st.say('mika', LINES.again, 'he'); }
            await prompt();
          })().catch(() => {});
        }));
      });
      P.exposed(kid.id, target, 'rainbow');
      await Promise.race([prompt().catch(() => {}), pickedP]);
      asked = true;
      const picked = await pickedP;
      firstRound = false; tp.pulse(false); st.hush();
      // הצנצנת עפה לקשת, והפס נצבע
      const r = R0 - i * W;
      for (const pr of pots) if (pr !== picked) pr.fly(pr.x, 1300, 0.95, 380);
      await picked.fly(CX - r + 40, CY - 40, 0.7, 420);
      sfx.sparkle(); paintBand(target);
      picked.fly(CX + r - 40, CY - 40, 0.7, 1000);
      const top = rb.querySelector(`.rb-band[data-c="${target}"]`).getBoundingClientRect();
      fun.burst(top.left + top.width / 2, top.top + 10);
      toto.anim('hop', 600); mika.anim('hop', 600);
      P.choice(kid.id, target, { correct: wrongs === 0, help, distractor: 'real', context: 'rainbow' });
      if (wrongs) P.choice(kid.id, target, { correct: true, help: Math.max(1, help), context: 'rainbow' });
      store.bumpInterest(kid.id, 'rainbow');
      await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en');
      await st.say('mika', FACTS[target], 'he');
      pots.forEach((pr) => pr.remove());
      await st.wait(250);
    }
    setTurn(null);
    rb.classList.add('rb-done');
    toto.anim('bounce', 800); mika.anim('wave', 1200);
    await st.say('mika', LINES.done, 'he');
    await st.say('mika', LINES.science, 'he');
    await fun.finale();
    await st.say('mika', sisters ? LINES.byeSis : LINES.bye, 'he');
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}
