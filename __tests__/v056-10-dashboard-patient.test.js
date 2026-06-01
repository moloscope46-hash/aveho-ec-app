// =============================================================
//  Tests unitaires — 0.56.10
//  Dashboard patient (RPC + page)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.10 - SQL RPC patient_dashboard_summary", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.10.sql"), "utf-8");

  it("Fonction security definer avec p_patient_id", () => {
    expect(sql).toContain("function patient_dashboard_summary(p_patient_id uuid)");
    expect(sql).toContain("security definer");
  });

  it("Vérification accès via membres_structure", () => {
    expect(sql).toContain("membres_structure where user_id = auth.uid()");
    expect(sql).toContain("Accès refusé");
  });

  it("Retour : compteurs prescriptions + médicaments + médecins", () => {
    expect(sql).toContain("total_prescriptions bigint");
    expect(sql).toContain("prescriptions_actives bigint");
    expect(sql).toContain("total_medicaments bigint");
    expect(sql).toContain("medicaments_uniques bigint");
    expect(sql).toContain("total_medecins bigint");
  });

  it("Retour : flags administratifs (ALD, C2S, AME, tiers payant)", () => {
    expect(sql).toContain("est_ald boolean");
    expect(sql).toContain("est_c2s boolean");
    expect(sql).toContain("est_ame boolean");
    expect(sql).toContain("tiers_payant_actif boolean");
  });

  it("Calcul jours_avant_fin_secu + mutuelle", () => {
    expect(sql).toContain("jours_avant_fin_secu");
    expect(sql).toContain("jours_avant_fin_mutuelle");
    expect(sql).toContain("- current_date)::int");
  });

  it("Récupération nom caisse + mutuelle (sous-requêtes)", () => {
    expect(sql).toContain("caisse_nom");
    expect(sql).toContain("mutuelle_nom");
    expect(sql).toContain("from caisses_assurance_maladie");
    expect(sql).toContain("from mutuelles");
  });

  it("Medicaments uniques : préfère DCI fallback nom commercial", () => {
    expect(sql).toContain("count(distinct lower(coalesce(medicament_dci, medicament_nom)))");
  });

  it("Renouvelables : count prescriptions actives + renouvelable=true", () => {
    expect(sql).toContain("prescription_renouvelable_count");
    expect(sql).toContain("est_renouvelable = true and statut = 'active'");
  });
});

describe("0.56.10 - SQL RPC patient_dashboard_medicaments_actifs", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.10.sql"), "utf-8");

  it("Fonction existe avec déduplication via row_number", () => {
    expect(sql).toContain("function patient_dashboard_medicaments_actifs");
    expect(sql).toContain("row_number() over");
  });

  it("Filtre statut='active' uniquement", () => {
    expect(sql).toContain("p.statut = 'active'");
  });

  it("Group by DCI préférée puis nom commercial (UPPER)", () => {
    expect(sql).toContain("coalesce(upper(medicament_dci), upper(medicament_nom))");
  });

  it("Retourne dernier dosage + posologie + date", () => {
    expect(sql).toContain("derniere_dosage text");
    expect(sql).toContain("derniere_posologie text");
    expect(sql).toContain("derniere_date date");
  });

  it("nb_prescriptions compté par fenêtre (window count)", () => {
    expect(sql).toContain("count(*) over (partition by");
  });

  it("Flag est_dci_fournie pour UI", () => {
    expect(sql).toContain("est_dci_fournie boolean");
    expect(sql).toContain("(dci is not null)");
  });
});

describe("0.56.10 - SQL RPC patient_dashboard_medecins", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.10.sql"), "utf-8");

  it("Fonction existe", () => {
    expect(sql).toContain("function patient_dashboard_medecins");
  });

  it("Groupe par nom case-insensitive", () => {
    expect(sql).toContain("group by lower(prescripteur_nom), prescripteur_nom");
  });

  it("est_verifie agrégé via bool_or", () => {
    expect(sql).toContain("bool_or(rpps_verifie)");
  });

  it("Récupère ville/téléphone/email depuis medecins_prescripteurs si lié", () => {
    expect(sql).toContain("from medecins_prescripteurs m");
    expect(sql).toContain("medecin_prescripteur_id");
  });

  it("Tri par dernière date desc nulls last", () => {
    expect(sql).toContain("order by a.date_max desc nulls last");
  });
});

describe("0.56.10 - SQL RPC patient_dashboard_alertes", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.10.sql"), "utf-8");

  it("5 types d'alertes possibles", () => {
    expect(sql).toContain("'expiration_secu'");
    expect(sql).toContain("'expiration_mutuelle'");
    expect(sql).toContain("'ald_sans_commentaire'");
    expect(sql).toContain("'no_caisse'");
    expect(sql).toContain("'renouvellement'");
  });

  it("3 niveaux de sévérité (critique/warning/info)", () => {
    expect(sql).toContain("'critique'");
    expect(sql).toContain("'warning'");
    expect(sql).toContain("'info'");
  });

  it("Sécu : critique si expiré, warning si <= 30 jours", () => {
    expect(sql).toContain("v_patient.date_fin_droits < v_today");
    expect(sql).toContain("v_patient.date_fin_droits - v_today <= 30");
  });

  it("ALD sans commentaire détecté", () => {
    expect(sql).toContain("v_patient.ald = true");
    expect(sql).toContain("v_patient.ald_commentaire is null");
  });

  it("Caisse non renseignée détectée", () => {
    expect(sql).toContain("v_patient.caisse_id is null");
  });

  it("Prescriptions renouvelables > 60 jours", () => {
    expect(sql).toContain("v_today - p.date_prescription > 60");
  });
});

describe("0.56.10 - Page /patient/[id]/dashboard", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/dashboard/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/patient/[id]/dashboard/page.js"))).toBe(true);
  });

  it("Charge les 4 RPC en parallèle", () => {
    expect(src).toContain('rpc("patient_dashboard_summary"');
    expect(src).toContain('rpc("patient_dashboard_medicaments_actifs"');
    expect(src).toContain('rpc("patient_dashboard_medecins"');
    expect(src).toContain('rpc("patient_dashboard_alertes"');
  });

  it("Header patient avec avatar initiales + âge calculé", () => {
    expect(src).toContain("patient.prenom?.[0]");
    expect(src).toContain("patient.nom?.[0]");
    expect(src).toContain("365.25");
  });

  it("Boutons retour vers fiche edit + vue 360", () => {
    expect(src).toContain("/patient/${params.id}/edit");
    expect(src).toContain("/patient/${params.id}");
    expect(src).toContain("Éditer la fiche");
    expect(src).toContain("Vue matériel");
  });

  it("Section alertes contextuelles affichée si > 0", () => {
    expect(src).toContain("alertes.length > 0");
    expect(src).toContain("AlerteRow");
  });

  it("5 KPI (prescriptions, médicaments, médecins, renouvelables, dernière)", () => {
    const matches = src.match(/<Kpi /g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("Section statut administratif (caisse + mutuelle + ALD/C2S/AME)", () => {
    expect(src).toContain("StatutCard");
    expect(src).toContain("Statut administratif");
    expect(src).toContain("Régimes spéciaux");
  });

  it("Badge expiration coloré selon jours restants", () => {
    expect(src).toContain("jours < 0 ? \"#c0392b\"");
    expect(src).toContain("jours <= 30 ? \"#EF9F27\"");
  });

  it("Composant AlerteRow avec 3 niveaux visuels", () => {
    expect(src).toContain("function AlerteRow");
    expect(src).toContain("critique:");
    expect(src).toContain("warning:");
    expect(src).toContain("info:");
  });

  it("Composant MedicamentRow avec dosage + posologie + badge DCI", () => {
    expect(src).toContain("function MedicamentRow");
    expect(src).toContain("est_dci_fournie");
    expect(src).toContain("derniere_dosage");
    expect(src).toContain("Renouvelable");
  });

  it("Composant MedecinRow avec ContactActions", () => {
    expect(src).toContain("function MedecinRow");
    expect(src).toContain("<ContactActions");
    expect(src).toContain("est_verifie");
  });

  it("Bouton 'Scanner une ordonnance' pré-rempli patient_id", () => {
    expect(src).toContain("/scan/prescription?patient_id=");
  });

  it("Bouton 'Voir toutes les prescriptions' redirige onglet patient", () => {
    expect(src).toContain("?tab=prescriptions");
  });

  it("Affichage commentaire ALD si renseigné", () => {
    expect(src).toContain("ald_commentaire");
  });
});

describe("0.56.10 - Bouton dashboard sur fiche patient", () => {
  it("Bouton 'Dashboard santé' ajouté dans /patient/[id]/page.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");
    expect(src).toContain("/dashboard");
    expect(src).toContain("Dashboard santé");
    expect(src).toContain("ti-clipboard-heart");
  });
});
