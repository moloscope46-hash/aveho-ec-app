// =============================================================
//  Tests 0.58.86 — Onglets vehicules + depots dans /etablissement + /vehicules CRUD
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.86 - Version + SW", () => {
  it("Version 0.58.86+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.58\.(8[6-9]|9\d)|^0\.59|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.58.86", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.86"');
  });
});

describe("0.58.86 - /etablissement avec 3 onglets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etablissement/page.js"), "utf-8");
  it("State tab + setTab introduits", () => {
    expect(src).toMatch(/const \[tab, setTab\]/);
    expect(src).toMatch(/useState\("apercu"\)/);
  });
  it("3 onglets définis : apercu, vehicules, depots", () => {
    expect(src).toMatch(/k:\s*"apercu"/);
    expect(src).toMatch(/k:\s*"vehicules"/);
    expect(src).toMatch(/k:\s*"depots"/);
  });
  it("Charge vehicules et depots de l'établissement", () => {
    expect(src).toMatch(/from\("vehicules"\)\.select.*\.eq\("etablissement_id", auth\.etabId\)/s);
    expect(src).toMatch(/from\("depots"\)\.select.*\.eq\("etablissement_id", auth\.etabId\)/s);
  });
  it("Composant VehiculeCard avec types et statuts", () => {
    expect(src).toMatch(/function VehiculeCard/);
    expect(src).toMatch(/VEHICULE_TYPES/);
    expect(src).toMatch(/VEHICULE_STATUTS/);
    expect(src).toMatch(/sanitaire/);
    expect(src).toMatch(/ambulance/);
    expect(src).toMatch(/vsl/i);
  });
  it("Composant DepotCard avec rattachement véhicule", () => {
    expect(src).toMatch(/function DepotCard/);
    expect(src).toMatch(/vehAttache/);
    expect(src).toMatch(/d\.vehicule_id/);
    expect(src).toMatch(/Dépôt mobile sur véhicule/);
  });
  it("Affichage compteur dans le label onglet", () => {
    expect(src).toMatch(/Véhicules \(\$\{vehs\.length\}\)/);
    expect(src).toMatch(/Dépôts \(\$\{depots\.length\}\)/);
  });
  it("Bouton Nouveau véhicule pré-remplit etablissement_id", () => {
    expect(src).toMatch(/\/vehicules\?new=1&etablissement_id=\$\{auth\.etabId\}/);
  });
});

describe("0.58.86 - Page /vehicules CRUD", () => {
  it("Fichier app/vehicules/page.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/vehicules/page.js"))).toBe(true);
  });
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/vehicules/page.js"), "utf-8");
  it("6 types et 4 statuts définis", () => {
    expect(src).toMatch(/const TYPES = \[/);
    expect(src).toMatch(/v:\s*"sanitaire"/);
    expect(src).toMatch(/v:\s*"ambulance"/);
    expect(src).toMatch(/v:\s*"vsl"/);
    expect(src).toMatch(/v:\s*"taxi"/);
    expect(src).toMatch(/v:\s*"utilitaire"/);
    expect(src).toMatch(/const STATUTS = \[/);
    expect(src).toMatch(/v:\s*"disponible"/);
    expect(src).toMatch(/v:\s*"en_mission"/);
  });
  it("Auto-open modal si ?new=1", () => {
    expect(src).toMatch(/sp\.get\("new"\) === "1"/);
    expect(src).toMatch(/sp\.get\("etablissement_id"\)/);
  });
  it("Suspense wrapper pour useSearchParams", () => {
    expect(src).toMatch(/import \{ Suspense/);
    expect(src).toMatch(/<Suspense fallback=\{null\}>/);
  });
  it("Modal complet avec champs établissement + agrément ARS", () => {
    expect(src).toMatch(/Établissement/);
    expect(src).toMatch(/numero_agrement/);
    expect(src).toMatch(/N° agrément ARS/);
  });
  it("Auto-uppercase immatriculation", () => {
    expect(src).toMatch(/immatriculation: e\.target\.value\.toUpperCase/);
  });
  it("Capacités personnes/brancards/kilométrage", () => {
    expect(src).toMatch(/capacite_personnes/);
    expect(src).toMatch(/capacite_brancards/);
    expect(src).toMatch(/kilometrage/);
  });
  it("Couleur picker pour personnalisation card", () => {
    expect(src).toMatch(/type="color"/);
  });
  it("Mounted ref dans useEffect", () => {
    expect(src).toMatch(/let mounted = true/);
    expect(src).toMatch(/return \(\) => \{ mounted = false; \}/);
  });
});

describe("0.58.86 - Cohérence changelog", () => {
  it("0.58.86 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.86"/);
  });
  it("0.58.86 dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    expect(json.map(v => v.v)).toContain("0.58.86");
  });
  it("Note HTML 0.58.86 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.58.86.html"))).toBe(true);
  });
});
