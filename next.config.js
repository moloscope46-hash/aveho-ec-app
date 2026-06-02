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
  "upgrade-insecure-requests",
];

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)", "microphone=()", "geolocation=(self)", "payment=()",
      "interest-cohort=()", "ambient-light-sensor=()", "battery=()", "bluetooth=()",
      "display-capture=()", "document-domain=()", "encrypted-media=()",
      "execution-while-not-rendered=()", "execution-while-out-of-viewport=()",
      "gamepad=()", "gyroscope=()", "hid=()", "idle-detection=()",
      "magnetometer=()", "midi=()", "navigation-override=()",
      "publickey-credentials-get=(self)", "screen-wake-lock=()", "serial=()",
      "speaker-selection=()", "sync-xhr=(self)", "usb=()", "web-share=(self)",
      "xr-spatial-tracking=()",
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
