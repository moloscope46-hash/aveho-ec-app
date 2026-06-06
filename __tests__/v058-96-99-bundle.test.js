// =============================================================
//  Tests 0.58.96 → 0.58.99 — Bundle 4 versions
//  Diagnostic + hydration fix + Tous batiments + Pathologies
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.96 → 0.58.99 — Version + SW", () => {
  it("Version 0.58.99+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.58\.(99)|^0\.59|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.58.99", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.99"');
  });
});

// ============================================================
// 0.58.96 — Page /diagnostic
// ============================================================
describe("0.58.96 — Page /diagnostic", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/diagnostic/page.js"), "utf-8");
  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/diagnostic/page.js"))).toBe(true);
  });
  it("Affiche pkg.version", () => {
    expect(src).toMatch(/import pkg from/);
    expect(src).toMatch(/\{pkg\.version\}/);
  });
  it("Teste 13 tables", () => {
    expect(src).toMatch(/patients/);
    expect(src).toMatch(/vehicules/);
    expect(src).toMatch(/cuves_oxygene/);
    expect(src).toMatch(/transferts/);
    expect(src).toMatch(/etablissements/);
  });
  it("Détecte 42P01 = TABLE ABSENTE", () => {
    expect(src).toMatch(/42P01/);
    expect(src).toMatch(/TABLE ABSENTE/);
  });
  it("Bouton vider cache + reload", () => {
    expect(src).toMatch(/clearCacheAndReload/);
    expect(src).toMatch(/caches\.keys/);
    expect(src).toMatch(/serviceWorker.*getRegistrations.*unregister/s);
  });
  it("Test INSERT patient minimal + cleanup", () => {
    expect(src).toMatch(/patient_insert/);
    expect(src).toMatch(/TEST_DIAGNOSTIC/);
    expect(src).toMatch(/\.delete\(\)\.eq\("id"/);
  });
});

// ============================================================
// 0.58.97 — Hotfix hydration + import useEffect
// ============================================================
describe("0.58.97 — Hotfix hydration profil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");
  it("State launchMode initialisé null", () => {
    expect(src).toMatch(/const \[launchMode, setLaunchMode\] = useState\(null\)/);
  });
  it("useEffect pour lire localStorage", () => {
    expect(src).toMatch(/setLaunchMode\(localStorage\.getItem\("av-launch-mode"\)\)/);
  });
  it("Plus de typeof window === undefined dans JSX", () => {
    // Pattern incriminé : {typeof window !== "undefined" && <> Mode actuel ...
    expect(src).not.toMatch(/typeof window.*!== "undefined".*&&.*Mode actuel/);
  });
  it("Render dépend de launchMode state", () => {
    expect(src).toMatch(/launchMode !== null/);
  });
});

describe("0.58.97 — Import useEffect dans mobile patient new", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("useEffect dans import", () => {
    expect(src).toMatch(/import\s*\{\s*useState\s*,\s*useEffect\s*\}\s*from\s*"react"/);
  });
});

// ============================================================
// 0.58.98 — Tous les bâtiments / Tous les services
// ============================================================
describe("0.58.98 — Option Tous dans BatimentServiceSwitcher", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/BatimentServiceSwitcher.js"), "utf-8");
  it("Option ★ Tous les bâtiments", () => {
    expect(src).toMatch(/★ Tous les bâtiments/);
  });
  it("Option ★ Tous les services", () => {
    expect(src).toMatch(/★ Tous les services/);
  });
  it("Au premier load → setBatId(\"\")  (pas list[0].id)", () => {
    // Le comportement par défaut a changé
    expect(src).toMatch(/setBatId\(""\)/);
  });
  it("Restore localStorage saved === \"\" préservé", () => {
    expect(src).toMatch(/saved === ""/);
  });
  it("changeBat dispatch batimentId: id || null", () => {
    expect(src).toMatch(/batimentId: id \|\| null/);
  });
  it("changeBat reset service et équipe", () => {
    expect(src).toMatch(/changeBat\([\s\S]*?setSvcId\(""\)/);
  });
});

// ============================================================
// 0.58.99 — Pathologies CRUD + fix num_serie
// ============================================================
describe("0.58.99 — Page /pathologies CRUD", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/pathologies/page.js"), "utf-8");
  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/pathologies/page.js"))).toBe(true);
  });
  it("21 icônes au choix", () => {
    expect(src).toMatch(/const ICONES = \[/);
    expect(src).toMatch(/"ti-stethoscope"/);
    expect(src).toMatch(/"ti-droplet"/);
    expect(src).toMatch(/"ti-lungs"/);
  });
  it("10 couleurs au choix + color picker", () => {
    expect(src).toMatch(/const COULEURS = \[/);
    expect(src).toMatch(/type="color"/);
  });
  it("Champs : nom, code, description, protocole, alertes", () => {
    expect(src).toMatch(/protocole_court/);
    expect(src).toMatch(/protocole_detail/);
    expect(src).toMatch(/alertes/);
  });
  it("Détection table absente (42P01)", () => {
    expect(src).toMatch(/42P01/);
    expect(src).toMatch(/migration-0\.58\.99/);
  });
  it("Recherche par nom/code/description", () => {
    expect(src).toMatch(/searchLow/);
    expect(src).toMatch(/nom.*includes.*searchLow/s);
  });
  it("Supprimer détache aussi services_pathologies", () => {
    expect(src).toMatch(/services_pathologies.*delete/s);
  });
});

describe("0.58.99 — SQL pathologies", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.99-pathologies-protocoles.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  it("Crée table pathologies", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS pathologies/);
  });
  it("Crée table services_pathologies (jointure M:N)", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS services_pathologies/);
    expect(sql).toMatch(/PRIMARY KEY \(service_id, pathologie_id\)/);
  });
  it("ALTER patients ADD pathologie_id", () => {
    expect(sql).toMatch(/ALTER TABLE patients ADD COLUMN IF NOT EXISTS pathologie_id/);
  });
  it("RLS permissive structure_id IS NOT NULL", () => {
    expect(sql).toMatch(/pathologies_read_auth/);
    expect(sql).toMatch(/pathologies_write_auth/);
    expect(sql).toMatch(/structure_id IS NOT NULL/);
  });
  it("Seed 8 pathologies PSAD", () => {
    expect(sql).toMatch(/PERFADOM|Perfusion à domicile/);
    expect(sql).toMatch(/NED — Nutrition/);
    expect(sql).toMatch(/NPAD — Nutrition parentérale/);
    expect(sql).toMatch(/PPC.*Apnée/);
    expect(sql).toMatch(/Oxygénothérapie/);
    expect(sql).toMatch(/Cicatrisation/);
    expect(sql).toMatch(/VPH/);
    expect(sql).toMatch(/Dialyse/);
  });
});

describe("0.58.99 — Fix num_serie partout", () => {
  it("Plus de numero_serie dans le code", () => {
    // Walk app/ recursivement et vérifier
    function* walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(full);
        else if (e.name.endsWith(".js") || e.name.endsWith(".jsx")) yield full;
      }
    }
    const offenders = [];
    for (const file of walk(path.resolve(process.cwd(), "app"))) {
      const src = fs.readFileSync(file, "utf-8");
      if (/numero_serie|numero_lot|numero_parc/.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("0.58.99 — Pathologies dans menu TopBar", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
  it("Entrée /pathologies dans menu", () => {
    expect(src).toMatch(/\/pathologies/);
    expect(src).toMatch(/Pathologies & protocoles/);
  });
});

// ============================================================
// Cohérence changelog
// ============================================================
describe("Cohérence changelog 0.58.96 → 0.58.99", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
  ["0.58.96", "0.58.97", "0.58.98", "0.58.99"].forEach(v => {
    it(`${v} présent dans versions-data.js`, () => {
      expect(src).toMatch(new RegExp(`"v":\\s*"${v.replace(/\./g, "\\.")}"`));
    });
    it(`Note HTML ${v} existe`, () => {
      expect(fs.existsSync(path.resolve(process.cwd(), `public/changelog-notes/NOTE-VERSION-Alpha-${v}.html`))).toBe(true);
    });
  });
});
