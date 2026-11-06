// "בלונים" – משחק פעולה מהיר ומלהיב: בלונים עם תמונות עפים למעלה ומתנדנדים.
// מיקה אומרת מילה באנגלית, והילדה מפוצצת את הבלון הנכון (פיצוץ, קונפטי, כוכב). בלון לא נכון קופץ הצידה – לא "טעות" מבאסת.
// בסוף: מטר בלונים חופשי לפיצוץ. אלמה – 2-3 בלונים איטיים; שייה – 4 מהירים יותר. באחיות – לסירוגין.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { studioSet } from '../art/sets.js';
import { prop as drawProp } from '../art/puppets.js';
import { sfx, unlockAudio, audioContext } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { LINES } from '../content/balloons.js';
import { LINES as BANDL } from '../content/band.js';
import { hudHtml } from './cafe.js';

const NS = 'http://www.w3.org/2000/svg';
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const COLORS = ['#FF4F8B', '#FFD23F', '#22D3A6', '#4FA3FF', '#8B5CF6', '#FF8C42'];
const BASE = ['banana', 'apple', 'water', 'milk', 'cookie', 'juice'];

function popSound() {
  const ac = audioContext(); if (!ac || window.__FAST || store.settings().sfx === false) return;
  const t = ac.currentTime;
  const len = 0.12; const b = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate); const d = b.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 3);
  const s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.value = 0.6; s.connect(g).connect(ac.destination); s.start(t);
  const o = ac.createOscillator(); const og = ac.createGain(); o.type = 'triangle';
  o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
  og.gain.setValueAtTime(0.15, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(og).connect(ac.destination); o.start(t); o.stop(t + 0.2);
}

export async function runBalloons(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: studioSet('day') });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true });
  const mika = st.addActor('mika', 230, 960, { scale: 0.8 });
  const toto = st.addActor('toto', 1380, 980, { scale: 0.6, flip: true });
  for (const p of players) P.beginSession(p.id, 'balloons');
  const layer = document.createElementNS(NS, 'g'); st.layers.fx.appendChild(layer);

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => c.classList.remove('show');
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  // ---- מנוע בלונים ----
  const balloons = new Set();
  let raf = 0; let last = performance.now(); let speed = 1;
  function makeBalloon(word, x, { y = 1150, vy = 55, color } = {}) {
    const g = document.createElementNS(NS, 'g');
    g.classList.add('balloon'); if (word) g.dataset.word = word;
    const c = color || COLORS[Math.floor(Math.random() * COLORS.length)];
    g.innerHTML = `<path d="M0,95 C-12,130 14,160 -4,200" stroke="#2A1A5E" stroke-width="3" fill="none"/>
      <ellipse rx="92" ry="108" fill="${c}" stroke="#2A1A5E" stroke-width="5"/>
      <path d="M-8,104 L8,104 L0,118Z" fill="${c}" stroke="#2A1A5E" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="-40" cy="-50" rx="16" ry="28" fill="#fff" opacity=".45" transform="rotate(-25 -40 -50)"/>
      <circle r="62" fill="#fff" opacity=".85"/>
      ${word ? `<g transform="scale(0.78)">${drawProp(word)}</g>` : ''}`;
    layer.appendChild(g);
    const b = { g, word, x, y, vy, phase: Math.random() * 6, alive: true, x0: x, kick: 0 };
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); onTap?.(b); });
    balloons.add(b);
    return b;
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const b of balloons) {
      if (!b.alive) continue;
      b.y -= b.vy * dt * speed; b.phase += dt * 1.6;
      b.kick *= 0.92;
      const x = b.x0 + Math.sin(b.phase) * 28 + b.kick;
      if (b.y < -260) { b.y = 1150; } // חוזר מלמטה – אף פעם לא "מפספסים"
      b.g.setAttribute('transform', `translate(${x.toFixed(1)},${b.y.toFixed(1)}) rotate(${(Math.sin(b.phase) * 6).toFixed(1)})`);
      b.cx = x;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  let onTap = null;
  function pop(b) {
    if (!b.alive) return;
    b.alive = false; popSound();
    const r = b.g.getBoundingClientRect();
    fun.burst(r.left + r.width / 2, r.top + r.height * 0.4, 26);
    b.g.animate([{ transform: b.g.getAttribute('transform') + ' scale(1)', opacity: 1 }, { transform: b.g.getAttribute('transform') + ' scale(1.5)', opacity: 0 }], { duration: 160, fill: 'forwards' });
    setTimeout(() => { b.g.remove(); balloons.delete(b); }, 180);
  }
  const clear = () => { for (const b of balloons) { b.g.remove(); } balloons.clear(); };

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf); clear();
    for (const p of players) P.endSession(p.id);
    fun.destroy(); st.destroy();
    onDone?.({ early, overTime: false });
  }

  try {
    const seen = players.some((p) => (store.interests(p.id).balloons || 0) > 0);
    mika.anim('wave', 900);
    // הדגמה: בלון אחד עולה, ומיקה מסבירה
    if (!seen) await st.say('mika', LINES.intro, 'he');
    const words = planWords(players);
    let firstRound = !seen;
    for (let i = 0; i < words.length; i++) {
      const kid = sisters ? players[i % players.length] : players[0];
      const younger = kid.track === 'younger';
      if (sisters) { setTurn(kid.id); await st.say('mika', BANDL.mika.turnOf(kid.name), 'he'); }
      const target = words[i];
      const n = younger ? (i < 2 ? 2 : 3) : 4;
      const pool = shuffle(words.filter((w) => w !== target)).slice(0, n - 1);
      const set = shuffle([target, ...pool]);
      speed = younger ? 0.75 : 1.1;
      const span = 820 / set.length;
      const bs = set.map((w, k) => makeBalloon(w, 380 + span * (k + 0.5), { y: 980 + (k % 2) * 90, vy: 60 + Math.random() * 20 }));
      speed = 4; await st.wait(700); speed = younger ? 0.75 : 1.1; // הבלונים ממריאים לגובה העיניים
      P.exposed(kid.id, target, 'balloons');
      let wrongs = 0; let help = 0; let asked = false;
      const tb = bs.find((b) => b.word === target);
            // מקשיבים לנגיעות כבר מעכשיו – גם נגיעה בזמן שמיקה אומרת את המילה נחשבת
      const doneP = new Promise((resolve) => {
        const stops = [];
        if (firstRound) stops.push(st.timer(1600, () => { st.hand(tb.g, { taps: 3 }).catch(() => {}); }));
        stops.push(st.timer(7000, () => { help = 1; st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { slow: true }).catch(() => {}); }));
        stops.push(st.timer(13000, () => { help = 2; st.say('mika', LINES.tapIt, 'he').catch(() => {}); tb.g.classList.add('glow'); }));
        onTap = (b) => {
          if (b.word === target) { stops.forEach((s) => s()); onTap = null; resolve(); return; }
          // בלון אחר: קופץ הצידה, בום, ומיקה אומרת שוב
          sfx.boing(); b.kick = (Math.random() < 0.5 ? -1 : 1) * 90;
          if (!asked) return;
          wrongs++;
          st.say('mika', `${cap(VOCAB[target].en)}!`, 'en').catch(() => {});
        };
      });
      await Promise.race([st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { prompt: true }).catch(() => {}), doneP]);
      asked = true;
      await doneP;
      firstRound = false;
      pop(tb);
      P.choice(kid.id, target, { correct: wrongs === 0, help, distractor: 'real', context: 'balloons' });
      if (wrongs) P.choice(kid.id, target, { correct: true, help: Math.max(1, help), context: 'balloons' });
      store.bumpInterest(kid.id, 'balloons');
      toto.anim('hop', 600); mika.anim('hop', 600);
      await st.wait(500);
      await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en');
      // שאר הבלונים עפים למעלה מהר
      speed = 6; await st.wait(700); clear(); speed = 1;
      await st.wait(300);
    }
    setTurn(null);

    // מטר בלונים חופשי – כמה שרוצים, 12 שניות
    await st.say('mika', sisters ? LINES.freeSis : LINES.free, 'he');
    onTap = (b) => { pop(b); toto.anim('bounce', 300); };
    const end = Date.now() + 12000;
    while (Date.now() < end) {
      if ([...balloons].filter((b) => b.alive).length < 9) makeBalloon(null, 300 + Math.random() * 1000, { vy: 120 + Math.random() * 120, y: 1150 });
      speed = 1;
      await st.wait(260);
    }
    onTap = null; speed = 5; await st.wait(800); clear();
    await fun.finale();
    await st.say('mika', sisters ? LINES.byeSis : LINES.bye, 'he');
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}

function planWords(players) {
  const met = [...new Set(players.flatMap((p) => Object.keys(P.allItems(p.id)).filter((id) => VOCAB[id]?.group && VOCAB[id]?.art !== undefined && P.stage(p.id, id) > 0)))];
  const pool = [...new Set([...met, ...BASE])].filter((w) => VOCAB[w]);
  return shuffle(pool).slice(0, 6);
}
