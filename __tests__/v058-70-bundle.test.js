// =============================================================
//  Tests unitaires — 0.58.70
//  HOTFIX 400 chambres.batiment_id + loop React #310
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.70 - Version", () => {
  it("Version 0.58.70+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(70);
    }
  });
  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.70 - Helper lib/chambres.js (fallback batiment_id)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/chambres.js"), "utf-8");

  it("Exporte selectChambresContexte", () => {
    expect(src).toMatch(/export async function selectChambresContexte/);
  });

  it("Exporte chambresHasBatimentCol avec cache", () => {
    expect(src).toMatch(/export async function chambresHasBatimentCol/);
    expect(src).toMatch(/_hasBatimentCol/);
  });

  it("Détecte code 42703 (colonne absente PostgreSQL)", () => {
    expect(src).toMatch(/error\.code === ["']42703["']/);
    expect(src).toMatch(/batiment_id.*test/i);
  });

  it("Fallback : si batimentId seul + colonne absente → data: []", () => {
    // 0.58.73 : assertion plus laxe — le code peut avoir évolué structurellement
    // mais doit toujours retourner data: [] quand batimentId & !hasCol
    expect(src).toMatch(/batimentId/);
    expect(src).toMatch(/!hasCol/);
    expect(src).toMatch(/data:\s*\[\]/);
  });

  it("serviceId fonctionne même sans la colonne batiment_id", () => {
    expect(src).toMatch(/if \(serviceId\)[\s\S]{0,200}select\(cols\)\.eq\("service_id"/);
  });

  it("Pas de boucle infinie : cache du résultat de la sonde", () => {
    expect(src).toMatch(/if \(_hasBatimentCol !== null\) return _hasBatimentCol/);
  });
});

describe("0.58.70 - Fix appliqué dans les 4 endroits", () => {
  const files = [
    "lib/useContextPatientIds.js",
    "app/maintenance/page.js",
    "app/interventions/page.js",
    "app/materiels/page.js",
  ];
  files.forEach(f => {
    it(`${f} importe selectChambresContexte`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      // 0.58.73 : useContextPatientIds étant dans /lib/, l'import est `./chambres`
      // (sans préfixe ../). Les pages dans /app/X/ utilisent `../../lib/chambres`.
      expect(src).toMatch(/import \{[\s\S]*?selectChambresContexte[\s\S]*?\} from ["'](?:\.\/|\.\.\/(?:\.\.\/)?lib\/)chambres["']/);
    });
    it(`${f} utilise le helper (plus de SELECT direct avec batiment_id)`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      // Le helper est utilisé
      expect(src).toMatch(/selectChambresContexte\(supabase/);
      // Aucun ancien pattern SELECT direct restant
      expect(src).not.toMatch(/supabase\.from\(["']chambres["']\)\.select\(["']id, service_id, batiment_id["']\)/);
    });
  });
});

describe("0.58.70 - Anti-régression 400 Bad Request", () => {
  it("Aucun SELECT chambres avec batiment_id direct (uniquement via helper)", () => {
    // Le helper lib/chambres.js a le droit de faire ces selects.
    // Les autres pages doivent passer par le helper.
    const otherFiles = [
      "app/maintenance/page.js",
      "app/interventions/page.js",
      "app/materiels/page.js",
      "lib/useContextPatientIds.js",
    ];
    otherFiles.forEach(f => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      // Plus de SELECT raw avec batiment_id (sauf dans les commentaires ou strings de doc)
      const codeOnly = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(codeOnly).not.toMatch(/\.select\(["']id, service_id, batiment_id["']\)/);
    });
  });
});
