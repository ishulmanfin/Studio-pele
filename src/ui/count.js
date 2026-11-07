// "סופרים" – מספרים באנגלית. שלוש צלחות עם מספר שונה של עוגיות/תפוחים. מיקה אומרת מספר ("Three!"),
// נוגעים בצלחת הנכונה, ואז סופרים ביחד בקול: כל פריט קופץ בתורו – One! Two! Three!
// צלחת אחרת: מיקה אומרת כמה יש בה באנגלית, ומבקשת שוב. אלמה: 1-4, מספרים רחוקים; שייה: 3-6, מספרים צמודים.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { cafeSet } from '../art/sets.js';
import { prop as drawProp } from '../art/puppets.js';
import { sfx, unlockAudio } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { LINES, NUMS } from '../content/count.js';
import { LINES as BANDL } from '../content/band.js';
import { hudHtml } from './cafe.js';

const NS = 'http://www.w3.org/2000/svg';
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ITEMS = ['cookie', 'apple', 'strawberry', 'banana', 'orange', 'cake'];
const SLOTS = [[-82, -36], [0, -36], [82, -36], [-82, -100], [0, -100], [82, -100]];
const en = (n) => `${cap(VOCAB[NUMS[n - 1]].en)}!`;

/** סבבים: מספר יעד ושלוש אפשרויות */
export function planCount(younger, rounds) {
  const out = []; const used = [];
  for (let i = 0; i < rounds; i++) {
    let t; let opts;
    if (younger) {
      t = pick([1, 2, 3, 4].filter((x) => x !== used[used.length - 1]));
      opts = shuffle([t, ...shuffle([1, 2, 3, 4].filter((x) => x !== t)).slice(0, 2)]);
    } else {
      t = pick([3, 4, 5, 6].filter((x) => x !== used[used.length - 1]));
      const near = [t - 1, t + 1, t - 2, t + 2].filter((x) => x >= 1 && x <= 6);
      opts = shuffle([t, ...near.slice(0, 2)]);
    }
    used.push(t); out.push({ t, opts });
  }
  return out;
}

export async function runCount(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: cafeSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true, stage: st });
  const mika = st.addActor('mika', 210, 960, { scale: 0.75 });
  const bum = st.addActor('bum', 1250, 770, { scale: 0.6 });
  for (const p of players) P.beginSession(p.id, 'count');

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => { c.classList.remove('show'); st.replay().catch(() => {}); }; // ממשיכים: מיקה חוזרת על הבקשה שנקטעה
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    for (const p of players) P.endSession(p.id);
    fun.destroy(); st.destroy();
    onDone?.({ early, overTime: false });
  }

  function plate(n, item, x) {
    const g = document.createElementNS(NS, 'g');
    g.classList.add('count-plate', 'armed', 'tappable');
    g.dataset.n = String(n);
    g.innerHTML = `<g class="cp-in"><ellipse cx="0" cy="-60" rx="170" ry="120" fill="transparent"/>
      <ellipse cy="6" rx="160" ry="40" fill="#2A1A5E" opacity=".15"/>
      <ellipse rx="160" ry="46" fill="#fffaf0" stroke="#2A1A5E" stroke-width="5"/><ellipse rx="104" ry="26" fill="none" stroke="#B8E2FF" stroke-width="5"/>
      ${SLOTS.slice(0, n).map(([sx, sy], k) => `<g class="cp-item" style="--k:${k}" transform="translate(${sx},${sy}) scale(.5)"><g class="cp-bob">${drawProp(item)}</g></g>`).join('')}</g>`;
    g.setAttribute('transform', `translate(${x},1300)`);
    st.layers.front.appendChild(g);
    return g;
  }
  const moveTo = (g, x, y, ms) => { g.style.transition = `transform ${window.__FAST ? 1 : ms}ms cubic-bezier(.34,1.3,.64,1)`; g.style.transform = `translate(${x}px,${y}px)`; };

  try {
    const seen = players.some((p) => (store.interests(p.id).count || 0) > 0);
    mika.anim('wave', 900);
    if (!seen) await st.say('mika', LINES.intro, 'he');
    const per = sisters ? 3 : 6;
    const plans = players.map((p) => planCount(p.track === 'younger', per));
    const order = [];
    for (let i = 0; i < per; i++) players.forEach((p, k) => order.push({ kid: p, r: plans[k][i] }));
    let firstRound = !seen; let saidAgain = false; let saidTogether = false;

    for (const { kid, r } of order) {
      if (sisters) { setTurn(kid.id); await st.say('mika', BANDL.mika.turnOf(kid.name), 'he'); }
      const item = pick(ITEMS);
      const xs = [560, 880, 1200];
      const plates = r.opts.map((n, k) => { const g = plate(n, item, xs[k]); g.style.transform = `translate(${xs[k]}px,1300px)`; g.getBoundingClientRect(); moveTo(g, xs[k], 915, 450 + k * 100); return g; });
      sfx.pop();
      await st.wait(700);
      const prompt = () => st.say('mika', en(r.t), 'en', { prompt: true });
      let wrongs = 0; let help = 0; let asked = false;
      const tp = plates[r.opts.indexOf(r.t)];
      const pickedP = new Promise((resolve) => {
        const stops = [];
        if (firstRound) stops.push(st.timer(1600, () => { st.hand(tp, { taps: 3 }).catch(() => {}); }));
        stops.push(st.timer(8000, () => { help = 1; st.say('mika', en(r.t), 'en', { slow: true }).catch(() => {}); }));
        stops.push(st.timer(15000, () => { help = 2; st.say('mika', LINES.tapIt, 'he').catch(() => {}); tp.classList.add('hint-pulse'); }));
        plates.forEach((g, k) => g.addEventListener('pointerup', () => {
          if (!g.classList.contains('armed')) return;
          if (r.opts[k] === r.t) { stops.forEach((s) => s()); plates.forEach((x) => x.classList.remove('armed')); resolve(g); return; }
          sfx.boing(); g.classList.remove('wiggle'); g.getBoundingClientRect(); g.classList.add('wiggle');
          if (!asked) return;
          wrongs++; if (wrongs >= 2) { help = Math.max(help, 2); tp.classList.add('hint-pulse'); } // אחרי שתי נגיעות – רמז ברור
          st.hush();
          (async () => {
            await st.say('mika', en(r.opts[k]), 'en');
            if (!saidAgain) { saidAgain = true; await st.say('mika', LINES.again, 'he'); }
            await prompt();
          })().catch(() => {});
        }));
      });
      P.exposed(kid.id, NUMS[r.t - 1], 'count');
      await Promise.race([prompt().catch(() => {}), pickedP]);
      asked = true;
      const picked = await pickedP;
      firstRound = false; tp.classList.remove('hint-pulse'); st.hush();
      plates.forEach((g, k) => { if (g !== picked) moveTo(g, xs[k], 1300, 380); });
      moveTo(picked, 880, 880, 450);
      sfx.sparkle();
      P.choice(kid.id, NUMS[r.t - 1], { correct: wrongs === 0, help, distractor: 'real', context: 'count' });
      if (wrongs) P.choice(kid.id, NUMS[r.t - 1], { correct: true, help: Math.max(1, help), context: 'count' });
      store.bumpInterest(kid.id, 'count');
      await st.wait(500);
      const box = picked.getBoundingClientRect(); fun.burst(box.left + box.width / 2, box.top + box.height / 3);
      // סופרים ביחד: כל פריט קופץ, ומיקה סופרת באנגלית
      if (!saidTogether) { saidTogether = true; await st.say('mika', LINES.together, 'he'); }
      const items = [...picked.querySelectorAll('.cp-item')];
      for (let k = 0; k < items.length; k++) {
        items[k].classList.add('counted'); sfx.pop(); bum.anim('bounce', 300);
        await st.say('mika', en(k + 1), 'en');
      }
      mika.anim('hop', 600); bum.anim('hop', 600);
      await st.wait(400);
      // בום אוכל את כל הצלחת
      sfx.chomp(); picked.classList.add('eaten');
      await st.wait(600);
      plates.forEach((g) => g.remove());
    }
    setTurn(null);
    await fun.finale();
    await st.say('mika', sisters ? LINES.byeSis : LINES.bye, 'he');
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}
