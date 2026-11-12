// Isoko Link service worker
// Caches the app shell and public product/category data for low-bandwidth
// and offline use. Never caches mutations (POST/PUT/DELETE) and never
// pretends an offline write succeeded — those requests pass through and
// fail naturally so the UI can surface the error.

const CACHE_VERSION = 'isoko-v5';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const IMAGE_CACHE = `${CACHE_VERSION}-img`;

const APP_SHELL = [
  '/',
  '/browse',
  '/featured',
  '/about',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept non-GET requests — mutations must reach the network
  // and fail visibly if offline.
  if (req.method !== 'GET') return;

  // Navigation requests: network-first, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Supabase REST API (data): stale-while-revalidate, GET only.
  // Only cache reads from the products/categories tables to avoid
  // caching sensitive user data.
  const isSupabaseData =
    url.pathname.includes('/rest/v1/') &&
    (url.pathname.includes('products') || url.pathname.includes('categories') || url.pathname.includes('platform_settings'));

  if (isSupabaseData) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Same-origin static assets (JS, CSS, fonts): cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // Cross-origin images (Supabase storage): cache-first with stale-while-revalidate.
  if (req.destination === 'img' || url.pathname.includes('/storage/v1/object/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});
