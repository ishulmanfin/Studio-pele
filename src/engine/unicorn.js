// בקר חד-קרן: מצב (עומד / מעופף / מריע), נשימה, נפנוף כנפיים, תנועת רעמה וזנב, מצמוץ.
// כמו המורה – הכל פונקציה של זמן, כדי שאפשר להקליט סרטון זהה.

function hash(n) { const x = Math.sin(n * 78.233) * 43758.5453; return x - Math.floor(x); }

export function createUnicorn(root, { level = 1 } = {}) {
  const $ = (k) => root.querySelector(`[data-rig="${k}"]`);
  const $$ = (k) => [...root.querySelectorAll(`[data-rig="${k}"]`)];
  const R = { body: $('body'), head: $('head'), tail: $('tail'), mane: $('mane'), wing: $('wing'), wingFar: $('wing-far'), legs: $$('leg'),
    open: $('eye-open'), happy: $('eye-happy'), pupil: $('pupil'), glow: $('glow'), stars: $('stars'), shadow: $('shadow'), horn: $('horn') };
  let mode = 'idle'; let since = 0; const seed = Math.random() * 10;

  // מה נפתח לפי הרמה: 1 = כנפיים קטנות, 3 = כנפיים מלאות, 4 = ניצוצות, 5 = הילה
  function setLevel(lv) {
    level = lv;
    const wingScale = lv >= 3 ? 1 : lv >= 2 ? 0.75 : 0.55;
    R.wing.dataset.s = R.wingFar.dataset.s = wingScale;
    R.stars.style.display = lv >= 4 ? '' : 'none';
    R.glow.style.display = lv >= 5 ? '' : 'none';
  }
  setLevel(level);

  function render(t) {
    const k = t + seed;
    const flying = mode === 'fly' || mode === 'cheer';
    const flapSpeed = flying ? 16 : 2.2;
    const flapAmp = flying ? 34 : 5;
    const flap = Math.sin(k * flapSpeed) * flapAmp;
    const bob = flying ? Math.sin(k * 4) * 14 - 60 : Math.sin(k * 2) * 2.5;
    const rear = mode === 'cheer' ? Math.max(0, Math.sin(Math.min(1, (t - since) / 0.5) * Math.PI / 2)) * -14 : 0;
    R.body.setAttribute('transform', `translate(0,${bob}) rotate(${rear} -60 -110)`);
    R.shadow.setAttribute('transform', `scale(${flying ? 0.7 : 1},1)`);
    R.shadow.style.opacity = flying ? 0.5 : 1;
    const ws = Number(R.wing.dataset.s) || 1;
    R.wing.firstElementChild.setAttribute('transform', `rotate(${-18 - flap}) scale(${ws})`);
    R.wingFar.firstElementChild.setAttribute('transform', `rotate(${-30 - flap * 0.8}) scale(${ws})`);
    R.head.setAttribute('transform', `rotate(${Math.sin(k * 1.3) * 3 + (mode === 'cheer' ? -6 : 0)} 70 -240)`);
    R.mane.setAttribute('transform', `rotate(${Math.sin(k * 2.6 + 1) * (flying ? 5 : 2)} 40 -260)`);
    R.tail.setAttribute('transform', `rotate(${Math.sin(k * 3.1) * (flying ? 12 : 5)} -112 -176)`);
    R.legs.forEach((l, i) => {
      const a = flying ? 18 + Math.sin(k * 6 + i) * 6 : (mode === 'trot' ? Math.sin(k * 10 + i * Math.PI) * 22 : 0);
      l.setAttribute('transform', `translate(${l.dataset.x},-118) rotate(${flying ? (i % 2 ? -a : a) * 0.6 + 20 : a} 0 0)`);
    });
    R.horn.style.filter = level >= 4 ? `drop-shadow(0 0 ${6 + Math.sin(k * 3) * 4}px #fff8c0)` : '';
    // מצמוץ ועיני שמחה
    const bi = Math.floor(k / 3.1); const blinkAt = bi * 3.1 + 0.6 + hash(bi) * 2;
    const blink = Math.abs(k - blinkAt) < 0.08;
    const happy = mode === 'cheer';
    R.open.style.display = happy ? 'none' : '';
    R.happy.style.display = happy ? '' : 'none';
    R.open.setAttribute('transform', `scale(1,${blink ? 0.08 : 1})`);
    R.stars.setAttribute('transform', `rotate(${Math.sin(k) * 4} 0 -250)`);
    R.stars.style.opacity = 0.6 + Math.sin(k * 5) * 0.4;
  }
  return { render, setLevel, mode: (m, t) => { mode = m; since = t; }, get state() { return mode; } };
}
