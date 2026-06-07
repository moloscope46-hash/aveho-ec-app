// =============================================================
//  lib/offlineSync.js (0.62.66) — Mode hors-ligne chauffeur
//
//  Fonctions exposées :
//    - cacheTournee(tourneeData)        : cache une tournée complète en IDB
//    - getCachedTournee(tourneeId)      : lit la tournée depuis IDB
//    - listCachedTournees()             : liste toutes les tournées cachées
//    - queueOperation(table, action, data) : ajoute une opération à rejouer
//    - syncPendingOperations(supabase)  : rejoue les opérations à la reconnexion
//    - getPendingCount()                : nombre d'opérations en attente
//    - clearCache()                     : vide tout le cache (debug)
//
//  Stratégie :
//    - IndexedDB pour cache lecture (tournée + clients + matériels)
//    - Table Supabase `sync_queue` pour les écritures (rejouage à la reco)
//    - Détection online/offline via navigator.onLine + event listeners
// =============================================================
"use client";

const DB_NAME = "aveho-offline";
const DB_VERSION = 1;
const STORE_TOURNEES = "tournees";
const STORE_QUEUE = "queue";

// ========== HELPERS IndexedDB ==========
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB non disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_TOURNEES)) {
        const s = db.createObjectStore(STORE_TOURNEES, { keyPath: "id" });
        s.createIndex("date_tournee", "date_tournee");
        s.createIndex("user_id", "user_id");
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const s = db.createObjectStore(STORE_QUEUE, { keyPath: "_local_id", autoIncrement: true });
        s.createIndex("status", "status");
        s.createIndex("created_at", "created_at");
      }
    };
  });
}

async function tx(store, mode = "readonly") {
  const db = await openDb();
  return db.transaction(store, mode).objectStore(store);
}

// ========== CACHE TOURNÉE ==========

/**
 * Cache une tournée complète (étapes, clients, matériels) en IndexedDB
 * @param {Object} tourneeData - { id, date_tournee, chauffeur_id, etapes: [...], etc. }
 */
export async function cacheTournee(tourneeData) {
  try {
    const store = await tx(STORE_TOURNEES, "readwrite");
    const data = {
      ...tourneeData,
      _cached_at: Date.now(),
    };
    return new Promise((res, rej) => {
      const r = store.put(data);
      r.onsuccess = () => res(data);
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    console.warn("[offlineSync] cacheTournee failed:", e);
    return null;
  }
}

/**
 * Lit une tournée depuis le cache IndexedDB
 */
export async function getCachedTournee(tourneeId) {
  try {
    const store = await tx(STORE_TOURNEES, "readonly");
    return new Promise((res, rej) => {
      const r = store.get(tourneeId);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    console.warn("[offlineSync] getCachedTournee failed:", e);
    return null;
  }
}

/**
 * Liste toutes les tournées cachées
 */
export async function listCachedTournees() {
  try {
    const store = await tx(STORE_TOURNEES, "readonly");
    return new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    console.warn("[offlineSync] listCachedTournees failed:", e);
    return [];
  }
}

/**
 * Supprime une tournée cachée (après sync réussie)
 */
export async function removeCachedTournee(tourneeId) {
  try {
    const store = await tx(STORE_TOURNEES, "readwrite");
    return new Promise((res, rej) => {
      const r = store.delete(tourneeId);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    console.warn("[offlineSync] removeCachedTournee failed:", e);
  }
}

// ========== SYNC QUEUE (écritures différées) ==========

/**
 * Met en file d'attente une opération à rejouer en ligne
 * @param {string} table - nom de la table cible (ex: 'tournees_etapes')
 * @param {string} action - 'insert' | 'update' | 'delete'
 * @param {Object} data - les données de l'opération
 * @param {Object} where - les conditions pour update/delete (ex: { id: 'xxx' })
 */
export async function queueOperation(table, action, data, where = null) {
  try {
    const store = await tx(STORE_QUEUE, "readwrite");
    const op = {
      table,
      action,
      data,
      where,
      status: "pending",
      created_at: Date.now(),
      attempts: 0,
      last_error: null,
    };
    return new Promise((res, rej) => {
      const r = store.add(op);
      r.onsuccess = () => {
        op._local_id = r.result;
        res(op);
      };
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    console.warn("[offlineSync] queueOperation failed:", e);
    return null;
  }
}

/**
 * Nombre d'opérations en attente
 */
export async function getPendingCount() {
  try {
    const store = await tx(STORE_QUEUE, "readonly");
    return new Promise((res, rej) => {
      const r = store.index("status").count(IDBKeyRange.only("pending"));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    return 0;
  }
}

/**
 * Liste toutes les opérations pending
 */
async function getPendingOps() {
  try {
    const store = await tx(STORE_QUEUE, "readonly");
    return new Promise((res, rej) => {
      const r = store.index("status").getAll(IDBKeyRange.only("pending"));
      r.onsuccess = () => res((r.result || []).sort((a, b) => a.created_at - b.created_at));
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Marquer une opération comme synced ou error
 */
async function markOp(localId, status, error = null) {
  try {
    const store = await tx(STORE_QUEUE, "readwrite");
    return new Promise((res, rej) => {
      const r = store.get(localId);
      r.onsuccess = () => {
        const op = r.result;
        if (!op) return res(false);
        op.status = status;
        op.last_error = error;
        op.synced_at = status === "synced" ? Date.now() : null;
        op.attempts = (op.attempts || 0) + 1;
        const u = store.put(op);
        u.onsuccess = () => res(true);
        u.onerror = () => rej(u.error);
      };
      r.onerror = () => rej(r.error);
    });
  } catch (e) {
    console.warn("[offlineSync] markOp failed:", e);
  }
}

/**
 * Rejoue toutes les opérations pending sur Supabase (à la reconnexion)
 * @param {Object} supabase - client Supabase
 * @param {Object} opts - { userId, deviceId }
 * @returns {Object} { synced, errors }
 */
export async function syncPendingOperations(supabase, opts = {}) {
  const ops = await getPendingOps();
  let synced = 0;
  const errors = [];

  for (const op of ops) {
    try {
      let q;
      if (op.action === "insert") {
        q = supabase.from(op.table).insert(op.data);
      } else if (op.action === "update") {
        q = supabase.from(op.table).update(op.data);
        if (op.where) Object.entries(op.where).forEach(([k, v]) => { q = q.eq(k, v); });
      } else if (op.action === "delete") {
        q = supabase.from(op.table).delete();
        if (op.where) Object.entries(op.where).forEach(([k, v]) => { q = q.eq(k, v); });
      } else {
        throw new Error(`Action inconnue: ${op.action}`);
      }
      const r = await q;
      if (r.error) throw r.error;

      // Trace audit dans `sync_queue` Supabase (si table existe)
      try {
        await supabase.from("sync_queue").insert({
          user_id: opts.userId,
          device_id: opts.deviceId,
          table_cible: op.table,
          action: op.action,
          donnees: op.data,
          statut: "synced",
          sync_le: new Date().toISOString(),
        });
      } catch {}

      await markOp(op._local_id, "synced");
      synced++;
    } catch (e) {
      await markOp(op._local_id, "error", e.message || String(e));
      errors.push({ op, error: e.message });
    }
  }

  return { synced, errors, total: ops.length };
}

/**
 * Wrapper : essaie d'exécuter direct sur Supabase, fallback en queue si offline
 * @param {Object} supabase
 * @param {string} table
 * @param {string} action
 * @param {Object} data
 * @param {Object} where
 */
export async function smartWrite(supabase, table, action, data, where = null) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Offline → queue
    const queued = await queueOperation(table, action, data, where);
    return { offline: true, queued };
  }
  // Online → essaie direct
  try {
    let q;
    if (action === "insert") q = supabase.from(table).insert(data).select();
    else if (action === "update") {
      q = supabase.from(table).update(data);
      if (where) Object.entries(where).forEach(([k, v]) => { q = q.eq(k, v); });
      q = q.select();
    } else if (action === "delete") {
      q = supabase.from(table).delete();
      if (where) Object.entries(where).forEach(([k, v]) => { q = q.eq(k, v); });
    }
    const r = await q;
    if (r.error) {
      // Si erreur réseau, queue en fallback
      const queued = await queueOperation(table, action, data, where);
      return { offline: false, error: r.error, queued };
    }
    return { offline: false, data: r.data };
  } catch (e) {
    // Erreur réseau probable
    const queued = await queueOperation(table, action, data, where);
    return { offline: false, error: e, queued };
  }
}

// ========== UTILS ==========

/**
 * Vide tout le cache (debug)
 */
export async function clearCache() {
  try {
    const t = await tx(STORE_TOURNEES, "readwrite");
    await new Promise((res, rej) => {
      const r = t.clear();
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    });
    const q = await tx(STORE_QUEUE, "readwrite");
    await new Promise((res, rej) => {
      const r = q.clear();
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    });
    return true;
  } catch (e) {
    console.warn("[offlineSync] clearCache failed:", e);
    return false;
  }
}

/**
 * Statut online/offline + listeners
 */
export function onConnectivityChange(callback) {
  if (typeof window === "undefined") return () => {};
  function update() {
    callback(navigator.onLine);
  }
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  callback(navigator.onLine); // init
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

/**
 * Auto-sync : à appeler dans un useEffect global, déclenche syncPendingOperations
 * dès que la connexion revient
 */
export function setupAutoSync(supabase, opts = {}) {
  if (typeof window === "undefined") return () => {};
  let syncing = false;

  async function tryS() {
    if (syncing) return;
    if (!navigator.onLine) return;
    const count = await getPendingCount();
    if (count === 0) return;
    syncing = true;
    try {
      const r = await syncPendingOperations(supabase, opts);
      console.info(`[offlineSync] Auto-sync : ${r.synced}/${r.total} synced, ${r.errors.length} errors`);
      // Trigger event custom pour UI
      window.dispatchEvent(new CustomEvent("av-sync-complete", { detail: r }));
    } finally {
      syncing = false;
    }
  }

  window.addEventListener("online", tryS);
  // Tentative à intervalle régulier (toutes les 30s) au cas où
  const interval = setInterval(tryS, 30000);
  // Tentative initiale
  tryS();

  return () => {
    window.removeEventListener("online", tryS);
    clearInterval(interval);
  };
}
