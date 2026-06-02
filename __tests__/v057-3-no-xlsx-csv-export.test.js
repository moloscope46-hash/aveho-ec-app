// =============================================================
//  Tests unitaires — 0.57.3
//  Suppression xlsx + export CSV natif (0 HIGH/CRIT vulns)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.3 - Version + suppression xlsx", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));

  it("Version 0.57.3+", () => {
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(3);
  });

  it("xlsx absent de dependencies", () => {
    expect(pkg.dependencies?.xlsx).toBeUndefined();
  });

  it("xlsx absent de optionalDependencies", () => {
    expect(pkg.optionalDependencies?.xlsx).toBeUndefined();
  });
});

describe("0.57.3 - lib/exportData.js (CSV natif)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/exportData.js"), "utf-8");

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "lib/exportData.js"))).toBe(true);
  });

  it("Exporte exportRows, exportBilan, exportQuickCSV", () => {
    expect(src).toMatch(/export async function exportRows/);
    expect(src).toMatch(/export async function exportBilan/);
    expect(src).toMatch(/export async function exportQuickCSV/);
  });

  it("csvEscape protège contre l'injection CSV (=, +, -, @ préfixés par ')", () => {
    expect(src).toMatch(/\/\^\[=\+\\-@/); // regex de détection des préfixes dangereux
    expect(src).toContain("\"'\" + s");   // ajout d'apostrophe
  });

  it("csvEscape entoure de guillemets si caractères spéciaux + double les guillemets internes", () => {
    expect(src).toContain('s.replace(/"/g, \'""\')');
  });

  it("rowsToCSV utilise séparateur ; par défaut (compat Excel français)", () => {
    expect(src).toMatch(/sep = ["']\;["']/);
  });

  it("rowsToCSV joint avec \\r\\n (RFC 4180)", () => {
    expect(src).toContain('join("\\r\\n")');
  });

  it("downloadText ajoute le BOM UTF-8 pour Excel français", () => {
    expect(src).toContain("\\uFEFF");
  });

  it("loadXLSX est désactivé (import commenté) — fallback CSV", () => {
    expect(src).toMatch(/_xlsxUnavailable\s*=\s*true/);
    expect(src).toMatch(/\/\/\s*const XLSX = await import\("xlsx"\)/);
  });
});

describe("0.57.3 - lib/exportExcel.js est un ré-exporteur compat", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/exportExcel.js"), "utf-8");

  it("Fichier existe (pour compat 100% avec callers)", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "lib/exportExcel.js"))).toBe(true);
  });

  it("Ré-exporte exportRows + exportBilan depuis ./exportData", () => {
    expect(src).toContain("from \"./exportData\"");
    expect(src).toContain("exportRows");
    expect(src).toContain("exportBilan");
  });

  it("N'a plus de logique propre (uniquement ré-export)", () => {
    expect(src).not.toMatch(/^async function loadXLSX/m);
    expect(src).not.toMatch(/^function arrayToSheet/m);
  });
});

describe("0.57.3 - Pages callers : libellés UI 'Export CSV' (plus 'Export Excel')", () => {
  const callers = [
    "app/patients/page.js",
    "app/statistiques/page.js",
    "app/materiels/page.js",
    "app/etablissements/page.js",
  ];

  callers.forEach((p) => {
    it(`${p} : libellés UI mis à jour`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      // Plus aucun "Export Excel" en chaîne affichée
      expect(src).not.toMatch(/>\s*Export Excel\s*</);
    });
  });
});

describe("0.57.3 - next.config.js : warning workspace root réglé", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("outputFileTracingRoot défini", () => {
    expect(src).toContain("outputFileTracingRoot");
  });

  it("Utilise path.join(__dirname)", () => {
    expect(src).toMatch(/path\.join\(__dirname/);
  });
});

describe("0.57.3 - npm audit : 0 CRITICAL + 0 HIGH", () => {
  it("xlsx (vuln HIGH) absent de la chaîne de dépendances", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.optionalDependencies || {}),
    };
    expect(allDeps.xlsx).toBeUndefined();
  });
});
