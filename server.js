// שרת סטטי קטן + נקודת קצה אופציונלית לקול בענן.
// מפתחות שירות נשארים כאן בצד השרת (משתני סביבה) ולעולם לא נשלחים לדפדפן.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, cloudTts: !!process.env.TTS_API_KEY }));
  }
  if (url.pathname === '/api/tts') {
    // מקום לחיבור ספק קול מאושר (למשל לקולות דמויות מוקלטים/מסונתזים). כבוי כברירת מחדל.
    res.writeHead(501, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'cloud TTS not configured' }));
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  try {
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`Studio running: http://localhost:${PORT}`));
