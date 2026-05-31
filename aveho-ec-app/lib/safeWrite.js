"use client";
// =============================================================
//  safeWrite — Helpers pour écritures Supabase tolérantes au offline
//  Alpha 0.25.0 / 0.28.0
//
//  Si online → exécution normale Supabase + invalidation cache auto (0.28)
//  Si offline → mise en queue IndexedDB + retour "pseudo-succès"
//
//  Usage :
//   import { safeInsert, safeUpdate, safeDelete } from "./safeWrite";
//
//   const { error, queued } = await safeInsert(supabase, "patients", payload, { userId });
//   if (queued) { toast("Enregistré localement, sera synchronisé"); }
//   else if (error) { toast.error(error.message); }
//
//  Pour les UPDATE/DELETE, fournir match : { id: "..." }
//
//  Alpha 0.28.0 : à chaque écriture online réussie, on invalide le cache
//  des clés commençant par "{table}:" pour éviter de servir des données stale.
//  Désactivable via opt-out { skipInvalidate: true } si l'appelant veut tout gérer.
// =============================================================
import { enqueueOp, isOnline } from "./offlineQueue";
import { cacheInvalidate } from "./offlineCache";

/**
 * Insert sécurisé : online → Supabase, offline → queue
 * @returns { data, error, queued }
 */
export async function safeInsert(supabase, table, payload, { userId, returning = false, skipInvalidate = false } = {}) {
  if (!isOnline()) {
    if (!userId) {
      return { data: null, error: { message: "Mode hors-ligne mais userId manquant" }, queued: false };
    }
    try {
      const id = await enqueueOp({
        table,
        op: "insert",
        payload,
        user_id: userId,
      });
      return { data: { _queueId: id, ...payload }, error: null, queued: true };
    } catch (e) {
      return { data: null, error: { message: "Queue offline : " + e.message }, queued: false };
    }
  }

  // Online : exécution normale
  let q = supabase.from(table).insert(payload);
  if (returning) q = q.select().single();
  const res = await q;
  // Alpha 0.28.0 : invalide le cache si succès
  if (!res.error && !skipInvalidate && table) {
    cacheInvalidate(`${table}:`).catch(() => {});
  }
  return { ...res, queued: false };
}

/**
 * Update sécurisé
 * @param {object} match { id: "...", autre_col: "..." } pour le .eq()
 * @returns { data, error, queued }
 */
export async function safeUpdate(supabase, table, payload, match, { userId, skipInvalidate = false } = {}) {
  if (!isOnline()) {
    if (!userId) {
      return { data: null, error: { message: "Mode hors-ligne mais userId manquant" }, queued: false };
    }
    try {
      const id = await enqueueOp({
        table,
        op: "update",
        payload,
        match,
        user_id: userId,
      });
      return { data: { _queueId: id, ...payload }, error: null, queued: true };
    } catch (e) {
      return { data: null, error: { message: "Queue offline : " + e.message }, queued: false };
    }
  }

  // Online
  let q = supabase.from(table).update(payload);
  for (const [k, v] of Object.entries(match || {})) q = q.eq(k, v);
  const res = await q;
  if (!res.error && !skipInvalidate && table) {
    cacheInvalidate(`${table}:`).catch(() => {});
  }
  return { ...res, queued: false };
}

/**
 * Delete sécurisé
 */
export async function safeDelete(supabase, table, match, { userId, skipInvalidate = false } = {}) {
  if (!isOnline()) {
    if (!userId) {
      return { data: null, error: { message: "Mode hors-ligne mais userId manquant" }, queued: false };
    }
    try {
      const id = await enqueueOp({
        table,
        op: "delete",
        payload: null,
        match,
        user_id: userId,
      });
      return { data: { _queueId: id }, error: null, queued: true };
    } catch (e) {
      return { data: null, error: { message: "Queue offline : " + e.message }, queued: false };
    }
  }

  let q = supabase.from(table).delete();
  for (const [k, v] of Object.entries(match || {})) q = q.eq(k, v);
  const res = await q;
  if (!res.error && !skipInvalidate && table) {
    cacheInvalidate(`${table}:`).catch(() => {});
  }
  return { ...res, queued: false };
}

/**
 * RPC sécurisé : online → appel RPC, offline → queue
 * Attention : certains RPC ne sont pas idempotents et ne devraient pas être rejoués.
 * À utiliser uniquement pour les RPC compatibles (idempotents ou nouvelle action).
 */
export async function safeRpc(supabase, rpcName, args, { userId } = {}) {
  if (!isOnline()) {
    if (!userId) {
      return { data: null, error: { message: "Mode hors-ligne mais userId manquant" }, queued: false };
    }
    try {
      const id = await enqueueOp({
        table: null,
        op: "rpc",
        rpcName,
        payload: args,
        user_id: userId,
      });
      return { data: { _queueId: id }, error: null, queued: true };
    } catch (e) {
      return { data: null, error: { message: "Queue offline : " + e.message }, queued: false };
    }
  }

  const res = await supabase.rpc(rpcName, args);
  return { ...res, queued: false };
}
