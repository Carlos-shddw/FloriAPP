const CACHE_VERSION = 'v1.6.0';
const SCOPE_URL = self.registration.scope;
const SCOPE_NAME = new URL(SCOPE_URL).pathname.split('/').filter(Boolean).join('-') || 'root';
const CACHE_PREFIX = `floricultura-${SCOPE_NAME.toLowerCase()}`;
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = new URL('pages/offline.html', SCOPE_URL).href;

const APP_SHELL_PATHS = [
  '',
  'index.html',
  'pages/offline.html',
  'pages/sobre.html',
  'assets/css/styles.css',
  'assets/css/auth.css',
  'assets/css/catalog.css',
  'assets/css/components/header.css',
  'assets/css/components/cards.css',
  'assets/js/app.js',
  'assets/js/db.js',
  'assets/js/modules/api.js',
  'assets/js/modules/catalog.js',
  'assets/js/modules/ui.js',
  'assets/js/modules/utils.js',
  'manifest.json'
];

const APP_SHELL = APP_SHELL_PATHS.map((path) => new URL(path, SCOPE_URL).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => {
        console.log('[SW] App Shell carregado com sucesso.');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Falha ao pré-carregar o App Shell:', error);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  const legacyCaches = new Set([
    'floricultura-static-v1.0.0',
    'floricultura-dynamic-v1.0.0'
  ]);

  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        const isAppCache = key.startsWith(`${CACHE_PREFIX}-`) || legacyCaches.has(key);
        if (isAppCache && key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
          return caches.delete(key);
        }
        return undefined;
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch((error) => console.error('[SW] Erro ao guardar navegação:', error));
          }
          return response;
        })
        .catch(async () => {
          return await caches.match(request) || await caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, copy))
            .catch((error) => console.error('[SW] Erro ao guardar recurso:', error));
        }
        return networkResponse;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});