// מטמון לא מקוון: כל הספרייה המאושרת עובדת גם בלי רשת.
const V = 'studio-pele-v27';
const FILES = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg',
  'src/main.js', 'src/engine/store.js', 'src/engine/progress.js', 'src/engine/voice.js', 'src/engine/stage.js',
  'src/art/puppets.js', 'src/art/sets.js', 'src/content/vocab.js', 'src/content/season.js', 'src/content/cafe.js', 'src/content/library.js', 'src/content/missions.js', 'src/content/band.js', 'src/ui/band.js', 'src/engine/music.js', 'src/engine/puppet.js', 'src/ui/silly.js', 'src/content/silly.js', 'src/engine/growth.js', 'src/engine/split.js', 'src/engine/fun.js', 'src/gate.js', 'src/content/help.js', 'src/content/karaoke.js', 'src/ui/karaoke.js', 'src/gate-code.js', 'src/content/balloons.js', 'src/ui/balloons.js', 'src/content/feed.js', 'src/ui/feed.js', 'src/content/animals.js', 'src/ui/animals.js', 'src/content/rainbow.js', 'src/ui/rainbow.js', 'src/content/count.js', 'src/ui/count.js',
  'src/ui/home.js', 'src/ui/cafe.js', 'src/ui/parents.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const same = url.origin === self.location.origin;
  // קבצי קול בחבילות: השם כולל טביעת תוכן ולכן לא משתנה – מהמטמון קודם (עובד גם בלי רשת)
  const immutable = same && url.pathname.includes('/assets/voice/b/');
  const save = (res) => { if (res.ok && (same || url.href.includes('fonts.g'))) { const copy = res.clone(); caches.open(V).then((c) => c.put(e.request, copy)); } return res; };
  if (immutable || !same) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then(save)));
    return;
  }
  // קוד ורשימת הקולות: מהרשת קודם, כדי שגרסה חדשה לא תתערבב עם ישנה; בלי רשת – מהמטמון
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(save).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
