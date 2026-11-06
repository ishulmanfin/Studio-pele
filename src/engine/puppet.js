// "טוטו מדבר בקול שלי": מקליטים כל עוד מחזיקים את הכפתור, ומשמיעים מיד מפי טוטו בקול גבוה.
// ההקלטה קיימת רק בזיכרון לכמה שניות, לא נשמרת ולא נשלחת לשום מקום, ונמחקת אחרי ההשמעה.
// המיקרופון נפתח רק בלחיצה (עם נקודה אדומה), ונסגר מיד כשמשחררים. זמין רק אם הורה אישר מיקרופון.
import { audioContext, playBuffer, unlockAudio } from './voice.js';
import { store } from './store.js';

const MAX_SEC = 6;

export function puppetAvailable() {
  return !!store.settings().micAllowed && !!navigator.mediaDevices?.getUserMedia && !!audioContext();
}

/** מתחיל הקלטה. מחזיר { stop() → Promise<AudioBuffer|null>, cancel() } */
export async function startCapture({ onLevel } = {}) {
  unlockAudio();
  const ac = audioContext();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const srcNode = ac.createMediaStreamSource(stream);
  const proc = ac.createScriptProcessor(2048, 1, 1);
  const mute = ac.createGain(); mute.gain.value = 0;
  let chunks = []; let total = 0; let open = true;
  proc.onaudioprocess = (e) => {
    if (!open) return;
    const d = e.inputBuffer.getChannelData(0);
    if (total < ac.sampleRate * MAX_SEC) { chunks.push(new Float32Array(d)); total += d.length; }
    let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] * d[i];
    onLevel?.(Math.min(1, Math.sqrt(sum / (d.length / 4)) * 6));
  };
  srcNode.connect(proc); proc.connect(mute).connect(ac.destination);
  const close = () => { open = false; try { srcNode.disconnect(); proc.disconnect(); } catch {} stream.getTracks().forEach((t) => t.stop()); };
  return {
    async stop() {
      close();
      if (total < ac.sampleRate * 0.25) { chunks = []; return null; } // לחיצה קצרה מדי
      const buf = ac.createBuffer(1, total, ac.sampleRate);
      const ch = buf.getChannelData(0); let o = 0;
      for (const c of chunks) { ch.set(c.subarray(0, Math.min(c.length, total - o)), o); o += c.length; if (o >= total) break; }
      chunks = [];
      // נרמול עדין, כדי שגם לחישה תישמע
      let peak = 0; for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
      if (peak > 0.01) { const k = Math.min(4, 0.9 / peak); for (let i = 0; i < ch.length; i++) ch[i] *= k; }
      return buf;
    },
    cancel() { close(); chunks = []; },
  };
}

/** משמיע מפי טוטו בקול גבוה, ואז משחרר את ההקלטה */
export async function playAsToto(buf) {
  if (!buf) return;
  await playBuffer('toto', buf, { rate: 1.55 });
}
