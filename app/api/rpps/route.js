// =============================================================
//  app/api/rpps/route.js (Alpha 0.55.29)
//
//  Proxy serveur RPPS — version PRODUCTION.
//  Source : API FHIR Annuaire Santé ANS (libre accès, sans clé)
//    Base URL : https://gateway.api.esante.gouv.fr/fhir/v2/
//    Doc      : https://ansforge.github.io/annuaire-sante-fhir-documentation/
//    Format   : FHIR R4 JSON
//
//  Plus de mock par défaut — données réelles ~1.7M praticiens.
//
//  Endpoints FHIR utilisés :
//    GET /Practitioner?family=DUPONT&_count=20
//    GET /Practitioner?identifier=10000000001  (RPPS exact)
//    GET /PractitionerRole?practitioner=<id>&_include=PractitionerRole:organization
// =============================================================

const FHIR_BASE = "https://gateway.api.esante.gouv.fr/fhir/v2";

/** Normalise une ressource FHIR Practitioner vers notre format */
function normalizePractitioner(practitioner, roles = []) {
  // Identifier RPPS / ADELI dans practitioner.identifier[]
  const ids = practitioner.identifier || [];
  const rppsId = ids.find((i) => i.system?.includes("rpps") || i.system?.includes("idnatps"));
  const adeliId = ids.find((i) => i.system?.includes("adeli"));

  // Nom + prénom
  const name = practitioner.name?.[0] || {};
  const nom = name.family || "";
  const prenom = (name.given || []).join(" ") || "";
  const civilite = name.prefix?.[0] || "";

  // Le PractitionerRole contient profession + adresse + tél
  const role = roles.find((r) => r.practitioner?.reference?.endsWith(practitioner.id)) || {};

  // Profession depuis code.coding[]
  let profession = "";
  let specialite = "";
  if (role.code) {
    for (const cc of role.code) {
      const coding = cc.coding?.[0];
      if (!coding) continue;
      if (coding.display) {
        if (!profession) profession = coding.display;
        else specialite = coding.display;
      }
    }
  }

  // specialty (savoir-faire / spécialité)
  if (role.specialty && role.specialty[0]?.coding?.[0]?.display) {
    specialite = role.specialty[0].coding[0].display;
  }

  // Telecom (téléphone / email)
  const telecom = role.telecom || practitioner.telecom || [];
  const tel = telecom.find((t) => t.system === "phone")?.value || "";
  const email = telecom.find((t) => t.system === "email")?.value || "";

  // Adresse (location ou directement sur role)
  let adresse = "", cp = "", commune = "";
  if (role.location?.[0]?.address) {
    const a = role.location[0].address;
    adresse = (a.line || []).join(", ");
    cp = a.postalCode || "";
    commune = a.city || "";
  }

  return {
    rpps: rppsId?.value || "",
    adeli: adeliId?.value || "",
    civilite,
    nom,
    prenom,
    profession,
    specialite,
    mode_exercice: "",
    adresse,
    cp,
    commune,
    telephone: tel,
    email,
    // ID interne FHIR pour aller chercher plus de détails si besoin
    _fhirId: practitioner.id,
  };
}

/** Récupère les PractitionerRole d'un practitioner pour avoir profession + adresse */
async function fetchRolesForPractitioner(practitionerId) {
  try {
    const url = `${FHIR_BASE}/PractitionerRole?practitioner=${practitionerId}&_count=5`;
    const res = await fetch(url, {
      headers: { Accept: "application/fhir+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.entry || []).map((e) => e.resource);
  } catch {
    return [];
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const profession = (searchParams.get("profession") || "").trim();
  const cp = (searchParams.get("cp") || "").trim();
  const ville = (searchParams.get("ville") || "").trim();
  const mode = (searchParams.get("mode") || "").trim();
  const rppsExact = (searchParams.get("rpps") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const includeRoles = searchParams.get("withRoles") !== "false";

  if (!q && !rppsExact && !profession && !cp && !ville) {
    return Response.json({
      ok: false,
      error: "Au moins un critère requis (q, rpps, profession, cp, ville)",
    }, { status: 400 });
  }

  try {
    // Build URL FHIR
    const params = new URLSearchParams();
    if (rppsExact) {
      params.set("identifier", rppsExact);
    } else {
      if (q) params.set("family", q);
    }
    params.set("_count", String(limit));

    const url = `${FHIR_BASE}/Practitioner?${params}`;
    const res = await fetch(url, {
      headers: { Accept: "application/fhir+json" },
      next: { revalidate: 3600 }, // Cache 1h serveur
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json({
        ok: false,
        error: `FHIR API HTTP ${res.status}`,
        detail: text.slice(0, 200),
      }, { status: 502 });
    }

    const json = await res.json();
    const practitioners = (json.entry || []).map((e) => e.resource);

    // Pour chaque practitioner, récupérer ses rôles (profession + adresse)
    // Limite à 20 pour ne pas exploser le temps de réponse
    const limited = practitioners.slice(0, Math.min(limit, 20));
    let normalized;
    if (includeRoles && limited.length > 0) {
      const roleResults = await Promise.all(
        limited.map((p) => fetchRolesForPractitioner(p.id))
      );
      normalized = limited.map((p, i) => normalizePractitioner(p, roleResults[i]));
    } else {
      normalized = limited.map((p) => normalizePractitioner(p, []));
    }

    // Filtre client côté serveur (FHIR ne filtre pas dessus directement)
    let filtered = normalized;
    if (profession) {
      const pl = profession.toLowerCase();
      filtered = filtered.filter((e) => (e.profession || "").toLowerCase().includes(pl));
    }
    if (cp) {
      filtered = filtered.filter((e) => (e.cp || "").startsWith(cp));
    }
    if (ville) {
      const vl = ville.toLowerCase();
      filtered = filtered.filter((e) => (e.commune || "").toLowerCase().includes(vl));
    }
    if (mode) {
      const ml = mode.toLowerCase();
      filtered = filtered.filter((e) => (e.mode_exercice || "").toLowerCase().includes(ml));
    }

    return Response.json({
      ok: true,
      count: filtered.length,
      total_fhir: practitioners.length,
      results: filtered,
      source: "ANS FHIR R4 (gateway.api.esante.gouv.fr)",
    });
  } catch (e) {
    console.error("[RPPS proxy] Exception:", e);
    return Response.json({
      ok: false,
      error: e.message || "Erreur inconnue",
    }, { status: 500 });
  }
}
