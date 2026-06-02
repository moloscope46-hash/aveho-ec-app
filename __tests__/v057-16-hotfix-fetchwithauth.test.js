// =============================================================
//  Tests unitaires — 0.57.16
//  HOTFIX : tous les fetch() callers vers routes protégées utilisent
//  désormais fetchWithAuth() (bug introduit en 0.56.21 / révélé en prod 0.57.15)
//
//  Tests de NON-RÉGRESSION : si quelqu'un ajoute un fetch() vers une route
//  protégée par requireAuth sans utiliser fetchWithAuth, ce test va échouer.
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.16 - Version", () => {
  it("Version 0.57.16+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(16);
  });
});

describe("0.57.16 - Imports fetchWithAuth dans les fichiers fixés", () => {
  const FIXED_FILES = [
    "app/SireneSearch.js",
    "app/RppsAutocomplete.js",
    "app/admin/prescriptions-archive/page.js",
    "app/admin/avis-google/page.js",
    "app/scan/bulletin-situation/page.js",
    "app/scan/prescription/page.js",
    "app/scan/ocr/page.js",
  ];

  FIXED_FILES.forEach((file) => {
    it(`${file} importe fetchWithAuth`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      expect(src).toMatch(/import\s*\{[^}]*fetchWithAuth[^}]*\}\s*from/);
    });
  });
});

describe("0.57.16 - SireneSearch.js : fetch() remplacé par fetchWithAuth()", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/SireneSearch.js"),
    "utf-8"
  );

  it("Utilise fetchWithAuth pour /api/sirene", () => {
    expect(src).toMatch(/fetchWithAuth\(url\)/);
  });

  it("Plus de fetch(url) direct (cause du bug 0.56.21)", () => {
    // Vérifier qu'il n'y a plus de await fetch(url) sans Auth
    const directFetches = src.match(/await\s+fetch\(url\)/g);
    expect(directFetches).toBeNull();
  });
});

describe("0.57.16 - LINT ANTI-RÉGRESSION : aucun fetch() direct vers route protégée", () => {
  // Walk dans app/ (hors app/api et hors changelog) et trouver tous les fetch("/api/...")
  // Comparer aux routes qui ont requireAuth → ne doivent JAMAIS être appelées en fetch() direct

  const projectRoot = process.cwd();

  function getProtectedRoutes() {
    const routes = new Set();
    const apiRoot = path.join(projectRoot, "app/api");
    if (!fs.existsSync(apiRoot)) return routes;
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "route.js") {
          const src = fs.readFileSync(full, "utf-8");
          if (src.includes("requireAuth")) {
            // app/api/sirene/route.js → /api/sirene
            const rel = full.replace(projectRoot, "").replace(/\\/g, "/");
            const route = rel.replace("/app", "").replace("/route.js", "");
            routes.add(route);
          }
        }
      }
    }
    walk(apiRoot);
    return routes;
  }

  function findDirectFetches() {
    const bugs = [];
    const protectedRoutes = getProtectedRoutes();

    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip app/api (les routes elles-mêmes, pas concernées)
          // Skip changelog (smoke-tests font des appels volontairement sans auth)
          if (entry.name === "api" || entry.name === "changelog") continue;
          walk(full);
        } else if (entry.name.endsWith(".js")) {
          const src = fs.readFileSync(full, "utf-8");
          // Pattern : await fetch("/api/...") ou await fetch(`/api/...`)
          const re = /(?<!fetchWithAuth)\bawait\s+fetch\(["'`](\/api\/[^"'`?]+)/g;
          let m;
          while ((m = re.exec(src)) !== null) {
            const calledRoute = m[1];
            for (const protectedRoute of protectedRoutes) {
              if (calledRoute === protectedRoute || calledRoute.startsWith(protectedRoute + "/")) {
                bugs.push({ file: full.replace(projectRoot + "/", ""), route: calledRoute });
                break;
              }
            }
          }
        }
      }
    }
    walk(path.join(projectRoot, "app"));
    return bugs;
  }

  it("Aucun fetch() direct vers une route avec requireAuth (anti-régression 0.56.21)", () => {
    const bugs = findDirectFetches();
    if (bugs.length > 0) {
      console.error("❌ Bugs détectés :");
      for (const b of bugs.slice(0, 10)) console.error(`  ${b.file} → ${b.route}`);
    }
    expect(bugs, `${bugs.length} fetch() direct vers route protégée détecté(s) : ${bugs.slice(0, 3).map(b => b.file + " → " + b.route).join(", ")}`).toEqual([]);
  });

  it("Au moins 10 routes protégées par requireAuth (sécurité globale)", () => {
    const routes = getProtectedRoutes();
    expect(routes.size).toBeGreaterThanOrEqual(10);
  });
});

describe("0.57.16 - Documentation du bug dans le code (commentaire 0.57.16)", () => {
  const FIXED_FILES = [
    "app/SireneSearch.js",
    "app/RppsAutocomplete.js",
    "app/admin/prescriptions-archive/page.js",
    "app/admin/avis-google/page.js",
  ];

  FIXED_FILES.forEach((file) => {
    it(`${file} contient un marqueur 0.57.16 expliquant le fix`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      // Cherche 0.57.16 dans un commentaire
      expect(src).toMatch(/0\.57\.16/);
    });
  });
});
