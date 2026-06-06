// =============================================================
//  Tests unitaires — 0.58.72
//  - HOTFIX édition fiche article (helper safeSaveArticle)
//  - HOTFIX caméra noire (bouton "Activer caméra" + diagnostic)
//  - BackButton réutilisable
//  - SQL articles : prix location, tags article, fournisseurs, LPP, materiel_locations
//  - QR matériel imprimable + page scan/quick avec 4 actions
//  - 3 nouveaux onglets fiche article : Location / Fournisseurs / Tags
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.72 - Version + SW", () => {
  it("Version 0.58.72+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(72);
    }
  });
  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.72 - lib/articles.js (sondes + safeSaveArticle)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/articles.js"), "utf-8");

  it("Sondes 8 groupes de colonnes", () => {
    expect(src).toMatch(/articlesHasTvaTauxId/);
    expect(src).toMatch(/articlesHasCodesProduits/);
    expect(src).toMatch(/articlesHasGereLotSerie/);
    expect(src).toMatch(/articlesHasFournisseur/);
    expect(src).toMatch(/articlesHasClassifications/);
    expect(src).toMatch(/articlesHasComptaOverride/);
    expect(src).toMatch(/articlesHasLocation/);
    expect(src).toMatch(/articlesHasMarge/);
  });
  it("Cache module-level + reset", () => {
    expect(src).toMatch(/_cache\s*=\s*\{/);
    expect(src).toMatch(/export function resetArticlesProbeCache/);
  });
  it("probeArticleCaps Promise.all", () => {
    expect(src).toMatch(/export async function probeArticleCaps/);
    expect(src).toMatch(/Promise\.all/);
  });
  it("stripArticlePayload retire les colonnes absentes", () => {
    expect(src).toMatch(/export function stripArticlePayload/);
    expect(src).toMatch(/if \(!caps\.tvaTauxId\)/);
    expect(src).toMatch(/if \(!caps\.location\)/);
  });
  it("safeSaveArticle insert/update avec strip auto", () => {
    expect(src).toMatch(/export async function safeSaveArticle/);
    expect(src).toMatch(/articles.*insert.*cleanPayload/s);
    expect(src).toMatch(/articles.*update.*cleanPayload/s);
  });
});

describe("0.58.72 - SQL migration multi-features", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.72-articles-tags-fournisseurs-lpp.sql"), "utf-8");

  it("Articles : prix location par période", () => {
    expect(sql).toMatch(/prix_location_jour NUMERIC/);
    expect(sql).toMatch(/prix_location_semaine NUMERIC/);
    expect(sql).toMatch(/prix_location_mois NUMERIC/);
    expect(sql).toMatch(/prix_location_trimestre NUMERIC/);
    expect(sql).toMatch(/louable BOOLEAN/);
  });
  it("Table tags_article + surcharges prix", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS tags_article/);
    expect(sql).toMatch(/surcharge_prix_vente_pct/);
    expect(sql).toMatch(/prix_vente_fixe/);
  });
  it("Table article_tags + RLS DROP+CREATE (compat PG<17)", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS article_tags/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "article_tags_read_struct"/);
    expect(sql).not.toMatch(/CREATE POLICY IF NOT EXISTS/);
  });
  it("Table article_fournisseurs + unique constraint prioritaire", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS article_fournisseurs/);
    expect(sql).toMatch(/est_prioritaire BOOLEAN/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_art_four_priori[\s\S]+est_prioritaire = true/);
  });
  it("Table lpp_codes + extension pg_trgm pour autocomplete", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS lpp_codes/);
    expect(sql).toMatch(/code TEXT PRIMARY KEY/);
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pg_trgm/);
    expect(sql).toMatch(/gin_trgm_ops/);
  });
  it("Table materiel_locations + statut + RLS", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS materiel_locations/);
    expect(sql).toMatch(/periode_facturation TEXT NOT NULL/);
    expect(sql).toMatch(/statut TEXT NOT NULL DEFAULT 'en_cours'/);
  });
});

describe("0.58.72 - QrScanner fix caméra noire (bouton activation)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/QrScanner.js"), "utf-8");

  it("Prop requireUserStart pour démarrage explicite", () => {
    expect(src).toMatch(/requireUserStart = false/);
  });
  it("Status 'waiting_start' avec bouton 'Activer la caméra'", () => {
    expect(src).toMatch(/status === "waiting_start"/);
    expect(src).toMatch(/Activer la caméra/);
  });
  it("Status 'denied' avec message permission", () => {
    expect(src).toMatch(/status === "denied"/);
    expect(src).toMatch(/Permission caméra refusée/);
  });
  it("Diagnostic d'erreur détaillé (permission/notfound/https)", () => {
    expect(src).toMatch(/permission\|denied\|notallow/);
    expect(src).toMatch(/not.*found\|nodevices\|nocamera/);
    expect(src).toMatch(/secure\|https/);
  });
  it("Bouton Réessayer après erreur", () => {
    expect(src).toMatch(/Réessayer/);
  });
});

describe("0.58.72 - BackButton réutilisable", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/BackButton.js"), "utf-8");

  it("Composant avec 3 variants (ghost/filled/inline)", () => {
    expect(src).toMatch(/variant = "ghost"/);
    expect(src).toMatch(/styles = \{[\s\S]*ghost:[\s\S]*filled:[\s\S]*inline:/);
  });
  it("router.back() par défaut ou href custom", () => {
    expect(src).toMatch(/if \(href\) router\.push\(href\);[\s\S]+else router\.back/);
  });

  it("BackButton intégré dans pages clés", () => {
    const pages = [
      "app/article/[id]/page.js",
      "app/materiel/[id]/page.js",
      "app/scan/article/page.js",
      "app/scan/materiel/page.js",
      "app/scan/quick/page.js",
      "app/parametres/compta/page.js",
      "app/articles/etiquettes/page.js",
    ];
    pages.forEach(p => {
      const s = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(s).toMatch(/import BackButton/);
      expect(s).toMatch(/<BackButton/);
    });
  });
});

describe("0.58.72 - QR matériel imprimable + lib/barcode étendu", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/barcode.js"), "utf-8");

  it("generateQrCodeUrl utilise qrserver.com API", () => {
    expect(src).toMatch(/export function generateQrCodeUrl/);
    expect(src).toMatch(/api\.qrserver\.com/);
  });
  it("generateQrLabelHtml pour étiquette imprimable", () => {
    expect(src).toMatch(/export function generateQrLabelHtml/);
  });
  it("Fiche matériel : bouton Imprimer + openQrPrintWindow", () => {
    const mat = fs.readFileSync(path.resolve(process.cwd(), "app/materiel/[id]/page.js"), "utf-8");
    expect(mat).toMatch(/openQrPrintWindow/);
    expect(mat).toMatch(/generateQrCodeUrl/);
    expect(mat).toMatch(/window\.print/);
  });
});

describe("0.58.72 - Page /scan/quick (popup actions)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/quick/page.js"), "utf-8");

  it("Suspense wrapper pour useSearchParams", () => {
    expect(src).toMatch(/<Suspense fallback/);
  });
  it("4 actions disponibles (di, retour_loc, echange, rebut)", () => {
    expect(src).toMatch(/"di":/);
    expect(src).toMatch(/"retour_loc":/);
    expect(src).toMatch(/"echange":/);
    expect(src).toMatch(/"rebut":/);
  });
  it("Extraction materielId depuis URL ou UUID raw", () => {
    expect(src).toMatch(/function extractMaterielId/);
    expect(src).toMatch(/m=\(\[0-9a-f-\]\{36\}\)/);
  });
  it("DI : INSERT dans table interventions", () => {
    expect(src).toMatch(/safeInsert\(supabase, "interventions"/);
    expect(src).toMatch(/origine: "scan_qr"/);
  });
  it("Retour location : clôture materiel_locations + libère matériel", () => {
    expect(src).toMatch(/safeUpdate\(supabase, "materiel_locations"/);
    expect(src).toMatch(/statut: "terminee"/);
    expect(src).toMatch(/etat: "Disponible"/);
  });
  it("Rebut : update etat='Rebut' + date_rebut auto", () => {
    expect(src).toMatch(/etat: "Rebut"/);
    expect(src).toMatch(/date_rebut: new Date\(\)/);
  });
  it("Composant ActionCard avec disabled + ActionField avec multiline", () => {
    expect(src).toMatch(/function ActionCard/);
    expect(src).toMatch(/function ActionField/);
  });
});

describe("0.58.72 - Fiche article : 3 nouveaux onglets", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/article/[id]/page.js"), "utf-8");

  it("Onglet location avec 4 LocCard par période", () => {
    expect(src).toMatch(/key: "location"/);
    expect(src).toMatch(/prix_location_jour/);
    expect(src).toMatch(/prix_location_semaine/);
    expect(src).toMatch(/prix_location_mois/);
    expect(src).toMatch(/function LocCard/);
  });
  it("Onglet fournisseurs avec table multi + flag prioritaire", () => {
    expect(src).toMatch(/key: "fournisseurs"/);
    expect(src).toMatch(/article_fournisseurs/);
    expect(src).toMatch(/est_prioritaire/);
  });
  it("Onglet tags avec couleur + icône + surcharges prix", () => {
    expect(src).toMatch(/key: "tags"/);
    expect(src).toMatch(/articleTags/);
    expect(src).toMatch(/surcharge_prix_vente_pct/);
  });
});

describe("0.58.72 - Fix édition article (helper safeSaveArticle utilisé)", () => {
  it("articles/page.js utilise safeSaveArticle (plus de safeUpdate/safeInsert direct sur articles)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/articles/page.js"), "utf-8");
    expect(src).toMatch(/import \{[\s\S]+safeSaveArticle/);
    expect(src).toMatch(/await safeSaveArticle\(supabase, payload/);
    // Plus de safeUpdate direct sur "articles" dans saveArticle
    const saveBlock = src.split("async function saveArticle()")[1]?.split("async function deleteArticle")[0] || "";
    expect(saveBlock).not.toMatch(/safeUpdate\(supabase,\s*"articles"/);
    expect(saveBlock).not.toMatch(/safeInsert\(supabase,\s*"articles"/);
  });
});
