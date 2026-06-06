// =============================================================
//  Tests unitaires — 0.58.53
//  Modal SIRET + Réorga menu + Objectifs kanban + Tables partenaires + Pharmacies
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.53 - Version", () => {
  it("Version 0.58.53+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(53);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.53 - Modal validation SIRET", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/collectivite/page.js"), "utf-8");

  it("Détection changement SIRET (oldSiret vs newSiret)", () => {
    expect(src).toMatch(/const oldSiret = fiche\?\.siret/);
    expect(src).toMatch(/const newSiret = form\.siret\?\.trim\(\)/);
    expect(src).toMatch(/newSiret !== oldSiret/);
  });

  it("dialogs.confirm avec variant danger + okColor rouge", () => {
    expect(src).toMatch(/dialogs\.confirm\(\{[\s\S]*?title:\s*["']Modification du SIRET["']/);
    expect(src).toMatch(/variant:\s*["']danger["']/);
    expect(src).toMatch(/okColor:\s*["']#c0392b["']/);
  });

  it("Message liste les impacts (AMC, SESAM-Vitale, conventions)", () => {
    expect(src).toMatch(/AMC.*SESAM-Vitale/i);
    expect(src).toMatch(/conventions/i);
  });
});

describe("0.58.53 - Réorganisation menu", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");

  it("Section 'Groupement' présente (renommée depuis 'Collectivité')", () => {
    expect(src).toMatch(/section:\s*["']Groupement["']/);
  });

  it("Section 'Mes partenaires' présente", () => {
    expect(src).toMatch(/section:\s*["']Mes partenaires["']/);
  });

  it("Items partenaires avec query type=prescripteur/infirmiere/pharmacie", () => {
    expect(src).toMatch(/\/partenaires-rpps\?type=prescripteur/);
    expect(src).toMatch(/\/partenaires-rpps\?type=infirmiere/);
    expect(src).toMatch(/\/partenaires-rpps\?type=pharmacie/);
  });

  it("Liens annuaires officiels dans Mes partenaires (préfixe 🔍)", () => {
    expect(src).toMatch(/🔍 Annuaire RPPS/);
    expect(src).toMatch(/🔍 Annuaire étabs/);
  });

  it("Items hiérarchie organisationnelle dans Groupement", () => {
    expect(src).toMatch(/lbl:\s*["']Établissements["']/);
    expect(src).toMatch(/Bâtiments \/ Services/);
    expect(src).toMatch(/lbl:\s*["']Équipes["']/);
  });
});

describe("0.58.53 - Objectifs dans HeroDashboard (kanban)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"), "utf-8");

  it("Helper getGoalsLocal", () => {
    expect(src).toMatch(/function getGoalsLocal/);
    expect(src).toMatch(/GOALS_STORAGE_KEY\s*=\s*["']av-personal-goals["']/);
  });

  it("State goals + setGoals dans le composant", () => {
    expect(src).toMatch(/const \[goals, setGoals\]\s*=\s*useState/);
  });

  it("Listen à l'event av-goals-changed", () => {
    expect(src).toMatch(/window\.addEventListener\(["']av-goals-changed["']/);
  });

  it("Section conditionnelle si goals.length > 0", () => {
    expect(src).toMatch(/\{goals\.length > 0 && \(/);
  });

  it("Affiche compteur X/N atteints", () => {
    expect(src).toMatch(/goals\.filter\(g => g\.current >= g\.target\)\.length/);
    expect(src).toMatch(/atteints/);
  });

  it("Grille auto-fit (responsive kanban)", () => {
    expect(src).toMatch(/gridTemplateColumns:\s*["']repeat\(auto-fit,\s*minmax\(260px/);
  });
});

describe("0.58.53 - Event av-goals-changed dispatché", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("saveGoals dispatche av-goals-changed", () => {
    expect(src).toMatch(/dispatchEvent\(new CustomEvent\(["']av-goals-changed["']/);
  });
});

describe("0.58.53 - SQL extension partenaires", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.53-partenaires-types.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("Ajout colonne est_pharmacien", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS est_pharmacien BOOLEAN/);
  });

  it("Index sur types pour filtres rapides", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE INDEX[\s\S]*?idx_partenaires_rpps_types/);
  });
});

describe("0.58.53 - /partenaires-rpps : query param ?type=", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/partenaires-rpps/page.js"), "utf-8");

  it("Wrapper Suspense + useSearchParams", () => {
    expect(src).toMatch(/import \{[\s\S]*?Suspense[\s\S]*?\} from ["']react["']/);
    expect(src).toMatch(/useSearchParams/);
    expect(src).toMatch(/<Suspense fallback/);
  });

  it("typeFromUrl lu depuis ?type=", () => {
    expect(src).toMatch(/searchParams\.get\(["']type["']\)/);
  });

  it("filterTag initialisé depuis typeFromUrl (prescripteur/infirmiere/pharmacie)", () => {
    expect(src).toMatch(/initialTag = typeFromUrl === ["']prescripteur["'] \|\| typeFromUrl === ["']infirmiere["']/);
  });

  it("Filtre infirmiere avec regex infirm|ide|idel", () => {
    expect(src).toMatch(/match\(\/infirm\|ide\\b\|idel\/i\)/);
  });

  it("Filtre pharmacie via est_pharmacien", () => {
    expect(src).toMatch(/filterTag === ["']pharmacie["'] && !p\.est_pharmacien/);
  });

  it("Auto-détection est_pharmacien depuis profession sur ajout", () => {
    expect(src).toMatch(/est_pharmacien:[\s\S]*?match\(\/pharmac\/i\)/);
  });

  it("Boutons filtres : 4 options (all/prescripteur/infirmiere/pharmacie/intervenant)", () => {
    expect(src).toMatch(/k:\s*["']all["']/);
    expect(src).toMatch(/k:\s*["']prescripteur["']/);
    expect(src).toMatch(/k:\s*["']infirmiere["']/);
    expect(src).toMatch(/k:\s*["']pharmacie["']/);
  });
});
