const APP_VERSION = '20260621a';
const SHELL_CACHE = `shell-${APP_VERSION}`;
const SHELL_URL = 'index.html';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Precache the app shell so the PWA can always boot, even if the network
    // hiccups during a cold start (otherwise the user gets a white screen).
    try {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(SHELL_URL, { cache: 'no-store' }));
    } catch (error) {
      // Best-effort precache; never block install on it.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name !== SHELL_CACHE)
        .map((name) => caches.delete(name))
    );
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

  // Never touch API calls - always let them hit the network directly.
  if (url.pathname.includes('/api/')) return;

  const isNavigation = request.mode === 'navigate';
  const shouldBypassCache = isNavigation
    || url.pathname.endsWith('/manifest.json')
    || url.pathname.endsWith('/sw.js')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('/assets/icons/icon.png')
    || url.pathname.endsWith('/assets/icons/logo.png');

  if (!shouldBypassCache) return;

  // Network-first (fresh content), but fall back to cache so a transient
  // network failure on launch never produces a blank white screen.
  event.respondWith((async () => {
    try {
      const response = await fetch(new Request(request, { cache: 'no-store' }));
      if (isNavigation && response && response.ok) {
        // Keep the shell fresh for future offline boots.
        try {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(SHELL_URL, response.clone());
        } catch (error) {
          // ignore cache write failures
        }
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (isNavigation) {
        const shell = await caches.match(SHELL_URL);
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
