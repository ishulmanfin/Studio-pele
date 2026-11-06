// מטמון לא מקוון: כל הספרייה המאושרת עובדת גם בלי רשת.
const V = 'studio-pele-v15';
const FILES = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg',
  'src/main.js', 'src/engine/store.js', 'src/engine/progress.js', 'src/engine/voice.js', 'src/engine/stage.js',
  'src/art/puppets.js', 'src/art/sets.js', 'src/content/vocab.js', 'src/content/season.js', 'src/content/cafe.js', 'src/content/library.js', 'src/content/missions.js', 'src/content/band.js', 'src/ui/band.js', 'src/engine/music.js', 'src/engine/puppet.js', 'src/ui/silly.js', 'src/content/silly.js', 'src/engine/growth.js', 'src/engine/split.js', 'src/engine/fun.js', 'src/gate.js', 'src/gate-code.js',
  'src/ui/home.js', 'src/ui/cafe.js', 'src/ui/parents.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
      const copy = res.clone(); caches.open(V).then((c) => c.put(e.request, copy));
    }
    return res;
  }).catch(() => hit)));
});
