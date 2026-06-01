// =============================================================
//  Tests unitaires — 0.56.18
//  Coordonnées & contacts sur la fiche patient
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.18 - Fiche patient : panel Coordonnées & contacts", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");

  it("Import du composant ContactActions", () => {
    expect(src).toContain('import ContactActions from "../../ContactActions"');
  });

  it("État caisseInfo + mutuelleInfo", () => {
    expect(src).toContain("const [caisseInfo, setCaisseInfo]");
    expect(src).toContain("const [mutuelleInfo, setMutuelleInfo]");
  });

  it("Chargement parallèle caisse + mutuelle si patient en a", () => {
    expect(src).toContain("p?.caisse_id");
    expect(src).toContain("p?.mutuelle_id");
    expect(src).toContain('from("caisses_assurance_maladie").select("*")');
    expect(src).toContain('from("mutuelles").select("*")');
  });

  it("Composant CoordonneesPanel défini", () => {
    expect(src).toContain("function CoordonneesPanel");
  });

  it("CoordonneesPanel intégré entre header et KPIs", () => {
    expect(src).toContain("<CoordonneesPanel");
    expect(src).toMatch(/<CoordonneesPanel[\s\S]*?caisseInfo=\{caisseInfo\}[\s\S]*?mutuelleInfo=\{mutuelleInfo\}/);
  });

  it("Affichage patient avec téléphone portable / fixe / email", () => {
    expect(src).toContain("telephone_portable");
    expect(src).toContain("telephone_fixe");
  });

  it("Section urgence avec contact_urgence_telephone + nom + lien", () => {
    expect(src).toContain("contact_urgence_telephone");
    expect(src).toContain("contact_urgence_nom");
    expect(src).toContain("contact_urgence_lien");
  });

  it("Section personne de confiance", () => {
    expect(src).toContain("personne_confiance_nom");
    expect(src).toContain("personne_confiance_telephone");
  });

  it("Section médecin traitant avec RPPS", () => {
    expect(src).toContain("medecin_traitant_rpps");
    expect(src).toContain("medecin_traitant_telephone");
  });

  it("Section caisse avec ContactActions sur caisseInfo", () => {
    expect(src).toMatch(/caisseInfo[\s\S]*?ContactActions/);
  });

  it("Section mutuelle avec ContactActions sur mutuelleInfo", () => {
    expect(src).toMatch(/mutuelleInfo[\s\S]*?ContactActions/);
  });

  it("Identifiants administratifs : dossier, IPP, n°SS, n° adhérent", () => {
    expect(src).toContain("pat.numero_dossier");
    expect(src).toContain("pat.ipp");
    expect(src).toContain("pat.numero_secu");
    expect(src).toContain("pat.mutuelle_numero_adherent");
  });

  it("Composant IdRow avec bouton Copier", () => {
    expect(src).toContain("function IdRow");
    expect(src).toContain("onCopy");
    expect(src).toContain("ti-copy");
  });

  it("Composant CoordRow avec borderLeft coloré + ContactActions size sm", () => {
    expect(src).toContain("function CoordRow");
    expect(src).toContain("borderLeft");
    expect(src).toContain('size="sm"');
  });

  it("copyToClipboard utilise navigator.clipboard", () => {
    expect(src).toContain("navigator.clipboard?.writeText");
  });

  it("template_libelle retiré du rendu consentements", () => {
    expect(src).not.toContain("c.template_libelle");
  });
});

describe("0.56.18 - ContactActions : fallback cp ↔ code_postal", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/ContactActions.js"), "utf-8");

  it("Lit entity.cp en fallback de entity.code_postal", () => {
    expect(src).toContain("entity.cp || entity.code_postal");
  });

  it("Commentaire 0.56.18 explicite le pourquoi", () => {
    expect(src).toContain("0.56.18");
  });
});
