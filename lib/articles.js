// =============================================================
//  lib/articles.js (0.58.72)
//
//  Helper pour articles avec sonde + cache + fallback gracieux
//  des colonnes ajoutées par les migrations récentes.
//  Évite les 400 "column does not exist" quand un SQL est pending.
//
//  Colonnes sondées :
//   - tva_taux_id, code_lpp, code_acl, code_ucd... (0.58.67)
//   - prix_location_*, tags actifs... (0.58.72)
// =============================================================

const _cache = {
  hasTvaTauxId: null,
  hasCodesProduits: null,       // code_lpp, code_acl, code_ucd
  hasGereLotSerie: null,        // gere_lot, gere_serie, gere_peremption
  hasFournisseur: null,         // fournisseur_principal_id, pharmacie_id
  hasClassifications: null,     // classe_dm, sterile, usage_unique, dispositif_medical
  hasComptaOverride: null,      // compte_vente_override, compte_achat_override, code_analytique_override
  hasLocation: null,            // prix_location_jour/semaine/mois/trimestre (0.58.72)
  hasMarge: null,               // marge_pct
};

export function resetArticlesProbeCache() {
  Object.keys(_cache).forEach(k => { _cache[k] = null; });
}

async function _probeColumn(supabase, colName) {
  try {
    const { error } = await supabase
      .from("articles")
      .select(colName, { count: "exact", head: true })
      .limit(1);
    if (error) {
      if (error.code === "42703" || new RegExp(colName, "i").test(error.message || "")) {
        return false;
      }
      return true;  // autre erreur (RLS, réseau) → assume présent
    }
    return true;
  } catch {
    return false;
  }
}

export async function articlesHasTvaTauxId(supabase) {
  if (_cache.hasTvaTauxId !== null) return _cache.hasTvaTauxId;
  _cache.hasTvaTauxId = await _probeColumn(supabase, "tva_taux_id");
  return _cache.hasTvaTauxId;
}
export async function articlesHasCodesProduits(supabase) {
  if (_cache.hasCodesProduits !== null) return _cache.hasCodesProduits;
  _cache.hasCodesProduits = await _probeColumn(supabase, "code_lpp");
  return _cache.hasCodesProduits;
}
export async function articlesHasGereLotSerie(supabase) {
  if (_cache.hasGereLotSerie !== null) return _cache.hasGereLotSerie;
  _cache.hasGereLotSerie = await _probeColumn(supabase, "gere_lot");
  return _cache.hasGereLotSerie;
}
export async function articlesHasFournisseur(supabase) {
  if (_cache.hasFournisseur !== null) return _cache.hasFournisseur;
  _cache.hasFournisseur = await _probeColumn(supabase, "fournisseur_principal_id");
  return _cache.hasFournisseur;
}
export async function articlesHasClassifications(supabase) {
  if (_cache.hasClassifications !== null) return _cache.hasClassifications;
  _cache.hasClassifications = await _probeColumn(supabase, "dispositif_medical");
  return _cache.hasClassifications;
}
export async function articlesHasComptaOverride(supabase) {
  if (_cache.hasComptaOverride !== null) return _cache.hasComptaOverride;
  _cache.hasComptaOverride = await _probeColumn(supabase, "compte_vente_override");
  return _cache.hasComptaOverride;
}
export async function articlesHasLocation(supabase) {
  if (_cache.hasLocation !== null) return _cache.hasLocation;
  _cache.hasLocation = await _probeColumn(supabase, "prix_location_jour");
  return _cache.hasLocation;
}
export async function articlesHasMarge(supabase) {
  if (_cache.hasMarge !== null) return _cache.hasMarge;
  _cache.hasMarge = await _probeColumn(supabase, "marge_pct");
  return _cache.hasMarge;
}

/**
 * Sonde toutes les capacités en parallèle et retourne un objet caps.
 */
export async function probeArticleCaps(supabase) {
  const [tva, codes, lot, four, classif, compta, loc, marge] = await Promise.all([
    articlesHasTvaTauxId(supabase),
    articlesHasCodesProduits(supabase),
    articlesHasGereLotSerie(supabase),
    articlesHasFournisseur(supabase),
    articlesHasClassifications(supabase),
    articlesHasComptaOverride(supabase),
    articlesHasLocation(supabase),
    articlesHasMarge(supabase),
  ]);
  return {
    tvaTauxId: tva,
    codesProduits: codes,
    gereLotSerie: lot,
    fournisseur: four,
    classifications: classif,
    comptaOverride: compta,
    location: loc,
    marge,
  };
}

/**
 * Strip les colonnes absentes d'un payload selon les caps détectées.
 */
export function stripArticlePayload(payload, caps) {
  const p = { ...payload };
  if (!caps.tvaTauxId) {
    delete p.tva_taux_id;
    delete p.tva_pct;
    delete p.prix_vente_ttc;
  }
  if (!caps.codesProduits) {
    delete p.code_lpp;
    delete p.code_acl;
    delete p.code_ucd;
    delete p.code_barres_alt;
    delete p.code_barre_type;
  }
  if (!caps.gereLotSerie) {
    delete p.gere_lot;
    delete p.gere_serie;
    delete p.gere_peremption;
    delete p.duree_vie_jours;
  }
  if (!caps.fournisseur) {
    delete p.fournisseur_principal_id;
    delete p.pharmacie_id;
    delete p.etablissement_partenaire_id;
    delete p.fabricant;
    delete p.marque;
    delete p.modele;
  }
  if (!caps.classifications) {
    delete p.dispositif_medical;
    delete p.classe_dm;
    delete p.sterile;
    delete p.usage_unique;
  }
  if (!caps.comptaOverride) {
    delete p.compte_vente_override;
    delete p.compte_achat_override;
    delete p.code_analytique_override;
  }
  if (!caps.location) {
    delete p.prix_location_jour;
    delete p.prix_location_semaine;
    delete p.prix_location_mois;
    delete p.prix_location_trimestre;
    delete p.facturation_location;
  }
  if (!caps.marge) {
    delete p.marge_pct;
  }
  return p;
}

/**
 * Save (insert ou update) avec strip auto des colonnes absentes.
 */
export async function safeSaveArticle(supabase, payload, { id, userId } = {}) {
  const caps = await probeArticleCaps(supabase);
  const cleanPayload = stripArticlePayload(payload, caps);
  // Ajouter metadata d'audit si dispo
  if (userId) cleanPayload.updated_by = userId;
  cleanPayload.updated_at = new Date().toISOString();

  if (id) {
    const { data, error } = await supabase.from("articles").update(cleanPayload).eq("id", id).select().maybeSingle();
    return { data, error, caps, stripped: !objectsEqual(payload, cleanPayload) };
  } else {
    cleanPayload.created_at = cleanPayload.updated_at;
    if (userId) cleanPayload.created_by = userId;
    const { data, error } = await supabase.from("articles").insert(cleanPayload).select().maybeSingle();
    return { data, error, caps, stripped: !objectsEqual(payload, cleanPayload) };
  }
}

function objectsEqual(a, b) {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
}
