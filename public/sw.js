// =============================================================
//  Service Worker Aveho EC
//  Stratégie cache adaptée par type de requête :
//   - STATIC (manifest, icônes, fonts)    -> cache-first
//   - PAGES (HTML routes)                  -> network-first avec fallback cache
//   - GET Supabase REST/RPC                -> stale-while-revalidate (cache+réseau)
//   - WRITES Supabase (POST/PATCH/DELETE)  -> network-only, jamais en cache
//   - JS/CSS Next chunks                   -> cache-first (immutables hashés)
//
//  Permet la consultation en mode déconnecté des dernières données vues.
//
//  ⚠️ IMPORTANT : à CHAQUE bump de version applicative, mettre à jour
//  la constante VERSION ci-dessous. Sans ça, le SW continue de servir
//  les anciens chunks et les nouveaux composants du layout ne se montent
//  pas même si /api/version renvoie la nouvelle version.
//  Procédure automatique : voir scripts/sync-sw-version.js
// =============================================================

const VERSION = "aveho-ec-0.55.9";  // ← À synchroniser avec package.json à chaque release
const STATIC_CACHE = `${VERSION}-static`;
const DATA_CACHE = `${VERSION}-data`;
const PAGE_CACHE = `${VERSION}-pages`;

const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Alpha 0.48.1 : page offline 100% statique (HTML pur, pas de chunks Next)
const OFFLINE_PAGES = ["/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).catch(() => {}),
      caches.open(PAGE_CACHE).then((c) => c.addAll(OFFLINE_PAGES)).catch(() => {}),
    ])
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Alpha 0.52.7 : en mode dev (localhost), bypass complet du SW pour Next chunks
  // Évite les 503 quand HMR rebuild un chunk
  const isDev = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isDev && (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/"))) {
    return;  // Le navigateur fait son fetch normal
  }

  if (STATIC_ASSETS.some((a) => url.pathname === a) || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  if (url.hostname.endsWith(".supabase.co") && (url.pathname.includes("/rest/") || url.pathname.includes("/rpc/"))) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(req, PAGE_CACHE));
    return;
  }
  event.respondWith(networkFirst(req, DATA_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    // Alpha 0.52.7 : pas de bruit en console pour les chunks manquants
    // (le navigateur retentera automatiquement à la prochaine navigation)
    return Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Alpha 0.47.0 : pour les routes HTML, fallback sur /offline qui est cachée
    // Alpha 0.48.1 : pointe vers /offline.html (HTML pur sans chunks Next)
    if (req.mode === "navigate" || req.destination === "document") {
      const offlinePage = await cache.match("/offline.html");
      if (offlinePage) return offlinePage;
    }
    return new Response("Hors-ligne — aucune donnée en cache.", { status: 503, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached || new Response("Hors-ligne", { status: 503 }));
  return cached || fetchPromise;
}

// =============================================================
//  Alpha 0.17.1 — Gestion des push notifications VAPID
//  Alpha 0.20.0 — Regroupement intelligent par tag
// =============================================================
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Aveho", body: event.data.text() }; }
  const { title, body, url, icon, tag } = payload;
  const finalTag = tag || "aveho-notif";

  event.waitUntil((async () => {
    // Alpha 0.20.0 : regroupement intelligent
    // Si une notif avec le même tag existe déjà (non encore ouverte),
    // on incrémente un compteur et on met à jour le titre/body.
    try {
      const existing = await self.registration.getNotifications({ tag: finalTag });
      if (existing.length > 0) {
        // Récupérer le compteur précédent (stocké dans data)
        const prev = existing[0];
        const prevCount = (prev.data && prev.data.count) || 1;
        const newCount = prevCount + 1;
        // Fermer l'ancienne et en afficher une nouvelle groupée
        prev.close();
        return self.registration.showNotification(
          `${title || "Aveho"} (${newCount})`,
          {
            body: `${newCount} notifications du même type. Dernière : ${body || ""}`,
            icon: icon || "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            data: { url: url || "/accueil", count: newCount },
            tag: finalTag,
            requireInteraction: false,
            renotify: true, // vibrer/sonner même si le tag existait
          }
        );
      }
    } catch (e) {
      // En cas d'erreur sur getNotifications, on tombe sur l'affichage simple
    }

    // Affichage standard (première notif du tag)
    return self.registration.showNotification(title || "Aveho", {
      body: body || "",
      icon: icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: url || "/accueil", count: 1 },
      tag: finalTag,
      requireInteraction: false,
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/accueil";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
