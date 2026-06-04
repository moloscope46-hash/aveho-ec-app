// =============================================================
//  Tests unitaires — 0.58.4 UI PHASE 3
//
//  Drawer menu premium + PageHero déployé sur 4 pages clés
//  + Composant Avatar (avatar gradient + AvatarGroup)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.4 - Version", () => {
  it("Version 0.58.4+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(4);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.4 - Drawer menu premium CSS", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Header drawer avec gradient 4-stops + decorative radial", () => {
    expect(css).toMatch(/\.menu-head\s*\{[\s\S]*?linear-gradient\(135deg[\s\S]*?0d1822[\s\S]*?142131[\s\S]*?1d3540/);
    expect(css).toMatch(/\.menu-head::before\s*\{[\s\S]*?radial-gradient/);
  });

  it("Logo .v du header avec glow shadow", () => {
    const menuHead = css.substring(css.indexOf("MENU DRAWER PREMIUM"));
    expect(menuHead).toMatch(/\.menu-head\s+\.logo\s+\.v\s*\{[\s\S]*?text-shadow:[\s\S]*?rgba\(124,200,200/);
  });

  it("Menu-close avec rotation hover", () => {
    expect(css).toMatch(/\.menu-close:hover\s*\{[\s\S]*?rotate\(90deg\)/);
  });

  it("Section headers avec dot teal + bar gradient", () => {
    expect(css).toMatch(/\.menu-section-h::before\s*\{[\s\S]*?background:\s*#7CC8C8/);
    expect(css).toMatch(/\.menu-section-h\s+\.bar\s*\{[\s\S]*?linear-gradient/);
  });

  it("Menu tiles avec radial gradient + hover scale icon", () => {
    expect(css).toMatch(/\.menu-tile::before\s*\{[\s\S]*?radial-gradient/);
    expect(css).toMatch(/\.menu-tile:hover\s+\.mt-ic\s*\{[\s\S]*?scale\(1\.08\)/);
  });

  it("Menu tile active avec gradient + double shadow", () => {
    expect(css).toMatch(/\.menu-tile\.on\s*\{[\s\S]*?linear-gradient[\s\S]*?inset/);
  });

  it("Menu tile count badge avec gradient + border blanc", () => {
    expect(css).toMatch(/\.menu-tile\s+\.mt-count\s*\{[\s\S]*?linear-gradient/);
    expect(css).toMatch(/\.menu-tile\s+\.mt-count\s*\{[\s\S]*?border:[\s\S]*?#fff/);
  });

  it("Scrollbar customisée", () => {
    expect(css).toMatch(/\.menu-scroll::-webkit-scrollbar/);
  });

  it("Animation fade-in-up sur sections", () => {
    expect(css).toMatch(/\.menu-section\s*\{[\s\S]*?animation:\s*av-fade-in-up/);
  });
});

describe("0.58.4 - PageHero déployé sur 4 pages clés", () => {
  function checkPageHero(file) {
    const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    return {
      hasImport: /import\s+\{[^}]*PageHero[^}]*\}\s+from\s+["'][^"']*ui-premium["']/.test(src),
      hasUsage: /<PageHero/.test(src),
    };
  }

  it("statistiques/page.js utilise PageHero", () => {
    const r = checkPageHero("app/statistiques/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });

  it("interventions/kanban/page.js utilise PageHero", () => {
    const r = checkPageHero("app/interventions/kanban/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });

  it("calendrier/page.js utilise PageHero", () => {
    const r = checkPageHero("app/calendrier/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });

  it("materiels/page.js utilise PageHero (avec stats inline)", () => {
    const r = checkPageHero("app/materiels/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
    // Vérifier qu'on passe bien des stats au PageHero
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");
    expect(src).toMatch(/stats=\{\[/);
  });

  it("PageHero a des breadcrumbs sur statistiques", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/statistiques/page.js"), "utf-8");
    expect(src).toMatch(/breadcrumbs=\{\[/);
  });
});

describe("0.58.4 - Composant Avatar", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/Avatar.js"),
    "utf-8"
  );

  it("Export default + AvatarGroup", () => {
    expect(src).toMatch(/export default function Avatar/);
    expect(src).toMatch(/export function AvatarGroup/);
  });

  it("8 gradients déterministes (palette cohérente)", () => {
    expect(src).toMatch(/const GRADIENTS\s*=\s*\[/);
    // Compter les linear-gradient dans le tableau
    const gradMatch = src.match(/GRADIENTS\s*=\s*\[([\s\S]*?)\];/);
    expect(gradMatch).toBeTruthy();
    const count = (gradMatch[1].match(/linear-gradient/g) || []).length;
    expect(count).toBe(8);
  });

  it("Hash deterministe pour distribution des couleurs", () => {
    expect(src).toMatch(/function hashCode/);
    expect(src).toMatch(/h\s*=\s*\(\(h\s*<<\s*5\)\s*-\s*h\)/);
  });

  it("Extraction d'initiales (max 2 lettres)", () => {
    expect(src).toMatch(/function getInitials/);
    expect(src).toMatch(/\.slice\(0,\s*2\)/);
  });

  it("Support src (image) avec fallback initiales", () => {
    expect(src).toMatch(/backgroundImage:\s*src\s*\?\s*`url/);
  });

  it("Badge statut (online/busy/away/offline)", () => {
    expect(src).toMatch(/STATUS_COLORS\s*=\s*\{/);
    expect(src).toMatch(/online:/);
    expect(src).toMatch(/busy:/);
    expect(src).toMatch(/away:/);
    expect(src).toMatch(/offline:/);
  });

  it("Halo glow option (ring)", () => {
    expect(src).toMatch(/ring\s*=\s*false/);
    expect(src).toMatch(/filter:\s*["']blur/);
  });

  it("AvatarGroup avec overlap + overflow count", () => {
    expect(src).toMatch(/overflow\s*=\s*users\.length\s*-\s*max/);
    expect(src).toMatch(/\+\{overflow\}/);
  });

  it("Shape options (circle / rounded)", () => {
    expect(src).toMatch(/shape\s*=\s*["']circle["']/);
    expect(src).toMatch(/shape === ["']rounded["']/);
  });
});

describe("0.58.4 - Avatar exporté depuis ui-premium/index", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/index.js"),
    "utf-8"
  );

  it("Exporte Avatar + AvatarGroup", () => {
    expect(src).toMatch(/Avatar/);
    expect(src).toMatch(/AvatarGroup/);
  });
});
