// =============================================================
//  Tests unitaires — 0.58.9 UI PHASE 8
//
//  Refonte modales (backdrop blur + slide-up premium)
//  + Mode sombre étendu aux composants premium
//  + Skeleton sur 4 listes restantes (signalements, achats, maintenance, commandes)
//  + Avatar sur liste DI (/interventions)
//  + Migration toast (consentements, statistiques-activite, maintenance)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.9 - Version", () => {
  it("Version 0.58.9+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(9);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.9 - Refonte modales premium", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Modal background avec backdrop blur 8px", () => {
    expect(css).toMatch(/\.modal-bg\s*\{[\s\S]*?backdrop-filter:\s*blur\(8px\)\s*saturate\(140%\)/);
  });

  it("Animation modal-bg-in (fade + blur progressive)", () => {
    expect(css).toMatch(/@keyframes modal-bg-in[\s\S]*?backdrop-filter:\s*blur\(0px\)[\s\S]*?backdrop-filter:\s*blur\(8px\)/);
  });

  it("Modal-v2 avec shadow premium multi-couches", () => {
    expect(css).toMatch(/\.modal-v2\s*\{[\s\S]*?box-shadow:[\s\S]*?0 30px 60px[\s\S]*?0 12px 24px/);
  });

  it("Animation modalIn slide-up plus marquée (40px)", () => {
    expect(css).toMatch(/@keyframes modalIn[\s\S]*?translateY\(40px\)\s*scale\(\.94\)/);
  });

  it("Modal head avec brillance + decorative radial", () => {
    expect(css).toMatch(/\.modal-head-v2::before\s*\{[\s\S]*?linear-gradient\(90deg,\s*transparent/);
    expect(css).toMatch(/\.modal-head-v2::after\s*\{[\s\S]*?radial-gradient/);
  });

  it("Close button (modal-x) avec rotation 90deg au hover", () => {
    expect(css).toMatch(/\.modal-head-v2\s+\.modal-x:hover\s*\{[\s\S]*?rotate\(90deg\)/);
  });

  it("Modal foot avec gradient subtil", () => {
    expect(css).toMatch(/\.modal-v2\s+\.modal-foot\s*\{[\s\S]*?linear-gradient\(180deg,\s*#fafbfc/);
  });
});

describe("0.58.9 - Mode sombre étendu aux composants premium", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("DARK : Modal-bg avec rgba sombre", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.modal-bg\s*\{[\s\S]*?rgba\(0,0,0,\.65\)/);
  });

  it("DARK : Modal-v2 avec shadow sombre", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.modal-v2\s*\{[\s\S]*?box-shadow/);
  });

  it("DARK : Kanban cards adaptées", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.kb-card\s*\{[\s\S]*?#243044/);
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.kb-col\s*\{[\s\S]*?aveho-panel/);
  });

  it("DARK : UserMenu sheet adapté", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.um-sheet\s*\{[\s\S]*?aveho-panel/);
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.um-head\s*\{[\s\S]*?linear-gradient/);
  });

  it("DARK : Menu drawer + tiles adaptés", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.menu-drawer\s*\{[\s\S]*?linear-gradient/);
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.menu-tile\s*\{[\s\S]*?aveho-panel/);
  });

  it("DARK : Skeleton shimmer avec couleurs sombres", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\[style\*="animation:\s*av-shimmer"\]\s*\{[\s\S]*?#1a2434/);
  });
});

describe("0.58.9 - SkeletonRow sur 4 listes restantes", () => {
  function checkSkeleton(file) {
    const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    return {
      hasImport: /import\s+\{[^}]*SkeletonRow[^}]*\}\s+from\s+["'][^"']*ui-premium["']/.test(src),
      hasUsage: /<SkeletonRow\s+key=\{i\}\s+cols=\{[0-9]+\}/.test(src),
    };
  }

  it("signalements/page.js utilise SkeletonRow", () => {
    const r = checkSkeleton("app/signalements/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });

  it("achats/page.js utilise SkeletonRow", () => {
    const r = checkSkeleton("app/achats/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });

  it("maintenance/page.js utilise SkeletonRow", () => {
    const r = checkSkeleton("app/maintenance/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });

  it("commandes/page.js utilise SkeletonRow", () => {
    const r = checkSkeleton("app/commandes/page.js");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
  });
});

describe("0.58.9 - Avatar sur liste DI (/interventions)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");

  it("Avatar importé depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*Avatar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("Nouvelle colonne 'Assigné' dans le thead", () => {
    expect(src).toMatch(/<th>Assigné<\/th>/);
  });

  it("Cellule avec Avatar size 26 si assignee_email", () => {
    expect(src).toMatch(/r\.assignee_email\s*\?\s*\(/);
    expect(src).toMatch(/<Avatar\s+name=\{r\.assignee_email\}\s+size=\{26\}/);
  });

  it("Fallback '—' si pas assigné", () => {
    expect(src).toMatch(/fontStyle:\s*["']italic["'][\s\S]*?—/);
  });
});

describe("0.58.9 - Migration toast suite (consentements + statistiques-activite + maintenance)", () => {
  function checkNoNativeAlerts(file) {
    const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\/.*$/gm, "");
    return {
      hasToast: /toast\.(error|success|info)\(/.test(codeOnly),
      nativeAlerts: (codeOnly.match(/(?<!dialogs\.)\balert\(/g) || []).length,
    };
  }

  it("consentements : 0 alert natif + toast.error utilisé", () => {
    const r = checkNoNativeAlerts("app/consentements/page.js");
    expect(r.hasToast).toBe(true);
    expect(r.nativeAlerts).toBe(0);
  });

  it("statistiques-activite : 0 alert natif", () => {
    const r = checkNoNativeAlerts("app/statistiques-activite/page.js");
    expect(r.hasToast).toBe(true);
    expect(r.nativeAlerts).toBe(0);
  });

  it("maintenance : 0 alert natif (validations recurForm)", () => {
    const r = checkNoNativeAlerts("app/maintenance/page.js");
    expect(r.hasToast).toBe(true);
    expect(r.nativeAlerts).toBe(0);
  });
});

describe("0.58.9 - Récap déploiement complet", () => {
  it("SkeletonRow déployé dans au moins 6 pages au total", () => {
    const files = [
      "app/interventions/page.js",
      "app/patients/page.js",
      "app/signalements/page.js",
      "app/achats/page.js",
      "app/maintenance/page.js",
      "app/commandes/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<SkeletonRow\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("Avatar déployé dans au moins 5 endroits (UserMenu + Profil + users + kanban + liste DI)", () => {
    const files = [
      "app/UserMenu.js",
      "app/profil/page.js",
      "app/utilisateurs/page.js",
      "app/interventions/kanban/page.js",
      "app/interventions/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<Avatar\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it("Toast utilisé dans au moins 9 pages au total", () => {
    const files = [
      "app/interventions/kanban/page.js",
      "app/interventions/page.js",
      "app/patients/page.js",
      "app/parametres-rgpd/page.js",
      "app/utilisateurs/page.js",
      "app/carte/page.js",
      "app/consentements/page.js",
      "app/statistiques-activite/page.js",
      "app/maintenance/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      const codeOnly = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\/\/.*$/gm, "");
      if (/toast\.(error|success|info)\(/.test(codeOnly)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(9);
  });
});
