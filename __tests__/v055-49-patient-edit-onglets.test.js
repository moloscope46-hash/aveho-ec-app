// =============================================================
//  Tests unitaires — 0.55.49
//  Nouvelle page fiche patient édition + fix recherche libre carte
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.49 - Page édition patient avec onglets", () => {
  const editPath = "app/patient/[id]/edit/page.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), editPath), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), editPath))).toBe(true);
  });

  it("6 onglets définis (identite, secu, adresses, contacts, medecin, audit)", () => {
    expect(src).toContain('id: "identite"');
    expect(src).toContain('id: "secu"');
    expect(src).toContain('id: "adresses"');
    expect(src).toContain('id: "contacts"');
    expect(src).toContain('id: "medecin"');
    expect(src).toContain('id: "audit"');
  });

  it("Import CaisseSearch + MutuelleSearch", () => {
    expect(src).toContain('import CaisseSearch from');
    expect(src).toContain('import MutuelleSearch from');
  });

  it("Charge patient + adresses livraison en parallèle", () => {
    expect(src).toContain("Promise.all");
    expect(src).toContain('"patients"');
    expect(src).toContain('"patients_adresses_livraison"');
  });

  it("Hydrate caisseInfo + mutuelleInfo si liées", () => {
    expect(src).toContain('"caisses_assurance_maladie"');
    expect(src).toContain('"mutuelles"');
  });

  it("Save payload contient tous les champs bulletin de situation", () => {
    expect(src).toContain("nom_naissance");
    expect(src).toContain("numero_secu");
    expect(src).toContain("caisse_id");
    expect(src).toContain("mutuelle_id");
    expect(src).toContain("contact_urgence_nom");
    expect(src).toContain("personne_confiance_nom");
    expect(src).toContain("medecin_traitant_rpps");
    expect(src).toContain("ald");
    expect(src).toContain("c2s");
    expect(src).toContain("ame");
  });

  it("Gestion 1-N adresses : add / update / save / remove", () => {
    expect(src).toContain("function addAdresse");
    expect(src).toContain("function updateAdresse");
    expect(src).toContain("function saveAdresse");
    expect(src).toContain("function removeAdresse");
  });

  it("Onglet Adresses : champs livraison (destinataire, code_porte, instructions)", () => {
    expect(src).toContain("destinataire");
    expect(src).toContain("code_porte");
    expect(src).toContain("instructions");
    expect(src).toContain("est_principale");
  });

  it("Onglet Secu : régime, qualité, droits, ALD/C2S/AME", () => {
    expect(src).toContain("regime_secu");
    expect(src).toContain("qualite_assure");
    expect(src).toContain("date_debut_droits");
    expect(src).toContain("Toggle");
  });

  it("Onglet Audit : source_creation + BS file URL + OCR brut", () => {
    expect(src).toContain("source_creation");
    expect(src).toContain("bs_file_url");
    expect(src).toContain("bs_ocr_brut");
  });

  it("Bouton Sauvegarder sticky en bas", () => {
    expect(src).toContain('position: "sticky"');
    expect(src).toContain("Sauvegarder");
  });

  it("Composant Field réutilisable (label + input + mono + compact)", () => {
    expect(src).toContain("function Field(");
  });

  it("Composant Toggle pour booléens (ALD/C2S/AME)", () => {
    expect(src).toContain("function Toggle(");
  });
});

describe("0.55.49 - Fix recherche libre carte (visibles 0)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");

  it("Plus de filtre bbox sur recherche libre (affiche tout)", () => {
    // Le nouveau code n'a plus le filtre bbox sur les résultats de recherche libre
    // (on filtre uniquement les RPPS/FINESS/SIRENE auto-overlays, pas le freeSearch)
    expect(src).toContain("all.filter(x => x.latitude && x.longitude)");
    expect(src).toContain("0.55.49");
  });

  it("Auto-fit carte sur résultats (sinon user voit rien)", () => {
    expect(src).toContain("fitBounds");
    expect(src).toContain("visible.map(x => [x.latitude, x.longitude])");
  });

  it("Console log montre 'affichés' + 'total avec coords'", () => {
    expect(src).toContain("total avec coords");
    expect(src).toContain("affichés");
  });

  it("Avertissement API ANS bloquée sur panneau RPPS carte", () => {
    expect(src).toContain("API ANS bloquée");
    expect(src).toContain("/admin/rpps-diagnostic");
  });
});

describe("0.55.49 - Lien depuis fiche patient vers édition", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");

  it("Bouton 'Édition complète' pointe vers /patient/[id]/edit", () => {
    expect(src).toContain("Édition complète");
    expect(src).toContain("router.push(`/patient/${patId}/edit`)");
  });
});
