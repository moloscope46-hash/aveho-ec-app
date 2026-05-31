"use client";
// =============================================================
//  app/lib/checkEtabDoublon.js (Alpha 0.55.43)
//
//  Helper qui appelle la RPC check_etab_doublon et retourne
//  un format normalisé. Utilisable depuis n'importe quelle page.
// =============================================================

export async function checkEtabDoublon(supabase, params) {
  const {
    finess = null,
    siret = null,
    siren = null,
    rpps = null,
    nom = null,
    excludeId = null,
  } = params || {};

  // Pas de critères → pas de check
  if (!finess && !siret && !siren && !rpps && !nom) {
    return { ok: true, found: false, count: 0, matches: [] };
  }

  try {
    const { data, error } = await supabase.rpc("check_etab_doublon", {
      p_finess: finess,
      p_siret: siret,
      p_siren: siren,
      p_rpps: rpps,
      p_nom: nom,
      p_exclude_id: excludeId,
    });
    if (error) {
      console.error("[checkEtabDoublon] RPC error:", error);
      return { ok: false, error: error.message, found: false, count: 0, matches: [] };
    }
    return data || { ok: true, found: false, count: 0, matches: [] };
  } catch (e) {
    console.error("[checkEtabDoublon] exception:", e);
    return { ok: false, error: e.message, found: false, count: 0, matches: [] };
  }
}
