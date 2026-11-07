// בקר הדמות של מיקה המורה: תנוחות, מבט, הבעות, מצמוץ, נשימה וסנכרון שפתיים.
// הכל מחושב כפונקציה של זמן (t בשניות), כך שאותה תנועה יוצאת זהה בזמן אמת ובהקלטת סרטון.

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;

// זוויות במעלות: [כתף, מרפק]. חיובי = הרחק מהגוף / כלפי מעלה החוצה. שלילי = אל מול הגוף.
export const POSES = {
  rest:    { l: [8, -6],    r: [8, -6] },
  hips:    { l: [38, -88],  r: [38, -88] },
  wave:    { l: [8, -6],    r: [150, 30] },
  point:   { l: [8, -6],    r: [100, 8] },
  present: { l: [52, 22],   r: [52, 22] },
  cheer:   { l: [150, 10],  r: [150, 10] },
  chest:   { l: [8, -6],    r: [-18, -128] },   // "אני" – יד על הלב
  think:   { l: [-12, -70], r: [-10, -150] },   // יד על הסנטר
  listen:  { l: [8, -6],    r: [120, 95] },    // יד ליד האוזן
  clap:    { l: [-2, -64],  r: [-2, -64] },
  hold:    { l: [8, -6],    r: [60, -70] },     // מחזיקה קלף מול הגוף
};

export const EXPR = {
  happy:     { brow: [0, 0, 0],     eyes: 1,    happyEyes: false },
  warm:      { brow: [-2, 0, 0],    eyes: 1,    happyEyes: false },
  surprised: { brow: [-12, 0, 0],   eyes: 1.12, happyEyes: false },
  curious:   { brow: [-10, 4, 8],   eyes: 1.05, happyEyes: false }, // גבה אחת מורמת
  proud:     { brow: [-6, 0, 0],    eyes: 1,    happyEyes: true },
  oops:      { brow: [-4, -12, 0],  eyes: 1,    happyEyes: false }, // גבות מורמות פנימה, אמפתיה
};

// רצף visemes מקובץ "X0 A80 ..." → [[ms, shape], ...]
export const parseTrack = (s) => (s || '').trim().split(/\s+/).filter(Boolean).map((p) => [Number(p.slice(1)), p[0]]);

function hash(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

export function createTeacher(root) {
  const $ = (k) => root.querySelector(`[data-rig="${k}"]`);
  const R = {
    body: $('body'), torso: $('torso'), head: $('head'), face: $('face'), beret: $('beret'),
    ul: $('upper-l'), fl: $('fore-l'), ur: $('upper-r'), fr: $('fore-r'),
    eyes: ['l', 'r'].map((s) => ({ open: $(`eye-open-${s}`), happy: $(`eye-happy-${s}`), pupil: $(`pupil-${s}`), brow: $(`brow-${s}`), side: s })),
    mouth: [...$('mouth').querySelectorAll('[data-v]')].reduce((m, g) => ((m[g.dataset.v] = g), m), {}),
  };

  // ערוצים: כל ערוץ הוא רשימת מפתחות {t, v, d}. ערך בזמן t = מעבר חלק מהערך הקודם לחדש.
  const ch = { pose: [{ t: -1, v: 'rest', d: 0 }], turn: [{ t: -1, v: 0, d: 0 }], gaze: [{ t: -1, v: [0, 0], d: 0 }], expr: [{ t: -1, v: 'happy', d: 0 }], lean: [{ t: -1, v: 0, d: 0 }] };
  let speech = null; // {t, track, dur}
  let manualMouth = null;

  const key = (name, t, v, d = 0.45) => { const c = ch[name]; while (c.length > 1 && c[c.length - 1].t >= t) c.pop(); c.push({ t, v, d }); };
  function sample(name, t, mix) {
    const c = ch[name];
    let i = c.length - 1; while (i > 0 && c[i].t > t) i--;
    const at = (j, tt) => {
      const cur = c[j];
      if (j === 0) return cur.v;
      return mix(at(j - 1, cur.t), cur.v, ease((tt - cur.t) / (cur.d || 1e-6)));
    };
    return at(i, t);
  }
  const mixNum = (a, b, k) => lerp(a, b, k);
  const mixVec = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const mixPose = (a, b, k) => {
    const A = typeof a === 'string' ? POSES[a] : a, B = typeof b === 'string' ? POSES[b] : b;
    return { l: mixVec(A.l, B.l, k), r: mixVec(A.r, B.r, k), name: k > 0.5 ? (B.name || b) : (A.name || a) };
  };
  const mixExpr = (a, b, k) => {
    const A = typeof a === 'string' ? EXPR[a] : a, B = typeof b === 'string' ? EXPR[b] : b;
    return { brow: A.brow.map((x, j) => lerp(x, B.brow[j], k)), eyes: lerp(A.eyes, B.eyes, k), happyEyes: k > 0.5 ? B.happyEyes : A.happyEyes };
  };

  function mouthAt(t) {
    if (manualMouth) return manualMouth;
    if (!speech) return 'X';
    const ms = (t - speech.t) * 1000;
    if (ms < 0 || ms > speech.dur * 1000 + 60) return 'X';
    let s = 'X';
    for (const [at, v] of speech.track) { if (at <= ms) s = v; else break; }
    return s;
  }

  function render(t) {
    const pose = sample('pose', t, mixPose);
    const turn = sample('turn', t, mixNum);      // ‎-1 = פונה לשמאל המסך, ‎+1 = לימין
    const gaze = sample('gaze', t, mixVec);      // ‎-1..1 בכל ציר
    const expr = sample('expr', t, mixExpr);
    const lean = sample('lean', t, mixNum);
    const talking = mouthAt(t) !== 'X';

    // תנועות קטנות שמחיות: נשימה, נדנוד ראש, תנועות ראש בזמן דיבור
    const breathe = Math.sin(t * 2.2);
    const sway = Math.sin(t * 0.9) * 1.6 + Math.sin(t * 2.3) * 0.6;
    const talkNod = talking ? Math.sin(t * 7.5) * 1.8 : 0;

    R.torso.setAttribute('transform', `translate(0,${-470 * 0.012 * breathe * 0.5}) scale(1,${1 + 0.006 * breathe})`);
    R.body.parentNode.setAttribute('transform', `rotate(${lean * 4 + turn * 1.5} 0 0)`);
    const headRot = sway + turn * 7 + talkNod + expr.brow[2] * 0.4;
    R.head.setAttribute('transform', `translate(${turn * 6},${breathe * -1.5}) rotate(${headRot} 0 -480)`);
    // סיבוב פנים (2.5D): התווים זזים לכיוון שאליו היא פונה
    R.face.setAttribute('transform', `translate(${turn * 16},${talkNod * 0.6})`);
    R.beret.setAttribute('transform', `rotate(${-9 - turn * 3} -10 -722) translate(${-turn * 6},0)`);

    // זרועות + תוספות דינמיות (נפנוף, מחיאות כפיים)
    const waveAmt = pose.name === 'wave' ? 22 * Math.sin(t * 11) : 0;
    const clapAmt = pose.name === 'clap' ? 14 * Math.max(0, Math.sin(t * 13)) : 0;
    const gest = talking && (pose.name === 'present' || pose.name === 'rest' || pose.name === 'hips') ? 4 * Math.sin(t * 3.1) : 0;
    R.ul.setAttribute('transform', `rotate(${-(pose.l[0] + clapAmt + gest)} 0 0)`); // הזרוע השמאלית משוקפת, לכן אותו סימן
    R.fl.setAttribute('transform', `translate(0,118) rotate(${-pose.l[1]} 0 0)`);
    R.ur.setAttribute('transform', `rotate(${-(pose.r[0] + clapAmt - gest)} 0 0)`);
    R.fr.setAttribute('transform', `translate(0,118) rotate(${-(pose.r[1] + waveAmt)} 0 0)`);

    // עיניים: מבט, מצמוץ, עיני שמחה
    const bi = Math.floor(t / 3.4);
    const blinkAt = bi * 3.4 + 0.8 + hash(bi + 1) * 2.2;
    const bk = Math.abs(t - blinkAt) < 0.09 ? 0.08 : 1;
    for (const e of R.eyes) {
      e.open.style.display = expr.happyEyes ? 'none' : '';
      e.happy.style.display = expr.happyEyes ? '' : 'none';
      e.open.setAttribute('transform', `scale(${expr.eyes},${expr.eyes * bk})`);
      e.pupil.setAttribute('transform', `translate(${(gaze[0] + turn * 0.4) * 5},${gaze[1] * 5})`);
      const lift = expr.brow[0] + (e.side === 'r' ? -expr.brow[2] : 0) + (talking ? Math.sin(t * 4) * 1.5 : 0);
      const tilt = (e.side === 'l' ? 1 : -1) * expr.brow[1];
      e.brow.setAttribute('transform', `translate(${e.side === 'l' ? -38 : 38},${-640 + lift}) rotate(${tilt})`);
    }

    const m = mouthAt(t);
    for (const [v, g] of Object.entries(R.mouth)) g.style.display = v === m ? '' : 'none';
  }

  return {
    render,
    pose: (name, t, d = 0.45) => key('pose', t, name, d),
    turn: (v, t, d = 0.5) => key('turn', t, v, d),
    gaze: (x, y, t, d = 0.18) => key('gaze', t, [x, y], d),
    expr: (name, t, d = 0.25) => key('expr', t, name, d),
    lean: (v, t, d = 0.5) => key('lean', t, v, d),
    speak: (track, dur, t) => { speech = { t, dur, track: typeof track === 'string' ? parseTrack(track) : track }; },
    mouth: (v) => { manualMouth = v; },
    isTalking: (t) => mouthAt(t) !== 'X',
  };
}
