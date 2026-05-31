// =============================================================
//  Tests unitaires — lib/rgpd.js
//  Alpha 0.21.0
// =============================================================
import { describe, it, expect } from "vitest";
import {
  FINALITES,
  VERSION_TEMPLATE,
  TEMPLATE_CONSENTEMENT,
  renderConsentement,
  consentementToHtml,
} from "../lib/rgpd.js";

describe("FINALITES", () => {
  it("contient au moins 5 finalités", () => {
    expect(FINALITES.length).toBeGreaterThanOrEqual(5);
  });
  it("chaque finalité a une clé, un libellé et une description", () => {
    FINALITES.forEach((f) => {
      expect(f.k).toBeTruthy();
      expect(f.l).toBeTruthy();
      expect(f.d).toBeTruthy();
    });
  });
  it("contient les finalités obligatoires (soins, materiel, facturation)", () => {
    const keys = FINALITES.map(f => f.k);
    expect(keys).toContain("soins");
    expect(keys).toContain("materiel");
    expect(keys).toContain("facturation");
  });
});

describe("VERSION_TEMPLATE", () => {
  it("est une chaîne semver-like", () => {
    expect(typeof VERSION_TEMPLATE).toBe("string");
    expect(VERSION_TEMPLATE).toMatch(/^\d+\.\d+/);
  });
});

describe("renderConsentement", () => {
  const vars = {
    patient_nom_prenom: "Marie Dupont",
    patient_date_naissance: "1945-03-15",
    patient_numero_dossier: "2024-0142",
    collectivite_nom: "EHPAD Les Tilleuls",
    etablissement_nom: "Site de Mayrinhac",
    date_signature: "30/05/2026",
    finalites_acceptees: ["soins", "materiel", "facturation"],
  };

  it("remplace patient_nom_prenom", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toContain("Marie Dupont");
  });

  it("remplace collectivite_nom", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toContain("EHPAD Les Tilleuls");
  });

  it("remplace date_signature", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toContain("30/05/2026");
  });

  it("affiche etablissement_nom dans le bloc dédié", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toContain("Site de Mayrinhac");
  });

  it("affiche date_naissance formatée FR", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toMatch(/15\/03\/1945/);
  });

  it("affiche numero_dossier", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toContain("2024-0142");
  });

  it("affiche check ✓ pour finalités acceptées et ☐ pour refusées", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).toContain("✓");
    expect(out).toContain("☐"); // car "amelioration" et "communication" pas cochées
  });

  it("ne plante pas avec un patient sans date_naissance", () => {
    const minimal = { patient_nom_prenom: "Jean Test", collectivite_nom: "Test", finalites_acceptees: [] };
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, minimal);
    expect(out).toContain("Jean Test");
    expect(out).not.toContain("{{");
  });

  it("ne reste aucun placeholder non remplacé", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    expect(out).not.toMatch(/\{\{[a-z_]+\}\}/);
  });

  it("toutes les finalités obligatoires sont marquées dans le rendu", () => {
    const out = renderConsentement(TEMPLATE_CONSENTEMENT, vars);
    FINALITES.filter(f => ["soins", "materiel", "facturation"].includes(f.k)).forEach(f => {
      expect(out).toContain(f.l);
    });
  });
});

describe("consentementToHtml", () => {
  it("transforme **gras** en <strong>", () => {
    const html = consentementToHtml("Texte **important** ici.");
    expect(html).toContain("<strong>important</strong>");
  });

  it("transforme --- en <hr />", () => {
    const html = consentementToHtml("Avant\n\n---\n\nAprès");
    expect(html).toContain("<hr");
  });

  it("transforme les listes - en <ul><li>", () => {
    const html = consentementToHtml("- item un\n- item deux");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item un</li>");
    expect(html).toContain("<li>item deux</li>");
  });

  it("transforme paragraphes en <p>", () => {
    const html = consentementToHtml("Para 1.\n\nPara 2.");
    expect(html).toContain("<p>");
  });

  it("échappe le HTML dangereux", () => {
    const html = consentementToHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("le template complet rendu donne du HTML valide non vide", () => {
    const md = renderConsentement(TEMPLATE_CONSENTEMENT, {
      patient_nom_prenom: "Test", collectivite_nom: "Co", finalites_acceptees: ["soins"]
    });
    const html = consentementToHtml(md);
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain("<strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<hr");
  });
});
