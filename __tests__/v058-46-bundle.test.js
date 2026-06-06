// =============================================================
//  Tests unitaires — 0.58.46
//  Drag&drop colonnes Crud + Mode présentation Objectifs + Swipe météo
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.46 - Version", () => {
  it("Version 0.58.46+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(46);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.46 - Crud : drag&drop colonnes", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/crud.js"), "utf-8");

  it("State colOrder + draggedColKey + dragOverColKey", () => {
    expect(src).toMatch(/colOrder,\s*setColOrder/);
    expect(src).toMatch(/draggedColKey,\s*setDraggedColKey/);
    expect(src).toMatch(/dragOverColKey,\s*setDragOverColKey/);
  });

  it("Storage key par table : av-crud-cols-{table}", () => {
    expect(src).toMatch(/colsStorageKey\s*=\s*`av-crud-cols-\$\{table\}`/);
  });

  it("Réconciliation : garde l'ordre stocké + ajoute nouvelles cols à la fin", () => {
    expect(src).toMatch(/validStored\s*=\s*stored\.filter\(k => currentKeys\.includes\(k\)\)/);
    expect(src).toMatch(/missing\s*=\s*currentKeys\.filter\(k => !validStored\.includes\(k\)\)/);
  });

  it("orderedColumns calculé depuis colOrder", () => {
    expect(src).toMatch(/orderedColumns\s*=\s*colOrder/);
    expect(src).toMatch(/colOrder\.map\(k => columns\.find\(c => c\.key === k\)\)/);
  });

  it("Handlers : dragStart / dragOver / drop / dragEnd", () => {
    expect(src).toMatch(/function handleColDragStart/);
    expect(src).toMatch(/function handleColDragOver/);
    expect(src).toMatch(/function handleColDrop/);
    expect(src).toMatch(/function handleColDragEnd/);
  });

  it("th avec draggable + onDragStart/onDragOver/onDrop", () => {
    expect(src).toMatch(/draggable[\s\S]*?onDragStart/);
  });

  it("Indicateurs visuels : opacity drag + background dragOver + borderLeft teal", () => {
    expect(src).toMatch(/draggedColKey === c\.key \? 0\.3 : 1/);
    expect(src).toMatch(/dragOverColKey === c\.key \?[\s\S]*?#7CC8C8/);
  });

  it("Bouton 'Réinitialiser colonnes' affiché si ordre modifié", () => {
    expect(src).toMatch(/isColOrderModified/);
    expect(src).toMatch(/Réinitialiser colonnes/);
  });

  it("resetColOrder remove le localStorage et reset le state", () => {
    expect(src).toMatch(/function resetColOrder/);
    expect(src).toMatch(/localStorage\.removeItem\(colsStorageKey\)/);
  });

  it("Poignée visuelle ⋮⋮ devant le label", () => {
    expect(src).toMatch(/⋮⋮/);
  });
});

describe("0.58.46 - Widget Objectifs : mode présentation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State presentMode", () => {
    expect(src).toMatch(/presentMode,\s*setPresentMode/);
  });

  it("Bouton 'Présentation' visible si au moins 1 objectif", () => {
    expect(src).toMatch(/goals\.length > 0[\s\S]*?Présentation/);
  });

  it("ESC ferme le mode présentation", () => {
    expect(src).toMatch(/e\.key === ["']Escape["'][\s\S]*?setPresentMode\(false\)/);
  });

  it("Overlay full-screen avec position fixed + zIndex élevé", () => {
    expect(src).toMatch(/position:\s*["']fixed["'],\s*inset:\s*0,\s*zIndex:\s*99998/);
  });

  it("Calcul totalPct (moyenne des %) + completedCount", () => {
    expect(src).toMatch(/totalPct\s*=/);
    expect(src).toMatch(/completedCount\s*=\s*goals\.filter\(g => g\.current >= g\.target\)/);
  });

  it("Grille de cartes objectifs avec progress bar XL (22px)", () => {
    expect(src).toMatch(/height:\s*22,\s*background:\s*["']rgba\(255,255,255,\.08\)/);
  });

  it("Bouton fermer + cliquer hors carte ferme", () => {
    expect(src).toMatch(/e\.target === e\.currentTarget[\s\S]*?setPresentMode\(false\)/);
    expect(src).toMatch(/Fermer \(ESC\)/);
  });

  it("Animation av-present-fade-in", () => {
    expect(src).toMatch(/@keyframes av-present-fade-in/);
  });
});

describe("0.58.46 - Météo : swipe touch + clic expand prévisions", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State focusForecastIdx + ref touchStartX", () => {
    expect(src).toMatch(/focusForecastIdx,\s*setFocusForecastIdx/);
    expect(src).toMatch(/touchStartX = useRef/);
  });

  it("Import useRef", () => {
    expect(src).toMatch(/import\s*\{[^}]*useRef[^}]*\}\s*from\s*["']react["']/);
  });

  it("onTouchStart/onTouchEnd pour swipe (seuil 40px)", () => {
    expect(src).toMatch(/onTouchStart/);
    expect(src).toMatch(/onTouchEnd/);
    expect(src).toMatch(/Math\.abs\(dx\) < 40/);
  });

  it("Clic sur jour → focus (visuel scaled + bordure bleue)", () => {
    expect(src).toMatch(/setFocusForecastIdx\(isFocus \? null : i\)/);
    expect(src).toMatch(/transform:\s*isFocus \?\s*["']scale\(1\.04\)/);
  });

  it("Panneau détails affiché si focusForecastIdx !== null", () => {
    expect(src).toMatch(/focusForecastIdx !== null/);
    expect(src).toMatch(/Vent max/);
    expect(src).toMatch(/UV max/);
  });

  it("Animation av-fc-expand", () => {
    expect(src).toMatch(/@keyframes av-fc-expand/);
  });

  it("Bouton 'Désélectionner' visible quand focus actif", () => {
    expect(src).toMatch(/Désélectionner/);
  });
});
