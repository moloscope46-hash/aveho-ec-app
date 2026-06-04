"use client";
// =============================================================
//  lib/cacheReset.js (Alpha 0.58.20)
//
//  Procédure complète de "factory reset" du cache front :
//   1. Désinscrit tous les Service Workers
//   2. Vide toutes les Caches API (caches.keys() + caches.delete())
//   3. Clear localStorage SAUF les clés auth (sb-* de Supabase) — pour
//      éviter de déconnecter l'user de force
//   4. Clear sessionStorage entièrement
//   5. Reload avec cache-busting (?_t=Date.now())
//
//  Utilisé par :
//   - Le bouton "Vider le cache et recharger" dans /profil
//   - VersionCheck (auto-reset si force=true et version trop ancienne)
//
//  IMPORTANT : ne pas appeler hors d'une interaction user. Le reload
//  termine la session courante.
// =============================================================

/**
 * Désinscrit tous les Service Workers de cette origin.
 */
export async function unregisterAllServiceWorkers() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return 0;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    return regs.length;
  } catch (e) {
    console.warn("[cacheReset] unregister SW failed:", e);
    return 0;
  }
}

/**
 * Supprime toutes les Caches API (CacheStorage).
 */
export async function clearAllCaches() {
  if (typeof window === "undefined" || !window.caches) return 0;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    return keys.length;
  } catch (e) {
    console.warn("[cacheReset] clearCaches failed:", e);
    return 0;
  }
}

/**
 * Vide localStorage SAUF les clés Supabase (sb-* prefix).
 * Préserve la session utilisateur pour qu'il ne soit pas déconnecté.
 */
export function clearLocalStorageExceptAuth() {
  if (typeof localStorage === "undefined") return 0;
  try {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Préserver les clés Supabase auth (sb-...)
      if (k.startsWith("sb-") || k === "supabase.auth.token") continue;
      toDelete.push(k);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
    return toDelete.length;
  } catch (e) {
    console.warn("[cacheReset] clearLocalStorage failed:", e);
    return 0;
  }
}

/**
 * Vide sessionStorage entièrement.
 */
export function clearSessionStorage() {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const n = sessionStorage.length;
    sessionStorage.clear();
    return n;
  } catch (e) {
    return 0;
  }
}

/**
 * Procédure complète "factory reset" front.
 * Retourne un récap des éléments supprimés, puis reload.
 *
 * @param {Object} opts
 * @param {boolean} opts.reload - true par défaut. Reload la page après clear.
 * @param {boolean} opts.keepAuth - true par défaut. Préserve la session.
 */
export async function fullCacheReset({ reload = true, keepAuth = true } = {}) {
  const report = {
    serviceWorkers: 0,
    caches: 0,
    localStorageKeys: 0,
    sessionStorageKeys: 0,
  };

  report.serviceWorkers = await unregisterAllServiceWorkers();
  report.caches = await clearAllCaches();
  report.localStorageKeys = keepAuth
    ? clearLocalStorageExceptAuth()
    : (() => { const n = localStorage.length; localStorage.clear(); return n; })();
  report.sessionStorageKeys = clearSessionStorage();

  console.info("[cacheReset] full reset done:", report);

  if (reload) {
    // Cache-busting : ajouter un timestamp pour forcer le reload des chunks
    const url = new URL(window.location.href);
    url.searchParams.set("_cache_reset", String(Date.now()));
    window.location.href = url.toString();
  }

  return report;
}
