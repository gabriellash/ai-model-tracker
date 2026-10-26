// Network first for everything, falling back to the copy saved on this device, so the page and its data work offline.
const CACHE = 'amt-{{VERSION}}';
const SHELL = {{SHELL}};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // status.json is never served from the cache: a failed fetch is how the page knows it is offline.
  if (url.pathname.endsWith('/status.json')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req.mode === 'navigate' ? './' : stripCacheBust(req), res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req.mode === 'navigate' ? './' : stripCacheBust(req), { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      throw err;
    }
  })());
});

function stripCacheBust(req) {
  const u = new URL(req.url);
  u.searchParams.delete('v');
  return u.toString();
}
