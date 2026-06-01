// =============================================================
//  Tests unitaires — 0.56.15
//  Module équipes + TopBar réorganisée en 6 sections métier
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.15 - SQL : module équipes", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.15.sql"), "utf-8");

  it("Table equipes avec colonnes attendues", () => {
    expect(sql).toContain("create table if not exists equipes");
    expect(sql).toMatch(/structure_id uuid not null references structures/);
    expect(sql).toMatch(/batiment_id uuid references batiments/);
    expect(sql).toContain("est_par_defaut boolean default false");
    expect(sql).toContain("couleur text default");
    expect(sql).toContain("archive boolean default false");
  });

  it("Table equipes_membres (N à N user)", () => {
    expect(sql).toContain("create table if not exists equipes_membres");
    expect(sql).toContain("role_dans_equipe text default 'membre'");
    expect(sql).toMatch(/check.*responsable.*membre/);
    expect(sql).toContain("primary key (equipe_id, user_id)");
  });

  it("Table equipes_services (N à N service)", () => {
    expect(sql).toContain("create table if not exists equipes_services");
    expect(sql).toContain("primary key (equipe_id, service_id)");
  });

  it("RLS sur les 3 tables", () => {
    expect(sql).toContain("alter table equipes enable row level security");
    expect(sql).toContain("alter table equipes_membres enable row level security");
    expect(sql).toContain("alter table equipes_services enable row level security");
  });

  it("4 policies sur equipes (select/insert/update/delete)", () => {
    expect(sql).toContain('"equipes_select"');
    expect(sql).toContain('"equipes_insert"');
    expect(sql).toContain('"equipes_update"');
    expect(sql).toContain('"equipes_delete"');
  });

  it("Trigger create_default_team sur insert batiment", () => {
    expect(sql).toContain("function trigger_create_default_team");
    expect(sql).toContain("create trigger trg_create_default_team");
    expect(sql).toContain("after insert on batiments");
    expect(sql).toContain("'Équipe ' || new.nom");
  });

  it("RPC equipes_avec_stats avec p_batiment_id optionnel", () => {
    expect(sql).toContain("function equipes_avec_stats(p_batiment_id uuid default null)");
    expect(sql).toContain("nb_membres bigint");
    expect(sql).toContain("nb_services bigint");
    expect(sql).toContain("services_noms text[]");
  });

  it("RPC equipe_detail retourne user_id + nom_affiche + email + role", () => {
    expect(sql).toContain("function equipe_detail(p_equipe_id uuid)");
    expect(sql).toContain("nom_affiche text");
    expect(sql).toContain("role_dans_equipe text");
    expect(sql).toContain("from equipes_membres em");
    expect(sql).toContain("left join membres_structure ms");
  });

  it("RPC mes_equipes() filtre sur auth.uid()", () => {
    expect(sql).toContain("function mes_equipes()");
    expect(sql).toContain("where em.user_id = auth.uid()");
  });
});

describe("0.56.15 - Page /equipes : liste", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/equipes/page.js"), "utf-8");

  it("Charge via RPC equipes_avec_stats", () => {
    expect(src).toContain('"equipes_avec_stats"');
    expect(src).toContain("p_batiment_id: filterBat || null");
  });

  it("Filtres : recherche texte + bâtiment", () => {
    expect(src).toContain("filterBat");
    expect(src).toContain('setFilter(e.target.value)');
  });

  it("Création avec couleur picker", () => {
    expect(src).toContain('type="color"');
    expect(src).toContain('couleur: "#185FA5"');
  });

  it("Groupement par bâtiment", () => {
    expect(src).toContain("grouped[key]");
    expect(src).toContain("Équipes transversales");
  });

  it("Badge PAR DÉFAUT visible si est_par_defaut", () => {
    expect(src).toContain("est_par_defaut");
    expect(src).toContain("PAR DÉFAUT");
  });

  it("Affichage stats : nb_membres + nb_services + services_noms", () => {
    expect(src).toContain("nb_membres");
    expect(src).toContain("nb_services");
    expect(src).toContain("services_noms");
  });

  it("Archivage soft (update archive=true)", () => {
    expect(src).toContain('.update({ archive: true })');
  });
});

describe("0.56.15 - Page /equipe/[id] : détail", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/equipe/[id]/page.js"), "utf-8");

  it("Header gradient avec couleur de l'équipe", () => {
    expect(src).toContain("linear-gradient(135deg,");
    expect(src).toContain("${equipe.couleur");
  });

  it("Charge membres via RPC equipe_detail", () => {
    expect(src).toContain('"equipe_detail"');
    expect(src).toContain("p_equipe_id: params.id");
  });

  it("Ajout membre avec role 'membre' par défaut", () => {
    expect(src).toContain('role_dans_equipe: "membre"');
  });

  it("Toggle role responsable ↔ membre", () => {
    expect(src).toContain("toggleRole");
    expect(src).toContain('newRole = currentRole === "responsable"');
  });

  it("Gestion services avec equipes_services", () => {
    expect(src).toContain('from("equipes_services")');
    expect(src).toContain("addService");
    expect(src).toContain("removeService");
  });

  it("Affichage rôle responsable avec icône crown", () => {
    expect(src).toContain("ti-crown");
    expect(src).toContain('"responsable"');
  });

  it("Liste candidats exclut déjà-membres", () => {
    expect(src).toContain("memberIds.has");
    expect(src).toContain("serviceIds.has");
  });
});

describe("0.56.15 - TopBar réorganisée en 6 sections métier", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");

  it("Section 'Collectivité' présente (avec hiérarchie complète)", () => {
    expect(src).toMatch(/section: "Collectivité"/);
  });

  it("Section 'Scan' présente", () => {
    expect(src).toMatch(/section: "Scan"/);
  });

  it("Section 'Commande' présente", () => {
    expect(src).toMatch(/section: "Commande"/);
  });

  it("Section 'Livraison' présente", () => {
    expect(src).toMatch(/section: "Livraison"/);
  });

  it("Section 'Administratif' présente", () => {
    expect(src).toMatch(/section: "Administratif"/);
  });

  it("Section 'Administration' (admin tech) toujours là", () => {
    expect(src).toMatch(/section: "Administration"/);
  });

  it("Entrée /equipes ajoutée dans Collectivité", () => {
    expect(src).toContain('p: "/equipes"');
    expect(src).toContain('lbl: "Équipes"');
  });

  it("Anciennes sections Établissement/Stock/Groupement supprimées (fusionnées)", () => {
    // Le nom "Établissement" ne doit plus être une section (mais peut rester comme label d'item)
    expect(src).not.toMatch(/section: "Établissement"/);
    expect(src).not.toMatch(/section: "Stock"/);
    expect(src).not.toMatch(/section: "Groupement"/);
  });

  it("Patients + Matériel dans Collectivité (pas Établissement)", () => {
    const collectMatch = src.match(/section: "Collectivité"[\s\S]*?\] \}/);
    expect(collectMatch).toBeTruthy();
    expect(collectMatch[0]).toContain('/patients');
    expect(collectMatch[0]).toContain('/materiels');
    expect(collectMatch[0]).toContain('/equipes');
  });

  it("Achats déplacé dans Commande (workflow métier)", () => {
    const commandeMatch = src.match(/section: "Commande"[\s\S]*?\] \}/);
    expect(commandeMatch).toBeTruthy();
    expect(commandeMatch[0]).toContain('/achats');
  });

  it("Interventions + Transferts + Maintenance regroupés dans Livraison", () => {
    const livMatch = src.match(/section: "Livraison"[\s\S]*?\] \}/);
    expect(livMatch).toBeTruthy();
    expect(livMatch[0]).toContain('/interventions');
    expect(livMatch[0]).toContain('/transferts');
    expect(livMatch[0]).toContain('/maintenance');
  });
});
