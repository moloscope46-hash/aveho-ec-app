// =============================================================
//  app/api/finess/route.js
//  Alpha 0.55.0 — Proxy serveur vers la base FINESS officielle
//
//  Source : référentiel t_finess (Atlasanté / data.gouv.fr)
//  RID : 796dfff7-cf54-493a-a0a7-ba3c2024c6f3 (mis à jour bi-mensuel)
//
//  Le proxy permet :
//   - de cacher la réponse côté serveur Next (revalidate 1h)
//   - d'uniformiser le format de retour
//   - de filtrer les entrées OBSOLETES
//   - d'éviter les soucis CORS éventuels
// =============================================================

const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources/796dfff7-cf54-493a-a0a7-ba3c2024c6f3/data/";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 10), 20);
  const finess = searchParams.get("finess");
  const type = (searchParams.get("type") || "ET").toUpperCase();

  if (!q && !finess) {
    return new Response(
      JSON.stringify({ error: "Param 'q' ou 'finess' requis", results: [] }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    let url;
    if (finess) {
      url = `${TABULAR_BASE}?finess__exact=${encodeURIComponent(finess)}&etat__exact=ACTUEL&page_size=1`;
    } else {
      const upper = q.toUpperCase();
      url = `${TABULAR_BASE}?rs__contains=${encodeURIComponent(upper)}&etat__exact=ACTUEL&type__exact=${type}&page_size=${limit}`;
    }

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`FINESS API HTTP ${res.status}`);
    }

    const payload = await res.json();
    return normalize(payload);
  } catch (e) {
    return new Response(
      JSON.stringify({ 
        error: e.message || "Erreur API FINESS", 
        results: [] 
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

function normalize(payload) {
  const records = payload.data || [];
  const results = records.map(f => {
    const adresseParts = [
      f.adresse_num_voie,
      f.adresse_type_voie,
      f.adresse_nom_voie,
      f.adresse_comp_voie,
      f.adresse_lieuditbp,
    ].filter(Boolean);
    const adresse = adresseParts.join(" ").trim();

    const latitude = f.geoloc_4326_lat ? Number(f.geoloc_4326_lat) : null;
    const longitude = f.geoloc_4326_long ? Number(f.geoloc_4326_long) : null;

    let capacite = null;
    if (f.esms_capaTot_inst && f.esms_capaTot_inst !== "." && f.esms_capaTot_inst !== "") {
      const n = parseInt(f.esms_capaTot_inst);
      if (!isNaN(n) && n > 0) capacite = n;
    }

    return {
      finess: f.finess || "",
      raison_sociale: f.rs || "",
      categorie: f.categ_lib || "",
      categorie_courte: f.categ_lib_court || "",
      categorie_niv1: f.categ_niv1_lib || "",
      categorie_niv2: f.categ_niv2_lib || "",
      categorie_domaine: f.categ_domaine || "",
      adresse: adresse || null,
      code_postal: f.adresse_code_postal || "",
      ville: f.adresse_lib_routage || "",
      telephone: f.telephone || "",
      latitude,
      longitude,
      siret: f.siret || "",
      siren: f.siren || "",
      statut_juridique: f.statut_jur_lib || "",
      statut_juridique_niv1: f.statut_jur_niv1_lib || "",
      tutelle: f.tutelle || "",
      capacite,
      ej_finess: f.ej_finess || "",
      ej_rs: f.ej_rs || "",
      type: f.type || "",
      date_ouverture: f.date_ouverture || "",
    };
  });

  return new Response(
    JSON.stringify({ count: results.length, results }),
    { 
      status: 200, 
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      } 
    }
  );
}
