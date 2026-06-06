// =============================================================
//  Tests unitaires — 0.58.40
//  Crud extraFilter + /materiels filtre + auto-refresh météo + drag&drop favoris + Notes widget
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.40 - Version", () => {
  it("Version 0.58.40+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(40);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.40 - Crud : prop extraFilter", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/crud.js"), "utf-8");

  it("extraFilter dans la signature de Crud", () => {
    expect(src).toMatch(/extraFilter\s*=\s*null/);
  });

  it("Applique extraFilter avant les filterFields", () => {
    expect(src).toMatch(/baseRows\s*=\s*extraFilter\s*\?\s*rows\.filter\(extraFilter\)/);
  });

  it("filterFields filtre baseRows (pas rows direct) pour cumuler avec extraFilter", () => {
    expect(src).toMatch(/filterFields\s*\?\s*baseRows\.filter/);
  });
});

describe("0.58.40 - /materiels : filtre par contexte bât/svc", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");

  it("Import useCurrentContext", () => {
    expect(src).toMatch(/import\s*\{\s*useCurrentContext\s*\}\s*from\s*["'][^"']*useCurrentContext["']/);
  });

  it("ctxPatientIds chargé via chambres → patients", () => {
    expect(src).toMatch(/ctxPatientIds,\s*setCtxPatientIds/);
    expect(src).toMatch(/from\(["']chambres["']\)/);
    expect(src).toMatch(/from\(["']patients["']\)[\s\S]*?\.in\(["']chambre_id["']/);
  });

  it("Crud reçoit extraFilter avec ctxPatientIds.has(r.patient_id)", () => {
    expect(src).toMatch(/extraFilter=\{ctx\.active && ctxPatientIds[\s\S]*?ctxPatientIds\.has\(r\.patient_id\)/);
  });

  it("Bouton toggle 'Filtrer par contexte' affiché si contexte défini", () => {
    expect(src).toMatch(/ctx\.batimentId \|\| ctx\.serviceId/);
    expect(src).toMatch(/Contexte ON|Filtrer par contexte/);
  });
});

describe("0.58.40 - WeatherWidget : auto-refresh 30min + bouton manuel", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State refreshTick + setInterval 30min", () => {
    expect(src).toMatch(/refreshTick,\s*setRefreshTick/);
    expect(src).toMatch(/setInterval\([\s\S]*?30 \* 60 \* 1000/);
  });

  it("useEffect deps [refreshTick] pour relance du fetch", () => {
    expect(src).toMatch(/\}\s*,\s*\[refreshTick\]/);
  });

  it("Bouton refresh manuel (ti-refresh) avec rotate au hover", () => {
    expect(src).toMatch(/ti-refresh/);
    expect(src).toMatch(/rotate\(45deg\)/);
  });

  it("clearInterval dans cleanup", () => {
    expect(src).toMatch(/clearInterval\(interval\)/);
  });
});

describe("0.58.40 - LiensFavorisWidget : drag & drop pour réordonner", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State dragIdx + dragOverIdx", () => {
    expect(src).toMatch(/dragIdx,\s*setDragIdx/);
    expect(src).toMatch(/dragOverIdx,\s*setDragOverIdx/);
  });

  it("Handlers natifs HTML5 : dragStart/Over/Leave/Drop/End", () => {
    expect(src).toMatch(/function handleDragStart/);
    expect(src).toMatch(/function handleDragOver/);
    expect(src).toMatch(/function handleDrop/);
    expect(src).toMatch(/function handleDragEnd/);
  });

  it("draggable + onDragStart/Over/Drop sur chaque fav", () => {
    expect(src).toMatch(/draggable[\s\S]*?onDragStart=\{[\s\S]*?handleDragStart/);
    expect(src).toMatch(/onDrop=\{[\s\S]*?handleDrop/);
  });

  it("Reorder via splice (remove + insert at target)", () => {
    expect(src).toMatch(/next\.splice\(dragIdx,\s*1\)/);
    expect(src).toMatch(/next\.splice\(targetIdx,\s*0,\s*removed\)/);
  });

  it("Hint visuel 'Glisse pour réordonner' si 2+ favoris", () => {
    expect(src).toMatch(/Glisse pour réordonner/);
    expect(src).toMatch(/favs\.length >= 2/);
  });
});

describe("0.58.40 - NotesWidget : bloc-notes markdown léger", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Composant NotesWidget exporté", () => {
    expect(src).toMatch(/export function NotesWidget/);
  });

  it("Storage key 'av-personal-notes' (purgeable au logout)", () => {
    expect(src).toMatch(/NOTES_STORAGE_KEY\s*=\s*["']av-personal-notes["']/);
  });

  it("Max length défini (≥ 4000 caractères)", () => {
    // 0.58.51 : NOTES_MAX_LEN a été augmenté à 50000 en 0.58.45 pour supporter images base64
    expect(src).toMatch(/NOTES_MAX_LEN\s*=\s*\d{4,}/);
  });

  it("Mini-renderer markdown (renderMd + inlineMd)", () => {
    expect(src).toMatch(/function renderMd/);
    expect(src).toMatch(/function inlineMd/);
  });

  it("Échappe HTML pour éviter XSS", () => {
    expect(src).toMatch(/\.replace\(\/&\/g,\s*["']&amp;["']\)\.replace\(\/<\/g,\s*["']&lt;["']\)/);
  });

  it("Support **gras**, *italique*, [link](url), ## titre, - bullet", () => {
    expect(src).toMatch(/startsWith\(["']## ["']\)/);
    expect(src).toMatch(/text\[i\] === ["']\*["']/);
    expect(src).toMatch(/text\[i\] === ["']\[["']/);
  });

  it("Sécurité liens : seules les URLs http(s) ou /", () => {
    expect(src).toMatch(/\/\^\(https\?:\\\/\\\/\|\\\/\)\//);
  });

  it("Auto-save debounce 800ms", () => {
    expect(src).toMatch(/setTimeout[\s\S]*?800/);
  });

  it("2 modes : preview + edit (state editing)", () => {
    expect(src).toMatch(/editing,\s*setEditing/);
  });

  it("Affiche statut de sauvegarde (saving / saved)", () => {
    expect(src).toMatch(/saveStatus,\s*setSaveStatus/);
    expect(src).toMatch(/Enregistré/);
  });
});

describe("0.58.40 - lib/dashboardLayout : widget notes ajouté", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/dashboardLayout.js"), "utf-8");

  it("ALL_WIDGETS contient notes", () => {
    expect(src).toMatch(/id:\s*["']notes["']/);
    expect(src).toMatch(/icon:\s*["']ti-notes["']/);
  });

  it("notes opt-in (DEFAULT_ACTIVE false)", () => {
    expect(src).toMatch(/notes:\s*false/);
  });

  it("DEFAULT_ORDER inclut notes", () => {
    // 0.58.51 : objectifs ajouté à la fin en 0.58.43, donc notes n'est plus le dernier
    expect(src).toMatch(/DEFAULT_ORDER\s*=\s*\[[^\]]*["']notes["'][^\]]*\]/);
  });
});

describe("0.58.40 - /accueil : intégration NotesWidget", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Import NotesWidget", () => {
    expect(src).toMatch(/NotesWidget/);
  });

  it("Render conditionnel sur k === 'notes'", () => {
    expect(src).toMatch(/k === ["']notes["']/);
  });
});
