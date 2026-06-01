// =============================================================
//  app/api/rpps/diagnostic/route.js (Alpha 0.55.48)
//
//  Diagnostic complet de l'API ANS RPPS depuis l'environnement
//  d'exécution (Vercel prod, local dev, etc).
//
//  Teste 4 endpoints en parallèle :
//   1. GET /Practitioner?family=DUPONT (recherche par nom)
//   2. GET /PractitionerRole?location.address-city=Paris
//   3. GET /Practitioner?identifier=10000000001 (RPPS exact)
//   4. GET httpbin.org/ip (pour voir l'IP sortante du serveur)
//
//  Retourne pour chaque appel :
//    - HTTP status
//    - durée ms
//    - body brut (tronqué si trop long)
//    - headers de réponse
//    - error si exception
//
//  → Affiché dans /admin/rpps-diagnostic pour debug.
// =============================================================

const FHIR_BASE = "https://gateway.api.esante.gouv.fr/fhir/v2";

async function testEndpoint(url, label, extraHeaders = {}) {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        Accept: "application/fhir+json",
        "User-Agent": "Aveho-EC/0.55 diagnostic",
        ...extraHeaders,
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const duration = Date.now() - t0;
    const text = await res.text();
    const truncatedBody = text.length > 800 ? text.slice(0, 800) + "…[tronqué]" : text;

    const headerObj = {};
    res.headers.forEach((v, k) => { headerObj[k] = v; });

    let bodyParsed = null;
    try { bodyParsed = JSON.parse(text); } catch {}

    return {
      label,
      url,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      duration_ms: duration,
      headers: headerObj,
      body_raw: truncatedBody,
      body_size: text.length,
      // Si JSON FHIR : nombre de résultats
      fhir_total: bodyParsed?.total ?? null,
      fhir_entry_count: Array.isArray(bodyParsed?.entry) ? bodyParsed.entry.length : null,
    };
  } catch (e) {
    return {
      label,
      url,
      ok: false,
      status: 0,
      statusText: e.name === "AbortError" ? "TIMEOUT" : "ERROR",
      duration_ms: Date.now() - t0,
      error: e.message,
    };
  }
}

// 0.56.21 : auth (expose info interne de diagnostic API)
import { requireAuth, checkRateLimit } from "../../../../lib/apiAuth";

export async function GET(req) {
  const tStart = Date.now();

  const authCheck = await requireAuth(req);
  if (!authCheck.ok) return authCheck.response;
  const { user } = authCheck;
  const rate = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  const { searchParams } = new URL(req.url);
  const customQuery = (searchParams.get("q") || "").trim();

  // 4 tests en parallèle
  const tests = await Promise.all([
    testEndpoint(`${FHIR_BASE}/Practitioner?family=DUPONT&_count=2`, "ANS Practitioner family=DUPONT"),
    testEndpoint(`${FHIR_BASE}/PractitionerRole?location.address-city=Paris&_count=2`, "ANS PractitionerRole city=Paris"),
    testEndpoint(`${FHIR_BASE}/Practitioner?identifier=10000000001&_count=1`, "ANS Practitioner identifier (RPPS test)"),
    testEndpoint("https://api-adresse.data.gouv.fr/search/?q=Paris&limit=1", "BAN (data.gouv.fr) — pour comparaison"),
  ]);

  // Test optionnel avec la query de l'utilisateur
  let userTest = null;
  if (customQuery) {
    userTest = await testEndpoint(
      `${FHIR_BASE}/Practitioner?name=${encodeURIComponent(customQuery)}&_count=5`,
      `Custom : Practitioner name=${customQuery}`,
    );
  }

  // IP sortante (utile pour voir si Vercel est blacklistée)
  let outgoingIp = null;
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (ipRes.ok) {
      outgoingIp = (await ipRes.json()).ip;
    }
  } catch {}

  // Diagnostic global
  const ansResults = tests.slice(0, 3);
  const ansOk = ansResults.filter(t => t.ok).length;
  const ansBlocked = ansResults.filter(t => t.status === 403).length;
  const banOk = tests[3].ok;

  let summary = "OK";
  let summary_msg = "L'API ANS répond correctement.";
  let summary_color = "green";

  if (ansBlocked >= 2) {
    summary = "BLACKLISTED";
    summary_msg = `L'IP sortante (${outgoingIp || "?"}) est blacklistée par l'API ANS (403 sur ${ansBlocked}/3 endpoints). En production il faudra contacter l'ANS pour whitelister, ou utiliser un proxy/relay.`;
    summary_color = "red";
  } else if (ansOk === 0) {
    summary = "DOWN";
    summary_msg = "L'API ANS ne répond pas du tout (probable maintenance ou timeout). Réessayer plus tard.";
    summary_color = "red";
  } else if (ansOk < 3) {
    summary = "PARTIAL";
    summary_msg = `L'API ANS répond partiellement (${ansOk}/3 endpoints OK). Vérifie les détails par requête.`;
    summary_color = "amber";
  } else if (!banOk) {
    summary = "OK_ANS_BAN_DOWN";
    summary_msg = "L'API ANS marche, mais BAN (data.gouv.fr) ne répond pas — le géocodage carte pourrait être affecté.";
    summary_color = "amber";
  }

  return Response.json({
    ok: true,
    timestamp: new Date().toISOString(),
    duration_total_ms: Date.now() - tStart,
    environment: {
      node: process.version,
      vercel: !!process.env.VERCEL,
      vercel_env: process.env.VERCEL_ENV || null,    // production / preview / development
      vercel_region: process.env.VERCEL_REGION || null,  // ex "cdg1" pour Paris
    },
    outgoing_ip: outgoingIp,
    summary: { code: summary, msg: summary_msg, color: summary_color },
    tests,
    user_test: userTest,
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
