// =============================================================
//  lib/materiels.js (0.58.71)
//
//  Helper analogue à lib/chambres.js : sonde une fois la
//  présence des colonnes ajoutées par les migrations récentes
//  et met en cache pour éviter les boucles d'erreur 400.
//
//  Colonnes sondées :
//   - article_id  (migration-0.58.67-articles-refonte-complete.sql)
//   - udi_di, udi_pi  (migration-0.58.71-materiels-extension.sql)
//   - immobilisation_*  (idem)
// =============================================================

const _cache = {
  hasArticleId: null,
  hasUdi: null,
  hasImmobilisation: null,
};

export function resetMaterielsProbeCache() {
  _cache.hasArticleId = null;
  _cache.hasUdi = null;
  _cache.hasImmobilisation = null;
}

async function _probeColumn(supabase, colName) {
  try {
    const { error } = await supabase
      .from("materiels")
      .select(colName, { count: "exact", head: true })
      .limit(1);
    if (error) {
      if (error.code === "42703" || new RegExp(colName, "i").test(error.message || "")) {
        return false;
      }
      // Autre erreur (RLS, réseau) : on assume présent pour ne pas dégrader inutilement
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

export async function materielsHasArticleId(supabase) {
  if (_cache.hasArticleId !== null) return _cache.hasArticleId;
  const r = await _probeColumn(supabase, "article_id");
  _cache.hasArticleId = r;
  if (!r && typeof console !== "undefined") {
    console.warn("[materiels] colonne article_id absente (SQL 0.58.67 non appliqué). Liaison matériel↔article désactivée.");
  }
  return r;
}

export async function materielsHasUdi(supabase) {
  if (_cache.hasUdi !== null) return _cache.hasUdi;
  const r = await _probeColumn(supabase, "udi_di");
  _cache.hasUdi = r;
  if (!r && typeof console !== "undefined") {
    console.warn("[materiels] colonnes UDI absentes (SQL 0.58.71 non appliqué). Tracabilité UDI désactivée.");
  }
  return r;
}

export async function materielsHasImmobilisation(supabase) {
  if (_cache.hasImmobilisation !== null) return _cache.hasImmobilisation;
  const r = await _probeColumn(supabase, "immobilisation_valeur_acquisition");
  _cache.hasImmobilisation = r;
  return r;
}

/**
 * SELECT matériels par article_id avec fallback gracieux.
 * Si la colonne article_id n'existe pas, retourne [] sans crash.
 */
export async function selectMaterielsByArticle(supabase, articleId, columns = "*") {
  const has = await materielsHasArticleId(supabase);
  if (!has) {
    return { data: [], hasArticleId: false, warning: "article_id absent" };
  }
  const r = await supabase
    .from("materiels")
    .select(columns)
    .eq("article_id", articleId)
    .order("created_at", { ascending: false });
  return { data: r.data || [], hasArticleId: true, error: r.error };
}

/**
 * INSERT matériel(s) avec strip automatique des colonnes absentes.
 * On essaie l'insert complet ; si erreur 42703 sur une colonne, on retry sans.
 */
export async function safeInsertMateriels(supabase, payloads) {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return { data: [], error: null };
  }
  // Sonde rapide : si article_id absent et il est dans les payloads → strip
  const hasArticleId = await materielsHasArticleId(supabase);
  const hasUdi = await materielsHasUdi(supabase);
  const hasImmo = await materielsHasImmobilisation(supabase);

  const cleaned = payloads.map(p => {
    const c = { ...p };
    if (!hasArticleId) delete c.article_id;
    if (!hasUdi) {
      delete c.udi_di;
      delete c.udi_pi;
      delete c.qr_code;
    }
    if (!hasImmo) {
      delete c.immobilisation_valeur_acquisition;
      delete c.immobilisation_date_acquisition;
      delete c.immobilisation_duree_mois;
      delete c.immobilisation_compte;
      delete c.immobilisation_active;
    }
    return c;
  });

  const r = await supabase.from("materiels").insert(cleaned).select();
  return { data: r.data || [], error: r.error, stripped: { article_id: !hasArticleId, udi: !hasUdi, immo: !hasImmo } };
}
