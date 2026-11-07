// מסך הבית: "הסטודיו של שייה ואלמה" – עולם חי, לא רשימת שיעורים.
import { createStage, Abort } from '../engine/stage.js';
import { studioSet, cafeBooth, bandBooth, sillyBooth, karaokeBooth, balloonBunch, coveredSet, ICONS } from '../art/sets.js';
import { LINES as KL } from '../content/karaoke.js';
import { LINES as BL } from '../content/balloons.js';
import { LINES as FL } from '../content/feed.js';
import { SYMBOLS, prop as drawProp } from '../art/puppets.js';
import { LINES as AL } from '../content/animals.js';
import { LINES as RL } from '../content/rainbow.js';
import { LINES as CL } from '../content/count.js';
import { L as LL } from '../content/lesson.js';
import { sfx, unlockAudio, say as voiceSay, audioReady, stopSpeech } from '../engine/voice.js';
// במסכי הבחירה: משפט חדש מחליף את הקודם, כדי שקולות לא ייכנסו אחד בשני
const say = (...a) => { stopSpeech(); return voiceSay(...a); };
import { store } from '../engine/store.js';
import { isPlayable } from '../content/season.js';
import { puppetAvailable, startCapture, playAsToto } from '../engine/puppet.js';
import { VOCAB, isFood } from '../content/vocab.js';
import * as P from '../engine/progress.js';

const NS = 'http://www.w3.org/2000/svg';
const symSvg = (p, size = 120) => `<svg viewBox="-60 -60 120 120" width="${size}" height="${size}">${SYMBOLS[p.symbol || 'star'].draw(p.color)}</svg>`;

/** מי משחקת? – כרטיסים גדולים, בלי תלות בקריאה */
export function whoScreen(root, { onPick, onParents }) {
  const ps = store.profiles();
  root.innerHTML = `
  <div class="who">
    <div class="who-title"><span>הסטודיו של שייה ואלמה</span></div>
    <div class="who-cards">
      ${ps.map((p) => `<button class="who-card" data-id="${p.id}" style="--c:${p.color}">
        <div class="who-sym">${p.symbol ? symSvg(p, 150) : '<svg viewBox="-60 -60 120 120" width="150" height="150"><circle r="50" fill="none" stroke="#2A1A5E" stroke-width="5" stroke-dasharray="10 9"/><text y="18" text-anchor="middle" font-size="54" fill="#2A1A5E">?</text></svg>'}</div>
        <div class="who-name">${esc(p.name)}</div></button>`).join('')}
      <button class="who-card together" data-id="together">
        <div class="who-sym two">${ps.map((p) => symSvg(p, 100)).join('')}</div>
        <div class="who-name">ביחד</div></button>
    </div>
    <button class="parent-door" aria-label="אזור הורים"><svg viewBox="-50 -50 100 100" width="44" height="44"><circle r="14" fill="none" stroke="#2A1A5E" stroke-width="7"/><g stroke="#2A1A5E" stroke-width="9" stroke-linecap="round">${[0, 45, 90, 135].map((a) => `<path d="M0,-34 V-26" transform="rotate(${a})"/><path d="M0,34 V26" transform="rotate(${a})"/>`).join('')}</g></svg></button>
  </div>`;
  root.querySelectorAll('.who-card').forEach((b) => b.addEventListener('pointerup', () => {
    unlockAudio(); sfx.pop();
    const id = b.dataset.id;
    if (id === 'together') {
      const missing = ps.find((p) => !p.symbol);
      if (missing) return symbolScreen(root, missing, () => whoScreen(root, { onPick, onParents }));
      say('mika', 'שייה ואלמה ביחד!', 'he');
      return onPick(ps);
    }
    const p = store.profile(id);
    if (!p.symbol) return symbolScreen(root, p, () => onPick([store.profile(id)]));
    say('mika', p.name, 'he');
    onPick([p]);
  }));
  root.querySelector('.parent-door').addEventListener('pointerup', onParents);
  // אם הקול כבר פתוח (חזרה מהסטודיו) – מיקה שואלת בקול מי משחקת
  if (audioReady()) say('mika', 'מי משחקת עכשיו? נוגעים בסמל שלך.', 'he');
}

/** בחירת סמל אישי – הרגע הראשון של "פותחות את הסטודיו" */
export function symbolScreen(root, p, done) {
  const taken = store.profiles().filter((x) => x.id !== p.id).map((x) => x.symbol);
  root.innerHTML = `<div class="symbols"><div class="sym-grid">
    ${Object.entries(SYMBOLS).map(([k, s]) => `<button class="sym-btn" data-k="${k}" ${taken.includes(k) ? 'disabled' : ''} aria-label="${s.he}">
      <svg viewBox="-60 -60 120 120">${s.draw(p.color)}</svg></button>`).join('')}
  </div></div>`;
  say('mika', `${p.name}, בחרי סמל שיהיה שלך.`, 'he');
  root.querySelectorAll('.sym-btn').forEach((b) => b.addEventListener('pointerup', async () => {
    if (b.disabled) return;
    sfx.sparkle();
    store.updateProfile(p.id, { symbol: b.dataset.k });
    root.querySelectorAll('.sym-btn').forEach((x) => x.classList.toggle('chosen', x === b));
    await say('mika', `${SYMBOLS[b.dataset.k].he}. זה הסמל של ${p.name}.`, 'he');
    done();
  }));
}

/** העולם: הסטודיו עם הדוכנים, הדמויות והיצירות */
const TOUR = {
  cafe: 'בית הקפה: מגישים לאורחים אוכל, באנגלית.',
  band: 'הלהקה: מנגנים, עוצרים ושרים, באנגלית.',
  silly: 'טוטו טועה: טוטו אומר מילה, ומחליטים אם הוא צודק.',
  karaoke: KL.tour,
  balloons: BL.tour,
  feed: FL.tour,
  animals: AL.tour,
  rainbow: RL.tour,
  count: CL.tour,
  lesson: LL.tour,
  mic: 'ובמיקרופון: מדברים, וטוטו אומר את זה בקול שלו.',
};
const ENTER = { cafe: 'נכנסים לבית הקפה!', band: 'נכנסים ללהקה!', silly: 'נכנסים לטוטו טועה!', karaoke: KL.enter, balloons: BL.enter, feed: FL.enter, animals: AL.enter, rainbow: RL.enter, count: CL.enter, lesson: LL.enter };

/** הדלת לשיעור של מיקה: לוח קטן עם אותיות, כומתה סגולה וכוכב */
function lessonBoard() {
  return `<g class="lesson-board">
    <path d="M-90,120 L-120,260 M90,120 L120,260" stroke="#9A6038" stroke-width="14" stroke-linecap="round"/>
    <rect x="-150" y="-150" width="300" height="270" rx="22" fill="#3E6B5A" stroke="#9A6038" stroke-width="16"/>
    <rect x="-150" y="-150" width="300" height="270" rx="22" fill="none" stroke="#2A1A5E" stroke-width="4"/>
    <text x="0" y="-20" font-size="96" font-weight="700" text-anchor="middle" fill="#fff" font-family="Fredoka, Rubik, sans-serif" style="direction:ltr">ABC</text>
    <path d="M-90,40 q30,-18 60,0 t60,0 t60,0" fill="none" stroke="#FFD23F" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="-40" cy="-160" rx="110" ry="32" fill="#7B5CFF" stroke="#2A1A5E" stroke-width="5" transform="rotate(-10 -40 -160)"/>
    <path d="M116,-150 l10,22 l24,2 l-18,16 l6,24 l-22,-13 l-22,13 l6,-24 l-18,-16 l24,-2 Z" fill="#FFD23F" stroke="#2A1A5E" stroke-width="4" stroke-linejoin="round"/>
  </g>`;
}

export function homeScreen(root, { players, onPlay, onBack, onParents, rest = false }) {
  const sisters = players.length > 1;
  const owner = sisters ? 'sisters' : players[0].id;
  const menu = store.creation(owner, 'cafe');
  root.innerHTML = `<div class="stage home ${rest ? 'rest' : ''}"></div>
    <div class="hud home-hud">
      <button class="hud-btn hud-back" aria-label="החלפת ילדה">${players.map((p) => symSvg(p, 56)).join('')}</button>
      <div class="studio-sign" aria-hidden="true">הסטודיו של שייה ואלמה</div>
      <button class="hud-btn puppet-btn" aria-label="לדבר בקול של טוטו" hidden><svg viewBox="-50 -50 100 100"><rect x="-14" y="-32" width="28" height="44" rx="14" fill="#FF8C42" stroke="#2A1A5E" stroke-width="5"/><path d="M-24,2 C-24,26 24,26 24,2 M0,22 V34" fill="none" stroke="#2A1A5E" stroke-width="5" stroke-linecap="round"/></svg><span class="rec-dot"></span></button>
      <button class="hud-btn parent-door small" aria-label="אזור הורים"><svg viewBox="-50 -50 100 100" width="34" height="34"><circle r="14" fill="none" stroke="#2A1A5E" stroke-width="7"/><g stroke="#2A1A5E" stroke-width="9" stroke-linecap="round">${[0, 45, 90, 135].map((a) => `<path d="M0,-34 V-26" transform="rotate(${a})"/><path d="M0,34 V26" transform="rotate(${a})"/>`).join('')}</g></svg></button>
    </div>`;
  const hour = new Date().getHours();
  const phase = hour >= 19 || hour < 6 ? 'night' : hour >= 17 ? 'evening' : 'day';
  const grand = !sessionStorage.getItem('studio-entered'); sessionStorage.setItem('studio-entered', '1');
  const st = createStage(root.querySelector('.stage'), { bg: studioSet(phase), entry: grand ? 'grand' : 'settle' });
  const booth = g(st.layers.back, cafeBooth(menu), 500, 790);
  booth.setAttribute('transform', 'translate(500,790) scale(0.9)');
  booth.classList.add('tappable', 'cafe-door');
  // רק משחקים שאפשר לשחק בהם עכשיו מופיעים כדוכנים. מקומות שעוד בונים לא מוצגים, כדי לא לבלבל.
  const sets = [
    { id: 'band', tag: 'music', x: 905, scale: 0.84, html: () => bandBooth(store.creation(owner, 'band')) },
    { id: 'karaoke', tag: 'music', x: 1185, scale: 0.74, html: () => karaokeBooth(), always: true },
    { id: 'silly', tag: 'animals', x: 1420, scale: 0.68, html: () => sillyBooth(), always: true },
    { id: 'animals', tag: 'animals', x: 700, y: 330, scale: 0.85, html: () => animalCloud(), always: true },
    { id: 'count', tag: 'play', x: 1060, y: 985, scale: 0.66, html: () => countBlocks(), always: true, front: true },
    { id: 'rainbow', tag: 'play', x: 1300, y: 380, scale: 0.62, html: () => rainbowDoor(), always: true },
    { id: 'balloons', tag: 'play', x: 1060, y: 420, scale: 0.8, html: () => balloonBunch(), always: true },
    { id: 'lesson', tag: 'lesson', x: 250, y: 600, scale: 0.62, html: () => lessonBoard(), always: true },
  ].filter((s) => s.always || isPlayable(s.id)).map((s) => { const y = s.y || 790; const el = g(st.layers.back, s.html(), s.x, y); el.classList.add(`${s.id}-door`, 'tappable'); el.setAttribute('transform', `translate(${s.x},${y}) scale(${s.scale || 1})`); return { ...s, el }; });

  // מיקה בצד שמאל של הרצפה, כדי שלא תסתיר את דוכן הלהקה; בום בין בית הקפה ללהקה
  const mika = st.addActor('mika', 205, 965, { scale: 0.8 });
  const toto = st.addActor('toto', 1250, 960, { scale: 0.62, flip: true });
  const bum = st.addActor('bum', 655, 985, { scale: 0.58 });
  if (rest) { [mika, toto, bum].forEach((a) => a.mood('sleep')); }
  [...st.layers.back.children, ...st.layers.actors.children].forEach((el, i) => el.style.setProperty('--i', i));
  const wall = wordWall(st, players, owner);
  const friends = friendsVisit(st, owner);

  let leaving = false;
  // נכנסים למשחק: מיקה אומרת בקול לאן נכנסים, ואז המצלמה עפה פנימה
  const go = async (place, x, y, el) => {
    if (leaving) return; leaving = true;
    el?.classList.add('chosen-door');
    st.hush();
    const enter = st.say('mika', ENTER[place], 'he').catch(() => {});
    st.closeSpeech(); // ברכות וסיור שעוד ממתינים לא ימשיכו לדבר מעל המשחק
    await enter;
    if (!st.alive) return;
    await st.flyTo(x, y);
    if (!st.alive) return;
    st.destroy(); onPlay(place);
  };
  let busy = false;
  const once = async (fn) => { if (busy) return; busy = true; try { await fn(); } catch (e) { if (!(e instanceof Abort)) console.error(e); } busy = false; };
  const pids = players.map((p) => p.id);
  const bump = (tag) => pids.forEach((id) => store.bumpInterest(id, tag));

  // ברכה קצרה; אם יש יצירה – העולם זוכר
  once(async () => {
    await st.wait(grand ? 1700 : 500);
    if (rest) { await st.say('mika', 'הסטודיו נח עכשיו. נתראה בפעם הבאה.', 'he'); return; }
    mika.anim('wave', 1200);
    const now = new Date();
    if (now.getDay() === 5 && now.getHours() >= 12) await st.say('mika', 'שבת שלום!', 'he');
    else if (phase === 'night') await st.say('mika', 'ערב טוב! הכוכבים יצאו לסטודיו.', 'he');
    if (wall.fresh.length) await wall.celebrate();
    // לאחיות אין הקלטה של "בית הקפה שלכן מחכה" – מיקה מקבלת אותן בחזרה באנגלית (מוקלט)
    if (menu?.items?.length) await (sisters ? st.say('mika', 'Welcome back!', 'en') : st.say('mika', 'בית הקפה שלך מחכה. האורחים זוכרים את התפריט.', 'he'));
    else { await st.say('mika', 'Hello!', 'en'); await st.say('mika', 'נפתח בית קפה?', 'he'); }
    booth.classList.add('beckon');
    // סיור קצר: מיקה מראה ביד כל משחק ואומרת מה עושים בו. בשלושת הביקורים הראשונים – מלא, אחר כך שאלה אחת.
    const key = 'goal:home';
    const seen = Math.min(...pids.map((id) => store.interests(id)[key] || 0));
    pids.forEach((id) => store.bumpInterest(id, key));
    if (seen >= 3) { await st.say('mika', 'במה נשחק היום? נוגעים במשחק.', 'he'); return; }
    await st.say('mika', 'אלה המשחקים בסטודיו. נוגעים במשחק שרוצים.', 'he');
    const tour = [[booth, TOUR.cafe], ...sets.map((x) => [x.el, TOUR[x.id]])];
    for (const [el, line] of tour) { st.hand(el, { taps: 1 }); await st.say('mika', line, 'he'); }
    st.hand(bum.el, { taps: 1 }); await st.say('mika', TOUR.feed, 'he');
    const mic = root.querySelector('.puppet-btn');
    if (mic && !mic.hidden) { st.hand(mic, { taps: 1 }); await st.say('mika', TOUR.mic, 'he'); }
  });

  booth.addEventListener('pointerup', () => {
    if (rest) return once(() => st.say('mika', 'בית הקפה סגור לנוח. להתראות!', 'he'));
    sfx.bell(); bump('food');
    go('cafe', 500, 600, booth);
  });
  for (const s of sets) s.el.addEventListener('pointerup', () => {
    // מקום פתוח – נכנסים מיד, גם אם מיקה עוד מדברת
    if (!rest) { bump(s.tag); sfx.bell(); go(s.id, s.x, s.y ? s.y - 150 : 600, s.el); return; }
    once(async () => {
    bump(s.tag); sfx.boing();
    s.el.classList.remove('wiggle-set'); s.el.getBoundingClientRect(); s.el.classList.add('wiggle-set');
    if (!isPlayable(s.id)) { await st.say('mika', 'את המקום הזה עוד בונים בסטודיו.', 'he'); return; }
    if (rest) await st.say('mika', 'הלהקה נחה עכשיו. להתראות!', 'he');
    });
  });
  mika.el.addEventListener('pointerup', () => once(async () => { mika.anim('hop'); await st.say('mika', 'Hello!', 'en'); bump('people'); }));
  // נגיעה בטוטו פותחת את "טוטו טועה!" (במנוחה – רק נביחה)
  toto.el.classList.add('silly-door');
  toto.el.addEventListener('pointerup', () => {
    if (rest) return once(async () => { toto.anim('hop'); sfx.bark(); await st.say('toto', 'Woof! Hello!', 'en'); });
    toto.anim('hop'); sfx.bark(); bump('animals');
    go('silly', 1400, 600, toto.el);
  });
  // נגיעה בבום פותחת את "בום רעב" (במנוחה – רק תיפוף)
  let beat = 0;
  bum.el.classList.add('feed-door');
  bum.el.addEventListener('pointerup', () => {
    sfx.drum(beat++); bum.anim('bounce', 400); bump('food');
    if (!rest) go('feed', 655, 720, bum.el);
  });

  if (!rest && puppetAvailable()) setupPuppet(root, st, toto, pids);
  root.querySelector('.hud-back').addEventListener('pointerup', () => { st.destroy(); onBack(); });
  root.querySelector('.parent-door').addEventListener('pointerup', () => { st.destroy(); onParents(); });
  return st;
}

/** קוביות 1-2-3 על הרצפה – הדלת ל"סופרים" */
function countBlocks() {
  const B = [[-80, 0, '#FF4F8B', '1'], [80, 0, '#4FA3FF', '2'], [0, -150, '#FFD23F', '3']];
  return `<g class="booth count-blocks">${B.map(([x, y, c, t]) => `<g transform="translate(${x},${y})"><rect x="-72" y="-148" width="144" height="144" rx="20" fill="${c}" stroke="#2A1A5E" stroke-width="6"/>
    <rect x="-60" y="-136" width="120" height="120" rx="14" fill="none" stroke="#fff" stroke-width="4" opacity=".5"/>
    <text x="0" y="-38" text-anchor="middle" font-size="104" font-weight="700" fill="#fff" stroke="#2A1A5E" stroke-width="5" paint-order="stroke" font-family="Fredoka, sans-serif">${t}</text></g>`).join('')}</g>`;
}

/** קשת קטנה – הדלת ל"הקשת" */
function rainbowDoor() {
  const C = ['#F0323C', '#FF8C1A', '#FFD60A', '#2DBE4E', '#2F7BFF', '#9B4DFF'];
  return `<g class="booth rainbow-door">
    ${C.map((c, i) => { const r = 170 - i * 22; return `<path d="M${-r},0 A${r},${r} 0 0 1 ${r},0" fill="none" stroke="#2A1A5E" stroke-width="26"/><path d="M${-r},0 A${r},${r} 0 0 1 ${r},0" fill="none" stroke="${c}" stroke-width="19"/>`; }).join('')}
    <g fill="#fff" stroke="#2A1A5E" stroke-width="5"><ellipse cx="-150" cy="0" rx="62" ry="30"/><ellipse cx="150" cy="0" rx="62" ry="30"/></g>
  </g>`;
}

/** ענן חיות מרחף – הדלת ל"עולם החיות" */
function animalCloud() {
  return `<g class="booth animal-cloud">
    <g fill="#fff" stroke="#2A1A5E" stroke-width="5"><ellipse cx="0" cy="40" rx="190" ry="56"/><circle cx="-110" cy="20" r="50"/><circle cx="110" cy="22" r="46"/></g>
    <ellipse cx="0" cy="40" rx="186" ry="52" fill="#fff"/><circle cx="-110" cy="20" r="46" fill="#fff"/><circle cx="110" cy="22" r="42" fill="#fff"/>
    <g class="bob" style="--d:0s"><g transform="translate(-105,-30) scale(.85)">${drawProp('cow')}</g></g>
    <g class="bob" style="--d:.5s"><g transform="translate(0,-55) scale(.95)">${drawProp('lion')}</g></g>
    <g class="bob" style="--d:1s"><g transform="translate(105,-28) scale(.85)">${drawProp('duck')}</g></g>
  </g>`;
}

function g(parent, html, x, y) {
  const el = document.createElementNS(NS, 'g');
  el.setAttribute('transform', `translate(${x},${y})`);
  el.innerHTML = html; parent.appendChild(el); return el;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** "טוטו מדבר בקול שלי": מחזיקים – מדברים – משחררים, וטוטו אומר את זה בקול גור.
 *  טוטו מציג תמונה של מילה מוכרת ואומר אותה; לא בודקים ולא מנקדים את מה שנאמר. */
function setupPuppet(root, st, toto, pids) {
  const btn = root.querySelector('.puppet-btn');
  btn.hidden = false;
  // רק אוכל ושתייה: לטוטו יש הקלטות שלהם (ולא של חיות, צבעים ומספרים)
  const known = [...new Set(pids.flatMap((id) => Object.keys(P.allItems(id))))].filter((id) => isFood(id));
  const words = known.length ? known : ['banana', 'apple', 'water'];
  let i = 0; let shown = null; let cap = null; let busy = false;
  const showWord = async () => {
    shown?.remove();
    const w = words[i++ % words.length];
    shown = st.addProp(w, toto.x, toto.y - 330 * toto.scale, { scale: 0.7, layer: 'fx', id: `puppet-${w}`, tappable: false });
    await st.say('toto', `${VOCAB[w].en[0].toUpperCase()}${VOCAB[w].en.slice(1)}!`, 'en');
    btn.classList.add('beckon-btn');
  };
  // אפשר גם להחזיק וגם לגעת פעם אחת: נגיעה קצרה מקליטה כ־3 שניות (או עד נגיעה נוספת)
  let downAt = 0; let auto = null; let pressed = false;
  const down = async (e) => {
    e.preventDefault();
    if (cap && auto) { clearTimeout(auto); auto = null; downAt = 0; return finishRec(); }
    if (busy || cap) return;
    downAt = Date.now(); pressed = true;
    busy = true;
    try {
      if (!shown) { await st.say('mika', 'מחזיקים את המיקרופון לחוץ, אומרים את המילה, ועוזבים. טוטו יגיד אותה בקול שלך!', 'he'); await showWord(); busy = false; return; }
      cap = await startCapture({ onLevel: (v) => toto.el.style.setProperty('--listen', v) });
      btn.classList.add('listening'); btn.classList.remove('beckon-btn');
      toto.look('front');
      if (!pressed) auto = setTimeout(() => { auto = null; finishRec(); }, 3000); // כבר עזבה בזמן ההכנה – מקליטים 3 שניות
    } catch { cap = null; btn.hidden = true; } // אין הרשאה – פשוט לא מציגים
    busy = false;
  };
  const up = () => {
    pressed = false;
    if (!cap || auto) return;
    if (Date.now() - downAt < 450) { auto = setTimeout(() => { auto = null; finishRec(); }, 3000); return; }
    finishRec();
  };
  const finishRec = async () => {
    if (!cap) return;
    const c = cap; cap = null;
    btn.classList.remove('listening');
    const buf = await c.stop();
    if (!buf) return;
    busy = true;
    toto.anim('hop', 500);
    await playAsToto(buf); // ההקלטה נשמטת מהזיכרון כאן – לא נשמרת
    sfx.boing(); toto.anim('bounce', 600);
    pids.forEach((id) => store.bumpInterest(id, 'talk'));
    await st.wait(400);
    await showWord().catch(() => {});
    busy = false;
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
}

// ---------- קיר המילים: כל מילה שהבינה (שלב 2 ומעלה) היא מדבקה. נגיעה = מיקה אומרת אותה ----------
const WALL_ART = { go: 'go', stop: 'stop', fast: 'rabbit', slow: 'snail' };
function wordWall(st, players, owner) {
  const pids = players.map((p) => p.id);
  const ids = [...new Set(pids.flatMap((pid) => Object.keys(P.allItems(pid)).filter((id) => (VOCAB[id]?.art || WALL_ART[id]) && P.stage(pid, id) >= 2)))];
  const prev = store.creation(owner, 'wall')?.ids || [];
  const fresh = ids.filter((id) => !prev.includes(id));
  const shown = [...ids.filter((id) => prev.includes(id)), ...fresh].slice(-10);
  const board = g(st.layers.back, `<g class="word-wall">
    <rect x="-195" y="-108" width="390" height="216" rx="22" fill="#FFE7C2" stroke="#2A1A5E" stroke-width="5"/>
    <rect x="-181" y="-94" width="362" height="188" rx="14" fill="none" stroke="#E0B97A" stroke-width="3" stroke-dasharray="10 8"/>
    ${[[-175, -90], [175, -90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#FF4F8B" stroke="#2A1A5E" stroke-width="3"/>`).join('')}
    ${ids.length ? '' : '<g opacity=".35"><circle r="34" fill="none" stroke="#2A1A5E" stroke-width="4" stroke-dasharray="8 8"/></g>'}
  </g>`, 300, 262);
  if (!ids.length) board.style.display = 'none';
  const stickers = shown.map((id, i) => {
    const x = 300 - 150 + (i % 5) * 75; const y = 262 - 44 + Math.floor(i / 5) * 88;
    const p = st.addProp(WALL_ART[id] || VOCAB[id].art, x, y, { scale: 0.36, layer: 'back', id: `wall-${id}` });
    p.el.classList.add('sticker');
    if (fresh.includes(id)) p.el.style.opacity = '0';
    p.el.addEventListener('pointerup', () => {
      p.wiggle(); sfx.sticker();
      st.say('mika', `${VOCAB[id].en[0].toUpperCase()}${VOCAB[id].en.slice(1)}!`, 'en').catch(() => {});
      pids.forEach((pid) => P.exposed(pid, id, 'studio:wall'));
    });
    return { id, p };
  });
  return {
    board, fresh,
    async celebrate() {
      await st.say('mika', fresh.length > 1 ? 'מדבקות חדשות על קיר המילים!' : 'מדבקה חדשה על קיר המילים!', 'he');
      for (const s of stickers.filter((x) => fresh.includes(x.id))) {
        s.p.el.style.transition = 'opacity .3s'; s.p.el.style.opacity = '1';
        s.p.wiggle(); sfx.sticker(); st.fx('sparkle', s.p.x, s.p.y);
        await st.say('mika', `${VOCAB[s.id].en[0].toUpperCase()}${VOCAB[s.id].en.slice(1)}!`, 'en');
      }
      store.setCreation(owner, 'wall', { ids });
    },
  };
}

// ---------- חברים שפגשו בבית הקפה מציצים ומנופפים ----------
function friendsVisit(st, owner) {
  const met = store.creation(owner, 'cafe')?.guests || [];
  const spots = { lulu: [1490, 700, 0.42], owl: [335, 462, 0.34] }; // הינשוף יושב על גג בית הקפה
  return met.filter((id) => spots[id]).map((id) => {
    const [x, y, sc] = spots[id];
    const a = st.addActor(id, x, y, { scale: sc, id: `friend-${id}`, flip: id === 'lulu' });
    a.el.classList.add('friend');
    a.el.addEventListener('pointerup', () => { a.anim('wave', 1000); st.say(`friend-${id}`, id === 'owl' ? 'Hello! Hoo-hoo!' : 'Hello!', 'en').catch(() => {}); });
    return a;
  });
}
