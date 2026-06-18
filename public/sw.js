const APP_VERSION = '20260615a';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'APP_VERSION', version: APP_VERSION });
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const shouldBypassCache = request.mode === 'navigate'
    || url.pathname.endsWith('/manifest.json')
    || url.pathname.endsWith('/sw.js')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('/assets/icons/icon.png')
    || url.pathname.endsWith('/assets/icons/logo.png');

  if (!shouldBypassCache) return;

  event.respondWith(fetch(new Request(request, { cache: 'no-store' })));
});
