// מרכיב את רשימת כל השורות המדוברות: (1) שורות שנאספו מהרצות אוטומטיות של כל המסלולים (said.json),
// (2) כל הצירופים האפשריים של תבניות התוכן, כדי שלא תחסר שורה בשום בחירה של הילדה.
import fs from 'node:fs';
import { VOCAB, SOUNDS } from '../../src/content/vocab.js';
import { PACKS } from '../../src/content/library.js';
import { GUESTS, REQUEST, GLOSS, LINES, FEEDBACK, SHOE_REACT, CAFE_NAMES, POOL, he, soundLine, soundWrong, withArticle } from '../../src/content/cafe.js';

import { splitLine } from '../../src/engine/split.js';
const out = new Set();
// שורה מורכבת נשמרת כחלקים (ראו SPLITS ב-voice.js), כך שמספר השורות לא מתפוצץ עם כל מילה חדשה
const add = (who, lang, text) => { const p = splitLine(text, lang); if (p) p.forEach((t) => out.add(`${who}|${lang}|${t}`)); else out.add(`${who}|${lang}|${text}`); };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
// כולל מילים מחבילות הספרייה, כדי שגם הן יוקלטו לפני שהורה מאשר אותן
const items = [...POOL.pantry, ...PACKS.flatMap((p) => p.items.map((i) => i.id))];
const foods = items.filter((i) => VOCAB[i].group === 'food');
const drinks = items.filter((i) => VOCAB[i].group === 'drink');
const guests = Object.keys(GUESTS);

for (const g of guests) {
  const G = GUESTS[g];
  for (const w of items) {
    add(g, 'en', REQUEST.younger.first(w)); add(g, 'en', REQUEST.younger.sisters(w));
    add(g, 'en', REQUEST.older.s_please(w, false)); add(g, 'en', REQUEST.older.s_please(w, true)); add(g, 'en', REQUEST.older.s_iwant(w));
    for (const v of items) if (v !== w) add(g, 'en', LINES.guest.notThat(v, w));
    add(g, 'he', `זה ${he(w)}. אני רוצה ${he(w)}.`);
    add('mika', 'he', FEEDBACK.gave(w, G.heTo)); add('mika', 'he', FEEDBACK.heard(w, G));
    add('mika', 'he', LINES.mika.tapToHelp(he(w), G.heTo));
  }
  // ניסוח ביקור חוזר (אקראי) – שתי הגרסאות
  for (const w of items) { add(g, 'en', VOCAB[w].group === 'drink' ? `Some ${VOCAB[w].en}, please?` : `${cap(REQUEST.older.s_iwant(w).replace('I want ', '').replace('.', ''))}, please!`); }
  for (const grp of ['drink', 'food']) add(g, 'en', REQUEST.older.s_category(grp));
  for (const f of foods) for (const d of drinks) { add(g, 'en', REQUEST.older.s_and(f, d)); add(g, 'en', REQUEST.older.s_and(d, f)); add(g, 'en', REQUEST.older.sisters(f, d)); }
  for (const a of items) for (const b of items) if (a !== b) add(g, 'en', REQUEST.older.s_and(a, b));
  add(g, 'en', LINES.guest.hello(g)); add(g, 'en', LINES.guest.thanksBye);
  LINES.guest.yum.forEach((y) => add(g, 'en', y));
  Object.values(SHOE_REACT).forEach((t) => add(g, 'he', t));
  add('mika', 'he', LINES.mika.guestIntro(G));
}
for (const w of items) {
  add('toto', 'en', `${cap(VOCAB[w].en)}!`); add('bum', 'en', `${cap(VOCAB[w].en)}!`); add('toto', 'en', LINES.toto.oopsHat(w));
  add('toto', 'en', `${cap(VOCAB[w].en)}! Special!`); add('toto', 'en', VOCAB[w].en);
  add('toto', 'en', `Can I have ${VOCAB[w].en}, please?`); add('toto', 'en', `${VOCAB[w].en}, please?`); add('mika', 'en', VOCAB[w].en);
  add('mika', 'he', GLOSS.s_please(w)); add('mika', 'he', GLOSS.s_iwant(w));
  add('mika', 'he', FEEDBACK.understoodWant(w)); add('mika', 'he', FEEDBACK.category(w, VOCAB[w].group));
  add('mika', 'he', `שייה, היא רוצה ${he(w)}.`);
  for (const c of ['blue', 'red']) if (VOCAB[w].group === 'drink') add('mika', 'he', FEEDBACK.poured(w, c));
  for (const v of items) if (v !== w) { add('mika', 'he', GLOSS.s_and(w, v)); add('mika', 'he', FEEDBACK.two(w, v)); }
}
for (const f of foods) for (const d of drinks) add('mika', 'he', FEEDBACK.sisters(f, d));
for (const grp of ['drink', 'food']) add('mika', 'he', GLOSS.s_category(grp));
CAFE_NAMES.forEach((n) => add('mika', 'en', n.en));
['Can I have', 'please'].forEach((t) => { add('toto', 'en', t); add('mika', 'en', t); });
for (const [k, v] of Object.entries(LINES.mika)) if (typeof v === 'string') add('mika', /[a-z]/i.test(v) && !/[א-ת]/.test(v) ? 'en' : 'he', v);
for (const n of ['שייה', 'אלמה']) add('mika', 'he', LINES.mika.turnOf(n));
for (const [k, v] of Object.entries(LINES.toto)) if (typeof v === 'string') add('toto', 'en', v);
Object.values(FEEDBACK).filter((v) => typeof v === 'string').forEach((v) => add('mika', 'he', v));

// צלילי אותיות לשייה
for (const w of items) {
  const L = VOCAB[w].en[0]; if (!SOUNDS[L]) continue;
  add('toto', 'en', soundLine(SOUNDS[L], w)); add('toto', 'en', `${cap(SOUNDS[L])}… ${VOCAB[w].en}!`); add('mika', 'he', FEEDBACK.sound(w));
  for (const D of Object.keys(SOUNDS)) if (D !== L) add('toto', 'en', soundWrong(SOUNDS[D], SOUNDS[L], w));
}
// משחק לבית: המשפט שמיקה אומרת על הכרטיס
for (const w of items) {
  add('mika', 'en', `${cap(VOCAB[w].en)}, please.`); add('mika', 'en', `I want ${withArticle(w)}.`); add('mika', 'en', `Can I have ${withArticle(w)}, please?`);
  for (const d of drinks) if (VOCAB[w].group === 'food') add('mika', 'en', `${cap(withArticle(w))} and ${withArticle(d)}, please.`);
}

// טוטו טועה!
for (const w of items) {
  add('toto', 'en', `Oops! ${cap(VOCAB[w].en)}!`); add('toto', 'en', `This is ${withArticle(w)}.`); add('toto', 'en', `Oops! This is ${withArticle(w)}!`);
  for (const v of ['drink', 'eat']) { add('toto', 'en', `I ${v} ${withArticle(w)}!`); add('toto', 'en', `Oops! I ${v} ${withArticle(w)}!`); }
}
['Yes!', 'Look!', 'Woof! Look!'].forEach((t) => add('toto', 'en', t));
for (const t of ['טוטו רוצה להראות לך משהו. אבל הוא קצת מתבלבל! אם הוא צודק, נוגעים ב־✓. אם הוא טועה, נוגעים ב־✗.', 'טוטו צודק או טועה?', 'תפסת את טוטו!', 'נכון, טוטו צדק.', 'אוי, טוטו דווקא צדק הפעם.', 'טוטו התבלבל, וזה עבר.', 'טוטו הולך לנוח. תודה שתיקנתן אותו!', 'טוטו הולך לנוח. תודה שתיקנת אותו!']) add('mika', 'he', t);

// הסטודיו שגדל
for (const w of [...items, 'go', 'stop', 'fast', 'slow']) add('mika', 'en', `${cap(VOCAB[w].en)}!`);
['שבת שלום!', 'ערב טוב! הכוכבים יצאו לסטודיו.', 'מדבקות חדשות על קיר המילים!', 'מדבקה חדשה על קיר המילים!'].forEach((t) => add('mika', 'he', t));

const SYM_HE = { star: 'כוכב', moon: 'ירח', flower: 'פרח', fish: 'דג', car: 'מכונית', drum: 'תוף', rainbow: 'קשת', snail: 'חילזון' };
for (const n of ['שייה', 'אלמה']) {
  add('mika', 'he', `${n}, בחרי סמל שיהיה שלך.`); add('mika', 'he', n);
  for (const h of Object.values(SYM_HE)) add('mika', 'he', `${h}. זה הסמל של ${n}.`);
}
add('mika', 'he', 'שייה ואלמה ביחד!');

// הלהקה: כל ההוראות, המשוב והשירים
{
  const B = await import('../../src/content/band.js');
  for (const [k, v] of Object.entries(B.LINES.mika)) if (typeof v === 'string') add('mika', /[א-ת]/.test(v) ? 'he' : 'en', v);
  for (const n of ['שייה', 'אלמה']) add('mika', 'he', B.LINES.mika.turnOf(n));
  for (const n of ['Shaya', 'Alma']) add('mika', 'en', B.LINES.mika.bye(n));
  for (const v of Object.values(B.LINES.toto)) add('toto', 'en', v);
  for (const v of Object.values(B.LINES.bum)) add('bum', 'en', v);
  for (const v of Object.values(B.FEEDBACK)) if (typeof v === 'string') add('mika', 'he', v);
  add('mika', 'he', B.FEEDBACK.sisters('אלמה', 'שייה'));
  add('mika', 'he', B.GLOSS.everybody);
  for (const who of ['bum', 'toto']) for (const t of ['fast', 'slow']) {
    add('mika', 'en', B.COMMAND.play(who, t)); add('mika', 'he', B.GLOSS.play(who, t)); add('mika', 'he', B.FEEDBACK.playOk(who, t));
  }
  add('mika', 'en', B.COMMAND.everybodyStop); add('mika', 'en', B.COMMAND.letsSing);
  ['bum', 'toto'].forEach((w) => add(w, 'en', `Me? Hmm… ${w === 'bum' ? 'Toto' : 'Bum'}!`));
  for (const w of items) {
    add('mika', 'he', B.FEEDBACK.heardWord(w)); add('bum', 'en', `${cap(VOCAB[w].en)}!`);
    add('toto', 'en', `${cap(VOCAB[w].en)}? Hmm…`);
  }
  for (const p of ['Daddy', 'Mommy']) for (const t of ['fast', 'slowly']) add('mika', 'en', `${p}, play ${t}!`);
  add('mika', 'en', 'Stop! Go!');
}
// הוראות ומשפטים שכתובים ישירות במסכים
['בית הקפה סגור לנוח. להתראות!', 'הלהקה נחה עכשיו. להתראות!', 'הסטודיו נח עכשיו. נתראה בפעם הבאה.', 'התפריט מלא!', 'זה לא כובע!', 'שלום! זאת מיקה.',
  'את המקום הזה עוד בונים בסטודיו.', 'כדי לשחק, נוגעים בדוכן. בית הקפה, הלהקה, וגם טוטו המצחיק.', 'מי משחקת עכשיו? נוגעים בסמל שלך.',
  'במה נשחק היום? נוגעים במשחק.', 'אלה המשחקים בסטודיו. נוגעים במשחק שרוצים.', 'בית הקפה: מגישים לאורחים אוכל, באנגלית.', 'הלהקה: מנגנים, עוצרים ושרים, באנגלית.',
  'טוטו טועה: טוטו אומר מילה, ומחליטים אם הוא צודק.', 'ובמיקרופון: מדברים, וטוטו אומר את זה בקול שלו.', 'נכנסים לבית הקפה!', 'נכנסים ללהקה!', 'נכנסים לטוטו טועה!',
  'מחזיקים את המיקרופון לחוץ, אומרים את המילה, ועוזבים. טוטו יגיד אותה בקול שלך!'].forEach((t) => add('mika', 'he', t));

add('mika', 'he', 'ואפשר לשחק להקה גם בבית. ככה אומרים:');
import { HELP } from '../../src/content/help.js';
Object.values(HELP).forEach((t) => add('mika', 'he', t));
import { LINES as KL } from '../../src/content/karaoke.js';
Object.values(KL).forEach((t) => add('mika', 'he', t));
import { LINES as BLN } from '../../src/content/balloons.js';
Object.values(BLN).forEach((t) => add('mika', 'he', t));
import { LINES as FDL } from '../../src/content/feed.js';
Object.values(FDL).forEach((t) => add('mika', 'he', t));
for (const w of items) add('mika', 'en', `${cap(VOCAB[w].en)}!`);
// עולם החיות
import { LINES as ANL, QUESTIONS as ANQ, FACTS as ANF, ANIMAL_IDS } from '../../src/content/animals.js';
Object.values(ANL).forEach((t) => add('mika', 'he', t));
ANQ.forEach((q) => add('mika', 'he', q.text));
Object.values(ANF).forEach((t) => add('mika', 'he', t));
ANIMAL_IDS.forEach((a) => add('mika', 'en', `${cap(VOCAB[a].en)}!`));
// הקשת
import { LINES as RBL, QUESTIONS as RBQ, FACTS as RBF, BANDS } from '../../src/content/rainbow.js';
Object.values(RBL).forEach((t) => add('mika', 'he', t));
Object.values(RBQ).flat().forEach((t) => add('mika', 'he', t));
Object.values(RBF).forEach((t) => add('mika', 'he', t));
BANDS.forEach((c) => add('mika', 'en', `${cap(VOCAB[c].en)}!`));
// סופרים
import { LINES as CNL, NUMS } from '../../src/content/count.js';
Object.values(CNL).forEach((t) => add('mika', 'he', t));
NUMS.forEach((n) => add('mika', 'en', `${cap(VOCAB[n].en)}!`));

const saidFile = new URL('./said.json', import.meta.url);
if (fs.existsSync(saidFile)) JSON.parse(fs.readFileSync(saidFile, 'utf8')).forEach((k) => { const [w, l, ...t] = k.split('|'); add(w, l, t.join('|')); });

export const ALL_LINES = [...out].sort().map((k) => { const [who, lang, ...t] = k.split('|'); return { key: k, who, lang, text: t.join('|') }; });

if (import.meta.url === `file://${process.argv[1]}`) {
  const by = {}; let chars = 0;
  for (const l of ALL_LINES) { by[l.who] = (by[l.who] || 0) + 1; chars += l.text.length; }
  console.log({ lines: ALL_LINES.length, chars, byCharacter: by });
}

