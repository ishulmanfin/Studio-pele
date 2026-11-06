// תוכן הפרק "אולפן הלהקה". המנוע (src/ui/band.js) קורא מכאן את כל הטקסט.
// כל שורה אנגלית עברה בדיקת שפה ידנית; אין תוכן שנשאב מהרשת או נוצר בזמן ריצה.
import { VOCAB } from './vocab.js';

export const BAND_META = {
  id: 'band',
  review: { language: 'approved', age: 'approved', rights: 'original — art, music loops and lines made for this app', qa: 'approved', version: '1.0' },
  minutes: { younger: 5, older: 7 },
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const he = (id) => VOCAB[id]?.he || id;
export const NAMES = { bum: 'Bum', toto: 'Toto' };
export const TEMPO_WORD = { fast: 'fast', slow: 'slowly' };

export const LINES = {
  mika: {
    helloAlma: 'ברוכה הבאה לאולפן הלהקה!',
    helloShaya: 'שייה, את המנצחת היום. הלהקה מקשיבה לך.',
    helloSisters: 'שייה ואלמה, ברוכות הבאות ללהקה!',
    welcomeBack: 'Welcome back!',
    songStillHere: 'השיר שלך עדיין כאן. הקשיבי!',
    songStillHereSis: 'השיר שלכן עדיין כאן. הקשיבו!',
    goalAlma: 'פה זאת להקה. מקשיבים לטוטו: כשהוא אומר Go מנגנים, וכשהוא אומר Stop עוצרים.',
    goalShaya: 'פה את המנצחת של הלהקה. מקשיבים להוראות באנגלית, ואחר כך את נותנת הוראות, והנגנים עושים בדיוק מה שאמרת.',
    goalSisters: 'פה מנגנים ביחד. מקשיבים להוראה באנגלית, ועושים בדיוק מה שהיא אומרת.',
    openCurtain: 'נוגעים בכוכב כדי לפתוח את הווילון.',
    whichInstrument: 'באיזה כלי תנגני? נוגעים בכלי.',
    watchMe: 'תסתכלי עליי.',
    yourTurnStop: 'עכשיו את שולטת. טוטו יגיד לך.',
    fastSlowIntro: 'מהר כמו ארנב, או לאט כמו חילזון?',
    bumSings: 'בום שר מילים מבית הקפה. נוגעים במה שהוא שר.',
    showTime: 'הופעה!',
    tapBumEnd: 'נוגעים בבום כדי לסיים בתיפוף.',
    conductIntro: 'כשאני אומרת מי ינגן ואיך, נוגעים בנגן.',
    songWrite: 'בואי נכתוב שיר מהתפריט שלך. בחרי ארבע תמונות של אוכל ושתייה, והן יהיו המילים של השיר.',
    songWriteNoMenu: 'בואי נכתוב שיר. בחרי ארבע תמונות של אוכל ושתייה, והן יהיו המילים של השיר.',
    letsSingTap: 'כשאתן מוכנות לשיר, נוגעים בכפתור הירוק.',
    swapIntro: 'עכשיו את נותנת הוראה. מי ינגן?',
    swapHow: 'ואיך? מהר או לאט?',
    turnOf: (name) => `תור של ${name}.`,
    bye: (name) => `Bye, ${name}!`,
    allStopped: 'כולם עצרו.',
  },
  toto: {
    stopQ: 'Stop? Stop!',
    goQ: 'Go? Go!',
    whatDoIPlay: 'What do I play?',
    yay: 'Yay!',
  },
  bum: {
    boom: 'Boom, boom!',
  },
};

// הוראות לשייה
export const COMMAND = {
  play: (who, tempo) => `${NAMES[who]}, play ${TEMPO_WORD[tempo]}!`,
  everybodyStop: 'Everybody, stop!',
  letsSing: "Let's sing!",
};

export const GLOSS = {
  play: (who, tempo) => `${who === 'bum' ? 'בום' : 'טוטו'} ינגן ${tempo === 'fast' ? 'מהר' : 'לאט'}.`,
  everybody: 'Everybody זה כולם. כל הנגנים עוצרים.',
};

export const FEEDBACK = {
  stopped: 'עצרת את המוזיקה. כולם קפאו!',
  went: 'הפעלת את המוזיקה.',
  fast: 'בחרת מהר, ובום מנגן מהר.',
  slow: 'בחרת לאט. טוטו רוקד לאט־לאט.',
  heardWord: (w) => `שמעת את בום שר ${he(w)}.`,
  playOk: (who, tempo) => `${who === 'bum' ? 'בום' : 'טוטו'} מנגן ${tempo === 'fast' ? 'מהר' : 'לאט'}, כמו שביקשו.`,
  gaveCommand: 'נתת הוראה באנגלית, והלהקה ביצעה.',
  sisters: (a, b) => `${a} עצרה והפעילה, ו${b} ניצחה על הקצב.`,
};

export const songLine = (words) => words.map((w) => `${cap(VOCAB[w].en)}!`).join(' ');
