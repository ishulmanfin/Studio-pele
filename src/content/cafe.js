// תוכן הפרק "בית הקפה המצחיק". המנוע (src/ui/cafe.js) קורא מכאן את כל הטקסט, הבקשות והתגובות.
// כל שורה אנגלית כאן עברה בדיקת שפה ידנית; אין תוכן שנשאב מהרשת או נוצר בזמן ריצה.
import { VOCAB } from './vocab.js';

export const CAFE_META = {
  id: 'cafe',
  review: { language: 'approved', age: 'approved', rights: 'original — all art, names and lines made for this app', qa: 'approved', version: '1.0' },
  minutes: { younger: 5, older: 8 },
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const ART = { apple: 'an apple', banana: 'a banana', cookie: 'a cookie', water: 'water', milk: 'milk', juice: 'juice' };
export const withArticle = (id) => ART[id] || VOCAB[id]?.article || id;
export const he = (id) => VOCAB[id]?.he || id;

export const GUESTS = {
  lulu: { he: 'לולו', heTo: 'ללולו', name: 'Lulu', actor: 'lulu', mouthY: 400, pron: 'she' },
  owl:  { he: 'מר ינשוף', heTo: 'למר ינשוף', name: 'Mr. Owl', actor: 'owl', mouthY: 520, pron: 'he' },
};

// ---- בקשות לפי מסלול. first = ביקור ראשון; returning = ניסוח מעט שונה באותו הקשר ----
export const REQUEST = {
  younger: {
    first: (w) => `${cap(VOCAB[w].en)}, please.`,
    returning: (w) => (VOCAB[w].group === 'drink' ? `Some ${VOCAB[w].en}, please?` : `${cap(withArticle(w))}, please!`),
    sisters: (w) => `${cap(VOCAB[w].en)}, please!`,
  },
  older: {
    s_please: (w, ret) => (ret ? `I'd like ${withArticle(w)}, please.` : `${cap(VOCAB[w].en)}, please.`),
    s_iwant: (w) => `I want ${withArticle(w)}.`,
    s_category: (group) => (group === 'drink' ? 'Something cold, please.' : 'Something to eat, please.'),
    s_and: (a, b) => `I want ${withArticle(a)} and ${withArticle(b)}, please.`,
    sisters: (fruit, drink) => `${cap(withArticle(fruit))} and ${withArticle(drink)}, please.`,
  },
};

// עזרה בעברית – משפט קצר אחד, רק כשנדרש
export const GLOSS = {
  s_please: (w) => `מבקשים ${he(w)}.`,
  s_iwant: (w) => `"I want" זה "אני רוצה". ${he(w)}.`,
  s_category: (g) => (g === 'drink' ? 'משהו קר לשתות. יש כמה תשובות נכונות.' : 'משהו לאכול. יש כמה תשובות נכונות.'),
  s_and: (a, b) => `שני דברים: ${he(a)} ו${he(b)}.`,
};

export const LINES = {
  mika: {
    helloAlma: 'שלום אלמה!',
    helloShaya: 'שלום שייה! היום את המנהלת של בית הקפה.',
    helloSisters: 'שלום שייה, שלום אלמה! פותחים את בית הקפה ביחד.',
    welcomeBack: 'Welcome back!',
    // חוקי המשחק: מה עושים כאן ולמה, לפני הצעד הראשון
    goalAlma: 'פה זה בית קפה. אורחים יבואו ויבקשו אוכל באנגלית. את מקשיבה, ונותנת להם בדיוק מה שביקשו.',
    goalShaya: 'ככה משחקים: קודם ממלאים את המזווה. אחר כך אורחים מזמינים באנגלית. מקשיבים טוב, ומגישים בדיוק את מה שביקשו.',
    goalSisters: 'ככה משחקים: אורחים יזמינו באנגלית. אלמה מגישה אוכל, ושייה מוזגת שתייה. מקשיבים טוב לפני שנוגעים.',
    listenFirst: 'האורח מזמין. מקשיבים, ואז נוגעים במה שביקש.',
    menuStillHere: 'התפריט שלכן עדיין כאן.',
    menuStillHereOne: 'התפריט שלך עדיין כאן.',
    whichCloth: 'איזו מפה נשים על השולחן? נוגעים במפה שאת אוהבת.',
    stockAsk: 'מה נמכור בבית הקפה? בחרי ארבעה דברים לאכול ולשתות. נוגעים בכל אחד.',
    stockAskSis: 'שייה, בחרי שתי שתיות לבית הקפה. נוגעים בבקבוקים.',
    lettersIntro: 'בתפריט חסרה האות הראשונה. איזו אות עושה את הצליל הזה?',
    homeGame: 'ואפשר לשחק בית קפה גם בבית. ככה מבקשים:',
    somethingNewBox: 'יש היום משהו חדש בארגז!',
    somethingNewPantry: 'יש משהו חדש במזווה!',
    unboxAlma: 'מה יש בארגז? נוגעים בארגז כדי לפתוח.',
    unboxSis: 'אלמה, מה יש בארגז? נוגעים בארגז כדי לפתוח.',
    guestIntro: (guest) => (guest.pron === 'he' ? `זה ${guest.he}. הוא בא לאכול.` : `זאת ${guest.he}. היא באה לאכול.`),
    whichCup: 'באיזו כוס למזוג? נוגעים בכוס.',
    pourHint: 'לוחצים על הבקבוק כדי למזוג.',
    tapToHelp: (item, g) => `ה${item} כאן. רוצה לתת ${g}?`,
    bumWants: 'בום רוצה לנגן. נוגעים בו!',
    menuMake: 'בואי נעשה תפריט לבית הקפה.',
    menuMakeSis: 'עכשיו התפריט שלכן.',
    menuName: 'איך יקראו לבית הקפה? נוגעים בשם שאת אוהבת.',
    menuSpecial: 'מה המנה המיוחדת של היום? נוגעים במנה אחת.',
    swapIntro: 'עכשיו את האורחת, וטוטו המלצר.',
    swapModel: 'ככה מבקשים:',
    swapYourTurn: 'עכשיו את. נוגעים בתמונות.',
    turnOf: (name) => `תור של ${name}.`,
    closeTime: 'בית הקפה הולך לנוח.',
    restSoon: 'עוד מעט נגמר הזמן לסטודיו היום.',
    bye: (name) => `Bye, ${name}!`,
  },
  toto: {
    knock: 'Knock, knock!',
    oopsHat: (w) => `${cap(VOCAB[w].en)} hat!`,
    fixed: 'Oops! Thank you!',
    whatDoYouWant: 'What do you want?',
    wrongSock: 'Sock? Oops!',
    hereYouAre: 'Here you are!',
  },
  guest: {
    hello: (g) => (g === 'owl' ? 'Hello! Hoo-hoo!' : 'Hello!'),
    yum: ['Yum!', 'Mmm, yummy!', 'Thank you!'],
    thanksBye: 'Thank you! Bye!',
    notThat: (got, want) => `${cap(VOCAB[got]?.en || got)}? Hmm… ${cap(VOCAB[want].en)}, please.`,
  },
};

// משוב שמתאר את המעשה – לא "מדהים"
export const FEEDBACK = {
  gave: (item, g) => `נתת ${g} ${he(item)}.`,
  heard: (item, guest) => `שמעת ש${guest.he} ${guest.pron === 'he' ? 'ביקש' : 'ביקשה'} ${he(item)}.`,
  poured: (item, cup) => `מזגת ${he(item)} לכוס ה${cup === 'blue' ? 'כחולה' : 'אדומה'}.`,
  understoodWant: (item) => `הבנת "I want" – ${he(item)}.`,
  category: (item, group) => (group === 'drink' ? `בחרת ${he(item)} – משהו קר.` : `בחרת ${he(item)} – משהו לאכול.`),
  two: (a, b) => `זכרת שני דברים: ${he(a)} ו${he(b)}.`,
  saidIt: 'אמרת את הבקשה בעצמך.',
  builtIt: 'ביקשת בעצמך, וטוטו הבין.',
  fixedToto: 'החזרת את זה למקום.',
  sound: (w) => `שמעת את הצליל הראשון של ${VOCAB[w].en}.`,
  sisters: (fruit, drink) => `אלמה נתנה ${he(fruit)}, ושייה מזגה ${he(drink)}.`,
};

// צלילים: טוטו משמיע את הצליל ואת המילה
export const soundLine = (snd, w) => `${cap(snd)}… ${snd}… ${VOCAB[w].en}!`;
export const soundWrong = (sndWrong, snd, w) => `${cap(sndWrong)}? Hmm… ${snd}… ${VOCAB[w].en}.`;

export const SHOE_REACT = { shoe: 'נעל? זה לא טעים לי!', sock: 'גרב? אי אפשר לאכול גרב!' };

export const CAFE_NAMES = [
  { en: 'Sunny Café', icon: 'sun' },
  { en: 'Moon Café', icon: 'moon' },
  { en: 'Café Toto', icon: 'paw' },
  { en: 'Banana Café', icon: 'banana' },
];

export const POOL = {
  younger: ['banana', 'apple', 'water'],
  youngerNew: ['cookie'],
  pantry: ['milk', 'water', 'juice', 'apple', 'banana', 'cookie'],
  drinks: ['water', 'milk', 'juice'],
};

export const DRINK_COLOR = { water: '#8fd0ec', milk: '#f1efe6', juice: '#f59e2d' };
export const drinkColor = (id) => DRINK_COLOR[id] || VOCAB[id]?.color || '#8fd0ec';
