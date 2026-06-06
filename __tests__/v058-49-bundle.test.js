// =============================================================
//  Tests unitaires — 0.58.49
//  Fix tuiles accueil + cadre global pages + migration UI premium
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.49 - Version", () => {
  it("Version 0.58.49+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(49);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.49 - Fix /accueil : HeroDashboard toujours rendu", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("HeroDashboard rendu sans condition externe (widgets.kpis || widgets.atraiter)", () => {
    // Le wrapper conditionnel a été retiré
    expect(src).not.toMatch(/\{\(widgets\.kpis \|\| widgets\.atraiter\) && \(\s*<HeroDashboard/);
  });

  it("kpis passé toujours (pas conditionnel sur widgets.kpis)", () => {
    expect(src).toMatch(/<HeroDashboard[\s\S]*?kpis=\{kpis\}/);
  });

  it("atraiter conditionnel uniquement (data ou objet zéro)", () => {
    expect(src).toMatch(/atraiter=\{widgets\.atraiter \? atraiter : \{ di: 0/);
  });
});

describe("0.58.49 - Cadre global sur les pages (CSS)", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Selector .bg-dark .wrap avec bordure + background + radius", () => {
    expect(css).toMatch(/\.bg-dark \.wrap\s*\{[\s\S]*?background:\s*rgba\(13,\s*24,\s*34/);
    expect(css).toMatch(/\.bg-dark \.wrap\s*\{[\s\S]*?border:\s*1px solid rgba\(124,\s*200,\s*200/);
    expect(css).toMatch(/\.bg-dark \.wrap\s*\{[\s\S]*?border-radius:\s*22px/);
  });

  it("Backdrop-filter blur appliqué", () => {
    expect(css).toMatch(/\.bg-dark \.wrap[\s\S]*?backdrop-filter:\s*blur/);
  });

  it("Adaptation mobile : border-radius réduit + padding ajusté", () => {
    expect(css).toMatch(/@media \(max-width: 768px\)\s*\{[\s\S]*?\.bg-dark \.wrap[\s\S]*?border-radius:\s*18px/);
  });

  it("Désactivation en mode focus zen + présentation", () => {
    expect(css).toMatch(/html\.av-focus-mode \.bg-dark \.wrap/);
    expect(css).toMatch(/html\[data-presentation/);
  });
});

describe("0.58.49 - Migration UI premium pages", () => {
  it("/journal : EmptyState + SkeletonRow utilisés", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/journal/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*EmptyState[^}]*SkeletonRow[^}]*\}\s*from\s*["']\.\.\/components\/ui-premium["']/);
    expect(src).toMatch(/<EmptyState[\s\S]*?icon=["']ti-history["']/);
    expect(src).toMatch(/<SkeletonRow/);
  });

  it("/panier : EmptyState avec actionLabel", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/panier/page.js"), "utf-8");
    expect(src).toMatch(/<EmptyState[\s\S]*?icon=["']ti-shopping-cart-off["']/);
    expect(src).toMatch(/actionLabel=["']Voir les promotions["']/);
  });

  it("/collectivite : EmptyState pour 0 établissement + SkeletonRow pour loading", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/collectivite/page.js"), "utf-8");
    expect(src).toMatch(/<EmptyState[\s\S]*?icon=["']ti-building-skyscraper["']/);
    expect(src).toMatch(/<SkeletonRow/);
  });

  it("/audit : EmptyState pour 0 entrée + SkeletonRow pour loading", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/audit/page.js"), "utf-8");
    expect(src).toMatch(/<EmptyState[\s\S]*?icon=["']ti-search-off["']/);
    expect(src).toMatch(/<SkeletonRow/);
  });

  it("4 pages migrées au total dans 0.58.49 (journal, panier, collectivite, audit)", () => {
    const pages = ["app/journal/page.js", "app/panier/page.js", "app/collectivite/page.js", "app/audit/page.js"];
    pages.forEach(p => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/from\s*["']\.\.\/components\/ui-premium["']/);
    });
  });
});
