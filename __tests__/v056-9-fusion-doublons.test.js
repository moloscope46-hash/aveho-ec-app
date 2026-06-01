// =============================================================
//  Tests unitaires — 0.56.9
//  Fusion automatique doublons + rollback
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.9 - SQL table doublons_fusions", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.9.sql"), "utf-8");

  it("Table avec structure_id + cible (3 valeurs) + gagnant/perdant", () => {
    expect(sql).toContain("create table if not exists doublons_fusions");
    expect(sql).toContain("check (cible in ('etablissement', 'groupement', 'medecin'))");
    expect(sql).toContain("gagnant_id uuid not null");
    expect(sql).toContain("perdant_id uuid not null");
  });

  it("Snapshot perdant en jsonb pour rollback", () => {
    expect(sql).toContain("perdant_snapshot jsonb");
  });

  it("Audit (fusionne_par + raison + created_at + rollback fields)", () => {
    expect(sql).toContain("fusionne_par uuid");
    expect(sql).toContain("rollback_at timestamptz");
    expect(sql).toContain("est_rollbacke boolean");
  });

  it("FK migrées en jsonb (audit détaillé)", () => {
    expect(sql).toContain("fk_migrees jsonb");
    expect(sql).toContain("nb_rows_migrees int");
  });

  it("3 RLS isolant par structure", () => {
    expect(sql).toContain("doublons_fusions_select");
    expect(sql).toContain("doublons_fusions_insert");
    expect(sql).toContain("doublons_fusions_update");
  });
});

describe("0.56.9 - RPC preview_fusion_doublon", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.9.sql"), "utf-8");

  it("Fonction existe avec 3 params (cible, gagnant, perdant)", () => {
    expect(sql).toContain("function preview_fusion_doublon");
    expect(sql).toContain("p_cible text");
    expect(sql).toContain("p_gagnant_id uuid");
    expect(sql).toContain("p_perdant_id uuid");
  });

  it("Découverte dynamique des FK via information_schema", () => {
    expect(sql).toContain("information_schema.referential_constraints");
    expect(sql).toContain("information_schema.table_constraints");
    expect(sql).toContain("information_schema.key_column_usage");
  });

  it("Map 3 cibles vers tables physiques", () => {
    expect(sql).toContain("when 'etablissement' then v_target_table := 'etablissements'");
    expect(sql).toContain("when 'groupement' then v_target_table := 'groupements'");
    expect(sql).toContain("when 'medecin' then v_target_table := 'medecins_prescripteurs'");
  });

  it("Retourne table_name + column_name + nb_rows + delete_rule", () => {
    expect(sql).toContain("table_name text");
    expect(sql).toContain("column_name text");
    expect(sql).toContain("nb_rows bigint");
    expect(sql).toContain("on_delete_action text");
  });

  it("Filtre les lignes à 0 (return next seulement si count > 0)", () => {
    expect(sql).toContain("if v_count > 0 then");
    expect(sql).toContain("return next");
  });
});

describe("0.56.9 - RPC fusionner_doublon", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.9.sql"), "utf-8");

  it("Fonction avec 5 params dont p_merge_champs", () => {
    expect(sql).toContain("function fusionner_doublon");
    expect(sql).toContain("p_raison text default null");
    expect(sql).toContain("p_merge_champs boolean default true");
  });

  it("Vérifie que gagnant ≠ perdant", () => {
    expect(sql).toContain("p_gagnant_id = p_perdant_id");
    expect(sql).toContain("ne peuvent pas être la même");
  });

  it("Vérifie même structure_id pour les 2 entités", () => {
    expect(sql).toContain("v_struct_id != v_perdant_struct_id");
  });

  it("Vérifie accès utilisateur via membres_structure", () => {
    expect(sql).toContain("membres_structure");
    expect(sql).toContain("Accès refusé");
  });

  it("Snapshot perdant en jsonb avant suppression", () => {
    expect(sql).toContain("to_jsonb(t)");
  });

  it("Découverte FK dynamique + UPDATE generated SQL", () => {
    expect(sql).toContain("execute v_sql using p_gagnant_id, p_perdant_id");
  });

  it("Gère unique_violation (delete au lieu d'update)", () => {
    expect(sql).toContain("exception when unique_violation");
    expect(sql).toContain("supprimées car conflits unique");
  });

  it("Merge léger (coalesce) des champs vides pour etabs + medecins", () => {
    expect(sql).toContain("if p_merge_champs then");
    expect(sql).toContain("siret = coalesce(g.siret, p.siret)");
    expect(sql).toContain("rpps = coalesce(g.rpps, p.rpps)");
  });

  it("DELETE perdant à la fin", () => {
    expect(sql).toContain("delete from %I where id = $1");
  });

  it("Insert trace dans doublons_fusions", () => {
    expect(sql).toContain("insert into doublons_fusions");
    expect(sql).toContain("perdant_snapshot");
    expect(sql).toContain("fk_migrees");
  });

  it("Nettoie doublons_ignores pointant vers le perdant", () => {
    expect(sql).toContain("delete from doublons_ignores");
    expect(sql).toContain("entity_id_1 = p_perdant_id or entity_id_2 = p_perdant_id");
  });
});

describe("0.56.9 - RPC rollback_fusion", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.9.sql"), "utf-8");

  it("Fonction existe + vérifie pas déjà rollbackée", () => {
    expect(sql).toContain("function rollback_fusion");
    expect(sql).toContain("est_rollbacke");
    expect(sql).toContain("déjà rollbackée");
  });

  it("Restaure le perdant via jsonb_populate_record", () => {
    expect(sql).toContain("jsonb_populate_record");
    expect(sql).toContain("perdant_snapshot");
  });

  it("Marque la fusion comme rollbackée + trace user + raison", () => {
    expect(sql).toContain("est_rollbacke = true");
    expect(sql).toContain("rollback_at = now()");
    expect(sql).toContain("rollback_par = auth.uid()");
    expect(sql).toContain("rollback_raison");
  });
});

describe("0.56.9 - Intégration UI sur /admin/doublons-forces", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/admin/doublons-forces/page.js"), "utf-8");

  it("State fusionModal + historique + showHistorique", () => {
    expect(src).toContain("fusionModal");
    expect(src).toContain("historique");
    expect(src).toContain("showHistorique");
  });

  it("Function openFusion qui mappe 3 cibles vers payload modale", () => {
    expect(src).toContain("function openFusion");
    expect(src).toContain('cible: "etablissement"');
    expect(src).toContain('cible: "groupement"');
    expect(src).toContain('cible: "medecin"');
  });

  it("Chargement historique des fusions (limit 20)", () => {
    expect(src).toContain("loadHistorique");
    expect(src).toContain('from("doublons_fusions")');
    expect(src).toContain(".limit(20)");
  });

  it("Bouton Fusionner sur les 3 cards (étab + groupement + médecin)", () => {
    const matches = src.match(/Fusionner/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("Composant FusionModal avec choix gagnant/perdant + preview", () => {
    expect(src).toContain("function FusionModal");
    expect(src).toContain("setGagnantId");
    expect(src).toContain("loadPreview");
    expect(src).toContain("preview_fusion_doublon");
  });

  it("Auto-suggestion du gagnant : celui qui a le plus de FK", () => {
    expect(src).toContain("ent1.nb >= ent2.nb ? ent1.id : ent2.id");
  });

  it("Composant ChoixCard avec badge GARDÉ + nb références", () => {
    expect(src).toContain("function ChoixCard");
    expect(src).toContain("GARDÉ");
    expect(src).toContain("référence");
  });

  it("Bouton 'Confirmer la fusion' appelle fusionner_doublon RPC", () => {
    expect(src).toContain("executeMerge");
    expect(src).toContain('rpc("fusionner_doublon"');
    expect(src).toContain("p_merge_champs: true");
  });

  it("Warning irréversibilité + snapshot conservé", () => {
    expect(src).toContain("Action irréversible");
    expect(src).toContain("snapshot");
  });

  it("Composant HistoriqueRow avec bouton rollback", () => {
    expect(src).toContain("function HistoriqueRow");
    expect(src).toContain('rpc("rollback_fusion"');
    expect(src).toContain("Annuler cette fusion");
  });

  it("Affichage ROLLBACKÉE pour les fusions déjà annulées", () => {
    expect(src).toContain("est_rollbacke");
    expect(src).toContain("ROLLBACKÉE");
  });

  it("Tableau preview avec table/colonne/lignes/action FK", () => {
    expect(src).toContain("Migration des références");
    expect(src).toContain("table_name");
    expect(src).toContain("on_delete_action");
  });

  it("btnMerge rouge distinct de btnGhost", () => {
    expect(src).toContain("btnMerge");
    expect(src).toContain("#c0392b");
  });
});
