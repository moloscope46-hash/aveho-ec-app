// =============================================================
//  app/api/sirene/route.js
//  Alpha 0.55.4 — Proxy serveur vers l'API Recherche d'Entreprises
//
//  Source : API officielle DINUM/INSEE
//  URL : https://recherche-entreprises.api.gouv.fr/search
//  Rate limit : 7 req/s (très large)
//  Doc : https://recherche-entreprises.api.gouv.fr/docs/
// =============================================================

const SIRENE_BASE = "https://recherche-entreprises.api.gouv.fr/search";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const siret = searchParams.get("siret");
  const siren = searchParams.get("siren");
  const limit = Math.min(Number(searchParams.get("limit") || 10), 20);
  const codePostal = searchParams.get("code_postal");

  if (!q && !siret && !siren) {
    return new Response(
      JSON.stringify({ error: "Param 'q', 'siret' ou 'siren' requis", results: [] }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 0.55.5 : filtre par catégorie métier
  const categorie = (searchParams.get("categorie") || "").trim();
  // Codes NAF par catégorie médicale (multiple via section ou code précis)
  const NAF_FILTERS = {
    // Sections (lettres NAF)
    sante: { section: "Q" },  // Santé humaine et action sociale (tout le secteur)
    // Codes APE précis
    pharma: { codes: ["47.73Z"] },  // Pharmacies
    materiel_medical_orthopedie: { codes: ["47.74Z", "32.50A", "32.50B", "26.60Z"] },  // Commerce art. médicaux/ortho · fab. matériel médical
    audio_optique: { codes: ["47.78A", "47.74Z"] },  // Optique · audioprothèse
    transport_sanitaire: { codes: ["86.90A"] },  // Ambulances
    laboratoires: { codes: ["86.90B"] },  // Laboratoires d'analyses
    fab_pharma: { codes: ["21.20Z"] },  // Fabrication produits pharmaceutiques
  };

  try {
    let url;
    if (siret) {
      url = `${SIRENE_BASE}?q=siret:${encodeURIComponent(siret)}&per_page=1`;
    } else if (siren) {
      url = `${SIRENE_BASE}?q=siren:${encodeURIComponent(siren)}&per_page=1`;
    } else {
      const params = new URLSearchParams({ q, per_page: String(limit) });
      if (codePostal) params.set("code_postal", codePostal);
      // 0.55.41 : recherche par proximité géographique
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      if (lat && lng) {
        params.set("lat", lat);
        params.set("long", lng);
        params.set("radius", "50"); // 50km autour
      }
      // Filtre catégorie
      if (categorie && NAF_FILTERS[categorie]) {
        const filt = NAF_FILTERS[categorie];
        if (filt.section) {
          params.set("section_activite_principale", filt.section);
        } else if (filt.codes && filt.codes.length > 0) {
          // L'API supporte activite_principale en filtre — on prend le premier (limitation de l'API)
          // Pour avoir tous les codes en OR, il faudrait faire plusieurs appels ou utiliser code_naf
          params.set("activite_principale", filt.codes.join(","));
        }
      }
      url = `${SIRENE_BASE}?${params.toString()}`;
    }

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`SIRENE API HTTP ${res.status}`);
    }

    const payload = await res.json();
    return normalize(payload);
  } catch (e) {
    return new Response(
      JSON.stringify({ 
        error: e.message || "Erreur API SIRENE", 
        results: [] 
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

function normalize(payload) {
  const records = payload.results || [];
  const results = records.map(r => {
    const siege = r.siege || {};
    
    // Adresse complète : on prend d'abord celle pré-formatée par l'API
    let adresse = siege.adresse || "";
    // Si pas dispo, reconstruire
    if (!adresse) {
      const parts = [
        siege.numero_voie,
        siege.type_voie,
        siege.libelle_voie,
      ].filter(Boolean);
      adresse = parts.join(" ").trim();
    }

    const latitude = siege.latitude ? Number(siege.latitude) : null;
    const longitude = siege.longitude ? Number(siege.longitude) : null;

    // État : "A" = actif, "F" = fermé
    const actif = (siege.etat_administratif || "A") === "A";
    
    // Téléphone n'est PAS dans l'API publique (RGPD), seulement dans API Entreprise (besoin clé)
    // On laisse vide.
    
    // Effectifs / catégorie : approximation type d'organisation
    const effectifs = r.tranche_effectif_salarie || siege.tranche_effectif_salarie || "";
    
    return {
      siren: r.siren || "",
      siret: siege.siret || "",
      nom_complet: r.nom_complet || r.nom_raison_sociale || "",
      nom_raison_sociale: r.nom_raison_sociale || "",
      sigle: r.sigle || "",
      activite_principale: r.activite_principale || "",
      libelle_activite: r.libelle_activite_principale || "",
      activite_section: r.section_activite_principale || "",  // "Q" = santé/social, "G" = commerce, etc.
      categorie_entreprise: r.categorie_entreprise || "",
      effectifs,
      date_creation: r.date_creation || "",
      nature_juridique: r.nature_juridique || "",
      // Adresse du siège
      adresse: adresse || null,
      code_postal: siege.code_postal || "",
      ville: siege.libelle_commune || "",
      // Géo
      latitude,
      longitude,
      actif,
      etat_administratif: siege.etat_administratif || "",
      // Méta
      nombre_etablissements: r.nombre_etablissements || 1,
      nombre_etablissements_ouverts: r.nombre_etablissements_ouverts || 0,
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
