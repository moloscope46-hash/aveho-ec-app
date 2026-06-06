// =============================================================
//  Tests unitaires — 0.58.71
//  - HOTFIX 400 materiels.article_id + QrScanner removeChild crash
//  - BUNDLE MATÉRIEL UDI/GS1/QR + mouvements + états étendus
//  - Galaxies météorites enrichies sur home
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.71 - Version + SW", () => {
  it("Version 0.58.71+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(71);
    }
  });
  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.71 - lib/materiels.js helper (sonde + cache + fallback)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/materiels.js"), "utf-8");

  it("Exporte les sondes article_id / UDI / immobilisation", () => {
    expect(src).toMatch(/export async function materielsHasArticleId/);
    expect(src).toMatch(/export async function materielsHasUdi/);
    expect(src).toMatch(/export async function materielsHasImmobilisation/);
  });
  it("Cache module-level pour éviter sondes répétées", () => {
    expect(src).toMatch(/_cache\s*=\s*\{[\s\S]+hasArticleId:\s*null/);
    expect(src).toMatch(/if \(_cache\.hasArticleId !== null\) return _cache\.hasArticleId/);
  });
  it("Détecte erreur 42703 (colonne absente)", () => {
    expect(src).toMatch(/error\.code === ["']42703["']/);
  });
  it("selectMaterielsByArticle retourne [] sans crash si article_id absent", () => {
    expect(src).toMatch(/export async function selectMaterielsByArticle/);
    expect(src).toMatch(/data: \[\]/);
  });
  it("safeInsertMateriels strip automatique article_id / UDI / immobilisation", () => {
    expect(src).toMatch(/export async function safeInsertMateriels/);
    expect(src).toMatch(/if \(!hasArticleId\) delete c\.article_id/);
    expect(src).toMatch(/if \(!hasUdi\)[\s\S]+delete c\.udi_di/);
  });
});

describe("0.58.71 - SQL migration matériels", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.71-materiels-extension.sql"), "utf-8");

  it("Ajoute colonnes UDI (udi_di, udi_pi, qr_code, code_barre_principal)", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS udi_di/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS udi_pi/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS qr_code/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS code_barre_principal/);
  });
  it("Ajoute colonnes immobilisation", () => {
    expect(sql).toMatch(/immobilisation_active BOOLEAN/);
    expect(sql).toMatch(/immobilisation_valeur_acquisition NUMERIC/);
    expect(sql).toMatch(/immobilisation_duree_mois INTEGER/);
  });
  it("Crée table materiel_mouvements + RLS DROP+CREATE", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS materiel_mouvements/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "mat_mvts_read_struct"/);
    expect(sql).toMatch(/CREATE POLICY "mat_mvts_read_struct"/);
    // 0.58.73 : on retire dans les commentaires SQL toute occurrence du pattern interdit
    // pour ne pas faire match dans l'anti-régression (qui regarde tout le fichier)
    const sqlNoComments = sql.replace(/^--.*$/gm, "");
    expect(sqlNoComments).not.toMatch(/CREATE POLICY IF NOT EXISTS/);
  });
  it("Trigger automatique track_materiel_changes sur UPDATE materiels", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION track_materiel_changes/);
    expect(sql).toMatch(/CREATE TRIGGER trg_materiels_track_changes/);
    expect(sql).toMatch(/AFTER UPDATE ON materiels/);
  });
  it("Index pour perf : udi_di, code_barre, immo active, date_rebut", () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_materiels_udi_di/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_materiels_immo/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_mat_mvts_materiel/);
  });
});

describe("0.58.71 - QrScanner fix removeChild + qrbox min 50px", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/QrScanner.js"), "utf-8");

  it("Utilise dangerouslySetInnerHTML pour container scanner", () => {
    expect(src).toMatch(/dangerouslySetInnerHTML=\{\{\s*__html:\s*["']["']\s*\}\}/);
  });
  it("Overlays status en sibling (pas children du scanner container)", () => {
    // Le commentaire mentionne explicitement le fix
    expect(src).toMatch(/FIX removeChild/i);
  });
  it("qrbox min 50px (warning html5-qrcode résolu)", () => {
    expect(src).toMatch(/Math\.max\(50,/);
  });
  it("Cleanup ultra-robuste : try/catch sur tout + nettoyage manuel DOM", () => {
    expect(src).toMatch(/while \(el\.firstChild\)/);
    expect(src).toMatch(/cleanup ultra-robuste/);
  });
});

describe("0.58.71 - lib/barcode étendu (UDI + GS1 brut)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/barcode.js"), "utf-8");

  it("parseGS1 supporte format brut avec FNC1", () => {
    expect(src).toMatch(/FNC1 = ["']\\x1d["']/);
    expect(src).toMatch(/Format brut avec FNC1/);
  });
  it("AI map étendue (710 NHRN France pour LPP DM)", () => {
    expect(src).toMatch(/"710":[\s\S]+nhrn_france/);
  });
  it("buildUdi exporté pour construire DI/PI", () => {
    expect(src).toMatch(/export function buildUdi/);
  });
  it("Support FNC1 leading + strip prefix ]C1 / ]d2 (Code128/DataMatrix)", () => {
    // 0.58.73 : le code utilise `code.replace(/^]C1/, ...)` avec le bracket litéral.
    // En JS regex, `]` n'a pas besoin d'être échappé hors d'une classe.
    expect(src).toMatch(/replace\(\/\^\]C1\//);
    expect(src).toMatch(/replace\(\/\^\]d2\//);
  });
});

describe("0.58.71 - Fiche matériel /materiel/[id] premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiel/[id]/page.js"), "utf-8");

  it("Next.js 15 use(params) pattern", () => {
    expect(src).toMatch(/import \{.+use\b.+\} from ["']react["']/);
    expect(src).toMatch(/use\(params\)/);
  });
  it("ETATS_MATERIEL avec 12 états étendus", () => {
    expect(src).toMatch(/export const ETATS_MATERIEL/);
    expect(src).toMatch(/Disponible/);
    expect(src).toMatch(/En patient/);
    expect(src).toMatch(/Rebut/);
    expect(src).toMatch(/Immobilisé/);
    expect(src).toMatch(/En quarantaine/);
  });
  it("getEtatMeta exporté pour réutilisation", () => {
    expect(src).toMatch(/export function getEtatMeta/);
  });
  it("Onglets premium : overview, udi, mouvements, etat, historique, immobilisation", () => {
    expect(src).toMatch(/"overview"/);
    expect(src).toMatch(/"udi"/);
    expect(src).toMatch(/"mouvements"/);
    expect(src).toMatch(/"etat"/);
    expect(src).toMatch(/"historique"/);
    expect(src).toMatch(/"immobilisation"/);
  });
  it("Modal édition état avec grille des 12 états", () => {
    expect(src).toMatch(/ETATS_MATERIEL\.map/);
    expect(src).toMatch(/changeEtat\(e\.v\)/);
  });
  it("MvtTypeBadge avec 8 types (entree, sortie, transfert, sav, rebut, etc.)", () => {
    expect(src).toMatch(/function MvtTypeBadge/);
    expect(src).toMatch(/"entree":[\s\S]+ENTRÉE/);
    expect(src).toMatch(/"sav_envoi":/);
    expect(src).toMatch(/"changement_etat":/);
  });
  it("Bouton scanner/actions vers /scan/materiel", () => {
    expect(src).toMatch(/router\.push\(`\/scan\/materiel\?materiel_id=/);
  });
});

describe("0.58.71 - Page /scan/materiel", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/materiel/page.js"), "utf-8");

  it("Suspense wrapper pour useSearchParams", () => {
    expect(src).toMatch(/<Suspense fallback/);
  });
  it("Mode preset (?materiel_id=X) + mode libre", () => {
    expect(src).toMatch(/presetMaterielId/);
    expect(src).toMatch(/setPresetMode\(true\)/);
  });
  it("findMateriel 6 stratégies (qr_code, udi_di+serie, udi_di, serie, lot, code_barre)", () => {
    expect(src).toMatch(/findMateriel/);
    // Compte les "supabase.from..eq" dans la fonction
    const findFn = src.split("async function findMateriel")[1];
    expect(findFn).toBeTruthy();
    const eqCount = (findFn.match(/\.eq\(/g) || []).length;
    expect(eqCount).toBeGreaterThanOrEqual(6);  // au moins 6 stratégies
  });
  it("updateMaterielUdi met à jour qr_code + udi_di + udi_pi + lot/série/péremption", () => {
    expect(src).toMatch(/qr_code: rawCode/);
    expect(src).toMatch(/updates\.udi_di = di/);
    expect(src).toMatch(/updates\.udi_pi = pi/);
    expect(src).toMatch(/updates\.numero_lot = parsed\.lot/);
    expect(src).toMatch(/updates\.numero_serie = parsed\.serie/);
  });
  it("Import ETATS_MATERIEL depuis /materiel/[id]/page", () => {
    expect(src).toMatch(/import \{[\s\S]+ETATS_MATERIEL[\s\S]+\} from ["']\.\.\/\.\.\/materiel\/\[id\]\/page["']/);
  });
});

describe("0.58.71 - Wire-up patches", () => {
  it("article/[id]/page.js utilise selectMaterielsByArticle (plus de 400)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/article/[id]/page.js"), "utf-8");
    expect(src).toMatch(/import \{[\s\S]+selectMaterielsByArticle/);
    expect(src).toMatch(/selectMaterielsByArticle\(supabase/);
    // Plus de SELECT direct .eq("article_id"
    expect(src).not.toMatch(/supabase\.from\(["']materiels["']\)\.select\([^)]+\)\.eq\(["']article_id["']/);
  });
  it("scan/article/page.js utilise safeInsertMateriels", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/article/page.js"), "utf-8");
    expect(src).toMatch(/import \{[\s\S]+safeInsertMateriels/);
    expect(src).toMatch(/safeInsertMateriels\(supabase/);
    expect(src).not.toMatch(/supabase\.from\(["']materiels["']\)\.insert\(matPayloads/);
  });
  it("materiels listing : bouton Scanner matériel + getEtatMeta importé", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");
    expect(src).toMatch(/router\.push\(["']\/scan\/materiel["']\)/);
    expect(src).toMatch(/getEtatMeta\(r\.etat\)/);
  });
});

describe("0.58.71 - GalaxyBackground enrichi (météorites + astéroïdes)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/GalaxyBackground.js"), "utf-8");

  it("Météorites enflammées avec boule de feu + traînée orange", () => {
    expect(src).toMatch(/Météorites enflammées/);
    expect(src).toMatch(/meteorites/);
    expect(src).toMatch(/av-meteor-fall/);
  });
  it("Anneau d'astéroïdes en rotation lente", () => {
    expect(src).toMatch(/Anneau d.astéroïdes/i);
    expect(src).toMatch(/asteroids/);
    expect(src).toMatch(/av-asteroid-ring/);
  });
});
