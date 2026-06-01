// =============================================================
//  Tests unitaires — 0.56.7
//  Détection doublons forces (étab + groupements + médecins)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.7 - SQL extension pg_trgm + index GIN", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Active l'extension pg_trgm", () => {
    expect(sql).toContain("create extension if not exists pg_trgm");
  });

  it("Index GIN trigramme sur 3 tables (etabs, groupements, médecins)", () => {
    expect(sql).toContain("idx_etablissements_nom_trgm");
    expect(sql).toContain("idx_groupements_nom_trgm");
    expect(sql).toContain("idx_medecins_nom_trgm");
    expect(sql).toContain("gin (nom gin_trgm_ops)");
  });
});

describe("0.56.7 - SQL table doublons_ignores", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Table avec structure_id + cible (3 valeurs) + 2 entity_id", () => {
    expect(sql).toContain("create table if not exists doublons_ignores");
    expect(sql).toContain("check (cible in ('etablissement', 'groupement', 'medecin'))");
    expect(sql).toContain("entity_id_1 uuid not null");
    expect(sql).toContain("entity_id_2 uuid not null");
  });

  it("Contrainte unique (struct, cible, id_1, id_2) + ordre id_1 < id_2", () => {
    expect(sql).toContain("doublons_ignores_unique");
    expect(sql).toContain("check (entity_id_1 < entity_id_2)");
  });

  it("RLS isolant par structure (3 policies select/insert/delete)", () => {
    expect(sql).toContain("doublons_ignores_select");
    expect(sql).toContain("doublons_ignores_insert");
    expect(sql).toContain("doublons_ignores_delete");
  });
});

describe("0.56.7 - RPC detecter_doublons_etablissements", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Fonction security definer avec seuil + max paramétrables", () => {
    expect(sql).toContain("function detecter_doublons_etablissements");
    expect(sql).toContain("p_seuil_similarite numeric default 0.55");
    expect(sql).toContain("p_max_resultats int default 100");
  });

  it("SIRET identique → score 1.0", () => {
    expect(sql).toContain("e1.siret is not null and e1.siret = e2.siret then 1.0");
  });

  it("FINESS identique → score 0.95", () => {
    expect(sql).toContain("e1.finess is not null and e1.finess = e2.finess then 0.95");
  });

  it("Sinon similarity sur nom (pg_trgm)", () => {
    expect(sql).toContain("similarity(lower(e1.nom), lower(e2.nom))");
  });

  it("Évite (A,B) et (B,A) via e1.id < e2.id", () => {
    expect(sql).toContain("e1.id < e2.id");
  });

  it("Filtre les paires déjà ignorées via doublons_ignores", () => {
    expect(sql).toContain("not exists");
    expect(sql).toContain("doublons_ignores di");
    expect(sql).toContain("least(id_1, id_2)");
    expect(sql).toContain("greatest(id_1, id_2)");
  });

  it("Motif explicite par paire (SIRET/FINESS/CP/nom)", () => {
    expect(sql).toContain("'SIRET identique'");
    expect(sql).toContain("'FINESS identique'");
    expect(sql).toContain("'Nom similaire + même CP'");
  });
});

describe("0.56.7 - RPC detecter_doublons_groupements", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Fonction existe avec seuil default 0.6", () => {
    expect(sql).toContain("function detecter_doublons_groupements");
    expect(sql).toContain("p_seuil_similarite numeric default 0.6");
  });

  it("Inclut le nb_etabs par groupement (count etablissements)", () => {
    expect(sql).toContain("nb_etabs");
    expect(sql).toContain("from etablissements where groupement_id = g.id");
  });

  it("Filtre archive=false (groupements actifs uniquement)", () => {
    expect(sql).toContain("g.archive = false");
  });
});

describe("0.56.7 - RPC detecter_doublons_medecins", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Fonction existe", () => {
    expect(sql).toContain("function detecter_doublons_medecins");
  });

  it("RPPS identique → score 1.0", () => {
    expect(sql).toContain("m1.rpps is not null and m1.rpps = m2.rpps then 1.0");
  });

  it("Sinon similarity sur nom+prenom concaténés", () => {
    expect(sql).toContain("lower(coalesce(m1.nom, '') || ' ' || coalesce(m1.prenom, ''))");
  });

  it("Inclut spécialité, ville et nb_prescriptions", () => {
    expect(sql).toContain("specialite_libelle");
    expect(sql).toContain("nb_prescriptions");
  });

  it("Motif explicite (RPPS identique vs nom+prénom)", () => {
    expect(sql).toContain("'RPPS identique'");
    expect(sql).toContain("'Nom + prénom similaires'");
  });
});

describe("0.56.7 - RPC ignorer_doublon", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Fonction ignorer_doublon avec cible + 2 ids + raison", () => {
    expect(sql).toContain("function ignorer_doublon");
    expect(sql).toContain("p_cible text");
    expect(sql).toContain("p_raison text default null");
  });

  it("Récupère structure_id en cohérence avec la cible", () => {
    expect(sql).toContain("p_cible = 'etablissement'");
    expect(sql).toContain("p_cible = 'groupement'");
    expect(sql).toContain("p_cible = 'medecin'");
  });

  it("Stocke toujours les IDs triés (least/greatest)", () => {
    expect(sql).toContain("v_low := least(p_id_1, p_id_2)");
    expect(sql).toContain("v_high := greatest(p_id_1, p_id_2)");
  });

  it("ON CONFLICT DO NOTHING (pas d'erreur si déjà ignoré)", () => {
    expect(sql).toContain("on conflict (structure_id, cible, entity_id_1, entity_id_2) do nothing");
  });

  it("Trace ignore_par = auth.uid()", () => {
    expect(sql).toContain("auth.uid()");
  });
});

describe("0.56.7 - RPC doublons_stats agrégée", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.7.sql"), "utf-8");

  it("Fonction avec 3 seuils paramétrables", () => {
    expect(sql).toContain("function doublons_stats");
    expect(sql).toContain("p_seuil_etab numeric");
    expect(sql).toContain("p_seuil_grp numeric");
    expect(sql).toContain("p_seuil_med numeric");
  });

  it("Retourne nb par cible + ignorés + total", () => {
    expect(sql).toContain("nb_doublons_etablissements");
    expect(sql).toContain("nb_doublons_groupements");
    expect(sql).toContain("nb_doublons_medecins");
    expect(sql).toContain("nb_ignores");
    expect(sql).toContain("total");
  });
});

describe("0.56.7 - Page /admin/doublons-forces", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/doublons-forces/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/admin/doublons-forces/page.js"))).toBe(true);
  });

  it("3 onglets : établissements, groupements, médecins", () => {
    expect(src).toContain('id: "etablissements"');
    expect(src).toContain('id: "groupements"');
    expect(src).toContain('id: "medecins"');
  });

  it("Charge RPC doublons_stats au démarrage", () => {
    expect(src).toContain('rpc("doublons_stats"');
  });

  it("Appelle les 3 RPCs de détection selon l'onglet", () => {
    expect(src).toContain('"detecter_doublons_etablissements"');
    expect(src).toContain('"detecter_doublons_groupements"');
    expect(src).toContain('"detecter_doublons_medecins"');
  });

  it("Slider seuil de similarité (30% à 95%)", () => {
    expect(src).toContain('type="range"');
    expect(src).toContain('min="0.3"');
    expect(src).toContain('max="0.95"');
  });

  it("Seuils par défaut différents par cible", () => {
    expect(src).toContain("seuilDefault: 0.55");
    expect(src).toContain("seuilDefault: 0.6");
  });

  it("Bouton 'Marquer non-doublon' avec confirm + raison", () => {
    expect(src).toContain("ignorer");
    expect(src).toContain("rpc(\"ignorer_doublon\"");
    expect(src).toContain('prompt(');
  });

  it("Singular cible pour SQL ('etablissement' pas 'etablissements')", () => {
    expect(src).toContain("cibleSingular");
  });

  it("ScoreBadge avec 3 paliers (quasi-certain/forte/suggestion)", () => {
    expect(src).toContain("Quasi-certain");
    expect(src).toContain("Forte similarité");
    expect(src).toContain("Suggestion");
  });

  it("3 cartes différentes (Etab/Groupement/Medecin) avec champs spécifiques", () => {
    expect(src).toContain("DoublonCardEtab");
    expect(src).toContain("DoublonCardGroupement");
    expect(src).toContain("DoublonCardMedecin");
  });

  it("Affichage SIRET/FINESS pour étabs", () => {
    expect(src).toContain("d.etab_1_siret");
    expect(src).toContain("d.etab_1_finess");
  });

  it("Affichage nb_etabs pour groupements", () => {
    expect(src).toContain("grp_1_nb_etabs");
  });

  it("Affichage RPPS + nb_prescriptions pour médecins", () => {
    expect(src).toContain("med_1_rpps");
    expect(src).toContain("med_1_nb_prescriptions");
  });

  it("Empty state vert avec message si aucun doublon", () => {
    expect(src).toContain("Aucun doublon détecté");
  });

  it("5 KPI au top (total + 3 cibles + ignorés)", () => {
    const matches = src.match(/<Kpi /g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("Pédagogie : explique pg_trgm + seuils + ignore", () => {
    expect(src).toContain("pg_trgm");
    expect(src).toContain("seuil");
  });
});

describe("0.56.7 - Menu admin Doublons forces", () => {
  it("Entrée /admin/doublons-forces dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/doublons-forces");
    expect(src).toContain("Doublons forces");
  });
});
