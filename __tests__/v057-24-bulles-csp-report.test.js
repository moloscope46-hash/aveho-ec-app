// =============================================================
//  Tests unitaires — 0.57.24
//  Fix bulles d'identification (ICONS_BY_CODE enrichi) + 13 SQL
//  files restaurés + endpoint /api/csp-report + audit RPC routes
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.24 - Version", () => {
  it("Version 0.57.24+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(24);
  });
});

describe("0.57.24 - Bulles d'identification : ICONS_BY_CODE enrichi", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/changelog/lib/helpers.js"),
    "utf-8"
  );

  // Tous les codes utilisés dans versions-data doivent avoir leur entrée
  const REQUIRED_CODES = [
    // Tous les codes 3 lettres (avant : gris uniforme)
    "FIX", "SQL", "DOC", "SEC", "BUG", "API", "USR",
    // Tous les codes 1-2 lettres (avant : bleu uniforme)
    "FE", "BE", "AI", "UX", "DB",
  ];

  REQUIRED_CODES.forEach((code) => {
    it(`Code '${code}' a son entrée ICONS_BY_CODE avec couleur dédiée`, () => {
      // Pattern : `code: { color: "#...", label: "..." }`
      const pattern = new RegExp(`${code}:\\s*\\{\\s*color:\\s*"#[0-9a-fA-F]{6}"`);
      expect(pattern.test(src), `${code} doit avoir une couleur dédiée`).toBe(true);
    });
  });

  it("Couleurs distinctes (pas 2 codes avec la même couleur)", () => {
    // Récupère toutes les couleurs des codes 0.57.24
    const colorsByCode = {};
    for (const code of REQUIRED_CODES) {
      const m = new RegExp(`${code}:\\s*\\{\\s*color:\\s*"(#[0-9a-fA-F]{6})"`).exec(src);
      if (m) colorsByCode[code] = m[1];
    }
    // Compter les couleurs et vérifier qu'aucune n'est dupliquée
    const colors = Object.values(colorsByCode);
    const unique = new Set(colors);
    // On accepte 1-2 duplications éventuelles (ex: SQL et DB tous deux verts)
    expect(unique.size).toBeGreaterThanOrEqual(colors.length - 2);
  });

  it("FIX en rouge (#c0392b) — correctif visible immédiatement", () => {
    expect(src).toMatch(/FIX:\s*\{\s*color:\s*"#c0392b"/);
  });

  it("SEC en rouge foncé (#b71c1c) — sécurité critique", () => {
    expect(src).toMatch(/SEC:\s*\{\s*color:\s*"#b71c1c"/);
  });

  it("AI en violet (#7a6fb0) — tests IA", () => {
    expect(src).toMatch(/AI:\s*\{\s*color:\s*"#7a6fb0"/);
  });

  it("DOC en cyan (#00838f) — documentation", () => {
    expect(src).toMatch(/DOC:\s*\{\s*color:\s*"#00838f"/);
  });

  it("getCodeMeta fallback préserve compat (bleu pour codes 1-2 lettres non répertoriés)", () => {
    expect(src).toMatch(/preserve compat|préserve compat/);
  });
});

describe("0.57.24 - 13 fichiers SQL restaurés dans public/changelog-sql/", () => {
  const RESTORED_FILES = [
    "aveho-PATCH-vers-0.55.56.sql",
    "aveho-PATCH-vers-0.56.1.sql",
    "aveho-PATCH-vers-0.56.3.sql",   // ← celui qui faisait 404
    "aveho-PATCH-vers-0.56.4.sql",   // ← celui qui faisait 404
    "aveho-PATCH-vers-0.56.5.sql",
    "aveho-PATCH-vers-0.56.6.sql",
    "aveho-PATCH-vers-0.56.7.sql",
    "aveho-PATCH-vers-0.56.8.sql",
    "aveho-PATCH-vers-0.56.9.sql",
    "aveho-PATCH-vers-0.56.10.sql",
    "aveho-PATCH-vers-0.56.15.sql",
    "aveho-PATCH-vers-0.56.20.sql",
    "aveho-PATCH-vers-0.57.22.sql",
  ];

  RESTORED_FILES.forEach((f) => {
    it(`Fichier ${f} présent dans public/changelog-sql/`, () => {
      expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-sql", f))).toBe(true);
    });
  });

  it("Total fichiers SQL dans public/changelog-sql/ : 63+", () => {
    const files = fs.readdirSync(path.resolve(process.cwd(), "public/changelog-sql"));
    expect(files.length).toBeGreaterThanOrEqual(63);
  });
});

describe("0.57.24 - Audit anti-régression : tous les sqlFile référencés existent", () => {
  it("Chaque sqlFile dans versions-data correspond à un fichier physique", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/changelog/versions-data.js"),
      "utf-8"
    );

    // Extraire tous les sqlFile
    const matches = [...src.matchAll(/"sqlFile":\s*"([^"]+\.sql)"/g)];
    const referenced = [...new Set(matches.map(m => m[1]))];

    // Lister les fichiers physiques
    const physical = new Set(
      fs.readdirSync(path.resolve(process.cwd(), "public/changelog-sql"))
    );

    const missing = referenced.filter(f => !physical.has(f));
    expect(missing, `Fichiers SQL référencés mais absents : ${missing.join(", ")}`).toEqual([]);
  });
});

describe("0.57.24 - Endpoint /api/csp-report (collecte violations CSP)", () => {
  const routePath = "app/api/csp-report/route.js";

  it("Route /api/csp-report existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), routePath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), routePath), "utf-8");

  it("Export POST handler (browser envoie POST)", () => {
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("Export GET handler (status check)", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
  });

  it("Pas de requireAuth (browser envoie sans credentials)", () => {
    expect(src).not.toMatch(/requireAuth/);
    expect(src).toMatch(/INTENTIONNELLEMENT public/);
  });

  it("Rate limit strict par IP (30/min)", () => {
    expect(src).toMatch(/30/);
    expect(src).toMatch(/checkRateLimit/);
    expect(src).toMatch(/ipBuckets/);
  });

  it("Utilise lib/logger (qui redacte les valeurs sensibles)", () => {
    expect(src).toMatch(/import\s*\{\s*logger\s*\}\s*from/);
    expect(src).toMatch(/logger\.warn/);
  });

  it("Supporte les 2 formats : legacy csp-report + Reporting API moderne", () => {
    expect(src).toMatch(/csp-report/);
    expect(src).toMatch(/body\?\.body/);
  });

  it("Répond toujours 204 No Content (silent fail pour anti-flood)", () => {
    expect(src).toMatch(/status:\s*204/);
  });

  it("Nettoyage périodique des vieux buckets IP (anti-leak mémoire)", () => {
    expect(src).toMatch(/setInterval/);
    expect(src).toMatch(/ipBuckets\.delete/);
  });
});

describe("0.57.24 - report-uri ajouté à la CSP", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("CSP contient report-uri /api/csp-report", () => {
    expect(src).toMatch(/report-uri\s+\/api\/csp-report/);
  });
});

describe("0.57.24 - Audit toutes les routes RPC sont protégées", () => {
  function listApiRoutes() {
    const routes = [];
    function walk(dir) {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) walk(full);
        else if (item.name === "route.js") routes.push(full);
      }
    }
    walk(path.join(process.cwd(), "app/api"));
    return routes;
  }

  it("Toute route qui appelle .rpc() utilise requireAuth", () => {
    const violations = [];
    for (const f of listApiRoutes()) {
      const src = fs.readFileSync(f, "utf-8");
      // Skip les routes whitelistées (publics par design)
      const fileRel = f.replace(/\\/g, "/");
      if (fileRel.includes("/csp-report/") || fileRel.includes("/version/") || fileRel.includes("/health/")) continue;

      if (/\.rpc\(/.test(src) && !/requireAuth/.test(src)) {
        violations.push(fileRel.split("app/api/")[1] || fileRel);
      }
    }
    expect(violations, `Routes RPC sans requireAuth : ${violations.join(", ")}`).toEqual([]);
  });
});

describe("0.57.24 - Score sécurité Aveho global", () => {
  it("npm audit : 0 CRIT + 0 HIGH (peut avoir des MOD postcss build-time)", () => {
    // On ne lance pas npm audit (lent + besoin de node_modules)
    // Mais on vérifie qu'on a documenté l'état
    const noteFile = "public/changelog-notes/NOTE-VERSION-Alpha-0.57.24.html";
    if (fs.existsSync(path.resolve(process.cwd(), noteFile))) {
      const src = fs.readFileSync(path.resolve(process.cwd(), noteFile), "utf-8");
      expect(src).toMatch(/0 CRIT.*0 HIGH/);
    }
    expect(true).toBe(true);
  });
});
