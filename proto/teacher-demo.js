// אב-טיפוס: מיקה המורה מלמדת את שייה ואלמה. מצב רגיל = חי (מגע, כפתורים, קול).
// ?render=1 → בלי כפתורים, window.renderAt(t) מצייר פריים לפי זמן (להפקת סרטון).
import { teacher, card } from '../src/art/teacher.js';
import { createTeacher } from '../src/engine/teacher.js';

const INK = '#2A1A5E';
const RENDER = new URLSearchParams(location.search).has('render');
if (RENDER) document.body.classList.add('render');
const svg = document.getElementById('stage');

const TX = 760, TY = 930, TS = 0.98;
svg.innerHTML = `
  <defs>
    <pattern id="dots" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="22" cy="22" r="3" fill="#fff" opacity=".35"/></pattern>
    <radialGradient id="spot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".85"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="#8FD3F4"/>
  <rect width="1600" height="1000" fill="url(#dots)"/>
  <path d="M0,70 Q400,150 800,80 T1600,90" fill="none" stroke="${INK}" stroke-width="3"/>
  ${[...Array(15)].map((_, i) => { const x = 50 + i * 108, y = 92 + Math.sin(i * 1.1) * 18; const c = ['#FF4F8B', '#FFD23F', '#3FC1A5', '#7B5CFF', '#FF6B3D'][i % 5]; return `<path d="M${x - 24},${y} L${x + 24},${y} L${x},${y + 46} Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; }).join('')}
  <!-- לוח -->
  <g transform="translate(1250,470)">
    <rect x="-170" y="-200" width="340" height="300" rx="18" fill="#3E6B5A" stroke="#8A5A3B" stroke-width="18"/>
    <rect x="-170" y="-200" width="340" height="300" rx="18" fill="none" stroke="${INK}" stroke-width="4"/>
    <text x="0" y="-150" font-size="34" text-anchor="middle" fill="#fff" font-family="Fredoka, sans-serif" font-weight="600" style="direction:ltr;unicode-bidi:embed">English!</text>
    <path d="M-150,110 L-180,440 M150,110 L180,440" stroke="#8A5A3B" stroke-width="18" stroke-linecap="round"/>
    <g id="card" transform="translate(0,-20) scale(0)">${card('🍎', 'apple')}</g>
  </g>
  <rect x="0" y="860" width="1600" height="140" fill="#F7A65A"/>
  <path d="M0,860 H1600" stroke="${INK}" stroke-width="4"/>
  ${[...Array(9)].map((_, i) => `<path d="M${i * 200},880 h120 M${i * 200 + 80},930 h120 M${i * 200 + 20},975 h120" stroke="#E08A3E" stroke-width="5" stroke-linecap="round"/>`).join('')}
  <ellipse cx="${TX}" cy="${TY - 10}" rx="330" ry="60" fill="url(#spot)"/>
  <g transform="translate(${TX},${TY}) scale(${TS})" id="mika">${teacher()}</g>
  <!-- הילדות: שייה משמאל, אלמה מימין -->
  ${[['shaya', 'שייה', 150, '#FFB3C7', '🧸'], ['alma', 'אלמה', 1450, '#B8A6FF', '🦄']].map(([id, name, x, c, e]) => `
  <g class="kid" id="kid-${id}" style="transform-origin:${x}px 880px">
    <circle class="ring" cx="${x}" cy="880" r="96" fill="none" stroke="#FFD23F" stroke-width="12"/>
    <circle cx="${x}" cy="880" r="82" fill="${c}" stroke="${INK}" stroke-width="5"/>
    <text x="${x}" y="872" font-size="64" text-anchor="middle" dominant-baseline="middle">${e}</text>
    <rect x="${x - 70}" y="928" width="140" height="48" rx="24" fill="#fffaf0" stroke="${INK}" stroke-width="4"/>
    <text x="${x}" y="961" font-size="30" text-anchor="middle" fill="${INK}" font-family="Rubik, sans-serif" font-weight="700">${name}</text>
  </g>`).join('')}
`;

const T = createTeacher(svg.querySelector('#mika'));
const cardEl = svg.querySelector('#card');
const kid = { shaya: svg.querySelector('#kid-shaya'), alma: svg.querySelector('#kid-alma') };

// ---------- הקווים המוקלטים: נחתכים מתוך חבילות הקול הקיימות ----------
const LINES = await (await fetch('teacher-lines.json')).json();
const bundles = {};
async function lineAudio(id) {
  const L = LINES[id];
  if (!L.url) {
    bundles[L.bundle] ||= fetch(`../assets/voice/b/${L.bundle}`).then((r) => r.arrayBuffer());
    const buf = await bundles[L.bundle];
    L.url = URL.createObjectURL(new Blob([buf.slice(L.offset, L.offset + L.length)], { type: 'audio/mpeg' }));
  }
  return L.url;
}

// ---------- התסריט: מה מיקה עושה ומתי (שניות) ----------
const SCRIPT = [
  [0.0, () => { T.pose('rest', 0); T.expr('happy', 0); }],
  [0.4, (t) => { T.pose('wave', t, 0.5); T.expr('warm', t); }],
  [1.2, (t) => say('a', t)],
  [1.35, (t) => { T.turn(-1, t, 0.45); T.gaze(-1, 0.25, t); T.lean(-0.4, t); on('shaya'); }],
  [2.2, (t) => { T.turn(1, t, 0.5); T.gaze(1, 0.25, t); T.lean(0.4, t); on('alma'); }],
  [3.3, (t) => { T.pose('present', t, 0.5); T.turn(0, t); T.gaze(0, 0, t); T.lean(0, t); on(null); T.expr('happy', t); }],
  [5.2, (t) => { T.pose('point', t, 0.5); T.turn(0.7, t); T.gaze(1, -0.4, t); T.expr('curious', t); showCard(t); }],
  [6.0, (t) => say('b', t)],
  [6.5, (t) => { T.turn(0.15, t, 0.6); T.gaze(0, 0, t); }],
  [8.5, (t) => { T.pose('present', t, 0.5); T.turn(0, t); T.expr('happy', t); }],
  [9.0, (t) => say('c', t)],
  [9.9, (t) => { T.pose('chest', t, 0.4); T.expr('warm', t); }],
  [11.5, (t) => { T.pose('present', t, 0.45); }],
  [13.2, (t) => { T.pose('listen', t, 0.5); T.expr('curious', t); T.turn(-0.8, t); T.gaze(-1, 0.3, t); T.lean(-0.6, t); on('shaya'); }],
  [15.0, (t) => { T.pose('cheer', t, 0.35); T.expr('proud', t); T.turn(0, t); T.gaze(0, 0, t); T.lean(0, t); }],
  [15.9, (t) => { T.pose('clap', t, 0.3); }],
  [17.0, (t) => { T.pose('rest', t, 0.6); T.expr('happy', t); on(null); }],
];
export const DEMO_LENGTH = 18;
const LINE_AT = SCRIPT.filter(([, f]) => /say\('/.test(String(f))).map(([t, f]) => [t, String(f).match(/say\('(\w)'/)[1]]);

let cardShownAt = Infinity;
function showCard(t) { cardShownAt = t; }
function drawCard(t) {
  const k = Math.max(0, Math.min(1, (t - cardShownAt) / 0.45));
  const s = k === 0 ? 0 : 1 + Math.sin(k * Math.PI) * 0.18 * (1 - k) + (k < 1 ? (k - 1) * 0.6 : 0);
  cardEl.setAttribute('transform', `translate(0,-20) scale(${Math.max(0, s)}) rotate(${(1 - k) * -14})`);
}
function on(id) { for (const [k, el] of Object.entries(kid)) el.classList.toggle('on', k === id); }

let audioOn = false;
function say(id, t) {
  const L = LINES[id];
  T.speak(L.track, L.dur, t);
  if (audioOn) lineAudio(id).then((u) => { const a = new Audio(u); a.play().catch(() => {}); });
}

// מצב הפקה: כל פריים מחושב מאפס לפי הזמן
if (RENDER) {
  window.renderAt = (t) => {
    // מריצים מחדש את כל אירועי התסריט עד הזמן t (פונקציות טהורות של זמן)
    cardShownAt = Infinity;
    for (const [at, f] of SCRIPT) if (at <= t) f(at);
    drawCard(t); T.render(t);
  };
  window.LINE_AT = LINE_AT;
  window.LINES = LINES;
  window.renderAt(0);
  window.READY = true;
} else {
  // מצב חי
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  let queue = [];
  const loop = () => {
    const t = now();
    while (queue.length && queue[0][0] <= t) { const [at, f] = queue.shift(); f(at); }
    drawCard(t); T.render(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const bar = document.querySelector('.bar');
  bar.addEventListener('pointerup', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    audioOn = true;
    const t = now();
    if (b.dataset.act === 'demo') {
      cardShownAt = Infinity;
      for (const id of Object.keys(LINES)) await lineAudio(id);
      queue = SCRIPT.map(([at, f]) => [t + at + 0.05, f]);
    } else if (b.dataset.line) {
      await lineAudio(b.dataset.line);
      T.pose(b.dataset.line === 'b' ? 'point' : 'present', t); T.turn(0, t); T.gaze(0, 0, t);
      if (b.dataset.line === 'b') showCard(t);
      say(b.dataset.line, now());
      setTimeout(() => T.pose('rest', now(), 0.6), LINES[b.dataset.line].dur * 1000 + 400);
    } else if (b.dataset.pose) {
      T.pose(b.dataset.pose, t, 0.4);
      T.expr(b.dataset.pose === 'cheer' || b.dataset.pose === 'clap' ? 'proud' : b.dataset.pose === 'think' || b.dataset.pose === 'listen' ? 'curious' : 'warm', t);
      setTimeout(() => { T.pose('rest', now(), 0.6); T.expr('happy', now()); }, 2200);
    }
  });
  // מגע על הבמה: מיקה מסתכלת ופונה לשם
  svg.addEventListener('pointerdown', (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const dx = (p.x - TX) / 700, dy = (p.y - (TY - 600 * TS)) / 400;
    const t = now();
    T.gaze(Math.max(-1, Math.min(1, dx * 2)), Math.max(-1, Math.min(1, dy)), t);
    T.turn(Math.max(-1, Math.min(1, dx * 1.4)), t, 0.4);
    T.expr('curious', t, 0.2);
    clearTimeout(svg._back);
    svg._back = setTimeout(() => { T.turn(0, now(), 0.6); T.gaze(0, 0, now(), 0.3); T.expr('happy', now()); }, 1800);
  });
}
