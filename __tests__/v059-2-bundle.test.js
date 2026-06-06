// =============================================================
//  Tests 0.59.2 — Fix dark mode + Matériel installé chambre
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.59.2 - Version + SW", () => {
  it("Version 0.59.2+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.59\.([2-9]|\d{2,})|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.59.2", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.59.2"');
  });
});

describe("0.59.2 - Dark mode fix CSS agressif", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
  it("Règle dark pour color: #142131", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="color: #142131"\]/);
  });
  it("Règle dark pour color: #5a6878 → muted", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="color: #5a6878"\]/);
  });
  it("Règle dark pour color: #8a98a8", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="color: #8a98a8"\]/);
  });
  it("Règle dark pour background: #fff", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="background: #fff"\]/);
  });
  it("Règle dark pour #fafbfc/#f7fafa (fonds gris clairs)", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="background: #fafbfc"\]/);
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="background: #f7fafa"\]/);
  });
  it("Règle dark pour borders claires #e3e9ee/#cfd8e0", () => {
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="border: 1px solid #e3e9ee"\]/);
    expect(css).toMatch(/html\[data-theme="dark"\] \[style\*="border: 1px solid #cfd8e0"\]/);
  });
  it("Commentaire 0.59.2 présent", () => {
    expect(css).toMatch(/0\.59\.2 — DARK MODE FIX AGRESSIF/);
  });
});

describe("0.59.2 - Matériel chambre + recherche article", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("Composant ChambreMaterielSection défini", () => {
    expect(src).toMatch(/function ChambreMaterielSection\(/);
  });
  it("Composant utilisé dans la wizard", () => {
    expect(src).toMatch(/<ChambreMaterielSection[\s\S]*?chambreId=\{form\.chambre_id\}/);
  });
  it("Affichage conditionnel si chambre sélectionnée", () => {
    expect(src).toMatch(/form\.chambre_id && \(\s*<ChambreMaterielSection/);
  });
  it("Charge matériels de la chambre", () => {
    expect(src).toMatch(/from\("materiels"\)[\s\S]*?\.eq\("chambre_id", chambreId\)/);
  });
  it("Recherche articles avec autofocus", () => {
    expect(src).toMatch(/autoFocus/);
    expect(src).toMatch(/from\("articles"\)/);
  });
  it("Bouton ajouter au panier vert", () => {
    expect(src).toMatch(/function addToCart/);
    expect(src).toMatch(/aveho_ec_cart/);
    expect(src).toMatch(/av-cart-change/);
  });
  it("Ajout panier stocke chambre_id + chambre_nom", () => {
    expect(src).toMatch(/chambre_id: chambreId/);
    expect(src).toMatch(/chambre_nom: chambreNom/);
  });
  it("Filtre articles par libellé/code", () => {
    expect(src).toMatch(/libelle.*toLowerCase.*includes.*searchLow/);
    expect(src).toMatch(/code.*toLowerCase.*includes.*searchLow/);
  });
  it("Bouton toggle search ouvre/ferme", () => {
    expect(src).toMatch(/setShowSearch\(!showSearch\)/);
  });
});

describe("0.59.2 - Cohérence changelog", () => {
  it("0.59.2 dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.59\.2"/);
  });
  it("Note HTML 0.59.2 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.59.2.html"))).toBe(true);
  });
});
