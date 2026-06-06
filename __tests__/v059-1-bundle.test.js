// =============================================================
//  Tests 0.59.1 — Création patient enrichie + fix pathologies layout
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.59.1 - Version + SW", () => {
  it("Version 0.59.1+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.59\.([1-9]|\d{2,})|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.59.1", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.59.1"');
  });
});

describe("0.59.1 - Fix layout pathologies", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/pathologies/page.js"), "utf-8");
  it("Grid avec minmax 320px max + justifyContent start", () => {
    expect(src).toMatch(/minmax\(280px,\s*320px\)/);
    expect(src).toMatch(/justifyContent:\s*"start"/);
  });
  it("Plus de 1fr qui étire les cards", () => {
    expect(src).not.toMatch(/gridTemplateColumns:\s*"repeat\(auto-fill,minmax\(280px,1fr\)\)"/);
  });
});

describe("0.59.1 - Patient mobile : établissement obligatoire", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("Validation bloque next() si pas d'établissement", () => {
    expect(src).toMatch(/step === 1 && !form\.etablissement_id/);
    expect(src).toMatch(/L'établissement est obligatoire/);
  });
  it("Sélecteur étab affiché même si 1 seul (avec required)", () => {
    expect(src).toMatch(/label="Établissement \*"/);
  });
  it("Bordure rouge si vide", () => {
    expect(src).toMatch(/borderColor:\s*form\.etablissement_id\s*\?\s*"#5aa05a"\s*:\s*"#e35d5b"/);
  });
});

describe("0.59.1 - Chambres avec statut dispo/occupée", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("State chambresOccupees (Set)", () => {
    expect(src).toMatch(/chambresOccupees, setChambresOccupees/);
    expect(src).toMatch(/new Set\(patientsActifs/);
  });
  it("Charge patients actifs pour calculer occupation", () => {
    expect(src).toMatch(/from\("patients"\)\.select\("chambre_id"\)[\s\S]*?\.not\("chambre_id",\s*"is",\s*null\)/);
  });
  it("Bouton-chambre désactivé si occupée + sélectionnée", () => {
    expect(src).toMatch(/disabled=\{occupee && !selected\}/);
  });
  it("Affiche ✓ Dispo / ⊘ Occupée / ✓ Choisie", () => {
    expect(src).toMatch(/✓ Choisie/);
    expect(src).toMatch(/⊘ Occupée/);
    expect(src).toMatch(/✓ Dispo/);
  });
  it("Compteur 'X dispo / Y total'", () => {
    expect(src).toMatch(/dispo \/ \$\{filteredChambres\.length\}/);
  });
});

describe("0.59.1 - Section Médecin & Pathologie", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("State collaborateurs + pathologies", () => {
    expect(src).toMatch(/collaborateurs, setCollaborateurs/);
    expect(src).toMatch(/pathologies, setPathologies/);
  });
  it("Form contient collaborateur_id + pathologie_id", () => {
    expect(src).toMatch(/collaborateur_id:\s*""/);
    expect(src).toMatch(/pathologie_id:\s*""/);
  });
  it("Charge v_collaborateurs + pathologies actives", () => {
    expect(src).toMatch(/from\("v_collaborateurs"\)/);
    expect(src).toMatch(/from\("pathologies"\)[\s\S]*?\.eq\("actif",\s*true\)/);
  });
  it("Section conditionnelle si données présentes", () => {
    expect(src).toMatch(/collaborateurs\.length > 0 \|\| pathologies\.length > 0/);
  });
  it("Filtre collaborateurs par service sélectionné", () => {
    expect(src).toMatch(/!form\.service_id \|\| c\.service_id === form\.service_id/);
  });
  it("Message si aucun collab dans le service", () => {
    expect(src).toMatch(/Aucun collaborateur rattaché à ce service/);
  });
});

describe("0.59.1 - Cohérence changelog", () => {
  it("0.59.1 dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.59\.1"/);
  });
  it("Note HTML 0.59.1 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.59.1.html"))).toBe(true);
  });
});
