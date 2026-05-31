"use client";
// =============================================================
//  conflictCheck — Détection de conflit de version (optimistic locking)
//  Alpha 0.26.0
//
//  Quand Alice est offline et modifie un patient, on capture l'updated_at
//  au moment de la mise en queue. À la sync, on vérifie que personne
//  d'autre n'a modifié entre-temps.
//
//  Stratégie :
//   - Si updated_at en base == updated_at au moment de la queue → OK, on applique
//   - Si différent → CONFLIT : on garde l'op en queue avec un flag "conflict"
//     L'utilisateur doit décider quoi faire (modale dédiée).
//
//  Pour l'instant version simple : on log le conflit et on n'écrase pas.
//  L'utilisateur verra le compteur queue rester et l'op marquée en erreur.
// =============================================================

/**
 * Compare deux timestamps pour détecter un conflit
 * @param {string|null} stagedAt — updated_at au moment de la mise en queue
 * @param {string|null} currentAt — updated_at actuel en base
 * @returns {boolean} true si conflit détecté
 */
export function hasConflict(stagedAt, currentAt) {
  if (!stagedAt || !currentAt) return false; // pas assez d'info pour décider
  // Tolérance 1 seconde (problèmes de précision timestamps)
  const diff = Math.abs(new Date(currentAt).getTime() - new Date(stagedAt).getTime());
  return diff > 1000;
}

/**
 * Récupère l'updated_at actuel d'une ligne en base
 * @returns {string|null} ISO timestamp ou null si introuvable
 */
export async function fetchCurrentUpdatedAt(supabase, table, id) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("updated_at")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data.updated_at || null;
  } catch {
    return null;
  }
}

/**
 * Wrapper safeUpdate qui ajoute la détection de conflit.
 * Capture l'updated_at au moment de la mise en queue.
 * Cette info est ensuite utilisée par replayQueue pour vérifier.
 *
 * @param {object} originalRow — la ligne avant modif (avec updated_at)
 */
export function buildUpdatePayloadWithLock(payload, originalRow) {
  return {
    ...payload,
    // Stocké dans l'op de queue pour check à la sync
    __staged_updated_at: originalRow?.updated_at || null,
    // Le updated_at qui sera écrit à la sync
    updated_at: new Date().toISOString(),
  };
}
