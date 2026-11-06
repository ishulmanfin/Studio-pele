// "טוטו טועה!" – טוטו מציג תמונה ואומר משהו, לפעמים נכון ולפעמים בטעות מצחיקה. הילדה שופטת: ✓ או ✗.
// זו בדיקת הבנה הפוכה: כדי לתפוס טעות צריך לדעת מה המילה אומרת. הקשר חדש = ראיה לשלב 5.
import { VOCAB } from './vocab.js';
import { withArticle } from './cafe.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export const SILLY_META = {
  id: 'silly',
  review: { language: 'approved', age: 'approved', rights: 'original', qa: 'approved', version: '1.0' },
};

export const LINES = {
  intro: 'טוטו רוצה להראות לך משהו. אבל הוא קצת מתבלבל! אם הוא צודק, נוגעים ב־✓. אם הוא טועה, נוגעים ב־✗.',
  introShort: 'טוטו צודק או טועה?',
  caught: 'תפסת את טוטו!',
  agreed: 'נכון, טוטו צדק.',
  fooled: 'אוי, טוטו דווקא צדק הפעם.',
  missed: 'טוטו התבלבל, וזה עבר.',
  turnOf: (n) => `תור של ${n}.`,
  bye: 'טוטו הולך לנוח. תודה שתיקנתן אותו!',
  byeOne: 'טוטו הולך לנוח. תודה שתיקנת אותו!',
};

/** סבב לאלמה: תמונה + מילה */
export function youngerItem(shown, said) {
  return { shown, said, line: `${cap(VOCAB[said].en)}!`, truth: shown === said, fix: `Oops! ${cap(VOCAB[shown].en)}!` };
}

/** סבב לשייה: משפט עם פועל – לשתות או לאכול */
export function olderItem(shown, kind) {
  const isDrink = VOCAB[shown].group === 'drink';
  // kind: 'name' = "This is …" , 'verb' = "I drink / I eat …"
  if (kind.name) {
    const said = kind.name;
    return { shown, said, line: `This is ${withArticle(said)}.`, truth: said === shown, fix: `Oops! This is ${withArticle(shown)}!` };
  }
  const verb = kind.verb; // 'drink' | 'eat'
  const truth = (verb === 'drink') === isDrink;
  return { shown, said: shown, line: `I ${verb} ${withArticle(shown)}!`, truth, fix: truth ? null : `Oops! I ${isDrink ? 'drink' : 'eat'} ${withArticle(shown)}!` };
}

export const TOTO = { yesThanks: 'Yes!', oops: 'Oops!', ready: 'Look!' };
