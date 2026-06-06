// =============================================================
//  Tests unitaires — 0.58.50
//  Vue d'ensemble bulletproof + cadre renforcé + migration 6 pages
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.50 - Version", () => {
  it("Version 0.58.50+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(50);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.50 - Vue d'ensemble bulletproof", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"), "utf-8");

  it("Section Vue d'ensemble avec marginTop 28", () => {
    expect(src).toMatch(/section style=\{\{\s*marginTop:\s*28/);
  });

  it("Utilise ?? au lieu de || pour les valeurs (gère 0 correctement)", () => {
    expect(src).toMatch(/kpis\?\.promos \?\? 0/);
    expect(src).toMatch(/kpis\?\.commandes \?\? 0/);
    expect(src).toMatch(/kpis\?\.enCours \?\? 0/);
    expect(src).toMatch(/kpis\?\.aRegler \?\? 0/);
  });

  it("Skeleton seulement si loading ET kpis null (pas pendant reload)", () => {
    expect(src).toMatch(/loading && !kpis \? \(\s*<SkeletonGrid/);
  });
});

describe("0.58.50 - Cadre global renforcé", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Bordure plus visible (rgba 124,200,200,0.25)", () => {
    expect(css).toMatch(/\.bg-dark \.wrap[\s\S]*?border:\s*1px solid rgba\(124,\s*200,\s*200,\s*0\.25\)/);
  });

  it("Box-shadow renforcé avec 4 couches", () => {
    const bgDarkWrap = css.match(/\.bg-dark \.wrap\s*\{([\s\S]*?)\}/);
    expect(bgDarkWrap).toBeTruthy();
    if (bgDarkWrap) {
      expect(bgDarkWrap[1]).toMatch(/box-shadow:[\s\S]*?16px 50px[\s\S]*?inset 0 -1px 0/);
    }
  });

  it("Pseudo-élément ::before pour highlight haut", () => {
    expect(css).toMatch(/\.bg-dark \.wrap::before\s*\{[\s\S]*?background:\s*linear-gradient\(90deg/);
  });

  it("Background gradient (pas juste rgba solide)", () => {
    expect(css).toMatch(/\.bg-dark \.wrap[\s\S]*?background:[\s\S]*?linear-gradient\(180deg/);
  });

  it("Border-radius 24px (plus arrondi qu'avant)", () => {
    expect(css).toMatch(/\.bg-dark \.wrap[\s\S]*?border-radius:\s*24px/);
  });

  it("Désactivation ::before en mode focus/présentation", () => {
    expect(css).toMatch(/html\.av-focus-mode \.bg-dark \.wrap::before/);
    expect(css).toMatch(/html\[data-presentation[\s\S]*?\.wrap::before/);
  });
});

describe("0.58.50 - Migration UI premium 6 pages", () => {
  const pages = [
    { path: "app/promotions/page.js", icon: "ti-discount-2-off" },
    { path: "app/admin/avis-google/page.js", icon: "ti-star-off" },
    { path: "app/admin/medecins-prescripteurs/page.js", icon: "ti-stethoscope" },
    { path: "app/parametres-rgpd/page.js", icon: null },
    { path: "app/statistiques-rgpd/page.js", icon: null },
    { path: "app/tags-materiel/page.js", icon: "ti-tags-off" },
  ];

  pages.forEach(({ path: p, icon }) => {
    it(`${p} : importe EmptyState + SkeletonRow`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/EmptyState[^"']*?["']\.\.+\/components\/ui-premium["']/);
      expect(src).toMatch(/SkeletonRow/);
    });
    if (icon) {
      it(`${p} : utilise icon=${icon}`, () => {
        const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
        expect(src).toMatch(new RegExp(`icon=["']${icon}["']`));
      });
    }
  });

  it("Total pages avec ui-premium : >= 35", () => {
    // Compte combien de pages.js importent ui-premium
    function findFiles(dir) {
      let results = [];
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== "node_modules" && item.name !== "components") {
          results = results.concat(findFiles(full));
        } else if (item.name === "page.js") {
          results.push(full);
        }
      }
      return results;
    }
    const files = findFiles(path.resolve(process.cwd(), "app"));
    const withPremium = files.filter(f => {
      const src = fs.readFileSync(f, "utf-8");
      return /from\s*["'][^"']*ui-premium["']/.test(src);
    });
    expect(withPremium.length).toBeGreaterThanOrEqual(35);
  });
});
