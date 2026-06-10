const CACHE_NAME = "pembuat-laporan-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Ignore failures to cache routes that might not be fully built/cached statically yet
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("Pre-caching assets warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bypass service worker for API requests and hot reload (webpack/next)
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_next") || url.pathname.includes("__next")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, return it
        return response;
      })
      .catch(() => {
        // Offline fallback: try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigation, return root page
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline content not available", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" })
          });
        });
      })
  );
});
