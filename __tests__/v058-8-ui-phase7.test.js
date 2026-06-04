// =============================================================
//  Tests unitaires — 0.58.8 UI PHASE 7
//
//  Migration toast (parametres-rgpd 10 + utilisateurs 6 + carte 4)
//  + Avatar sur cards Kanban (assignee_email)
//  + SkeletonRow sur listes (interventions + patients)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.8 - Version", () => {
  it("Version 0.58.8+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(8);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.8 - Migration toast progressive (parametres-rgpd + utilisateurs + carte)", () => {
  function checkToastMigration(file, opts = {}) {
    const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    // Strip commentaires pour ignorer les "// 0.58.X : alert remplace toast"
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\/.*$/gm, "");
    return {
      hasToastImport: /import\s+\{[^}]*toast[^}]*\}\s+from\s+["'][^"']*ui-premium["']/.test(src),
      hasToastError: /toast\.error\(/.test(codeOnly),
      hasToastSuccess: /toast\.success\(/.test(codeOnly),
      nativeAlerts: (codeOnly.match(/(?<!dialogs\.)\balert\(/g) || []).length,
    };
  }

  it("parametres-rgpd : 0 alert() natif restant + toast.error/success", () => {
    const r = checkToastMigration("app/parametres-rgpd/page.js");
    expect(r.hasToastImport).toBe(true);
    expect(r.hasToastError).toBe(true);
    expect(r.hasToastSuccess).toBe(true);
    expect(r.nativeAlerts).toBe(0);
  });

  it("utilisateurs : alert() natifs migrés (dialogs.alert préservés)", () => {
    const r = checkToastMigration("app/utilisateurs/page.js");
    expect(r.hasToastImport).toBe(true);
    expect(r.hasToastError).toBe(true);
    expect(r.hasToastSuccess).toBe(true);
    expect(r.nativeAlerts).toBe(0);
  });

  it("carte : alert() de géolocalisation migrés", () => {
    const r = checkToastMigration("app/carte/page.js");
    expect(r.hasToastImport).toBe(true);
    expect(r.hasToastError).toBe(true);
    expect(r.nativeAlerts).toBe(0);
  });

  it("Feedback positif sur invitation renvoyée", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");
    expect(src).toMatch(/toast\.success\(["']Invitation renvoyée\./);
  });

  it("Feedback positif sur lien copié", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");
    expect(src).toMatch(/toast\.success\(["']Lien copié/);
  });
});

describe("0.58.8 - Avatar sur cards Kanban (assignee)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/kanban/page.js"), "utf-8");

  it("Avatar importé depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*Avatar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("Avatar affiché si assignee_email présent (size 22)", () => {
    expect(src).toMatch(/r\.assignee_email\s*&&\s*\(/);
    expect(src).toMatch(/<Avatar\s+name=\{r\.assignee_email\}\s+size=\{22\}/);
  });

  it("Footer carte avec border-top dashed (séparation visuelle)", () => {
    expect(src).toMatch(/borderTop:\s*["']1px dashed/);
  });
});

describe("0.58.8 - SkeletonRow sur listes en chargement", () => {
  it("interventions/page.js utilise SkeletonRow", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*SkeletonRow[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<SkeletonRow\s+key=\{i\}\s+cols=\{5\}/);
  });

  it("patients/page.js utilise SkeletonRow", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*SkeletonRow[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<SkeletonRow\s+key=\{i\}\s+cols=\{6\}/);
  });

  it("Bloc skeleton dans un Panel-like (background blanc + border)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/SkeletonRow[\s\S]*?background:\s*["']#fff["']/);
  });
});

describe("0.58.8 - Récap déploiement toast/skeleton/avatar", () => {
  it("Toast utilisé dans au moins 6 pages", () => {
    const files = [
      "app/interventions/kanban/page.js",
      "app/interventions/page.js",
      "app/patients/page.js",
      "app/parametres-rgpd/page.js",
      "app/utilisateurs/page.js",
      "app/carte/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      // Strip commentaires
      const codeOnly = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\/\/.*$/gm, "");
      if (/toast\.(error|success|info)\(/.test(codeOnly)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("Avatar utilisé dans au moins 4 endroits (TopBar/UserMenu+Profil+users+kanban)", () => {
    const files = [
      "app/UserMenu.js",
      "app/profil/page.js",
      "app/utilisateurs/page.js",
      "app/interventions/kanban/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<Avatar\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
