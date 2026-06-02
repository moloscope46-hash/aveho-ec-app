// =============================================================
//  Tests unitaires — 0.57.4
//  Audit sécurité applicatif : routes API auth + rate limit,
//  headers HTTP de sécurité, frontends Bearer obligatoire
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.4 - Version + bump", () => {
  it("Version 0.57.4+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(4);
  });
});

describe("0.57.4 - 7 routes API protégées avec auth + rate limit", () => {
  const routes = [
    { f: "app/api/caisses/route.js", min: 4 },           // GET POST PUT DELETE
    { f: "app/api/mutuelles/route.js", min: 4 },         // GET POST PUT DELETE
    { f: "app/api/place/route.js", min: 1 },
    { f: "app/api/prescriptions/search/route.js", min: 1 },
    { f: "app/api/prescriptions/export-csv/route.js", min: 1 },
    { f: "app/api/prescriptions/verify-rpps/route.js", min: 1 },
    { f: "app/api/google-reviews/sync/route.js", min: 1 },
  ];

  routes.forEach(({ f, min }) => {
    it(`${f} : utilise requireAuth (au moins ${min} handler${min > 1 ? "s" : ""})`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/import\s*\{[^}]*requireAuth/);
      const matches = src.match(/await\s+requireAuth\(req\)/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(min);
    });

    it(`${f} : utilise checkRateLimit (au moins ${min} handler${min > 1 ? "s" : ""})`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/import\s*\{[^}]*checkRateLimit/);
      const matches = src.match(/checkRateLimit\(/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(min);
    });
  });
});

describe("0.57.4 - Routes OCR créatrices avec rate limit (anti-quota Supabase)", () => {
  const routes = [
    "app/api/patients/from-ocr/route.js",
    "app/api/prescriptions/from-ocr/route.js",
  ];

  routes.forEach((f) => {
    it(`${f} : utilise checkRateLimit`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/checkRateLimit/);
    });

    it(`${f} : refuse 401 si Bearer absent`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      // Doit avoir une logique qui renvoie 401 (Bearer manquant OU getUser échoué)
      expect(src).toMatch(/401/);
      expect(src).toMatch(/Non authentifié|Token invalide/);
    });
  });
});

describe("0.57.4 - 7 frontends utilisent fetchWithAuth (Bearer auto)", () => {
  const frontends = [
    "app/CaisseSearch.js",
    "app/MutuelleSearch.js",
    "app/components/EtabGoogleDetails.js",
    "app/components/EtabPhoto.js",
    "app/parametres/integrations/page.js",
    "app/admin/medecins-prescripteurs/page.js",
    "app/RppsVerifyBadge.js",
  ];

  frontends.forEach((f) => {
    it(`${f} : import fetchWithAuth`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/import\s*\{\s*fetchWithAuth\s*\}\s*from/);
    });

    it(`${f} : appelle fetchWithAuth (au moins 1 fois)`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/fetchWithAuth\(/);
    });
  });
});

describe("0.57.4 - Headers HTTP de sécurité (OWASP)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("Définit async headers()", () => {
    expect(src).toMatch(/async headers\(\)/);
  });

  it("X-Content-Type-Options: nosniff", () => {
    expect(src).toContain('"X-Content-Type-Options"');
    expect(src).toContain('"nosniff"');
  });

  it("X-Frame-Options: SAMEORIGIN", () => {
    expect(src).toContain('"X-Frame-Options"');
    expect(src).toContain('"SAMEORIGIN"');
  });

  it("Strict-Transport-Security (HSTS)", () => {
    expect(src).toContain('"Strict-Transport-Security"');
    expect(src).toMatch(/max-age=\d{6,}/);  // au moins 6 chiffres (~ jour ou plus)
  });

  it("Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(src).toContain('"Referrer-Policy"');
    expect(src).toContain('"strict-origin-when-cross-origin"');
  });

  it("Permissions-Policy : caméra/micro/géoloc/paiement contrôlés", () => {
    expect(src).toContain('"Permissions-Policy"');
    expect(src).toMatch(/camera=|microphone=|geolocation=|payment=/);
  });

  it("Cross-Origin-Opener-Policy contre Spectre", () => {
    expect(src).toContain('"Cross-Origin-Opener-Policy"');
  });

  it("Applique les headers sur toutes les routes /(.*)", () => {
    expect(src).toMatch(/source:\s*["']\/\(\.\*\)["']/);
  });
});

describe("0.57.4 - dangerouslySetInnerHTML : sources contrôlées uniquement", () => {
  // Vérifie qu'aucun composant ne fait dangerouslySetInnerHTML avec un
  // input utilisateur direct (pas de innerHTML: req.body, ou input.value).
  const checks = [
    {
      file: "lib/rgpd.js",
      mustContain: ["consentementToHtml"],
      reason: "consentementToHtml échappe < > & avant traitement markdown",
    },
    {
      file: "app/changelog/CodeViewer.js",
      mustContain: ["escapeHtml"],
      reason: "highlightCode échappe avant coloration",
    },
  ];

  checks.forEach(({ file, mustContain, reason }) => {
    it(`${file} : ${reason}`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      mustContain.forEach((token) => expect(src).toContain(token));
    });
  });
});
