// =============================================================
//  Tests unitaires — 0.58.42
//  Notes multi-tabs + checkboxes + Cmd+K page-actions + filtre /maintenance
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.42 - Version", () => {
  it("Version 0.58.42+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(42);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.42 - NotesWidget : multi-onglets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Storage key v2 'av-personal-notes-v2'", () => {
    expect(src).toMatch(/NOTES_STORAGE_KEY\s*=\s*["']av-personal-notes-v2["']/);
  });

  it("Migration depuis ancien format string (NOTES_LEGACY_KEY)", () => {
    expect(src).toMatch(/NOTES_LEGACY_KEY\s*=\s*["']av-personal-notes["']/);
    expect(src).toMatch(/localStorage\.getItem\(NOTES_LEGACY_KEY\)/);
  });

  it("Max 4 onglets (NOTES_MAX_TABS)", () => {
    expect(src).toMatch(/NOTES_MAX_TABS\s*=\s*4/);
  });

  it("Format storage : { tabs: [{ id, label, text }], activeId }", () => {
    expect(src).toMatch(/getNotesData/);
    expect(src).toMatch(/tabs:\s*\[/);
    expect(src).toMatch(/activeId/);
  });

  it("Fonctions addTab / renameTab / deleteTab", () => {
    expect(src).toMatch(/async function addTab/);
    expect(src).toMatch(/async function renameTab/);
    expect(src).toMatch(/async function deleteTab/);
  });

  it("Confirm avant suppression d'une note", () => {
    expect(src).toMatch(/dialogs\.confirm/);
    expect(src).toMatch(/Supprimer la note/);
  });

  it("Au moins une note doit rester (anti-suppression de la dernière)", () => {
    expect(src).toMatch(/Au moins une note doit rester/);
  });
});

describe("0.58.42 - NotesWidget : checkboxes [ ] / [x]", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Regex détecte les lignes checkbox", () => {
    expect(src).toMatch(/\/\^-\\s\*\\\[\[\\sxX\]\\\]\\s\//);
  });

  it("Fonction toggleCheckbox(targetIdx) qui toggle [ ] <-> [x]", () => {
    expect(src).toMatch(/function toggleCheckbox/);
  });

  it("renderMd accepte un callback onToggleCheckbox", () => {
    expect(src).toMatch(/function renderMd\(text,\s*onToggleCheckbox\)/);
  });

  it("Style checked : strikethrough + couleur gris", () => {
    expect(src).toMatch(/textDecoration:\s*checked\s*\?\s*["']line-through["']/);
  });

  it("Style dot vert quand checked", () => {
    expect(src).toMatch(/checked\s*\?\s*["']#5aa05a["']/);
  });

  it("Placeholder textarea mentionne les checkboxes", () => {
    expect(src).toMatch(/- \[ \] todo/);
    expect(src).toMatch(/- \[x\] fait/);
  });
});

describe("0.58.42 - /maintenance : filtre par contexte bât/svc", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/maintenance/page.js"), "utf-8");

  it("Import useCurrentContext", () => {
    expect(src).toMatch(/import\s*\{\s*useCurrentContext\s*\}\s*from\s*["'][^"']*useCurrentContext["']/);
  });

  it("ctxMaterielIds chargé via chambres → patients → matériels (3 niveaux de jointure)", () => {
    expect(src).toMatch(/ctxMaterielIds,\s*setCtxMaterielIds/);
    expect(src).toMatch(/from\(["']chambres["']\)/);
    expect(src).toMatch(/from\(["']patients["']\)[\s\S]*?\.in\(["']chambre_id["']/);
    expect(src).toMatch(/from\(["']materiels["']\)[\s\S]*?\.in\(["']patient_id["']/);
  });

  it("Filtrage : maintenance avec materiel_id dans ctxMaterielIds", () => {
    expect(src).toMatch(/ctx\.active && ctxMaterielIds/);
    expect(src).toMatch(/ctxMaterielIds\.has\(row\.materiel_id\)/);
  });

  it("Bouton toggle 'Filtrer par contexte' affiché si contexte défini", () => {
    expect(src).toMatch(/ctx\.batimentId \|\| ctx\.serviceId/);
    expect(src).toMatch(/Filtrer par contexte/);
  });
});

describe("0.58.42 - lib/usePageAction : hook réutilisable", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/usePageAction.js"), "utf-8");

  it("Hook usePageAction exporté", () => {
    expect(src).toMatch(/export function usePageAction/);
  });

  it("Écoute event 'av-page-action'", () => {
    expect(src).toMatch(/av-page-action/);
  });

  it("Match sur e.detail.action === actionName", () => {
    expect(src).toMatch(/e\?\.detail\?\.action === actionName/);
  });

  it("Cleanup avec removeEventListener", () => {
    expect(src).toMatch(/removeEventListener\(["']av-page-action["']/);
  });
});

describe("0.58.42 - GlobalSearch : page-actions enrichies", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("Nouvelles actions de création (matériel, maintenance, dépôt)", () => {
    expect(src).toMatch(/new-materiel/);
    expect(src).toMatch(/new-maintenance/);
    expect(src).toMatch(/new-depot/);
  });

  it("Actions navigation contextuelle (patient-list, di-list, vue-globale, direction, changelog)", () => {
    expect(src).toMatch(/goto-patient-list/);
    expect(src).toMatch(/goto-di-list/);
    expect(src).toMatch(/goto-vue-globale/);
    expect(src).toMatch(/goto-direction/);
    expect(src).toMatch(/goto-changelog/);
  });

  it("Page-actions URL prefix '#page-action:'", () => {
    expect(src).toMatch(/#page-action:export-csv/);
    expect(src).toMatch(/#page-action:toggle-ctx-filter/);
    expect(src).toMatch(/#page-action:open-new/);
  });

  it("Handler intercept #page-action: URLs et dispatch event window", () => {
    expect(src).toMatch(/a\.url\.startsWith\(["']#page-action:["']\)/);
    expect(src).toMatch(/dispatchEvent\(new CustomEvent\(["']av-page-action["']/);
  });
});

describe("0.58.42 - usePageAction intégré dans les pages", () => {
  ["interventions", "maintenance", "patients"].forEach((page) => {
    it(`/${page} importe usePageAction`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), `app/${page}/page.js`), "utf-8");
      expect(src).toMatch(/import\s*\{\s*usePageAction\s*\}/);
    });
  });

  it("/patients : usePageAction sur export-csv + open-new + toggle-ctx-filter", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/usePageAction\(["']open-new["']/);
    expect(src).toMatch(/usePageAction\(["']export-csv["']/);
    expect(src).toMatch(/usePageAction\(["']toggle-ctx-filter["']/);
  });

  it("/interventions : usePageAction sur open-new + toggle-ctx-filter", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/usePageAction\(["']open-new["']/);
    expect(src).toMatch(/usePageAction\(["']toggle-ctx-filter["']/);
  });
});
