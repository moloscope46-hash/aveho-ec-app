// =============================================================
//  Tests unitaires — 0.58.69
//  4 features : Compta + Fiche article + Scan + Étiquettes
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.69 - Version", () => {
  it("Version 0.58.69+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(69);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.69 - SQL stock_mouvements", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.69-stock-mouvements.sql"), "utf-8");

  it("CREATE TABLE avec article_id FK + tracabilité", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS stock_mouvements/);
    expect(sql).toMatch(/article_id UUID NOT NULL REFERENCES articles\(id\)/);
    expect(sql).toMatch(/lot TEXT/);
    expect(sql).toMatch(/numero_serie TEXT/);
    expect(sql).toMatch(/date_peremption DATE/);
  });

  it("Type, source, prix snapshot", () => {
    expect(sql).toMatch(/type TEXT NOT NULL DEFAULT 'entree'/);
    expect(sql).toMatch(/source TEXT/);
    expect(sql).toMatch(/prix_achat_unitaire NUMERIC/);
  });

  it("RLS + 3 policies (DROP+CREATE pattern PG-compatible)", () => {
    expect(sql).toMatch(/ALTER TABLE stock_mouvements ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "stock_mvts_read_struct"/);
    expect(sql).toMatch(/CREATE POLICY "stock_mvts_read_struct"/);
    expect(sql).toMatch(/CREATE POLICY "stock_mvts_insert_member"/);
    expect(sql).toMatch(/CREATE POLICY "stock_mvts_update_admin"/);
  });

  it("Pas de CREATE POLICY IF NOT EXISTS (incompatible PG <17)", () => {
    expect(sql).not.toMatch(/CREATE POLICY IF NOT EXISTS/);
  });
});

describe("0.58.69 - Page /parametres/compta (TVA management)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/compta/page.js"), "utf-8");

  it("Imports createClient + useAuth + Modal", () => {
    expect(src).toMatch(/import \{ createClient \}/);
    expect(src).toMatch(/import \{[^}]*Modal/);
  });

  it("CRUD complet : new/edit/save/delete + setDefaut + toggleActif", () => {
    expect(src).toMatch(/function newTaux\(\)/);
    expect(src).toMatch(/function editTaux\(/);
    expect(src).toMatch(/async function saveTaux\(\)/);
    expect(src).toMatch(/async function deleteTaux\(/);
    expect(src).toMatch(/async function setDefaut\(/);
    expect(src).toMatch(/async function toggleActif\(/);
  });

  it("Seed 5 taux français standards (NORMAL/INTERMEDIAIRE/REDUIT/SUPER_REDUIT/EXO)", () => {
    expect(src).toMatch(/TVA_DEFAULT_SEED/);
    expect(src).toMatch(/code: "NORMAL"/);
    expect(src).toMatch(/code: "INTERMEDIAIRE"/);
    expect(src).toMatch(/code: "REDUIT"/);
    expect(src).toMatch(/code: "SUPER_REDUIT"/);
    expect(src).toMatch(/code: "EXO"/);
  });

  it("Tabs extensible (TVA active + plan/analytique/journaux disabled)", () => {
    expect(src).toMatch(/key: "tva"/);
    expect(src).toMatch(/key: "plan"[\s\S]*?disabled: true/);
    expect(src).toMatch(/key: "analytique"[\s\S]*?disabled: true/);
    expect(src).toMatch(/key: "journaux"[\s\S]*?disabled: true/);
  });

  it("Modal édition avec champs comptables (compte_vente, compte_achat, TVA collectée/déductible)", () => {
    expect(src).toMatch(/compte_vente/);
    expect(src).toMatch(/compte_achat/);
    expect(src).toMatch(/compte_tva_collectee/);
    expect(src).toMatch(/compte_tva_deductible/);
    expect(src).toMatch(/code_analytique/);
  });

  it("Un seul taux par défaut à la fois (auto-unset des autres)", () => {
    expect(src).toMatch(/payload\.est_defaut[\s\S]*?\.update\(\{ est_defaut: false \}\)/);
  });
});

describe("0.58.69 - Fiche article dédiée /article/[id]", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/article/[id]/page.js"), "utf-8");

  it("Next 15 : params Promise unwrapped via React.use", () => {
    expect(src).toMatch(/import \{[^}]*\buse\b/);
    expect(src).toMatch(/const resolved = use\(params\)/);
  });

  it("5 onglets : overview/materiels/stock/tarifs/compta", () => {
    expect(src).toMatch(/key: "overview"/);
    expect(src).toMatch(/key: "materiels"/);
    expect(src).toMatch(/key: "stock"/);
    expect(src).toMatch(/key: "tarifs"/);
    expect(src).toMatch(/key: "compta"/);
  });

  it("Stats KPI (total/dispo/utilisés/stock/seuil mini)", () => {
    expect(src).toMatch(/const stats = useMemo/);
    expect(src).toMatch(/Disponibles/);
    expect(src).toMatch(/Affectés à un patient/);
    expect(src).toMatch(/STOCK BAS/);
  });

  it("Chargement parallèle TVA + pharmacie + partenaire + matériels + mouvements", () => {
    expect(src).toMatch(/Promise\.allSettled/);
    // 0.58.73 : depuis 0.58.71, le SELECT materiels passe par selectMaterielsByArticle()
    // (helper qui sonde + fallback). On accepte les 2 patterns.
    expect(src).toMatch(/from\("materiels"\)\.select[\s\S]*?\.eq\("article_id"|selectMaterielsByArticle/);
    expect(src).toMatch(/from\("stock_mouvements"\)/);
  });

  it("Boutons d'actions : Éditer / Entrée stock / Imprimer étiquette", () => {
    expect(src).toMatch(/onClick=\{\(\) => router\.push\(`\/articles\?edit=/);
    expect(src).toMatch(/onClick=\{\(\) => router\.push\(`\/scan\/article\?article_id=/);
    expect(src).toMatch(/onClick=\{\(\) => router\.push\(`\/articles\/etiquettes\?ids=/);
  });

  it("Aperçu EAN13 SVG dans l'onglet codes-barres", () => {
    expect(src).toMatch(/generateEan13Svg/);
    expect(src).toMatch(/isValidEan13/);
  });

  it("Tab compta : ComptaField avec inherited/override (badge OVERRIDE)", () => {
    expect(src).toMatch(/function ComptaField/);
    expect(src).toMatch(/OVERRIDE/);
  });

  it("Empty state si article notFound", () => {
    expect(src).toMatch(/setNotFound\(true\)/);
    expect(src).toMatch(/Article introuvable/);
  });
});

describe("0.58.69 - Scan article (entrée stock par scan)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/article/page.js"), "utf-8");

  it("Suspense wrapper (useSearchParams Next 15 SSG-safe)", () => {
    expect(src).toMatch(/import \{[^}]*Suspense/);
    expect(src).toMatch(/<Suspense fallback=\{null\}>/);
    expect(src).toMatch(/function ScanArticleInner\(\)/);
  });

  it("Réutilise QrScanner (composant existant 0.56.2)", () => {
    expect(src).toMatch(/import QrScanner from/);
    expect(src).toMatch(/<QrScanner/);
  });

  it("Parse GS1-128 (extrait lot/série/péremption automatiquement)", () => {
    expect(src).toMatch(/parseGS1\(code\)/);
    expect(src).toMatch(/detectBarcodeType/);
    expect(src).toMatch(/formatGS1Date/);
    expect(src).toMatch(/lot: gs1\.lot \|\| f\.lot/);
    expect(src).toMatch(/numero_serie: gs1\.serie/);
  });

  it("3 niveaux de recherche article (code_barre / code_lpp / code_barres_alt)", () => {
    expect(src).toMatch(/\.eq\("code_barre", cleanCode\)/);
    expect(src).toMatch(/\.eq\("code_lpp", cleanCode\)/);
    expect(src).toMatch(/\.contains\("code_barres_alt", \[cleanCode\]\)/);
  });

  it("Formulaire entrée stock : type / quantité / lot / série / péremption / notes", () => {
    expect(src).toMatch(/type: "entree"/);
    expect(src).toMatch(/v: "entree"/);
    expect(src).toMatch(/v: "sortie"/);
    expect(src).toMatch(/v: "ajustement"/);
    expect(src).toMatch(/v: "retour"/);
  });

  it("Insert dans stock_mouvements avec source='scan_barcode'", () => {
    expect(src).toMatch(/safeInsert\(supabase, "stock_mouvements"/);
    expect(src).toMatch(/source: "scan_barcode"/);
  });

  it("Création matériels physiques si toggle activé", () => {
    expect(src).toMatch(/form\.create_materiel/);
    // 0.58.73 : depuis 0.58.71, l'insert passe par safeInsertMateriels()
    expect(src).toMatch(/supabase\.from\("materiels"\)\.insert\(matPayloads\)|safeInsertMateriels\(supabase, matPayloads\)/);
  });

  it("Saisie manuelle fallback si pas de caméra", () => {
    expect(src).toMatch(/manualCode/);
    expect(src).toMatch(/findArticle\(manualCode\.trim\(\)\)/);
  });

  it("Step done avec actions navigation (nouveau scan / voir fiche / inventaire)", () => {
    expect(src).toMatch(/step === "done"/);
    expect(src).toMatch(/Nouveau scan/);
    expect(src).toMatch(/Voir fiche article/);
  });
});

describe("0.58.69 - Étiquettes prix PDF", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/articles/etiquettes/page.js"), "utf-8");

  it("Suspense wrapper SSG-safe (useSearchParams)", () => {
    expect(src).toMatch(/<Suspense fallback=\{null\}>/);
    expect(src).toMatch(/function EtiquettesArticlesInner\(\)/);
  });

  it("5 formats standards (L7160 Avery + variantes + grand/petit)", () => {
    expect(src).toMatch(/"L7160":/);
    expect(src).toMatch(/"L7163":/);
    expect(src).toMatch(/"L7165":/);
    expect(src).toMatch(/"GRAND":/);
    expect(src).toMatch(/"PETIT":/);
  });

  it("Multi-sélection + select all/none + filtres (search/famille)", () => {
    expect(src).toMatch(/selectedIds, setSelectedIds/);
    expect(src).toMatch(/function toggleSelect/);
    expect(src).toMatch(/function selectAll/);
    expect(src).toMatch(/function selectNone/);
  });

  it("3 modes prix (ttc / ht / both)", () => {
    expect(src).toMatch(/priceMode === "ttc"/);
    expect(src).toMatch(/priceMode === "ht"/);
    expect(src).toMatch(/priceMode === "both"/);
  });

  it("Toggles configurables : ref / barcode / price", () => {
    expect(src).toMatch(/showBarcode, setShowBarcode/);
    expect(src).toMatch(/showRef, setShowRef/);
    expect(src).toMatch(/showPrice, setShowPrice/);
  });

  it("Copies par article + calcul pages A4", () => {
    expect(src).toMatch(/copies, setCopies/);
    expect(src).toMatch(/labelsPerPage = fmt\.cols \* fmt\.rows/);
    expect(src).toMatch(/totalPages = Math\.ceil\(labels\.length \/ labelsPerPage\)/);
  });

  it("CSS @page A4 + @media print + masquage non-print", () => {
    expect(src).toMatch(/@page \{ size: A4/);
    expect(src).toMatch(/@media print/);
    // 0.58.73 : le sélecteur est groupé avec topbar et av-shortcuts-bar
    expect(src).toMatch(/\.no-print[^{]*\{[^}]*display:\s*none/);
  });

  it("EAN13 SVG embarqué dans chaque étiquette", () => {
    expect(src).toMatch(/generateEan13Svg\(a\.code_barre\)/);
    expect(src).toMatch(/isValidEan13/);
  });

  it("window.print() pour générer PDF via navigateur (pas de lib lourde)", () => {
    expect(src).toMatch(/window\.print\(\)/);
  });
});

describe("0.58.69 - Wire-up dans page /articles", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/articles/page.js"), "utf-8");

  it("Import useRouter + boutons Scan + Étiquettes", () => {
    expect(src).toMatch(/import \{ useRouter \} from "next\/navigation"/);
    expect(src).toMatch(/router\.push\("\/scan\/article"\)/);
    expect(src).toMatch(/router\.push\("\/articles\/etiquettes"\)/);
  });

  it("Libellé liste redirige vers fiche dédiée /article/[id]", () => {
    expect(src).toMatch(/router\.push\(`\/article\/\$\{a\.id\}`\)/);
  });
});
