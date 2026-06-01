// =============================================================
//  Tests unitaires — 0.56.12
//  Fix colonnes mutuelles (raison_sociale au lieu de nom, cp au
//  lieu de code_postal, type_organisme au lieu de type)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.12 - Page referentiels-sante : colonnes mutuelles", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/referentiels-sante/page.js"), "utf-8");

  it("Helper getNom qui résout nom||raison_sociale", () => {
    expect(src).toContain("getNom");
    expect(src).toContain("item?.nom || item?.raison_sociale");
  });

  it("Query mutuelles ordonne par raison_sociale", () => {
    expect(src).toContain('"mutuelles").select("*").order("raison_sociale")');
  });

  it("Création mutuelle initialise raison_sociale + type_organisme", () => {
    expect(src).toContain('raison_sociale: ""');
    expect(src).toContain('type_organisme: "mutuelle"');
  });

  it("Validation save() détecte nom OU raison_sociale selon onglet", () => {
    expect(src).toContain("editing.nom : editing.raison_sociale");
  });

  it("Filtre items utilise getNom (case insensitive)", () => {
    expect(src).toContain("(getNom(x)).toLowerCase().includes(f)");
  });

  it("Affichage liste utilise getNom", () => {
    expect(src).toContain("{getNom(item)}");
  });

  it("EditModal mutuelle a label Raison sociale", () => {
    expect(src).toContain('label="Raison sociale *"');
    expect(src).toContain('set("raison_sociale", v)');
  });

  it("EditModal mutuelle utilise type_organisme + nom_court + code_orgcomp", () => {
    expect(src).toContain('entity.type_organisme || entity.type');
    expect(src).toContain('set("type_organisme", v)');
    expect(src).toContain('set("nom_court", v)');
    expect(src).toContain('set("code_orgcomp", v)');
  });

  it("CP : mutuelle utilise cp, caisse utilise code_postal", () => {
    expect(src).toContain('entity.cp || entity.code_postal');
    expect(src).toContain('set("cp", v)');
  });

  it("Affichage code postal : item.code_postal || item.cp", () => {
    expect(src).toContain("item.code_postal || item.cp");
  });

  it("Affichage type mutuelle : type_organisme fallback type", () => {
    expect(src).toContain("item.type_organisme || item.type");
  });

  it("fillFromBAN utilise cp (0.56.13 unifie pour les 2 tables)", () => {
    expect(src).toContain("cp: a.code_postal");
  });
});

describe("0.56.12 - API /api/mutuelles : mapping colonnes", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/mutuelles/route.js"), "utf-8");

  it("POST accepte raison_sociale (avec fallback nom)", () => {
    expect(src).toContain("body.raison_sociale || body.nom");
  });

  it("POST insère raison_sociale + type_organisme + cp", () => {
    expect(src).toContain("raison_sociale: body.raison_sociale || body.nom");
    expect(src).toContain("type_organisme: body.type_organisme || body.type");
    expect(src).toContain("cp: body.cp || body.code_postal");
  });

  it("PUT remappe nom → raison_sociale, code_postal → cp, type → type_organisme", () => {
    expect(src).toContain("updates.raison_sociale = nom");
    expect(src).toContain("updates.cp = code_postal");
    expect(src).toContain("updates.type_organisme = type");
  });

  it("PUT extrait nom/code_postal/type du body avant spread", () => {
    expect(src).toContain("const { id, nom, code_postal, type, ...rest }");
  });
});

describe("0.56.12 - SQL 0.56.10 : RPC patient_dashboard_summary fix", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.10.sql"), "utf-8");

  it("Sélectionne raison_sociale (et pas nom) depuis mutuelles", () => {
    expect(sql).toContain("select raison_sociale from mutuelles");
    expect(sql).not.toContain("(select nom from mutuelles");
  });
});
