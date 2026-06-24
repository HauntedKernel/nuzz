/* Nuzz service worker.
   - Main game shell ("/"): stale-while-revalidate — repeat opens paint INSTANTLY from cache and the
     newest version is fetched in the background (keeps "instant load" + "easy to push" both true).
   - Other pages (e.g. /aliens prototype): network-first, so each distinct page loads its REAL document
     instead of the cached app shell (the multi-page PWA gotcha). Offline falls back to cache.
   - Static assets (icons/manifest): stale-while-revalidate.
   Bump CACHE to force-purge everything. */
const CACHE = "nuzz-v7";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function swr(req, key) {           // stale-while-revalidate
  return caches.match(key || req).then((cached) => {
    const net = fetch(req)
      .then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key || req, copy)); }
        return res;
      })
      .catch(() => cached);
    return cached || net;
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    const isMain = url.origin === location.origin && (url.pathname === "/" || url.pathname === "/index.html");
    if (isMain) {
      e.respondWith(swr(req, "/index.html"));            // main game: instant from cache
    } else {
      // any other page (e.g. /aliens): always fresh from network, cache for offline fallback
      e.respondWith(
        fetch(req)
          .then((res) => { if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE).then((cc) => cc.put(req, c)); } return res; })
          .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
      );
    }
    return;
  }

  e.respondWith(swr(req));                               // static assets
});
