// =============================================================
//  lib/internalFetch.js (Alpha 0.57.25)
//
//  Helper pour faire un fetch vers une autre route API de l'app
//  EN ÉVITANT le risque SSRF / Host header injection.
//
//  Avant 0.57.25 :
//    const host = req.headers.get("host");     // ← contrôlé par attaquant
//    fetch(`https://${host}/api/rpps?...`, {   // ← peut leak vers evil.com
//      headers: { Authorization: req.headers.get("authorization") }
//    });
//
//  Risque : un attaquant qui envoie un Host: evil.com peut faire que
//  notre serveur appelle https://evil.com/api/rpps avec NOTRE token
//  Authorization → exfiltration du token Bearer Supabase de la victime.
//
//  Fix : whitelist des hosts autorisés (prod + previews Vercel + dev).
// =============================================================

// Hosts considérés comme légitimes pour les appels internes
// (= la propre app Aveho EC qui appelle ses propres endpoints)
const ALLOWED_HOSTS_PATTERNS = [
  /^localhost(:\d+)?$/,
  /^127\.0\.0\.1(:\d+)?$/,
  /^aveho-ec-app\.vercel\.app$/,
  /^aveho-ec-app-[a-z0-9-]+\.vercel\.app$/,        // previews Vercel
  /^aveho-ec-app-[a-z0-9-]+-fleos-projects\.vercel\.app$/,
];

/**
 * Vérifie qu'un host est autorisé pour les appels internes.
 * Retourne true si OK, false si rejeté (potentiel SSRF).
 */
export function isAllowedInternalHost(host) {
  if (!host || typeof host !== "string") return false;
  // Whitelist par regex
  for (const pat of ALLOWED_HOSTS_PATTERNS) {
    if (pat.test(host)) return true;
  }
  return false;
}

/**
 * Construit une URL interne SÉCURISÉE à partir du Host header.
 * Throw si Host suspect (potentiel SSRF).
 *
 * Usage :
 *   const url = buildInternalUrl(req, "/api/rpps?rpps=12345");
 *   const res = await fetch(url, { headers: { Authorization: ... } });
 */
export function buildInternalUrl(req, path) {
  const host = req.headers.get("host");
  if (!isAllowedInternalHost(host)) {
    throw new Error(`Host header non autorisé (SSRF prevention) : ${host}`);
  }
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}${path.startsWith("/") ? path : "/" + path}`;
}

/**
 * Variante : appelle une autre route API en interne avec auth forward.
 * Retourne la Response (ou throw si Host suspect).
 *
 * Usage :
 *   const res = await internalFetch(req, "/api/rpps?rpps=12345");
 *   const data = await res.json();
 */
export async function internalFetch(req, path, options = {}) {
  const url = buildInternalUrl(req, path);
  const headers = {
    ...(options.headers || {}),
    // Forward le bearer token (sécurisé maintenant car URL whitelistée)
    Authorization: req.headers.get("authorization") || "",
  };
  return fetch(url, { ...options, headers });
}
