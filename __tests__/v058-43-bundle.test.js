// =============================================================
//  Tests unitaires — 0.58.43
//  Exports CSV factorisés + Ctrl+Shift+X Notes + Widget Mes objectifs
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.43 - Version", () => {
  it("Version 0.58.43+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(43);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.43 - Exports CSV factorisés + usePageAction(export-csv)", () => {
  it("/interventions : fonction exportInterventionsCsv + usePageAction(export-csv)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/async function exportInterventionsCsv/);
    expect(src).toMatch(/usePageAction\(["']export-csv["']/);
  });

  it("/interventions export respecte les filtres (fStatut, fType, ctx)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/exportInterventionsCsv[\s\S]*?fStatut[\s\S]*?fType[\s\S]*?ctx\.active/);
  });

  it("/materiels : fonction exportMaterielsCsv extraite + usePageAction", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");
    expect(src).toMatch(/async function exportMaterielsCsv/);
    expect(src).toMatch(/import\s*\{\s*usePageAction\s*\}/);
    expect(src).toMatch(/usePageAction\(["']export-csv["']/);
    expect(src).toMatch(/usePageAction\(["']toggle-ctx-filter["']/);
  });

  it("/materiels export respecte le filtre contexte si actif", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");
    expect(src).toMatch(/exportMaterielsCsv[\s\S]*?ctx\.active && ctxPatientIds/);
  });

  it("/maintenance : fonction exportMaintenancesCsv + bouton CSV + usePageAction", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/maintenance/page.js"), "utf-8");
    expect(src).toMatch(/async function exportMaintenancesCsv/);
    expect(src).toMatch(/import\s*\{\s*usePageAction\s*\}/);
    expect(src).toMatch(/usePageAction\(["']export-csv["']/);
    // Bouton CSV ajouté à côté de l'Export PDF
    expect(src).toMatch(/icon="ti-file-spreadsheet"[\s\S]*?Export CSV/);
  });
});

describe("0.58.43 - Notes : raccourci Ctrl+Shift+X", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("onKeyDown sur textarea capture Ctrl+Shift+X et Cmd+Shift+X (Mac)", () => {
    expect(src).toMatch(/onKeyDown=/);
    expect(src).toMatch(/\(e\.ctrlKey \|\| e\.metaKey\) && e\.shiftKey/);
    expect(src).toMatch(/e\.key === ["']x["'] \|\| e\.key === ["']X["']/);
  });

  it("Trouve la ligne du curseur via selectionStart", () => {
    expect(src).toMatch(/selectionStart/);
  });

  it("Toggle [ ] <-> [x] OU convertit ligne en checkbox", () => {
    expect(src).toMatch(/wasChecked\s*\?\s*["']\s*["']\s*:\s*["']x["']/);
    // Conversion ligne sans checkbox en checkbox
    expect(src).toMatch(/- \[ \] \$\{line\.trim\(\)\}/);
  });

  it("Hint mentionne Ctrl+Shift+X", () => {
    expect(src).toMatch(/Ctrl\+Shift\+X/);
  });
});

describe("0.58.43 - Widget Mes objectifs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Composant ObjectifsWidget exporté", () => {
    expect(src).toMatch(/export function ObjectifsWidget/);
  });

  it("Storage key av-personal-goals", () => {
    expect(src).toMatch(/GOALS_STORAGE_KEY\s*=\s*["']av-personal-goals["']/);
  });

  it("Max 6 objectifs (GOALS_MAX)", () => {
    expect(src).toMatch(/GOALS_MAX\s*=\s*6/);
  });

  it("Palette 6 couleurs (GOAL_COLORS)", () => {
    expect(src).toMatch(/GOAL_COLORS\s*=\s*\[/);
    expect(src).toMatch(/id:\s*["']navy["']/);
    expect(src).toMatch(/id:\s*["']teal["']/);
    expect(src).toMatch(/id:\s*["']terra["']/);
    expect(src).toMatch(/id:\s*["']amber["']/);
  });

  it("Fonctions addGoal / setCurrent / deleteGoal / quickIncrement", () => {
    expect(src).toMatch(/async function addGoal/);
    expect(src).toMatch(/async function setCurrent/);
    expect(src).toMatch(/async function deleteGoal/);
    expect(src).toMatch(/function quickIncrement/);
  });

  it("Progress bar avec milestones (25%, 50%, 75%)", () => {
    expect(src).toMatch(/\[25,\s*50,\s*75\]/);
  });

  it("Boutons rapides +1 / +5 / -1", () => {
    expect(src).toMatch(/quickIncrement\(g\.id,\s*1\)/);
    expect(src).toMatch(/quickIncrement\(g\.id,\s*5\)/);
    expect(src).toMatch(/quickIncrement\(g\.id,\s*-1\)/);
  });

  it("Style spécial quand isComplete (vert + glow + check icon)", () => {
    expect(src).toMatch(/isComplete[\s\S]*?ti-check/);
    expect(src).toMatch(/isComplete[\s\S]*?#5aa05a/);
  });
});

describe("0.58.43 - lib/dashboardLayout : widget objectifs ajouté", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/dashboardLayout.js"), "utf-8");

  it("ALL_WIDGETS contient objectifs", () => {
    expect(src).toMatch(/id:\s*["']objectifs["']/);
    expect(src).toMatch(/icon:\s*["']ti-target["']/);
  });

  it("objectifs opt-in (DEFAULT_ACTIVE false)", () => {
    expect(src).toMatch(/objectifs:\s*false/);
  });

  it("DEFAULT_ORDER inclut objectifs en dernier", () => {
    expect(src).toMatch(/DEFAULT_ORDER\s*=\s*\[[^\]]*"objectifs"[^\]]*\]/);
  });
});

describe("0.58.43 - /accueil : intégration ObjectifsWidget", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Import ObjectifsWidget", () => {
    expect(src).toMatch(/ObjectifsWidget/);
  });

  it("Render conditionnel sur k === 'objectifs'", () => {
    expect(src).toMatch(/k === ["']objectifs["']/);
  });
});
