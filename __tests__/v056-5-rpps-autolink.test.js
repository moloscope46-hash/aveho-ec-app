// =============================================================
//  Tests unitaires — 0.56.5
//  Auto-link RPPS prescripteur + table medecins_prescripteurs
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.5 - SQL table medecins_prescripteurs", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.5.sql"), "utf-8");

  it("Table medecins_prescripteurs avec FK structure", () => {
    expect(sql).toContain("create table if not exists medecins_prescripteurs");
    expect(sql).toContain("structure_id uuid not null");
    expect(sql).toContain("nom text not null");
  });

  it("Champs identification (RPPS, civilité)", () => {
    expect(sql).toContain("rpps text");
    expect(sql).toContain("civilite text");
  });

  it("Champs lieu d'exercice (FINESS, adresse, INSEE, coords)", () => {
    expect(sql).toContain("finess text");
    expect(sql).toContain("code_insee_commune text");
    expect(sql).toContain("latitude numeric");
    expect(sql).toContain("longitude numeric");
  });

  it("Champs vérification ANS (source, date, est_verifie)", () => {
    expect(sql).toContain("source_verification text");
    expect(sql).toContain("date_verification timestamptz");
    expect(sql).toContain("est_verifie boolean");
  });

  it("Stats d'usage (nb_prescriptions, dates)", () => {
    expect(sql).toContain("nb_prescriptions int");
    expect(sql).toContain("premiere_prescription_date date");
    expect(sql).toContain("derniere_prescription_date date");
  });

  it("Contrainte unique (rpps, structure_id) nulls not distinct", () => {
    expect(sql).toContain("unique nulls not distinct (rpps, structure_id)");
  });

  it("Index sur RPPS partiel (where not null)", () => {
    expect(sql).toContain("idx_medecins_prescripteurs_rpps");
    expect(sql).toContain("where rpps is not null");
  });

  it("FK prescriptions → medecins_prescripteurs (set null on delete)", () => {
    expect(sql).toContain("medecin_prescripteur_id uuid references medecins_prescripteurs(id) on delete set null");
    expect(sql).toContain("rpps_verifie boolean");
  });

  it("4 RLS policies + isolation par structure", () => {
    expect(sql).toContain("medecins_prescripteurs_select");
    expect(sql).toContain("medecins_prescripteurs_insert");
    expect(sql).toContain("medecins_prescripteurs_update");
    expect(sql).toContain("medecins_prescripteurs_delete");
    expect(sql).toContain("membres_structure where user_id = auth.uid()");
  });

  it("Trigger recalcul stats après prescription insert/update/delete", () => {
    expect(sql).toContain("function refresh_medecin_stats");
    expect(sql).toContain("trg_prescriptions_refresh_medecin");
    expect(sql).toContain("after insert or update or delete on prescriptions");
  });

  it("RPC upsert_medecin_from_ocr (recherche RPPS puis nom)", () => {
    expect(sql).toContain("function upsert_medecin_from_ocr");
    expect(sql).toContain("rpps = p_rpps and structure_id = p_structure_id");
    expect(sql).toContain("lower(nom) = lower(p_nom)");
  });

  it("Upsert : enrichissement (coalesce) au lieu d'écraser", () => {
    expect(sql).toContain("rpps = coalesce(rpps, p_rpps)");
    expect(sql).toContain("specialite_libelle = coalesce(specialite_libelle, p_specialite_libelle)");
  });

  it("RPC medecins_stats agrégée par structure", () => {
    expect(sql).toContain("function medecins_stats");
    expect(sql).toContain("verifies_ans");
    expect(sql).toContain("verifies_dump");
    expect(sql).toContain("non_verifies");
  });
});

describe("0.56.5 - API /api/prescriptions/verify-rpps", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/prescriptions/verify-rpps/route.js"), "utf-8");

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/prescriptions/verify-rpps/route.js"))).toBe(true);
  });

  it("Valide RPPS 11 chiffres", () => {
    expect(src).toContain('/^\\d{11}$/');
    expect(src).toContain('"invalid_rpps"');
  });

  it("Appelle /api/rpps en interne (réutilise fallback ANS+dump)", () => {
    expect(src).toContain("/api/rpps?rpps=");
  });

  it("Normalisation accents pour comparaison case-insensitive", () => {
    expect(src).toContain("normalize");
    expect(src).toContain("[\\u0300-\\u036f]");
  });

  it("4 statuts retournés (match, divergences, not_found, error)", () => {
    expect(src).toContain('"match"');
    expect(src).toContain('"divergences"');
    expect(src).toContain('"not_found"');
    expect(src).toContain('"error"');
  });

  it("Retourne objet 'official' complet pour écrasement", () => {
    expect(src).toContain("official: {");
    expect(src).toContain("raison_sociale");
    expect(src).toContain("finess");
    expect(src).toContain("latitude");
  });

  it("Liste les champs divergents (nom, prenom, specialite)", () => {
    expect(src).toContain("divergences");
    expect(src).toContain("nom_ocr");
  });
});

describe("0.56.5 - Composant RppsVerifyBadge", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/RppsVerifyBadge.js"), "utf-8");

  it("Composant existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/RppsVerifyBadge.js"))).toBe(true);
  });

  it("Vérification automatique dès qu'un RPPS est saisi (useEffect)", () => {
    expect(src).toContain("useEffect");
    expect(src).toContain("/api/prescriptions/verify-rpps");
  });

  it("4 statuts visuels distincts (idle/loading/match/divergences/not_found/error/invalid)", () => {
    expect(src).toContain('"loading"');
    expect(src).toContain('"match"');
    expect(src).toContain('"divergences"');
    expect(src).toContain('"not_found"');
    expect(src).toContain('"invalid_rpps"');
  });

  it("Match : badge vert avec détails dépliables", () => {
    expect(src).toContain("Médecin vérifié");
    expect(src).toContain("expanded");
  });

  it("Divergences : comparaison OCR vs officiel + bouton écraser", () => {
    expect(src).toContain("DivergenceRow");
    expect(src).toContain("Utiliser les données officielles");
    expect(src).toContain("onOfficialData");
  });

  it("Not_found : badge rouge avec recommandation", () => {
    expect(src).toContain("RPPS inconnu");
  });

  it("Invalid_rpps : message clair (11 chiffres requis)", () => {
    expect(src).toContain("RPPS invalide");
    expect(src).toContain("11 chiffres");
  });

  it("Annulation propre si rpps change (cancelled flag)", () => {
    expect(src).toContain("cancelled");
  });
});

describe("0.56.5 - Intégration RppsVerifyBadge dans /scan/prescription", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/prescription/page.js"), "utf-8");

  it("Import du composant", () => {
    expect(src).toContain('import RppsVerifyBadge from "../../RppsVerifyBadge"');
  });

  it("Badge affiché si RPPS présent dans editedData.prescripteur.rpps", () => {
    expect(src).toContain("editedData.prescripteur?.rpps");
    expect(src).toContain("<RppsVerifyBadge");
  });

  it("onOfficialData met à jour les champs OCR", () => {
    expect(src).toContain("onOfficialData=");
    expect(src).toContain("_rpps_verified: true");
  });

  it("Compare nom + prenom + specialite", () => {
    expect(src).toContain("nomOcr=");
    expect(src).toContain("prenomOcr=");
    expect(src).toContain("specialiteOcr=");
  });
});

describe("0.56.5 - Route from-ocr upsert medecin + verification automatique", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/prescriptions/from-ocr/route.js"), "utf-8");

  it("Appelle upsert_medecin_from_ocr RPC", () => {
    expect(src).toContain('rpc("upsert_medecin_from_ocr"');
  });

  it("Vérifie automatiquement le RPPS si fourni", () => {
    expect(src).toContain("/api/rpps?rpps=");
  });

  it("Enrichit le payload medecin avec données ANS si vérifié", () => {
    expect(src).toContain("p_est_verifie = true");
    expect(src).toContain("rpps_verifie = true");
  });

  it("Stocke medecin_id + rpps_verifie + source sur prescription", () => {
    expect(src).toContain("medecin_prescripteur_id: medecin_id");
    expect(src).toContain("rpps_verifie,");
    expect(src).toContain("rpps_source_verification,");
  });

  it("Retourne medecin_id + rpps_verifie en réponse", () => {
    expect(src).toContain("medecin_id,");
    expect(src).toContain("rpps_verifie,");
  });

  it("Vérification non bloquante (try/catch silencieux)", () => {
    expect(src).toContain("try {");
    expect(src).toContain("} catch (_) {");
  });
});

describe("0.56.5 - Page /admin/medecins-prescripteurs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/medecins-prescripteurs/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/admin/medecins-prescripteurs/page.js"))).toBe(true);
  });

  it("Charge RPC medecins_stats", () => {
    expect(src).toContain('rpc("medecins_stats")');
  });

  it("Charge tous les médecins avec tri date desc puis nom", () => {
    expect(src).toContain('from("medecins_prescripteurs")');
    expect(src).toContain("derniere_prescription_date");
  });

  it("Filtre par nom/RPPS/spécialité/ville", () => {
    expect(src).toContain("nom || \"\")");
    expect(src).toContain("specialite_libelle");
  });

  it("Filtre par statut vérification (all/verifie/non_verifie)", () => {
    expect(src).toContain('"verifie"');
    expect(src).toContain('"non_verifie"');
  });

  it("Bouton 'Vérifier' relance la verification (verifyNow)", () => {
    expect(src).toContain("verifyNow");
    expect(src).toContain("/api/prescriptions/verify-rpps");
  });

  it("ContactActions sur chaque médecin", () => {
    expect(src).toContain("<ContactActions");
  });

  it("Badge vérifié vert / non vérifié ambre", () => {
    expect(src).toContain("Vérifié");
    expect(src).toContain("Non vérifié");
  });

  it("Affichage nb_prescriptions + source vérification", () => {
    expect(src).toContain("nb_prescriptions");
    expect(src).toContain("source_verification");
  });

  it("6 KPI (total, verifies ANS, verifies dump, non_verifies, prescriptions, derniere)", () => {
    const matches = src.match(/<Kpi /g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });
});

describe("0.56.5 - Menu admin Médecins prescripteurs", () => {
  it("Entrée /admin/medecins-prescripteurs dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/medecins-prescripteurs");
    expect(src).toContain("Médecins prescripteurs");
  });
});
