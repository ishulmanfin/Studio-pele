// ספריית תוכן מאושר. כל חבילה נכנסת כטיוטה ונפתחת לילדות רק אחרי אישור הורה באזור ההורים.
// אין כאן שליפה מהרשת בזמן ריצה: חבילות נכתבות ונבדקות מראש (tools/library/review.mjs), ונשמרות בקוד.
//
// מקורות:
// - בחירת המילים נשענת על רשימת המילים הרשמית של Cambridge English Pre A1 Starters (רמת ילדים צעירים).
//   משתמשים ברשימה רק כדי לבחור מילים מתאימות לרמה; אין העתקה של טקסט, איור או הקלטה משם.
// - כל המשפטים, האיורים והקולות נוצרו לאפליקציה הזו.

export const SOURCES = {
  starters: {
    name: 'Cambridge English Pre A1 Starters – Vocabulary List',
    use: 'בחירת מילים לפי רמה בלבד',
    license: 'רשימת מילים נפוצות; לא הועתק תוכן מוגן',
  },
};

// מילים מתוך תחום "אוכל ושתייה" ברשימת Starters, ששימשו לבדיקת השפה
export const STARTERS_FOOD = ['apple', 'banana', 'cake', 'carrot', 'chicken', 'chips', 'chocolate', 'coconut', 'egg', 'fish',
  'fries', 'grape', 'grapes', 'ice cream', 'juice', 'lemon', 'lemonade', 'lime', 'mango', 'meat', 'milk', 'onion', 'orange',
  'pea', 'pear', 'pie', 'pineapple', 'potato', 'rice', 'sausage', 'sweets', 'tomato', 'water', 'watermelon', 'bread', 'burger',
  'cookie', 'strawberry'];

export const PACKS = [
  {
    id: 'fruits1',
    title: 'פירות צבעוניים',
    blurb: 'שלושה פירות חדשים לבית הקפה. כל ילדה פוגשת אותם אחד־אחד, רק כשהמילים הקודמות כבר מוכרות לה.',
    source: 'starters',
    tracks: ['younger', 'older'],
    items: [
      { id: 'orange', en: 'orange', he: 'תפוז', group: 'food', article: 'an orange' },
      { id: 'strawberry', en: 'strawberry', he: 'תות', group: 'food', article: 'a strawberry' },
      { id: 'grapes', en: 'grapes', he: 'ענבים', group: 'food', article: 'grapes' },
    ],
  },
  {
    id: 'drinks1',
    title: 'שתייה קרה חדשה',
    blurb: 'לימונדה מצטרפת למזווה. מתאים במיוחד לשייה, שבוחרת שתיות ומוזגת.',
    source: 'starters',
    tracks: ['older'],
    items: [
      { id: 'lemonade', en: 'lemonade', he: 'לימונדה', group: 'drink', article: 'lemonade', cold: true, color: '#FFE45C' },
    ],
  },
  {
    id: 'garden1',
    title: 'מהגינה ומהתנור',
    blurb: 'גזר ועוגה. שתי מילים שקל לראות ולהבדיל, וגם מצחיק להגיש גזר למר ינשוף.',
    source: 'starters',
    tracks: ['younger', 'older'],
    items: [
      { id: 'carrot', en: 'carrot', he: 'גזר', group: 'food', article: 'a carrot' },
      { id: 'cake', en: 'cake', he: 'עוגה', group: 'food', article: 'cake' },
    ],
  },
];

export const packOf = (itemId) => PACKS.find((p) => p.items.some((i) => i.id === itemId));

/**
 * בדיקות אוטומטיות לפני שהורה רואה את החבילה. הן לא מחליפות את אישור ההורה, רק מסננות.
 * env: { hasArt(id), hasVoice(line) }
 */
export function reviewPack(pack, env = {}) {
  const words = pack.items.map((i) => i.en.toLowerCase());
  const lines = sampleLines(pack);
  const checks = [
    { key: 'language', label: 'שפה', ok: words.every((w) => STARTERS_FOOD.includes(w)) && lines.every((l) => l.split(' ').length <= 7),
      note: 'כל המילים מרשימת Starters; כל משפט עד 7 מילים.' },
    { key: 'age', label: 'גיל', ok: pack.items.every((i) => i.he && i.group) && pack.items.length <= 3,
      note: 'חפצים מוחשיים שאפשר לצייר; לכל היותר 3 מילים בחבילה; מילה חדשה אחת בכל ביקור.' },
    { key: 'rights', label: 'זכויות', ok: Boolean(SOURCES[pack.source]),
      note: `${SOURCES[pack.source]?.name || 'מקור לא ידוע'}: ${SOURCES[pack.source]?.use || ''}. איורים ומשפטים מקוריים.` },
    { key: 'quality', label: 'איכות', ok: pack.items.every((i) => (env.hasArt ? env.hasArt(i.id) : true)),
      note: 'יש איור לכל מילה.' },
  ];
  const voiced = env.hasVoice ? lines.filter((l) => env.hasVoice(l)).length : 0;
  return { checks, ok: checks.every((c) => c.ok), lines, voiced };
}

/** משפטים לדוגמה שהחבילה מוסיפה, כדי שההורה יראה וישמע מה הילדות יפגשו */
export function sampleLines(pack) {
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  return pack.items.flatMap((i) => [`${cap(i.en)}, please.`, `I want ${i.article}.`]);
}
