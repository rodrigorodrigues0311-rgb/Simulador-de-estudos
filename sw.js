// Cache versão — muda aqui para forçar atualização em todos os dispositivos
const CACHE_NAME = 'simulado-v7';
const ASSETS = ['./','./index.html','./manifest.json','./logo.png','./icon-192.png','./icon-512.png'];

self.addEventListener('install', e => {
  // Força ativação imediata sem esperar aba fechar
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Apaga TODOS os caches antigos
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deletando cache antigo:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      // Assume controle imediato de todas as abas abertas
      self.clients.claim();
      // Avisa todas as abas para recarregar
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
      });
    })
  );
});

self.addEventListener('fetch', e => {
  // Nunca cacheia chamadas ao Worker/API
  if (e.request.url.includes('workers.dev') ||
      e.request.url.includes('anthropic.com')) return;

  // Para navegação (HTML): sempre busca versão nova na rede primeiro
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Atualiza cache com versão nova
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Para outros assets: cache primeiro, mas atualiza em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
