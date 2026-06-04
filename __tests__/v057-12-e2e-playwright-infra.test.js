// =============================================================
//  Tests unitaires — 0.57.12
//  Infrastructure E2E Playwright complète (74+ tests bout-en-bout)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.12 - Version + bump", () => {
  it("Version 0.57.12+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(12);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("Scripts npm test:e2e et test:e2e:ui ajoutés", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["test:e2e"]).toBe("playwright test");
    expect(pkg.scripts["test:e2e:ui"]).toBe("playwright test --ui");
  });
});

describe("0.57.12 - Config Playwright", () => {
  const configPath = "playwright.config.js";

  it("playwright.config.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), configPath))).toBe(true);
  });

  it("Config supporte E2E_USE_PROD_BUILD (npm start vs npm run dev)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), configPath), "utf-8");
    expect(src).toMatch(/E2E_USE_PROD_BUILD/);
    expect(src).toMatch(/npm start/);
    expect(src).toMatch(/npm run dev/);
  });

  it("Config supporte E2E_BASE_URL pour tester contre Vercel ou autre", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), configPath), "utf-8");
    expect(src).toMatch(/E2E_BASE_URL/);
  });

  it("Reporter HTML configuré", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), configPath), "utf-8");
    expect(src).toMatch(/reporter:.*html/);
  });

  it("Project chromium configuré", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), configPath), "utf-8");
    // 0.57.13 : utilise devices["Desktop Chrome"] au lieu de browserName direct
    const hasChromium = /browserName:\s*["']chromium["']/.test(src) ||
                        /name:\s*["']chromium["']/.test(src);
    expect(hasChromium).toBe(true);
  });
});

describe("0.57.12 - Fixtures E2E", () => {
  const fixturesPath = "tests/e2e/fixtures.js";

  it("fixtures.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), fixturesPath))).toBe(true);
  });

  it("Export DEMO_USER, isFullMode, test étendu", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), fixturesPath), "utf-8");
    expect(src).toMatch(/export const DEMO_USER/);
    expect(src).toMatch(/export const E2E_MODE/);
    expect(src).toMatch(/export const isFullMode/);
    expect(src).toMatch(/export const test/);
  });

  it("DEMO_USER override via E2E_USER_EMAIL / E2E_USER_PASSWORD", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), fixturesPath), "utf-8");
    expect(src).toMatch(/E2E_USER_EMAIL/);
    expect(src).toMatch(/E2E_USER_PASSWORD/);
  });

  it("loginHelper fonction implémentée", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), fixturesPath), "utf-8");
    expect(src).toMatch(/loginHelper/);
    expect(src).toMatch(/page\.fill\(["']input\[type='email'\]["']/);
  });
});

describe("0.57.12 - Spec files E2E", () => {
  const SPECS = [
    "tests/e2e/login.spec.js",
    "tests/e2e/public-pages.spec.js",
    "tests/e2e/changelog.spec.js",
    "tests/e2e/smoke-all-pages.spec.js",
    "tests/e2e/versions-features.spec.js",
    "tests/e2e/workflow-livraison-patient.spec.js",
  ];

  SPECS.forEach((spec) => {
    it(`${spec} existe`, () => {
      expect(fs.existsSync(path.resolve(process.cwd(), spec))).toBe(true);
    });

    it(`${spec} est un fichier de test Playwright valide`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), spec), "utf-8");
      // Doit importer test et expect
      expect(src).toMatch(/import\s*\{[^}]*test[^}]*\}/);
      // Doit avoir au moins un test()
      expect(src).toMatch(/test\(/);
    });
  });
});

describe("0.57.12 - Smoke tests : pages réelles d'Aveho", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/smoke-all-pages.spec.js"),
    "utf-8"
  );

  // Vérifier que les routes mentionnées dans le spec existent réellement
  // dans app/<route>/page.js
  const routePattern = /"\/([\w-]+)"/g;
  const routes = new Set();
  let m;
  while ((m = routePattern.exec(src)) !== null) {
    routes.add(m[1]);
  }

  it("Au moins 30 routes dans smoke-all-pages", () => {
    expect(routes.size).toBeGreaterThanOrEqual(30);
  });

  // Vérifier que chaque route a bien un app/<route>/page.js
  it("Toutes les routes mentionnées existent dans app/", () => {
    const missing = [];
    for (const route of routes) {
      // /login → app/login/page.js
      const expected = path.resolve(process.cwd(), `app/${route}/page.js`);
      if (!fs.existsSync(expected)) {
        missing.push(`/${route}`);
      }
    }
    expect(missing, `Routes hypothétiques (à retirer du spec): ${missing.join(", ")}`).toEqual([]);
  });
});

describe("0.57.12 - Tests par version : couvre les versions récentes", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/versions-features.spec.js"),
    "utf-8"
  );

  const VERSIONS_TESTED = [
    "0.57.11", "0.57.10", "0.57.9", "0.57.8",
    "0.57.7", "0.57.6", "0.57.4", "0.57.0",
    "0.56.20",
  ];

  VERSIONS_TESTED.forEach((v) => {
    it(`Tests E2E pour version ${v} présents`, () => {
      expect(src).toContain(v);
    });
  });
});

describe("0.57.12 - README E2E documentation", () => {
  const readmePath = "tests/e2e/README.md";

  it("README existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), readmePath))).toBe(true);
  });

  it("Documente les modes SMOKE et FULL", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), readmePath), "utf-8");
    expect(src).toMatch(/SMOKE/);
    expect(src).toMatch(/FULL/);
  });

  it("Documente les variables d'environnement", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), readmePath), "utf-8");
    expect(src).toMatch(/E2E_USER_EMAIL/);
    expect(src).toMatch(/E2E_BASE_URL/);
  });

  it("Documente comment tester contre Vercel directement", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), readmePath), "utf-8");
    expect(src).toMatch(/vercel\.app/);
  });
});
