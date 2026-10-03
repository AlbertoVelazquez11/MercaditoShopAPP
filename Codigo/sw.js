// sw.js — Service Worker cache-first para el shell (offline-first).
const CACHE = 'mercadito-v1';

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/views.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/db.js',
  './js/utils.js',
  './js/negocio.js',
  './js/dominio.js',
  './js/export.js',
  './js/gestures.js',
  './js/components/header.js',
  './js/components/toast.js',
  './js/components/modal.js',
  './js/components/swipe-item.js',
  './js/components/date-filter.js',
  './js/views/home.js',
  './js/views/admin.js',
  './js/views/config.js',
  './js/views/_stub.js',
  './js/views/compras.js',
  './js/views/catalogar.js',
  './js/views/inventario.js',
  './js/views/tipo-lotes.js',
  './js/views/corte.js',
  './js/views/descuentos.js',
  './js/views/venta.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          if (res.ok && e.request.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
