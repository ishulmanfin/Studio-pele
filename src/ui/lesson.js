// "השיעור של מיקה": המורה מלמדת כל ילדה לפי הרמה והקצב שלה.
// מבנה קבוע: שלום אישי → החד-קרן שלה → חזרה על מילים מוכרות → מילה חדשה על כן הציור →
// מחבואים עם תמונות → (ברמות גבוהות: מיקה טועה בכוונה, "What do you want?") → סיום חם ומשימה לבית.
// סבלנות: אין לחץ זמן ואין צליל כישלון. שתיקה מקבלת עזרה הדרגתית (מבט, הצבעה, נוגעים יחד), לא עונש.
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { classroomSet, EASEL } from '../art/classroom.js';
import { teacher } from '../art/teacher.js';
import { unicorn, UNICORNS } from '../art/unicorns.js';
import { createTeacher, parseTrack } from '../engine/teacher.js';
import { createUnicorn } from '../engine/unicorn.js';
import { sfx, unlockAudio, onSpeak } from '../engine/voice.js';
import { store, save } from '../engine/store.js';
import * as P from '../engine/progress.js';
import * as M from '../engine/mind.js';
import { VOCAB } from '../content/vocab.js';
import { L, W, TOPICS, LIKES, PATIENCE } from '../content/lesson.js';
import { hudHtml } from './cafe.js';

const NS = 'http://www.w3.org/2000/svg';
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const en = (w) => VOCAB[w].en;
const CARD = '<rect x="-88" y="-88" width="176" height="176" rx="30" fill="#fffaf0" stroke="#3A2160" stroke-width="5"/><rect x="-76" y="60" width="152" height="16" rx="8" fill="#FFD23F" opacity=".5"/>';
const TX = 370, TY = 950, TS = 0.88;           // מיקה
const ROW_Y = 770;                             // שורת התמונות, על השטיח
const ROW_X = 1010;
const now = () => performance.now() / 1000;

let VIS = null; // צורות פה מחושבות מראש לכל הקלטה של מיקה
const visemes = () => (VIS ||= fetch('assets/voice/visemes.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

export async function runLesson(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage lesson"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: classroomSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: false, stage: st });
  const vis = await visemes();

  // ---------- מיקה המורה על הבמה ----------
  const tg = document.createElementNS(NS, 'g');
  tg.classList.add('actor', 'actor-teacher'); tg.dataset.actor = 'mika';
  tg.innerHTML = `<g transform="translate(${TX},${TY}) scale(${TS})"><g class="squish-wrap">${teacher()}</g></g>`;
  st.layers.actors.appendChild(tg);
  const T = createTeacher(tg.querySelector('.teacher'));
  st.actors.mika = { el: tg, name: 'mika', x: TX, y: TY, scale: TS, flip: false, head: () => tg.querySelector('[data-rig="face"]'), anim() {}, mood() {}, look() {}, place() {} };
  const pose = (p, d) => T.pose(p, now(), d);
  const face = (turn, gx = turn, gy = 0) => { T.turn(turn, now()); T.gaze(gx, gy, now()); };
  const expr = (e) => T.expr(e, now());

  // סנכרון שפתיים: לכל הקלטה יש רצף צורות פה; בלי רצף – לפי עוצמת הקול
  let byLevel = false;
  const unsub = onSpeak((e) => {
    if (e.who !== 'mika') return;
    if (e.type === 'clip') { const tr = vis[e.key]; byLevel = !tr; if (tr) { T.mouth(null); T.speak(parseTrack(tr), e.dur, now()); } }
    else if (e.type === 'level' && byLevel) T.mouth(e.v > 0.45 ? 'A' : e.v > 0.22 ? 'E' : e.v > 0.06 ? 'M' : 'X');
    else if (e.type === 'start' && !e.recorded) { byLevel = false; const n = Math.max(3, Math.round(e.text.length / 3)); T.speak([...Array(n)].map((_, i) => [i * 120, 'AEOMEA'[i % 6]]).concat([[n * 120, 'X']]), n * 0.12, now()); }
    else if (e.type === 'end') { byLevel = false; T.mouth(null); }
  });

  // ---------- החד-קרן של כל ילדה ----------
  const unis = {};
  const UNI_X = sisters ? [1270, 1440] : [1350]; // על הספרייה
  function placeUnicorn(kid, i) {
    const m = M.memory(kid.id);
    const g = document.createElementNS(NS, 'g');
    g.classList.add('uni-wrap', 'tappable');
    g.innerHTML = `<g class="uni-pos" style="transform:translate(${UNI_X[i]}px,474px) scale(${sisters ? 0.36 : 0.44})"><g class="squish-wrap">${unicorn(m.unicorn)}</g></g>`;
    st.layers.front.appendChild(g);
    const U = createUnicorn(g, { level: m.uniShown || 1 });
    unis[kid.id] = { g, U, kind: m.unicorn, x: UNI_X[i] };
    g.addEventListener('pointerup', () => { if (U.state === 'idle') { U.mode('fly', now()); sfx.sparkle(); st.timer(1400, () => U.mode('idle', now())); } });
    return unis[kid.id];
  }
  const uniName = (kid) => UNICORNS[M.memory(kid.id).unicorn]?.name || '';
  async function uniCheer(kid, ms = 1400) { const u = unis[kid.id]; if (!u) return; u.U.mode('cheer', now()); sfx.sparkle(); st.timer(ms, () => u.U.mode('idle', now())); }

  // ---------- לולאת אנימציה ----------
  let raf = 0;
  const loop = () => { if (!st.alive) return; const t = now(); T.render(t); for (const u of Object.values(unis)) u.U.render(t); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  for (const p of players) P.beginSession(p.id, 'lesson');
  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => { c.classList.remove('show'); st.replay().catch(() => {}); };
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf); unsub();
    for (const p of players) P.endSession(p.id);
    fun.destroy(); st.destroy();
    onDone?.({ early, overTime: false });
  }

  // ---------- קלפים ----------
  function addCard(w, x, y, s = 1, id = `c-${w}-${Math.random().toString(36).slice(2, 6)}`) {
    const pr = st.addProp(VOCAB[w].art || w, x, y, { scale: s, layer: 'front', id });
    pr.el.querySelector('.prop-inner').insertAdjacentHTML('afterbegin', CARD);
    pr.el.classList.add('animal-card');
    return pr;
  }
  async function showOnEasel(w) {
    const pr = addCard(w, EASEL.x, -200, 1.2, `easel-${w}`);
    pr.el.classList.remove('tappable');
    sfx.pop();
    await pr.fly(EASEL.x, EASEL.y - 10, 1.25, 520);
    return pr;
  }

  // מחבואים: מוצאים את התמונה הנכונה. מחזיר האם הצליחה בניסיון ראשון בלי עזרה מלאה.
  async function findRound(kid, w, plan, stats) {
    const lv = plan.lv;
    const topicWords = TOPICS[plan.topic].words;
    // רמה 1: מסיחים מנושא אחר (שונה מאוד). אחר כך: מאותו נושא, קודם מילים שהיא כבר מכירה
    const otherTopics = Object.values(TOPICS).flatMap((t) => t.words).filter((x) => !topicWords.includes(x));
    const same = topicWords.filter((x) => x !== w);
    const known = shuffle(same.filter((x) => P.stage(kid.id, x) > 0));
    const pool = plan.level === 1 ? shuffle(otherTopics) : [...known, ...shuffle(same.filter((x) => !known.includes(x)))];
    const set = shuffle([w, ...pool.slice(0, lv.cards - 1)]);
    const gap = set.length >= 4 ? 225 : 250; const x0 = ROW_X - (gap * (set.length - 1)) / 2;
    const cards = set.map((c, k) => { const pr = addCard(c, x0 + gap * k, 1300, 0.95); pr.el.classList.add('armed'); pr.fly(pr.x, ROW_Y, 0.95, 450 + k * 110); return pr; });
    sfx.pop();
    pose('present'); face(0.45, 0.8, 0.4); expr('warm');
    await st.wait(700);
    const english = lv.englishOnly && P.stage(kid.id, w) >= plan.settled;
    const prompt = () => (english ? st.say('mika', W.whereEn(w, en(w)), 'en', { prompt: true }) : st.say('mika', W.whereHe(w, en(w)), 'he', { prompt: true }));
    const target = cards[set.indexOf(w)];
    const tIdx = set.indexOf(w);
    const gazeAt = (k) => (x0 + gap * k - TX) / 700;
    let wrongs = 0; let help = 0; let asked = false; let busy = false;
    const picked = new Promise((resolve) => {
      const stops = [];
      // סולם סבלנות: מבט → הצבעה → נוגעים ביחד
      stops.push(st.timer(PATIENCE.look, () => { help = Math.max(help, 1); T.gaze(gazeAt(tIdx), 0.5, now(), 0.4); st.say('mika', L.look, 'he').catch(() => {}); }));
      stops.push(st.timer(PATIENCE.point, () => { help = Math.max(help, 1); pose('point'); target.pulse(true); prompt().catch(() => {}); }));
      stops.push(st.timer(PATIENCE.together, () => { help = 2; stats.silences++; st.hand(target.el, { taps: 3 }).catch(() => {}); st.say('mika', W.here(w, en(w)), 'he').catch(() => {}); }));
      cards.forEach((pr, k) => pr.el.addEventListener('pointerup', () => {
        if (!pr.el.classList.contains('armed') || busy) return;
        if (set[k] === w) { stops.forEach((s) => s()); cards.forEach((q) => q.el.classList.remove('armed')); resolve(pr); return; }
        // תמונה אחרת: לא "טעות" – עוד מילה ללמוד. מיקה אומרת מה זה, ושואלת שוב בנחת
        sfx.boing(); pr.wiggle(); T.gaze(gazeAt(k), 0.5, now());
        if (!asked) return;
        wrongs++; if (wrongs >= 2) { help = Math.max(help, 2); target.pulse(true); }
        busy = true; st.hush();
        (async () => {
          expr('warm');
          await st.say('mika', W.that(set[k], en(set[k])), 'en');
          if (wrongs === 1) await st.say('mika', L.almost, 'he');
          await prompt();
        })().catch(() => {}).finally(() => { busy = false; });
      }));
    });
    P.exposed(kid.id, w, 'lesson');
    await Promise.race([prompt().catch(() => {}), picked]);
    asked = true;
    const pr = await picked;
    target.pulse(false); st.hush();
    for (const c of cards) if (c !== pr) c.fly(c.x, 1300, 0.95, 380);
    sfx.sparkle();
    pr.fly(EASEL.x, EASEL.y - 10, 1.3, 450);
    await st.wait(470);
    const box = pr.el.getBoundingClientRect(); fun.burst(box.left + box.width / 2, box.top + box.height / 2);
    pr.el.classList.add('cheer');
    pose('cheer', 0.35); expr('proud'); face(0);
    uniCheer(kid);
    const first = wrongs === 0 && help < 2;
    P.choice(kid.id, w, { correct: first, help, distractor: plan.level === 1 ? 'silly' : 'real', context: 'lesson' });
    if (!first) P.choice(kid.id, w, { correct: true, help: Math.max(1, help), context: 'lesson' });
    stats.attempts++; if (first) stats.firstTry++;
    // שבח שמתאר מה עשתה, והמילה שוב באנגלית
    await st.say('mika', Math.random() < 0.6 ? W.found(w, en(w)) : (wrongs ? L.praise[3] : pick(L.praise.slice(0, 3))), 'he');
    await st.say('mika', W.word(w, en(w)), 'en');
    pose('rest', 0.6); expr('happy');
    pr.fly(EASEL.x, -260, 1.2, 420);
    await st.wait(450);
    cards.forEach((c) => c.remove());
  }

  // מילה חדשה: מיקה מראה על כן הציור ומצביעה, אומרת, מתרגמת (כשצריך), ומזמינה להגיד איתה
  async function present(kid, w, plan, firstNew) {
    const card = await showOnEasel(w);
    pose('point', 0.5); face(0.6, 1, -0.2); expr('curious');
    await st.say('mika', W.thisIs(w, en(w)), 'en');
    face(0, 0, 0); expr('warm');
    if (P.needsHebrew(kid.id, w)) await st.say('mika', W.gloss(w, en(w), VOCAB[w].he), 'he');
    if (firstNew) await st.say('mika', L.sayWithMe, 'he');
    pose('present', 0.4);
    await st.say('mika', W.word(w, en(w)), 'en', { slow: true });
    unis[kid.id]?.U.mode('fly', now()); st.timer(1300, () => unis[kid.id]?.U.mode('idle', now()));
    P.exposed(kid.id, w, 'lesson');
    await st.wait(900);
    pose('rest', 0.6);
    await card.fly(EASEL.x, -260, 1.2, 420);
    card.remove();
  }

  // מיקה טועה בכוונה (פעם אחת, רק במילה מוכרת ובטעות ברורה)
  async function mistakeRound(kid, plan, stats) {
    const knownW = TOPICS[plan.topic].words.filter((x) => P.stage(kid.id, x) >= 2);
    if (!knownW.length) return;
    const w = pick(knownW);
    const other = pick(TOPICS[plan.topic].words.filter((x) => x !== w));
    const honest = Math.random() < 0.35;
    await st.say('mika', L.mistakeIntro, 'he');
    const card = await showOnEasel(w);
    pose('point', 0.5); face(0.6, 1, -0.2); expr('curious');
    const yes = st.addProp('yes', 960, 1300, { scale: 1, layer: 'front', id: 'm-yes' });
    const no = st.addProp('no', 1240, 1300, { scale: 1, layer: 'front', id: 'm-no' });
    yes.fly(960, ROW_Y, 1, 450); no.fly(1240, ROW_Y, 1, 520);
    await st.say('mika', W.isThis(honest ? w : other, en(honest ? w : other)), 'en', { prompt: true });
    face(0, 0, 0); expr('warm');
    let help = 0;
    const said = await new Promise((resolve) => {
      const stops = [st.timer(PATIENCE.point, () => { help = 1; st.replay().catch(() => {}); }), st.timer(PATIENCE.together + 6000, () => { stats.silences++; resolve(null); })];
      yes.el.addEventListener('pointerup', () => { stops.forEach((s) => s()); resolve(true); });
      no.el.addEventListener('pointerup', () => { stops.forEach((s) => s()); resolve(false); });
    });
    const right = said !== null && said === honest;
    if (said !== null) { stats.attempts++; if (right && !help) stats.firstTry++; }
    P.choice(kid.id, w, { correct: right, help, context: 'lesson-mistake' });
    if (right) { sfx.sparkle(); uniCheer(kid); pose('cheer', 0.35); expr(honest ? 'proud' : 'surprised'); }
    await st.say('mika', honest ? (said === false ? L.actuallyRight : L.wasRight) : (said === false ? L.caught : L.actuallyWrong), 'he');
    await st.say('mika', W.itIs(w, en(w)), 'en');
    pose('rest', 0.5); expr('happy');
    yes.fly(960, 1300, 1, 380); no.fly(1240, 1300, 1, 380);
    await card.fly(EASEL.x, -260, 1.2, 420);
    card.remove(); yes.remove(); no.remove();
  }

  // "What do you want?" – היא בוחרת, ומיקה ממדלת משפט שלם
  async function wantRound(kid, plan) {
    const opts = shuffle(TOPICS[plan.topic].words.filter((x) => P.stage(kid.id, x) >= 1)).slice(0, 3);
    if (opts.length < 2) return;
    await st.say('mika', L.wantIntro, 'he');
    const x0 = ROW_X - 125 * (opts.length - 1);
    const cards = opts.map((c, k) => { const pr = addCard(c, x0 + 250 * k, 1300, 0.95); pr.el.classList.add('armed'); pr.fly(pr.x, ROW_Y, 0.95, 450 + k * 110); return pr; });
    pose('present'); face(0, 0, 0);
    await st.say('mika', L.wantQ, 'en', { prompt: true });
    const k = await new Promise((resolve) => cards.forEach((pr, i) => pr.el.addEventListener('pointerup', () => resolve(i))));
    const w = opts[k];
    sfx.sparkle(); cards[k].el.classList.add('cheer'); uniCheer(kid);
    P.used(kid.id, w, { how: 'touch', modeled: true, context: 'lesson' });
    store.bumpInterest(kid.id, `lesson:${w}`);
    pose('chest', 0.4);
    await st.say('mika', W.want(w, en(w)), 'en');
    pose('rest', 0.5);
    cards.forEach((c) => c.fly(c.x, 1300, 0.95, 380));
    await st.wait(420); cards.forEach((c) => c.remove());
  }

  async function chooseUnicorn(kid, i) {
    face(0, 0, 0); expr('warm');
    await st.say('mika', sisters ? L.chooseUniName(kid.name) : L.chooseUni, 'he');
    const kinds = Object.keys(UNICORNS);
    const opts = kinds.map((k, j) => {
      const g = document.createElementNS(NS, 'g'); g.classList.add('uni-wrap', 'tappable', 'armed');
      g.innerHTML = `<g class="uni-pos" style="transform:translate(${760 + j * 290}px,900px) scale(0.48)"><g class="squish-wrap">${unicorn(k)}</g></g>`;
      st.layers.front.appendChild(g);
      const U = createUnicorn(g, { level: 3 });
      unis[`opt-${k}`] = { g, U };
      return { k, g, U };
    });
    const hint = st.timer(PATIENCE.look, () => st.say('mika', L.tapUni, 'he').catch(() => {}));
    const chosen = await new Promise((resolve) => opts.forEach((o) => o.g.addEventListener('pointerup', () => resolve(o))));
    hint();
    sfx.sparkle();
    chosen.U.mode('cheer', now());
    for (const o of opts) if (o !== chosen) { o.U.mode('fly', now()); o.g.firstChild.style.transition = 'transform 1.4s ease-in'; o.g.firstChild.style.transform = 'translate(1900px,200px) scale(.5)'; }
    M.setUnicorn(kid.id, chosen.k);
    await st.say('mika', L.pickedUni(UNICORNS[chosen.k].name), 'he');
    for (const o of opts) { o.g.remove(); delete unis[`opt-${o.k}`]; }
    placeUnicorn(kid, i);
  }

  try {
    // לא יותר משני שיעורים ביום לכל ילדה (זמן מסך בגיל הרך)
    if (players.every((p) => M.lessonsToday(p.id) >= 2)) { pose('wave'); await st.say('mika', L.rest, 'he'); return finish(false); }

    await st.wait(600);
    pose('wave', 0.5); face(0, 0, 0); expr('warm');
    await st.say('mika', sisters ? L.helloSis : L.hello(players[0].name), 'he');
    if (players.every((p) => M.memory(p.id).lessons.length === 0)) await st.say('mika', sisters ? L.firstTimeSis : L.firstTime, 'he');
    pose('rest', 0.6);

    // חד-קרן לכל ילדה
    for (const [i, kid] of players.entries()) {
      const m = M.memory(kid.id);
      if (!m.unicorn) { if (sisters) setTurn(kid.id); await chooseUnicorn(kid, i); continue; }
      const u = placeUnicorn(kid, i);
      u.U.mode('fly', now()); st.timer(1200, () => u.U.mode('idle', now()));
      if (m.level > (m.uniShown || 1)) {
        await st.wait(900);
        u.U.setLevel(m.level); m.uniShown = m.level; save();
        uniCheer(kid, 1800); expr('surprised');
        if (sisters) setTurn(kid.id);
        await st.say('mika', L.uniGrew(uniName(kid), m.level), 'he');
        expr('happy');
      }
    }
    if (!sisters) await st.say('mika', L.uniHi(uniName(players[0])), 'he').catch(() => {});

    const plans = players.map((p) => M.planLesson(p.id, p.track));
    const stats = players.map(() => ({ attempts: 0, firstTry: 0, silences: 0 }));

    // מה היא אוהבת ומה הנושא
    for (const [i, kid] of players.entries()) {
      if (sisters) { setTurn(kid.id); face(i ? 0.5 : -0.5, i ? 0.6 : -0.6, 0.2); await st.say('mika', L.turnOf(kid.name), 'he'); }
      const like = M.likes(kid.id)[0];
      if (like && LIKES[like]) { expr('warm'); await st.say('mika', L.remember(LIKES[like].he), 'he'); }
      if (!sisters || i === 0 || plans[i].topic !== plans[0].topic) await st.say('mika', L.topic(TOPICS[plans[i].topic].he), 'he');
    }
    face(0, 0, 0);

    // חזרה → חדשות → מחבואים, לסירוגין בין האחיות
    const segment = async (fn) => { for (const [i, kid] of players.entries()) { if (sisters) { setTurn(kid.id); await st.say('mika', L.turnOf(kid.name), 'he'); } await fn(kid, plans[i], stats[i], i); } };
    await segment(async (kid, plan, s) => {
      if (!plan.review.length) return;
      await st.say('mika', plan.review.length > 1 ? L.reviewMany : L.review, 'he');
      for (const w of plan.review) await findRound(kid, w, plan, s);
    });
    await segment(async (kid, plan) => {
      for (const [j, w] of plan.newWords.entries()) {
        await st.say('mika', L.newWord, 'he');
        await present(kid, w, plan, j === 0 && M.memory(kid.id).lessons.length < 3);
      }
    });
    await segment(async (kid, plan, s) => {
      const rounds = Math.max(plan.newWords.length * 2, plan.lv.rounds - plan.review.length);
      const order = [];
      for (let r = 0; order.length < rounds && r < 6; r++) for (const w of shuffle(plan.newWords)) if (order.length < rounds && order[order.length - 1] !== w) order.push(w);
      if (!order.length) return;
      await st.say('mika', L.findNow, 'he');
      for (const w of order) await findRound(kid, w, plan, s);
    });
    await segment(async (kid, plan, s) => { if (plan.lv.mistake) await mistakeRound(kid, plan, s); });
    await segment(async (kid, plan) => { if (plan.lv.want) await wantRound(kid, plan); });

    // סיום: מה למדנו, מה הלאה, משימה קטנה לבית
    setTurn(null); face(0, 0, 0); expr('proud');
    for (const [i, kid] of players.entries()) {
      const plan = plans[i];
      const res = M.finishLesson(kid.id, kid.track, { topic: plan.topic, words: plan.newWords, ...stats[i] });
      if (sisters) { setTurn(kid.id); await st.say('mika', L.turnOf(kid.name), 'he'); }
      if (plan.newWords.length) {
        await st.say('mika', L.learnedToday, 'he');
        for (const w of plan.newWords) { const c = await showOnEasel(w); await st.say('mika', W.word(w, en(w)), 'en'); await c.fly(EASEL.x, -260, 1.2, 380); c.remove(); }
      }
      await st.say('mika', res.change > 0 ? L.nextUp : L.nextSame, 'he');
      await st.say('mika', L.homeTask[plan.topic], 'he');
    }
    setTurn(null);
    pose('wave', 0.5); expr('warm');
    Object.values(unis).forEach((u) => u.U.mode('cheer', now()));
    fun.finale();
    await st.say('mika', sisters ? L.byeSis : L.bye(players[0].name), 'he');
    await st.wait(1200);
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}
