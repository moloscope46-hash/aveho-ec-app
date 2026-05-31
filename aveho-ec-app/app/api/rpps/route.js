// =============================================================
//  app/api/rpps/route.js (Alpha 0.55.45)
//
//  Proxy serveur RPPS — RECHERCHE INTELLIGENTE multi-critères
//  Source : API FHIR Annuaire Santé ANS
//    Base URL : https://gateway.api.esante.gouv.fr/fhir/v2/
//    Doc      : https://ansforge.github.io/annuaire-sante-fhir-documentation/
//
//  Modes de recherche :
//    GET /api/rpps?q=DUPONT                      → cherche family=DUPONT
//    GET /api/rpps?q=Paris                       → cherche family=Paris ET ville=Paris
//                                                  (en parallèle, merge des résultats)
//    GET /api/rpps?ville=Paris&profession=Méd…  → search par ville+profession
//    GET /api/rpps?rpps=10000000001              → recherche exacte RPPS
//
//  Si l'API ANS bloque (403, timeout) → fallback graceful avec error msg
// =============================================================

const FHIR_BASE = "https://gateway.api.esante.gouv.fr/fhir/v2";

/** Normalise une ressource FHIR Practitioner vers notre format */
function normalizePractitioner(practitioner, roles = []) {
  const ids = practitioner.identifier || [];
  const rppsId = ids.find((i) => i.system?.includes("rpps") || i.system?.includes("idnatps"));
  const adeliId = ids.find((i) => i.system?.includes("adeli"));

  const name = practitioner.name?.[0] || {};
  const nom = name.family || "";
  const prenom = (name.given || []).join(" ") || "";
  const civilite = name.prefix?.[0] || "";

  const role = roles.find((r) => r.practitioner?.reference?.endsWith(practitioner.id)) || {};

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
  if (role.specialty && role.specialty[0]?.coding?.[0]?.display) {
    specialite = role.specialty[0].coding[0].display;
  }

  const telecom = role.telecom || practitioner.telecom || [];
  const tel = telecom.find((t) => t.system === "phone")?.value || "";
  const email = telecom.find((t) => t.system === "email")?.value || "";

  let adresse = "", cp = "", commune = "";
  if (role.location?.[0]?.address) {
    const a = role.location[0].address;
    adresse = (a.line || []).join(", ");
    cp = a.postalCode || "";
    commune = a.city || "";
  }

  let finess = "";
  let organization_name = "";
  if (role.organization?.reference) {
    const ref = role.organization.reference;
    const match = ref.match(/Organization\/(\d{9})/);
    if (match) finess = match[1];
    organization_name = role.organization.display || "";
  }

  return {
    rpps: rppsId?.value || "",
    adeli: adeliId?.value || "",
    civilite,
    nom,
    prenom,
    profession,
    specialite,
    telephone: tel,
    email,
    adresse,
    cp,
    commune,
    finess,
    organization_name,
    _fhirId: practitioner.id,
  };
}

/** Helper : fetch FHIR avec timeout + retry */
async function fetchFhir(url, label = "") {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        Accept: "application/fhir+json",
        "User-Agent": "Aveho-EC/0.55",
      },
      signal: ctrl.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);
    const dur = Date.now() - t0;
    if (!res.ok) {
      console.warn(`[RPPS ${label}] HTTP ${res.status} in ${dur}ms — ${url}`);
      return { ok: false, status: res.status, duration: dur };
    }
    const json = await res.json();
    return { ok: true, status: 200, data: json, duration: dur };
  } catch (e) {
    const dur = Date.now() - t0;
    console.warn(`[RPPS ${label}] error in ${dur}ms : ${e.message}`);
    return { ok: false, status: 0, error: e.message, duration: dur };
  }
}

export async function GET(req) {
  const t0 = Date.now();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const profession = (searchParams.get("profession") || "").trim();
  const cp = (searchParams.get("cp") || "").trim();
  const ville = (searchParams.get("ville") || "").trim();
  const rppsExact = (searchParams.get("rpps") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

  // Si rien, refuse
  if (!q && !rppsExact && !profession && !cp && !ville) {
    return Response.json({
      ok: false,
      results: [],
      error: "Précise au moins un critère (q, rpps, profession, cp, ville)",
    }, { status: 200 });
  }

  // Mode RPPS exact (11 chiffres)
  if (rppsExact) {
    const url = `${FHIR_BASE}/Practitioner?identifier=${encodeURIComponent(rppsExact)}&_count=1`;
    const r = await fetchFhir(url, "exact");
    if (!r.ok) {
      return Response.json({
        ok: false,
        results: [],
        error: r.status === 403 ? "API ANS bloquée (403)" : `API ANS HTTP ${r.status}`,
        api_status: r.status,
        duration_ms: r.duration,
      });
    }
    const entries = r.data?.entry || [];
    const pracs = entries.map(e => e.resource).filter(x => x.resourceType === "Practitioner");
    // Récupérer les rôles pour avoir profession/adresse
    let roles = [];
    if (pracs.length) {
      const ru = `${FHIR_BASE}/PractitionerRole?practitioner=${pracs[0].id}&_include=PractitionerRole:location&_count=20`;
      const rr = await fetchFhir(ru, "roles");
      if (rr.ok) {
        roles = (rr.data?.entry || []).map(e => e.resource).filter(x => x.resourceType === "PractitionerRole");
      }
    }
    const normalized = pracs.map(p => normalizePractitioner(p, roles));
    return Response.json({
      ok: true,
      count: normalized.length,
      results: normalized,
      duration_ms: Date.now() - t0,
      source: "ANS FHIR (exact RPPS)",
    });
  }

  // ====================================================
  // 0.55.45 : recherche INTELLIGENTE multi-critères
  // Si l'user tape "Paris" → on cherche en parallèle
  //   - family=Paris (au cas où nom de famille)
  //   - PractitionerRole avec address-city=Paris (probablement le sens voulu)
  // ====================================================
  const queries = [];

  if (q.length >= 2 || profession || ville || cp) {
    // 1) Recherche par family/given si q
    if (q.length >= 2) {
      const p1 = new URLSearchParams({ _count: String(Math.min(limit, 50)) });
      p1.set("name", q); // name = family + given (plus permissif que family seul)
      if (profession) p1.set("active", "true"); // pas filtrage profession côté API mais OK
      queries.push({
        url: `${FHIR_BASE}/Practitioner?${p1}`,
        type: "name",
        priority: 1,
      });
    }

    // 2) Recherche par PractitionerRole avec address-city/postalcode/profession
    // (toujours utile : ramène les rôles avec adresse complète)
    if (ville || cp || (q.length >= 2 && /^[A-ZÀ-Ÿ][a-zà-ÿ]/.test(q))) {
      const p2 = new URLSearchParams({ _count: String(Math.min(limit, 50)) });
      // Si q ressemble à un nom propre, on tente aussi en ville
      const cityQuery = ville || (q.length >= 3 ? q : "");
      if (cityQuery) p2.set("location.address-city", cityQuery);
      if (cp) p2.set("location.address-postalcode", cp);
      p2.set("_include", "PractitionerRole:practitioner");
      p2.set("_include", "PractitionerRole:location");
      if (cityQuery || cp) {
        queries.push({
          url: `${FHIR_BASE}/PractitionerRole?${p2}`,
          type: "city",
          priority: 2,
        });
      }
    }
  }

  if (!queries.length) {
    return Response.json({
      ok: false,
      results: [],
      error: "Précise au moins 2 lettres ou un critère ville/cp/profession",
    });
  }

  // Exécution PARALLÈLE des queries
  const allResults = await Promise.all(queries.map(q => fetchFhir(q.url, q.type)));

  const errors = allResults.filter(r => !r.ok);
  const successes = allResults.filter(r => r.ok);

  // Si toutes les requêtes ont échoué
  if (successes.length === 0) {
    const first = errors[0] || {};
    return Response.json({
      ok: false,
      results: [],
      error: first.status === 403
        ? "API ANS bloquée (403 Forbidden) — vérifier IP en production"
        : `API ANS indisponible (HTTP ${first.status || "timeout"})`,
      api_status: first.status,
      duration_ms: Date.now() - t0,
      debug_url_count: queries.length,
    }, { status: 200 });
  }

  // Merger les résultats : tous les Practitioners + tous les PractitionerRole
  const allEntries = [];
  for (const r of successes) {
    if (r.data?.entry) allEntries.push(...r.data.entry);
  }
  const allRes = allEntries.map(e => e.resource).filter(Boolean);
  const pracsByID = new Map();
  const rolesByPracID = new Map();
  for (const r of allRes) {
    if (r.resourceType === "Practitioner") {
      pracsByID.set(r.id, r);
    } else if (r.resourceType === "PractitionerRole") {
      const ref = r.practitioner?.reference || "";
      const pid = ref.split("/").pop();
      if (pid) {
        if (!rolesByPracID.has(pid)) rolesByPracID.set(pid, []);
        rolesByPracID.get(pid).push(r);
      }
    }
  }

  // Normaliser
  let normalized = [];
  for (const [id, p] of pracsByID.entries()) {
    const roles = rolesByPracID.get(id) || [];
    if (roles.length === 0) {
      normalized.push(normalizePractitioner(p, []));
    } else {
      // Une entrée par rôle pour avoir toutes les adresses
      for (const role of roles) {
        normalized.push(normalizePractitioner(p, [role]));
      }
    }
  }

  // Filtre client final (au cas où l'API n'a pas filtré)
  if (profession) {
    const pl = profession.toLowerCase();
    normalized = normalized.filter((e) => (e.profession || "").toLowerCase().includes(pl));
  }
  if (ville && !cp) {
    const vl = ville.toLowerCase();
    normalized = normalized.filter((e) => (e.commune || "").toLowerCase().includes(vl));
  }
  if (cp) {
    normalized = normalized.filter((e) => (e.cp || "").startsWith(cp));
  }

  // Dédupliquer par RPPS+adresse
  const seen = new Set();
  const dedup = normalized.filter(p => {
    const key = `${p.rpps}|${p.cp}|${p.commune}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);

  return Response.json({
    ok: true,
    count: dedup.length,
    results: dedup,
    duration_ms: Date.now() - t0,
    source: "ANS FHIR (multi-query parallel)",
    debug: {
      queries_count: queries.length,
      success_count: successes.length,
      error_count: errors.length,
      pracs_found: pracsByID.size,
      roles_found: allRes.filter(r => r.resourceType === "PractitionerRole").length,
    },
  });
}
