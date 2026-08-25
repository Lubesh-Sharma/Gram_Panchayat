// Gram Panchayat Management System - Low Bandwidth & Offline Service Worker
const CACHE_NAME = 'gpms-v1-static';
const STATIC_ASSETS = [
  '/static/styles/landing.css',
  '/static/styles/citizens.css',
  '/static/styles/login.css',
  '/static/styles/admin.css',
  '/static/images/logo.jpeg',
  '/static/manifest.json'
];

// Install Event: Cache Core Static Resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static app shell resources');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Serve static assets Cache-First; Dynamic API calls Network-First
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Cache-First strategy for static files (/static/)
  if (requestUrl.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-First strategy with graceful fallback for page requests
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
