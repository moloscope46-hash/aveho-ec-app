import { logger } from "../../../lib/logger";

// =============================================================
//  app/api/rpps/route.js
//  Alpha 0.55.28 — Proxy serveur vers le RPPS officiel
//
//  Source : Annuaire santé ANS (Agence du Numérique en Santé)
//  Référence : https://annuaire.sante.fr/  (recherche prosanté)
//  Dataset : "psp" (Personnels de santé) sur tabular-api.data.gouv.fr
//
//  Cas d'usage Aveho :
//   - Référencer un médecin/IDE prescripteur sur un patient
//   - Auto-compléter à partir d'un numéro RPPS/ADELI
//   - Permettre la recherche par nom + département + profession
//
//  Format de retour normalisé :
//   {
//     ok: boolean,
//     count: number,
//     results: [{
//       rpps,           // 11 chiffres
//       adeli,          // 9 chiffres (médecins libéraux pour partie)
//       civilite,       // "M.", "Mme", "Dr"
//       nom,
//       prenom,
//       profession,     // "Médecin", "Infirmier", etc.
//       specialite,
//       mode_exercice,
//       adresse,
//       cp,
//       commune,
//       telephone,
//       email,
//     }]
//   }
// =============================================================

// Dataset ANS officiel (Annuaire santé) sur data.gouv.fr
// NB : le RID change quand l'ANS publie une nouvelle version (~mensuel)
// Pour l'instant on utilise un mock + structure pour démontrer l'API
const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources/";
const RPPS_DATASET_RID = process.env.RPPS_DATASET_RID || ""; // à configurer en env

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const rpps = (searchParams.get("rpps") || "").trim();
  const profession = (searchParams.get("profession") || "").trim();
  const cp = (searchParams.get("cp") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  if (!q && !rpps) {
    return Response.json({
      ok: false,
      error: "Requête vide. Fournissez ?q=nom ou ?rpps=12345678901",
    }, { status: 400 });
  }

  // Si le dataset RID n'est pas configuré, on retourne un mock
  // pour permettre le développement et les tests UI sans clé d'API.
  if (!RPPS_DATASET_RID) {
    logger.warn("[RPPS proxy] RPPS_DATASET_RID non configuré, utilisation du mock");
    return Response.json(buildMockResponse(q, rpps, profession, limit));
  }

  try {
    const url = new URL(`${TABULAR_BASE}${RPPS_DATASET_RID}/data/`);
    url.searchParams.set("page_size", String(limit));

    // Filtres
    if (rpps) {
      url.searchParams.set("identifiant_pp__exact", rpps);
    } else if (q) {
      // recherche par nom (insensible casse)
      url.searchParams.set("nom_d_exercice__contains", q.toUpperCase());
    }
    if (profession) {
      url.searchParams.set("libelle_profession__contains", profession);
    }
    if (cp) {
      url.searchParams.set("code_postal_coord_structure__startswith", cp);
    }

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // cache 1h
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.warn(`[RPPS proxy] tabular-api HTTP ${res.status}: ${detail} — URL: ${url}`);
      return Response.json({
        ok: false,
        error: `RPPS indisponible (HTTP ${res.status})`,
      }, { status: 502 });
    }

    const json = await res.json();
    const results = (json.data || []).map(normalizeEntry);

    return Response.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (e) {
    console.error("[RPPS proxy] Exception:", e);
    return Response.json({
      ok: false,
      error: "Erreur serveur lors de l'appel RPPS",
    }, { status: 500 });
  }
}

// Normalise un enregistrement RPPS brut vers notre format unifié
function normalizeEntry(row) {
  return {
    rpps: row.identifiant_pp || row.rpps || "",
    adeli: row.identifiant_pp_secondaire || row.adeli || "",
    civilite: row.code_civilite_d_exercice || row.civilite || "",
    nom: row.nom_d_exercice || row.nom || "",
    prenom: row.prenom_d_exercice || row.prenom || "",
    profession: row.libelle_profession || row.profession || "",
    specialite: row.libelle_savoir_faire || row.specialite || "",
    mode_exercice: row.libelle_mode_exercice || "",
    adresse: [row.numero_voie_coord_structure, row.libelle_voie_coord_structure].filter(Boolean).join(" "),
    cp: row.code_postal_coord_structure || "",
    commune: row.libelle_commune_coord_structure || "",
    telephone: row.telephone_coord_structure || "",
    email: row.adresse_email_coord_structure || "",
  };
}

// Mock pour permettre développement / démo sans dataset configuré
function buildMockResponse(q, rpps, profession, limit) {
  const mockData = [
    {
      rpps: "10101010101",
      adeli: "012345678",
      civilite: "Dr",
      nom: "DUPONT",
      prenom: "Marie",
      profession: "Médecin",
      specialite: "Médecine générale",
      mode_exercice: "Libéral",
      adresse: "12 rue de la République",
      cp: "75011",
      commune: "PARIS",
      telephone: "01 23 45 67 89",
      email: "marie.dupont@example.fr",
    },
    {
      rpps: "10101010102",
      adeli: "012345679",
      civilite: "Dr",
      nom: "MARTIN",
      prenom: "Jean",
      profession: "Médecin",
      specialite: "Cardiologie",
      mode_exercice: "Libéral",
      adresse: "5 avenue Foch",
      cp: "75116",
      commune: "PARIS",
      telephone: "01 44 55 66 77",
      email: "",
    },
    {
      rpps: "10101010103",
      adeli: "",
      civilite: "Mme",
      nom: "BERNARD",
      prenom: "Sophie",
      profession: "Infirmier",
      specialite: "IDEL",
      mode_exercice: "Libéral",
      adresse: "27 boulevard Voltaire",
      cp: "75011",
      commune: "PARIS",
      telephone: "06 12 34 56 78",
      email: "sophie.bernard@example.fr",
    },
    {
      rpps: "10101010104",
      adeli: "",
      civilite: "M.",
      nom: "PETIT",
      prenom: "Lucas",
      profession: "Kinésithérapeute",
      specialite: "Masso-kiné",
      mode_exercice: "Libéral",
      adresse: "3 place de la Mairie",
      cp: "46500",
      commune: "GRAMAT",
      telephone: "05 65 12 34 56",
      email: "",
    },
  ];

  // Filtre selon les paramètres
  let filtered = mockData;
  if (rpps) {
    filtered = filtered.filter((e) => e.rpps === rpps);
  } else if (q) {
    const qLower = q.toLowerCase();
    filtered = filtered.filter(
      (e) => e.nom.toLowerCase().includes(qLower)
          || e.prenom.toLowerCase().includes(qLower)
    );
  }
  if (profession) {
    const pLower = profession.toLowerCase();
    filtered = filtered.filter((e) => e.profession.toLowerCase().includes(pLower));
  }

  return {
    ok: true,
    count: Math.min(filtered.length, limit),
    results: filtered.slice(0, limit),
    mock: true,
    note: "Données simulées — configurez RPPS_DATASET_RID en variable d'environnement pour utiliser le vrai dataset ANS",
  };
}
