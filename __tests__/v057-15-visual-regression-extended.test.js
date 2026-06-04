// =============================================================
//  Tests unitaires — 0.57.15
//  Extension du visual regression : 11 nouvelles baselines
//  Total : 18 baselines visuelles couvrant desktop/tablette/mobile + notes + sections
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.15 - Version", () => {
  it("Version 0.57.15+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(15);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.15 - Extension visual regression : 18 baselines", () => {
  const baselineDir = "tests/e2e/__screenshots__/visual-regression.spec.js";
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/visual-regression.spec.js"),
    "utf-8"
  );

  it("18 baselines totales", () => {
    const files = fs.readdirSync(path.resolve(process.cwd(), baselineDir));
    const pngs = files.filter(f => f.endsWith(".png"));
    expect(pngs.length).toBe(18);
  });

  // Nouvelles baselines 0.57.15
  const NEW_BASELINES = [
    "note-version-0-56-20-header.png",   // Note hardening sécurité
    "note-version-0-57-0-header.png",    // Note Next 15 migration
    "note-version-0-57-12-header.png",   // Note E2E Playwright
    "login-signup-mode.png",             // Mode signup (toggle)
    "login-magic-link-section.png",      // Section magic link
    "login-tablet-landscape.png",        // iPad 1024×768
    "mentions-legales-tablet.png",       // iPad
    "login-iphone-se.png",               // iPhone SE 375×667
    "login-desktop-large.png",           // 1920×1080
    "mentions-section-editeur.png",      // Section Éditeur clipped
    "mentions-section-footer.png",       // Footer clipped
  ];

  NEW_BASELINES.forEach((name) => {
    it(`Nouvelle baseline ${name}`, () => {
      const fullPath = path.resolve(process.cwd(), baselineDir, name);
      expect(fs.existsSync(fullPath), `Baseline ${name} manquante`).toBe(true);
      const size = fs.statSync(fullPath).size;
      expect(size, `Baseline ${name} trop petite (${size} bytes)`).toBeGreaterThan(50000);
    });
  });
});

describe("0.57.15 - Couverture des notes par version", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/visual-regression.spec.js"),
    "utf-8"
  );

  it("Test note 0.55.0 présent", () => {
    expect(src).toMatch(/NOTE-VERSION-Alpha-0\.55\.0\.html/);
  });

  it("Test note 0.56.20 présent (hardening sécurité)", () => {
    expect(src).toMatch(/NOTE-VERSION-Alpha-0\.56\.20\.html/);
  });

  it("Test note 0.57.0 présent (Next 15 migration)", () => {
    expect(src).toMatch(/NOTE-VERSION-Alpha-0\.57\.0\.html/);
  });

  it("Test note 0.57.12 présent (E2E Playwright)", () => {
    expect(src).toMatch(/NOTE-VERSION-Alpha-0\.57\.12\.html/);
  });
});

describe("0.57.15 - Tests login states", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/visual-regression.spec.js"),
    "utf-8"
  );

  it("Test mode signup (toggle Créer un compte)", () => {
    expect(src).toMatch(/Cr[ée]er un compte/);
    expect(src).toMatch(/login-signup-mode/);
  });

  it("Test magic link section", () => {
    expect(src).toMatch(/Recevoir un lien de connexion/);
    expect(src).toMatch(/magic-link/);
  });
});

describe("0.57.15 - Viewports multiples", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/visual-regression.spec.js"),
    "utf-8"
  );

  it("Viewport tablette iPad 1024×768", () => {
    expect(src).toMatch(/width:\s*1024\s*,\s*height:\s*768/);
  });

  it("Viewport iPhone SE 375×667", () => {
    expect(src).toMatch(/width:\s*375\s*,\s*height:\s*667/);
  });

  it("Viewport desktop large 1920×1080", () => {
    expect(src).toMatch(/width:\s*1920\s*,\s*height:\s*1080/);
  });

  it("Viewport mobile Pixel 5 393×851 (depuis 0.57.14)", () => {
    expect(src).toMatch(/width:\s*393\s*,\s*height:\s*851/);
  });
});

describe("0.57.15 - Sections /mentions-legales", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "tests/e2e/visual-regression.spec.js"),
    "utf-8"
  );

  it("Section Éditeur clipped (top 1100 px)", () => {
    expect(src).toMatch(/mentions-section-editeur/);
    expect(src).toMatch(/height:\s*1100/);
  });

  it("Section footer (scroll to bottom)", () => {
    expect(src).toMatch(/mentions-section-footer/);
    expect(src).toMatch(/scrollTo\(0,\s*document\.body\.scrollHeight\)/);
  });
});
