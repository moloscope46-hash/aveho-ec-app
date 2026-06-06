// =============================================================
//  lib/services.js (0.58.84)
//
//  Sondage de la colonne `batiment_id` sur la table `services`.
//  Identique au pattern lib/chambres.js (0.58.70) — évite les 400
//  cascadants quand la colonne n'existe pas dans la DB.
//
//  Stratégie :
//  - Première fois → fait un HEAD select(batiment_id) pour tester
//  - Cache le résultat (true/false) en mémoire pour la session
//  - Stocke aussi dans localStorage pour persister entre reloads
// =============================================================

const CACHE_KEY = "av-services-has-batiment-col";
let memCache = null;  // null = pas encore sondé, true/false = résultat

/**
 * Détecte si la table `services` possède la colonne `batiment_id`.
 * Renvoie true/false. Cache le résultat (en mémoire + localStorage).
 */
export async function servicesHasBatimentCol(supabase) {
  if (memCache !== null) return memCache;
  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached === "true") { memCache = true; return true; }
    if (cached === "false") { memCache = false; return false; }
  } catch {}

  // Sonde via select head : on demande juste la colonne avec un limit head
  try {
    const r = await supabase
      .from("services")
      .select("batiment_id", { count: "exact", head: true })
      .limit(1);
    if (r.error) {
      if (r.error.code === "42703" || /batiment_id/i.test(r.error.message || "")) {
        memCache = false;
        try { localStorage.setItem(CACHE_KEY, "false"); } catch {}
        if (typeof console !== "undefined") {
          console.warn("[services] colonne batiment_id absente. Fallback structure_id.");
        }
        return false;
      }
      // autre erreur → on suppose présent (pour ne pas bloquer)
      return true;
    }
    memCache = true;
    try { localStorage.setItem(CACHE_KEY, "true"); } catch {}
    return true;
  } catch (e) {
    // Erreur réseau ou autre → on retente la fois suivante
    return true;
  }
}

/**
 * Renvoie tous les services de la structure, filtrés par batiment_id si la
 * colonne existe ; sinon retourne tous les services de la structure.
 *
 * @param {object} supabase - client supabase
 * @param {object} opts - { structureId, batimentId }
 * @returns {Promise<{data: array, error: object|null}>}
 */
export async function selectServicesContexte(supabase, { structureId, batimentId }) {
  if (!structureId) return { data: [], error: null };

  const hasBat = await servicesHasBatimentCol(supabase);

  if (hasBat && batimentId) {
    const r = await supabase
      .from("services")
      .select("id, nom, batiment_id")
      .eq("structure_id", structureId)
      .eq("batiment_id", batimentId)
      .order("nom");
    return r;
  }

  // Pas de batiment_id ou pas de filtre → tous les services de la structure
  const r = await supabase
    .from("services")
    .select("id, nom")
    .eq("structure_id", structureId)
    .order("nom");
  return r;
}
