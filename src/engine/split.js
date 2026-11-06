// משפטים מורכבים (שני פריטים, "לא זה") מוקלטים בחלקים ומושמעים ברצף, במקום הקלטה לכל צירוף.
// כך מילה חדשה מהספרייה מוסיפה כמה שורות, ולא מאות. משמש גם את tools/voices/lines.mjs.
const SPLITS = {
  en: [
    /^(I want .+?) (and .+, please\.)$/,
    /^(.+\? Hmm…) (.+, please\.)$/,
    /^(.+?) (and .+, please\.)$/,
    /^(\S+\?) (Hmm… .+\.)$/,
  ],
  he: [
    /^(זכרת שני דברים:|שני דברים:) (\S+) (ו\S+\.)$/,
  ],
};
export function splitLine(text, lang = 'en') {
  for (const re of SPLITS[lang] || []) { const m = text.match(re); if (m) return m.slice(1); }
  return null;
}
