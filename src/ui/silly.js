// "טוטו טועה!" – משחק קצר שנפתח כשנוגעים בטוטו בסטודיו.
// טוטו מחזיק תמונה ואומר מילה או משפט; הילדה מחליטה אם הוא צודק (✓) או טועה (✗).
// שיפוט כן/לא הוא 50% ניחוש, ולכן נרשם כראיה חלשה (כמו מסיח מצחיק) ולא מקדם לבד ל"הבנה בלי עזרה".
import { createStage, Abort } from '../engine/stage.js';
import { createFun } from '../engine/fun.js';
import { HELP } from '../content/help.js';
import { studioSet } from '../art/sets.js';
import { sfx, unlockAudio } from '../engine/voice.js';
import { store } from '../engine/store.js';
import * as P from '../engine/progress.js';
import { VOCAB } from '../content/vocab.js';
import { LINES, TOTO, youngerItem, olderItem } from '../content/silly.js';
import { hudHtml } from './cafe.js';

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const BASE = ['banana', 'apple', 'water', 'milk', 'cookie', 'juice'];

export async function runSilly(root, { players }, onDone) {
  unlockAudio();
  const sisters = players.length > 1;
  root.innerHTML = `<div class="stage"></div>${hudHtml(players)}`;
  const st = createStage(root.querySelector('.stage'), { bg: studioSet() });
  const hud = root.querySelector('.hud');
  const fun = createFun(root, { music: true });
  const mika = st.addActor('mika', 260, 930, { scale: 0.85 });
  const toto = st.addActor('toto', 820, 930, { scale: 1.05 });
  for (const p of players) P.beginSession(p.id, 'silly');

  hud.querySelector('.hud-replay').addEventListener('pointerup', () => st.replay().catch(() => {}));
  hud.querySelector('.hud-home').addEventListener('pointerup', () => {
    const c = root.querySelector('.exit-confirm'); c.classList.add('show'); st.hush(); st.say('mika', HELP.exit, 'he').catch(() => {});
    c.querySelector('.yes').onpointerup = () => finish(true);
    c.querySelector('.no').onpointerup = () => c.classList.remove('show');
  });
  const setTurn = (pid) => hud.querySelectorAll('.turn-chip').forEach((c) => c.classList.toggle('on', c.dataset.pid === pid));

  let finished = false;
  function finish(early = false) {
    if (finished) return; finished = true;
    for (const p of players) P.endSession(p.id);
    fun.destroy();
    st.destroy();
    onDone?.({ early, overTime: false });
  }

  try {
    const seen = players.some((p) => (store.interests(p.id).silly || 0) > 0);
    toto.anim('hop', 600); sfx.bark();
    await st.say('mika', seen ? LINES.introShort : LINES.intro, 'he');
    const yes = st.addProp('yes', 1220, 560, { scale: 1.1, layer: 'fx', id: 'yes' });
    const no = st.addProp('no', 400, 560, { scale: 1.1, layer: 'fx', id: 'no' });

    // סבבים: לכל ילדה לפי המסלול שלה; באחיות – לסירוגין
    const rounds = [];
    for (const kid of players) rounds.push(...planFor(kid, sisters ? 3 : (kid.track === 'younger' ? 4 : 5)).map((r) => ({ ...r, kid })));
    const order = sisters ? interleave(rounds, players) : rounds;
    let caughtOnce = false;
    let asked = 0;
    let first = !seen;
    for (const r of order) {
      if (sisters) { setTurn(r.kid.id); await st.say('mika', LINES.turnOf(r.kid.name), 'he'); }
      const pr = st.addProp(r.shown, 1000, 470, { scale: 0.2, layer: 'fx', id: `show-${r.shown}`, tappable: false });
      pr.fly(1000, 470, 1.15, 380); sfx.pop();
      toto.anim('wave', 700);
      await st.wait(500);
      await st.say('toto', r.line, 'en', { prompt: true });
      if (asked < 2) { asked++; await st.say('mika', LINES.introShort, 'he'); } // שתי הפעמים הראשונות מיקה שואלת בקול
      const t = await st.waitTap([{ el: yes.el, id: 'yes' }, { el: no.el, id: 'no' }], {
        demo: first ? [yes.el, no.el] : undefined, demoAt: 1500,
        hints: [{ at: 9000, run: async () => { await st.say('toto', r.line, 'en', { slow: true }); } }],
      });
      first = false;
      const saidNo = t.id === 'no';
      const right = saidNo !== r.truth;
      for (const id of r.ids) P.choice(r.kid.id, id, { correct: right, help: 0, distractor: 'silly', context: 'toto:silly' });
      store.bumpInterest(r.kid.id, 'silly');
      if (!r.truth && saidNo) {
        toto.mood('oops'); sfx.boing(); toto.anim('flop', 1300); pr.wiggle();
        await st.say('toto', r.fix, 'en');
        st.fx('sparkle', 1000, 470);
        if (!caughtOnce) { caughtOnce = true; await st.say('mika', LINES.caught, 'he'); }
      } else if (!r.truth) {
        toto.anim('spin', 800); sfx.boing();
        await st.say('mika', LINES.missed, 'he');
        toto.mood('oops'); await st.say('toto', r.fix, 'en');
      } else if (!saidNo) {
        toto.mood('happy'); sfx.sparkle(); toto.anim('hop', 700);
        await st.say('toto', TOTO.yesThanks, 'en');
      } else {
        await st.say('mika', LINES.fooled, 'he');
        toto.mood('happy'); await st.say('toto', r.line, 'en');
      }
      toto.mood('');
      await st.wait(700);
      pr.remove();
      await st.wait(600);
    }
    yes.remove(); no.remove();
    setTurn(null);
    toto.anim('wave', 1200);
    await st.say('mika', sisters ? LINES.bye : LINES.byeOne, 'he');
    await fun.finale();
    finish(false);
  } catch (e) {
    if (!(e instanceof Abort)) { console.error(e); finish(true); }
  }
}

/** תוכנית סבבים: יותר טעויות מאשר אמת (זה החלק המצחיק), ורק מילים שהילדה כבר פגשה */
function planFor(kid, n) {
  const met = Object.keys(P.allItems(kid.id)).filter((id) => VOCAB[id]?.group && P.stage(kid.id, id) > 0);
  const pool = met.length >= 3 ? met : BASE.slice(0, kid.track === 'younger' ? 3 : 6);
  const truths = shuffle([false, false, true, ...Array(Math.max(0, n - 3)).fill(0).map((_, i) => i % 2 === 0)]).slice(0, n);
  const out = [];
  for (const truth of truths) {
    const shown = pick(pool);
    const other = pick(pool.filter((x) => x !== shown)) || 'shoe';
    if (kid.track === 'younger') {
      const it = youngerItem(shown, truth ? shown : other);
      out.push({ ...it, ids: [it.said] });
    } else if (Math.random() < 0.5) {
      const it = olderItem(shown, { name: truth ? shown : other });
      out.push({ ...it, ids: [it.said] });
    } else {
      const isDrink = VOCAB[shown].group === 'drink';
      const verb = truth ? (isDrink ? 'drink' : 'eat') : (isDrink ? 'eat' : 'drink');
      const it = olderItem(shown, { verb });
      out.push({ ...it, ids: [shown] });
    }
  }
  return out;
}

function interleave(rounds, players) {
  const by = players.map((p) => rounds.filter((r) => r.kid === p));
  const out = [];
  for (let i = 0; i < Math.max(...by.map((b) => b.length)); i++) for (const b of by) if (b[i]) out.push(b[i]);
  return out;
}
