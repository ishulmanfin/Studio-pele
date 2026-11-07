// "השיעור של מיקה": מיקה מלמדת כל ילדה בקצב שלה, זוכרת מה היא אוהבת, ומעלה רמה משיעור לשיעור.
// עקרונות (מתוך /docs/teacher.md והמחקר): חום וסבלנות לפני הכל. אין צליל כישלון, אין לחץ זמן,
// שתיקה איננה טעות. השבח מתאר מה הילדה עשתה, לא "את חכמה". בכל שיעור: שלום אישי → חזרה →
// מילים חדשות → מציאה → (מיקה טועה בכוונה) → סיום חם עם משימה קטנה לבית.
export const LESSON_META = { id: 'lesson', review: { language: 'approved', age: 'approved', rights: 'original', qa: 'approved', version: '1.0' } };

// מילים שיש להן תמונה ברורה. קבוצה = נושא שיעור.
export const TOPICS = {
  animal: { he: 'חיות', words: ['cat', 'dog', 'cow', 'duck', 'fish', 'bird', 'frog', 'horse', 'sheep', 'lion'] },
  color: { he: 'צבעים', words: ['red', 'yellow', 'blue', 'green', 'purple', 'c_orange'] },
  food: { he: 'אוכל ושתייה', words: ['apple', 'banana', 'cookie', 'water', 'milk', 'juice'] },
};
export const topicOf = (w) => Object.keys(TOPICS).find((k) => TOPICS[k].words.includes(w));

// מה הילדה אוהבת (נבחר באזור ההורים) → מה מיקה אומרת, ולאיזה נושא זה מושך
export const LIKES = {
  unicorns: { he: 'חדי קרן', topic: 'color' },
  animals: { he: 'חיות', topic: 'animal' },
  colors: { he: 'צבעים', topic: 'color' },
  food: { he: 'אוכל טעים', topic: 'food' },
  music: { he: 'מוזיקה ושירים', topic: null },
  dance: { he: 'לרקוד', topic: null },
  princess: { he: 'נסיכות', topic: 'color' },
  space: { he: 'כוכבים וחלל', topic: 'color' },
};

// רמות. younger (אלמה) עד רמה 4, older (שייה) עד 6.
// cards = כמה תמונות לבחירה · newWords = מילים חדשות בשיעור · review = מילים לחזרה
// englishOnly = השאלה באנגלית בלבד למילים שכבר מבוססות · mistake = מיקה טועה בכוונה · want = "What do you want?"
export const LEVELS = {
  1: { cards: 2, newWords: 1, review: 1, englishOnly: false, mistake: false, want: false, rounds: 4 },
  2: { cards: 2, newWords: 2, review: 2, englishOnly: false, mistake: false, want: false, rounds: 5 },
  3: { cards: 3, newWords: 2, review: 2, englishOnly: false, mistake: true, want: false, rounds: 5 },
  4: { cards: 3, newWords: 2, review: 3, englishOnly: true, mistake: true, want: false, rounds: 6 },
  5: { cards: 4, newWords: 3, review: 3, englishOnly: true, mistake: true, want: true, rounds: 6 },
  6: { cards: 4, newWords: 3, review: 3, englishOnly: true, mistake: true, want: true, rounds: 7 },
};
export const START_LEVEL = { younger: 1, older: 2 };
export const MAX_LEVEL = { younger: 4, older: 6 };
// עלייה: שני שיעורים ברצף עם 85% הצלחה בניסיון ראשון. ירידה: מתחת ל-60%, או הרבה שתיקות.
export const UP_AT = 0.85;
export const DOWN_AT = 0.6;
// סבלנות: מתי מיקה עוזרת (מילישניות) – לאט, בלי לחץ
export const PATIENCE = { look: 7000, point: 14000, together: 22000 };

const cap = (s) => s[0].toUpperCase() + s.slice(1);
// "a cat" / "an apple" / "water" / "red"
export function article(w, en) {
  if (topicOf(w) === 'color' || ['water', 'milk', 'juice'].includes(w)) return en;
  return /^[aeiou]/i.test(en) ? `an ${en}` : `a ${en}`;
}
const the = (w, en) => (topicOf(w) === 'color' ? en : `the ${en}`);

// שורות לכל מילה. en = המילה באנגלית, he = בעברית
export const W = {
  thisIs: (w, en) => `This is ${article(w, en)}!`,
  word: (w, en) => `${cap(en)}!`,
  whereEn: (w, en) => `Where is ${the(w, en)}?`,
  whereHe: (w, en) => (topicOf(w) === 'color' ? `איפה הצבע ${en}?` : `איפה ה־${en}?`),
  that: (w, en) => `That's ${article(w, en)}.`,
  isThis: (w, en) => `Is this ${article(w, en)}?`,
  itIs: (w, en) => `It's ${article(w, en)}!`,
  found: (w, en) => (topicOf(w) === 'color' ? `מצאת את הצבע ${en}!` : `מצאת את ה־${en}!`),
  here: (w, en) => (topicOf(w) === 'color' ? `הנה הצבע ${en}. בואי ניגע ביחד.` : `הנה ה־${en}. בואי ניגע ביחד.`),
  gloss: (w, en, he) => `${en} זה ${he}.`,
  want: (w, en) => `I want ${article(w, en)}!`,
};

export const L = {
  // פתיחה – חם ואישי, בשם
  hello: (name) => `שלום ${name}! איזה כיף שבאת.`,
  helloSis: 'שלום שייה, שלום אלמה! איזה כיף שבאתן.',
  firstTime: 'אני מיקה, ואני אלמד אותך אנגלית. אצלי לא ממהרים, ומותר לטעות.',
  firstTimeSis: 'אני מיקה, ואני אלמד אתכן אנגלית. אצלי לא ממהרים, ומותר לטעות.',
  remember: (likeHe) => `אני זוכרת שאת אוהבת ${likeHe}.`,
  topic: (topicHe) => `היום נלמד על ${topicHe}.`,
  // החד-קרן
  chooseUni: 'בואי נבחר חד־קרן שיהיה החבר שלך בשיעורים. איזה את הכי אוהבת?',
  chooseUniName: (name) => `${name}, איזה חד־קרן את רוצה?`,
  tapUni: 'נוגעים בחד־קרן.',
  pickedUni: (uni) => `${uni}! היא תהיה איתך בכל שיעור.`,
  uniGrew: (uni, lv) => (lv >= 5 ? `תראי! ${uni} זוהרת כמו כוכב.` : lv >= 4 ? `תראי! ${uni} מנצנצת עכשיו.` : lv >= 3 ? `תראי! ל${uni} יש כנפיים גדולות.` : `תראי! ל${uni} צמחו כנפיים.`),
  uniHi: (uni) => `גם ${uni} באה לשיעור.`,
  // חזרה ומילים חדשות
  review: 'קודם, בואי ניזכר במילה שאת כבר מכירה.',
  reviewMany: 'קודם, בואי ניזכר במילים שאת כבר מכירה.',
  newWord: 'ועכשיו, מילה חדשה.',
  sayWithMe: 'אם בא לך, תגידי איתי:',
  findNow: 'עכשיו נשחק מחבואים עם התמונות.',
  // רמזים – בסבלנות
  look: 'קחי את הזמן. אני מחכה.',
  together: 'בואי ניגע ביחד.',
  almost: 'כמעט. ננסה שוב, בנחת.',
  // שבח שמתאר מה עשתה
  praise: ['הקשבת טוב, ומצאת.', 'חיפשת בסבלנות, והצלחת.', 'נגעת בדיוק בתמונה הנכונה.', 'ניסית שוב, ומצאת.'],
  // מיקה טועה בכוונה
  mistakeIntro: 'עכשיו תורי לנחש. תגידי לי אם צדקתי.',
  caught: 'תפסת אותי! טעיתי בכוונה.',
  wasRight: 'נכון, הפעם צדקתי.',
  actuallyRight: 'דווקא צדקתי הפעם. תסתכלי:',
  actuallyWrong: 'אוי, דווקא טעיתי. תסתכלי:',
  // "What do you want?"
  wantIntro: 'עכשיו את בוחרת. מה את רוצה?',
  wantQ: 'What do you want?',
  // סיום
  learnedToday: 'היום למדנו:',
  nextUp: 'בשיעור הבא אביא לך משהו חדש ומעניין.',
  nextSame: 'בשיעור הבא נשחק עוד עם המילים האלה.',
  homeTask: {
    animal: 'משימה לבית: תספרי לאמא או לאבא איך קוראים באנגלית לחיה שלמדנו.',
    color: 'משימה לבית: תמצאי בבית משהו בצבע שלמדנו, ותגידי אותו באנגלית.',
    food: 'משימה לבית: תגידי לאמא או לאבא באנגלית מה את רוצה לאכול.',
  },
  bye: (name) => `להתראות ${name}! היה לי כיף איתך.`,
  byeSis: 'להתראות שייה, להתראות אלמה! היה לי כיף איתכן.',
  turnOf: (name) => `תור של ${name}.`,
  enter: 'נכנסים לשיעור של מיקה!',
  tour: 'השיעור של מיקה: מיקה מלמדת מילים חדשות באנגלית.',
  rest: 'כבר למדנו היום. נמשיך מחר, כשהראש רענן.',
};
