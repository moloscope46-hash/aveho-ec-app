// =============================================================
//  Tests unitaires — 0.56.0
//  Milestone : page récap + tuile NEW + bump majeur
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.0 - Bump version majeure", () => {
  it("package.json est sur la lignée 0.56.x ou supérieur", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    // 0.57.0 a maintenu la trajectoire (saut Next 15)
    expect(pkg.version).toMatch(/^0\.(5[6-9]|[6-9]\d)\.\d+-alpha$/);
  });
});

describe("0.56.0 - Page /v056 récap milestone", () => {
  const p = "app/v056/page.js";

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Affiche la version 0.56", () => {
    expect(src).toContain("0.56");
  });

  it("8 piliers définis (PILIERS array)", () => {
    expect(src).toContain("const PILIERS");
    // Doit y avoir au moins 8 entrées titre:
    const matches = src.match(/titre:/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(8);
  });

  it("KPI live (caisses, mutuelles, patients, etablissements)", () => {
    expect(src).toContain("caisses_assurance_maladie");
    expect(src).toContain("mutuelles");
    expect(src).toContain("patients");
    expect(src).toContain("etablissements");
  });

  it("Parcours de découverte (4 raccourcis vers app)", () => {
    expect(src).toContain("PARCOURS");
    expect(src).toContain("/scan/bulletin-situation");
    expect(src).toContain("/patients");
    expect(src).toContain("/carte");
    expect(src).toContain("/changelog");
  });

  it("Section roadmap 0.56.X", () => {
    expect(src).toContain("0.56.X");
    expect(src).toContain("Storage Supabase");
  });

  it("Mention 1642 tests + 66 SW bumps", () => {
    expect(src).toContain("1642");
    expect(src).toContain("66");
  });
});

describe("0.56.0 - Tuile NEW sur l'accueil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Entrée 'Aveho EC 0.56' dans raccourcis", () => {
    expect(src).toContain('"Aveho EC 0.56"');
    expect(src).toContain("to: \"/v056\"");
  });

  it("Flag isNew: true", () => {
    expect(src).toContain("isNew: true");
  });

  it("Badge NEW affiché conditionnellement", () => {
    expect(src).toContain("r.isNew");
    expect(src).toContain(">NEW<");
  });
});

describe("0.56.0 - Changelog entry milestone", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");

  it("Entrée 0.56.0 en kind: 'milestone'", () => {
    expect(src).toContain('"v": "0.56.0"');
    expect(src).toContain('"kind": "milestone"');
  });

  it("Mentionne le cycle 0.55 terminé (56 versions)", () => {
    expect(src).toContain("Cycle 0.55");
    expect(src).toContain("56 versions");
  });

  it("Roadmap 0.56.X annoncée", () => {
    expect(src).toContain("0.56.X");
  });
});
