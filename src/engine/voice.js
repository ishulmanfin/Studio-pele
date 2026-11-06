// שירותי קול: הקראה (Web Speech), אפקטים (WebAudio), וזיהוי דיבור אופציונלי.
// שום דבר לא מוקלט או נשמר. אם אין קול מתאים – כתובית + "ממלמל" צלילי של הדמות.
import { splitLine } from './split.js';
import { store } from './store.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
let audioCtx = null;
let listeners = new Set();
export function audioContext() {
  try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  return audioCtx;
}

export const CAST_VOICE = {
  mika: { pitch: 1.15, rate: 0.95, blip: 420 },
  toto: { pitch: 1.6, rate: 1.05, blip: 660 },
  bum:  { pitch: 0.55, rate: 0.9, blip: 160 },
  lulu: { pitch: 1.3, rate: 0.88, blip: 520 },
  owl:  { pitch: 0.75, rate: 0.82, blip: 260 },
  narrator: { pitch: 1, rate: 1, blip: 400 },
};

function loadVoices() { if (synth) voices = synth.getVoices() || []; }
if (synth) { loadVoices(); synth.addEventListener?.('voiceschanged', loadVoices); }

export function voiceReport() {
  loadVoices();
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const he = voices.filter((v) => /^(he|iw)/i.test(v.lang));
  return {
    tts: !!synth, en: en.map((v) => v.name), he: he.map((v) => v.name),
    recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
}

function pickVoice(lang) {
  loadVoices();
  const s = store.settings();
  const want = lang === 'he' ? s.heVoice : s.enVoice;
  if (want) { const v = voices.find((x) => x.name === want); if (v) return v; }
  const re = lang === 'he' ? /^(he|iw)/i : /^en/i;
  const list = voices.filter((v) => re.test(v.lang));
  if (lang === 'en') {
    return list.find((v) => /en-US/i.test(v.lang) && /samantha|google us|aria|jenny|natural/i.test(v.name))
      || list.find((v) => /en-(US|GB)/i.test(v.lang)) || list[0] || null;
  }
  return list[0] || null;
}

export function onSpeak(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(e) { listeners.forEach((f) => f(e)); }

export const audioReady = () => Boolean(audioCtx && audioCtx.state === 'running');
export function unlockAudio() {
  // אייפד: בלי זה מתג ההשתקה בצד המכשיר משתיק את כל הקולות של המשחק
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch {}
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
  // iOS: הקראה ראשונה חייבת לצאת ממגע
  try { if (synth && !unlockAudio.done) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); unlockAudio.done = true; } } catch {}
}

let speaking = 0;
export function stopSpeech() { try { synth?.cancel(); } catch {} try { currentSrc?.stop(); } catch {} speaking = 0; }

/**
 * אמירת שורה. lang: 'en' | 'he'. מחזיר Promise שנפתר בסוף השורה (או לפי הערכת זמן).
 */
// ---------- קולות מוקלטים (ElevenLabs, נוצרו מראש ע"י tools/voices/generate.mjs) ----------
// manifest: { "who|lang|text": "file.mp3" }. אין יצירת קול בזמן ריצה מול הילדות.
let manifest = {};
const buffers = new Map();
export const voiceStatus = { recorded: 0, missing: new Set() };
export const voiceKey = (who, lang, text) => `${who}|${lang}|${text}`;
export const hasRecording = (who, lang, text) => Boolean(manifest[voiceKey(who, lang, text)]);
export async function loadVoiceManifest() {
  try {
    // חבילות (bundles.json): כמה הקלטות בקובץ אחד, כדי שהגרסה המפורסמת תכיל מעט קבצים
    const b = await fetch('assets/voice/bundles.json', { cache: 'no-cache' }).catch(() => null);
    if (b?.ok) {
      const map = await b.json();
      manifest = Object.fromEntries(Object.entries(map).map(([k, [f, o, n]]) => [k, `${f}#${o}#${n}`]));
    } else {
      const r = await fetch('assets/voice/manifest.json', { cache: 'no-cache' });
      if (r.ok) manifest = await r.json();
    }
    voiceStatus.recorded = Object.keys(manifest).length;
  } catch {}
}
const bundles = new Map();
const bundle = (f) => { if (!bundles.has(f)) bundles.set(f, fetch(`assets/voice/b/${f}`).then((r) => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); }).catch((e) => { bundles.delete(f); throw e; })); return bundles.get(f); };
async function getBuffer(file) {
  if (buffers.has(file)) return buffers.get(file);
  const bytes = file.includes('#')
    ? (() => { const [f, o, n] = file.split('#'); return bundle(f).then((ab) => ab.slice(+o, +o + +n)); })()
    : fetch(`assets/voice/${file}`).then((r) => r.arrayBuffer());
  const p = bytes.then((ab) => new Promise((res, rej) => audioCtx.decodeAudioData(ab, res, rej)));
  p.catch(() => buffers.delete(file));
  buffers.set(file, p);
  return p;
}
export function preloadLines(keys) { if (!audioCtx) return; keys.forEach((k) => manifest[k] && getBuffer(manifest[k]).catch(() => {})); }

let currentSrc = null;
async function playRecorded(who, file) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await getBuffer(file);
  return playBuffer(who, buf);
}

/** משמיע AudioBuffer מפי דמות, עם סנכרון שפתיים. rate > 1 = קול גבוה ומצחיק (בובת הקול של טוטו) */
export function playBuffer(who, buf, { rate = 1 } = {}) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return new Promise((resolve) => {
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const an = audioCtx.createAnalyser(); an.fftSize = 512;
    const gain = audioCtx.createGain(); gain.gain.value = 1;
    src.connect(an); an.connect(gain).connect(audioCtx.destination);
    const data = new Uint8Array(an.fftSize);
    let alive = true;
    const tick = () => {
      if (!alive) return;
      an.getByteTimeDomainData(data);
      let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      emit({ type: 'level', who, v: Math.min(1, Math.sqrt(sum / data.length) * 5) });
      requestAnimationFrame(tick);
    };
    src.onended = () => { alive = false; emit({ type: 'level', who, v: 0 }); if (currentSrc === src) currentSrc = null; resolve(); };
    currentSrc = src;
    src.start(); tick();
  });
}

export function say(who, text, lang = 'en', { slow = false } = {}) {
  const s = store.settings();
  const cast = CAST_VOICE[who] || CAST_VOICE.narrator;
  if (window.__FAST) { try { const k = 'said'; const a = new Set(JSON.parse(sessionStorage.getItem(k) || '[]')); a.add(voiceKey(who, lang, text)); sessionStorage.setItem(k, JSON.stringify([...a])); } catch {} }
  const file = manifest[voiceKey(who, lang, text)];
  if (s.voice && file && !window.__FAST) {
    emit({ type: 'start', who, text, lang, recorded: true });
    return playRecorded(who, file).catch(() => {}).finally(() => emit({ type: 'end', who, text, lang }));
  }
  const parts = !file && splitLine(text, lang);
  if (s.voice && parts && !window.__FAST && parts.every((t) => manifest[voiceKey(who, lang, t)])) {
    emit({ type: 'start', who, text, lang, recorded: true });
    return parts.reduce((p, t) => p.then(() => playRecorded(who, manifest[voiceKey(who, lang, t)])), Promise.resolve())
      .catch(() => {}).finally(() => emit({ type: 'end', who, text, lang }));
  }
  if (!window.__FAST) voiceStatus.missing.add(voiceKey(who, lang, text));
  const est = window.__FAST ? 40 : Math.max(900, text.length * (lang === 'en' ? 85 : 70) * (slow ? 1.35 : 1) + 300);
  emit({ type: 'start', who, text, lang });
  const done = () => emit({ type: 'end', who, text, lang });
  // הקראת המכשיר (קול רובוטי) כבויה כברירת מחדל: עד שיש הקלטה, הדמות "ממלמלת" בצלילים שלה והבועה מראה את הטקסט
  const voice = s.voice && s.deviceVoice && !window.__FAST ? pickVoice(lang) : null;
  if (!synth || !voice) {
    if (s.sfx) babble(cast.blip, text.length);
    return new Promise((r) => setTimeout(() => { done(); r(); }, est));
  }
  return new Promise((resolve) => {
    let finished = false;
    const fin = () => { if (finished) return; finished = true; speaking = Math.max(0, speaking - 1); done(); resolve(); };
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang;
      u.pitch = cast.pitch;
      u.rate = Math.max(0.5, (lang === 'en' ? s.rate : 0.95) * cast.rate * (slow ? 0.8 : 1));
      u.onend = fin; u.onerror = fin;
      speaking++;
      synth.speak(u);
      setTimeout(fin, est * 2.2 + 1500); // רשת ביטחון לדפדפנים שלא שולחים onend
    } catch { setTimeout(fin, est); }
  });
}

// ---------- אפקטים ----------
function tone(freq, dur = 0.12, type = 'sine', gain = 0.15, when = 0, slideTo = null) {
  if (!store.settings().sfx) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch {}
}
function noise(dur = 0.2, gain = 0.08, when = 0, hp = 800) {
  if (!store.settings().sfx || !audioCtx) return;
  try {
    const t = audioCtx.currentTime + when;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const f = audioCtx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = audioCtx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(audioCtx.destination); src.start(t);
  } catch {}
}
function babble(base, len) {
  const n = Math.min(10, Math.max(3, Math.round(len / 4)));
  for (let i = 0; i < n; i++) tone(base * (0.85 + Math.random() * 0.4), 0.07, 'triangle', 0.06, i * 0.09);
}

export const sfx = {
  pop: () => tone(520, 0.09, 'sine', 0.18, 0, 900),
  tap: () => tone(700, 0.05, 'triangle', 0.08),
  knock: () => { noise(0.07, 0.2, 0, 200); noise(0.07, 0.2, 0.18, 200); },
  shutter: () => { for (let i = 0; i < 6; i++) noise(0.04, 0.07, i * 0.07, 1500); },
  chomp: () => { noise(0.06, 0.12, 0, 600); noise(0.06, 0.12, 0.16, 600); noise(0.06, 0.1, 0.32, 600); },
  pour: () => { for (let i = 0; i < 10; i++) tone(900 + Math.random() * 500, 0.06, 'sine', 0.04, i * 0.06); },
  sparkle: () => { [880, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'sine', 0.08, i * 0.08)); },
  boing: () => tone(220, 0.35, 'sine', 0.15, 0, 520),
  hmm: () => tone(300, 0.4, 'triangle', 0.06, 0, 240),
  slurp: () => tone(500, 0.4, 'sawtooth', 0.03, 0, 1200),
  drum: (i = 0) => { tone([110, 165, 220, 147][i % 4], 0.22, 'sine', 0.3, 0, 60); noise(0.05, 0.05, 0, 3000); },
  bark: () => { tone(480, 0.08, 'square', 0.06, 0, 300); tone(520, 0.08, 'square', 0.06, 0.14, 320); },
  sticker: () => { tone(1200, 0.05, 'sine', 0.08); tone(800, 0.08, 'sine', 0.08, 0.05); },
  bell: () => { tone(1320, 0.5, 'sine', 0.1); tone(1980, 0.4, 'sine', 0.04, 0.01); },
};

// ---------- זיהוי דיבור (אופציונלי, באישור הורה) ----------
export function micAvailable() {
  return store.settings().micAllowed && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * מקשיב עד timeout. מחזיר {status:'match'|'unsure'|'none'}.
 * 'unsure' ו-'none' לעולם אינם טעות של הילדה – המשחק ממשיך במגע.
 */
export function listen(expected, { timeout = 5000, onState } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || !store.settings().micAllowed) return Promise.resolve({ status: 'none' });
  stopSpeech();
  return new Promise((resolve) => {
    let rec; let settled = false; let best = '';
    const end = (status) => { if (settled) return; settled = true; try { rec.abort(); } catch {} onState?.('off'); resolve({ status, heard: best }); };
    try {
      rec = new SR();
      rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 4; rec.continuous = false;
      rec.onstart = () => onState?.('on');
      rec.onresult = (e) => {
        for (const r of e.results) for (const alt of r) {
          const t = alt.transcript.toLowerCase();
          best = best || t;
          if (expected.some((w) => t.includes(w.toLowerCase()))) { best = t; return end('match'); }
        }
      };
      rec.onerror = () => end(best ? 'unsure' : 'none');
      rec.onend = () => end(best ? 'unsure' : 'none');
      rec.start();
      setTimeout(() => end(best ? 'unsure' : 'none'), timeout);
    } catch { end('none'); }
  });
}
