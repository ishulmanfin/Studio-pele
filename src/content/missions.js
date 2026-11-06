// משימה לבית: משחק קצר מחוץ למסך, שנגזר ממה שהילדה עשתה בביקור הזה.
// המשימה נבנית ממילה שכבר מוכרת לה (לא מהחדשה ביותר), כדי שתצליח גם בבית.
// דיווח הורה נשמר בנפרד ולא משנה את שלבי הראיות, שמבוססים רק על פעולות במשחק.
import { VOCAB } from './vocab.js';
import { withArticle, he } from './cafe.js';
import * as P from '../engine/progress.js';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function comfortable(pid, items) {
  return [...items].filter((id) => VOCAB[id]?.group).sort((a, b) => P.stage(pid, b) - P.stage(pid, a))[0];
}

// בידוד ציטוטים באנגלית בתוך טקסט עברי, כדי שהמירכאות לא יקפצו לצד הלא נכון
const iso = (t) => t.replace(/"([^"]*[A-Za-z][^"]*)"/g, '\u2066"$1"\u2069');

export function makeMission(kids, items, opts = {}) {
  const m = build(kids, items, opts);
  return { ...m, parent: iso(m.parent) };
}

function build(kids, items, { sisters = false } = {}) {
  if (sisters) {
    const older = kids.find((k) => k.track === 'older') || kids[0];
    const younger = kids.find((k) => k !== older) || kids[0];
    const food = comfortable(younger.id, items.filter((i) => VOCAB[i]?.group === 'food')) || 'banana';
    const drink = comfortable(older.id, items.filter((i) => VOCAB[i]?.group === 'drink')) || 'water';
    return {
      items: [food, drink],
      phrase: `${cap(withArticle(food))} and ${withArticle(drink)}, please.`,
      parent: `בית קפה בסלון: אתם האורחים. ${younger.name} מגישה ${he(food)}, ו${older.name} מביאה ${he(drink)}. אחר כך מתחלפים, והן מזמינות מכם.`,
    };
  }
  const kid = kids[0];
  const w = comfortable(kid.id, items) || 'banana';
  if (kid.track === 'younger') {
    return {
      items: [w],
      phrase: `${cap(VOCAB[w].en)}, please.`,
      parent: `בארוחה הבאה שימו על השולחן ${he(w)} ועוד דבר אחד. בקשו בחיוך "${cap(VOCAB[w].en)}, please" ותנו לה להגיש. אם היא אומרת את זה בעצמה, יופי. אין צורך לבקש ממנה לחזור על המילה.`,
    };
  }
  const canAsk = P.stage(kid.id, 's_canihave') >= 2;
  return {
    items: [w],
    phrase: canAsk ? `Can I have ${withArticle(w)}, please?` : `I want ${withArticle(w)}.`,
    parent: canAsk
      ? `מסעדת צעצועים: קודם אתם המלצרים והיא מזמינה "Can I have ${withArticle(w)}, please?". אחר כך מתחלפים. אפשר לבקש גם דברים מצחיקים, כמו נעל.`
      : `מסעדת צעצועים: היא המלצרית, ואתם מזמינים "I want ${withArticle(w)}". אחר כך מתחלפים. אם היא מזמינה בעברית, עונים באנגלית בלי לתקן.`,
  };
}

/** משחק לבית אחרי אולפן הלהקה */
export function makeBandMission(kids, { sisters = false } = {}) {
  const intro = 'ואפשר לשחק להקה גם בבית. ככה אומרים:';
  if (sisters) {
    return { intro, items: ['stop', 'go'], phrase: 'Everybody, stop!',
      parent: iso('משחק פסלים לשתיהן: שימו שיר. שייה אומרת "fast" או "slowly", ואלמה אומרת "Stop!" ו־"Go!". אתם רוקדים בדיוק לפי מה שהן אומרות.') };
  }
  const kid = kids[0];
  if (kid.track === 'younger') {
    return { intro, items: ['stop', 'go'], phrase: 'Stop! Go!',
      parent: iso('משחק פסלים: שימו שיר ורקדו ביחד. כשאתם אומרים "Stop!" כולם קופאים, וכשאתם אומרים "Go!" ממשיכים לרקוד. אחרי כמה סיבובים תנו לה להיות זו שאומרת.') };
  }
  return { intro, items: ['drum', 'xylo'], phrase: 'Daddy, play slowly!',
    parent: iso('תזמורת בסלון עם סירים וכפות: היא המנצחת ואומרת "Daddy, play fast!" או "Mommy, play slowly!", ואתם מנגנים בדיוק כך. אפשר גם להתבלבל בכוונה ולתת לה לתקן.') };
}
