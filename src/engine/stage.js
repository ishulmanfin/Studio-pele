// במה: SVG אחד לכל סצנה, שחקנים, אביזרים, כתוביות, המתנה למגע עם סולם רמזים.
import { CAST, prop as drawProp } from '../art/puppets.js';
import { say as voiceSay, onSpeak, sfx, stopSpeech, listen, micAvailable } from './voice.js';
import { store } from './store.js';

const NS = 'http://www.w3.org/2000/svg';
export class Abort extends Error {}

export function createStage(root, { bg = '', width = 1600, height = 1000, entry = 'settle' } = {}) {
  root.innerHTML = `
    <svg class="stage-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMin slice">
      <g class="bg">${bg}</g><g class="layer-back"></g><g class="layer-actors"></g><g class="layer-front"></g><g class="layer-fx"></g>
    </svg>
    <div class="bubbles"></div>`;
  const svg = root.querySelector('svg');
  const layers = {
    back: svg.querySelector('.layer-back'), actors: svg.querySelector('.layer-actors'),
    front: svg.querySelector('.layer-front'), fx: svg.querySelector('.layer-fx'),
  };
  const bubbles = root.querySelector('.bubbles');
  const actors = {};
  let alive = true;
  let lastPrompt = null;
  const timers = new Set();
  const cleanups = [];
  // אייפד (4:3): מראים כמעט את כל הרוחב ומוסיפים רצפה למטה, במקום לחתוך את הדמויות שבצדדים
  const fit = () => {
    const r = root.getBoundingClientRect(); if (!r.width || !r.height) return;
    const a = r.width / r.height;
    // טלפון לרוחב (מסך רחב מאוד): מרחיבים מעט לצדדים וחותכים שמיים למעלה, כדי שהדמויות והרצפה יישארו בתמונה
    if (a >= width / height) {
      const w = Math.min(width * 1.18, height * a); const h = w / a;
      svg.setAttribute('viewBox', `${(width - w) / 2} ${Math.max(0, height - h - 8)} ${w} ${h}`); return;
    }
    const w = Math.max(width * 0.9, height * a); const h = w / a;
    svg.setAttribute('viewBox', `${(width - w) / 2} 0 ${w} ${Math.min(h, height * 1.18)}`);
  };

  let speechQ = Promise.resolve(); const queued = new Map(); let gen = 0;
  async function sayNow(who, text, lang, { prompt = false, slow = false, bubble = true } = {}) {
      st.check();
      const a = actors[who];
      if (prompt) { lastPrompt = { who, text, lang }; if (window.__FAST) window.__lastPrompt = text; }
      let b = null;
      if (bubble && store.settings().captions) b = showBubble(who, text, lang);
      a?.el.classList.add('talking');
      // רשת ביטחון: משפט שנתקע (רשת איטית) לא עוצר את כל התור
      const cap = window.__FAST ? 2000 : 4000 + text.length * 160;
      try { await Promise.race([voiceSay(a?.name || who, text, lang, { slow }), new Promise((r) => setTimeout(r, cap))]); }
      finally {
        a?.el.classList.remove('talking');
        if (b) st.timer(lang === 'en' ? 1600 : 900, () => b.classList.add('fade'));
        if (b) st.timer(lang === 'en' ? 2100 : 1400, () => b.remove());
      }
      st.check();
    }

  const st = {
    svg, root, layers, actors,
    get alive() { return alive; },
    check() { if (!alive) throw new Abort(); },
    destroy() {
      alive = false; stopSpeech();
      timers.forEach(clearTimeout); timers.clear();
      cleanups.forEach((f) => f());
    },
    wait(ms) {
      return new Promise((res, rej) => {
        const t = setTimeout(() => { timers.delete(t); alive ? res() : rej(new Abort()); }, motionScale(ms));
        timers.add(t);
      });
    },
    timer(ms, fn) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return () => { clearTimeout(t); timers.delete(t); }; },

    addActor(name, x, y, { scale = 1, flip = false, layer = 'actors', id = name } = {}) {
      const g = document.createElementNS(NS, 'g');
      g.classList.add('actor', `actor-${name}`);
      g.dataset.actor = id;
      g.innerHTML = `<g class="actor-pos"><ellipse class="ground" cx="0" cy="2" rx="${name === 'lulu' ? 120 : 105}" ry="16" fill="#2A1A5E"/><g class="actor-inner"><g class="squish-wrap">${CAST[name]()}</g></g></g>`;
      layers[layer].appendChild(g);
      const a = {
        el: g, name, x, y, scale, flip,
        place(nx = a.x, ny = a.y, { instant = false } = {}) {
          a.x = nx; a.y = ny;
          const pos = g.firstChild;
          if (instant) pos.style.transition = 'none';
          pos.style.transform = `translate(${nx}px, ${ny}px) scale(${flip ? -scale : scale}, ${scale})`;
          if (instant) { pos.getBoundingClientRect(); pos.style.transition = ''; }
        },
        async move(nx, ny, ms = 900) {
          g.firstChild.style.transitionDuration = motionScale(ms) + 'ms';
          g.classList.add('walking');
          a.place(nx, ny);
          await st.wait(ms);
          g.classList.remove('walking');
          g.firstChild.style.transitionDuration = '';
        },
        anim(kind, ms = 900) {
          const inner = g.querySelector('.actor-inner');
          inner.classList.remove(`a-${kind}`); inner.getBoundingClientRect();
          inner.classList.add(`a-${kind}`);
          st.timer(ms, () => inner.classList.remove(`a-${kind}`));
        },
        mood(m) { g.dataset.mood = m || ''; },
        look(dir) { g.dataset.look = dir || ''; },
        head() { return g.querySelector('.head') || g; },
      };
      a.place(x, y, { instant: true });
      actors[id] = a;
      return a;
    },

    addProp(kind, x, y, { scale = 1, layer = 'front', id = kind, opts = {}, tappable = true } = {}) {
      const g = document.createElementNS(NS, 'g');
      g.classList.add('prop-wrap'); if (tappable) g.classList.add('tappable');
      g.dataset.id = id;
      g.innerHTML = `<g class="prop-pos"><g class="prop-inner"><circle class="hit" r="78" fill="transparent"/>${drawProp(kind, opts)}</g></g>`;
      layers[layer].appendChild(g);
      const p = {
        el: g, id, kind, x, y, scale,
        place(nx = p.x, ny = p.y, s = p.scale, { instant = false } = {}) {
          p.x = nx; p.y = ny; p.scale = s;
          const pos = g.firstChild;
          if (instant) pos.style.transition = 'none';
          pos.style.transform = `translate(${nx}px, ${ny}px) scale(${s})`;
          if (instant) { pos.getBoundingClientRect(); pos.style.transition = ''; }
        },
        async fly(nx, ny, s = p.scale, ms = 650) {
          g.firstChild.style.transitionDuration = motionScale(ms) + 'ms';
          p.place(nx, ny, s);
          await st.wait(ms);
          g.firstChild.style.transitionDuration = '';
        },
        pulse(on = true) { g.classList.toggle('hint-pulse', on); },
        wiggle() { const i = g.querySelector('.prop-inner'); i.classList.remove('wiggle'); i.getBoundingClientRect(); i.classList.add('wiggle'); },
        remove() { g.remove(); },
        hide(h = true) { g.classList.toggle('gone', h); },
      };
      p.place(x, y, scale, { instant: true });
      return p;
    },

    /** שורה מדוברת עם בועה. lang: 'en' | 'he'. prompt=true שומר אותה ל"שוב". */
    // דמויות לא מדברות אחת על השנייה: כל משפט מחכה שהקודם יסתיים
    say(who, text, lang = 'en', opts = {}) {
      st.check();
      const key = `${who}|${text}`;
      if (queued.has(key)) return queued.get(key); // אותו משפט כבר ממתין – לא חוזרים עליו פעמיים
      const g = gen;
      const run = speechQ.catch(() => {}).then(() => (g === gen ? sayNow(who, text, lang, opts) : undefined));
      queued.set(key, run);
      speechQ = run.catch(() => {}).finally(() => queued.delete(key));
      return run;
    },
    /** משתיקים את מה שנאמר ומבטלים משפטים שממתינים (למשל כשנכנסים למשחק) */
    hush() { gen++; queued.clear(); speechQ = Promise.resolve(); stopSpeech(); root.querySelectorAll('.bubble').forEach((b) => b.remove()); },
    async replay() {
      if (!lastPrompt) return;
      await st.say(lastPrompt.who, lastPrompt.text, lastPrompt.lang, { slow: true });
    },
    get lastPrompt() { return lastPrompt; },
    clearPrompt() { lastPrompt = null; },

    /** מחכה למגע על אחד המטרות. targets: [{el, id}] */
    /** יד מצוירת שמדגימה איפה לגעת: נכנסת, מקישה פעמיים ונעלמת */
    hand(el, { taps = 2 } = {}) {
      if (!alive || !el?.isConnected) return Promise.resolve();
      const r = el.getBoundingClientRect(); if (!r.width) return Promise.resolve();
      const box = root.getBoundingClientRect();
      const h = document.createElement('div');
      h.className = 'demo-hand';
      h.style.left = `${r.left - box.left + r.width / 2}px`; h.style.top = `${r.top - box.top + r.height * 0.55}px`;
      h.innerHTML = `<svg viewBox="-60 -30 160 200" width="168" height="210"><g class="dh-move"><g class="dh-tap" style="--taps:${taps}">
        <circle class="dh-ring" r="40" fill="none" stroke="#fff" stroke-width="8"/>
        <g transform="translate(-6,76) rotate(-18)"><path d="M0,0 C-4,-6 -4,-70 8,-74 C20,-74 20,-10 22,-30 C24,-46 44,-44 44,-28 C46,-40 64,-38 64,-22 C66,-32 84,-30 84,-14 L86,30 C86,60 66,78 40,78 C14,78 -6,64 -20,40 L-38,10 C-46,-2 -30,-14 -18,-4Z"
          fill="#FFF3E0" stroke="#2A1A5E" stroke-width="6" stroke-linejoin="round"/><path d="M22,-30 V6 M44,-28 V6 M64,-22 V8" stroke="#2A1A5E" stroke-width="4" stroke-linecap="round" opacity=".35"/></g></g></g></svg>`;
      root.appendChild(h);
      const ms = window.__FAST ? 30 : 700 + taps * 600 + 400;
      return new Promise((res) => { st.timer(ms, () => { h.remove(); res(); }); });
    },

    waitTap(targets, { hints = [], onTap, demo, demoAt = 3200 } = {}) {
      st.check();
      let cancel = () => {};
      const pr = new Promise((resolve, reject) => {
        let help = 0; const stops = [];
        const handlers = [];
        const finish = (val) => {
          stops.forEach((s) => s()); handlers.forEach(([el, h]) => el.removeEventListener('pointerup', h));
          root.querySelectorAll('.demo-hand').forEach((n) => n.remove());
          targets.forEach((t) => t.el.classList.remove('armed'));
          resolve(val);
        };
        for (const t of targets) {
          t.el.classList.add('armed');
          const h = (e) => {
            e.stopPropagation();
            if (!alive) return reject(new Abort());
            sfx.tap();
            if (onTap && onTap(t) === false) return;
            finish({ id: t.id, target: t, help });
          };
          t.el.addEventListener('pointerup', h);
          handlers.push([t.el, h]);
        }
        if (demo && targets.length) {
          const els = (Array.isArray(demo) ? demo : [demo === true ? targets[0].el : demo]);
          const show = async () => { for (const el of els) await st.hand(el); };
          stops.push(st.timer(demoAt, () => show().catch(() => {})));
          stops.push(st.timer(demoAt + 9000, () => show().catch(() => {})));
        }
        for (const hnt of hints) stops.push(st.timer(hnt.at, () => { help = Math.max(help, hnt.level ?? 1); Promise.resolve(hnt.run?.()).catch(() => {}); }));
        cancel = () => finish(null);
        cleanups.push(() => reject(new Abort()));
      });
      pr.cancel = () => cancel();
      return pr;
    },

    /** גרירה סלחנית עם חלופת מגע: מגע על האביזר = הוא עף ליעד. */
    dragTo(p, target, { radius = 260 } = {}) {
      return new Promise((resolve) => {
        const el = p.el;
        let start = null; let moved = false;
        const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
        const down = (e) => { start = toSvg(e); moved = false; el.setPointerCapture?.(e.pointerId); el.classList.add('dragging'); };
        const move = (e) => {
          if (!start) return; const q = toSvg(e);
          if (Math.hypot(q.x - start.x, q.y - start.y) > 18) moved = true;
          if (moved) { el.firstChild.style.transition = 'none'; el.firstChild.style.transform = `translate(${q.x}px, ${q.y - 30}px) scale(${p.scale * 1.08})`; }
        };
        const up = (e) => {
          if (!start) return; el.classList.remove('dragging');
          const q = toSvg(e); start = null; el.firstChild.style.transition = '';
          const near = Math.hypot(q.x - target.x, q.y - target.y) < radius;
          if (!moved || near) { done(); } else { p.place(p.x, p.y, p.scale); }
        };
        const done = () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); resolve(); };
        el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
      });
    },

    /** הזמנה לדבר: מופיעה רק אם הורה אישר מיקרופון. תוצאה לא ודאית אינה טעות. */
    async invite(expected) {
      if (!micAvailable()) return { status: 'none' };
      const btn = document.querySelector('.mic-btn');
      btn?.classList.add('show');
      const res = await new Promise((resolve) => {
        const go = async () => {
          btn.removeEventListener('pointerup', go);
          const r = await listen(expected, { onState: (s) => btn.classList.toggle('listening', s === 'on') });
          resolve(r);
        };
        btn?.addEventListener('pointerup', go);
        st.timer(7000, () => { btn?.removeEventListener('pointerup', go); resolve({ status: 'skipped' }); });
      });
      btn?.classList.remove('show', 'listening');
      return res;
    },

    /** בחירה בקול, במקביל למגע: כפתור הקלטה אדום מופיע; כשהילדה אומרת מילה מתאימה – כאילו נגעה.
     *  choices: [{el, words}]. מחזיר פונקציה שמסירה את הכפתור. בלי אישור הורה למיקרופון – לא מופיע כלום. */
    voicePick(choices) {
      if (!micAvailable()) return () => {};
      const btn = document.querySelector('.mic-btn');
      if (!btn) return () => {};
      let alive = true; let busy = false;
      btn.classList.add('show', 'beckon-btn');
      const go = async () => {
        if (busy || !alive) return; busy = true;
        btn.classList.remove('beckon-btn');
        const r = await listen(choices.flatMap((c) => c.words), { timeout: 4500, onState: (s) => btn.classList.toggle('listening', s === 'on') });
        busy = false;
        if (!alive) return;
        const heard = (r.heard || '').toLowerCase();
        const hit = r.status === 'match' && choices.find((c) => c.words.some((w) => heard.includes(w.toLowerCase())));
        if (hit) { sfx.sparkle(); hit.el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }
        else { sfx.hmm(); btn.classList.add('beckon-btn'); }
      };
      btn.addEventListener('pointerup', go);
      return () => { alive = false; btn.removeEventListener('pointerup', go); btn.classList.remove('show', 'listening', 'beckon-btn'); };
    },

    fx(kind, x, y) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', `translate(${x},${y})`);
      if (kind === 'confetti') {
        const cols = ['#FF4F8B', '#FFD23F', '#22D3A6', '#3BA3FF', '#7B5CFF', '#FF8C42'];
        g.innerHTML = Array.from({ length: 22 }, (_, i) => {
          const ang = (i / 22) * Math.PI * 2; const d = 120 + Math.random() * 140;
          return `<rect class="confetti" x="-7" y="-4" width="14" height="8" rx="3" fill="${cols[i % 6]}" style="--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d - 60}px;--r:${Math.random() * 720 - 360}deg;--d:${i * 12}ms"/>`;
        }).join('');
      } else if (kind === 'hearts' || kind === 'sparkle') {
        const sym = kind === 'hearts'
          ? '<path d="M0,8 C-14,-6 -10,-20 0,-12 C10,-20 14,-6 0,8Z" fill="#FF4F8B" stroke="#2A1A5E" stroke-width="2"/>'
          : '<path d="M0,-14 L4,-4 L14,0 L4,4 L0,14 L-4,4 L-14,0 L-4,-4Z" fill="#FFD23F" stroke="#2A1A5E" stroke-width="2"/>';
        g.innerHTML = [0, 1, 2, 3, 4].map((i) => `<g class="fx-bit" style="--dx:${(i - 2) * 40}px;--d:${i * 50}ms;--r:${(i - 2) * 12}deg"><g transform="scale(1.6)">${sym}</g></g>`).join('');
      }
      layers.fx.appendChild(g);
      st.timer(1400, () => g.remove());
    },
  };

  function showBubble(who, text, lang) {
    const a = actors[who];
    const b = document.createElement('div');
    b.className = `bubble ${lang}`;
    b.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl');
    b.lang = lang;
    // בידוד קטעי אנגלית בתוך משפט עברי, כדי שסימני פיסוק לא יקפצו לצד הלא נכון
    b.textContent = lang === 'he' ? text.replace(/[A-Za-z][A-Za-z ,'’…]*[A-Za-z][!?.]?|[A-Za-z][!?.]?/g, (m) => `\u2066${m}\u2069`) : text;
    bubbles.querySelectorAll('.bubble').forEach((x) => x.remove());
    bubbles.appendChild(b);
    if (a) {
      const r = a.head().getBoundingClientRect();
      const rr = root.getBoundingClientRect();
      const cx = r.left + r.width / 2 - rr.left;
      const top = Math.max(8, r.top - rr.top - 12);
      const half = b.offsetWidth / 2 + 10;
      const left = Math.min(Math.max(cx, half), rr.width - half);
      b.style.left = left + 'px';
      b.style.top = top + 'px';
      b.style.setProperty('--tail', `${Math.min(Math.max(50 + ((cx - left) / b.offsetWidth) * 100, 12), 88)}%`);
    } else { b.style.left = '50%'; b.style.top = '12px'; }
    return b;
  }

  // עיניים עוקבות אחרי האצבע – הדמויות "רואות" את הילדה
  const look = (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    for (const a of Object.values(actors)) {
      const dx = q.x - a.x; const dy = q.y - (a.y - 250 * a.scale);
      const len = Math.hypot(dx, dy) || 1;
      const k = a.flip ? -1 : 1;
      a.el.style.setProperty('--px', `${(dx / len) * 6 * k}px`);
      a.el.style.setProperty('--py', `${(dy / len) * 5}px`);
    }
  };
  // עולם עם עומק: שכבות הרקע זזות לאט יותר מהבמה והווילונות מהר יותר, לפי האצבע ובנשימה איטית
  const still = () => window.__FAST || store.settings().reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plx = [...svg.querySelectorAll('.plx')].map((el) => ({ el, d: Number(el.dataset.depth) || 1 }));
  if (plx.length && !still()) {
    let tx = 0; let ty = 0; let cx = 0; let cy = 0; let raf = 0;
    const aim = (e) => { const r = root.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2; };
    const tick = (t) => {
      const ix = tx + Math.sin(t / 4200) * 0.35; const iy = ty * 0.5 + Math.sin(t / 5300) * 0.2;
      cx += (ix - cx) * 0.06; cy += (iy - cy) * 0.06;
      for (const { el, d } of plx) el.setAttribute('transform', `translate(${((1 - d) * cx * 46).toFixed(1)},${((1 - d) * cy * 18).toFixed(1)})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    root.addEventListener('pointermove', aim); root.addEventListener('pointerdown', aim);
    cleanups.push(() => { cancelAnimationFrame(raf); root.removeEventListener('pointermove', aim); root.removeEventListener('pointerdown', aim); });
  }
  // כניסה: המצלמה נוחתת על הבמה
  if (!still()) { svg.classList.add(`enter-${entry}`); st.timer(1600, () => svg.classList.remove(`enter-${entry}`)); }
  // קפיץ: דמות או דוכן שנוגעים בהם נמעכים וקופצים חזרה
  const squish = (e) => {
    const hit = e.target.closest?.('.actor, .tappable'); if (!hit) return;
    const w = hit.querySelector('.squish-wrap') || hit.querySelector('.booth');
    if (!w || still()) return;
    w.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.1,.86)', offset: 0.25 }, { transform: 'scale(.94,1.08)', offset: 0.55 }, { transform: 'scale(1.02,.98)', offset: 0.8 }, { transform: 'scale(1,1)' }],
      { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)', composite: 'add' });
  };
  root.addEventListener('pointerdown', squish);
  // שובל ניצוצות קטן מאחורי האצבע
  let down = false; let lastT = 0;
  const COLORS = ['#FFD23F', '#FF4F8B', '#5ED0FF', '#22D3A6', '#FF8C42'];
  const spark = (e) => {
    if (e.type === 'pointerdown') down = true;
    if (!down || still() || e.timeStamp - lastT < 40) return; lastT = e.timeStamp;
    const r = root.getBoundingClientRect(); const d = document.createElement('i');
    d.className = 'trail';
    d.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;--c:${COLORS[(Math.random() * 5) | 0]};--dx:${(Math.random() - 0.5) * 40}px;--dy:${20 + Math.random() * 30}px`;
    root.appendChild(d); setTimeout(() => d.remove(), 950);
  };
  const lift = () => { down = false; };
  root.addEventListener('pointerdown', spark); root.addEventListener('pointermove', spark); window.addEventListener('pointerup', lift);
  cleanups.push(() => { root.removeEventListener('pointerdown', spark); root.removeEventListener('pointermove', spark); window.removeEventListener('pointerup', lift); });
  cleanups.push(() => root.removeEventListener('pointerdown', squish));
  /** המצלמה עפה אל נקודה בבמה (לפני מעבר מקום) */
  st.flyTo = (x, y, ms = 520) => {
    if (still()) return Promise.resolve();
    const m = svg.getScreenCTM(); const r = svg.getBoundingClientRect();
    const px = m.a * x + m.e - r.left; const py = m.d * y + m.f - r.top;
    svg.style.transformOrigin = `${px}px ${py}px`;
    const anim = svg.animate([{ transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'scale(2.3)', opacity: 0, filter: 'blur(6px)' }],
      { duration: ms, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' });
    return anim.finished.catch(() => {});
  };
  fit(); window.addEventListener('resize', fit);
  cleanups.push(() => window.removeEventListener('resize', fit));
  root.addEventListener('pointerdown', look);
  cleanups.push(() => root.removeEventListener('pointerdown', look));
  const unsub = onSpeak((e) => {
    const a = Object.values(actors).find((x) => x.name === e.who);
    if (!a) return;
    if (e.type === 'start' && e.recorded) a.el.classList.add('lipsync');
    if (e.type === 'level') a.el.style.setProperty('--mouth', (0.15 + e.v * 1.1).toFixed(2));
    if (e.type === 'end') a.el.classList.remove('lipsync');
  });
  cleanups.push(unsub);
  return st;
}

export function motionScale(ms) { if (window.__FAST) return Math.min(ms, 30); return store.settings().reduceMotion ? Math.min(ms, 250) : ms; }
