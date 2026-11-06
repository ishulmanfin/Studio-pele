// עולם החיות: ידע כללי + אוצר מילים. מיקה שואלת שאלה בעברית (או אומרת שם באנגלית לשייה),
// נוגעים בחיה הנכונה, ומיקה אומרת את שמה באנגלית ועובדה קטנה ומעניינת עליה.
export const ANIMALS_META = { id: 'animals', review: { language: 'approved', age: 'approved', rights: 'original', qa: 'approved', version: '1.0' } };
export const ANIMAL_IDS = ['cow', 'dog', 'cat', 'duck', 'lion', 'fish', 'bird', 'frog', 'horse', 'sheep'];

// level 1 – מתאים לאלמה (3, מפותחת לגילה); level 2 – מאתגר, לשייה (5)
export const QUESTIONS = [
  { id: 'moo', text: 'מי אומר מוּ?', ok: ['cow'], level: 1 },
  { id: 'woof', text: 'מי אומר הַב הַב?', ok: ['dog'], level: 1 },
  { id: 'meow', text: 'מי אומר מיאו?', ok: ['cat'], level: 1 },
  { id: 'quack', text: 'מי אומר גָּה גָּה?', ok: ['duck'], level: 1 },
  { id: 'ribbit', text: 'מי אומר קְוָוה קְוָוה?', ok: ['frog'], level: 1 },
  { id: 'baa', text: 'מי אומר מֶההה?', ok: ['sheep'], level: 1 },
  { id: 'roar', text: 'מי שואג הכי חזק?', ok: ['lion'], level: 1 },
  { id: 'swim', text: 'מי גר בתוך המים?', ok: ['fish'], level: 1, avoid: ['duck', 'frog'] },
  { id: 'milk', text: 'מי נותנת לנו חלב?', ok: ['cow'], level: 1, avoid: ['sheep', 'horse'] },
  { id: 'ride', text: 'על מי אפשר לרכוב?', ok: ['horse'], level: 1 },
  { id: 'wool', text: 'למי יש צמר רך?', ok: ['sheep'], level: 2 },
  { id: 'mane', text: 'למי יש רעמה גדולה מסביב לראש?', ok: ['lion'], level: 2, avoid: ['horse'] },
  { id: 'eggs', text: 'מי מטיל ביצים?', ok: ['duck', 'bird', 'fish', 'frog'], level: 2 },
  { id: 'feathers', text: 'למי יש נוצות?', ok: ['bird', 'duck'], level: 2 },
  { id: 'nolegs', text: 'למי אין רגליים בכלל?', ok: ['fish'], level: 2 },
  { id: 'tadpole', text: 'מי היה פעם ראשן קטן במים?', ok: ['frog'], level: 2 },
  { id: 'guard', text: 'מי שומר על הבית ונובח על זרים?', ok: ['dog'], level: 2 },
  { id: 'whiskers', text: 'למי יש שפם ארוך, והוא רואה טוב בחושך?', ok: ['cat'], level: 2, avoid: ['lion', 'dog'] },
];

export const FACTS = {
  cow: 'הפרה נותנת לנו חלב, וממנו עושים גבינה!',
  dog: 'הכלב מריח הכי טוב בעולם, והוא חבר נאמן.',
  cat: 'החתול ישן כמעט כל היום, ורואה טוב בחושך.',
  duck: 'הברווז יודע ללכת, לשחות, וגם לעוף!',
  lion: 'האריה הוא מלך החיות, והשאגה שלו נשמעת מרחוק.',
  fish: 'הדג נושם בתוך המים, בעזרת זימים.',
  bird: 'הציפור בונה קן, ומטילה בו ביצים.',
  frog: 'הצפרדע הייתה פעם ראשן קטן, שחי במים.',
  horse: 'על הסוס אפשר לרכוב, והוא יכול לישון בעמידה!',
  sheep: 'מהצמר של הכבשה עושים סוודרים חמים.',
};

export const LINES = {
  intro: 'ברוכים הבאים לעולם החיות! מיקה שואלת, ונוגעים בחיה הנכונה.',
  introEn: 'עכשיו מיקה אומרת את השם באנגלית. איזו חיה זאת?',
  tapIt: 'נוגעים בחיה הנכונה!',
  again: 'זאת חיה אחרת. ננסה שוב!',
  parade: 'כל החיות באות להגיד תודה!',
  bye: 'כל הכבוד! את יודעת המון על חיות!',
  byeSis: 'כל הכבוד! אתן יודעות המון על חיות!',
  tour: 'עולם החיות: עונים על שאלות על חיות, ולומדים את השמות שלהן באנגלית.',
  enter: 'יוצאים לעולם החיות!',
};
