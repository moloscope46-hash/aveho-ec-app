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

// Mapping des groupes vers les codes FINESS (synchronisé avec lib/finessCategories.js)
const CATEGORY_CODES = {
  ehpad: ["500", "501", "202"],
  hopitaux: ["355", "365", "366", "356", "362", "411"],
  usld: ["354"],
  handicap: ["255", "437", "183", "186", "182", "188", "190", "402", "246", "395", "446", "249", "381"],
  ssr_psy: ["292", "660", "344"],
  domicile: ["354", "446"],
  pharma_lpp: ["620", "619", "3201", "3299"],
  formation: ["455", "456"],
  enfance: ["175", "176"],
  social: ["214", "246", "257"],
  // 0.55.9 : nouvelles catégories pour la carte (ressources santé proches)
  pharmacie: ["620"],                       // 38 530 pharmacies d'officine
  maison_sante: ["603"],                    // 1 115 maisons de santé pluripro
  centre_sante: ["124"],                    // 3 395 centres de santé (multi-disciplinaire)
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 10), 500);  // 0.55.9 : jusqu'à 500 pour bbox
  const finess = searchParams.get("finess");
  const type = (searchParams.get("type") || "ET").toUpperCase();
  // 0.55.5 : filtre par groupe(s) de catégorie (CSV : "ehpad,hopitaux")
  const categories = (searchParams.get("categories") || "").split(",").filter(Boolean);
  // 0.55.5 : filtre par département / code postal (préfixe)
  const codePostalPrefix = searchParams.get("cp_prefix");
  // 0.55.9 : filtre par bbox (lat1,lng1,lat2,lng2) — lat1<lat2, lng1<lng2
  const bbox = searchParams.get("bbox");

  if (!q && !finess && categories.length === 0 && !codePostalPrefix && !bbox) {
    return new Response(
      JSON.stringify({ error: "Param 'q', 'finess', 'categories', 'cp_prefix' ou 'bbox' requis", results: [] }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    let url;
    if (finess) {
      url = `${TABULAR_BASE}?finess__exact=${encodeURIComponent(finess)}&etat__exact=ACTUEL&page_size=1`;
    } else {
      const params = new URLSearchParams({
        etat__exact: "ACTUEL",
        type__exact: type,
        page_size: String(limit),
      });
      if (q) params.set("rs__contains", q.toUpperCase());
      // Filtre catégories : on combine les codes des groupes sélectionnés
      if (categories.length > 0) {
        const codes = categories.flatMap(g => CATEGORY_CODES[g] || []);
        if (codes.length > 0) {
          params.set("categ_code__in", codes.join(","));
        }
      }
      if (codePostalPrefix) {
        params.set("adresse_code_postal__contains", codePostalPrefix);
      }
      // 0.55.9 : filtre par bbox (carte logistique)
      if (bbox) {
        const parts = bbox.split(",").map(Number);
        if (parts.length === 4 && parts.every(n => !isNaN(n))) {
          const [lat1, lng1, lat2, lng2] = parts;
          params.set("geoloc_4326_lat__greater", String(Math.min(lat1, lat2)));
          params.set("geoloc_4326_lat__less", String(Math.max(lat1, lat2)));
          params.set("geoloc_4326_long__greater", String(Math.min(lng1, lng2)));
          params.set("geoloc_4326_long__less", String(Math.max(lng1, lng2)));
        }
      }
      url = `${TABULAR_BASE}?${params.toString()}`;
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
      categorie_code: f.categ_code || "",  // 0.55.9 : nécessaire pour guessGroup côté carte
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
