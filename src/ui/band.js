// מריץ את הפרק "אולפן הלהקה" – אלמה (younger), שייה (older), אחיות.
// אלמה: Go/Stop ו־Fast/Slow בתנועה, ושיר עם מילים מבית הקפה (הקשר חדש = ראיה לשלב 5).
// שייה: מנצחת – מבינה "Bum, play fast!", כותבת שיר, ונותנת הוראה בעצמה.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { bandSet, stageCurtain } from '../art/sets.js';
import { sfx, unlockAudio } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { createBand } from '../engine/music.js';
import { VOCAB } from '../content/vocab.js';
import { LINES, COMMAND, GLOSS, FEEDBACK } from '../content/band.js';
import { makeBandMission } from '../content/missions.js';
import { hudHtml, svgG, showMission } from './cafe.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SIGN_X = [600, 1000];
const SIGN_Y = 520;

export async function runBand(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  const owner = sisters ? 'sisters' : players[0].id;
  const prev = store.creation(owner, 'band');
  const returning = !!prev?.visits;

  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: bandSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: false });
  const started = Date.now();
  const overTime = () => (Date.now() - started) / 60000 > store.settings().sessionMinutes;
  const band = createBand();
  const song = { instrument: prev?.instrument || null, tempo: prev?.tempo || 'normal', words: [...(prev?.words || [])], visits: prev?.visits || 0 };

  // ---- תפאורה ----
  const mika = st.addActor('mika', 220, 900, { scale: 0.86 });
  const toto = st.addActor('toto', 800, 860, { scale: 0.8 });
  const bum = st.addActor('bum', 1140, 880, { scale: 0.72 });
  const drum = st.addProp('drum', 1140, 910, { scale: 1.05, layer: 'front', tappable: false, id: 'drum-prop' });
  const xylo = st.addProp('xylo', 800, 900, { scale: 0.95, layer: 'front', tappable: false, id: 'xylo-prop' });
  xylo.el.style.opacity = '0';
  const curtain = svgG(st.layers.fx, stageCurtain(), 0, 0);
  for (const p of players) P.beginSession(p.id, 'band');

  // תנועה בקצב: טוטו רוקד, בום מתופף – אלא אם קפאו
  const frozen = { toto: false, bum: false };
  band.onBeat((e) => {
    if (!st.alive || e.beat % 2) return;
    const quick = e.bpm > 120;
    if (!frozen.toto && band.playing) toto.anim(quick ? 'hop' : 'bounce', quick ? 260 : 520);
    if (!frozen.bum && band.parts.includes('drum')) { bum.anim('bounce', 260); drum.el.classList.remove('beat-pop'); drum.el.getBoundingClientRect(); drum.el.classList.add('beat-pop'); }
  });
  const freeze = (who, on) => {
    frozen[who] = on;
    const a = who === 'toto' ? toto : bum;
    a.el.classList.toggle('frozen', on);
    a.mood(on ? 'oops' : '');
  };

  // ---- HUD ----
  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => confirmExit());
  function confirmExit() {
    const c = root.querySelector('.exit-confirm');
    c.classList.add('show');
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => c.classList.remove('show');
  }
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    band.destroy();
    if (song.instrument || song.words.length) store.setCreation(owner, 'band', { ...song, visits: song.visits + (early ? 0 : 1) });
    for (const p of players) P.endSession(p.id);
    fun.destroy();
    st.destroy();
    onDone?.({ early, overTime: overTime() });
  }

  const ctx = { place: "band", st, band, mika, toto, bum, drum, xylo, curtain, song, players, returning, sisters, setTurn, overTime, freeze, frozen };
  try {
    if (sisters) await sistersFlow(ctx);
    else if (players[0].track === 'younger') await youngerFlow(ctx, players[0]);
    else await olderFlow(ctx, players[0]);
    band.stop();
    await showMission(st, owner, makeBandMission(players, { sisters }));
    await fun.finale();
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}

// =====================================================================
// אלמה
// =====================================================================
async function youngerFlow(ctx, kid) {
  const { st, mika, song, returning } = ctx;
  const pid = kid.id;
  await openCurtain(ctx, returning ? LINES.mika.welcomeBack : LINES.mika.helloAlma, returning ? 'en' : 'he');
  await goal(ctx, LINES.mika.goalAlma);
  if (returning && song.words.length) { await st.say('mika', LINES.mika.songStillHere, 'he'); await performSong(ctx, song.words); }

  if (!song.instrument) await chooseInstrument(ctx, pid);
  setParts(ctx);

  // הדגמה: מיקה מפעילה ועוצרת
  const signs = addSigns(ctx);
  if (!returning) await demoStopGo(ctx, signs, [pid]);

  await st.say('mika', LINES.mika.yourTurnStop, 'he');
  const rounds = returning ? ['stop', 'go', 'stop'] : ['stop', 'go', 'stop', 'go'];
  await stopGoRounds(ctx, signs, rounds, pid);
  signs.forEach((s) => s.remove());

  // מהר/לאט – רק אחרי ש־go/stop מבוססים
  if (!ctx.overTime() && P.stage(pid, 'go') >= 2 && P.stage(pid, 'stop') >= 2 && returning) await fastSlowRounds(ctx, pid, ['fast', 'slow']);

  // בום שר מילים מבית הקפה
  if (!ctx.overTime() || !song.words.length) await songWords(ctx, pid);

  await st.say('mika', LINES.mika.showTime, 'he');
  await performSong(ctx, song.words, { confetti: true });
  await drumEnd(ctx);
  await st.say('mika', LINES.mika.bye(kid.name === 'אלמה' ? 'Alma' : kid.name), 'en');
  mika.anim('wave', 1200);
}

// =====================================================================
// שייה
// =====================================================================
async function olderFlow(ctx, kid) {
  const { st, mika, song, returning, band, xylo } = ctx;
  const pid = kid.id;
  await openCurtain(ctx, returning ? LINES.mika.welcomeBack : LINES.mika.helloShaya, returning ? 'en' : 'he');
  await goal(ctx, LINES.mika.goalShaya);
  if (returning && song.words.length) { await st.say('mika', LINES.mika.songStillHere, 'he'); await performSong(ctx, song.words); }
  song.instrument = song.instrument || 'xylo';
  xylo.el.style.transition = 'opacity .4s'; xylo.el.style.opacity = '1';
  band.only(['drum', 'xylo']);

  // ניצוח: מבינה מי מנגן ובאיזה קצב
  if (P.needsHebrew(pid, 's_play')) await st.say('mika', LINES.mika.conductIntro, 'he');
  const plan = [['bum', 'fast'], ['toto', 'slow']];
  if (returning) plan.push(Math.random() < 0.5 ? ['toto', 'fast'] : ['bum', 'slow']);
  for (const [who, tempo] of plan) {
    await conductRound(ctx, pid, who, tempo);
    if (ctx.overTime()) break;
  }
  await everybodyStop(ctx, pid);

  // כותבת שיר מהתפריט שלה
  await writeSong(ctx, pid);
  await letsSing(ctx, pid);

  // החלפת תפקידים: היא נותנת הוראה
  if (!ctx.overTime()) await giveCommand(ctx, pid);

  await st.say('mika', LINES.mika.bye(kid.name === 'שייה' ? 'Shaya' : kid.name), 'en');
  mika.anim('wave', 1200);
}

// =====================================================================
// אחיות: אלמה עוצרת ומפעילה, שייה מנצחת וכותבת
// =====================================================================
async function sistersFlow(ctx) {
  const { st, players, setTurn, song, returning, band, xylo } = ctx;
  const older = players.find((p) => p.track === 'older') || players[0];
  const younger = players.find((p) => p !== older) || players[1];
  setTurn(younger.id);
  await openCurtain(ctx, returning ? LINES.mika.welcomeBack : LINES.mika.helloSisters, returning ? 'en' : 'he');
  await goal(ctx, LINES.mika.goalSisters);
  if (returning && song.words.length) { await st.say('mika', LINES.mika.songStillHereSis, 'he'); await performSong(ctx, song.words); }
  song.instrument = song.instrument || 'drum';
  xylo.el.style.transition = 'opacity .4s'; xylo.el.style.opacity = '1';
  band.only(['drum', 'xylo']);

  // שייה מנצחת
  setTurn(older.id);
  await st.say('mika', LINES.mika.turnOf(older.name), 'he');
  await conductRound(ctx, older.id, 'bum', Math.random() < 0.5 ? 'fast' : 'slow');

  // אלמה: עצור / סע
  setTurn(younger.id);
  await st.say('mika', LINES.mika.turnOf(younger.name), 'he');
  const signs = addSigns(ctx);
  if (!returning) await demoStopGo(ctx, signs, [younger.id]);
  await stopGoRounds(ctx, signs, ['stop', 'go'], younger.id);
  signs.forEach((s) => s.remove());

  // שייה כותבת שיר, אלמה מתופפת בסוף
  setTurn(older.id);
  await writeSong(ctx, older.id);
  await letsSing(ctx, older.id);
  setTurn(younger.id);
  await drumEnd(ctx);
  setTurn(null);
  await st.say('mika', FEEDBACK.sisters(younger.name, older.name), 'he');
}

// =====================================================================
// רכיבים
// =====================================================================
async function openCurtain(ctx, greet, lang) {
  const { st, curtain, mika } = ctx;
  await st.say('mika', greet, lang);
  mika.anim('wave', 1000);
  const star = curtain.querySelector('.sc-star');
  await st.say('mika', LINES.mika.openCurtain, 'he');
  await st.waitTap([{ el: star, id: 'curtain' }], { demo: true, demoAt: 2500, hints: [{ at: 8000, run: () => star.classList.add('hint-pulse') }] });
  sfx.sparkle();
  curtain.querySelector('.stage-curtain').classList.add('open');
  await st.wait(900);
}

async function chooseInstrument(ctx, pid) {
  const { st, song } = ctx;
  await st.say('mika', LINES.mika.whichInstrument, 'he');
  const opts = ['drum', 'shaker'].map((k, i) => st.addProp(k, SIGN_X[i], SIGN_Y, { scale: 1.1, layer: 'fx', id: k }));
  const r = await st.waitTap(opts.map((o) => ({ el: o.el, id: o.id })), { demo: opts.map((o) => o.el), hints: [{ at: 9000, run: () => opts.forEach((o) => o.wiggle()) }] });
  r.id === 'drum' ? sfx.drum(0) : sfx.shutter();
  song.instrument = r.id;
  store.bumpInterest(pid, 'music');
  opts.forEach((o) => o.id !== r.id && o.remove());
  const keep = opts.find((o) => o.id === r.id);
  await keep.fly(1060, 650, 0.8, 500);
  keep.remove();
}

function setParts(ctx) {
  const { band, song } = ctx;
  band.only([song.instrument === 'shaker' ? 'shaker' : 'drum', 'xylo']);
}

function addSigns(ctx) {
  const { st } = ctx;
  return ['go', 'stop'].map((k, i) => st.addProp(k, SIGN_X[i], SIGN_Y, { scale: 1.15, layer: 'fx', id: k }));
}

async function demoStopGo(ctx, signs, pids) {
  const { st, band, mika } = ctx;
  await st.say('mika', LINES.mika.watchMe, 'he');
  const [go, stop] = signs;
  go.pulse(true); await st.say('mika', 'Go!', 'en'); go.pulse(false);
  mika.anim('hop', 500); band.start(); await st.wait(2200);
  stop.pulse(true); await st.say('mika', 'Stop!', 'en'); stop.pulse(false);
  band.stop(); ctx.freeze('toto', true); sfx.boing();
  await st.wait(900); ctx.freeze('toto', false);
  for (const pid of pids) P.exposed(pid, ['go', 'stop'], 'band:demo');
}

async function stopGoRounds(ctx, signs, rounds, pid) {
  const { st, band, toto } = ctx;
  let firstStop = true; let firstGo = true;
  band.start();
  await st.wait(1500);
  for (const target of rounds) {
    if (target === 'stop' && !band.playing) { band.start(); await st.wait(1200); }
    if (target === 'go' && band.playing) { band.stop(); await st.wait(500); }
    const help0 = P.stage(pid, target) < 2 ? 1 : 0; // בפעם הראשונה – הבהוב קל (נרשם "עם עזרה")
    const sign = signs.find((s) => s.id === target);
    if (help0) sign.pulse(true);
    P.exposed(pid, target, 'band:stopgo');
    await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { prompt: true });
    let wrongs = 0; let help = help0;
    for (;;) {
      const r = await st.waitTap(signs.map((s) => ({ el: s.el, id: s.id })), {
        hints: [
          { at: 9000, level: 1, run: async () => { help = Math.max(help, 1); await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { slow: true }); } },
          { at: 16000, level: 2, run: () => { help = 2; sign.pulse(true); } },
        ],
      });
      if (r.id === target) break;
      wrongs++; sfx.hmm();
      await st.say('toto', target === 'stop' ? LINES.toto.stopQ : LINES.toto.goQ, 'en');
      if (wrongs >= 2) { help = Math.max(help, 2); sign.pulse(true); }
    }
    sign.pulse(false);
    P.choice(pid, target, { correct: wrongs === 0, help, distractor: 'real', context: 'band:stopgo' });
    if (wrongs) P.choice(pid, target, { correct: true, help: Math.max(help, 1), context: 'band:stopgo' });
    if (target === 'stop') {
      band.stop(); ctx.freeze('toto', true); ctx.freeze('bum', true); sfx.boing(); toto.anim('wave', 800);
      if (firstStop) { firstStop = false; await st.say('mika', FEEDBACK.stopped, 'he'); } else await st.wait(900);
    } else {
      ctx.freeze('toto', false); ctx.freeze('bum', false); band.start(); sfx.pop();
      if (firstGo) { firstGo = false; await st.say('mika', FEEDBACK.went, 'he'); } else await st.wait(1200);
    }
  }
  ctx.freeze('toto', false); ctx.freeze('bum', false);
}

async function fastSlowRounds(ctx, pid, targets) {
  const { st, band, song } = ctx;
  if (P.needsHebrew(pid, 'fast')) await st.say('mika', LINES.mika.fastSlowIntro, 'he');
  const opts = [['fast', 'rabbit'], ['slow', 'snail']].map(([id, art], i) => st.addProp(art, SIGN_X[i], SIGN_Y, { scale: 1.1, layer: 'fx', id }));
  band.tempo('normal'); band.start();
  for (const target of targets) {
    P.exposed(pid, target, 'band:tempo');
    await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { prompt: true });
    let wrongs = 0; let help = 0;
    for (;;) {
      const unVoice = st.voicePick(opts.map((o) => ({ el: o.el, words: [o.id] })));
      const r = await st.waitTap(opts.map((o) => ({ el: o.el, id: o.id })), {
        hints: [{ at: 9000, level: 1, run: async () => { help = 1; await st.say('mika', `${cap(VOCAB[target].en)}!`, 'en', { slow: true }); } },
          { at: 16000, level: 2, run: () => { help = 2; opts.find((o) => o.id === target).pulse(true); } }],
      });
      unVoice();
      band.tempo(r.id);
      if (r.id === target) break;
      wrongs++; sfx.hmm();
      await st.say('toto', `${cap(VOCAB[r.id].en)}? Hmm…`, 'en');
      await st.say('toto', `${cap(VOCAB[target].en)}!`, 'en');
    }
    opts.forEach((o) => o.pulse(false));
    P.choice(pid, target, { correct: wrongs === 0, help, distractor: 'real', context: 'band:tempo' });
    if (wrongs) P.choice(pid, target, { correct: true, help: Math.max(help, 1), context: 'band:tempo' });
    song.tempo = target;
    const chosen = opts.find((o) => o.id === target); st.fx('sparkle', chosen.x, chosen.y);
    await st.wait(2600); // שומעים את הלהקה מנגנת מהר / לאט
    await st.say('mika', FEEDBACK[target], 'he');
    await st.wait(1200);
  }
  band.stop();
  opts.forEach((o) => o.remove());
}

/** בום שר מילה מבית הקפה בקצב; אלמה נוגעת בתמונה שהוא שר (שתי אפשרויות) */
async function songWords(ctx, pid) {
  const { st, band, bum, song } = ctx;
  const known = Object.keys(P.allItems(pid)).filter((id) => VOCAB[id]?.group && P.stage(pid, id) > 0);
  const pool = known.length >= 2 ? known : ['banana', 'apple'];
  const targets = P.pickTargets(pid, pool, 2, { maxNew: 0 });
  await st.say('mika', LINES.mika.bumSings, 'he');
  band.tempo(song.tempo === 'fast' ? 'normal' : 'slow');
  const words = [];
  for (const w of targets) {
    const other = pool.filter((x) => x !== w)[Math.floor(Math.random() * (pool.length - 1))] || (w === 'apple' ? 'banana' : 'apple');
    const order = Math.random() < 0.5 ? [w, other] : [other, w];
    const opts = order.map((id, i) => st.addProp(id, SIGN_X[i], SIGN_Y, { scale: 1.1, layer: 'fx', id }));
    band.start();
    bum.anim('bounce', 500);
    await st.say('bum', `${cap(VOCAB[w].en)}!`, 'en', { prompt: true });
    let wrongs = 0; let help = 0;
    for (;;) {
      const r = await st.waitTap(opts.map((o) => ({ el: o.el, id: o.id })), {
        hints: [{ at: 9000, level: 1, run: async () => { help = 1; await st.say('bum', `${cap(VOCAB[w].en)}!`, 'en', { slow: true }); } },
          { at: 16000, level: 2, run: () => { help = 2; opts[order.indexOf(w)].pulse(true); } }],
      });
      if (r.id === w) break;
      wrongs++; sfx.hmm();
      await st.say('bum', `${cap(VOCAB[w].en)}! ${cap(VOCAB[w].en)}!`, 'en');
      if (wrongs >= 2) { help = 2; opts[order.indexOf(w)].pulse(true); }
    }
    band.stop();
    P.choice(pid, w, { correct: wrongs === 0, help, distractor: 'real', context: 'band:song' });
    if (wrongs) P.choice(pid, w, { correct: true, help: Math.max(help, 1), context: 'band:song' });
    sfx.sparkle();
    await st.say('mika', FEEDBACK.heardWord(w), 'he');
    opts.forEach((o) => o.remove());
    words.push(w, w);
  }
  song.words = words;
}

/** שייה: "Bum, play fast!" – נוגעת בנגן, ואז בקצב */
async function conductRound(ctx, pid, who, tempo) {
  const { st, band, bum, toto } = ctx;
  band.stop();
  const ids = ['s_play', tempo];
  P.exposed(pid, ids, 'band:conduct');
  const line = COMMAND.play(who, tempo);
  await st.say('mika', line, 'en', { prompt: true });
  const gloss = P.needsHebrew(pid, 's_play');
  if (gloss) await st.say('mika', GLOSS.play(who, tempo), 'he');
  let wrongs = 0; let help = gloss ? 1 : 0;
  const players = [{ el: bum.el, id: 'bum' }, { el: toto.el, id: 'toto' }];
  for (;;) {
    const unVoice = st.voicePick([{ el: bum.el, words: ['bum', 'boom', 'bom'] }, { el: toto.el, words: ['toto', 'toe toe', 'totoro'] }]);
    const r = await st.waitTap(players, { hints: [{ at: 10000, level: 1, run: async () => { help = Math.max(help, 1); await st.say('mika', line, 'en', { slow: true }); } }] });
    unVoice();
    if (r.id === who) break;
    wrongs++; sfx.hmm();
    (r.id === 'bum' ? bum : toto).anim('hop', 500);
    await st.say(r.id, `Me? Hmm… ${who === 'bum' ? 'Bum' : 'Toto'}!`, 'en');
  }
  (who === 'bum' ? bum : toto).anim('hop', 500);
  // הנגן שנבחר מתחיל לנגן מיד – הילדה רואה ושומעת שהוא הקשיב לה
  sfx.sparkle(); st.fx('sparkle', (who === 'bum' ? bum : toto).x, (who === 'bum' ? bum : toto).y - 200);
  band.only([who === 'bum' ? 'drum' : 'xylo']); band.tempo('normal'); band.start();
  // ואיך? מהר או לאט
  const opts = [['fast', 'rabbit'], ['slow', 'snail']].map(([id, art], i) => st.addProp(art, SIGN_X[i], SIGN_Y, { scale: 1, layer: 'fx', id }));
  let twrongs = 0;
  for (;;) {
    const unVoice = st.voicePick(opts.map((o) => ({ el: o.el, words: [o.id] })));
    const r = await st.waitTap(opts.map((o) => ({ el: o.el, id: o.id })), { hints: [{ at: 10000, level: 1, run: async () => { help = Math.max(help, 1); await st.say('mika', line, 'en', { slow: true }); } }] });
    unVoice();
    if (r.id === tempo) break;
    twrongs++; sfx.hmm();
    band.tempo(r.id);
    await st.say('toto', `${cap(VOCAB[r.id].en)}? Hmm…`, 'en');
    band.tempo('normal');
  }
  const chosen = opts.find((o) => o.id === tempo);
  st.fx('sparkle', chosen.x, chosen.y); chosen.wiggle?.();
  band.tempo(tempo);
  await st.wait(2800); // שומעים את השינוי לפני שמישהו מדבר
  opts.forEach((o) => o.remove());
  const ok = wrongs === 0 && twrongs === 0;
  P.choice(pid, 's_play', { correct: ok, help, distractor: 'real', context: `band:conduct:${who}` });
  P.choice(pid, tempo, { correct: twrongs === 0, help, distractor: 'real', context: 'band:conduct' });
  await st.say('mika', FEEDBACK.playOk(who, tempo), 'he');
  await st.wait(2000);
  band.stop(); band.tempo('normal');
}

/** "Everybody, stop!" – כמה תשובות נכונות: כל נגן שנוגעים בו עוצר */
async function everybodyStop(ctx, pid) {
  const { st, band, bum, toto } = ctx;
  band.only(['drum', 'xylo']); band.start();
  await st.wait(1400);
  P.exposed(pid, ['s_everybody', 'stop'], 'band:everybody');
  await st.say('mika', COMMAND.everybodyStop, 'en', { prompt: true });
  const gloss = P.needsHebrew(pid, 's_everybody');
  if (gloss) await st.say('mika', GLOSS.everybody, 'he');
  const left = new Set(['bum', 'toto']);
  while (left.size) {
    const r = await st.waitTap([...left].map((id) => ({ el: (id === 'bum' ? bum : toto).el, id })), { hints: [{ at: 10000, run: () => st.say('mika', COMMAND.everybodyStop, 'en', { slow: true }) }] });
    left.delete(r.id);
    ctx.freeze(r.id, true); sfx.boing();
    band.play(r.id === 'bum' ? 'drum' : 'xylo', false);
  }
  band.stop();
  P.choice(pid, ['s_everybody'], { correct: true, help: gloss ? 1 : 0, distractor: 'real', context: 'band:everybody' });
  await st.say('mika', LINES.mika.allStopped, 'he');
  ctx.freeze('bum', false); ctx.freeze('toto', false);
}

/** שייה כותבת שיר: 4 פעימות מתמונות מהתפריט שלה */
async function writeSong(ctx, pid) {
  const { st, bum, song } = ctx;
  const menu = store.creation(pid, 'cafe')?.items || [];
  const pool = (menu.length >= 2 ? menu : ['banana', 'apple', 'water', 'milk']).slice(0, 4);
  await st.say('mika', menu.length >= 2 ? LINES.mika.songWrite : LINES.mika.songWriteNoMenu, 'he');
  const slotX = [560, 720, 880, 1040];
  const slots = slotX.map((x) => svgG(st.layers.fx, `<circle class="song-slot" r="62" fill="rgba(255,255,255,.18)" stroke="#FFD23F" stroke-width="5" stroke-dasharray="12 9"/>`, x, 300));
  const opts = pool.map((id, i) => st.addProp(id, 800 + (i - (pool.length - 1) / 2) * 170, 560, { scale: 0.85, layer: 'fx', id }));
  const words = []; const placed = [];
  while (words.length < 4) {
    const r = await st.waitTap(opts.map((o) => ({ el: o.el, id: o.id })), { demo: true, demoAt: 2500, hints: [{ at: 9000, run: () => opts.forEach((o, i) => st.timer(i * 120, () => o.wiggle())) }] });
    words.push(r.id);
    const p = st.addProp(r.id, 800, 560, { scale: 0.85, layer: 'fx', id: `slot-${words.length}`, tappable: false });
    placed.push(p);
    p.fly(slotX[words.length - 1], 300, 0.72, 380);
    sfx.drum(words.length); bum.anim('bounce', 400);
    st.say('bum', `${cap(VOCAB[r.id].en)}!`, 'en').catch(() => {});
    P.exposed(pid, r.id, 'band:song');
  }
  await st.wait(600);
  opts.forEach((o) => o.remove());
  ctx.songProps = { slots, placed };
  song.words = words;
}

async function letsSing(ctx, pid) {
  const { st, song } = ctx;
  const btn = svgG(st.layers.fx, `<g class="sing-btn"><rect x="-190" y="-60" width="380" height="120" rx="60" fill="#FF4F8B" stroke="#2A1A5E" stroke-width="6"/>
    <text y="20" text-anchor="middle" font-size="58" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif" direction="ltr">Let's sing!</text></g>`, 800, 560);
  btn.dataset.id = 'sing';
  const modeled = P.stage(pid, 's_letssing') < 2;
  if (modeled) await st.say('mika', COMMAND.letsSing, 'en');
  await st.say('mika', LINES.mika.letsSingTap, 'he');
  await st.waitTap([{ el: btn, id: 'sing' }], { demo: true, hints: [{ at: 8000, run: () => btn.classList.add('hint-pulse') }] });
  btn.remove();
  P.used(pid, 's_letssing', { how: 'touch', modeled, context: 'band:song' });
  if (modeled) P.choice(pid, 's_letssing', { correct: true, help: 1, context: 'band:song' });
  else P.choice(pid, 's_letssing', { correct: true, help: 0, distractor: 'real', context: 'band:song' });
  await performSong(ctx, song.words, { confetti: true });
  ctx.songProps?.slots.forEach((s) => s.remove()); ctx.songProps?.placed.forEach((p) => p.remove());
}

/** שייה נותנת הוראה: נוגעת בנגן ואז בקצב; הדמות אומרת את ההוראה ומבצעת */
async function giveCommand(ctx, pid) {
  const { st, band, bum, toto } = ctx;
  await st.say('toto', LINES.toto.whatDoIPlay, 'en');
  await st.say('mika', LINES.mika.swapIntro, 'he');
  const who = (await st.waitTap([{ el: bum.el, id: 'bum' }, { el: toto.el, id: 'toto' }])).id;
  (who === 'bum' ? bum : toto).anim('hop', 500);
  await st.say('mika', LINES.mika.swapHow, 'he');
  const opts = [['fast', 'rabbit'], ['slow', 'snail']].map(([id, art], i) => st.addProp(art, SIGN_X[i], SIGN_Y, { scale: 1, layer: 'fx', id }));
  const unVoice = st.voicePick(opts.map((o) => ({ el: o.el, words: [o.id] })));
  const tempo = (await st.waitTap(opts.map((o) => ({ el: o.el, id: o.id })))).id;
  unVoice();
  opts.forEach((o) => o.remove());
  const line = COMMAND.play(who, tempo);
  await st.say('mika', line, 'en');
  band.only([who === 'bum' ? 'drum' : 'xylo']); band.tempo(tempo); band.start();
  await st.wait(2600);
  await st.say(who, LINES.toto.yay, 'en');
  P.used(pid, ['s_play', tempo], { how: 'touch', modeled: false, context: 'band:swap' });
  await st.say('mika', FEEDBACK.gaveCommand, 'he');
  await st.wait(1500);
  band.stop(); band.tempo('normal');
}

async function performSong(ctx, words, { confetti = false } = {}) {
  const { st, band, bum, toto } = ctx;
  if (!words?.length) return;
  band.only(['drum', 'xylo']); band.start();
  for (const w of words) {
    if (!VOCAB[w]) continue;
    bum.anim('bounce', 400); toto.anim('hop', 400);
    await st.say('bum', `${cap(VOCAB[w].en)}!`, 'en');
  }
  await st.say('bum', LINES.bum.boom, 'en');
  band.stop();
  if (confetti) { st.fx('confetti', 800, 400); sfx.sparkle(); }
}

async function drumEnd(ctx) {
  const { st, bum } = ctx;
  await st.say('mika', LINES.mika.tapBumEnd, 'he');
  const r = await Promise.race([st.waitTap([{ el: bum.el, id: 'bum' }], { demo: true, demoAt: 2000 }), st.wait(9000).then(() => null)]);
  if (r) { sfx.drum(0); sfx.drum(2); bum.anim('bounce', 500); st.fx('sparkle', 1140, 640); }
  await st.wait(600);
}

/** חוקי המשחק במשפט אחד: בשלושת הביקורים הראשונים תמיד, אחר כך רק אם עבר הרבה זמן */
async function goal(ctx, line) {
  const ids = (ctx.players || []).map((p) => p.id);
  const key = `goal:${ctx.place || 'x'}`;
  const seen = Math.min(...ids.map((id) => store.interests(id)[key] || 0));
  ids.forEach((id) => store.bumpInterest(id, key));
  if (seen >= 3) return;
  await ctx.st.say('mika', line, 'he');
}
