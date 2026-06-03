/** @type {import('next').NextConfig} */
const path = require("path");

// 0.57.4 : headers de sécurité HTTP recommandés OWASP
// 0.57.17 : durcissement complet (CSP report-only, HSTS preload, Permissions élargies, COEP/CORP)
//
//  Notes importantes :
//  - CSP en mode "report-only" pour observer sans casser le site.
//    Une fois validé en prod sur quelques jours sans bloquage légitime,
//    on basculera en "Content-Security-Policy" (enforcing).
//  - HSTS max-age 1 an + preload (vs 6 mois en 0.57.4)
//  - Permissions-Policy : ajout interest-cohort=() pour bloquer FLoC tracking
//  - CORP : same-origin pour les assets (mitige Spectre)

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.gouv.fr https://*.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.googleusercontent.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.gouv.fr https://*.api.gouv.fr https://recherche-entreprises.api.gouv.fr https://api.opendata.onisep.fr https://geo.api.gouv.fr https://maps.googleapis.com https://places.googleapis.com",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  // 0.57.22 : 'upgrade-insecure-requests' RETIRÉE car ignorée en mode report-only
  // Cette protection est déjà couverte par HSTS max-age=1 an + preload.
  // 0.57.24 : report-uri pour collecter les violations CSP en prod
  // → app/api/csp-report/route.js logge via lib/logger (Vercel logs)
  "report-uri /api/csp-report",
];

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      // === Features standard supportées par Chrome (Permissions-Policy spec) ===
      // Autorisées sur (self) uniquement
      "camera=(self)",                          // OCR scanner
      "geolocation=(self)",                     // carte logistique
      "web-share=(self)",                       // bouton Partager PWA
      "publickey-credentials-get=(self)",       // WebAuthn biométrie
      "sync-xhr=(self)",                        // Supabase realtime
      // Bloquées explicitement
      "microphone=()",
      "payment=()",                             // Aveho n'encaisse pas
      "interest-cohort=()",                     // FLoC tracking Google
      "bluetooth=()",
      "display-capture=()",
      "encrypted-media=()",
      "gamepad=()",
      "gyroscope=()",
      "hid=()",
      "idle-detection=()",
      "magnetometer=()",
      "midi=()",
      "screen-wake-lock=()",
      "serial=()",
      "usb=()",
      "xr-spatial-tracking=()",
      // 0.57.23 : retirées car non reconnues par Chrome (warnings console) :
      //  - ambient-light-sensor (origin trial seulement)
      //  - battery (deprecated)
      //  - document-domain (deprecated, remplacé par COOP)
      //  - execution-while-not-rendered (experimental)
      //  - execution-while-out-of-viewport (experimental)
      //  - navigation-override (experimental)
      //  - speaker-selection (pas implémenté Chrome)
      // Ces features ne pouvaient pas être bloquées par Permissions-Policy
      // car les browsers ne les reconnaissent pas comme tokens valides.
    ].join(", ")
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Content-Security-Policy-Report-Only", value: CSP_DIRECTIVES.join("; ") },
  { key: "X-Aveho-Security-Audit", value: "0.57.17" },
];

module.exports = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
      {
        source: "/tabler-icons/(.*)",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};
