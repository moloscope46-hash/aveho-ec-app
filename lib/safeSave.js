"use client";
// =============================================================
//  lib/safeSave.js (0.62.131)
//
//  Wrapper qui tente une écriture Supabase et bascule en queue
//  offline si pas de réseau ou erreur réseau.
//
//  Usage :
//    await safeSave(supabase, {
//      table: "signalements",
//      op: "insert",         // "insert" | "update" | "delete" | "upsert"
//      payload: { ... },
//      match: { id },        // pour update/delete
//      userId: auth.user.id,
//    });
// =============================================================

import { enqueueOp, isOnline } from "./offlineQueue";

export async function safeSave(supabase, { table, op, payload, match, userId, onSuccess, onQueued }) {
  // Si offline d'office → queue
  if (!isOnline()) {
    return _enqueueAndNotify({ table, op, payload, match, userId, onQueued });
  }

  // Tentative directe
  try {
    let query = supabase.from(table);
    let result;
    if (op === "insert") {
      result = await query.insert(payload).select();
    } else if (op === "update") {
      let q = query.update(payload);
      if (match) Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
      result = await q.select();
    } else if (op === "upsert") {
      result = await query.upsert(payload).select();
    } else if (op === "delete") {
      let q = query.delete();
      if (match) Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
      result = await q;
    } else {
      throw new Error(`Op inconnue : ${op}`);
    }
    if (result.error) {
      // Erreur réseau ? → enqueue
      const isNet = /network|fetch|timeout|failed/i.test(result.error.message || "");
      if (isNet) {
        return _enqueueAndNotify({ table, op, payload, match, userId, onQueued });
      }
      throw result.error;
    }
    onSuccess?.(result.data);
    return { ok: true, data: result.data, queued: false };
  } catch (e) {
    // Réseau down ? → queue
    const isNet = /network|fetch|timeout|failed/i.test(e.message || "");
    if (isNet) {
      return _enqueueAndNotify({ table, op, payload, match, userId, onQueued });
    }
    throw e;
  }
}

async function _enqueueAndNotify({ table, op, payload, match, userId, onQueued }) {
  try {
    const id = await enqueueOp({ table, op, payload, match, user_id: userId });
    try {
      const { toast } = await import("../app/components/ui-premium");
      toast?.info?.(`📡 Mode hors-ligne : action mise en file. Sera synchronisée à la reconnexion.`);
    } catch {}
    onQueued?.(id);
    return { ok: true, queued: true, queueId: id };
  } catch (e) {
    console.warn("[safeSave] enqueue échec :", e);
    return { ok: false, error: e };
  }
}
