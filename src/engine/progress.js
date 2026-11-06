// מנוע ראיות. כל אירוע נרשם מפעולה במשחק; השלב נגזר מהראיות, לא מהשלמת פרק.
//
// שלבים:
// 1 נחשפה   – שמעה/ראתה את הפריט בהקשר.
// 2 זיהתה עם עזרה – בחרה נכון אחרי רמז/הדגמה, או מול מסיח מצחיק בלבד.
// 3 הבינה בלי עזרה – לפחות 2 בחירות נכונות עצמאיות מול חלופה אמיתית.
// 4 השתמשה בהקשר מוכר – הרכיבה/אמרה את הבקשה בעצמה (במגע או בקול).
// 5 הצליחה בהקשר חדש – הבנה או שימוש עצמאי בהקשר שונה מזה שבו הצליחה קודם.
import { store, save } from './store.js';

export const STAGE_LABELS = {
  0: 'עוד לא נפגשה',
  1: 'נחשפה',
  2: 'זיהתה עם עזרה',
  3: 'הבינה בלי עזרה',
  4: 'השתמשה בהקשר מוכר',
  5: 'הצליחה בהקשר חדש',
};

function bucket(pid) {
  const p = store.data.progress;
  p[pid] = p[pid] || { items: {}, sessions: [] };
  return p[pid];
}

function item(pid, id) {
  const b = bucket(pid).items;
  b[id] = b[id] || {
    exposures: 0, helped: 0, sillyOnly: 0, independent: 0, misses: 0,
    usedTouch: 0, usedSpoken: 0, usedModeled: 0, transfer: 0,
    contexts: [], successContexts: [], lastSeen: 0, sessions: [],
  };
  return b[id];
}

let currentSession = {};
export function beginSession(pid, episodeId) {
  const s = { id: Date.now() + ':' + pid, episode: episodeId, start: Date.now(), end: null, events: 0 };
  bucket(pid).sessions.push(s);
  bucket(pid).sessions = bucket(pid).sessions.slice(-40);
  currentSession[pid] = s;
  save();
  return s;
}
export function endSession(pid) {
  const s = currentSession[pid];
  if (s) { s.end = Date.now(); save(); }
}

function touchSession(pid, it) {
  const s = currentSession[pid];
  if (!s) return;
  s.events++;
  if (!it.sessions.includes(s.id)) it.sessions.push(s.id);
  it.sessions = it.sessions.slice(-12);
}

/** חשיפה: הילדה שמעה את הפריט בהקשר משמעותי. */
export function exposed(pid, ids, context) {
  for (const id of [].concat(ids)) {
    const it = item(pid, id);
    it.exposures++; it.lastSeen = Date.now();
    if (!it.contexts.includes(context)) it.contexts.push(context);
    touchSession(pid, it);
  }
  save();
}

/**
 * תוצאה של בחירה.
 * help: 0 = בלי עזרה, 1+ = כמה רמזים היו לפני הבחירה
 * distractor: 'silly' | 'real'
 */
const plisten = new Set();
export const onProgress = (f) => { plisten.add(f); return () => plisten.delete(f); };
export function choice(pid, ids, { correct, help = 0, distractor = 'real', context }) {
  plisten.forEach((f) => { try { f({ type: 'choice', pid, correct }); } catch {} });
  for (const id of [].concat(ids)) {
    const it = item(pid, id);
    it.lastSeen = Date.now();
    touchSession(pid, it);
    if (!correct) { it.misses++; continue; }
    if (help > 0) it.helped++;
    else if (distractor === 'silly') it.sillyOnly++;
    else {
      const isNew = it.successContexts.length > 0 && !it.successContexts.includes(context);
      it.independent++;
      if (isNew) it.transfer++;
    }
    if (!it.successContexts.includes(context)) it.successContexts.push(context);
  }
  save();
}

/** שימוש: הילדה ייצרה את הביטוי. how: 'touch' | 'spoken' ; modeled: האם הודגם ממש לפני */
export function used(pid, ids, { how = 'touch', modeled = false, context }) {
  for (const id of [].concat(ids)) {
    const it = item(pid, id);
    it.lastSeen = Date.now();
    touchSession(pid, it);
    if (modeled) { it.usedModeled++; continue; }
    const isNew = it.successContexts.length > 0 && !it.successContexts.includes(context) && (it.usedTouch + it.usedSpoken) > 0;
    if (how === 'spoken') it.usedSpoken++; else it.usedTouch++;
    if (isNew) it.transfer++;
    if (!it.successContexts.includes(context)) it.successContexts.push(context);
  }
  save();
}

export function stage(pid, id) {
  const it = bucket(pid).items[id];
  if (!it) return 0;
  const usedIndep = it.usedTouch + it.usedSpoken;
  if (it.transfer > 0 && (it.independent >= 2 || usedIndep > 0)) return 5;
  if (usedIndep > 0) return 4;
  if (it.independent >= 2) return 3;
  if (it.helped > 0 || it.sillyOnly > 0 || it.independent === 1 || it.usedModeled > 0) return 2;
  if (it.exposures > 0) return 1;
  return 0;
}

export function raw(pid, id) { return bucket(pid).items[id] || null; }
export function allItems(pid) { return bucket(pid).items; }
export function sessions(pid) { return bucket(pid).sessions; }

/** האם הילדה זקוקה לעזרה בעברית עבור פריט (לשייה). */
export function needsHebrew(pid, id) {
  const it = bucket(pid).items[id];
  if (!it) return true;
  // עצמאות של 3 הבנות מבטלת עזרה; שתי החטאות אחרונות מחזירות אותה
  return it.independent < 3 || it.misses > it.independent;
}

/**
 * בחירת פריטים לבקשות: פריטים עם ראיות חלשות קודמים, בלי לחזור על אותו פריט ברצף,
 * ולכל היותר פריט חדש אחד במפגש.
 */
export function pickTargets(pid, pool, n, { maxNew = 1, avoid = [] } = {}) {
  const scored = pool.filter((id) => !avoid.includes(id)).map((id) => {
    const st = stage(pid, id);
    const it = bucket(pid).items[id];
    const age = it ? (Date.now() - it.lastSeen) / 3.6e6 : 999;
    const score = (st === 0 ? 2.2 : 5 - st) + Math.min(age, 48) / 24 + Math.random() * 0.8;
    return { id, st, score };
  }).sort((a, b) => b.score - a.score);
  const out = [];
  let news = 0;
  for (const s of scored) {
    if (out.length >= n) break;
    if (s.st === 0) { if (news >= maxNew) continue; news++; }
    out.push(s.id);
  }
  for (const s of scored) if (out.length < n && !out.includes(s.id)) out.push(s.id);
  return out;
}
