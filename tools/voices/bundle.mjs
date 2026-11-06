// אורז את ההקלטות לחבילות קטנות (עד ~1.5MB) כדי שהאפליקציה תטען פחות קבצים.
// כל mp3 נשמר כמו שהוא, ברצף; bundles.json ממפה כל שורה לחבילה, היסט ואורך.
// הרצה: node tools/voices/bundle.mjs   (לא משנה את manifest.json של ההקלטות)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir = path.resolve('assets/voice');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const LIMIT = 1.5 * 1024 * 1024;
const outDir = path.join(dir, 'b');
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir);
const byWho = {};
for (const [k, f] of Object.entries(manifest)) (byWho[k.split('|')[0]] ||= []).push([k, f]);
const map = {}; const done = {}; let n = 0;
for (const [who, list] of Object.entries(byWho)) {
  let chunks = []; let size = 0; let name = '';
  // שם החבילה כולל טביעת תוכן, כדי שמכשיר לא ישמיע חבילה ישנה מהמטמון
  const flush = () => {
    if (!chunks.length) return;
    const data = Buffer.concat(chunks);
    const final = `${who}-${crypto.createHash('sha1').update(data).digest('hex').slice(0, 10)}.mp3`;
    fs.writeFileSync(path.join(outDir, final), data);
    for (const v of Object.values(map)) if (v[0] === name) v[0] = final;
    chunks = []; size = 0;
  };
  for (const [k, f] of list) {
    if (done[f]) { map[k] = done[f]; continue; }
    const buf = fs.readFileSync(path.join(dir, f));
    if (!chunks.length || size + buf.length > LIMIT) { flush(); name = `tmp-${n++}`; }
    done[f] = map[k] = [name, size, buf.length];
    chunks.push(buf); size += buf.length;
  }
  flush();
}
fs.writeFileSync(path.join(dir, 'bundles.json'), JSON.stringify(map));
console.log(Object.keys(map).length, 'lines in', fs.readdirSync(outDir).length, 'bundles');
