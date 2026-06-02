// =============================================================
//  Tests unitaires — 0.57.17
//  Durcissement sécurité approfondi : CSP, HSTS preload, COEP/CORP,
//  Permissions-Policy étendue, auth standardisée routes /from-ocr,
//  poweredByHeader désactivé.
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.17 - Version", () => {
  it("Version 0.57.17+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(17);
  });
});

describe("0.57.17 - Headers de sécurité durcis (next.config.js)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("X-Content-Type-Options: nosniff", () => {
    expect(src).toMatch(/X-Content-Type-Options.*nosniff/);
  });

  it("X-Frame-Options: SAMEORIGIN", () => {
    expect(src).toMatch(/X-Frame-Options.*SAMEORIGIN/);
  });

  it("HSTS max-age 1 an (31536000) + includeSubDomains + preload (vs 6 mois en 0.57.4)", () => {
    expect(src).toMatch(/Strict-Transport-Security.*max-age=31536000.*includeSubDomains.*preload/);
  });

  it("Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(src).toMatch(/Referrer-Policy.*strict-origin-when-cross-origin/);
  });

  it("Permissions-Policy interest-cohort=() (bloque FLoC tracking)", () => {
    expect(src).toMatch(/interest-cohort=\(\)/);
  });

  it("Permissions-Policy publickey-credentials-get=(self) (WebAuthn biométrie)", () => {
    expect(src).toMatch(/publickey-credentials-get=\(self\)/);
  });

  it("Permissions-Policy camera=(self), geolocation=(self), web-share=(self)", () => {
    expect(src).toMatch(/camera=\(self\)/);
    expect(src).toMatch(/geolocation=\(self\)/);
    expect(src).toMatch(/web-share=\(self\)/);
  });

  it("Permissions-Policy bloque microphone, payment, usb, bluetooth, etc.", () => {
    const blocked = ["microphone", "payment", "usb", "bluetooth", "midi", "hid", "serial"];
    for (const api of blocked) {
      expect(src, `${api} doit être bloqué via Permissions-Policy`).toMatch(new RegExp(`${api}=\\(\\)`));
    }
  });

  it("Cross-Origin-Opener-Policy: same-origin-allow-popups", () => {
    expect(src).toMatch(/Cross-Origin-Opener-Policy.*same-origin-allow-popups/);
  });

  it("Cross-Origin-Resource-Policy: same-origin (mitigation Spectre)", () => {
    expect(src).toMatch(/Cross-Origin-Resource-Policy.*same-origin/);
  });

  it("Content-Security-Policy-Report-Only configuré (mode observation)", () => {
    expect(src).toMatch(/Content-Security-Policy-Report-Only/);
  });

  it("X-Aveho-Security-Audit header informatif", () => {
    expect(src).toMatch(/X-Aveho-Security-Audit.*0\.57\.17/);
  });

  it("poweredByHeader: false (anti-fingerprinting)", () => {
    expect(src).toMatch(/poweredByHeader:\s*false/);
  });
});

describe("0.57.17 - CSP directives", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("default-src 'self' (deny by default)", () => {
    expect(src).toMatch(/default-src 'self'/);
  });

  it("connect-src autorise Supabase", () => {
    expect(src).toMatch(/connect-src.*supabase\.co/);
    expect(src).toMatch(/wss:\/\/\*\.supabase\.co/);
  });

  it("connect-src autorise api.gouv.fr (RPPS/SIRENE/FINESS)", () => {
    expect(src).toMatch(/connect-src.*api\.gouv\.fr/);
    expect(src).toMatch(/recherche-entreprises\.api\.gouv\.fr/);
  });

  it("img-src autorise tile.openstreetmap.org (carte Leaflet)", () => {
    expect(src).toMatch(/img-src.*tile\.openstreetmap\.org/);
  });

  it("frame-src 'none' (pas d'iframe externe)", () => {
    expect(src).toMatch(/frame-src 'none'/);
  });

  it("object-src 'none' (pas de Flash/Java applet)", () => {
    expect(src).toMatch(/object-src 'none'/);
  });

  it("form-action 'self' (anti-CSRF forms)", () => {
    expect(src).toMatch(/form-action 'self'/);
  });

  it("frame-ancestors 'self' (anti-clickjacking)", () => {
    expect(src).toMatch(/frame-ancestors 'self'/);
  });

  it("upgrade-insecure-requests (force HTTPS sub-resources)", () => {
    expect(src).toMatch(/upgrade-insecure-requests/);
  });
});

describe("0.57.17 - Cache + CORP sur /tabler-icons", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("Source /tabler-icons/(.*) configuré", () => {
    expect(src).toMatch(/source.*tabler-icons/);
  });

  it("Cache-Control: public, max-age=31536000, immutable", () => {
    expect(src).toMatch(/max-age=31536000.*immutable/);
  });
});

describe("0.57.17 - Auth standardisée routes /from-ocr (était : inline duplicate)", () => {
  it("app/api/patients/from-ocr utilise requireAuth", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/patients/from-ocr/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/import\s*\{[^}]*requireAuth[^}]*\}/);
    expect(src).toMatch(/const authCheck\s*=\s*await requireAuth\(req\)/);
    expect(src).toMatch(/if\s*\(\s*!authCheck\.ok\s*\)\s*return authCheck\.response/);
  });

  it("app/api/prescriptions/from-ocr utilise requireAuth", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/prescriptions/from-ocr/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/import\s*\{[^}]*requireAuth[^}]*\}/);
    expect(src).toMatch(/const authCheck\s*=\s*await requireAuth\(req\)/);
  });

  it("Plus de createClient inline avec auth manuelle (anti-duplication)", () => {
    const srcPatients = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/patients/from-ocr/route.js"),
      "utf-8"
    );
    // Ne doit PAS contenir le pattern "createClient(SUPABASE_URL, SUPABASE_ANON,"
    // utilisé avant 0.57.17 pour faire l'auth manuelle
    const hasInlineAuth = /createClient\s*\(\s*SUPABASE_URL/.test(srcPatients);
    expect(hasInlineAuth, "patients/from-ocr ne doit plus avoir d'auth inline").toBe(false);
  });
});

describe("0.57.17 - Routes API : couverture requireAuth élargie", () => {
  function listApiRoutes() {
    const routes = [];
    function walk(dir) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) walk(full);
        else if (item.name === "route.js") routes.push(full);
      }
    }
    walk(path.join(process.cwd(), "app/api"));
    return routes;
  }

  function getProtected() {
    return listApiRoutes().filter(f =>
      fs.readFileSync(f, "utf-8").includes("requireAuth")
    );
  }

  it("17 routes protégées par requireAuth (vs 15 en 0.57.4)", () => {
    expect(getProtected().length).toBeGreaterThanOrEqual(17);
  });

  it("Seules /api/version et /api/health ne sont pas protégées (health-checks publics)", () => {
    const unprotected = listApiRoutes()
      .filter(f => !fs.readFileSync(f, "utf-8").includes("requireAuth"))
      .map(f => f
        .replace(path.join(process.cwd(), "app/api"), "")
        .replace(/\\/g, "/")                        // 0.57.19 : normalise séparateurs Windows
        .replace("/route.js", "")
      );

    // Doit contenir uniquement /version et /health
    expect(unprotected.sort()).toEqual(["/health", "/version"]);
  });
});

describe("0.57.17 - LINT anti-régression : nouvelle route POST doit utiliser requireAuth", () => {
  // Toute nouvelle route POST/PUT/DELETE qui n'est pas dans la whitelist
  // doit utiliser requireAuth (sinon = trou de sécurité)
  const WHITELIST = ["/version", "/health"]; // health-checks publics par design

  function listApiPostRoutes() {
    const routes = [];
    function walk(dir) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) walk(full);
        else if (item.name === "route.js") {
          const src = fs.readFileSync(full, "utf-8");
          // Si la route exporte POST/PUT/DELETE
          if (/export\s+async\s+function\s+(POST|PUT|DELETE|PATCH)/.test(src)) {
            const apiPath = full
              .replace(path.join(process.cwd(), "app/api"), "")
              .replace(/\\/g, "/")                  // 0.57.19 : normalise AVANT replace /route.js
              .replace("/route.js", "");
            routes.push({ path: apiPath, src });
          }
        }
      }
    }
    walk(path.join(process.cwd(), "app/api"));
    return routes;
  }

  it("Toute route POST/PUT/DELETE utilise requireAuth (sauf whitelist /version, /health)", () => {
    const routes = listApiPostRoutes();
    const violations = routes.filter(r =>
      !WHITELIST.includes(r.path) && !r.src.includes("requireAuth")
    );
    expect(violations.map(v => v.path), `Routes POST/PUT/DELETE sans requireAuth : ${violations.map(v => v.path).join(", ")}`).toEqual([]);
  });
});
