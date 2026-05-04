const CACHE_NAME = 'simulador-de-estudos-v35';
const ASSETS = [
  '/Simulador-de-estudos/',
  '/Simulador-de-estudos/index.html',
  '/Simulador-de-estudos/manifest.json',
  '/Simulador-de-estudos/logo.png',
  '/Simulador-de-estudos/icon-192.png',
  '/Simulador-de-estudos/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('workers.dev') || e.request.url.includes('anthropic.com')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const c = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));
        return res;
      }).catch(() => caches.match('/Simulador-de-estudos/index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const c = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));
        }
        return res;
      });
      return cached || net;
    })
  );
});
