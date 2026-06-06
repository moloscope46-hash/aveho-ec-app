// =============================================================
//  Tests 0.58.78 — CLEANUP groupements/etages
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.78 - Version + SW", () => {
  it("Version 0.58.78+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.58\.7[89]|^0\.58\.[89]|^0\.59|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.58.78", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.78"');
  });
});

describe("0.58.78 - SQL cleanup", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.78-cleanup-only-existing-tables.sql"), "utf-8");
  it("DROP les 3 tables que j'avais créées", () => {
    expect(sql).toMatch(/DROP TABLE IF EXISTS groupement_etablissements CASCADE/);
    expect(sql).toMatch(/DROP TABLE IF EXISTS groupements CASCADE/);
    expect(sql).toMatch(/DROP TABLE IF EXISTS etages CASCADE/);
  });
  it("DROP la vue v_depots_hierarchie", () => {
    expect(sql).toMatch(/DROP VIEW IF EXISTS v_depots_hierarchie CASCADE/);
  });
  it("DROP les colonnes etage_id et groupement_id", () => {
    expect(sql).toMatch(/ALTER TABLE depots DROP COLUMN IF EXISTS groupement_id/);
    expect(sql).toMatch(/ALTER TABLE depots DROP COLUMN IF EXISTS etage_id/);
    expect(sql).toMatch(/ALTER TABLE chambres DROP COLUMN IF EXISTS etage_id/);
    expect(sql).toMatch(/ALTER TABLE services DROP COLUMN IF EXISTS etage_id/);
  });
  it("Recrée v_depots_hierarchie SIMPLIFIÉE (sans .numero)", () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW v_depots_hierarchie/);
    expect(sql).not.toMatch(/e\.numero|c\.numero/);
    expect(sql).toMatch(/c\.nom AS chambre_nom/);
    expect(sql).toMatch(/b\.nom AS batiment_nom/);
  });
  it("Garde les colonnes utiles sur depots", () => {
    expect(sql).toMatch(/ALTER TABLE depots[\s\S]*service_id UUID[\s\S]*chambre_id UUID/);
    expect(sql).toMatch(/niveau_hierarchique TEXT/);
  });
});

describe("0.58.78 - Page /groupements supprimée", () => {
  it("Le dossier app/groupements n'existe plus", () => {
    const exists = fs.existsSync(path.resolve(process.cwd(), "app/groupements"));
    expect(exists).toBe(false);
  });
});

describe("0.58.78 - /depots refait sans groupements/etages", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/depots/page.js"), "utf-8");
  it("Plus de groupement_id ou etage_id dans le code", () => {
    expect(src).not.toMatch(/groupement_id|etage_id/);
  });
  it("Utilise c.nom (jamais c.numero)", () => {
    expect(src).not.toMatch(/c\.numero/);
    expect(src).toMatch(/c\.nom/);
  });
  it("Hiérarchie 5 niveaux : batiment/service/chambre/magasin/mobile", () => {
    expect(src).toMatch(/value:\s*"batiment"/);
    expect(src).toMatch(/value:\s*"service"/);
    expect(src).toMatch(/value:\s*"chambre"/);
    expect(src).toMatch(/value:\s*"magasin"/);
    expect(src).toMatch(/value:\s*"mobile"/);
  });
  it("tryFetch graceful pour 42P01/42703", () => {
    expect(src).toMatch(/42P01/);
    expect(src).toMatch(/42703/);
  });
});

describe("0.58.78 - /transferts plus de c.numero", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");
  it("Plus de c.numero dans les SELECT ni l'affichage", () => {
    expect(src).not.toMatch(/c\.numero/);
  });
  it("SELECT chambres sans numero", () => {
    expect(src).toMatch(/from\("chambres"\)\.select\("id,\s*nom"\)/);
  });
});

describe("0.58.78 - BatimentServiceSwitcher sans etages", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/BatimentServiceSwitcher.js"), "utf-8");
  it("Ne fetch plus la table etages", () => {
    expect(src).not.toMatch(/from\("etages"\)/);
  });
  it("Charge services directement via batiment_id", () => {
    expect(src).toMatch(/\.eq\("batiment_id",\s*batId\)/);
  });
});

describe("0.58.78 - Cohérence changelog", () => {
  it("0.58.78 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.78"/);
  });
  it("0.58.78 présent dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    expect(json.map(v => v.v)).toContain("0.58.78");
  });
});
