// Olympus service worker: app shell network-first (updates arrive on the next open, cached copy when offline); the 3D library and icons cache-first.
const BUILD = '2610201340';
const SHELL = 'olympus-shell-' + BUILD, MEDIA = 'olympus-media-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', './index.html', './app.js', './manifest.webmanifest']).catch(() => {})).then(() => caches.open(MEDIA).then(c => c.addAll(['./three.min.js', './icon-180.png', './icon-360.png']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (/three\.min\.js$|icon-\d+\.png$/.test(url.pathname)) {
    e.respondWith(caches.open(MEDIA).then(async c => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }));
    return;
  }
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) caches.open(SHELL).then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
});
