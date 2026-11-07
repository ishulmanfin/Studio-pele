// מריץ הפרק "בית הקפה המצחיק" – שלוש גרסאות: אלמה (younger), שייה (older), אחיות.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { cafeSet, table, shutter } from '../art/sets.js';
import { prop, SYMBOLS } from '../art/puppets.js';
import { sfx, unlockAudio } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import * as GROW from '../engine/growth.js';
import { makeMission } from '../content/missions.js';
import { VOCAB, SOUNDS } from '../content/vocab.js';
import { GUESTS, REQUEST, GLOSS, LINES, FEEDBACK, SHOE_REACT, CAFE_NAMES, POOL, drinkColor, he, soundLine, soundWrong } from '../content/cafe.js';

const SLOT_X = [520, 693, 866, 1040];
const ITEM_Y = 588;
const MOUTH = { lulu: 334, owl: 225 };
const NS = 'http://www.w3.org/2000/svg';
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export async function runCafe(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  const owner = sisters ? 'sisters' : players[0].id;
  const prev = store.creation(owner, 'cafe');
  const returning = !!prev?.visits;
  const guestId = returning ? (prev.visits % 2 === 1 ? 'owl' : 'lulu') : 'lulu';
  const guest = GUESTS[guestId];

  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: cafeSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true, stage: st });
  const started = Date.now();
  const overTime = () => (Date.now() - started) / 60000 > store.settings().sessionMinutes;

  const menu = {
    name: prev?.name || null, items: [...(prev?.items || [])], special: prev?.special || null,
    cloth: prev?.cloth || null, cup: prev?.cup || null, visits: (prev?.visits || 0), guests: [...(prev?.guests || [])],
  };

  // ---- תפאורה ----
  const tbl = svgG(st.layers.front, table(menu.cloth || 'none'), 800, 640);
  const mika = st.addActor('mika', 215, 810, { scale: 0.92 });
  const toto = st.addActor('toto', 1345, 815, { scale: 0.78, flip: true });
  const bum = st.addActor('bum', 470, 965, { scale: 0.6, layer: 'front' });
  const g = st.addActor(guest.actor, 1480, 720, { scale: 0.95, id: 'guest' });
  g.el.classList.add('offstage');
  const shut = svgG(st.layers.fx, shutter(), 0, 0); shut.classList.add('shutter-wrap');
  renderBoard(st, menu);
  for (const p of players) P.beginSession(p.id, 'cafe');

  // ---- HUD ----
  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => confirmExit());
  function confirmExit() {
    const c = root.querySelector('.exit-confirm');
    c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => { c.classList.remove('show'); st.replay().catch(() => {}); }; // ממשיכים: מיקה חוזרת על הבקשה שנקטעה
  }
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    if (menu.items.length) store.setCreation(owner, 'cafe', { ...menu, visits: menu.visits + (early ? 0 : 1) });
    for (const p of players) P.endSession(p.id);
    fun.destroy();
    st.destroy();
    onDone?.({ early, overTime: overTime() });
  }

  const ctx = { place: "cafe", st, hud, players, guest, guestId, g, mika, toto, bum, tbl, shut, menu, returning, sisters, setTurn, overTime };
  try {
    if (sisters) await sistersFlow(ctx);
    else if (players[0].track === 'younger') await youngerFlow(ctx, players[0]);
    else await olderFlow(ctx, players[0]);
    await missionCard(ctx, owner);
    await fun.finale();
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}

// =====================================================================
// אלמה – פעולה אחת בכל רגע, שתי אפשרויות, קול והמחשה
// =====================================================================
async function youngerFlow(ctx, kid) {
  const { st, mika, toto, g, guest, menu, returning } = ctx;
  const pid = kid.id;

  await openShutter(ctx, pid, returning ? LINES.mika.welcomeBack : LINES.mika.helloAlma, returning ? 'en' : 'he');
  await goal(ctx, LINES.mika.goalAlma);
  if (returning) await st.say('mika', LINES.mika.menuStillHereOne, 'he');

  // שלום למיקה – סיבה ותוצאה
  await st.say('mika', 'Hello!', 'en', { prompt: true });
  mika.anim('wave', 1200);
  P.exposed(pid, 'hello', 'cafe:mika');
  const r0 = await respond(ctx, [{ el: mika.el, id: 'mika' }], ['hello', 'hi'], { timeout: 9000 });
  if (r0) { mika.anim('hop'); sfx.boing(); if (r0.spoken === 'match') { P.used(pid, 'hello', { how: 'spoken', context: 'cafe:mika' }); await st.say('mika', FEEDBACK.saidIt, 'he'); } }

  // מפה
  if (!menu.cloth) await chooseCloth(ctx, LINES.mika.whichCloth);

  // ארגז – כל מגע מוציא דבר אחד
  // מילים מוכרות + לכל היותר מילה חדשה אחת (עוגייה, ואחריה מילים מחבילות שההורה אישר)
  let pool = [...POOL.younger];
  let fresh = null;
  if (returning) {
    const w = GROW.wordsForVisit(pid, 'younger', POOL.younger, { firstNew: 'cookie' });
    fresh = w.fresh;
    pool = P.pickTargets(pid, w.known, 3, { maxNew: 0 });
    if (fresh) { pool.push(fresh); await st.say('mika', LINES.mika.somethingNewBox, 'he'); }
  }
  const items = await unbox(ctx, pid, pool);

  // אורחת
  await guestArrives(ctx, [pid]);

  // סבבי בקשה
  const known = items.filter((i) => i !== fresh);
  let targets = P.pickTargets(pid, known, 3, { maxNew: 3 });
  if (!returning) targets = ['banana', 'apple', 'water'];
  if (fresh && items.includes(fresh)) targets = [targets[0], fresh, targets[1]];
  let mode = returning && P.stage(pid, targets[0]) >= 2 ? 'real' : 'silly';
  const served = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t === fresh && mode === 'real') mode = 'silly'; // מילה חדשה – מתחילים בקל
    const res = await youngerRound(ctx, pid, t, mode, items, returning ? 'returning' : 'first');
    served.push(t);
    mode = res.help === 0 && res.wrongs === 0 ? 'real' : 'silly';
    if (ctx.overTime() && i >= 1) break;
  }

  // בום מנגן את המילים
  if (!ctx.overTime()) await bumBeat(ctx, served, [pid]);

  // תפריט: מדבקות של מה שהגישה
  await stickerMenu(ctx, pid, [...new Set(served)], LINES.mika.menuMake);

  await goodbye(ctx, [pid]);
  await closeShutter(ctx, pid);
  await st.say('mika', LINES.mika.bye(kid.name === 'אלמה' ? 'Alma' : kid.name), 'en');
}

async function youngerRound(ctx, pid, target, mode, items, phrasing) {
  const { st, g, guest, toto, mika } = ctx;
  const distractorId = mode === 'silly' ? pick(['shoe', 'sock']) : pick(items.filter((x) => x !== target));
  const left = Math.random() < 0.5;
  const optT = st.addProp(target, left ? 640 : 960, ITEM_Y - 10, { scale: 0.95, id: target });
  const optD = st.addProp(distractorId, left ? 960 : 640, ITEM_Y - 10, { scale: 0.95, id: distractorId });
  for (const o of [optT, optD]) { o.place(o.x, o.y + 40, 0.2, { instant: true }); o.place(o.x, o.y - 40, 0.95); }
  sfx.pop();
  await st.wait(400);

  const text = REQUEST.younger[phrasing](target);
  const ctxKey = `cafe:${ctx.guestId}:${phrasing}`;
  P.exposed(pid, [target, 'please'], ctxKey);
  let help = 0; let wrongs = 0;
  await st.say('guest', text, 'en', { prompt: true });
  while (true) {
    const res = await st.waitTap([{ el: optT.el, id: target }, { el: optD.el, id: distractorId }], {
      hints: [
        { at: 6000, level: 1, run: () => { g.look(optT.x < 800 ? 'left' : 'right'); optT.wiggle(); } },
        { at: 12000, level: 2, run: async () => { optT.pulse(true); await st.say('toto', `${cap(VOCAB[target].en)}!`, 'en'); } },
        { at: 20000, level: 3, run: () => st.say('mika', LINES.mika.tapToHelp(he(target), guest.heTo), 'he') },
      ],
    });
    help = Math.max(help, res.help);
    g.look('');
    if (res.id === target) break;
    wrongs++; help = Math.max(help, 1);
    P.choice(pid, target, { correct: false, help, distractor: mode, context: ctxKey });
    // תגובה מצחיקה וקצרה – בלי עונש
    await optD.fly(800, mouthY(g) + 40, 0.8, 500);
    g.mood('oops'); sfx.hmm();
    // נעל/גרב: תגובה מצחיקה בעברית. מאכל אחר: "Apple? Hmm… Banana, please." (מוקלט לכל צירוף; הגרסה העברית לא הוקלטה)
    if (SHOE_REACT[distractorId]) await st.say('guest', SHOE_REACT[distractorId], 'he');
    else await st.say('guest', LINES.guest.notThat(distractorId, target), 'en');
    g.mood('');
    await optD.fly(left ? 960 : 640, ITEM_Y - 50, 0.95, 500);
    optT.wiggle();
    await st.say('guest', text, 'en', { prompt: true, slow: true });
    if (wrongs >= 2) { optD.hide(); optT.pulse(true); }
  }
  optT.pulse(false);
  P.choice(pid, target, { correct: true, help, distractor: mode, context: ctxKey });
  if (help === 0 && wrongs === 0 && mode === 'real') P.choice(pid, 's_please', { correct: true, help: 0, distractor: 'real', context: ctxKey });
  optD.fly(optD.x, optD.y + 60, 0.1, 350).then(() => optD.remove());
  await serveToGuest(ctx, optT);
  await st.say('mika', help === 0 && wrongs === 0 ? FEEDBACK.heard(target, guest) : FEEDBACK.gave(target, guest.heTo), 'he');
  return { help, wrongs };
}

// =====================================================================
// שייה – תפקיד, תכנון, בקשות מורכבות, שימוש עצמי
// =====================================================================
async function olderFlow(ctx, kid) {
  const { st, mika, toto, g, guest, menu, returning } = ctx;
  const pid = kid.id;

  await openShutter(ctx, pid, returning ? LINES.mika.welcomeBack : LINES.mika.helloShaya, returning ? 'en' : 'he');
  await goal(ctx, LINES.mika.goalShaya);
  if (returning) await st.say('mika', LINES.mika.menuStillHereOne, 'he');
  if (!menu.cloth) await chooseCloth(ctx, LINES.mika.whichCloth);

  // תכנון: בוחרת 4 מתוך המזווה. המזווה גדל איתה – מילים מחבילות שאושרו, אחת בכל פעם
  const w = GROW.wordsForVisit(pid, 'older', POOL.pantry);
  let pantry = [...w.known];
  while (pantry.length > (w.fresh ? 7 : 8)) { // מוציאים את המבוססת ביותר מהמזווה הקבוע כדי לפנות מקום
    const base = pantry.filter((id) => POOL.pantry.includes(id)).sort((a, b) => P.stage(pid, b) - P.stage(pid, a));
    pantry.splice(pantry.indexOf(base[0]), 1);
  }
  if (w.fresh) { pantry.push(w.fresh); await st.say('mika', LINES.mika.somethingNewPantry, 'he'); }
  const stock = await stockPantry(ctx, pid, 4, pantry, LINES.mika.stockAsk, returning ? menu.items : [], { highlight: w.fresh });

  // טוטו מתבלבל – היא מתקנת
  await totoMixup(ctx, stock);

  await guestArrives(ctx, [pid]);

  const ret = returning;
  const drinks = stock.filter((i) => VOCAB[i].group === 'drink');
  const foods = stock.filter((i) => VOCAB[i].group === 'food');
  const plan = [];
  const [t1, t2] = P.pickTargets(pid, stock, 2, { maxNew: 2 });
  plan.push({ s: 's_please', items: [t1] });
  plan.push({ s: 's_iwant', items: [t2] });
  plan.push({ s: 's_category', group: drinks.length >= 2 ? 'drink' : 'food' });
  const ready = P.stage(pid, 's_please') >= 3 || P.stage(pid, 's_iwant') >= 2 || ret;
  plan.push({ s: 's_and', items: P.pickTargets(pid, stock, 2, { maxNew: 2 }), conditional: !ready });

  let sessionIndependent = 0;
  for (const step of plan) {
    if (step.conditional && sessionIndependent < 2) continue;
    if (ctx.overTime() && step.s !== 's_please') break;
    const r = await olderRound(ctx, pid, step, stock, ret);
    if (r.help === 0 && r.wrongs === 0) sessionIndependent++;
  }

  // החלפת תפקידים – היא מבקשת
  await roleSwap(ctx, pid, stock);

  // תפריט מעוצב
  await designMenu(ctx, pid, stock);

  // צלילי אותיות: משלימה את האות הראשונה של מילים בתפריט
  if (!ctx.overTime()) await menuLetters(ctx, pid, stock, ret ? 2 : 1);

  await goodbye(ctx, [pid]);
  await closeShutter(ctx, pid);
  await st.say('mika', LINES.mika.bye(kid.name === 'שייה' ? 'Shaya' : kid.name), 'en');
}

async function olderRound(ctx, pid, step, stock, ret) {
  const { st, g, guest, mika, toto } = ctx;
  const ctxKey = `cafe:${ctx.guestId}:${step.s}${ret ? ':ret' : ''}`;
  let text; let isCorrect; let need = 1; let gloss;
  if (step.s === 's_please') { text = REQUEST.older.s_please(step.items[0], ret); isCorrect = (id) => id === step.items[0]; gloss = GLOSS.s_please(step.items[0]); }
  else if (step.s === 's_iwant') { text = REQUEST.older.s_iwant(step.items[0]); isCorrect = (id) => id === step.items[0]; gloss = GLOSS.s_iwant(step.items[0]); }
  else if (step.s === 's_category') { text = REQUEST.older.s_category(step.group); isCorrect = (id) => VOCAB[id].group === step.group; gloss = GLOSS.s_category(step.group); }
  else { text = REQUEST.older.s_and(step.items[0], step.items[1]); isCorrect = (id) => step.items.includes(id); need = 2; gloss = GLOSS.s_and(step.items[0], step.items[1]); }

  const vocabIds = step.items || [];
  P.exposed(pid, [step.s, ...vocabIds], ctxKey);
  const firstEver = P.stage(pid, step.s) <= 1 && (P.raw(pid, step.s)?.exposures || 0) <= 1;
  const glossNeeded = vocabIds.some((v) => P.needsHebrew(pid, v)) || P.stage(pid, step.s) < 3;

  const opts = stockProps(ctx, stock);
  await st.say('guest', text, 'en', { prompt: true });
  let help = 0; let wrongs = 0;
  if (firstEver && glossNeeded) { help = 1; await st.say('mika', gloss, 'he'); }
  const got = [];
  const targetIds = step.items || stock.filter(isCorrect);
  while (got.length < need) {
    const live = opts.filter((o) => !o.gone);
    const res = await st.waitTap(live.map((o) => ({ el: o.p.el, id: o.id })), {
      hints: [
        { at: 8000, level: 0, run: () => st.say('guest', text, 'en', { slow: true }) },
        { at: 15000, level: 1, run: () => (glossNeeded || wrongs ? st.say('mika', gloss, 'he') : null) },
        { at: 24000, level: 2, run: () => live.filter((o) => targetIds.includes(o.id) && !got.includes(o.id)).forEach((o) => o.p.wiggle()) },
      ],
    });
    help = Math.max(help, res.help);
    const o = opts.find((x) => x.id === res.id);
    if (isCorrect(res.id) && !got.includes(res.id)) {
      got.push(res.id);
      if (need === 2) { o.gone = true; await o.p.fly(800 + (got.length === 1 ? -80 : 80), 540, 0.75, 450); sfx.pop(); if (got.length < need) continue; }
      break;
    }
    // טעות: תגובה באנגלית קודם, ואז עזרה מדורגת
    wrongs++;
    P.choice(pid, [step.s, ...vocabIds], { correct: false, help, distractor: 'real', context: ctxKey });
    await o.p.fly(800, mouthY(g) + 60, 0.7, 450);
    g.mood('oops'); sfx.hmm();
    const want = step.items ? step.items.find((x) => !got.includes(x)) : null;
    await st.say('guest', want ? LINES.guest.notThat(res.id, want) : text, 'en', { prompt: true, slow: true });
    g.mood('');
    await o.p.fly(o.x, ITEM_Y, 0.85, 400);
    if (wrongs >= 1) { help = Math.max(help, 1); await st.say('mika', gloss, 'he'); }
    if (wrongs >= 2) opts.filter((x) => !targetIds.includes(x.id) && x.id !== res.id).slice(0, 1).forEach((x) => { x.gone = true; x.p.hide(); });
    if (wrongs >= 3) opts.filter((x) => targetIds.includes(x.id) && !got.includes(x.id)).forEach((x) => x.p.pulse(true));
  }

  // הגשה: שתייה נמזגת לכוס, אוכל עף לאורח/ת
  for (const id of got) {
    const o = opts.find((x) => x.id === id);
    if (VOCAB[id].group === 'drink') await pourAndServe(ctx, pid, o.p, id);
    else await serveToGuest(ctx, o.p);
  }
  opts.forEach((o) => { if (!got.includes(o.id)) o.p.remove(); });

  P.choice(pid, [step.s, ...(step.items || got)], { correct: true, help, distractor: 'real', context: ctxKey });
  let fb;
  if (step.s === 's_category') fb = FEEDBACK.category(got[0], step.group);
  else if (step.s === 's_and') fb = FEEDBACK.two(got[0], got[1]);
  else if (step.s === 's_iwant' && help === 0 && !wrongs) fb = FEEDBACK.understoodWant(got[0]);
  else fb = help === 0 && !wrongs ? FEEDBACK.heard(got[0], guest) : FEEDBACK.gave(got[0], guest.heTo);
  await st.say('mika', fb, 'he');
  return { help, wrongs };
}

/** החלפת תפקידים: שייה מבקשת מטוטו באמצעות אריחי תמונה (מוקראים) או בקול */
async function roleSwap(ctx, pid, stock) {
  const { st, toto, mika, hud } = ctx;
  const ctxKey = `cafe:toto:s_canihave${ctx.returning ? ':ret' : ''}`;
  await st.say('mika', LINES.mika.swapIntro, 'he');
  await toto.move(1150, 815, 700);
  toto.anim('hop');
  await st.say('toto', LINES.toto.whatDoYouWant, 'en', { prompt: true });
  P.exposed(pid, 's_canihave', ctxKey);

  const modeled = P.stage(pid, 's_canihave') < 2 && !ctx.returning;
  const strip = tileStrip(hud, stock);
  if (modeled) strip.lock();
  if (modeled) {
    await st.say('mika', LINES.mika.swapModel, 'he');
    await strip.demo(['ask', stock[0], 'please'], (t) => st.say('mika', t, 'en'));
    strip.clear();
  }
  st.say('mika', LINES.mika.swapYourTurn, 'he').catch(() => {});

  // אפשר גם לדבר (אם הורה אישר) – זיהוי לא ודאי אינו טעות
  const spoken = st.invite(['can i have', ...stock.map((s) => VOCAB[s].en)]);
  const built = strip.build((t) => st.say('toto', t, 'en'));
  const winner = await Promise.race([built.then((b) => ({ b })), spoken.then((s) => (s.status === 'match' ? { s } : built.then((b) => ({ b }))))]);
  let item;
  if (winner.s) {
    item = stock.find((x) => (winner.s.heard || '').includes(VOCAB[x].en)) || stock[0];
    strip.close();
    P.used(pid, 's_canihave', { how: 'spoken', modeled, context: ctxKey });
    await st.say('mika', FEEDBACK.saidIt, 'he');
  } else {
    const b = winner.b; item = b.item;
    const full = b.hasAsk && b.hasPlease;
    if (full) P.used(pid, ['s_canihave', item], { how: 'touch', modeled, context: ctxKey });
    else P.used(pid, [item], { how: 'touch', modeled, context: ctxKey });
  }

  // טוטו מביא קודם גרב (רק בביקור ראשון) – היא מתקנת
  const kidSeat = { x: 640, y: 560 };
  if (!ctx.returning) {
    const sock = st.addProp('sock', 1150, 560, { scale: 0.8, id: 'sock' });
    await sock.fly(kidSeat.x, kidSeat.y, 0.9, 600);
    await st.say('toto', 'Sock?', 'en');
    const r = await st.waitTap([{ el: sock.el, id: 'sock' }], { hints: [{ at: 5000, run: () => sock.wiggle() }] });
    await sock.fly(1150, 400, 0.2, 400); sock.remove();
    toto.mood('oops'); await st.say('toto', LINES.toto.wrongSock, 'en'); toto.mood('');
  }
  const it = st.addProp(item, 1150, 560, { scale: 0.8, id: item });
  await it.fly(kidSeat.x, kidSeat.y, 0.95, 600);
  await st.say('toto', LINES.toto.hereYouAre, 'en');
  st.fx('hearts', kidSeat.x, kidSeat.y - 60); sfx.sparkle();
  if (!winner.s) await st.say('mika', FEEDBACK.builtIt, 'he');
  await st.wait(500);
  it.fly(kidSeat.x, kidSeat.y + 40, 0.1, 400).then(() => it.remove());
  strip.close();
  await toto.move(1345, 815, 700);
}

// =====================================================================
// מצב אחיות – תורות ברורים, תרומה עצמאית, תוצאה משותפת
// =====================================================================
async function sistersFlow(ctx) {
  const { st, players, setTurn, menu, guest, g } = ctx;
  const younger = players.find((p) => p.track === 'younger') || players[1];
  const older = players.find((p) => p !== younger);

  setTurn(younger.id);
  await openShutter(ctx, younger.id, ctx.returning ? LINES.mika.welcomeBack : LINES.mika.helloSisters, ctx.returning ? 'en' : 'he');
  await goal(ctx, LINES.mika.goalSisters);
  P.exposed(older.id, 'open', 'cafe:sisters');
  if (ctx.returning) await st.say('mika', LINES.mika.menuStillHere, 'he');

  if (!menu.cloth) { await st.say('mika', LINES.mika.turnOf(younger.name), 'he'); await chooseCloth(ctx, LINES.mika.whichCloth); }

  // אלמה פותחת את ארגז הפירות
  setTurn(younger.id);
  await st.say('mika', LINES.mika.unboxSis, 'he');
  const fruits = await unbox(ctx, younger.id, ['apple', 'banana'], { silentAsk: true, slots: [0, 1] });

  // שייה בוחרת שתי שתיות
  setTurn(older.id);
  await st.say('mika', LINES.mika.turnOf(older.name), 'he');
  const moreDrinks = GROW.approvedWords('older', 'drink').filter((id) => P.stage(older.id, id) > 0);
  const drinks = await stockPantry(ctx, older.id, 2, [...POOL.drinks, ...moreDrinks], LINES.mika.stockAskSis, [], { slots: [2, 3] });
  const all = [...fruits, ...drinks];

  setTurn(null);
  await guestArrives(ctx, players.map((p) => p.id));

  const rounds = Math.min(3, 2 + (ctx.overTime() ? 0 : 1));
  let almaMode = ctx.returning ? 'real' : 'silly';
  const served = new Set();
  for (let i = 0; i < rounds; i++) {
    const fruit = P.pickTargets(younger.id, fruits, 1, { maxNew: 2 })[0];
    const drink = P.pickTargets(older.id, drinks, 1, { maxNew: 2 })[0];
    const full = REQUEST.older.sisters(fruit, drink);
    const sisKey = 'cafe:sisters';
    P.exposed(older.id, [drink, 's_and'], sisKey);
    P.exposed(younger.id, [fruit], sisKey);

    // שייה: שומעת את ההזמנה המלאה ומוזגת את השתייה
    setTurn(older.id);
    await st.say('guest', full, 'en', { prompt: true });
    const opts = stockProps(ctx, drinks, [2, 3]);
    let help = 0; let wrongs = 0;
    while (true) {
      const res = await st.waitTap(opts.map((o) => ({ el: o.p.el, id: o.id })), {
        hints: [{ at: 8000, level: 0, run: () => st.say('guest', full, 'en', { slow: true }) },
          { at: 15000, level: 1, run: () => st.say('mika', `${older.name}, היא רוצה ${he(drink)}.`, 'he') }],
      });
      help = Math.max(help, res.help);
      if (res.id === drink) break;
      wrongs++; P.choice(older.id, drink, { correct: false, help, context: sisKey });
      g.mood('oops'); await st.say('guest', LINES.guest.notThat(res.id, drink), 'en'); g.mood('');
    }
    P.choice(older.id, drink, { correct: true, help: Math.max(help, wrongs ? 1 : 0), context: sisKey });
    const dO = opts.find((o) => o.id === drink);
    opts.filter((o) => o !== dO).forEach((o) => o.p.remove());
    const cup = await pour(ctx, older.id, dO.p, drink, { keep: true });

    // אלמה: הבקשה הפשוטה שלה, שתי אפשרויות
    setTurn(younger.id);
    await st.say('mika', LINES.mika.turnOf(younger.name), 'he');
    const r = await youngerRound(ctx, younger.id, fruit, almaMode, fruits, 'sisters');
    almaMode = r.help === 0 && r.wrongs === 0 ? 'real' : 'silly';

    // תוצאה משותפת
    await cup.fly(800, mouthY(g) + 40, 0.7, 500); sfx.slurp(); g.anim('eat'); cup.remove();
    setTurn(null);
    await st.say('mika', FEEDBACK.sisters(fruit, drink), 'he');
    served.add(fruit); served.add(drink);
  }

  if (!ctx.overTime()) await bumBeat(ctx, [...served], players.map((p) => p.id));
  setTurn(younger.id);
  await stickerMenu(ctx, younger.id, [...served].filter((x) => VOCAB[x].group === 'food'), LINES.mika.menuMakeSis);
  setTurn(older.id);
  menu.items = [...new Set([...menu.items, ...served])];
  await chooseName(ctx, older.id);
  renderBoard(st, menu);
  setTurn(null);
  await goodbye(ctx, players.map((p) => p.id));
  setTurn(younger.id);
  await closeShutter(ctx, younger.id);
  await st.say('mika', 'Bye, Shaya! Bye, Alma!', 'en');
}

// =====================================================================
// פעולות משותפות
// =====================================================================
async function openShutter(ctx, pid, greet, lang) {
  const { st, shut } = ctx;
  sfx.knock();
  await st.wait(400);
  await st.say('mika', greet, lang, { bubble: true });
  const handle = { el: shut, id: 'shutter' };
  await st.waitTap([handle], { demo: true, demoAt: 2500, hints: [{ at: 5000, run: () => { shut.classList.add('nudge'); st.timer(800, () => shut.classList.remove('nudge')); } }] });
  sfx.shutter();
  shut.classList.add('up');
  await st.wait(900);
  await st.say('mika', 'Open!', 'en');
  P.exposed(pid, 'open', 'cafe:shutter');
}

async function closeShutter(ctx, pid) {
  const { st, shut } = ctx;
  await st.say('mika', LINES.mika.closeTime, 'he');
  const cord = st.addProp('cord', 1300, 220, { layer: 'fx', id: 'cord' });
  cord.wiggle();
  await st.say('mika', 'Close?', 'en', { prompt: true });
  await st.waitTap([{ el: cord.el, id: 'cord' }], { demo: true, hints: [{ at: 5000, run: () => cord.wiggle() }, { at: 14000, run: () => {} }] }).catch((e) => { throw e; });
  cord.remove(); sfx.shutter();
  shut.classList.remove('up');
  await st.wait(900);
  await st.say('mika', 'Close!', 'en');
  P.exposed(pid, 'close', 'cafe:shutter');
}

async function chooseCloth(ctx, line) {
  const { st, tbl, menu } = ctx;
  await st.say('mika', line, 'he');
  const a = st.addProp('swatch', 640, 470, { opts: { pattern: 'stripes' }, id: 'stripes' });
  const b = st.addProp('swatch', 960, 470, { opts: { pattern: 'dots' }, id: 'dots' });
  sfx.pop();
  const r = await st.waitTap([{ el: a.el, id: 'stripes' }, { el: b.el, id: 'dots' }], { demo: [a.el, b.el], hints: [{ at: 6000, run: () => { a.wiggle(); st.timer(500, () => b.wiggle()); } }] });
  menu.cloth = r.id;
  tbl.querySelector('.cloth').setAttribute('fill', `url(#cloth-${r.id})`);
  tbl.classList.add('flap');
  sfx.sparkle();
  a.remove(); b.remove();
  await st.wait(600);
}

/** ארגז: כל מגע מוציא פריט אחד ושמו נאמר. */
async function unbox(ctx, pid, pool, { slots = [0, 1, 2, 3] } = {}) {
  const { st, toto } = ctx;
  if (!ctx.sisters) await st.say('mika', LINES.mika.unboxAlma, 'he');
  const crate = st.addProp('crate', 800, 520, { scale: 1, id: 'crate' });
  const out = [];
  ctx.tableProps = ctx.tableProps || {};
  for (let i = 0; i < pool.length; i++) {
    await st.waitTap([{ el: crate.el, id: 'crate' }], { demo: true, demoAt: 2000, hints: [{ at: 5000, run: () => crate.wiggle() }] });
    crate.wiggle(); sfx.pop();
    const id = pool[i];
    const sx = SLOT_X[slots[i % slots.length]];
    const p = st.addProp(id, 800, 500, { scale: 0.3, id, tappable: false });
    await p.fly(sx, 440, 1, 350);
    st.say('toto', `${cap(VOCAB[id].en)}!`, 'en').catch(() => {});
    await p.fly(sx, ITEM_Y, 0.85, 350);
    P.exposed(pid, id, 'cafe:unbox');
    out.push(id);
    ctx.tableProps[id] = p;
    await st.wait(700);
  }
  await crate.fly(800, 700, 0.1, 400); crate.remove();
  // הפריטים יוצגו מחדש בכל סבב
  Object.values(ctx.tableProps).forEach((p) => p.remove());
  ctx.tableProps = {};
  return out;
}

/** מזווה: בוחרים N פריטים לבית הקפה (תכנון ובעלות). */
async function stockPantry(ctx, pid, n, pool, line, preselected = [], { slots = [0, 1, 2, 3], highlight = null } = {}) {
  const { st } = ctx;
  const panel = svgG(st.layers.fx, `<g class="pantry"><rect x="-470" y="-130" width="940" height="260" rx="30" fill="#fff4e2" stroke="#2A1A5E" stroke-width="6"/>
    <path d="M-440,90 H440" stroke="#9c6b45" stroke-width="12"/></g>`, 800, 260);
  const gap = Math.min(150, 860 / Math.max(1, pool.length - 1));
  const sc = pool.length > 6 ? 0.68 : 0.8;
  const xs = pool.map((_, i) => 800 + (i - (pool.length - 1) / 2) * gap);
  const props = pool.map((id, i) => st.addProp(id, xs[i], 260, { scale: sc, layer: 'fx', id }));
  if (highlight && pool.includes(highlight)) {
    const hp = props[pool.indexOf(highlight)]; hp.pulse(true);
    st.timer(600, () => st.say('toto', `${cap(VOCAB[highlight].en)}!`, 'en').catch(() => {}));
    P.exposed(pid, highlight, 'cafe:stock');
  }
  const dots = slots.slice(0, n).map((s) => svgG(st.layers.front, `<circle r="48" fill="none" stroke="#2A1A5E" stroke-width="4" stroke-dasharray="10 8" opacity=".5"/>`, SLOT_X[s], ITEM_Y));
  await st.say('mika', line, 'he');
  const chosen = [];
  const placeAll = () => chosen.forEach((id, i) => { const p = props[pool.indexOf(id)]; p.fly(SLOT_X[slots[i]], ITEM_Y, 0.85, 400); });
  for (const id of preselected.filter((x) => pool.includes(x)).slice(0, n)) chosen.push(id);
  placeAll();
  while (chosen.length < n || preselected.length) {
    if (chosen.length >= n) { // ביקור חוזר – אפשר לאשר במגע על הפעמון
      preselected = [];
      const bell = st.addProp('bell', 800, 450, { layer: 'fx', id: 'bell' });
      const r = await st.waitTap([{ el: bell.el, id: 'bell' }, ...props.map((p) => ({ el: p.el, id: p.id }))]);
      bell.remove();
      if (r.id === 'bell') { sfx.bell(); break; }
      if (!chosen.includes(r.id)) { preselected = [1]; continue; }
      chosen.splice(chosen.indexOf(r.id), 1);
      const p = props[pool.indexOf(r.id)]; p.fly(xs[pool.indexOf(r.id)], 260, sc, 400);
      placeAll();
      continue;
    }
    const r = await st.waitTap(props.map((p) => ({ el: p.el, id: p.id })), { demo: chosen.length ? undefined : true, demoAt: 2500, hints: [{ at: 9000, run: () => props.forEach((p, i) => st.timer(i * 120, () => p.wiggle())) }] });
    const p = props[pool.indexOf(r.id)];
    if (chosen.includes(r.id)) { chosen.splice(chosen.indexOf(r.id), 1); p.fly(xs[pool.indexOf(r.id)], 260, sc, 400); placeAll(); continue; }
    chosen.push(r.id);
    store.bumpInterest(pid, `food:${r.id}`);
    sfx.pop();
    st.say('toto', `${cap(VOCAB[r.id].en)}!`, 'en').catch(() => {});
    P.exposed(pid, r.id, 'cafe:stock');
    placeAll();
  }
  await st.wait(800);
  props.forEach((p) => p.remove()); panel.remove(); dots.forEach((d) => d.remove());
  return chosen;
}

/** מציג את המלאי על השולחן כאפשרויות לבחירה */
function stockProps(ctx, stock, slots = [0, 1, 2, 3]) {
  const { st } = ctx;
  return stock.map((id, i) => {
    const x = SLOT_X[slots[i % slots.length]];
    const p = st.addProp(id, x, ITEM_Y + 40, { scale: 0.2, id });
    p.place(x, ITEM_Y, 0.85);
    return { id, p, x, gone: false };
  });
}

async function totoMixup(ctx, stock) {
  const { st, toto, mika } = ctx;
  const item = stock.find((s) => VOCAB[s].group === 'food') || stock[0];
  await toto.move(1150, 815, 600);
  const hat = st.addProp(item, 1150, 815 - 300 * 0.78, { scale: 0.7, id: 'hat', layer: 'fx' });
  sfx.boing(); toto.anim('hop');
  await st.say('toto', LINES.toto.oopsHat(item), 'en');
  const r = await st.waitTap([{ el: hat.el, id: 'hat' }, { el: toto.el, id: 'toto' }], { hints: [{ at: 5000, run: () => hat.wiggle() }, { at: 10000, run: () => st.say('mika', 'זה לא כובע!', 'he') }] });
  await hat.fly(866, ITEM_Y, 0.85, 500); hat.remove();
  toto.mood('oops'); await st.say('toto', LINES.toto.fixed, 'en'); toto.mood('');
  await st.say('mika', FEEDBACK.fixedToto, 'he');
  await toto.move(1345, 815, 600);
}

async function guestArrives(ctx, pids) {
  const { st, g, guest, mika } = ctx;
  sfx.knock();
  await st.say('toto', LINES.toto.knock, 'en');
  g.el.classList.remove('offstage');
  await g.move(800, 720, 1400);
  g.anim('wave', 1200);
  await st.say('guest', LINES.guest.hello(ctx.guestId), 'en', { prompt: true });
  for (const pid of pids) P.exposed(pid, 'hello', `cafe:${ctx.guestId}`);
  const r = await respond(ctx, [{ el: g.el, id: 'guest' }], ['hello', 'hi'], { timeout: 8000 });
  if (r) {
    g.anim('hop'); sfx.boing();
    if (r.spoken === 'match' && pids.length === 1) P.used(pids[0], 'hello', { how: 'spoken', context: `cafe:${ctx.guestId}` });
  }
  if (!ctx.menu.guests.includes(ctx.guestId)) {
    await st.say('mika', LINES.mika.guestIntro(guest), 'he');
    ctx.menu.guests.push(ctx.guestId);
  }
}

async function goodbye(ctx, pids) {
  const { st, g } = ctx;
  await st.say('guest', LINES.guest.thanksBye, 'en', { prompt: true });
  g.anim('wave', 1400);
  for (const pid of pids) P.exposed(pid, ['bye'], `cafe:${ctx.guestId}`);
  const r = await respond(ctx, [{ el: g.el, id: 'guest' }], ['bye', 'goodbye'], { timeout: 8000 });
  if (r?.spoken === 'match' && pids.length === 1) { P.used(pids[0], 'bye', { how: 'spoken', context: `cafe:${ctx.guestId}` }); await st.say('mika', FEEDBACK.saidIt, 'he'); }
  g.anim('wave', 1000);
  await g.move(1480, 720, 1300);
  g.el.classList.add('offstage');
}

/** בום מנגן את המילים שהוגשו – כל מגע = פעימה + מילה */
async function bumBeat(ctx, words, pids) {
  const { st, bum } = ctx;
  if (!words.length) return;
  await bum.move(800, 965, 600);
  await st.say('mika', LINES.mika.bumWants, 'he');
  let i = 0;
  const end = Date.now() + 14000;
  while (i < 6 && Date.now() < end) {
    const r = await Promise.race([st.waitTap([{ el: bum.el, id: 'bum' }]), st.wait(6000).then(() => null)]);
    if (!r) break;
    sfx.drum(i); bum.anim('bounce', 400);
    const w = words[i % words.length];
    st.say('bum', `${cap(VOCAB[w].en)}!`, 'en', { bubble: true }).catch(() => {});
    i++;
    for (const pid of pids) store.bumpInterest(pid, 'music');
  }
  await bum.move(470, 965, 600);
}

/** תפריט מדבקות לאלמה: נגיעה = מדבקה קופצת ללוח */
async function stickerMenu(ctx, pid, items, line) {
  const { st, menu } = ctx;
  const todo = items.filter((x) => !menu.items.includes(x));
  if (!todo.length) { if (!menu.items.length) return; await st.say('mika', 'התפריט מלא!', 'he'); return; }
  await st.say('mika', line, 'he');
  const props = todo.map((id, i) => st.addProp(id, 800 + (i - (todo.length - 1) / 2) * 190, 560, { scale: 0.85, layer: 'fx', id }));
  const left = [...props];
  while (left.length) {
    const r = await st.waitTap(left.map((p) => ({ el: p.el, id: p.id })), { hints: [{ at: 6000, run: () => left[0].wiggle() }] });
    const p = left.find((x) => x.id === r.id); left.splice(left.indexOf(p), 1);
    const slot = menu.items.length % 4;
    await p.fly(1180 + SLOTS[slot][0], 250 + SLOTS[slot][1], 0.5, 500);
    sfx.sticker(); p.remove();
    menu.items.push(r.id);
    renderBoard(st, menu);
    st.say('toto', `${cap(VOCAB[r.id].en)}!`, 'en').catch(() => {});
    await st.wait(600);
  }
}

/** תפריט מעוצב לשייה: שם, מנה מיוחדת */
async function designMenu(ctx, pid, stock) {
  const { st, menu } = ctx;
  menu.items = [...stock];
  renderBoard(st, menu);
  await st.say('mika', LINES.mika.menuMake, 'he');
  await chooseName(ctx, pid);
  await st.say('mika', LINES.mika.menuSpecial, 'he');
  const props = stock.map((id, i) => st.addProp(id, 800 + (i - (stock.length - 1) / 2) * 170, 560, { scale: 0.8, layer: 'fx', id }));
  const r = await st.waitTap(props.map((p) => ({ el: p.el, id: p.id })), { demo: true });
  menu.special = r.id; sfx.sparkle();
  st.say('toto', `${cap(VOCAB[r.id].en)}! Special!`, 'en').catch(() => {});
  props.forEach((p) => p.remove());
  renderBoard(st, menu);
  P.exposed(pid, r.id, 'cafe:menu');
  await st.wait(900);
}

async function chooseName(ctx, pid) {
  const { st, menu } = ctx;
  await st.say('mika', LINES.mika.menuName, 'he');
  const tiles = CAFE_NAMES.map((n, i) => svgG(st.layers.fx, nameTile(n), 800 + (i - 1.5) * 280, 500));
  tiles.forEach((t, i) => t.dataset.i = i);
  // מגע ראשון מקריא, מגע שני (או אותו אריח שוב) בוחר
  let chosen = null; let last = -1;
  while (chosen === null) {
    const r = await st.waitTap(tiles.map((t) => ({ el: t, id: +t.dataset.i })), { demo: true });
    if (r.id === last) { chosen = r.id; break; }
    last = r.id;
    tiles.forEach((t) => t.classList.toggle('sel', +t.dataset.i === r.id));
    await st.say('mika', CAFE_NAMES[r.id].en, 'en');
    const ok = await Promise.race([st.waitTap(tiles.map((t) => ({ el: t, id: +t.dataset.i }))), st.wait(3500).then(() => ({ id: r.id }))]);
    if (ok.id === r.id) chosen = r.id; else { last = ok.id; tiles.forEach((t) => t.classList.toggle('sel', +t.dataset.i === ok.id)); await st.say('mika', CAFE_NAMES[ok.id].en, 'en'); }
  }
  menu.name = CAFE_NAMES[chosen].en;
  sfx.sparkle();
  tiles.forEach((t) => t.remove());
  renderBoard(st, menu);
}

/** שתייה: בחירת כוס (פעם ראשונה), מזיגה בלחיצה ארוכה או מגע, הגשה */
async function pour(ctx, pid, srcProp, id, { keep = false } = {}) {
  const { st, menu } = ctx;
  let cupColor = menu.cup;
  if (!cupColor) {
    await st.say('mika', LINES.mika.whichCup, 'he');
    const b = st.addProp('cup', 680, 470, { opts: { color: '#4a7cc9' }, id: 'blue', layer: 'fx' });
    const rC = st.addProp('cup', 920, 470, { opts: { color: '#d64545' }, id: 'red', layer: 'fx' });
    const r = await st.waitTap([{ el: b.el, id: 'blue' }, { el: rC.el, id: 'red' }], { demo: [b.el, rC.el], demoAt: 2500 });
    cupColor = r.id; menu.cup = cupColor; b.remove(); rC.remove();
  }
  const cup = st.addProp('cup', 800, 560, { opts: { color: cupColor === 'blue' ? '#4a7cc9' : '#d64545', fill: drinkColor(id) }, id: 'cup', layer: 'fx' });
  await srcProp.fly(880, 420, 0.9, 450);
  srcProp.el.classList.add('pour-ready');
  const s = st.say('mika', LINES.mika.pourHint, 'he').catch(() => {});
  await holdOrTap(st, srcProp.el, () => { srcProp.el.classList.add('pouring'); sfx.pour(); cup.el.classList.add('filling'); });
  await st.wait(1300);
  srcProp.el.classList.remove('pouring', 'pour-ready');
  srcProp.remove();
  await st.say('mika', FEEDBACK.poured(id, cupColor), 'he');
  if (keep) return cup;
  await cup.fly(800, mouthY(ctx.g) + 40, 0.7, 500); sfx.slurp(); ctx.g.anim('eat');
  st.fx('hearts', 800, mouthY(ctx.g) - 80);
  await st.say('guest', pick(LINES.guest.yum), 'en');
  cup.remove();
  return null;
}
const pourAndServe = (ctx, pid, p, id) => pour(ctx, pid, p, id);

async function serveToGuest(ctx, p) {
  const { st, g } = ctx;
  await p.fly(800, mouthY(g) + 20, 0.6, 550);
  sfx.chomp(); g.anim('eat', 900);
  p.hide();
  st.fx('hearts', 800, mouthY(g) - 80); st.fx('confetti', 800, mouthY(g));
  await st.say('guest', pick(LINES.guest.yum), 'en');
  p.remove();
}

/** מגע או "דיבור" – מה שקורה קודם. מחזיר null אם עבר הזמן בלי תגובה (ממשיכים בלי לחץ). */
export async function respond(ctx, targets, expected, { timeout = 8000 } = {}) {
  const { st } = ctx;
  const tap = st.waitTap(targets);
  const voice = st.invite(expected).then((r) => (r.status === 'match' || r.status === 'unsure' ? { spoken: r.status } : new Promise(() => {})));
  const r = await Promise.race([tap, voice, st.wait(timeout).then(() => null)]);
  tap.cancel?.();
  return r;
}

function holdOrTap(st, el, onStart) {
  return new Promise((resolve) => {
    const go = () => { el.removeEventListener('pointerdown', go); onStart(); resolve(); };
    el.addEventListener('pointerdown', go);
    st.timer(12000, () => { el.classList.add('hint-pulse'); });
  });
}

// ---------- עזרי תצוגה ----------
const SLOTS = [[-120, -20], [0, -20], [120, -20], [0, 80]];
function renderBoard(st, menu) {
  const slots = st.svg.querySelector('.menu-slots');
  if (!slots) return;
  const items = menu.items.slice(0, 4);
  slots.innerHTML = `
    <text y="-95" text-anchor="middle" font-size="40" font-weight="800" fill="#fffaf0" font-family="Fredoka, sans-serif" direction="ltr">${menu.name ? esc(menu.name) : 'MENU'}</text>
    ${items.map((id, i) => `<g transform="translate(${SLOTS[i][0]},${SLOTS[i][1]}) scale(.5)">${prop(id)}${menu.special === id ? '<g transform="translate(60,-60)"><path d="M0,-30 L9,-10 L30,-9 L13,5 L19,28 L0,15 L-19,28 L-13,5 L-30,-9 L-9,-10Z" fill="#f2c14e" stroke="#2A1A5E" stroke-width="4"/></g>' : ''}</g>`).join('')}`;
}

function nameTile(n) {
  const icons = {
    sun: '<circle r="26" fill="#f2c14e" stroke="#2A1A5E" stroke-width="4"/>',
    moon: '<path d="M6,-26 A28,28 0 1 0 18,22 A22,22 0 1 1 6,-26Z" fill="#f2c14e" stroke="#2A1A5E" stroke-width="4"/>',
    paw: '<g fill="#8a5a44"><circle cx="0" cy="8" r="14"/><circle cx="-16" cy="-12" r="7"/><circle cx="0" cy="-20" r="7"/><circle cx="16" cy="-12" r="7"/></g>',
    banana: `<g transform="scale(.45)">${prop('banana')}</g>`,
  };
  return `<g class="name-tile tappable"><rect x="-125" y="-80" width="250" height="160" rx="26" fill="#fffaf0" stroke="#2A1A5E" stroke-width="5"/>
    <g transform="translate(0,-25)">${icons[n.icon]}</g>
    <text y="48" text-anchor="middle" font-size="30" font-weight="700" fill="#2A1A5E" font-family="Fredoka, sans-serif" direction="ltr">${esc(n.en)}</text></g>`;
}

export function svgG(parent, html, x, y) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', `translate(${x},${y})`);
  g.innerHTML = html;
  parent.appendChild(g);
  return g;
}
const mouthY = (a) => a.y - (MOUTH[a.name] || 300) * a.scale;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function hudHtml(players) {
  const chips = players.length > 1 ? `<div class="turns">${players.map((p) => `<div class="turn-chip" data-pid="${p.id}" style="--c:${p.color}">
    <svg viewBox="-60 -60 120 120">${SYMBOLS[p.symbol || 'star'].draw(p.color)}</svg></div>`).join('')}</div>` : '';
  return `<div class="hud">
    <button class="hud-btn hud-home" aria-label="הביתה"><svg viewBox="-50 -50 100 100"><path d="M-30,4 L0,-26 L30,4 V32 H-30Z" fill="#fffaf0" stroke="#2A1A5E" stroke-width="6" stroke-linejoin="round"/><rect x="-9" y="10" width="18" height="22" fill="#e07a5f"/></svg></button>
    <button class="hud-btn hud-replay" aria-label="לשמוע שוב"><svg viewBox="-50 -50 100 100"><path d="M-6,-30 C22,-30 30,-6 22,8 C16,18 8,18 6,30 C4,40 -14,40 -16,28" fill="none" stroke="#2A1A5E" stroke-width="8" stroke-linecap="round"/><path d="M-6,-12 C6,-12 8,0 0,6" fill="none" stroke="#2A1A5E" stroke-width="7" stroke-linecap="round"/></svg></button>
    <button class="hud-btn mic-btn" aria-label="מיקרופון"><svg viewBox="-50 -50 100 100"><rect x="-14" y="-32" width="28" height="44" rx="14" fill="#e07a5f" stroke="#2A1A5E" stroke-width="5"/><path d="M-24,2 C-24,26 24,26 24,2 M0,22 V34" fill="none" stroke="#2A1A5E" stroke-width="5" stroke-linecap="round"/></svg><span class="rec-dot"></span></button>
    ${chips}
  </div>
  <div class="tiles" hidden></div>
  <div class="exit-confirm"><div class="exit-card">
    <button class="yes" aria-label="הביתה"><svg viewBox="-50 -50 100 100"><path d="M-30,4 L0,-26 L30,4 V32 H-30Z" fill="#fffaf0" stroke="#2A1A5E" stroke-width="6" stroke-linejoin="round"/></svg></button>
    <button class="no" aria-label="להמשיך לשחק"><svg viewBox="-50 -50 100 100"><path d="M-18,-26 L26,0 L-18,26Z" fill="#5b8e7d" stroke="#2A1A5E" stroke-width="6" stroke-linejoin="round"/></svg></button>
  </div></div>`;
}

/** אריחי תמונה לבניית בקשה: [Can I have] [פריט] [please]. כל מגע מוקרא. */
function tileStrip(hud, stock) {
  const box = hud.parentElement.querySelector('.tiles');
  box.hidden = false;
  const tileSvg = (k) => {
    if (k === 'ask') return `<svg viewBox="-60 -60 120 120"><path d="M-40,10 C-40,-30 40,-30 40,10 C40,30 10,34 -6,34 L-24,48 L-20,30 C-34,26 -40,20 -40,10Z" fill="#fffaf0" stroke="#2A1A5E" stroke-width="5"/><text y="16" text-anchor="middle" font-size="44" font-weight="800" fill="#e07a5f">?</text></svg>`;
    if (k === 'please') return `<svg viewBox="-60 -60 120 120"><path d="M0,34 C-46,4 -40,-34 -14,-30 C-4,-28 0,-18 0,-14 C0,-18 4,-28 14,-30 C40,-34 46,4 0,34Z" fill="#e05f7e" stroke="#2A1A5E" stroke-width="5"/></svg>`;
    return `<svg viewBox="-80 -80 160 160">${prop(k)}</svg>`;
  };
  const label = (k) => (k === 'ask' ? 'Can I have' : k === 'please' ? 'please' : VOCAB[k].en);
  const keys = ['ask', ...stock, 'please'];
  box.innerHTML = `<div class="sentence" dir="ltr"></div><div class="tile-row" dir="ltr">${keys.map((k) => `<button class="tile" data-k="${k}" aria-label="${label(k)}">${tileSvg(k)}<span lang="en">${label(k)}</span></button>`).join('')}</div>`;
  const sentence = box.querySelector('.sentence');
  const add = (k) => { const s = document.createElement('div'); s.className = 'sent-tile'; s.innerHTML = tileSvg(k); sentence.appendChild(s); };
  return {
    async demo(seq, speak) {
      box.classList.add('demoing');
      try { for (const k of seq) { const t = box.querySelector(`[data-k="${k}"]`); t?.classList.add('demo'); add(k); await speak(label(k)); t?.classList.remove('demo'); } } finally { box.classList.remove('demoing'); }
    },
    clear() { sentence.innerHTML = ''; },
    lock() { box.classList.add('demoing'); },
    close() { box.hidden = true; box.innerHTML = ''; box.classList.remove('demoing'); },
    build(speak) {
      return new Promise((resolve) => {
        const parts = [];
        box.querySelectorAll('.tile').forEach((t) => t.addEventListener('pointerup', () => {
          const k = t.dataset.k;
          if (parts.includes(k) || (stock.includes(k) && parts.some((p) => stock.includes(p)))) return;
          parts.push(k); add(k); speak(label(k)).catch(() => {});
          const item = parts.find((p) => stock.includes(p));
          if (item && parts.includes('please')) {
            const sentenceText = `${parts.includes('ask') ? 'Can I have ' : ''}${VOCAB[item].en}, please?`;
            setTimeout(() => speak(sentenceText).catch(() => {}), 700);
            setTimeout(() => resolve({ item, hasAsk: parts.includes('ask'), hasPlease: true }), 2200);
          }
        }));
      });
    },
  };
}

/** משחק לבית: כרטיס קצר בסוף הביקור. הילדה שומעת את המשפט; ההורה קורא מה לעשות. */
async function missionCard(ctx, owner) {
  const { st, players, menu, sisters } = ctx;
  await showMission(st, owner, makeMission(players, menu.items, { sisters }));
}

/** כרטיס משחק לבית – משותף לכל הפרקים */
export async function showMission(st, owner, m) {
  store.setMission(owner, m);
  const card = document.createElement('div');
  card.className = 'mission-card';
  card.dir = 'rtl';
  card.innerHTML = `<div class="mc-inner">
    <h2>משחק לבית</h2>
    <div class="mc-art">${m.items.map((id) => `<svg viewBox="-75 -80 150 160" width="120" height="128" aria-hidden="true">${prop(id)}</svg>`).join('')}</div>
    <button class="mc-hear" dir="ltr" lang="en"><span aria-hidden="true">▶</span> ${m.phrase}</button>
    <p class="mc-parent"><b>להורים:</b> ${m.parent}</p>
    <button class="mc-done" aria-label="חזרה לסטודיו"><svg viewBox="-30 -30 60 60" width="56" height="56"><path d="M-16,0 L-4,12 L18,-12" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </div>`;
  st.root.querySelectorAll('.bubble').forEach((b) => b.remove());
  st.root.appendChild(card);
  card.querySelector('.mc-hear').addEventListener('pointerup', () => st.say('mika', m.phrase, 'en', { bubble: false }).catch(() => {}));
  sfx.sticker();
  await st.say('mika', m.intro || LINES.mika.homeGame, 'he', { bubble: false });
  await st.say('mika', m.phrase, 'en', { bubble: false });
  const done = card.querySelector('.mc-done');
  await st.waitTap([{ el: done, id: 'done' }], { demo: true, demoAt: 5000, hints: [{ at: 10000, run: () => done.classList.add('hint-pulse') }] });
  sfx.pop();
  card.classList.add('out');
  await st.wait(250);
  card.remove();
}

/** צלילים לשייה: האות הראשונה חסרה בתפריט; טוטו משמיע את הצליל; בוחרים מבין שתי אותיות */
async function menuLetters(ctx, pid, stock, n) {
  const { st, toto } = ctx;
  const words = stock.filter((w) => SOUNDS[VOCAB[w].en[0]]).slice(0, n);
  if (!words.length) return;
  if (P.needsHebrew(pid, `ph_${VOCAB[words[0]].en[0]}`)) await st.say('mika', LINES.mika.lettersIntro, 'he');
  for (const w of words) {
    const en = VOCAB[w].en; const L = en[0]; const id = `ph_${L}`; const snd = SOUNDS[L];
    const others = Object.keys(SOUNDS).filter((x) => x !== L && !(L === 'c' && x === 'g') && !(L === 'g' && x === 'c'));
    const D = others[Math.floor(Math.random() * others.length)];
    const rest = en.slice(1);
    const FS = 104; const cw = FS * 0.56; const boxW = 96;
    const total = boxW + 10 + rest.length * cw;
    const x0 = -total / 2 + 70;
    const panel = svgG(st.layers.fx, `<g class="letters-panel">
      <rect x="-440" y="-120" width="880" height="240" rx="34" fill="#FFFDF6" stroke="#2A1A5E" stroke-width="6"/>
      <g class="lp-art" transform="translate(-340,0) scale(.9)">${prop(w)}</g>
      <g class="lp-slot" transform="translate(${x0},0)"><rect x="0" y="-62" width="${boxW}" height="116" rx="18" fill="#fff" stroke="#7B5CFF" stroke-width="5" stroke-dasharray="14 10"/></g>
      <text x="${x0 + boxW + 10}" y="36" font-size="${FS}" font-weight="700" fill="#2A1A5E" font-family="Fredoka, sans-serif" direction="ltr" text-anchor="start">${esc(rest)}</text>
    </g>`, 800, 320);
    const order = Math.random() < 0.5 ? [L, D] : [D, L];
    const tiles = order.map((l, i) => svgG(st.layers.fx, `<g class="letter-tile"><rect x="-70" y="-75" width="140" height="150" rx="26" fill="${i ? '#FFD23F' : '#5ED0FF'}" stroke="#2A1A5E" stroke-width="6"/>
      <text y="38" text-anchor="middle" font-size="110" font-weight="700" fill="#2A1A5E" font-family="Fredoka, sans-serif">${l}</text></g>`, 800 + (i ? 150 : -150), 640));
    tiles.forEach((t, i) => (t.dataset.id = `letter-${order[i]}`));
    P.exposed(pid, id, `cafe:letters:${w}`);
    await st.say('toto', soundLine(snd, w), 'en', { prompt: true });
    let wrongs = 0; let help = 0;
    for (;;) {
      const r = await st.waitTap(tiles.map((t, i) => ({ el: t, id: order[i] })), {
        hints: [{ at: 9000, level: 1, run: async () => { help = Math.max(help, 1); await st.say('toto', soundLine(snd, w), 'en'); } }],
      });
      if (r.id === L) break;
      wrongs++; sfx.hmm(); toto.mood('oops');
      await st.say('toto', soundWrong(SOUNDS[r.id], snd, w), 'en');
      toto.mood('happy');
      if (wrongs >= 2) { help = Math.max(help, 2); tiles[order.indexOf(L)].classList.add('hint-pulse'); }
    }
    P.choice(pid, id, { correct: wrongs === 0, help, distractor: 'real', context: `cafe:letters:${w}` });
    if (wrongs) P.choice(pid, id, { correct: true, help: Math.max(help, 1), context: `cafe:letters:${w}` });
    // האות עפה למקום
    const t = tiles[order.indexOf(L)];
    t.style.transition = 'transform .45s var(--ease-out)';
    t.style.transform = `translate(${800 + x0 + boxW / 2}px,${316}px) scale(.78)`;
    sfx.sparkle(); toto.anim('hop');
    tiles.forEach((x) => x !== t && x.remove());
    await st.say('toto', `${cap(snd)}… ${en}!`, 'en');
    await st.say('mika', FEEDBACK.sound(w), 'he');
    await st.wait(500);
    panel.remove(); t.remove();
  }
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
