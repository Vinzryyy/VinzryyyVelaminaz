/**
 * Service worker — cache-first for gallery images, network-first for pages.
 * Enables offline viewing of previously visited galleries.
 */

const CACHE_VERSION = "%%BUILD_ID%%"; // replaced at build time
const CACHE_NAME = `vinzryyy-${CACHE_VERSION}`;
const STATIC_ASSETS = ["/", "/favicon.svg", "/manifest.json"];

/* ── Install — pre-cache shell ───────────────────────────────────── */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate — clean old caches ─────────────────────────────────── */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch strategy ──────────────────────────────────────────────── */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Gallery images & photos — cache-first (they never change)
  if (url.pathname.startsWith("/gallery/") || url.pathname.startsWith("/photos/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — network-first with cache fallback; on total failure reload clean
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS & CSS — network-first; if both network AND cache miss, force a full page
  // reload so the browser fetches the latest index.html with correct asset hashes
  if (request.destination === "script" || request.destination === "style") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            // Asset missing from both network and cache — stale HTML is likely
            // the cause. Unregister the SW so the next navigation gets a clean load.
            self.registration.unregister();
            return new Response("", { status: 404, statusText: "Asset not found" });
          })
        )
    );
    return;
  }

  // Everything else — network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
