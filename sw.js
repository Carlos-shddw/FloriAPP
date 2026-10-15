const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `floricultura-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `floricultura-dynamic-${CACHE_VERSION}`;

// Recursos essenciais do App Shell
const APP_SHELL = [
  '/',
  '/index.html',
  '/pages/offline.html',
  '/pages/sobre.html',
  '/assets/css/styles.css',
  '/assets/css/components/header.css',
  '/assets/css/components/cards.css',
  '/assets/js/app.js',
  '/assets/js/db.js',
  '/assets/js/modules/api.js',
  '/assets/js/modules/ui.js',
  '/assets/js/modules/utils.js',
  '/manifest.json'
];

// Instalação: Pré-carregamento estático
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pré-carregamento do App Shell concluído');
      return cache.addAll(APP_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// Ativação: Limpeza de caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('[SW] A remover cache antiga:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de Pedidos (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Estratégia 1: Navegação HTML -> Network First com fallback para offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => cached || caches.match('/pages/offline.html'));
        })
    );
    return;
  }

  // Estratégia 2: Recursos Estáticos (CSS, JS, Imagens) -> Cache First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});