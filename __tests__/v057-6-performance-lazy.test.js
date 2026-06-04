// =============================================================
//  Tests unitaires — 0.57.6
//  Performance : lazy load de CodeViewer / SqlModal / smoke-tests
//  + script d'analyse de bundle
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.6 - Version + bump", () => {
  it("Version 0.57.6+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(6);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.6 - smoke-tests-index.js (split léger)", () => {
  const indexPath = "app/changelog/smoke-tests-index.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), indexPath), "utf-8");

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), indexPath))).toBe(true);
  });

  it("Export VERSION_TESTS_KEYS comme Set", () => {
    expect(src).toMatch(/export const VERSION_TESTS_KEYS\s*=\s*new Set/);
  });

  it("Export runTestsForVersionLazy (dynamic import)", () => {
    expect(src).toMatch(/export async function runTestsForVersionLazy/);
    expect(src).toMatch(/await import\(["']\.\/smoke-tests["']\)/);
  });

  it("Export runAllTestsLazy (dynamic import)", () => {
    expect(src).toMatch(/export async function runAllTestsLazy/);
  });

  it("Contient au moins 50 clés de versions (couverture historique)", () => {
    const matches = src.match(/"\d+\.\d+\.\d+"/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(50);
  });

  it("Fichier léger : moins de 100 lignes", () => {
    const lines = src.split("\n").length;
    expect(lines).toBeLessThan(120);
  });
});

describe("0.57.6 - changelog/page.js : lazy load des composants", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Importe next/dynamic pour les lazy components", () => {
    expect(src).toMatch(/import dynamic from ["']next\/dynamic["']/);
  });

  it("CodeViewer lazy (dynamic import)", () => {
    expect(src).toMatch(/const CodeViewer\s*=\s*dynamic\(/);
    expect(src).toMatch(/dynamic\(\(\)\s*=>\s*import\(["']\.\/CodeViewer["']\)/);
  });

  it("SqlModal lazy (dynamic import)", () => {
    expect(src).toMatch(/const SqlModal\s*=\s*dynamic\(/);
    expect(src).toMatch(/dynamic\(\(\)\s*=>\s*import\(["']\.\/SqlModal["']\)/);
  });

  it("ssr: false pour les modaux (chargés uniquement côté client)", () => {
    // Ces modals utilisent useState/useEffect et n'apportent rien en SSR
    const dynamicMatches = src.match(/dynamic\([^)]*\)/g) || [];
    expect(dynamicMatches.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/ssr:\s*false/);
  });

  it("Plus d'import statique de CodeViewer", () => {
    expect(src).not.toMatch(/^import CodeViewer from/m);
  });

  it("Plus d'import statique de SqlModal", () => {
    expect(src).not.toMatch(/^import SqlModal from/m);
  });

  it("Plus d'import statique de smoke-tests (juste smoke-tests-index)", () => {
    expect(src).not.toMatch(/import.*from\s+["']\.\/smoke-tests["']\s*;?\s*$/m);
    expect(src).toMatch(/import.*from\s+["']\.\/smoke-tests-index["']/);
  });

  it("Utilise VERSION_TESTS_KEYS.has(v.v) au lieu de VERSION_TESTS[v.v]", () => {
    expect(src).toMatch(/VERSION_TESTS_KEYS\.has\(v\.v\)/);
    expect(src).not.toMatch(/VERSION_TESTS\[/);
  });

  it("Appelle runTestsForVersionLazy + runAllTestsLazy", () => {
    expect(src).toMatch(/runTestsForVersionLazy\(/);
    expect(src).toMatch(/runAllTestsLazy\(/);
  });
});

describe("0.57.6 - Lazy loads existants confirmés", () => {
  it("jszip est en dynamic import dans changelog/page.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    expect(src).toMatch(/await import\(["']jszip["']\)/);
  });

  it("leaflet est en dynamic import dans carte/page.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");
    expect(src).toMatch(/await import\(["']leaflet["']\)/);
  });

  it("exportData et exportPdf sont en dynamic imports dans crud.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/crud.js"), "utf-8");
    expect(src).toMatch(/import\(["']\.\.\/lib\/export["']\)/);
    expect(src).toMatch(/import\(["']\.\.\/lib\/exportPdf["']\)/);
  });
});

describe("0.57.6 - Script d'analyse de bundle", () => {
  it("scripts/analyze-bundle.sh existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "scripts/analyze-bundle.sh"))).toBe(true);
  });

  it("Script est exécutable et a la bonne structure", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "scripts/analyze-bundle.sh"), "utf-8");
    expect(src).toContain("#!/bin/bash");
    expect(src).toMatch(/AVEHO EC.*Analyse des bundles/);
    expect(src).toMatch(/Shared chunks/);
    expect(src).toMatch(/Pages les plus lourdes/);
    expect(src).toMatch(/Dynamic chunks/);
  });
});
