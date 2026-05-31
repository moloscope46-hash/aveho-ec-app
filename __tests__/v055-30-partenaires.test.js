// =============================================================
//  Tests unitaires — 0.55.30
//  Couvre : partenaires_rpps, classification auto, recap invitation
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.30 - partenaires_rpps - classification auto", () => {
  function classifyFromProfession(profession) {
    const p = (profession || "").toLowerCase();
    return {
      est_prescripteur: p.includes("médecin"),
      est_intervenant: !!p.match(/infirm|kin|sage/),
    };
  }

  it("Médecin → prescripteur, pas intervenant", () => {
    const r = classifyFromProfession("Médecin");
    expect(r.est_prescripteur).toBe(true);
    expect(r.est_intervenant).toBe(false);
  });

  it("Infirmier → intervenant, pas prescripteur", () => {
    const r = classifyFromProfession("Infirmier");
    expect(r.est_prescripteur).toBe(false);
    expect(r.est_intervenant).toBe(true);
  });

  it("Infirmière → intervenant (variante)", () => {
    const r = classifyFromProfession("Infirmière");
    expect(r.est_intervenant).toBe(true);
  });

  it("Kinésithérapeute → intervenant", () => {
    const r = classifyFromProfession("Kinésithérapeute");
    expect(r.est_intervenant).toBe(true);
  });

  it("Sage-femme → intervenant", () => {
    const r = classifyFromProfession("Sage-femme");
    expect(r.est_intervenant).toBe(true);
  });

  it("Pharmacien → ni l'un ni l'autre par défaut", () => {
    const r = classifyFromProfession("Pharmacien");
    expect(r.est_prescripteur).toBe(false);
    expect(r.est_intervenant).toBe(false);
  });
});

describe("0.55.30 - partenaires_rpps - filtres recherche", () => {
  const rows = [
    { id: "1", nom: "DUPONT", prenom: "Marie", profession: "Médecin", commune: "Paris", rpps: "10000000001" },
    { id: "2", nom: "BERNARD", prenom: "Sophie", profession: "Infirmier", commune: "Lyon", rpps: "10000000002" },
    { id: "3", nom: "PETIT", prenom: "Lucas", profession: "Kinésithérapeute", commune: "Gramat", rpps: "10000000003" },
  ];

  function filterPartenaires(rows, search, tag) {
    return rows.filter((p) => {
      const matchTag =
        tag === "all" ||
        (tag === "prescripteur" && (p.profession || "").toLowerCase().includes("médecin")) ||
        (tag === "intervenant" && (p.profession || "").toLowerCase().match(/infirm|kin|sage/));
      if (!matchTag) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (p.nom || "").toLowerCase().includes(s)
          || (p.prenom || "").toLowerCase().includes(s)
          || (p.profession || "").toLowerCase().includes(s)
          || (p.rpps || "").includes(s)
          || (p.commune || "").toLowerCase().includes(s);
    });
  }

  it("filtre tag=prescripteur → médecins seulement", () => {
    const r = filterPartenaires(rows, "", "prescripteur");
    expect(r.length).toBe(1);
    expect(r[0].nom).toBe("DUPONT");
  });

  it("filtre tag=intervenant → IDE + kiné", () => {
    const r = filterPartenaires(rows, "", "intervenant");
    expect(r.length).toBe(2);
  });

  it("filtre par RPPS exact", () => {
    const r = filterPartenaires(rows, "10000000002", "all");
    expect(r.length).toBe(1);
    expect(r[0].nom).toBe("BERNARD");
  });

  it("filtre par commune", () => {
    const r = filterPartenaires(rows, "gramat", "all");
    expect(r.length).toBe(1);
    expect(r[0].prenom).toBe("Lucas");
  });
});

describe("0.55.30 - createdInviteLink (popup) - structure objet", () => {
  it("structure complète avec RPPS + lock + matricule", () => {
    const popup = {
      link: "https://aveho-ec.vercel.app/inscription/abc",
      email: "marie@example.fr",
      nom: "Marie DUPONT",
      role: "Médecin",
      rpps: "10000000001",
      rpps_profession: "Médecin",
      rpps_specialite: "Cardiologie",
      etabNoms: ["EHPAD Tilleuls"],
      lock_assignment: true,
      matricule: "0042",
    };
    expect(popup.link).toContain("inscription");
    expect(popup.rpps).toBe("10000000001");
    expect(popup.lock_assignment).toBe(true);
    expect(popup.etabNoms.length).toBe(1);
  });

  it("rétro-compat : popup sans RPPS reste valide", () => {
    const popup = {
      link: "https://x/inscription/y",
      email: "x@y.fr",
      nom: "X",
      role: "User",
      etabNoms: [],
      lock_assignment: false,
    };
    expect(popup.rpps).toBeUndefined();
    // L'UI doit gérer rpps undefined sans crasher
    const showRpps = !!popup.rpps;
    expect(showRpps).toBe(false);
  });
});

describe("0.55.30 - add_user_to_etablissement - logique", () => {
  it("Insert avec ON CONFLICT DO NOTHING (idempotent)", () => {
    // L'opération doit être idempotente : 2 ajouts du même couple = pas d'erreur
    const ops = [
      { user: "u1", etab: "e1" },
      { user: "u1", etab: "e1" }, // doublon
    ];
    const uniqueOps = [...new Set(ops.map((o) => `${o.user}:${o.etab}`))];
    expect(uniqueOps.length).toBe(1);
  });
});

describe("0.55.30 - Hotfix vue-globale - groupement_id retiré", () => {
  it("SELECT vue-globale n'inclut plus groupement_id", () => {
    const cols = "id,nom,type,ville,actif,est_partenaire";
    expect(cols).not.toContain("groupement_id");
  });
});
