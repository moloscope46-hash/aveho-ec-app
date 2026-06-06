// =============================================================
//  Tests unitaires — 0.58.48
//  Hotfix vue stats + robustesse + auto-suggestion d'icône
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.48 - Version", () => {
  it("Version 0.58.48+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(48);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.48 - Hotfix : stats DI robustes aux vues manquantes", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/statistiques-interventions/page.js"), "utf-8");

  it("Helper safeViewQuery(viewName, builderFn) défini", () => {
    expect(src).toMatch(/async function safeViewQuery/);
  });

  it("Catch PGRST205 / 42P01 / 'not found' → console.warn + null", () => {
    expect(src).toMatch(/PGRST205/);
    expect(src).toMatch(/42P01/);
    expect(src).toMatch(/not found/i);
    expect(src).toMatch(/console\.warn/);
  });

  it("Les 6 vues sont appelées via safeViewQuery (pas direct)", () => {
    const matches = src.match(/safeViewQuery\(["']v_stats_di_/g) || [];
    expect(matches.length).toBe(6);
  });

  it("Plus aucun appel direct supabase.from(\"v_stats_di_*\") dans load()", () => {
    const loadMatch = src.match(/async function load\(\)[\s\S]*?setLoading\(false\);\s*\}/);
    expect(loadMatch).toBeTruthy();
    if (loadMatch) {
      expect(loadMatch[0]).not.toMatch(/supabase\.from\(["']v_stats_di_/);
    }
  });
});

describe("0.58.48 - SQL migration vues stats", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.48-stats-di-views.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("Crée v_stats_di_top_demandeurs (celle qui manquait en prod)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE OR REPLACE VIEW v_stats_di_top_demandeurs/);
  });

  it("Crée les 6 vues stats DI", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    ["v_stats_di_global", "v_stats_di_par_type", "v_stats_di_par_urgence",
     "v_stats_di_heatmap", "v_stats_di_top_demandeurs", "v_stats_di_par_mois"]
      .forEach(view => {
        expect(sql).toMatch(new RegExp(`CREATE OR REPLACE VIEW ${view}`));
      });
  });
});

describe("0.58.48 - Auto-suggestion d'icône depuis le libellé", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/IconPicker.js"), "utf-8");

  it("Fonction suggestIcon(label) exportée", () => {
    expect(src).toMatch(/export function suggestIcon/);
  });

  it("Dictionnaire SUGGESTION_KEYWORDS avec ≥30 entrées icône→keywords", () => {
    expect(src).toMatch(/const SUGGESTION_KEYWORDS\s*=/);
    // Compte les entrées (clés de l'objet)
    const dictMatch = src.match(/const SUGGESTION_KEYWORDS = \{([\s\S]*?)\n\};/);
    expect(dictMatch).toBeTruthy();
    if (dictMatch) {
      const entries = dictMatch[1].match(/^\s*"ti-/gm) || [];
      expect(entries.length).toBeGreaterThanOrEqual(30);
    }
  });

  it("Catégories pertinentes PSAD : ti-stethoscope, ti-wheelchair, ti-bolt, ti-tools, ti-shield-check", () => {
    expect(src).toMatch(/"ti-stethoscope":\s*\[/);
    expect(src).toMatch(/"ti-wheelchair":\s*\[/);
    expect(src).toMatch(/"ti-bolt":\s*\[/);
    expect(src).toMatch(/"ti-tools":\s*\[/);
    expect(src).toMatch(/"ti-shield-check":\s*\[/);
  });

  it("Tri par longueur de keyword (longest match first)", () => {
    expect(src).toMatch(/entries\.sort\(\(a, b\) => b\.len - a\.len\)/);
  });

  it("Insensible à la casse (toLowerCase)", () => {
    expect(src).toMatch(/label\.toLowerCase\(\)\.trim\(\)/);
  });

  it("Prop suggestFor dans IconPicker", () => {
    expect(src).toMatch(/suggestFor\s*=\s*null/);
    expect(src).toMatch(/suggested\s*=\s*suggestFor \?/);
  });

  it("Bannière suggestion affichée si suggested !== value", () => {
    expect(src).toMatch(/suggested && suggested !== value/);
    expect(src).toMatch(/Suggestion :/);
  });

  it("Bouton 'Utiliser' appelle onChange(suggested)", () => {
    expect(src).toMatch(/onChange\(suggested\)/);
  });
});

describe("0.58.48 - Branchement suggestFor dans les 3 pages", () => {
  it("/tags-materiel : suggestFor={form.libelle}", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/tags-materiel/page.js"), "utf-8");
    expect(src).toMatch(/suggestFor=\{form\.libelle\}/);
  });

  it("/etiquettes : suggestFor={form.libelle}", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/etiquettes/page.js"), "utf-8");
    expect(src).toMatch(/suggestFor=\{form\.libelle\}/);
  });

  it("/annonces : suggestFor combine titre + message", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/annonces/page.js"), "utf-8");
    expect(src).toMatch(/suggestFor=\{`\$\{form\.titre \|\| ["']{2}\} \$\{form\.message \|\| ["']{2}\}`\}/);
  });
});
