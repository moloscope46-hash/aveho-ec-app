"use client";
// =============================================================
//  offlineQueue — Queue d'écritures persistante via IndexedDB
//  Alpha 0.25.0
//
//  Stocke les opérations Supabase à exécuter quand on est offline.
//  Rejoue automatiquement la queue à la reconnexion.
//
//  Format d'une opération en queue :
//   {
//     id: number (auto-incrément),
//     table: "patients" | "materiels" | ...
//     op: "insert" | "update" | "delete" | "rpc"
//     payload: { ... } (données ou args RPC)
//     match: { id: "..." } (pour update/delete)
//     rpcName: "..." (pour op rpc)
//     created_at: timestamp,
//     attempts: number,
//     last_error: string | null,
//     user_id: string (pour filtrer par utilisateur connecté)
//   }
// =============================================================

const DB_NAME = "aveho-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "queue";

let _dbPromise = null;

function openDb() {
  if (typeof window === "undefined") return Promise.reject(new Error("IndexedDB côté client uniquement"));
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("user_id", "user_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // 0.55.7 : si la DB se ferme (autre tab fait upgrade, etc.), invalider le cache pour rouvrir
      db.onclose = () => { _dbPromise = null; };
      db.onversionchange = () => { db.close(); _dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => {
      _dbPromise = null;
      reject(req.error);
    };
  });
  return _dbPromise;
}

// 0.55.7 : helper qui retry si InvalidStateError (DB closing)
async function withDb(callback) {
  try {
    const db = await openDb();
    return await callback(db);
  } catch (e) {
    if (e && (e.name === "InvalidStateError" || /closing/i.test(e.message || ""))) {
      // DB connection en train de se fermer → invalider cache et réouvrir
      _dbPromise = null;
      const db = await openDb();
      return await callback(db);
    }
    throw e;
  }
}

/**
 * Ajoute une opération à la queue
 * @param {object} op {table, op, payload, match?, rpcName?, user_id}
 * @returns {Promise<number>} id de l'opération
 */
export async function enqueueOp(op) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const item = {
      ...op,
      created_at: Date.now(),
      attempts: 0,
      last_error: null,
    };
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Liste toutes les opérations en queue pour un utilisateur
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listQueue(userId) {
  return withDb(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("user_id");
    const req = index.getAll(userId);
    req.onsuccess = () => {
      const items = (req.result || []).sort((a, b) => a.created_at - b.created_at);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  }));
}

/**
 * Compte les opérations en queue pour un utilisateur (rapide, pour le badge UI)
 */
export async function countQueue(userId) {
  const items = await listQueue(userId);
  return items.length;
}

/**
 * Marque une opération comme tentée (attempts++)
 */
export async function bumpAttempts(id, errorMsg) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) { resolve(false); return; }
      item.attempts = (item.attempts || 0) + 1;
      item.last_error = errorMsg ? String(errorMsg).slice(0, 500) : null;
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Supprime une opération de la queue (succès ou abandon)
 */
export async function removeOp(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Vide toute la queue d'un utilisateur (à utiliser avec confirmation)
 */
export async function clearQueue(userId) {
  const items = await listQueue(userId);
  for (const item of items) {
    await removeOp(item.id);
  }
  return items.length;
}

/**
 * Détecte si on est en ligne
 */
export function isOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/**
 * Rejoue la queue en utilisant un client Supabase
 * Retourne un résumé { tried, succeeded, failed, conflicts, remaining }
 *
 * Alpha 0.26.0 : détection de conflit pour les updates
 * Si un payload contient __staged_updated_at, on compare au updated_at en base
 * avant d'appliquer. Si différent → conflit, on garde en queue avec flag.
 *
 * @param {object} supabase client Supabase
 * @param {string} userId
 * @param {object} opts { maxAttempts: 5, onProgress: (item, result) => {} }
 */
export async function replayQueue(supabase, userId, opts = {}) {
  const maxAttempts = opts.maxAttempts || 5;
  const onProgress = opts.onProgress || (() => {});

  const items = await listQueue(userId);
  let tried = 0;
  let succeeded = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of items) {
    if (item.attempts >= maxAttempts) {
      // Abandonné après trop d'essais : reste en queue avec marqueur
      onProgress(item, { abandoned: true });
      continue;
    }
    tried += 1;

    try {
      let result;
      if (item.op === "insert") {
        result = await supabase.from(item.table).insert(item.payload);
      } else if (item.op === "update") {
        // Alpha 0.26.0 : détection conflit optimiste
        const stagedAt = item.payload?.__staged_updated_at;
        if (stagedAt && item.match?.id) {
          const { data: current } = await supabase
            .from(item.table)
            .select("updated_at")
            .eq("id", item.match.id)
            .single();
          if (current?.updated_at) {
            const diff = Math.abs(
              new Date(current.updated_at).getTime() - new Date(stagedAt).getTime()
            );
            if (diff > 1000) {
              // CONFLIT : on n'écrase pas, on marque en erreur
              conflicts += 1;
              await bumpAttempts(
                item.id,
                `Conflit : modifié depuis (par un autre user le ${new Date(current.updated_at).toLocaleString("fr-FR")})`
              );
              onProgress(item, { conflict: true });
              continue;
            }
          }
        }
        // Pas de conflit, on retire la métadonnée et on applique
        const cleanPayload = { ...item.payload };
        delete cleanPayload.__staged_updated_at;
        let q = supabase.from(item.table).update(cleanPayload);
        for (const [k, v] of Object.entries(item.match || {})) {
          q = q.eq(k, v);
        }
        result = await q;
      } else if (item.op === "delete") {
        let q = supabase.from(item.table).delete();
        for (const [k, v] of Object.entries(item.match || {})) {
          q = q.eq(k, v);
        }
        result = await q;
      } else if (item.op === "rpc") {
        result = await supabase.rpc(item.rpcName, item.payload);
      } else {
        throw new Error(`Type d'opération inconnu : ${item.op}`);
      }

      if (result.error) throw result.error;

      // Succès : retire de la queue
      await removeOp(item.id);
      succeeded += 1;
      onProgress(item, { success: true });
    } catch (e) {
      // Échec : incrémente attempts
      await bumpAttempts(item.id, e.message || String(e));
      failed += 1;
      onProgress(item, { error: e.message || String(e) });
    }
  }

  const remaining = (await listQueue(userId)).length;
  return { tried, succeeded, failed, conflicts, remaining };
}
