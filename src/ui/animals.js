// "עולם החיות" – ידע כללי ואוצר מילים. מיקה שואלת שאלה ("מי אומר מוּ?", "מי מטיל ביצים?"),
// נוגעים בחיה הנכונה, והיא קופצת משמחה. מיקה אומרת את שמה באנגלית ועובדה מעניינת עליה.
// חיה אחרת: מיקה אומרת את שמה באנגלית (עוד מילה נלמדת!) ושואלת שוב. אלמה – 3 קלפים ושאלות רמה 1;
// שייה – 4 קלפים, שאלות מאתגרות, וסבב שבו מיקה אומרת רק את השם באנגלית. בסוף – מצעד חיות.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { studioSet } from '../art/sets.js';
import { sfx, unlockAudio } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { LINES, QUESTIONS, FACTS, ANIMAL_IDS } from '../content/animals.js';
import { LINES as BANDL } from '../content/band.js';
import { hudHtml } from './cafe.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const CARD = '<rect x="-84" y="-84" width="168" height="168" rx="30" fill="#fffaf0" stroke="#2A1A5E" stroke-width="5"/><rect x="-74" y="58" width="148" height="16" rx="8" fill="#FFD23F" opacity=".5"/>';

/** תכנון הסבבים לפי הילדה */
export function planRounds(younger, n) {
  const usedT = new Set(); const usedQ = new Set();
  const take = (level) => {
    const q = shuffle(QUESTIONS.filter((x) => x.level === level && !usedQ.has(x.id) && x.ok.some((t) => !usedT.has(t))))[0];
    if (!q) return null;
    usedQ.add(q.id);
    const t = pick(q.ok.filter((x) => !usedT.has(x))); usedT.add(t);
    return { kind: 'q', q, target: t };
  };
  const en = () => { const t = shuffle(ANIMAL_IDS.filter((a) => !usedT.has(a)))[0] || pick(ANIMAL_IDS); usedT.add(t); return { kind: 'en', target: t }; };
  if (younger) return Array.from({ length: n }, () => take(1)).filter(Boolean);
  // שייה: חימום בשאלה קלה, ואז שאלות מאתגרות וסבבים "רק באנגלית"
  const seq = n >= 8 ? [1, 2, 2, 'en', 1, 2, 2, 'en'] : [1, 2, 'en', 2];
  return seq.slice(0, n).map((k) => (k === 'en' ? en() : take(k) || take(1))).filter(Boolean);
}

export async function runAnimals(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: studioSet('day') });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true });
  const mika = st.addActor('mika', 220, 960, { scale: 0.78 });
  const toto = st.addActor('toto', 1400, 980, { scale: 0.58, flip: true });
  for (const p of players) P.beginSession(p.id, 'animals');

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => c.classList.remove('show');
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    for (const p of players) P.endSession(p.id);
    fun.destroy(); st.destroy();
    onDone?.({ early, overTime: false });
  }

  try {
    const seen = players.some((p) => (store.interests(p.id).animals || 0) > 0);
    mika.anim('wave', 900);
    if (!seen) await st.say('mika', LINES.intro, 'he');
    // תכנון: לכל ילדה הסבבים שלה; באחיות – לסירוגין
    const per = sisters ? 4 : (players[0].track === 'younger' ? 7 : 8);
    const plans = players.map((p) => planRounds(p.track === 'younger', per));
    const order = [];
    for (let i = 0; i < per; i++) for (let k = 0; k < players.length; k++) if (plans[k][i]) order.push({ kid: players[k], r: plans[k][i] });
    let firstRound = !seen; let enIntro = false; let saidAgain = false;

    for (const { kid, r } of order) {
      const younger = kid.track === 'younger';
      if (sisters) { setTurn(kid.id); await st.say('mika', BANDL.mika.turnOf(kid.name), 'he'); }
      if (r.kind === 'en' && !enIntro) { enIntro = true; await st.say('mika', LINES.introEn, 'he'); }
      const n = younger ? 3 : 4;
      const bad = r.kind === 'q' ? ANIMAL_IDS.filter((a) => !r.q.ok.includes(a) && !(r.q.avoid || []).includes(a)) : ANIMAL_IDS.filter((a) => a !== r.target);
      const set = shuffle([r.target, ...shuffle(bad).slice(0, n - 1)]);
      const gap = n === 3 ? 260 : 220; const x0 = 800 - (gap * (n - 1)) / 2;
      const cards = set.map((a, k) => {
        const x = x0 + gap * k;
        const pr = st.addProp(a, x, 1300, { scale: 0.95, layer: 'front', id: `an-${a}` });
        pr.el.querySelector('.prop-inner').insertAdjacentHTML('afterbegin', CARD);
        pr.el.classList.add('armed', 'animal-card');
        pr.fly(x, 560, 0.95, 450 + k * 110);
        return pr;
      });
      sfx.pop();
      await st.wait(750);
      const prompt = r.kind === 'q' ? () => st.say('mika', r.q.text, 'he', { prompt: true }) : () => st.say('mika', `${cap(VOCAB[r.target].en)}!`, 'en', { prompt: true });
      let wrongs = 0; let help = 0; let asked = false;
      const tp = cards[set.indexOf(r.target)];
      const pickedP = new Promise((resolve) => {
        const stops = [];
        if (firstRound) stops.push(st.timer(1800, () => { st.hand(tp.el, { taps: 3 }).catch(() => {}); }));
        stops.push(st.timer(9000, () => { help = 1; prompt().catch(() => {}); }));
        stops.push(st.timer(16000, () => { help = 2; st.say('mika', LINES.tapIt, 'he').catch(() => {}); tp.pulse(true); }));
        cards.forEach((pr, k) => pr.el.addEventListener('pointerup', () => {
          if (!pr.el.classList.contains('armed')) return;
          if (set[k] === r.target) { stops.forEach((s) => s()); cards.forEach((q) => q.el.classList.remove('armed')); resolve(pr); return; }
          sfx.boing(); pr.wiggle();
          if (!asked) return;
          wrongs++;
          st.hush();
          // מילה נוספת נלמדת: מיקה אומרת איזו חיה זאת באנגלית, ושואלת שוב
          (async () => {
            await st.say('mika', `${cap(VOCAB[set[k]].en)}!`, 'en');
            if (!saidAgain) { saidAgain = true; await st.say('mika', LINES.again, 'he'); }
            await prompt();
          })().catch(() => {});
        }));
      });
      P.exposed(kid.id, r.target, 'animals');
      await Promise.race([prompt().catch(() => {}), pickedP]);
      asked = true;
      const picked = await pickedP;
      firstRound = false; tp.pulse(false); st.hush();
      // החיה קופצת משמחה וגדלה, השאר יורדות
      for (const pr of cards) if (pr !== picked) pr.fly(pr.x, 1300, 0.95, 380);
      sfx.sparkle();
      picked.fly(800, 520, 1.5, 450);
      await st.wait(470);
      const box = picked.el.getBoundingClientRect(); fun.win(box.left + box.width / 2, box.top + box.height / 2);
      picked.el.classList.add('cheer');
      toto.anim('hop', 600); mika.anim('hop', 600);
      P.choice(kid.id, r.target, { correct: wrongs === 0, help, distractor: 'real', context: 'animals' });
      if (wrongs) P.choice(kid.id, r.target, { correct: true, help: Math.max(1, help), context: 'animals' });
      store.bumpInterest(kid.id, 'animals');
      await st.say('mika', `${cap(VOCAB[r.target].en)}!`, 'en');
      await st.say('mika', FACTS[r.target], 'he');
      picked.fly(800, 1300, 1.2, 420);
      await st.wait(450);
      cards.forEach((pr) => pr.remove());
    }
    setTurn(null);

    // מצעד חיות
    await st.say('mika', LINES.parade, 'he');
    const parade = ANIMAL_IDS.map((a, i) => {
      const pr = st.addProp(a, 1750 + i * 190, 860, { scale: 0.8, layer: 'front', id: `pa-${a}`, tappable: false });
      pr.el.classList.add('parade');
      pr.el.style.setProperty('--d', `${(i % 3) * 0.12}s`);
      return pr;
    });
    parade.forEach((pr) => pr.fly(pr.x - 2100, 860, 0.8, 5200));
    st.timer(1200, () => sfx.sparkle());
    fun.finale();
    await st.wait(5300);
    parade.forEach((pr) => pr.remove());
    await st.say('mika', sisters ? LINES.byeSis : LINES.bye, 'he');
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}
