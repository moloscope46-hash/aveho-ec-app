// =============================================================
//  Tests unitaires — 0.57.13
//  Cross-browser E2E : Chromium + Firefox + WebKit + mobile devices
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.13 - Version + bump", () => {
  it("Version 0.57.13+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(13);
  });
});

describe("0.57.13 - Config Playwright cross-browser", () => {
  const configPath = "playwright.config.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), configPath), "utf-8");

  it("Import devices depuis @playwright/test", () => {
    expect(src).toMatch(/import\s*\{[^}]*devices[^}]*\}\s*from\s*["']@playwright\/test["']/);
  });

  it("Project Chromium configuré (Desktop Chrome)", () => {
    expect(src).toMatch(/name:\s*["']chromium["']/);
    expect(src).toMatch(/devices\[["']Desktop Chrome["']\]/);
  });

  it("Project Firefox configuré (Desktop Firefox)", () => {
    expect(src).toMatch(/name:\s*["']firefox["']/);
    expect(src).toMatch(/devices\[["']Desktop Firefox["']\]/);
  });

  it("Project WebKit configuré (Desktop Safari)", () => {
    expect(src).toMatch(/name:\s*["']webkit["']/);
    expect(src).toMatch(/devices\[["']Desktop Safari["']\]/);
  });

  it("Project Mobile Chrome (Pixel 5) configuré", () => {
    expect(src).toMatch(/name:\s*["']Mobile Chrome["']/);
    expect(src).toMatch(/devices\[["']Pixel 5["']\]/);
  });

  it("Project Mobile Safari (iPhone 13) configuré", () => {
    expect(src).toMatch(/name:\s*["']Mobile Safari["']/);
    expect(src).toMatch(/devices\[["']iPhone 13["']\]/);
  });

  it("Filtre BROWSERS env var supporté", () => {
    expect(src).toMatch(/process\.env\.BROWSERS/);
    expect(src).toMatch(/\.split\(["']\,["']\)/);
  });
});

describe("0.57.13 - login.spec.js : biométrie browser-aware", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/login.spec.js"), "utf-8");

  it("Test biométrie utilise browserName fixture", () => {
    expect(src).toMatch(/\{\s*page,\s*browserName\s*\}/);
  });

  it("Test biométrie tolère 0 ou 2 boutons en WebKit", () => {
    expect(src).toMatch(/browserName\s*===\s*["']webkit["']/);
    // Vérifier qu'on accepte 0 ou 2 pour webkit
    expect(src).toMatch(/\[0,\s*2\]/);
  });

  it("Chromium et Firefox attendent 2 boutons", () => {
    expect(src).toMatch(/expect\(count\)\.toBe\(2\)/);
  });
});

describe("0.57.13 - smoke-all-pages : retry Firefox NS_BINDING_ABORTED", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/smoke-all-pages.spec.js"), "utf-8");

  it("Catch NS_BINDING_ABORTED spécifique Firefox", () => {
    expect(src).toMatch(/NS_BINDING_ABORTED/);
    expect(src).toMatch(/browserName\s*===\s*["']firefox["']/);
  });

  it("Retry de la navigation après abort Firefox", () => {
    expect(src).toMatch(/await page\.waitForTimeout\(500\)/);
    expect(src).toMatch(/response\s*=\s*await page\.goto/);
  });
});

describe("0.57.13 - Browsers Playwright installés", () => {
  // Test conceptuel : la doc README mentionne les 3 browsers + mobile
  const readme = fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/README.md"), "utf-8");

  it("README mentionne playwright install (commande d'install)", () => {
    expect(readme).toMatch(/playwright install/);
  });
});

describe("0.57.13 - Compatibilité browser : différences documentées", () => {
  // Vérifier qu'on a documenté les différences cross-browser
  it("Le code spec note les particularités WebKit (WebAuthn headless)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/login.spec.js"), "utf-8");
    // Le commentaire doit mentionner WebAuthn ou webkit headless
    expect(src).toMatch(/WebAuthn|webkit/i);
  });

  it("Le code spec note la particularité Firefox NS_BINDING_ABORTED", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "tests/e2e/smoke-all-pages.spec.js"), "utf-8");
    expect(src).toMatch(/NS_BINDING_ABORTED/);
  });
});
