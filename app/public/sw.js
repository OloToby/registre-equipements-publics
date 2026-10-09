// Service Worker — PWA hors-ligne technicien
// Source : programme p. 38 (mode déconnecté), D-004 (Dexie.js + service worker)
// Conception auteur : stratégie cache-first pour les assets, network-first pour l'API

const CACHE_NAME = "registre-v1";
const STATIC_ASSETS = [
  "/",
  "/technicien",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API : network-first (essaie le réseau, tombe sur l'erreur hors-ligne sinon)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Hors-ligne — données mises en file d'attente" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Assets statiques : cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match("/") || new Response("Hors-ligne", { status: 503 }));
    })
  );
});

// Sync en arrière-plan quand la connexion revient
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-interventions") {
    event.waitUntil(
      fetch("/api/interventions/sync-queue", { method: "POST" }).catch(() => {})
    );
  }
});
