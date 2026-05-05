const CACHE_NAME = 'simulador-de-estudos-v42';
const ASSETS = [
  '/Simulador-de-estudos/',
  '/Simulador-de-estudos/index.html',
  '/Simulador-de-estudos/manifest.json',
  '/Simulador-de-estudos/icon-192.png',
  '/Simulador-de-estudos/icon-512.png'
];

// INSTALL — pré-cache dos assets
self.addEventListener('install', e => {
  self.skipWaiting(); // assume controle imediatamente
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

// ACTIVATE — apaga TODOS os caches antigos sem exceção
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) {
          console.log('[SW] Deletando cache antigo:', k);
          return caches.delete(k);
        }
      }))
    ).then(() => self.clients.claim())
     .then(() => {
       // Força reload em todos os clientes abertos
       self.clients.matchAll({ type: 'window' }).then(clients => {
         clients.forEach(client => client.navigate(client.url));
       });
     })
  );
});

// FETCH — network-first para HTML, cache-first para resto
self.addEventListener('fetch', e => {
  // Não intercepta chamadas de API
  if (e.request.url.includes('workers.dev') ||
      e.request.url.includes('anthropic.com')) return;

  // HTML → sempre busca na rede primeiro
  if (e.request.mode === 'navigate' ||
      e.request.url.endsWith('.html') ||
      e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const c = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/Simulador-de-estudos/index.html')))
    );
    return;
  }

  // Outros assets → cache-first com atualização em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, res.clone()));
        }
        return res;
      });
      return cached || net;
    })
  );
});
