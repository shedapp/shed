// Changes service worker: app shell network-first (updates arrive on the next open), piano samples and icons cache-first.
const BUILD = '2610191500';
const SHELL = 'changes-shell-' + BUILD, MEDIA = 'changes-media-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', './index.html', './manifest.webmanifest']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA && k.startsWith('changes-')).map(k => caches.delete(k)));
    await self.clients.claim();
    const cl = await self.clients.matchAll({ type: 'window' }); cl.forEach(c => c.postMessage({ type: 'changes-updated', build: BUILD }));
  })());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (/\/(piano|icons)\//.test(url.pathname)) {
    e.respondWith(caches.open(MEDIA).then(async c => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }));
    return;
  }
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) caches.open(SHELL).then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
});
