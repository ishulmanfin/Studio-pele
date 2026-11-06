// אוצר מילים ומבנים. כל פריט: מזהה, אנגלית, עברית, סוג, ופרק מבוא.
// מבנים (kind: 'structure') נמדדים בנפרד ממילים.
export const VOCAB = {
  hello:   { en: 'Hello',  he: 'שלום',      kind: 'word', intro: 'studio' },
  bye:     { en: 'Bye',    he: 'להתראות',   kind: 'word', intro: 'studio' },
  open:    { en: 'Open',   he: 'פותחים',    kind: 'word', intro: 'studio' },
  close:   { en: 'Close',  he: 'סוגרים',    kind: 'word', intro: 'studio' },
  apple:   { en: 'apple',  he: 'תפוח',      kind: 'word', intro: 'cafe', art: 'apple',  group: 'food' },
  banana:  { en: 'banana', he: 'בננה',      kind: 'word', intro: 'cafe', art: 'banana', group: 'food' },
  cookie:  { en: 'cookie', he: 'עוגייה',    kind: 'word', intro: 'cafe', art: 'cookie', group: 'food' },
  water:   { en: 'water',  he: 'מים',       kind: 'word', intro: 'cafe', art: 'water',  group: 'drink', cold: true },
  milk:    { en: 'milk',   he: 'חלב',       kind: 'word', intro: 'cafe', art: 'milk',   group: 'drink', cold: true },
  juice:   { en: 'juice',  he: 'מיץ',       kind: 'word', intro: 'cafe', art: 'juice',  group: 'drink', cold: true },
  please:  { en: 'please', he: 'בבקשה',     kind: 'word', intro: 'cafe' },
  s_please:   { en: '… , please', he: 'בקשה עם please',  kind: 'structure', intro: 'cafe' },
  s_iwant:    { en: 'I want …',    he: 'אני רוצה…',        kind: 'structure', intro: 'cafe' },
  s_canihave: { en: 'Can I have … , please?', he: 'אפשר לקבל…?', kind: 'structure', intro: 'cafe' },
  s_and:      { en: '… and …',     he: 'שני דברים ברצף',   kind: 'structure', intro: 'cafe' },
  s_category: { en: 'Something cold / to eat', he: 'בקשה כללית (כמה תשובות נכונות)', kind: 'structure', intro: 'cafe' },
  go:      { en: 'Go',     he: 'סע / ממשיכים', kind: 'word', intro: 'band' },
  stop:    { en: 'Stop',   he: 'עצור',        kind: 'word', intro: 'band' },
  fast:    { en: 'fast',   he: 'מהר',         kind: 'word', intro: 'band' },
  slow:    { en: 'slow',   he: 'לאט',         kind: 'word', intro: 'band' },
  s_play:     { en: '… , play fast / slowly!', he: 'הוראה לנגן: מי ובאיזה קצב', kind: 'structure', intro: 'band' },
  s_everybody:{ en: 'Everybody, stop!', he: 'הוראה לכולם (כמה תשובות נכונות)', kind: 'structure', intro: 'band' },
  s_letssing: { en: "Let's sing!", he: 'בואו נשיר', kind: 'structure', intro: 'band' },
  // חיות – "עולם החיות"
  cow:     { en: 'cow',    he: 'פרה',       kind: 'word', intro: 'animals', art: 'cow',   group: 'animal' },
  dog:     { en: 'dog',    he: 'כלב',       kind: 'word', intro: 'animals', art: 'dog',   group: 'animal' },
  cat:     { en: 'cat',    he: 'חתול',      kind: 'word', intro: 'animals', art: 'cat',   group: 'animal' },
  duck:    { en: 'duck',   he: 'ברווז',     kind: 'word', intro: 'animals', art: 'duck',  group: 'animal' },
  lion:    { en: 'lion',   he: 'אריה',      kind: 'word', intro: 'animals', art: 'lion',  group: 'animal' },
  fish:    { en: 'fish',   he: 'דג',        kind: 'word', intro: 'animals', art: 'fish',  group: 'animal' },
  bird:    { en: 'bird',   he: 'ציפור',     kind: 'word', intro: 'animals', art: 'bird',  group: 'animal' },
  frog:    { en: 'frog',   he: 'צפרדע',     kind: 'word', intro: 'animals', art: 'frog',  group: 'animal' },
  horse:   { en: 'horse',  he: 'סוס',       kind: 'word', intro: 'animals', art: 'horse', group: 'animal' },
  sheep:   { en: 'sheep',  he: 'כבשה',      kind: 'word', intro: 'animals', art: 'sheep', group: 'animal' },
};

// צלילי אותיות (לשייה): צליל פותח של מילה מוכרת. סדר האותיות לפי שלב 2 של Letters and Sounds
// (משרד החינוך הבריטי, רישיון Open Government Licence). רק עיצורים שאפשר להשמיע בבירור.
export const SOUNDS = { m: 'mmm', s: 'sss', l: 'lll', b: 'buh', c: 'kuh', g: 'guh' };
for (const [l, snd] of Object.entries(SOUNDS)) VOCAB[`ph_${l}`] = { en: `${l} (${snd})`, he: `הצליל ${snd} בתחילת מילה`, kind: 'sound', intro: 'cafe' };

// חפצים שאינם אוכל — מסיחים מצחיקים, לא נמדדים כאוצר מילים בפרק הזה.
export const SILLY = {
  shoe: { en: 'shoe', he: 'נעל', art: 'shoe', reactHe: 'נעל? זה לא טעים לי!' },
  sock: { en: 'sock', he: 'גרב', art: 'sock', reactHe: 'גרב? אי אפשר לאכול גרב!' },
};

export const word = (id) => VOCAB[id] || SILLY[id];

// פריטי הספרייה נרשמים כאן כנתונים בלבד. הם נכנסים למשחק רק אחרי אישור הורה (ראו src/engine/growth.js).
import { PACKS } from './library.js';
for (const p of PACKS) for (const i of p.items) {
  VOCAB[i.id] = { en: i.en, he: i.he, kind: 'word', intro: 'cafe', art: i.id, group: i.group, cold: i.cold, article: i.article, color: i.color, pack: p.id };
}
