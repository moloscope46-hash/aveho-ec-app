// =============================================================
//  Tests 0.59.0 — Collaborateurs + Icônes menu + Mobile compact
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.59.0 - Version + SW", () => {
  it("Version 0.59.0+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.59\.|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.59.0", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.59.0"');
  });
});

describe("0.59.0 - SQL collaborateurs", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.59.0-collaborateurs-roles.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  it("Crée table pharmacies", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS pharmacies/);
  });
  it("ALTER membres_structure : role_professionnel + ADELI/RPPS + pharmacie_id", () => {
    expect(sql).toMatch(/role_professionnel TEXT/);
    expect(sql).toMatch(/numero_adeli TEXT/);
    expect(sql).toMatch(/numero_rpps TEXT/);
    expect(sql).toMatch(/pharmacie_id UUID/);
    expect(sql).toMatch(/etablissement_id UUID/);
    expect(sql).toMatch(/service_id UUID/);
  });
  it("ALTER patients : collaborateur_id", () => {
    expect(sql).toMatch(/ALTER TABLE patients[\s\S]*collaborateur_id UUID/);
  });
  it("Vue v_collaborateurs créée avec jointures", () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW v_collaborateurs/);
    expect(sql).toMatch(/pharmacie_nom/);
    expect(sql).toMatch(/etablissement_nom/);
    expect(sql).toMatch(/service_nom/);
  });
  it("RLS pharmacies permissive", () => {
    expect(sql).toMatch(/pharmacies_read_auth/);
    expect(sql).toMatch(/pharmacies_write_auth/);
  });
});

describe("0.59.0 - Page /collaborateurs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/collaborateurs/page.js"), "utf-8");
  it("9 rôles professionnels", () => {
    expect(src).toMatch(/ROLES_PRO = \[/);
    expect(src).toMatch(/infirmier/);
    expect(src).toMatch(/docteur/);
    expect(src).toMatch(/pharmacien/);
    expect(src).toMatch(/aide_soignant/);
    expect(src).toMatch(/kine/);
    expect(src).toMatch(/secretaire/);
    expect(src).toMatch(/logistique/);
    expect(src).toMatch(/autre/);
  });
  it("Si pharmacien → champ pharmacie_id apparaît", () => {
    expect(src).toMatch(/role_professionnel === "pharmacien"/);
    expect(src).toMatch(/Pharmacie rattachée/);
  });
  it("Filtres : recherche + rôle + service", () => {
    expect(src).toMatch(/filterRole/);
    expect(src).toMatch(/filterService/);
    expect(src).toMatch(/searchLow/);
  });
  it("Charge depuis v_collaborateurs avec fallback membres_structure", () => {
    expect(src).toMatch(/v_collaborateurs/);
    expect(src).toMatch(/from\("membres_structure"\)/);
  });
  it("Champs ADELI + RPPS dans le form", () => {
    expect(src).toMatch(/numero_adeli/);
    expect(src).toMatch(/numero_rpps/);
  });
  it("Stats cliquables par rôle", () => {
    expect(src).toMatch(/setFilterRole\(filterRole === r\.v \? "" : r\.v\)/);
  });
});

describe("0.59.0 - Menu sections avec icônes", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
  it("Toutes les sections ont sectionIcon", () => {
    expect(src).toMatch(/section: "Mon espace",.*sectionIcon: "ti-home-2"/);
    expect(src).toMatch(/section: "Groupement",.*sectionIcon: "ti-building-community"/);
    expect(src).toMatch(/section: "Mes partenaires",.*sectionIcon: "ti-users-group"/);
    expect(src).toMatch(/section: "Scan",.*sectionIcon: "ti-scan"/);
    expect(src).toMatch(/section: "Commande",.*sectionIcon: "ti-shopping-bag"/);
    expect(src).toMatch(/section: "Livraison",.*sectionIcon: "ti-truck-delivery"/);
    expect(src).toMatch(/section: "Administratif",.*sectionIcon: "ti-clipboard-list"/);
    expect(src).toMatch(/section: "Administration",.*sectionIcon: "ti-shield-lock"/);
  });
  it("Icône de section rendue dans le DOM (sec.sectionIcon)", () => {
    expect(src).toMatch(/sec\.sectionIcon &&/);
    expect(src).toMatch(/className=\{`ti \$\{sec\.sectionIcon\}`\}/);
  });
  it("Collaborateurs en tête du menu Groupement", () => {
    expect(src).toMatch(/\/collaborateurs[\s\S]{0,100}Collaborateurs/);
  });
  it("Classes menu-section-label et menu-section-bar pour responsive", () => {
    expect(src).toMatch(/className="menu-section-label"/);
    expect(src).toMatch(/className="menu-section-bar"/);
  });
});

describe("0.59.0 - CSS mode mobile compact", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
  it("Media query mobile présente", () => {
    expect(css).toMatch(/@media \(max-width: 768px\)/);
  });
  it("Libellés cachés en mobile", () => {
    expect(css).toMatch(/\.menu-section-label,[\s\S]*?\.menu-tile \.mt-lbl[\s\S]*?display: none/);
  });
  it("Tuiles compactes 48px en mobile", () => {
    expect(css).toMatch(/min-height: 48px/);
    expect(css).toMatch(/minmax\(48px/);
  });
});

describe("0.59.0 - Choix mode redirige vers /collaborateurs (Logiciel)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/choix-mode/page.js"), "utf-8");
  it("Mode desktop → /collaborateurs", () => {
    expect(src).toMatch(/router\.push\("\/collaborateurs"\)/);
  });
});

describe("0.59.0 - Onglets /collectivite", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/collectivite/page.js"), "utf-8");
  it("3 nouveaux onglets : collaborateurs/depots/equipes", () => {
    expect(src).toMatch(/id: "collaborateurs"/);
    expect(src).toMatch(/id: "depots"/);
    expect(src).toMatch(/id: "equipes"/);
  });
  it("Contenu rendu pour chaque onglet", () => {
    expect(src).toMatch(/activeTab === "collaborateurs"/);
    expect(src).toMatch(/activeTab === "depots"/);
    expect(src).toMatch(/activeTab === "equipes"/);
  });
});

describe("0.59.0 - Cohérence changelog + note", () => {
  it("0.59.0 dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.59\.0"/);
  });
  it("Note HTML 0.59.0 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.59.0.html"))).toBe(true);
  });
});
