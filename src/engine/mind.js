// "מיקה זוכרת": הזיכרון של המורה לכל ילדה – רמה, חד-קרן, מה היא אוהבת, איך עברו השיעורים,
// ואיזה נושא ומילים מתאימים לשיעור הבא. הראיות על כל מילה נשמרות במנוע ההתקדמות (progress.js).
import { store, save } from './store.js';
import * as P from './progress.js';
import { TOPICS, LIKES, LEVELS, START_LEVEL, MAX_LEVEL, UP_AT, DOWN_AT, topicOf } from '../content/lesson.js';

const DAY = 864e5;

export function memory(pid) {
  const d = store.data;
  d.teacher = d.teacher || {};
  const p = store.profile(pid);
  d.teacher[pid] = d.teacher[pid] || { level: START_LEVEL[p.track] || 1, unicorn: null, likes: [], lessons: [], uniShown: 1 };
  return d.teacher[pid];
}

export function setLikes(pid, likes) { memory(pid).likes = likes; save(); }
export function setUnicorn(pid, kind) { memory(pid).unicorn = kind; save(); }
export const lessonsToday = (pid) => memory(pid).lessons.filter((l) => new Date(l.at).toDateString() === new Date().toDateString()).length;

/** מה היא אוהבת: מה שההורה סימן, ואחריו מה שהיא בוחרת לשחק בפועל */
export function likes(pid) {
  const m = memory(pid);
  const out = [...m.likes];
  const i = store.interests(pid);
  const play = { animals: (i.animals || 0) + (i.silly || 0), colors: i.rainbow || 0, food: Object.entries(i).filter(([k]) => k.startsWith('food:')).reduce((s, [, v]) => s + v, 0), music: (i.music || 0) + (i.karaoke || 0) };
  for (const [k] of Object.entries(play).sort((a, b) => b[1] - a[1])) if (play[k] > 2 && !out.includes(k)) out.push(k);
  return out;
}

/** נושא השיעור: ממשיכים נושא עד שרוב המילים בו מבוססות; נושא חדש – לפי מה שהיא אוהבת */
export function chooseTopic(pid, track) {
  const m = memory(pid);
  const last = m.lessons[m.lessons.length - 1];
  const settled = track === 'younger' ? 2 : 3;
  const done = (t) => TOPICS[t].words.filter((w) => P.stage(pid, w) >= settled).length / TOPICS[t].words.length;
  if (last && done(last.topic) < 0.6) return last.topic;
  const fav = likes(pid).map((k) => LIKES[k]?.topic).filter(Boolean);
  const order = [...new Set([...fav, 'animal', 'color', 'food'])];
  return order.find((t) => done(t) < 0.6) || order[0];
}

/**
 * תכנון שיעור: מילים חדשות (נשארות "חדשות" עד שהן נקלטות – כמו סיפור שחוזר על עצמו),
 * מילים לחזרה (מועד לפי מרווחים: יום, יומיים, 4 ימים, שבוע), ופרמטרי הרמה.
 */
export function planLesson(pid, track) {
  const m = memory(pid);
  const lv = LEVELS[m.level];
  const topic = chooseTopic(pid, track);
  const pool = TOPICS[topic].words;
  const settled = track === 'younger' ? 2 : 3;
  // מילים "בעבודה": נפגשו אבל עוד לא מבוססות – הן ממשיכות, לפני מילים חדשות לגמרי
  const working = pool.filter((w) => P.stage(pid, w) > 0 && P.stage(pid, w) < settled);
  const fresh = pool.filter((w) => P.stage(pid, w) === 0);
  const newWords = [...working, ...fresh].slice(0, lv.newWords);
  // חזרה: כל מה שהיא כבר מכירה (מכל הנושאים), לפי מועד החזרה
  const all = Object.values(TOPICS).flatMap((t) => t.words);
  const due = (w) => {
    const it = P.raw(pid, w); if (!it) return -1;
    const gap = [1, 2, 4, 7][Math.min(3, Math.max(0, P.stage(pid, w) - 1))] * DAY;
    return (Date.now() - it.lastSeen) / gap;
  };
  const review = all.filter((w) => P.stage(pid, w) >= 1 && !newWords.includes(w)).sort((a, b) => due(b) - due(a)).slice(0, lv.review);
  return { topic, level: m.level, lv, newWords, review, settled };
}

/** סיום שיעור: מחשבים הצלחה בניסיון ראשון, ומחליטים על הרמה הבאה */
export function finishLesson(pid, track, { topic, words, firstTry, attempts, silences }) {
  const m = memory(pid);
  const acc = attempts ? firstTry / attempts : 0;
  m.lessons.push({ at: Date.now(), topic, words, acc: Math.round(acc * 100) / 100, attempts, silences, level: m.level });
  m.lessons = m.lessons.slice(-60);
  const prev = m.lessons[m.lessons.length - 2];
  let change = 0;
  if (attempts >= 3 && acc >= UP_AT && prev && prev.level === m.level && prev.acc >= UP_AT && m.level < MAX_LEVEL[track]) change = 1;
  else if (attempts >= 3 && (acc < DOWN_AT || silences >= 3) && m.level > 1) change = -1;
  m.level += change;
  save();
  return { acc, change, level: m.level };
}

/** לאזור ההורים */
export function report(pid) {
  const m = memory(pid);
  const all = Object.values(TOPICS).flatMap((t) => t.words);
  return {
    level: m.level, unicorn: m.unicorn, likes: m.likes, lessons: m.lessons.length,
    last: m.lessons[m.lessons.length - 1] || null,
    words: all.filter((w) => P.stage(pid, w) > 0).map((w) => ({ w, stage: P.stage(pid, w), topic: topicOf(w) })),
  };
}
