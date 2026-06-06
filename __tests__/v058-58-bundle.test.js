// =============================================================
//  Tests unitaires — 0.58.58
//  Drag&drop fields formulaire Crud (modal)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.58 - Version", () => {
  it("Version 0.58.58+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(58);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.58 - Drag&drop fields formulaire Crud", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/crud.js"), "utf-8");

  it("State fieldOrder + draggedFieldKey + dragOverFieldKey + fieldsEditMode", () => {
    expect(src).toMatch(/const \[fieldOrder, setFieldOrder\]/);
    expect(src).toMatch(/const \[draggedFieldKey, setDraggedFieldKey\]/);
    expect(src).toMatch(/const \[dragOverFieldKey, setDragOverFieldKey\]/);
    expect(src).toMatch(/const \[fieldsEditMode, setFieldsEditMode\]/);
  });

  it("Storage key par table : av-crud-fields-${table}", () => {
    expect(src).toMatch(/fieldsStorageKey\s*=\s*`av-crud-fields-\$\{table\}`/);
  });

  it("Réconciliation : ajoute champs nouveaux, retire champs disparus", () => {
    // Pattern : validStored = stored.filter ; missing = currentKeys.filter
    expect(src).toMatch(/validStored\s*=\s*stored\.filter/);
    expect(src).toMatch(/missing\s*=\s*currentKeys\.filter/);
    expect(src).toMatch(/setFieldOrder\(\[\.\.\.validStored,\s*\.\.\.missing\]\)/);
  });

  it("orderedFields applique le fieldOrder", () => {
    expect(src).toMatch(/orderedFields\s*=\s*fieldOrder/);
    expect(src).toMatch(/fieldOrder\.map\(k => \(fields \|\| \[\]\)\.find\(f => f\.key === k\)/);
  });

  it("resetFieldOrder + isFieldOrderModified", () => {
    expect(src).toMatch(/function resetFieldOrder/);
    expect(src).toMatch(/isFieldOrderModified/);
  });

  it("4 handlers drag&drop (start, over, drop, end)", () => {
    expect(src).toMatch(/function handleFieldDragStart/);
    expect(src).toMatch(/function handleFieldDragOver/);
    expect(src).toMatch(/function handleFieldDrop/);
    expect(src).toMatch(/function handleFieldDragEnd/);
  });

  it("handleFieldDrop : splice from/to dans le tableau", () => {
    expect(src).toMatch(/arr\.splice\(fromIdx, 1\)/);
    expect(src).toMatch(/arr\.splice\(toIdx, 0, draggedFieldKey\)/);
  });
});

describe("0.58.58 - UI mode édition champs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/crud.js"), "utf-8");

  it("Bouton 'Réorganiser' / 'Terminer' (toggle fieldsEditMode)", () => {
    expect(src).toMatch(/setFieldsEditMode\(!fieldsEditMode\)/);
    expect(src).toMatch(/Réorganiser/);
    expect(src).toMatch(/Terminer/);
  });

  it("Bouton 'Réinit.' visible si isFieldOrderModified", () => {
    expect(src).toMatch(/isFieldOrderModified && \(/);
    expect(src).toMatch(/Réinit\./);
  });

  it("Bandeau d'instruction en mode édition avec icône ⋮⋮", () => {
    expect(src).toMatch(/fieldsEditMode && \(/);
    expect(src).toMatch(/Glisse les champs avec la poignée/);
    expect(src).toMatch(/⋮⋮/);
  });

  it("Render orderedFields au lieu de fields", () => {
    expect(src).toMatch(/orderedFields\.map\(\(f\) => \(/);
  });

  it("draggable={fieldsEditMode} sur chaque .fld", () => {
    expect(src).toMatch(/draggable=\{fieldsEditMode\}/);
  });

  it("Inputs disabled en mode édition (évite saisie en draggant)", () => {
    expect(src).toMatch(/disabled=\{fieldsEditMode\}[\s\S]*?\/select>/);
    expect(src).toMatch(/<input[\s\S]*?disabled=\{fieldsEditMode\}/);
  });

  it("Bouton Enregistrer désactivé en mode édition + label adapté", () => {
    expect(src).toMatch(/disabled=\{busy \|\| fieldsEditMode\}/);
    expect(src).toMatch(/Termine d'abord le réordonnancement/);
  });

  it("Indicateur visuel drop target : borderTop teal + translateY", () => {
    expect(src).toMatch(/borderTop:\s*dragOverFieldKey === f\.key/);
    expect(src).toMatch(/translateY\(-2px\)/);
  });

  it("Opacity 0.4 sur l'élément en cours de drag", () => {
    expect(src).toMatch(/opacity:\s*draggedFieldKey === f\.key \? 0\.4/);
  });

  it("Reset fieldsEditMode au close du modal + après save", () => {
    expect(src).toMatch(/setModal\(null\); setFieldsEditMode\(false\)/);
    expect(src).toMatch(/setModal\(null\); setFieldsEditMode\(false\); await load/);
  });
});

describe("0.58.58 - Persistance localStorage", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/crud.js"), "utf-8");

  it("getItem + setItem + removeItem sur fieldsStorageKey", () => {
    expect(src).toMatch(/localStorage\.getItem\(fieldsStorageKey\)/);
    expect(src).toMatch(/localStorage\.setItem\(fieldsStorageKey, JSON\.stringify\(fieldOrder\)\)/);
    expect(src).toMatch(/localStorage\.removeItem\(fieldsStorageKey\)/);
  });

  it("Re-sync si fields.length change", () => {
    expect(src).toMatch(/\[fieldsStorageKey, fields\?\.length\]/);
  });
});
