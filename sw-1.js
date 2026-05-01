// ═══════════════════════════════════════════════
// SERVICE WORKER — Simulado PWA
// ═══════════════════════════════════════════════
const CACHE = 'simulado-v1';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&family=Nunito:wght@400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Instala e faz cache dos arquivos essenciais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ARQUIVOS).catch(() => {
        // Se algum recurso externo falhar, ignora (app ainda funciona)
        return cache.addAll(['./index.html', './manifest.json', './logo.png']);
      });
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Busca: Cache First para assets locais, Network First para API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API Anthropic — sempre online (nunca cacheia)
  if (url.hostname === 'api.anthropic.com') return;

  // Fontes e CDN — cacheia após primeiro acesso
  if (url.hostname.includes('googleapis') || url.hostname.includes('cloudflare')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Arquivos locais — Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Fallback para index.html em navegação offline
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
