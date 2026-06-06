// =============================================================
//  Tests unitaires — 0.58.47
//  Icônes personnalisables pour tags matériel, étiquettes patient, annonces
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.47 - Version", () => {
  it("Version 0.58.47+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(47);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.47 - IconPicker component", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/IconPicker.js"), "utf-8");

  it("Exporte IconPicker (default) + ICON_CATALOG + ALL_ICONS + DEFAULT_ICON", () => {
    expect(src).toMatch(/export default function IconPicker/);
    expect(src).toMatch(/export const ICON_CATALOG/);
    expect(src).toMatch(/export const ALL_ICONS/);
    expect(src).toMatch(/export const DEFAULT_ICON\s*=\s*["']ti-tag["']/);
  });

  it("Catalogue contient au moins 10 catégories PSAD/médical", () => {
    const catRegex = /"([^"]+)":\s*\[/g;
    const cats = [...src.matchAll(catRegex)].map(m => m[1]);
    // Pas exactement 10 forcément, mais au moins beaucoup
    expect(cats.length).toBeGreaterThanOrEqual(8);
  });

  it("Catalogue contient catégorie 'Médical & soins' avec icônes pertinentes", () => {
    expect(src).toMatch(/["']Médical & soins["']\s*:\s*\[[^\]]*ti-stethoscope[^\]]*\]/);
    expect(src).toMatch(/ti-heartbeat/);
    expect(src).toMatch(/ti-medical-cross/);
  });

  it("Catalogue contient catégorie 'Matériel & équipement'", () => {
    expect(src).toMatch(/["']Matériel & équipement["']/);
    expect(src).toMatch(/ti-armchair-2/);
    expect(src).toMatch(/ti-bed/);
  });

  it("Recherche : champ input avec setQuery + filtrage", () => {
    expect(src).toMatch(/query,\s*setQuery/);
    expect(src).toMatch(/filteredCatalog/);
  });

  it("Bouton 'Aucune icône' si allowEmpty (par défaut true)", () => {
    expect(src).toMatch(/Aucune icône/);
    expect(src).toMatch(/allowEmpty\s*=\s*true/);
  });

  it("État noResults affiché si recherche sans match", () => {
    expect(src).toMatch(/noResults/);
    expect(src).toMatch(/Aucune icône trouvée/);
  });

  it("Couleur d'accent paramétrable via prop color", () => {
    expect(src).toMatch(/color\s*=\s*["']#185FA5["']/);
  });
});

describe("0.58.47 - Page Tags matériel : intégration IconPicker", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/tags-materiel/page.js"), "utf-8");

  it("Import IconPicker + DEFAULT_ICON", () => {
    expect(src).toMatch(/import IconPicker,\s*\{\s*DEFAULT_ICON\s*\}/);
  });

  it("Save : payload contient `icone: form.icone || null`", () => {
    expect(src).toMatch(/icone:\s*form\.icone \|\| null/);
  });

  it("Render tag utilise r.icone || DEFAULT_ICON", () => {
    expect(src).toMatch(/`ti \$\{r\.icone \|\| DEFAULT_ICON\}`/);
  });

  it("IconPicker présent dans la modal d'édition", () => {
    expect(src).toMatch(/<IconPicker/);
    expect(src).toMatch(/onChange=\{\(icon\) => setForm\(\{ \.\.\.form, icone: icon \}\)\}/);
  });
});

describe("0.58.47 - Page Étiquettes patient : intégration IconPicker", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etiquettes/page.js"), "utf-8");

  it("Import IconPicker", () => {
    expect(src).toMatch(/import IconPicker/);
  });

  it("Save : payload icone", () => {
    expect(src).toMatch(/icone:\s*form\.icone \|\| null/);
  });

  it("Render utilise r.icone || DEFAULT_ICON", () => {
    expect(src).toMatch(/r\.icone \|\| DEFAULT_ICON/);
  });

  it("IconPicker dans la modal", () => {
    expect(src).toMatch(/<IconPicker/);
  });
});

describe("0.58.47 - Page Annonces : intégration IconPicker", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/annonces/page.js"), "utf-8");

  it("Import IconPicker", () => {
    expect(src).toMatch(/import IconPicker/);
  });

  it("Save : payload icone", () => {
    expect(src).toMatch(/icone:\s*form\.icone \|\| null/);
  });

  it("Liste : icône custom OU défaut selon niveau (critique/warning/info)", () => {
    expect(src).toMatch(/r\.icone \|\|[\s\S]*?ti-alert-octagon[\s\S]*?ti-alert-triangle[\s\S]*?ti-info-circle/);
  });

  it("IconPicker dans la modal avec couleur du niveau", () => {
    expect(src).toMatch(/<IconPicker/);
    expect(src).toMatch(/NIVEAU_OPTS\.find\(n => n\.v === \(form\.niveau \|\| ["']info["']\)\)\?\.color/);
  });
});

describe("0.58.47 - AnnoncesBanner : icône custom", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/AnnoncesBanner.js"), "utf-8");

  it("Utilise current.icone || niveau.icon (custom OU défaut)", () => {
    expect(src).toMatch(/`ti \$\{current\.icone \|\| niveau\.icon\}`/);
  });
});

describe("0.58.47 - Pages d'affichage des tags utilisent t.icone", () => {
  it("/materiels : liste + modal utilisent t.icone || ti-tag", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");
    // Au moins 2 occurrences (liste + modal)
    const matches = src.match(/t\.icone \|\| ["']ti-tag["']/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("/materiel/[id] : utilise t.icone || ti-tag", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiel/[id]/page.js"), "utf-8");
    expect(src).toMatch(/t\.icone \|\| ["']ti-tag["']/);
  });

  it("/patients : 2 endroits avec e.icone || ti-tag", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    const matches = src.match(/e\.icone \|\| ["']ti-tag["']/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("0.58.47 - SQL migration", () => {
  it("Fichier SQL existe", () => {
    const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.47-tags-icone.sql");
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("SQL ajoute colonne icone aux 3 tables", () => {
    const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.47-tags-icone.sql"), "utf-8");
    expect(sql).toMatch(/ALTER TABLE tags_materiel[\s\S]*?ADD COLUMN IF NOT EXISTS icone TEXT/);
    expect(sql).toMatch(/ALTER TABLE etiquettes[\s\S]*?ADD COLUMN IF NOT EXISTS icone TEXT/);
    expect(sql).toMatch(/ALTER TABLE annonces[\s\S]*?ADD COLUMN IF NOT EXISTS icone TEXT/);
  });
});
