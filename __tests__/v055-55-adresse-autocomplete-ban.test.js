// =============================================================
//  Tests unitaires — 0.55.55
//  Composant AdresseAutocomplete + intégration patients
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// 0.57.1 : helper qui concatène tous les fichiers du dossier edit/
function _readAllEditFiles() {
  const baseDir = path.resolve(process.cwd(), "app/patient/[id]/edit");
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) {
        out.push(fs.readFileSync(full, "utf-8"));
      }
    }
  }
  walk(baseDir);
  return out.join("\n");
}

describe("0.55.55 - Composant AdresseAutocomplete", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/AdresseAutocomplete.js"), "utf-8");

  it("Existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/AdresseAutocomplete.js"))).toBe(true);
  });

  it("Utilise l'API BAN data.gouv.fr (gratuite, sans clé)", () => {
    expect(src).toContain("api-adresse.data.gouv.fr/search");
  });

  it("Debounce 300ms avant requête", () => {
    expect(src).toContain("setTimeout");
    expect(src).toContain("300");
  });

  it("Minimum 3 caractères avant de chercher", () => {
    expect(src).toContain("length < 3");
  });

  it("Param autocomplete=1 + limit=8", () => {
    expect(src).toContain('autocomplete: "1"');
    expect(src).toContain('limit: "8"');
  });

  it("Restriction cp si fourni (postcode param)", () => {
    expect(src).toContain("postcode");
    expect(src).toContain('/^\\d{5}$/');
  });

  it("onSelect retourne code_insee 5 chiffres", () => {
    expect(src).toContain("code_insee: p.citycode");
  });

  it("onSelect retourne latitude + longitude", () => {
    expect(src).toContain("latitude: lat");
    expect(src).toContain("longitude: lng");
  });

  it("Badges colorés par type (housenumber/street/locality/municipality)", () => {
    expect(src).toContain('"housenumber"');
    expect(src).toContain('"street"');
    expect(src).toContain('"locality"');
    expect(src).toContain('"municipality"');
  });

  it("Mention source BAN data.gouv.fr en pied de dropdown", () => {
    expect(src).toContain("Base Adresse Nationale");
    expect(src).toContain("data.gouv.fr");
  });
});

describe("0.55.55 - Intégration dans /patients (modale création)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");

  it("Import AdresseAutocomplete", () => {
    expect(src).toContain('import AdresseAutocomplete from "../AdresseAutocomplete"');
  });

  it("Champ adresse avec auto-fill cp/ville/INSEE/coords", () => {
    expect(src).toContain("<AdresseAutocomplete");
    expect(src).toContain("code_insee_residence: a.code_insee");
    expect(src).toContain("latitude: a.latitude");
  });

  it("Save() inclut adresse + code_postal + ville + code_insee + lat/lng", () => {
    expect(src).toContain("adresse: form.adresse || null");
    expect(src).toContain("code_postal: form.code_postal || null");
    expect(src).toContain("ville: form.ville || null");
    expect(src).toContain("code_insee_residence: form.code_insee_residence || null");
    expect(src).toContain("latitude: form.latitude || null");
  });

  it("Aide : 'Pour l'adresse complète, va dans Édition complète'", () => {
    expect(src).toContain("Édition complète");
  });
});

describe("0.55.55 - Intégration dans /patient/[id]/edit", () => {
  const src = _readAllEditFiles();

  it("Import AdresseAutocomplete", () => {
    // 0.57.1 : le composant peut être importé depuis page.js (../../../) ou
    // depuis tabs/*.js (../../../../) — on accepte les deux profondeurs.
    expect(src).toMatch(/import AdresseAutocomplete from ["'](\.\.\/)+AdresseAutocomplete["']/);
  });

  it("Onglet Identité : autocomplete commune pour lieu_naissance", () => {
    expect(src).toContain("lieu_naissance_ville");
    expect(src).toContain("lieu_naissance_code_insee");
    // Doit y avoir un AdresseAutocomplete dans TabIdentite
    const tabIdentite = src.match(/function TabIdentite[\s\S]*?\n\}/);
    expect(tabIdentite).toBeTruthy();
    expect(tabIdentite[0]).toContain("AdresseAutocomplete");
  });

  it("Onglet Adresses : adresse principale via BAN", () => {
    const tabAdresses = src.match(/function TabAdresses[\s\S]*?\n\}/);
    expect(tabAdresses).toBeTruthy();
    expect(tabAdresses[0]).toContain("AdresseAutocomplete");
    expect(tabAdresses[0]).toContain("fillFromBAN");
    expect(tabAdresses[0]).toContain("code_insee_residence");
  });

  it("Adresses de livraison utilisent aussi BAN", () => {
    // Le 2e AdresseAutocomplete dans TabAdresses (pour les livraisons 1-N)
    const tabAdresses = src.match(/function TabAdresses[\s\S]*?\n\}/);
    expect(tabAdresses).toBeTruthy();
    // Doit avoir 2 occurrences d'AdresseAutocomplete (principale + livraison)
    const matches = tabAdresses[0].match(/<AdresseAutocomplete/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("0.55.55 - SQL patch colonnes patient", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.55.sql"), "utf-8");

  it("Ajoute code_insee_residence (idempotent)", () => {
    expect(sql).toContain("add column if not exists code_insee_residence text");
  });

  it("Ajoute latitude + longitude (numeric)", () => {
    expect(sql).toContain("add column if not exists latitude numeric");
    expect(sql).toContain("add column if not exists longitude numeric");
  });

  it("Index sur code_insee + coords (partiels where not null)", () => {
    expect(sql).toContain("idx_patients_code_insee");
    expect(sql).toContain("idx_patients_coords");
    expect(sql).toContain("where code_insee_residence is not null");
  });

  it("Patch 100% idempotent (if not exists partout)", () => {
    const ifNotExists = (sql.match(/if not exists/gi) || []).length;
    expect(ifNotExists).toBeGreaterThanOrEqual(5);
  });
});
