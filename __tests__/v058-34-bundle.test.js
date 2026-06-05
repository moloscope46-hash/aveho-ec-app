// =============================================================
//  Tests unitaires — 0.58.34
//  Fix Vercel build (Suspense useSearchParams) + lint v057-35 av- prefix
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.34 - Version", () => {
  it("Version 0.58.34+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(34);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.34 - Fix Vercel SSG : /etablissements Suspense boundary", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etablissements/page.js"), "utf-8");

  it("Import Suspense depuis react", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bSuspense\b[^}]*\}\s*from\s*["']react["']/);
  });

  it("Composant racine wrap <Suspense>", () => {
    expect(src).toMatch(/<Suspense fallback=\{null\}>/);
    expect(src).toMatch(/<\/Suspense>/);
  });

  it("Composant interne renommé (Inner)", () => {
    expect(src).toMatch(/function EtablissementsListPageInner/);
    expect(src).toMatch(/<EtablissementsListPageInner\s*\/>/);
  });

  it("Export default = wrapper Suspense, pas le composant interne", () => {
    // Le default export retourne Suspense > Inner
    expect(src).toMatch(/export default function EtablissementsListPage\(\)/);
  });
});

describe("0.58.34 - v057-35 test whitelist enrichie avec 'av-'", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v057-35-clear-user-data-logout.test.js"), "utf-8");

  it("Whitelist du test inclut maintenant key.startsWith('av-')", () => {
    expect(src).toMatch(/key\.startsWith\(["']av-["']\)/);
  });
});

describe("0.58.34 - Pages avec useSearchParams audit (toutes Suspense-wrapped)", () => {
  const pagesUsingUseSearchParams = [
    "app/etablissements/page.js",
    "app/achats/page.js",
    "app/presentation/interventions/page.js",
    "app/scan/prescription/page.js",
  ];

  pagesUsingUseSearchParams.forEach((rel) => {
    it(`${rel} : useSearchParams wrappé en Suspense`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), rel), "utf-8");
      if (!src.includes("useSearchParams")) return;  // skip si pas concerné
      expect(src).toMatch(/<Suspense/);
    });
  });
});
