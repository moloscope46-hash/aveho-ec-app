// =============================================================
//  Tests unitaires — 0.57.14
//  Visual regression testing via Playwright toHaveScreenshot
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.14 - Version + scripts npm", () => {
  it("Version 0.57.14+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(14);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("Script npm test:visual ajouté", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["test:visual"]).toMatch(/playwright test.*visual-regression/);
  });

  it("Script npm test:visual:update ajouté (regen baselines)", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts["test:visual:update"]).toMatch(/--update-snapshots/);
  });
});

describe("0.57.14 - Spec visual-regression.spec.js", () => {
  const specPath = "tests/e2e/visual-regression.spec.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), specPath), "utf-8");

  it("Fichier visual-regression.spec.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), specPath))).toBe(true);
  });

  it("Helper setupPopupsSkip configure le localStorage", () => {
    expect(src).toMatch(/setupPopupsSkip/);
    expect(src).toMatch(/addInitScript/);
    expect(src).toMatch(/aveho_geoloc_choice/);
    expect(src).toMatch(/aveho_biometric_optin_shown/);
    expect(src).toMatch(/aveho_install_banner_dismissed/);
  });

  it("Helper prepareForScreenshot désactive les animations CSS", () => {
    expect(src).toMatch(/prepareForScreenshot/);
    expect(src).toMatch(/animation-duration:\s*0s/);
    expect(src).toMatch(/transition-duration:\s*0s/);
  });

  it("Helper attend que les fonts soient chargées", () => {
    expect(src).toMatch(/document\.fonts\.ready/);
  });

  it("Tests skip sur non-chromium (screenshots non portables)", () => {
    expect(src).toMatch(/browserName\s*!==\s*["']chromium["']/);
  });

  it("toHaveScreenshot utilisé pour les comparaisons", () => {
    const matches = src.match(/toHaveScreenshot/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("Tests mobile avec viewport Pixel 5 (393×851)", () => {
    expect(src).toMatch(/viewport:\s*\{\s*width:\s*393\s*,\s*height:\s*851\s*\}/);
  });

  it("maxDiffPixels configuré (tolérance par test)", () => {
    expect(src).toMatch(/maxDiffPixels:\s*\d+/);
  });
});

describe("0.57.14 - Config Playwright toHaveScreenshot", () => {
  const configPath = "playwright.config.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), configPath), "utf-8");

  it("Config toHaveScreenshot dans expect", () => {
    expect(src).toMatch(/toHaveScreenshot:/);
  });

  it("maxDiffPixelRatio configuré (tolérance globale)", () => {
    expect(src).toMatch(/maxDiffPixelRatio:/);
  });

  it("animations: 'disabled' globalement", () => {
    expect(src).toMatch(/animations:\s*["']disabled["']/);
  });

  it("snapshotPathTemplate utilise __screenshots__", () => {
    expect(src).toMatch(/snapshotPathTemplate/);
    expect(src).toMatch(/__screenshots__/);
  });
});

describe("0.57.14 - Baselines générées", () => {
  const baselineDir = "tests/e2e/__screenshots__/visual-regression.spec.js";

  it("Dossier __screenshots__ existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), baselineDir))).toBe(true);
  });

  it("Au moins 5 baselines PNG générées", () => {
    const files = fs.readdirSync(path.resolve(process.cwd(), baselineDir));
    const pngs = files.filter(f => f.endsWith(".png"));
    expect(pngs.length).toBeGreaterThanOrEqual(5);
  });

  const EXPECTED_BASELINES = [
    "login-page.png",
    "mentions-legales.png",
    "login-card-empty.png",
    "login-card-filled.png",
    "login-mobile-pixel5.png",
    "mentions-legales-mobile.png",
    "note-version-0-55-0-header.png",  // Playwright remplace les . par -
  ];

  EXPECTED_BASELINES.forEach((name) => {
    it(`Baseline ${name} existe`, () => {
      const fullPath = path.resolve(process.cwd(), baselineDir, name);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stats = fs.statSync(fullPath);
      expect(stats.size).toBeGreaterThan(10000); // au moins 10 KB
    });
  });
});
