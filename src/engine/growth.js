// אוצר מילים שגדל: מילה חדשה נפתחת רק כשרוב המילים שהילדה כבר פגשה מבוססות אצלה,
// רק מתוך חבילות שההורה אישר, ולכל היותר מילה חדשה אחת בביקור. סדר המילים החדשות מושפע ממה שהיא בוחרת.
import { PACKS } from '../content/library.js';
import { VOCAB } from '../content/vocab.js';
import { store } from './store.js';
import * as P from './progress.js';

// שלב שנחשב "מבוסס": לאלמה זיהוי (2), לשייה הבנה עצמאית (3)
export const SETTLED = { younger: 2, older: 3 };
const THRESHOLD = { younger: 0.6, older: 0.5 };

export function approvedWords(track, group) {
  return PACKS.filter((p) => store.packStatus(p.id) === 'approved' && p.tracks.includes(track))
    .flatMap((p) => p.items.map((i) => i.id))
    .filter((id) => !group || VOCAB[id].group === group);
}

export function readiness(pid, ids, min) {
  if (!ids.length) return 1;
  return ids.filter((id) => P.stage(pid, id) >= min).length / ids.length;
}

// מה היא אוהבת לבחור: אוכל או שתייה (לפי הבחירות במזווה)
function groupTaste(pid) {
  const t = { food: 0, drink: 0 };
  for (const [k, n] of Object.entries(store.interests(pid))) {
    const id = k.startsWith('food:') ? k.slice(5) : null;
    if (id && VOCAB[id]) t[VOCAB[id].group] += n;
  }
  return t;
}

function orderByTaste(pid, ids) {
  const t = groupTaste(pid);
  return [...ids].sort((a, b) => (t[VOCAB[b].group] || 0) - (t[VOCAB[a].group] || 0));
}

/**
 * מילים לביקור. base = המילים הקבועות של הפרק; firstNew = המילה החדשה המובנית (לאלמה: cookie).
 * מחזיר { known: מילים שכבר נפגשו, fresh: מילה חדשה אחת או null }
 */
export function wordsForVisit(pid, track, base, { firstNew = null } = {}) {
  const extra = [...(firstNew ? [firstNew] : []), ...approvedWords(track).filter((id) => id !== firstNew)];
  const met = extra.filter((id) => P.stage(pid, id) > 0);
  const known = [...base, ...met];
  const candidates = orderByTaste(pid, extra.filter((id) => P.stage(pid, id) === 0));
  // המילה המובנית תמיד ראשונה; מילים מהספרייה רק כשהמוכרות מבוססות
  let fresh = null;
  if (firstNew && candidates.includes(firstNew)) fresh = firstNew;
  else if (candidates.length && readiness(pid, known, SETTLED[track]) >= THRESHOLD[track]) fresh = candidates[0];
  return { known, fresh };
}

/** לאזור ההורים: מה הילדה פגשה מכל חבילה, ומה היא צריכה כדי לפגוש את הבאה */
export function growthReport(pid, track, base) {
  const { known, fresh } = wordsForVisit(pid, track, base, { firstNew: track === 'younger' ? 'cookie' : null });
  return { known, fresh, ready: readiness(pid, known, SETTLED[track]), threshold: THRESHOLD[track] };
}
