// =============================================================
//  app/api/csp-report/route.js (Alpha 0.57.24)
//
//  Endpoint pour collecter les rapports de violation CSP.
//  Le browser envoie POST quand une directive CSP est violée
//  (script bloqué, image bloquée, etc.).
//
//  Pour activer le reporting, ajouter dans next.config.js CSP :
//    "report-uri /api/csp-report"
//
//  Ce endpoint est INTENTIONNELLEMENT public (pas d'auth)
//  car les browsers envoient les rapports avant que l'user soit
//  forcément authentifié, et ils n'incluent pas de credentials.
//
//  Sécurité : rate limit strict par IP pour éviter le flood,
//  logs propres avec lib/logger (qui redacte les valeurs sensibles).
// =============================================================

import { logger } from "../../../lib/logger";

export const dynamic = "force-dynamic";

// Rate limit en mémoire : 30 reports/min par IP max
const ipBuckets = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = ipBuckets.get(ip) || { count: 0, windowStart: now };
  if (now - bucket.windowStart > 60_000) {
    // Reset bucket si window dépassée
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count++;
  ipBuckets.set(ip, bucket);
  return bucket.count <= 30;
}

// Nettoyage périodique des vieux buckets (toutes les 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now - bucket.windowStart > 300_000) ipBuckets.delete(ip);
  }
}, 60_000);

export async function POST(req) {
  try {
    // IP du client (Vercel : x-forwarded-for, fallback "unknown")
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    if (!checkRateLimit(ip)) {
      // Silently drop si flood — pas d'erreur visible pour l'attaquant
      return new Response(null, { status: 204 });
    }

    let body = null;
    try { body = await req.json(); } catch { /* body invalide ignoré */ }

    // Le browser envoie soit:
    //   { "csp-report": {...} } (legacy)
    //   { "type": "csp-violation", "body": {...} } (Reporting API moderne)
    const report = body?.["csp-report"] || body?.body || body || {};

    // Log structuré (lib/logger redacte les valeurs sensibles)
    logger.warn("[CSP-Report] Violation détectée", {
      ip,
      blocked: report["blocked-uri"] || report.blockedURL || "?",
      directive: report["violated-directive"] || report.effectiveDirective || "?",
      document: report["document-uri"] || report.documentURL || "?",
      source: report["source-file"] || report.sourceFile || "?",
      line: report["line-number"] || report.lineNumber || "?",
    });

    // 204 No Content — le browser n'attend pas de réponse
    return new Response(null, { status: 204 });
  } catch (e) {
    logger.warn("[CSP-Report] Erreur traitement", e);
    return new Response(null, { status: 204 });
  }
}

// GET sur cet endpoint = juste pour status check
export async function GET() {
  return Response.json({
    ok: true,
    endpoint: "/api/csp-report",
    purpose: "Collecte des violations CSP (RFC 7469)",
    rate_limit: "30/min par IP",
  });
}
