// =============================================================
//  Tests unitaires — 0.58.75
//  HOTFIX SW + Page Groupements + Refonte Dépôts + Refonte Transferts
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.75 - Version + SW", () => {
  it("Version 0.58.75+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(75);
    }
  });
  it("SW VERSION sync à 0.58.75", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.75"');
  });
});

describe("0.58.75 - HOTFIX SW : bypass CDN externes", () => {
  const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

  it("Array EXTERNAL_CDNS présent dans sw.js", () => {
    expect(sw).toMatch(/EXTERNAL_CDNS\s*=\s*\[/);
  });

  it("api.qrserver.com est bypassé (source du bug 0.58.72)", () => {
    expect(sw).toMatch(/api\.qrserver\.com/);
  });

  it("Autres CDN courants aussi bypassés", () => {
    expect(sw).toMatch(/cdn\.jsdelivr\.net/);
    expect(sw).toMatch(/unpkg\.com/);
    expect(sw).toMatch(/fonts\.googleapis\.com/);
    expect(sw).toMatch(/fonts\.gstatic\.com/);
  });

  it("Le bypass return; AVANT le routing networkFirst/cacheFirst", () => {
    // Le check EXTERNAL_CDNS doit apparaître AVANT le premier appel à event.respondWith
    const cdnIdx = sw.indexOf("EXTERNAL_CDNS");
    const respondIdx = sw.indexOf("event.respondWith");
    expect(cdnIdx).toBeGreaterThan(0);
    expect(cdnIdx).toBeLessThan(respondIdx);
  });
});

describe("0.58.75 - SQL migration groupements + étages + hiérarchie", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "public/sql/migration-0.58.75-groupements-etages-depots-hierarchie.sql"), "utf-8");

  it("Crée la table groupements", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS groupements/);
    expect(sql).toMatch(/finess_juridique/);
    expect(sql).toMatch(/contact_email/);
    expect(sql).toMatch(/couleur/);
  });

  it("RLS groupements en DROP+CREATE (compat PG<17)", () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS "groupements_read_struct"/);
    expect(sql).toMatch(/CREATE POLICY "groupements_read_struct"/);
    const sqlNoComments = sql.replace(/^--.*$/gm, "");
    expect(sqlNoComments).not.toMatch(/CREATE POLICY IF NOT EXISTS/);
  });

  it("Table etages avec batiment_id", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS etages/);
    expect(sql).toMatch(/batiment_id UUID NOT NULL/);
    expect(sql).toMatch(/numero INTEGER/);
  });

  it("ALTER depots avec niveau_hierarchique + securise + temperature", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS niveau_hierarchique/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS securise/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS temperature_min/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS temperature_max/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS humidite_max/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS groupement_id/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS etage_id/);
  });

  it("ALTER transferts avec depot_source + priorite + scan_source", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS depot_source_id/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS depot_destination_id/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS priorite/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS scan_source/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS date_validation/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS date_reception/);
  });

  it("Vue v_depots_hierarchie avec chemin_complet", () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW v_depots_hierarchie/);
    expect(sql).toMatch(/chemin_complet/);
    expect(sql).toMatch(/CONCAT_WS\(' > '/);
  });
});

describe("0.58.75 - Page /groupements", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/groupements/page.js"), "utf-8");

  it("Définit les 6 types de groupement", () => {
    expect(src).toMatch(/ehpad.*EHPAD/);
    expect(src).toMatch(/hopital.*Hôpital/);
    expect(src).toMatch(/clinique.*Clinique/);
    expect(src).toMatch(/reseau.*Réseau/);
    expect(src).toMatch(/maison_sante/);
  });

  it("Modal avec sections juridiques + contact + personnalisation", () => {
    expect(src).toMatch(/Coordonnées juridiques/);
    expect(src).toMatch(/SIRET/);
    expect(src).toMatch(/FINESS juridique/);
    expect(src).toMatch(/Personnalisation/);
  });

  it("Color picker présent (8 couleurs)", () => {
    expect(src).toMatch(/COULEURS\s*=\s*\[/);
    expect(src).toMatch(/#7a6fb0/);
    expect(src).toMatch(/#7CC8C8/);
  });

  it("Utilise safeInsert + safeUpdate", () => {
    expect(src).toMatch(/safeInsert\(supabase, "groupements"/);
    expect(src).toMatch(/safeUpdate\(supabase, "groupements"/);
  });
});

describe("0.58.75 - Page /depots refonte hiérarchique", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/depots/page.js"), "utf-8");

  it("Charge groupements + batiments + etages + services + chambres + magasins en parallèle", () => {
    expect(src).toMatch(/tryFetch.*supabase\.from\("groupements"\)/);
    expect(src).toMatch(/tryFetch.*supabase\.from\("batiments"\)/);
    expect(src).toMatch(/tryFetch.*supabase\.from\("etages"\)/);
    expect(src).toMatch(/tryFetch.*supabase\.from\("services"\)/);
    expect(src).toMatch(/tryFetch.*supabase\.from\("chambres"\)/);
    expect(src).toMatch(/tryFetch.*supabase\.from\("magasins"\)/);
  });

  it("getHierarchy construit le chemin Groupement → Bâtiment → Étage → Service → Chambre", () => {
    expect(src).toMatch(/function getHierarchy/);
    expect(src).toMatch(/groupement_id/);
    expect(src).toMatch(/batiment_id/);
    expect(src).toMatch(/etage_id/);
    expect(src).toMatch(/service_id/);
    expect(src).toMatch(/chambre_id/);
  });

  it("Modal édition avec cascade bâtiment → étage / service → chambre", () => {
    expect(src).toMatch(/etagesForBatiment/);
    expect(src).toMatch(/servicesForBatiment/);
    expect(src).toMatch(/chambresForService/);
  });

  it("InventaireModal sous-composant présent", () => {
    expect(src).toMatch(/function InventaireModal/);
    expect(src).toMatch(/Scanner pour entrer\/sortir|Scanner/);
    expect(src).toMatch(/Créer transfert/);
  });

  it("6 types de dépôt (general, deporte, pharmacie, infirmerie, froid, stupefiant)", () => {
    expect(src).toMatch(/general.*Général EHPAD/);
    expect(src).toMatch(/pharmacie.*Pharmacie/);
    expect(src).toMatch(/froid.*réfrigéré/);
    expect(src).toMatch(/stupefiant.*Stupéfiants/);
  });

  it("6 niveaux hiérarchiques", () => {
    expect(src).toMatch(/NIVEAUX_HIERARCHIQUES/);
    expect(src).toMatch(/groupement.*Groupement/);
    expect(src).toMatch(/batiment.*Bâtiment/);
    expect(src).toMatch(/etage.*Étage/);
    expect(src).toMatch(/mobile.*Mobile/);
  });

  it("BackButton intégré en haut de page", () => {
    expect(src).toMatch(/import BackButton from/);
    expect(src).toMatch(/<BackButton/);
  });
});

describe("0.58.75 - Page /transferts refonte workflow", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");

  it("Suspense wrapper pour useSearchParams (Next.js 15)", () => {
    expect(src).toMatch(/import.*Suspense.*from "react"/);
    expect(src).toMatch(/<Suspense fallback=\{null\}>/);
  });

  it("Préset URL : ?depot, ?depot_source, ?materiel", () => {
    expect(src).toMatch(/searchParams\?\.get\("depot"\)/);
    expect(src).toMatch(/searchParams\?\.get\("depot_source"\)/);
    expect(src).toMatch(/searchParams\?\.get\("materiel"\)/);
  });

  it("4 statuts : Demandé / Validé / Reçu / Annulé", () => {
    expect(src).toMatch(/STATUTS\s*=\s*\[/);
    expect(src).toMatch(/"Demandé"/);
    expect(src).toMatch(/"Validé"/);
    expect(src).toMatch(/"Reçu"/);
    expect(src).toMatch(/"Annulé"/);
  });

  it("4 priorités : basse / normale / haute / urgente", () => {
    expect(src).toMatch(/PRIORITES\s*=\s*\[/);
    expect(src).toMatch(/basse/);
    expect(src).toMatch(/urgente/);
  });

  it("8 motifs : Réappro, Retour location, Prêt, Échange, etc.", () => {
    expect(src).toMatch(/MOTIFS\s*=\s*\[/);
    expect(src).toMatch(/Réapprovisionnement/);
    expect(src).toMatch(/Retour location/);
    expect(src).toMatch(/Envoi SAV/);
    expect(src).toMatch(/Quarantaine/);
  });

  it("getLocationLabel construit le path source/dest avec icônes", () => {
    expect(src).toMatch(/function getLocationLabel/);
    expect(src).toMatch(/depot_source_id|depot_destination_id/);
  });

  it("changeStatut set date_validation/reception + valide_par/recu_par", () => {
    expect(src).toMatch(/function changeStatut|async function changeStatut/);
    expect(src).toMatch(/date_validation/);
    expect(src).toMatch(/date_reception/);
    expect(src).toMatch(/valide_par/);
    expect(src).toMatch(/recu_par/);
  });

  it("Actions inline conditionnelles selon statut", () => {
    expect(src).toMatch(/t\.statut === "Demandé"/);
    expect(src).toMatch(/t\.statut === "Validé"/);
  });

  it("Bouton Scanner dans modal avec lien /scan/quick", () => {
    expect(src).toMatch(/router\.push\("\/scan\/quick"\)/);
  });
});

describe("0.58.75 - Cohérence changelog", () => {
  it("0.58.75 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.75"/);
  });
  it("0.58.75 présent dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    const versions = json.map(v => v.v);
    expect(versions).toContain("0.58.75");
  });
  it("Note HTML 0.58.75 présente", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.58.75.html"))).toBe(true);
  });
  it("SQL migration 0.58.75 présent dans public/sql/", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/sql/migration-0.58.75-groupements-etages-depots-hierarchie.sql"))).toBe(true);
  });
});
