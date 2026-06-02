/** @type {import('next').NextConfig} */
const path = require("path");

// 0.57.4 : headers de sécurité HTTP recommandés OWASP
const SECURITY_HEADERS = [
  // Empêche le browser de "deviner" le content-type (XSS mitigation)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Empêche le site d'être chargé dans une iframe (clickjacking mitigation)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Force HTTPS (HSTS, 6 mois)
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  // Limite ce qui fuit dans le Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive les API navigateur sensibles par défaut
  // (caméra, micro, géoloc, paiement) — autorise au cas par cas si besoin
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
  // Cross-Origin Opener Policy : isole window.opener pour mitiger Spectre
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

module.exports = {
  reactStrictMode: true,
  // 0.57.3 : silence le warning "Next.js inferred your workspace root"
  outputFileTracingRoot: path.join(__dirname),

  // 0.57.4 : headers de sécurité HTTP
  async headers() {
    return [
      {
        // Appliqué à toutes les routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};
