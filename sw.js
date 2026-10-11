// Shed service worker: the app shell is refreshed from the network when possible;
// piano samples and icons are kept on the device after first use.
const SHELL = 'shed-shell-v1', MEDIA = 'shed-media-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', './index.html', './manifest.webmanifest']).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (/\/(piano|icons)\//.test(url.pathname)) {
    e.respondWith(caches.open(MEDIA).then(async c => { const hit = await c.match(e.request); if (hit) return hit; const res = await fetch(e.request); if (res.ok) c.put(e.request, res.clone()); return res; }));
    return;
  }
  e.respondWith(fetch(e.request).then(res => { if (res.ok && e.request.method === 'GET') caches.open(SHELL).then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
});
