// =============================================================
//  lib/chambres.js (0.58.70)
//
//  Helper pour requêter les chambres avec fallback gracieux
//  si la colonne `batiment_id` n'existe pas (SQL 0.58.57 pas
//  encore appliqué côté Supabase).
//
//  Avant 0.58.70 : un SELECT `id, service_id, batiment_id`
//  retournait 400 Bad Request en boucle → crash de l'app.
//
//  Cache du résultat de la détection pour éviter de re-tester
//  à chaque appel.
// =============================================================

// Cache du résultat de la sonde (rempli à la 1ère erreur 42703)
let _hasBatimentCol = null;  // null = inconnu, true/false = détecté

export function resetChambresProbeCache() {
  _hasBatimentCol = null;
}

/**
 * Détecte si la table `chambres` possède la colonne `batiment_id`.
 * Résultat mis en cache pour la session.
 * @returns {Promise<boolean>}
 */
export async function chambresHasBatimentCol(supabase) {
  if (_hasBatimentCol !== null) return _hasBatimentCol;
  try {
    const { error } = await supabase
      .from("chambres")
      .select("batiment_id", { count: "exact", head: true })
      .limit(1);
    if (error) {
      if (error.code === "42703" || /batiment_id/i.test(error.message || "")) {
        _hasBatimentCol = false;
        if (typeof console !== "undefined") {
          console.warn("[chambres] colonne batiment_id absente (SQL 0.58.57 non appliqué). Fallback service_id uniquement.");
        }
        return false;
      }
      // Autre erreur : on assume présent pour ne pas dégrader
      _hasBatimentCol = true;
      return true;
    }
    _hasBatimentCol = true;
    return true;
  } catch {
    _hasBatimentCol = false;
    return false;
  }
}

/**
 * SELECT chambres filtré par contexte (serviceId / batimentId).
 * Si la colonne `batiment_id` n'existe pas en base, :
 *  - serviceId fourni → la requête tourne normalement (sans batiment_id dans le SELECT)
 *  - batimentId seul → retourne [] (impossible de filtrer)
 *
 * @returns {Promise<{ data: Array, hasBatimentCol: boolean, error: any }>}
 */
export async function selectChambresContexte(supabase, { serviceId, batimentId } = {}) {
  const hasCol = await chambresHasBatimentCol(supabase);

  // Aucun filtre → on retourne juste la liste avec ou sans batiment_id
  if (!serviceId && !batimentId) {
    const cols = hasCol ? "id, service_id, batiment_id" : "id, service_id";
    const r = await supabase.from("chambres").select(cols);
    return { data: r.data || [], hasBatimentCol: hasCol, error: r.error };
  }

  // Filtre par service : marche dans tous les cas
  if (serviceId) {
    const cols = hasCol ? "id, service_id, batiment_id" : "id, service_id";
    const r = await supabase.from("chambres").select(cols).eq("service_id", serviceId);
    return { data: r.data || [], hasBatimentCol: hasCol, error: r.error };
  }

  // Filtre par bâtiment : ne marche que si la colonne existe
  if (batimentId) {
    if (!hasCol) {
      return { data: [], hasBatimentCol: false, error: null, warning: "batiment_id absent, filtre désactivé" };
    }
    const r = await supabase.from("chambres").select("id, service_id, batiment_id").eq("batiment_id", batimentId);
    return { data: r.data || [], hasBatimentCol: true, error: r.error };
  }

  return { data: [], hasBatimentCol: hasCol, error: null };
}
