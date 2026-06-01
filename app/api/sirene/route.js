// =============================================================
//  app/api/sirene/route.js (Alpha 0.55.51)
//
//  Proxy serveur vers l'API Recherche d'Entreprises (DINUM/INSEE)
//  URL : https://recherche-entreprises.api.gouv.fr/search
//
//  0.55.51 :
//   - maxDuration 30s (Vercel) + AbortController 25s (interne)
//   - Plus jamais de 502 — on retourne 200 avec ok:false en cas d'erreur
//   - Format unifié { ok, count, results, error?, duration_ms }
//   - Limit max remontée à 50 (était 20)
//   - User-Agent pour traçabilité
// =============================================================

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SIRENE_BASE = "https://recherche-entreprises.api.gouv.fr/search";

const NAF_FILTERS = {
  sante: { section: "Q" },
  pharma: { codes: ["47.73Z"] },
  materiel_medical_orthopedie: { codes: ["47.74Z", "32.50A", "32.50B", "26.60Z"] },
  audio_optique: { codes: ["47.78A", "47.74Z"] },
  transport_sanitaire: { codes: ["86.90A"] },
  laboratoires: { codes: ["86.90B"] },
  fab_pharma: { codes: ["21.20Z"] },
};

// 0.56.21 : auth + rate limit (proxy API SIRENE)
import { requireAuth, checkRateLimit } from "../../../lib/apiAuth";

export async function GET(request) {
  const t0 = Date.now();

  const authCheck = await requireAuth(request);
  if (!authCheck.ok) return authCheck.response;
  const { user } = authCheck;
  const rate = checkRateLimit(user.id, { maxRequests: 60, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const siret = searchParams.get("siret");
  const siren = searchParams.get("siren");
  const limit = Math.min(Number(searchParams.get("limit") || 10), 50);
  const codePostal = searchParams.get("code_postal");
  const commune = searchParams.get("commune");
  const categorie = (searchParams.get("categorie") || "").trim();

  if (!q && !siret && !siren) {
    return Response.json({
      ok: false,
      results: [],
      error: "Param 'q', 'siret' ou 'siren' requis",
      duration_ms: 0,
    }, { status: 200 });
  }

  let url;
  try {
    if (siret) {
      url = `${SIRENE_BASE}?q=siret:${encodeURIComponent(siret)}&per_page=1`;
    } else if (siren) {
      url = `${SIRENE_BASE}?q=siren:${encodeURIComponent(siren)}&per_page=1`;
    } else {
      const params = new URLSearchParams({ q, per_page: String(limit) });
      if (codePostal) params.set("code_postal", codePostal);
      if (commune) params.set("nom_commune", commune);

      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      if (lat && lng) {
        params.set("lat", lat);
        params.set("long", lng);
        params.set("radius", searchParams.get("radius") || "50");
      }

      if (categorie && NAF_FILTERS[categorie]) {
        const filt = NAF_FILTERS[categorie];
        if (filt.section) {
          params.set("section_activite_principale", filt.section);
        } else if (filt.codes && filt.codes.length > 0) {
          params.set("activite_principale", filt.codes.join(","));
        }
      }
      url = `${SIRENE_BASE}?${params.toString()}`;
    }
  } catch (e) {
    return Response.json({
      ok: false, results: [],
      error: `URL build error: ${e.message}`,
      duration_ms: Date.now() - t0,
    }, { status: 200 });
  }

  // 0.55.51 : AbortController 25s (avant le 30s Vercel pour avoir le temps de répondre)
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25000);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Aveho-EC/0.55",
      },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json({
        ok: false, results: [],
        error: `SIRENE API HTTP ${res.status}`,
        api_status: res.status,
        duration_ms: Date.now() - t0,
      }, { status: 200 });
    }

    const payload = await res.json();
    return normalize(payload, Date.now() - t0);
  } catch (e) {
    clearTimeout(timeout);
    const isTimeout = e.name === "AbortError";
    return Response.json({
      ok: false, results: [],
      error: isTimeout
        ? "Timeout SIRENE (>25s) — la requête est trop lourde, essaie avec plus de critères"
        : `Erreur SIRENE : ${e.message}`,
      duration_ms: Date.now() - t0,
      timeout: isTimeout,
    }, { status: 200 });
  }
}

function normalize(payload, duration_ms) {
  const records = payload.results || [];
  const results = records.map(r => {
    const siege = r.siege || {};
    let adresse = siege.adresse || "";
    if (!adresse) {
      const parts = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean);
      adresse = parts.join(" ").trim();
    }
    const latitude = siege.latitude ? Number(siege.latitude) : null;
    const longitude = siege.longitude ? Number(siege.longitude) : null;
    const actif = (siege.etat_administratif || "A") === "A";
    const effectifs = r.tranche_effectif_salarie || siege.tranche_effectif_salarie || "";

    return {
      siren: r.siren || "",
      siret: siege.siret || "",
      nom_complet: r.nom_complet || r.nom_raison_sociale || "",
      nom_raison_sociale: r.nom_raison_sociale || "",
      sigle: r.sigle || "",
      activite_principale: r.activite_principale || "",
      libelle_activite: r.libelle_activite_principale || "",
      activite_section: r.section_activite_principale || "",
      categorie_entreprise: r.categorie_entreprise || "",
      effectifs,
      date_creation: r.date_creation || "",
      nature_juridique: r.nature_juridique || "",
      adresse: adresse || null,
      code_postal: siege.code_postal || "",
      ville: siege.libelle_commune || "",
      latitude,
      longitude,
      actif,
      etat_administratif: siege.etat_administratif || "",
      nombre_etablissements: r.nombre_etablissements || 1,
      nombre_etablissements_ouverts: r.nombre_etablissements_ouverts || 0,
    };
  });

  return Response.json({
    ok: true,
    count: results.length,
    results,
    duration_ms,
    total: payload.total_results || results.length,
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
