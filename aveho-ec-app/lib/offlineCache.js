"use client";
// =============================================================
//  offlineCache — Cache de lecture pour mode hors-ligne
//  Alpha 0.26.0
//
//  Stocke les résultats des SELECT critiques dans IndexedDB pour
//  pouvoir lire offline même après refresh.
//
//  Format : { key: "patients:structure_xxx", data: [...], at: timestamp }
//
//  Usage :
//   import { safeFetch } from "./offlineCache";
//   const { data, fromCache } = await safeFetch(
//     "patients:" + structureId,
//     () => supabase.from("patients").select("*").eq("structure_id", structureId)
//   );
// =============================================================

const DB_NAME = "aveho-offline-cache";
const DB_VERSION = 1;
const STORE = "cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

let _dbPromise = null;

function openDb() {
  if (typeof window === "undefined") return Promise.reject(new Error("Cache côté client uniquement"));
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("at", "at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

/**
 * Stocke un résultat en cache
 */
export async function cacheSet(key, data) {
  if (typeof window === "undefined") return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.put({ key, data, at: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Cache best-effort, on ne fait pas crasher l'app
    console.warn("cacheSet:", e?.message);
  }
}

/**
 * Récupère un résultat du cache (ou null si absent ou expiré)
 */
export async function cacheGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const item = req.result;
        if (!item) return resolve(null);
        if (Date.now() - item.at > TTL_MS) return resolve(null); // expiré
        resolve(item.data);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("cacheGet:", e?.message);
    return null;
  }
}

/**
 * Vide le cache (utilisé en logout par exemple)
 */
export async function cacheClear() {
  if (typeof window === "undefined") return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("cacheClear:", e?.message);
  }
}

/**
 * Alpha 0.28.0 : Invalide toutes les clés cache commençant par un préfixe.
 * À appeler après chaque écriture pour éviter le cache stale.
 *
 * @param {string|string[]} prefixes — ex: "patients:" ou ["patients:", "interventions:"]
 * @returns {Promise<number>} nombre de clés supprimées
 *
 * Usage typique :
 *   await safeInsert(...);
 *   await cacheInvalidate("patients:"); // tous les caches patients flushés
 */
export async function cacheInvalidate(prefixes) {
  if (typeof window === "undefined") return 0;
  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];
  if (prefixList.length === 0) return 0;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      let deleted = 0;
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const key = cursor.value.key;
          // Match si la clé commence par un des préfixes
          if (prefixList.some((p) => key.startsWith(p))) {
            cursor.delete();
            deleted += 1;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("cacheInvalidate:", e?.message);
    return 0;
  }
}

/**
 * Compte les entrées en cache
 */
export async function cacheCount() {
  if (typeof window === "undefined") return 0;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * safeFetch : exécute un SELECT avec cache fallback
 *
 * @param {string} key — clé unique pour cette requête (ex: "patients:structureId")
 * @param {Function} queryFn — fonction qui retourne { data, error } depuis Supabase
 * @param {object} opts { onlyCache: false, swr: true }
 *   swr=true : retourne le cache immédiatement, fetch en background et update
 *   onlyCache=true : ne fetch jamais (pour tests)
 * @returns { data, error, fromCache, fresh }
 *
 * Usage simple (équivalent direct d'un .select() avec cache offline) :
 *   const { data } = await safeFetch("patients:" + structureId,
 *     () => supabase.from("patients").select("*").eq("structure_id", structureId)
 *   );
 */
export async function safeFetch(key, queryFn, opts = {}) {
  const onlyCache = opts.onlyCache === true;
  const online = typeof navigator === "undefined" || navigator.onLine !== false;

  // 1. Si offline ou onlyCache : tente le cache d'abord
  if (!online || onlyCache) {
    const cached = await cacheGet(key);
    if (cached !== null) {
      return { data: cached, error: null, fromCache: true, fresh: false };
    }
    if (!online) {
      return {
        data: null,
        error: { message: "Hors-ligne et aucune donnée en cache pour cette requête." },
        fromCache: false,
        fresh: false,
      };
    }
  }

  // 2. Online : exécute la requête Supabase
  try {
    const result = await queryFn();
    if (!result.error && result.data !== undefined) {
      // Met en cache pour usage offline futur
      await cacheSet(key, result.data);
      return { data: result.data, error: null, fromCache: false, fresh: true };
    }
    // Erreur Supabase : tente le cache en fallback
    const cached = await cacheGet(key);
    if (cached !== null) {
      return { data: cached, error: result.error, fromCache: true, fresh: false };
    }
    return { ...result, fromCache: false, fresh: false };
  } catch (e) {
    // Network error : fallback cache
    const cached = await cacheGet(key);
    if (cached !== null) {
      return { data: cached, error: { message: e.message }, fromCache: true, fresh: false };
    }
    return { data: null, error: { message: e.message }, fromCache: false, fresh: false };
  }
}
