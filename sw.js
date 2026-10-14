// Shed service worker.
//  • App shell + engine code: network first, cached copy only when offline (so updates arrive on the next open).
//  • Piano samples, models, icons: cache first (large, immutable).
//  • Tells open pages when a new version has been installed so they can offer a reload.
const BUILD = '2610140056';
const SHELL = 'shed-shell-' + BUILD, MEDIA = 'shed-media-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', './index.html', './manifest.webmanifest', './demucs/shed-demucs.js']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)));
    // engine code must never be served stale: purge any copy an older worker put in the media cache
    const m = await caches.open(MEDIA); for (const req of await m.keys()) if (/\/demucs\//.test(req.url)) await m.delete(req);
    await self.clients.claim();
    const cl = await self.clients.matchAll({ type: 'window' }); cl.forEach(c => c.postMessage({ type: 'shed-updated', build: BUILD }));
  })());
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (/\/(piano|icons|models)\//.test(url.pathname)) {
    e.respondWith(caches.open(MEDIA).then(async c => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }));
    return;
  }
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) caches.open(SHELL).then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
});
