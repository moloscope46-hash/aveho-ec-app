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

const VERSION = "aveho-ec-0.59.2";  // ← À synchroniser avec package.json à chaque release
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

// Alpha 0.55.26 : limites pour éviter cache débordant indéfiniment
const MAX_DATA_CACHE_ENTRIES = 100;   // Supabase REST/RPC
const MAX_PAGE_CACHE_ENTRIES = 30;    // pages HTML

/** Trim un cache LRU-style en supprimant les entrées les plus anciennes */
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  } catch (e) {
    // silent — pas critique
  }
}

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

  // Alpha 0.55.52 : bypass complet des schémas non-cachables.
  // chrome-extension://, moz-extension://, safari-extension://, data:, blob:, file:, ws(s):
  // → cache.put() throw "Request scheme '...' is unsupported"
  // Les extensions navigateur (LastPass, Dashlane, Grammarly, MetaMask, etc.) injectent
  // souvent des requêtes vers leurs propres ressources qui passent par le SW de la page.
  // On les laisse au navigateur sans intercepter.
  if (!req.url.startsWith("http://") && !req.url.startsWith("https://")) {
    return;
  }

  const url = new URL(req.url);

  // 0.58.75 : bypass des CDN tiers connus (CORS bloque le SW sur ces domaines).
  // Le SW ne peut pas intercepter ces requêtes — on les laisse passer au navigateur.
  // qrserver.com (QR codes 0.58.72), Tabler Icons CDN, Google Fonts si jamais utilisé, etc.
  const EXTERNAL_CDNS = [
    "api.qrserver.com",       // 0.58.72 — génération QR matériel
    "cdn.jsdelivr.net",       // libs occasionnelles
    "unpkg.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "cdnjs.cloudflare.com",
  ];
  if (EXTERNAL_CDNS.includes(url.hostname)) {
    return;  // Le navigateur fait son fetch normal sans interception SW
  }

  // 0.55.52 : aussi ignorer les requêtes cross-origin qu'on ne contrôle pas
  // (sauf Supabase qu'on cache exprès plus bas)
  // Note : on garde fetch normal pour les CDN d'icônes etc., mais on ne tente pas de les cacher
  // si elles ne sont pas dans notre stratégie.

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
  // Alpha 0.55.14 : notes changelog en cacheFirst (jamais modifiées une fois publiées)
  // Fix le 503 sur le tooltip hover qui faisait fetch sur /changelog-notes/*.html
  if (url.pathname.startsWith("/changelog-notes/")) {
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

// 0.55.52 : wrapper safe pour cache.put — silent fail sur schémas non supportés
// (chrome-extension, moz-extension, data:, blob:, ws://, etc.) qui throw normalement.
// Évite "Failed to execute 'put' on 'Cache': Request scheme '...' is unsupported"
async function safeCachePut(cache, req, res) {
  try {
    const url = (typeof req === "string" ? req : req.url) || "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) return;
    if (res.type === "opaque" || res.type === "opaqueredirect") return;
    await cache.put(req, res);
  } catch (_) {
    // Silent fail — pas de noise dans la console
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) await safeCachePut(cache, req, res.clone());
    return res;
  } catch (e) {
    // 0.55.14 : pour les notes changelog, renvoyer une vraie 503 lisible
    // (au lieu de Response.error() qui rend le fetch côté JS un network error)
    const url = new URL(req.url);
    if (url.pathname.startsWith("/changelog-notes/")) {
      return new Response(
        `<p style="padding:14px;color:#c0392b;font-family:sans-serif">Note non disponible hors-ligne. Reconnectez-vous pour la charger.</p>`,
        { status: 503, statusText: "Offline", headers: { "Content-Type": "text/html" } }
      );
    }
    // Alpha 0.52.7 : pas de bruit en console pour les chunks manquants
    // 0.58.24 : on re-throw l'erreur native (au lieu de fabriquer une 504)
    // pour que la console montre une seule erreur (Failed to load) au lieu
    // du combo "504 + Failed to load resource".
    throw e;
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) {
      await safeCachePut(cache, req, res.clone());
      // 0.55.26 : éviter croissance infinie
      const limit = cacheName.endsWith("-pages") ? MAX_PAGE_CACHE_ENTRIES : MAX_DATA_CACHE_ENTRIES;
      trimCache(cacheName, limit);
    }
    // 0.56.11 : même si statut non-ok (404/500/etc.), on renvoie la réponse réseau
    // au lieu de fallback offline — ça évite le faux 503 sur les pages dynamiques
    // qui ont juste un statut inhabituel
    return res;
  } catch (e) {
    // 0.55.21 : retry 1x avec petit délai (transient network errors)
    try {
      await new Promise(r => setTimeout(r, 100));
      const res2 = await fetch(req);
      // 0.56.11 : retourner même les non-ok (cf. ci-dessus)
      if (res2) {
        if (res2.ok) await safeCachePut(cache, req, res2.clone());
        return res2;
      }
    } catch (_) {}

    const cached = await cache.match(req);
    if (cached) return cached;
    // Alpha 0.47.0 : pour les routes HTML, fallback sur /offline qui est cachée
    // Alpha 0.48.1 : pointe vers /offline.html (HTML pur sans chunks Next)
    // 0.58.2 : élargi pour aussi matcher les requêtes Accept: text/html (prefetch Next)
    //         → évite les 503 transitoires sur /accueil et autres pages
    const isHtmlReq =
      req.mode === "navigate" ||
      req.destination === "document" ||
      (req.headers.get("accept") || "").includes("text/html");

    if (isHtmlReq) {
      const offlinePage = await cache.match("/offline.html");
      if (offlinePage) return offlinePage;
      // 0.55.21 : si /offline.html pas encore caché, on renvoie un HTML inline
      // avec status 200 (au lieu de 503 qui apparaît dans les logs console)
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hors-ligne</title>
        <style>body{font-family:sans-serif;background:#f4f7fa;color:#142131;text-align:center;padding:60px 20px}
        h1{color:#185FA5}p{color:#6c7a89}</style></head>
        <body><h1>📡 Hors-ligne</h1><p>Vérifiez votre connexion et rechargez la page.</p>
        <button onclick="location.reload()" style="background:#185FA5;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;margin-top:14px">Réessayer</button>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    // 0.58.77 : ne plus throw l'erreur réseau native — ça pollue la console
    // avec "Uncaught (in promise) TypeError: Failed to fetch". À la place on
    // retourne une Response 503 silencieuse que l'appelant peut gérer.
    // Si l'erreur est CORS/Failed to fetch sur un fetch programmatique JS,
    // le code appelant (Supabase client par ex) gérera son fallback proprement.
    return new Response(
      JSON.stringify({ error: "Service indisponible — hors ligne ou erreur réseau", offline: true }),
      { status: 503, statusText: "Service Unavailable", headers: { "Content-Type": "application/json" } }
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) {
        safeCachePut(cache, req, res.clone());
        // 0.55.26 : trim cache après ajout
        trimCache(cacheName, MAX_DATA_CACHE_ENTRIES);
      }
      return res;
    })
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

// =============================================================
//  0.57.35 : Handler CLEAR_USER_CACHE (logout sécurisé)
//  Appelé depuis lib/clearUserData.js au logout, vide DATA_CACHE
//  et PAGE_CACHE (qui peuvent contenir des réponses API personnelles
//  et des pages HTML rendues avec données sensibles). STATIC_CACHE
//  est conservé (assets immutables, partagés entre tous les users).
// =============================================================
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "CLEAR_USER_CACHE") return;

  // 0.57.36 : defense-in-depth — vérifier que le message vient bien
  // d'un client de notre origin (les SW ne reçoivent normalement que
  // des messages same-origin, mais on rend explicite la vérification
  // pour éviter qu'un futur changement d'API browser ne crée une faille)
  if (event.source && event.source.url) {
    try {
      const sourceUrl = new URL(event.source.url);
      const myUrl = new URL(self.location.href);
      if (sourceUrl.origin !== myUrl.origin) {
        // Origin différente : on log et on ignore
        console.warn("[SW] Message CLEAR_USER_CACHE refusé : origin différente", sourceUrl.origin);
        return;
      }
    } catch (e) {
      // En cas d'erreur de parsing URL, on refuse par sécurité
      return;
    }
  }

  event.waitUntil((async () => {
    let deletedData = 0;
    let deletedPages = 0;
    try {
      // Vider DATA_CACHE (réponses Supabase REST/RPC)
      const dataCache = await caches.open(DATA_CACHE);
      const dataKeys = await dataCache.keys();
      await Promise.all(dataKeys.map((k) => dataCache.delete(k)));
      deletedData = dataKeys.length;

      // Vider PAGE_CACHE (pages HTML)
      const pageCache = await caches.open(PAGE_CACHE);
      const pageKeys = await pageCache.keys();
      await Promise.all(pageKeys.map((k) => pageCache.delete(k)));
      deletedPages = pageKeys.length;
    } catch (e) {
      // En cas d'erreur (quota, mode privé), on continue silencieusement
    }

    // Reply au client via MessageChannel si fourni
    if (event.ports && event.ports[0]) {
      try {
        event.ports[0].postMessage({
          ok: true,
          deleted: { data: deletedData, pages: deletedPages },
        });
      } catch {}
    }
  })());
});
