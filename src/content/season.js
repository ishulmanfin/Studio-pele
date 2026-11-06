// תוכנית העונה הראשונה. רק פרקים במצב 'approved' נטענים לילדות.
// כל פרק מגדיר: מטרה, גרסת אלמה (younger), גרסת שייה (older), תוצר, וחזרות מתוכננות.
// review: draft → language → age → rights → qa → approved  (ראו docs/03-content-pipeline.md)

export const SEASON = [
  {
    id: 'studio', title: 'פותחות את הסטודיו', set: 'box', review: 'partial',
    note: 'בחירת סמל אישי ממומשת כחלק מהכניסה. ארגז הפתיחה המלא מתוכנן.',
    younger: { vocab: ['hello', 'bye', 'open', 'close'], goal: 'פותחת וסוגרת, מזהה ברכה ונפרדת מדמות' },
    older:   { vocab: ['hello', 's_imname', 's_whatsname'], goal: 'מציגה את עצמה ובוחרת שם לדמות אורחת' },
    product: 'כרטיס פתיחה אישי מונפש', revisit: ['cafe', 'band', 'ourEpisode'],
  },
  {
    id: 'cafe', title: 'בית הקפה המצחיק', set: 'cafe', review: 'approved',
    younger: { vocab: ['apple', 'banana', 'water', 'please', 'hello', 'bye', 'open', 'close'], goal: 'מבינה מילת אוכל בתוך בקשה עם please' },
    older:   { vocab: ['milk', 'water', 'juice', 'apple', 'banana', 'cookie', 's_please', 's_iwant', 's_canihave', 's_and', 's_category'], goal: 'מבינה בקשות, ממלאת שתיים ברצף ומבקשת בעצמה' },
    product: 'תפריט מאויר שנשמר ומשמש בביקור הבא', revisit: ['shop', 'beach', 'picnic'],
  },
  {
    id: 'clinic', title: 'מרפאת חיות הצעצוע', set: 'clinic', review: 'draft',
    younger: { vocab: ['nose', 'ears', 'feet'], goal: 'מוצאת חלקי גוף על בובה' },
    older:   { vocab: ['s_whereis', 's_hereitis', 's_areyouok'], goal: 'מבינה סיפור קצר ועוזרת לדמות (ללא תוכן רפואי אמיתי)' },
    product: 'בובה מטופלת שחוזרת לבקר', revisit: ['feelings', 'ourEpisode'],
  },
  {
    id: 'band', title: 'אולפן הלהקה', set: 'band', review: 'approved',
    younger: { vocab: ['go', 'stop', 'fast', 'slow'], goal: 'מגיבה בתנועה להוראה קולית' },
    older:   { vocab: ['s_play', 's_everybody', 's_letssing', 'fast', 'slow'], goal: 'מבחינה בין הוראות ומרכיבה הופעה' },
    product: 'קטע מוזיקלי מקורי עם המילים שנלמדו', revisit: ['beach', 'ourEpisode'],
  },
  {
    id: 'costumes', title: 'מזוודת התחפושות', set: 'costumes', review: 'draft',
    younger: { vocab: ['hat', 'shoes', 'coat'], goal: 'בוחרת ומלבישה במגע' },
    older:   { vocab: ['s_puton', 's_takeoff', 's_rainy'], goal: 'בוחרת לבוש לפי הקשר' },
    product: 'דמות לבושה שחוזרת בפרקים הבאים', revisit: ['beach', 'ourEpisode'],
  },
  {
    id: 'picnic', title: 'הפיקניק שהתבלבל', set: 'picnic', review: 'draft',
    younger: { vocab: ['in', 'out', 'big', 'small'], goal: 'מילות יחס וגודל בהמחשה פיזית' },
    older:   { vocab: ['in', 'on', 'under', 's_twostep'], goal: 'הוראות קצרות עם שני רכיבים' },
    product: 'סל פיקניק מסודר', revisit: ['beach', 'shop'],
  },
  {
    id: 'shop', title: 'החנות של הילדות', set: 'shop', review: 'draft',
    younger: { vocab: ['one', 'two', 'three'], goal: 'ספירת 1–3 חפצים ובקשת חפץ מוכר' },
    older:   { vocab: ['one', 'two', 'three', 'four', 'five', 's_twoapples'], goal: 'כמויות עד 5 דרך סל אמיתי' },
    product: 'מדפים מסודרים', revisit: ['beach'],
  },
  {
    id: 'feelings', title: 'הבובה מרגישה משהו', set: 'feelings', review: 'draft',
    younger: { vocab: ['happy', 'sad', 'sleepy'], goal: 'זיהוי רגש על דמויות בלבד' },
    older:   { vocab: ['s_imhappy', 's_imtired', 's_helpplease'], goal: 'עוזרת לדמות לבחור פעולה. אין שאלות על הילדה עצמה.' },
    product: 'פינת מנוחה לבובה', revisit: ['ourEpisode'],
  },
  {
    id: 'beach', title: 'יום בחוף', set: 'beach', review: 'draft',
    younger: { vocab: ['*review'], goal: 'משימות מוכרות בסביבה חדשה' },
    older:   { vocab: ['*review'], goal: 'הכנת תיק והבנת רצף עם פחות רמזים' },
    product: 'בדיקת העברה להקשר חדש', revisit: [],
  },
  {
    id: 'ourEpisode', title: 'הפרק שאנחנו יוצרות', set: 'stage', review: 'draft',
    younger: { vocab: ['*review'], goal: 'בחירות חזותיות; הדמויות מדגימות' },
    older:   { vocab: ['*review'], goal: 'הרכבת סיפור קצר מביטויים מוכרים' },
    product: 'פרק מונפש שאפשר לצפות בו ולשחק בתוכו', revisit: [],
  },
];

export const episode = (id) => SEASON.find((e) => e.id === id);
export const isPlayable = (id) => episode(id)?.review === 'approved';
