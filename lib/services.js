// =============================================================
//  lib/services.js (0.58.85)
//
//  Helper pour récupérer les services en gérant l'absence éventuelle
//  de la colonne `batiment_id`.
//
//  Stratégie 0.58.85 : on tente d'abord la requête filtrée par batiment_id.
//  Si elle échoue (400, code 42703 ou autre), on cache "false" et on bascule
//  définitivement sur le fallback sans batiment_id. Pas de sonde séparée
//  qui peut elle-même crasher en 400.
// =============================================================

const CACHE_KEY = "av-services-has-batiment-col";
let memCache = null;  // null/true/false

function readCache() {
  if (memCache !== null) return memCache;
  try {
    const c = localStorage.getItem(CACHE_KEY);
    if (c === "true") return memCache = true;
    if (c === "false") return memCache = false;
  } catch {}
  return null;
}

function writeCache(v) {
  memCache = v;
  try { localStorage.setItem(CACHE_KEY, v ? "true" : "false"); } catch {}
}

/**
 * Récupère les services filtrés par contexte.
 * - Si batiment_id existe et batimentId fourni → filtre dessus
 * - Sinon → tous les services de la structure
 *
 * @param {object} supabase
 * @param {object} opts - { structureId, batimentId }
 */
export async function selectServicesContexte(supabase, { structureId, batimentId }) {
  if (!structureId) return { data: [], error: null };

  const cached = readCache();

  // Cas 1 : cache dit "pas de batiment_id" → fallback direct
  if (cached === false) {
    return await supabase
      .from("services")
      .select("id, nom")
      .eq("structure_id", structureId)
      .order("nom");
  }

  // Cas 2 : pas de batimentId fourni → pas besoin de filtrer
  if (!batimentId) {
    const r = await supabase
      .from("services")
      .select("id, nom")
      .eq("structure_id", structureId)
      .order("nom");
    return r;
  }

  // Cas 3 : on tente la requête filtrée
  try {
    const r = await supabase
      .from("services")
      .select("id, nom, batiment_id")
      .eq("structure_id", structureId)
      .eq("batiment_id", batimentId)
      .order("nom");
    if (r.error) {
      // Colonne absente ou autre erreur sur batiment_id → cache "false" et fallback
      if (r.error.code === "42703" || /batiment_id|column/i.test(r.error.message || "")) {
        writeCache(false);
        console.warn("[services] colonne batiment_id absente. Fallback structure_id.");
        return await supabase
          .from("services")
          .select("id, nom")
          .eq("structure_id", structureId)
          .order("nom");
      }
      // Autre erreur (auth/etc) → on n'écrit pas le cache, on relance fallback
      return await supabase
        .from("services")
        .select("id, nom")
        .eq("structure_id", structureId)
        .order("nom");
    }
    // Succès → la colonne existe
    writeCache(true);
    return r;
  } catch (e) {
    // Exception réseau → fallback safe
    writeCache(false);
    return await supabase
      .from("services")
      .select("id, nom")
      .eq("structure_id", structureId)
      .order("nom");
  }
}

/**
 * Test purement informatif (pour les outils admin)
 */
export async function servicesHasBatimentCol(supabase) {
  const cached = readCache();
  if (cached !== null) return cached;
  // Force un appel pour initialiser le cache via selectServicesContexte
  // (qui mettra à jour le cache)
  return true; // par défaut on suppose oui ; le premier appel réel cachera la bonne valeur
}
