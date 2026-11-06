// "בום רעב" – משחק האכלה: בום גדול עם פה פתוח, ועל השולחן כמה מאכלים.
// מיקה אומרת באנגלית מה בום רוצה; נוגעים במאכל, והוא עף לפה של בום – חמ-חמ-חמ, קונפטי וכוכב.
// מאכל אחר: בום מנענע בראש "לא את זה" ומיקה אומרת שוב (בלי "טעות" מבאסת). בום גדל קצת עם כל ביס, ובסוף – גרעפס ענק.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { cafeSet } from '../art/sets.js';
import { sfx, unlockAudio, audioContext } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { LINES } from '../content/feed.js';
import { LINES as BANDL } from '../content/band.js';
import { hudHtml } from './cafe.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const FOODS = ['apple', 'banana', 'cookie', 'orange', 'strawberry', 'grapes', 'carrot', 'cake', 'water', 'milk', 'juice'];
const BASE = ['banana', 'apple', 'cookie', 'water', 'milk', 'juice'];

/** גרעפס מצחיק – סינתזה, בלי הקלטה */
function burp() {
  const ac = audioContext(); if (!ac || window.__FAST || store.settings().sfx === false) return;
  const t = ac.currentTime; const dur = 0.7;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70, t + dur);
  const lfo = ac.createOscillator(); lfo.frequency.value = 28; const lg = ac.createGain(); lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 6;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.05); g.gain.setValueAtTime(0.3, t + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(ac.destination); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}

export async function runFeed(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: cafeSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true });
  const BX = 1180; const BY = 900;
  let bumScale = 1.25;
  const bum = st.addActor('bum', BX, BY, { scale: bumScale });
  const mika = st.addActor('mika', 260, 940, { scale: 0.75 });
  bum.el.classList.add('feed-bum');
  for (const p of players) P.beginSession(p.id, 'feed');

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => c.classList.remove('show');
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  // שולחן מתחת למאכלים
  const NS = 'http://www.w3.org/2000/svg';
  const table = document.createElementNS(NS, 'g');
  table.innerHTML = `<rect x="430" y="905" width="520" height="34" rx="12" fill="#FF8C42" stroke="#2A1A5E" stroke-width="5"/>
    <rect x="470" y="935" width="22" height="150" fill="#C7612A" stroke="#2A1A5E" stroke-width="4"/><rect x="888" y="935" width="22" height="150" fill="#C7612A" stroke="#2A1A5E" stroke-width="4"/>`;
  st.layers.back.appendChild(table);

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    for (const p of players) P.endSession(p.id);
    fun.destroy(); st.destroy();
    onDone?.({ early, overTime: false });
  }
  const hungry = (on) => bum.el.classList.toggle('hungry', on);
  // הפה של בום (בקואורדינטות הבמה)
  const mouthAt = () => [BX, BY - 78 * bumScale];

  try {
    const seen = players.some((p) => (store.interests(p.id).feed || 0) > 0);
    hungry(true); bum.anim('bounce', 600);
    if (!seen) await st.say('mika', LINES.intro, 'he');
    const words = planWords(players);
    let firstRound = !seen;
    for (let i = 0; i < words.length; i++) {
      const kid = sisters ? players[i % players.length] : players[0];
      const younger = kid.track === 'younger';
      if (sisters) { setTurn(kid.id); await st.say('mika', BANDL.mika.turnOf(kid.name), 'he'); }
      const target = words[i];
      const n = younger ? 3 : 4;
      const others = shuffle(FOODS.filter((w) => w !== target && VOCAB[w])).slice(0, n - 1);
      const set = shuffle([target, ...others]);
      const span = 460 / set.length;
      const props = set.map((w, k) => {
        const x = 460 + span * (k + 0.5);
        const pr = st.addProp(w, x, 1250, { scale: 0.85, layer: 'front', id: `f-${w}` });
        pr.el.classList.add('armed');
        pr.fly(x, 838, 0.85, 420 + k * 90);
        return pr;
      });
      sfx.pop();
      await st.wait(700);
      hungry(true); bum.anim('hop', 500);
      P.exposed(kid.id, target, 'feed');
      let wrongs = 0; let help = 0; let asked = false;
      const tp = props[set.indexOf(target)];
      // מקשיבים לנגיעות כבר מעכשיו – גם נגיעה בזמן שמיקה אומרת את המילה נחשבת
      const pickedP = new Promise((resolve) => {
        const stops = [];
        if (firstRound) stops.push(st.timer(1600, () => { st.hand(tp.el, { taps: 3 }).catch(() => {}); }));
        stops.push(st.timer(7000, () => { help = 1; st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { slow: true }).catch(() => {}); }));
        stops.push(st.timer(13000, () => { help = 2; st.say('mika', LINES.tapIt, 'he').catch(() => {}); tp.pulse(true); }));
        props.forEach((pr, k) => pr.el.addEventListener('pointerup', () => {
          if (set[k] === target) { stops.forEach((s) => s()); props.forEach((q) => q.el.classList.remove('armed')); resolve(pr); return; }
          if (!pr.el.classList.contains('armed')) return;
          sfx.boing(); pr.wiggle();
          if (!asked) return; // לפני שמיקה אמרה את המילה – רק קפיצה קטנה
          wrongs++;
          bum.el.classList.remove('no-no'); bum.el.getBoundingClientRect(); bum.el.classList.add('no-no');
          st.hush();
          (async () => { if (wrongs === 1) await st.say('mika', LINES.notThat, 'he'); await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en'); })().catch(() => {});
        }));
      });
      await Promise.race([st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { prompt: true }).catch(() => {}), pickedP]);
      asked = true;
      const picked = await pickedP;
      firstRound = false;
      tp.pulse(false);
      // עף לפה – חמ חמ חמ
      const [mx, my] = mouthAt();
      await picked.fly(mx, my, 0.15, 520);
      picked.remove(); sfx.chomp(); bum.anim('bounce', 700);
      bumScale = Math.min(1.6, bumScale + 0.05); bum.el.querySelector('.squish-wrap').style.transform = `scale(${(bumScale / 1.25).toFixed(3)})`;
      const r = bum.el.getBoundingClientRect(); fun.win(r.left + r.width / 2, r.top + r.height * 0.35);
      P.choice(kid.id, target, { correct: wrongs === 0, help, distractor: 'real', context: 'feed' });
      if (wrongs) P.choice(kid.id, target, { correct: true, help: Math.max(1, help), context: 'feed' });
      store.bumpInterest(kid.id, 'feed');
      mika.anim('hop', 600);
      await st.wait(600);
      await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en');
      for (const pr of props) if (pr !== picked) pr.fly(pr.x, 1250, 0.85, 400);
      await st.wait(500);
      props.forEach((pr) => pr !== picked && pr.remove());
    }
    setTurn(null);
    // בום שבע – והגרעפס הגדול
    hungry(false); bum.mood('happy');
    await st.say('mika', LINES.full, 'he');
    await st.wait(400);
    bum.el.classList.add('burp'); burp();
    const r = bum.el.getBoundingClientRect(); fun.burst(r.left + r.width / 2, r.top + r.height * 0.3, 40);
    await st.wait(1300); bum.el.classList.remove('burp');
    mika.anim('hop', 600);
    await fun.finale();
    await st.say('mika', sisters ? LINES.byeSis : LINES.bye, 'he');
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}

function planWords(players) {
  const met = [...new Set(players.flatMap((p) => Object.keys(P.allItems(p.id)).filter((id) => FOODS.includes(id) && P.stage(p.id, id) > 0)))];
  const pool = [...new Set([...met, ...BASE])];
  return shuffle(pool).slice(0, 6);
}
