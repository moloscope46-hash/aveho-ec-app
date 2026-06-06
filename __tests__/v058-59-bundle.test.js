// =============================================================
//  Tests unitaires — 0.58.59
//  Stats équipe + Notif goal atteint + Carte pharmacies garde + Drag&drop onglets
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.59 - Version", () => {
  it("Version 0.58.59+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(59);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.59 - Drag&drop onglets dans Tabs (pills)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Tabs.js"), "utf-8");

  it("Props reorderable + storageKey", () => {
    expect(src).toMatch(/reorderable\s*=\s*false/);
    expect(src).toMatch(/storageKey\s*=\s*null/);
  });

  it("State tabOrder + draggedTabId + reorderEditMode", () => {
    expect(src).toMatch(/const \[tabOrder, setTabOrder\]/);
    expect(src).toMatch(/const \[draggedTabId, setDraggedTabId\]/);
    expect(src).toMatch(/const \[reorderEditMode, setReorderEditMode\]/);
  });

  it("4 handlers (start/over/drop/end)", () => {
    expect(src).toMatch(/function handleTabDragStart/);
    expect(src).toMatch(/function handleTabDragOver/);
    expect(src).toMatch(/function handleTabDrop/);
    expect(src).toMatch(/function handleTabDragEnd/);
  });

  it("Réconciliation localStorage avec validStored + missing", () => {
    expect(src).toMatch(/validStored\s*=\s*stored\.filter/);
    expect(src).toMatch(/missing\s*=\s*currentIds\.filter/);
  });

  it("Bouton 'Réorganiser' + 'Réinit.' visible", () => {
    expect(src).toMatch(/ti-arrows-shuffle/);
    expect(src).toMatch(/ti-restore/);
    expect(src).toMatch(/isTabOrderModified/);
  });

  it("draggable conditionnel + indicateurs visuels", () => {
    expect(src).toMatch(/draggable=\{reorderable && reorderEditMode\}/);
    expect(src).toMatch(/opacity:\s*isDragged \? 0\.4/);
  });
});

describe("0.58.59 - Activation drag&drop /profil et /parametres", () => {
  it("/profil active reorderable + storageKey", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");
    expect(src).toMatch(/reorderable[\s\S]{0,80}storageKey="av-profil-tabs-order"/);
  });

  it("/parametres active reorderable + storageKey", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");
    expect(src).toMatch(/reorderable[\s\S]{0,80}storageKey="av-parametres-tabs-order"/);
  });
});

describe("0.58.59 - Stats agrégées TeamGoalsWidget", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Calcul avgPct + nbAtteints + tauxAtteinte global", () => {
    expect(src).toMatch(/const avgPct\s*=\s*pcts\.reduce/);
    expect(src).toMatch(/nbAtteints\s*=\s*teamGoals\.filter\(g => g\.current >= g\.target\)\.length/);
    expect(src).toMatch(/tauxAtteinte\s*=\s*\(nbAtteints/);
  });

  it("Stats par équipe (teamStats avec byTeam)", () => {
    expect(src).toMatch(/byTeam\[tid\]/);
    expect(src).toMatch(/teamStats\s*=\s*Object\.values\(byTeam\)/);
  });

  it("Bandeau Moyenne / Atteints / Taux", () => {
    expect(src).toMatch(/Moyenne/);
    expect(src).toMatch(/Atteints/);
    expect(src).toMatch(/Taux/);
  });
});

describe("0.58.59 - Notification objectif équipe atteint", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Détection des newlyAchieved depuis snapshot localStorage", () => {
    expect(src).toMatch(/av-team-goals-achieved-seen/);
    expect(src).toMatch(/newlyAchieved\s*=\s*enriched\.filter/);
  });

  it("Dispatch event av-team-goal-achieved", () => {
    expect(src).toMatch(/dispatchEvent\(new CustomEvent\(["']av-team-goal-achieved["']/);
  });

  it("Listener affiche un toast festif", () => {
    expect(src).toMatch(/addEventListener\(["']av-team-goal-achieved["']/);
    expect(src).toMatch(/Objectif atteint/);
  });
});

describe("0.58.59 - Carte pharmacies de garde", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");

  it("Layer pharmaciesLayerRef + state showPharmacies + pharmaciesFilter", () => {
    expect(src).toMatch(/pharmaciesLayerRef\s*=\s*useRef/);
    expect(src).toMatch(/const \[showPharmacies, setShowPharmacies\]/);
    expect(src).toMatch(/const \[pharmaciesFilter, setPharmaciesFilter\]/);
  });

  it("Charge pharmacies depuis Supabase avec lat/lng non-null", () => {
    expect(src).toMatch(/from\(["']pharmacies["']\)/);
    expect(src).toMatch(/\.not\(["']latitude["'], ["']is["'], null\)/);
  });

  it("isPharmaOpenNow helper réutilisable", () => {
    expect(src).toMatch(/function isPharmaOpenNow/);
  });

  it("Filtres : 'garde' | 'open-now' | 'all'", () => {
    expect(src).toMatch(/k:\s*["']garde["']/);
    expect(src).toMatch(/k:\s*["']open-now["']/);
  });

  it("Marker custom divIcon avec couleur selon garde/open/closed", () => {
    expect(src).toMatch(/L\.divIcon/);
    expect(src).toMatch(/av-pharma-pulse/);
  });

  it("Popup avec specialites + garde_notes", () => {
    expect(src).toMatch(/garde_notes/);
    expect(src).toMatch(/specialites/);
  });

  it("Toggle UI avec switch + filtres pastilles", () => {
    expect(src).toMatch(/showPharmacies/);
    expect(src).toMatch(/setShowPharmacies/);
  });
});
