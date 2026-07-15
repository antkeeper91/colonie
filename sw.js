/* AntKeep Pro — Service Worker (skeleton)
 * Full offline caching will be wired when the app shell is complete.
 */

const CACHE_NAME = 'antkeep-pro-v12-ios-oled';
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './css/styles.css?v=ios2',
  './js/app.js',
  './js/app.js?v=ios2',
  './js/db.js',
  './js/data/advisor-species.js',
  './js/modules/theme.js',
  './js/modules/router.js',
  './js/modules/ui.js',
  './js/modules/analytics.js',
  './js/modules/dashboard.js',
  './js/modules/colonies.js',
  './js/modules/feeding.js',
  './js/modules/backup.js',
  './js/modules/settings.js',
  './js/modules/encyclopedia.js',
  './js/modules/encyclopedia-view.js',
  './js/modules/advisor.js',
  './data/encyclopedia.json',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
];

// Dexie ESM (cached on first successful network fetch via fetch handler)
const RUNTIME_CDN = [
  'https://cdn.jsdelivr.net/npm/dexie@4.0.11/dist/dexie.mjs',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isCdn = RUNTIME_CDN.some((u) => url.href.startsWith(u.replace(/\/[^/]*$/, '')) || url.href === u);

  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((response) => {
          const cacheable =
            response &&
            response.status === 200 &&
            (response.type === 'basic' || (isCdn && response.type === 'cors'));
          if (cacheable) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
