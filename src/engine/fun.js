// שכבת "כיף" משותפת לכל המשחקים: צנצנת כוכבים שמתמלאת, קונפטי בכל הצלחה, מוזיקת רקע עליזה
// שמתרככת כשמישהו מדבר, וחגיגה גדולה בסוף. לא דורשת הקלטות חדשות.
import { onSpeak, audioContext, sfx } from './voice.js';
import { onProgress } from './progress.js';
import { store } from './store.js';

const COLORS = ['#FF4F8B', '#FFD23F', '#22D3A6', '#4FA3FF', '#8B5CF6', '#FF8C42'];
const STAR = (c = '#FFD23F') => `<svg viewBox="-50 -50 100 100"><path d="M0,-44 L12,-14 L44,-12 L19,8 L28,40 L0,22 L-28,40 L-19,8 L-44,-12 L-12,-14Z" fill="${c}" stroke="#2A1A5E" stroke-width="6" stroke-linejoin="round"/></svg>`;
const reduced = () => store.settings().reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createFun(root, { music = true } = {}) {
  const layer = document.createElement('div'); layer.className = 'fun-layer';
  const jar = document.createElement('div'); jar.className = 'star-jar';
  jar.innerHTML = `<div class="jar-star">${STAR()}</div><span class="jar-count">0</span>`;
  root.appendChild(layer); root.appendChild(jar);
  let stars = 0; let alive = true;
  let last = { x: innerWidth / 2, y: innerHeight / 2 };
  const track = (e) => { last = { x: e.clientX, y: e.clientY }; };
  root.addEventListener('pointerdown', track, true);

  function piece(x, y, { dx, dy, rot, dur, size, color, shape }) {
    const d = document.createElement('i');
    d.className = `confetti ${shape}`;
    d.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${shape === 'strip' ? size * 0.45 : size}px;background:${color}`;
    layer.appendChild(d);
    const a = d.animate([
      { transform: 'translate(-50%,-50%) rotate(0deg) scale(.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) rotate(${rot * 0.6}deg) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 160}px)) rotate(${rot}deg) scale(.9)`, opacity: 0 },
    ], { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)' });
    a.onfinish = () => d.remove();
  }

  function burst(x, y, n = 22) {
    if (reduced()) n = 6;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2; const sp = 90 + Math.random() * 170;
      piece(x, y, { dx: Math.cos(ang) * sp, dy: Math.sin(ang) * sp - 60, rot: (Math.random() - 0.5) * 720, dur: 900 + Math.random() * 500,
        size: 10 + Math.random() * 12, color: COLORS[i % COLORS.length], shape: ['dot', 'strip', 'sq'][i % 3] });
    }
  }

  function flyStar(x, y) {
    const s = document.createElement('div'); s.className = 'fly-star'; s.innerHTML = STAR();
    s.style.left = `${x}px`; s.style.top = `${y}px`;
    layer.appendChild(s);
    const jr = jar.getBoundingClientRect();
    const tx = jr.left + jr.width * 0.36 - x; const ty = jr.top + jr.height / 2 - y;
    const a = s.animate([
      { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)' },
      { transform: 'translate(-50%,-50%) scale(1.5) rotate(90deg)', offset: 0.25 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(.5) rotate(360deg)` },
    ], { duration: reduced() ? 300 : 900, easing: 'cubic-bezier(.5,0,.3,1)' });
    a.onfinish = () => {
      s.remove(); if (!alive) return;
      stars++;
      jar.querySelector('.jar-count').textContent = String(stars);
      jar.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35) rotate(-6deg)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      ding(stars);
    };
  }

  function ding(n) {
    const ac = audioContext(); if (!ac || window.__FAST || store.settings().sfx === false) return;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const f = 784 * Math.pow(2, scale[Math.min(n - 1, scale.length - 1)] / 12);
    [0, 0.07].forEach((d, i) => {
      const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'triangle';
      o.frequency.value = f * (i ? 1.5 : 1);
      const t = ac.currentTime + d;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.4);
    });
  }

  /** הצלחה: קונפטי במקום הנגיעה, כוכב שעף לצנצנת וצליל שעולה עם כל כוכב */
  function win(x = last.x, y = last.y) {
    if (!alive) return;
    burst(x, y); flyStar(x, y);
  }

  const offP = onProgress((e) => { if (e.type === 'choice' && e.correct) win(); });

  // ---- מוזיקת רקע: לופ פנטטוני רך, מתרכך כשמדברים ----
  let mus = null;
  if (music && !window.__FAST && store.settings().music !== false) mus = backgroundMusic();
  const offS = onSpeak((e) => { if (!mus) return; if (e.type === 'start') mus.duck(true); if (e.type === 'end') mus.duck(false); });

  return {
    win, burst,
    get stars() { return stars; },
    /** חגיגת סיום: גשם קונפטי, הצנצנת באמצע המסך, תרועה */
    async finale() {
      if (!alive) return;
      mus?.duck(true);
      fanfare();
      const n = reduced() ? 20 : 90;
      for (let i = 0; i < n; i++) {
        setTimeout(() => alive && piece(Math.random() * innerWidth, -20, { dx: (Math.random() - 0.5) * 160, dy: innerHeight * (0.6 + Math.random() * 0.4), rot: (Math.random() - 0.5) * 900,
          dur: 1800 + Math.random() * 1200, size: 12 + Math.random() * 14, color: COLORS[i % COLORS.length], shape: ['dot', 'strip', 'sq'][i % 3] }), Math.random() * 900);
      }
      if (stars > 0) {
        jar.classList.add('big');
        await new Promise((r) => setTimeout(r, 2400));
        jar.classList.remove('big');
      } else await new Promise((r) => setTimeout(r, 1600));
    },
    destroy() {
      alive = false; offP(); offS(); mus?.stop();
      root.removeEventListener('pointerdown', track, true);
      layer.remove(); jar.remove();
    },
  };
}

function fanfare() {
  const ac = audioContext(); if (!ac || window.__FAST || store.settings().sfx === false) return;
  const notes = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38], [784, 0.56], [1047, 0.68]];
  for (const [f, d] of notes) {
    const t = ac.currentTime + d;
    for (const [type, mul, vol] of [['triangle', 1, 0.14], ['sine', 2, 0.04]]) {
      const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (d === 0.68 ? 0.9 : 0.3));
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1);
    }
  }
  sfx.sparkle();
}

function backgroundMusic() {
  const ac = audioContext(); if (!ac) return null;
  const master = ac.createGain(); master.gain.value = 0.0001; master.connect(ac.destination);
  const LOUD = 0.09; const SOFT = 0.025;
  master.gain.exponentialRampToValueAtTime(LOUD, ac.currentTime + 2);
  const bpm = 108; const eighth = 60 / bpm / 2;
  // C – G – Am – F, ארפג'ו עליז ובס קופצני
  const chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]];
  const pattern = [0, 1, 2, 1, 2, 1, 0, 2];
  let step = 0; let next = ac.currentTime + 0.1; let stopped = false;
  function note(f, t, dur, type, vol) {
    const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  const tick = () => {
    if (stopped) return;
    while (next < ac.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 4; const i = step % 8; const ch = chords[bar];
      note(ch[pattern[i]] * 2, next, eighth * 0.9, 'triangle', 0.5);
      if (i % 4 === 0) note(ch[0] / 2, next, eighth * 1.6, 'sine', 0.9);
      if (i % 4 === 2) note(ch[0] / 2 * 1.5, next, eighth * 0.8, 'sine', 0.5);
      if (i % 2 === 1) { // שייקר עדין
        const len = 0.04; const b = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate); const d = b.getChannelData(0);
        for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
        const s = ac.createBufferSource(); s.buffer = b; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
        const g = ac.createGain(); g.gain.value = 0.25; s.connect(hp).connect(g).connect(master); s.start(next);
      }
      next += eighth; step++;
    }
  };
  const timer = setInterval(tick, 60); tick();
  return {
    duck(on) { if (stopped) return; const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t); master.gain.exponentialRampToValueAtTime(on ? SOFT : LOUD, t + (on ? 0.15 : 0.8)); },
    stop() { stopped = true; clearInterval(timer); const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t); master.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); setTimeout(() => master.disconnect(), 600); },
  };
}
