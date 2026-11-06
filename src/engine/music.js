// מנוע מוזיקה קטן ללהקה: לולאה של 8 פעימות עם תוף, שייקר וקסילופון (פנטטוני – תמיד נשמע טוב).
// הקצב משתנה בזמן אמת (fast / slow), stop עוצר מיד. כל פעימה מודיעה לבמה כדי שהדמויות יזוזו בקצב.
// מכבד את ההגדרה "מוזיקה" באזור ההורים; במצב בדיקה אוטומטית (?fast) לא מנגן כלום אבל הפעימות ממשיכות.
import { audioContext } from './voice.js';
import { store } from './store.js';

export const TEMPO = { slow: 70, normal: 104, fast: 150 };
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // C D E G A C

export function createBand() {
  let bpm = TEMPO.normal;
  let playing = false;
  let step = 0;
  let timer = null;
  let next = 0;
  const parts = new Set(['drum']); // מי מנגן עכשיו: drum, shaker, xylo
  const listeners = new Set();
  let melody = [0, 2, 4, 2, 3, 2, 1, 0];
  let words = null; // פעימות עם מילים (שיר): [{word, at}] – הבמה מקבלת את המילה בפעימה

  const on = () => !window.__FAST && store.settings().music !== false;

  function hit(kind, t, i) {
    const ac = audioContext(); if (!ac || !on()) return;
    const out = ac.createGain(); out.connect(ac.destination);
    if (kind === 'kick') {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.3);
    } else if (kind === 'snare' || kind === 'shake') {
      const len = kind === 'snare' ? 0.14 : 0.07;
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * len), ac.sampleRate); const d = b.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / d.length);
      const s = ac.createBufferSource(); s.buffer = b;
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = kind === 'snare' ? 1200 : 5000;
      const g = ac.createGain(); g.gain.value = kind === 'snare' ? 0.22 : 0.12;
      s.connect(f).connect(g).connect(out); s.start(t);
    } else if (kind === 'xylo') {
      const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(PENTA[melody[i % melody.length] % PENTA.length], t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.55);
    }
  }

  function schedule() {
    const ac = audioContext();
    const now = ac && on() ? ac.currentTime : performance.now() / 1000;
    if (!next) next = now + 0.05;
    while (next < now + 0.12) {
      const i = step % 8; const t = next;
      if (parts.has('drum')) hit(i % 4 === 0 ? 'kick' : i % 4 === 2 ? 'snare' : null, t, i);
      if (parts.has('shaker')) hit('shake', t, i);
      if (parts.has('xylo') && i % 2 === 0) hit('xylo', t, i / 2);
      const delay = Math.max(0, (t - now) * 1000);
      const s = step;
      setTimeout(() => listeners.forEach((f) => f({ step: s, beat: s % 8, bpm, word: words ? words[s % words.length] : null })), delay);
      step++;
      next += 60 / bpm / 2; // שמיניות
    }
  }

  return {
    get playing() { return playing; },
    get bpm() { return bpm; },
    get parts() { return [...parts]; },
    start() { if (playing) return; playing = true; next = 0; timer = setInterval(schedule, 25); schedule(); },
    stop() { playing = false; clearInterval(timer); timer = null; },
    tempo(name) { bpm = TEMPO[name] || name; },
    play(part, yes = true) { if (yes) parts.add(part); else parts.delete(part); },
    only(list) { parts.clear(); list.forEach((p) => parts.add(p)); },
    song(list) { words = list && list.length ? list.flatMap((w) => [w, null]) : null; step = 0; },
    onBeat(f) { listeners.add(f); return () => listeners.delete(f); },
    destroy() { this.stop(); listeners.clear(); },
  };
}
