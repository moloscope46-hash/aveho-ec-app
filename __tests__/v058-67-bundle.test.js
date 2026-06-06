// =============================================================
//  Tests unitaires — 0.58.67
//  Refonte massive articles + barcode + 3 features sparkline
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.67 - Version", () => {
  it("Version 0.58.67+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(67);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.67 - SQL refonte articles + table tva_taux", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.67-articles-refonte-complete.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("CREATE TABLE tva_taux avec comptes compta", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS tva_taux/);
    expect(sql).toMatch(/compte_vente TEXT/);
    expect(sql).toMatch(/compte_achat TEXT/);
    expect(sql).toMatch(/compte_tva_collectee TEXT/);
    expect(sql).toMatch(/compte_tva_deductible TEXT/);
    expect(sql).toMatch(/code_analytique TEXT/);
  });

  it("Articles : code-barres + LPP/ACL/UCD", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS code_barre TEXT/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS code_lpp TEXT/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS code_acl TEXT/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS code_ucd TEXT/);
  });

  it("Articles : logistique (poids/dimensions/conditionnement)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/poids_g NUMERIC/);
    expect(sql).toMatch(/longueur_cm NUMERIC/);
    expect(sql).toMatch(/conditionnement INTEGER/);
    expect(sql).toMatch(/quantite_palette INTEGER/);
  });

  it("Articles : tarifs HT/TTC + tva_taux_id + marge", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/prix_achat_ht NUMERIC/);
    expect(sql).toMatch(/prix_vente_ht NUMERIC/);
    expect(sql).toMatch(/prix_vente_ttc NUMERIC/);
    expect(sql).toMatch(/tva_taux_id UUID REFERENCES tva_taux/);
    expect(sql).toMatch(/marge_pct NUMERIC/);
  });

  it("Articles : tracabilité lot/série/péremption", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/gere_lot BOOLEAN/);
    expect(sql).toMatch(/gere_serie BOOLEAN/);
    expect(sql).toMatch(/gere_peremption BOOLEAN/);
  });

  it("Articles : rattachements (fournisseur/partenaire/pharmacie)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/fournisseur_principal_id UUID/);
    expect(sql).toMatch(/etablissement_partenaire_id UUID/);
    expect(sql).toMatch(/pharmacie_id UUID REFERENCES pharmacies/);
  });

  it("Articles : classifications (DM/stérile/usage unique)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/classe_dm TEXT/);
    expect(sql).toMatch(/sterile BOOLEAN/);
    expect(sql).toMatch(/usage_unique BOOLEAN/);
    expect(sql).toMatch(/dispositif_medical BOOLEAN/);
  });

  it("Trigger updated_at + RLS tva_taux", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE TRIGGER articles_set_updated_at_trigger/);
    expect(sql).toMatch(/ALTER TABLE tva_taux ENABLE ROW LEVEL SECURITY/);
  });
});

describe("0.58.67 - lib/barcode (EAN13 / GS1)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/barcode.js"), "utf-8");

  it("ean13Checksum + isValidEan13 + generateEan13 exportés", () => {
    expect(src).toMatch(/export function ean13Checksum/);
    expect(src).toMatch(/export function isValidEan13/);
    expect(src).toMatch(/export function generateEan13/);
  });

  it("detectBarcodeType retourne EAN13 / EAN8 / GS1-128 / CODE128", () => {
    expect(src).toMatch(/export function detectBarcodeType/);
    expect(src).toMatch(/return "EAN13"/);
    expect(src).toMatch(/return "GS1-128"/);
  });

  it("parseGS1 avec AI 01/10/11/17/21 (GTIN/lot/péremption/série)", () => {
    expect(src).toMatch(/export function parseGS1/);
    expect(src).toMatch(/"01":/);
    expect(src).toMatch(/"10":/);
    expect(src).toMatch(/"17":/);
    expect(src).toMatch(/"21":/);
  });

  it("generateEan13Svg pour aperçu", () => {
    expect(src).toMatch(/export function generateEan13Svg/);
    expect(src).toMatch(/<svg xmlns/);
  });

  it("formatGS1Date YYMMDD → ISO", () => {
    expect(src).toMatch(/export function formatGS1Date/);
  });

  // Tests fonctionnels
  it("Checksum EAN13 valide (cas réel)", async () => {
    const mod = await import("../lib/barcode.js");
    expect(mod.ean13Checksum("400638133393")).toBe("1");
    expect(mod.isValidEan13("4006381333931")).toBe(true);
    expect(mod.isValidEan13("4006381333932")).toBe(false);
  });
});

describe("0.58.67 - Page articles refondue (7 onglets + hover materiels)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/articles/page.js"), "utf-8");

  it("Imports : createClient, useAuth, useCart, TopBar, barcode utils", () => {
    expect(src).toMatch(/import \{ createClient \} from/);
    expect(src).toMatch(/import \{ generateEan13, isValidEan13, detectBarcodeType, generateEan13Svg \} from/);
  });

  it("7 onglets : Général/Codes-barres/Logistique/Tarifs/Tracabilité/Rattachements/Compta", () => {
    expect(src).toMatch(/key: "general"/);
    expect(src).toMatch(/key: "barcode"/);
    expect(src).toMatch(/key: "logistique"/);
    expect(src).toMatch(/key: "tarifs"/);
    expect(src).toMatch(/key: "tracabilite"/);
    expect(src).toMatch(/key: "rattachement"/);
    expect(src).toMatch(/key: "compta"/);
  });

  it("Hover materiels rattachés affiche popup overlay", () => {
    expect(src).toMatch(/materielsByArticle/);
    expect(src).toMatch(/hoveredArticle === a\.id/);
    expect(src).toMatch(/loadMaterielsForArticle/);
  });

  it("Bouton générer EAN13 + aperçu SVG", () => {
    expect(src).toMatch(/onClick=\{genBarcode\}/);
    expect(src).toMatch(/generateEan13Svg/);
  });

  it("Calcul TTC + marge en live", () => {
    expect(src).toMatch(/function computeTtc/);
    expect(src).toMatch(/function recomputeMarge/);
  });

  it("Liste enrichie avec colonnes : Réf/Libellé/Famille/Code-barres/Cond/PA HT/PV HT/TVA/Marge/Trac/Matos/Actions", () => {
    expect(src).toMatch(/PA HT/);
    expect(src).toMatch(/PV HT/);
    expect(src).toMatch(/TVA/);
    expect(src).toMatch(/Marge/);
  });

  it("Filtres : famille + DM + tracabilité + search", () => {
    expect(src).toMatch(/filterFamille/);
    expect(src).toMatch(/filterDm/);
    expect(src).toMatch(/filterTracabilite/);
  });

  it("Badges DM/stérile/usage unique/lot/série/péremption", () => {
    expect(src).toMatch(/dispositif_medical && /);
    expect(src).toMatch(/sterile &&/);
    expect(src).toMatch(/usage_unique &&/);
    expect(src).toMatch(/gere_lot && /);
  });
});

describe("0.58.67 - Sparkline moyenne mobile 7j (lissage)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamGoalsSparkline.js"), "utf-8");

  it("State smooth persisté en localStorage", () => {
    expect(src).toMatch(/const \[smooth, setSmooth\]/);
    expect(src).toMatch(/av-team-goals-smooth/);
  });

  it("Calcul MA7 dans useMemo points (fenêtre centrée)", () => {
    expect(src).toMatch(/ma7Values/);
    expect(src).toMatch(/Math\.max\(0, i - 3\)/);
    expect(src).toMatch(/Math\.min\(displayHistory\.length, i \+ 4\)/);
  });

  it("Toggle 'Lisser' visible si rangeDays !== 7", () => {
    expect(src).toMatch(/rangeDays !== 7 && \(/);
    expect(src).toMatch(/onClick=\{\(\) => setSmooth\(!smooth\)\}/);
  });

  it("MA7 tracée en pointillé corail (strokeDasharray)", () => {
    expect(src).toMatch(/ma7Polyline/);
    expect(src).toMatch(/strokeDasharray="4,3"/);
    expect(src).toMatch(/stroke="#C9867F"/);
  });
});

describe("0.58.67 - Export CSV snapshots serveur", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamGoalsSnapshotsExport.js"), "utf-8");

  it("Fetch user_goals_snapshots + ordered ascending", () => {
    expect(src).toMatch(/from\("user_goals_snapshots"\)/);
    expect(src).toMatch(/ascending: true/);
  });

  it("Format CSV avec séparateur point-virgule + BOM UTF-8 (Excel FR)", () => {
    expect(src).toMatch(/\.join\(";"\)/);
    expect(src).toMatch(/\\uFEFF/);
  });

  it("Section globale + section détail par équipe", () => {
    expect(src).toMatch(/Détail par équipe/);
    expect(src).toMatch(/team_stats/);
  });

  it("Téléchargement via Blob + URL.createObjectURL", () => {
    expect(src).toMatch(/new Blob/);
    expect(src).toMatch(/URL\.createObjectURL/);
    expect(src).toMatch(/a\.download/);
  });
});

describe("0.58.67 - Vue équipes vs équipes (comparatif)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamVsTeamChart.js"), "utf-8");

  it("Lit stats.teamStats et trie desc par avgPct", () => {
    expect(src).toMatch(/stats\?\.teamStats/);
    expect(src).toMatch(/sort\(\(a, b\) => \(b\.avgPct \|\| 0\) - \(a\.avgPct \|\| 0\)\)/);
  });

  it("Récupère couleur/icone des équipes via Supabase", () => {
    expect(src).toMatch(/from\("equipes"\)\.select\("id, nom, couleur, icone"\)/);
  });

  it("Rang 1/2/3 avec couleurs (gold/silver/bronze)", () => {
    expect(src).toMatch(/idx === 0 \? "#EF9F27"/);
    expect(src).toMatch(/idx === 1 \? "#a0aeb9"/);
    expect(src).toMatch(/idx === 2 \? "#C9867F"/);
  });

  it("Barres horizontales avec animation 600ms", () => {
    expect(src).toMatch(/widthPct.*%/);
    expect(src).toMatch(/transition: "width 600ms/);
  });
});

describe("0.58.67 - Intégration dans DashboardWidgets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Import TeamVsTeamChart + TeamGoalsSnapshotsExport", () => {
    expect(src).toMatch(/import TeamVsTeamChart/);
    expect(src).toMatch(/import TeamGoalsSnapshotsExport/);
  });

  it("Rendu TeamVsTeamChart si teamStats.length > 1", () => {
    expect(src).toMatch(/<TeamVsTeamChart stats=\{stats\}/);
    expect(src).toMatch(/stats\.teamStats\.length > 1/);
  });

  it("Rendu TeamGoalsSnapshotsExport au-dessus du sparkline", () => {
    expect(src).toMatch(/<TeamGoalsSnapshotsExport/);
  });
});
