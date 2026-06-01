// =============================================================
//  Tests unitaires — 0.56.13
//  Fix relancerInvitation (inviteLink) + fix colonnes caisses
//  (type_caisse + cp au lieu de type + code_postal)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.13 - Fix relancerInvitation passe inviteLink", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");

  it("relancerInvitation construit l'inviteLink depuis le token", () => {
    expect(src).toMatch(/relancerInvitation[\s\S]*?inviteLink\s*=\s*`\$\{siteUrl\}\/inscription\/\$\{i\.token\}`/);
  });

  it("relancerInvitation passe inviteLink dans le body", () => {
    expect(src).toMatch(/relancerInvitation[\s\S]*?body:\s*\{[\s\S]*?inviteLink[\s\S]*?\}/);
  });

  it("relancerInvitation gère error.context.body pour afficher détail", () => {
    expect(src).toMatch(/relancerInvitation[\s\S]*?error\.context\?\.body/);
  });

  it("Commentaire 0.56.13 dans relancerInvitation", () => {
    expect(src).toMatch(/relancerInvitation[\s\S]*?0\.56\.13/);
  });
});

describe("0.56.13 - Fix colonnes caisses (type_caisse + cp)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/referentiels-sante/page.js"), "utf-8");

  it("Init création caisse utilise type_caisse", () => {
    expect(src).toContain('type_caisse: "CPAM"');
  });

  it("Affichage caisses utilise item.type_caisse fallback type", () => {
    expect(src).toContain("item.type_caisse || item.type");
  });

  it("Form type caisse set sur type_caisse", () => {
    expect(src).toContain('set("type_caisse", v)');
  });

  it("Form caisse cp utilise cp", () => {
    expect(src).toMatch(/tab === "caisses"[\s\S]*?set\("cp", v\)/);
  });

  it("fillFromBAN utilise cp pour les 2 tables", () => {
    expect(src).toContain("cp: a.code_postal");
    // Plus de branche code_postal: a.code_postal
    expect(src).not.toMatch(/code_postal:\s*a\.code_postal/);
  });
});

describe("0.56.13 - API /api/caisses mapping", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/caisses/route.js"), "utf-8");

  it("POST insère type_caisse (avec fallback type)", () => {
    expect(src).toContain("type_caisse: body.type_caisse || body.type");
  });

  it("POST insère cp (avec fallback code_postal)", () => {
    expect(src).toContain("cp: body.cp || body.code_postal");
  });

  it("PUT remappe code_postal → cp et type → type_caisse", () => {
    expect(src).toContain("updates.cp = code_postal");
    expect(src).toContain("updates.type_caisse = type");
  });

  it("PUT extrait code_postal et type du body avant spread", () => {
    expect(src).toContain("const { id, code_postal, type, ...rest }");
  });
});

describe("0.56.13 - SQL 0.56.10 RPC fix caisse type", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.10.sql"), "utf-8");

  it("Sélectionne type_caisse (et pas type) depuis caisses_assurance_maladie", () => {
    expect(sql).toContain("select type_caisse from caisses_assurance_maladie");
    expect(sql).not.toContain("(select type from caisses_assurance_maladie");
  });
});
