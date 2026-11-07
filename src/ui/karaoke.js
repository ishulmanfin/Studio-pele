// קריוקי לשתי הבנות: מיקה שרה מילה באנגלית על רקע מוזיקה, והילדה שרה אחריה למיקרופון האדום.
// האורות והתמונה "רוקדים" לפי עוצמת הקול שלה (בלי בדיקת הגייה ובלי ציון). בסוף – ההופעה:
// המוזיקה מתנגנת עם ההקלטות שלה ברצף. ההקלטות נשמרות בזיכרון בלבד ונמחקות כשיוצאים.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { bandSet } from '../art/sets.js';
import { sfx, unlockAudio, playBuffer } from '../engine/voice.js';
import { createBand } from '../engine/music.js';
import { puppetAvailable, startCapture } from '../engine/puppet.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB, uniqueSound } from '../content/vocab.js';
import { LINES } from '../content/karaoke.js';
import { LINES as BANDL } from '../content/band.js';
import { hudHtml } from './cafe.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const BASE = ['banana', 'apple', 'water', 'milk', 'cookie', 'juice'];
const SING_MS = 2800;

export async function runKaraoke(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: bandSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: false, stage: st });
  const band = createBand();
  const mika = st.addActor('mika', 330, 900, { scale: 0.9 });
  const toto = st.addActor('toto', 1300, 930, { scale: 0.7, flip: true });
  const bum = st.addActor('bum', 1080, 970, { scale: 0.55 });
  const mic = hud.querySelector('.mic-btn');
  mic.classList.add('karaoke-mic');
  for (const p of players) P.beginSession(p.id, 'karaoke');

  // כל פעימה – הדמויות רוקדות
  band.onBeat((e) => {
    if (!st.alive || e.beat % 2) return;
    toto.anim('bounce', 260);
    if (e.beat % 4 === 0) bum.anim('bounce', 260);
  });

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => { c.classList.remove('show'); st.replay().catch(() => {}); }; // ממשיכים: מיקה חוזרת על הבקשה שנקטעה
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  const takes = []; // [{word, buf}] – בזיכרון בלבד
  let capture = null;
  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    capture?.cancel(); capture = null;
    takes.length = 0;
    band.destroy();
    for (const p of players) P.endSession(p.id);
    fun.destroy();
    st.destroy();
    onDone?.({ early, overTime: false });
  }

  // מסך הקריוקי: מסגרת עם אורות, ובתוכה תמונת המילה
  const NS = 'http://www.w3.org/2000/svg';
  const screen = document.createElementNS(NS, 'g');
  screen.setAttribute('transform', 'translate(800,360)');
  screen.innerHTML = `<rect x="-250" y="-190" width="500" height="340" rx="28" fill="#1C1240" stroke="#2A1A5E" stroke-width="8"/>
    <rect x="-232" y="-172" width="464" height="304" rx="20" fill="none" stroke="#FFD23F" stroke-width="5" stroke-dasharray="4 18" stroke-linecap="round" class="k-bulbs"/>
    <circle class="k-glow" r="120" fill="#FF4F8B" opacity="0"/>`;
  st.layers.back.appendChild(screen);
  const glow = screen.querySelector('.k-glow');
  const level = (v) => { glow.setAttribute('opacity', (0.15 + v * 0.7).toFixed(2)); glow.setAttribute('r', String(110 + v * 90)); };

  try {
    const canRecord = puppetAvailable();
    const seen = players.some((p) => (store.interests(p.id).karaoke || 0) > 0);
    band.only(['drum', 'xylo']); band.tempo('normal');
    mika.anim('wave', 900);
    if (!seen) await st.say('mika', sisters ? LINES.introSis : LINES.intro, 'he');
    band.start();

    const words = planWords(players, sisters ? 4 : 4);
    let first = !seen;
    for (let i = 0; i < words.length; i++) {
      const kid = sisters ? players[i % players.length] : players[0];
      const w = words[i];
      if (sisters) { setTurn(kid.id); await st.say('mika', BANDL.mika.turnOf(kid.name), 'he'); }
      const pr = st.addProp(w, 800, 340, { scale: 0.3, layer: 'fx', id: `k-${w}`, tappable: false });
      pr.fly(800, 340, 1.8, 380); sfx.pop();
      // מיקה "שרה" את המילה
      mika.anim('hop', 600);
      P.exposed(kid.id, w, 'karaoke');
      await st.say('mika', `${cap(VOCAB[w].en)}!`, 'en', { prompt: true });
      if (first) await st.say('mika', LINES.yourTurn, 'he');
      // תורה: נוגעת במיקרופון האדום ושרה
      mic.classList.add('show', 'beckon-btn');
      await st.waitTap([{ el: mic, id: 'mic' }], {
        demo: first ? [mic] : undefined, demoAt: 600,
        hints: [{ at: 6000, run: () => st.say('mika', LINES.tapMic, 'he') }, { at: 14000, run: () => st.say('mika', `${cap(VOCAB[w].en)}!`, 'en', { slow: true }) }],
      });
      first = false;
      mic.classList.remove('beckon-btn'); mic.classList.add('listening');
      band.tempo('normal');
      let buf = null;
      if (canRecord) {
        try {
          capture = await startCapture({ onLevel: (v) => { level(v); pr.el.style.transform = `scale(${1 + v * 0.25})`; } });
          await st.wait(SING_MS);
          buf = await capture?.stop(); capture = null;
        } catch { capture = null; }
      } else {
        // בלי מיקרופון: שרים בכל זאת, והאורות "רוקדים" לבד
        const t0 = Date.now(); const id = setInterval(() => level(0.4 + 0.4 * Math.sin((Date.now() - t0) / 120)), 60);
        await st.wait(SING_MS); clearInterval(id);
      }
      level(0); pr.el.style.transform = '';
      mic.classList.remove('listening', 'show');
      takes.push({ word: w, buf });
      P.used(kid.id, w, { how: 'spoken', modeled: true, context: 'karaoke' });
      store.bumpInterest(kid.id, 'karaoke');
      const box = pr.el.getBoundingClientRect(); fun.win(box.left + box.width / 2, box.top + box.height / 2);
      toto.anim('hop', 600); sfx.sparkle();
      if (i === 0) await st.say('mika', canRecord ? LINES.great : LINES.noMic, 'he');
      else if (Math.random() < 0.5) await st.say('mika', LINES.great, 'he');
      pr.remove();
      await st.wait(300);
    }
    setTurn(null);

    // ההופעה: המוזיקה עם הקולות שלהן
    await st.say('mika', LINES.concert, 'he');
    band.only(['drum', 'xylo', 'shaker']); band.tempo('normal');
    for (const t of takes) {
      const pr = st.addProp(t.word, 800, 340, { scale: 0.3, layer: 'fx', id: `kc-${t.word}`, tappable: false });
      pr.fly(800, 340, 1.8, 300);
      const box = pr.el.getBoundingClientRect(); fun.burst(box.left + box.width / 2, box.top + box.height / 2);
      level(0.8);
      if (t.buf) await playBuffer('narrator', t.buf, { rate: 1 });
      else await st.say('mika', `${cap(VOCAB[t.word].en)}!`, 'en');
      level(0);
      await st.wait(350);
      pr.remove();
    }
    takes.length = 0; // ההקלטות נמחקות
    band.stop();
    mika.anim('wave', 1200); toto.anim('hop', 600); bum.anim('bounce', 600);
    await fun.finale();
    await st.say('mika', LINES.bye, 'he');
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}

/** מילים לשיר: מילים שהבנות כבר פגשו, ואם אין – מילים בסיסיות */
function planWords(players, n) {
  const met = [...new Set(players.flatMap((p) => Object.keys(P.allItems(p.id)).filter((id) => VOCAB[id]?.group && P.stage(p.id, id) > 0)))];
  const pool = uniqueSound(shuffle(met.length >= n ? met : [...new Set([...met, ...BASE])]));
  return pool.slice(0, n);
}
