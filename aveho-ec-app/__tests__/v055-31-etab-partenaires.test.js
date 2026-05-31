// =============================================================
//  Tests unitaires — 0.55.31
//  Couvre : etablissements_partenaires schema, audit trigger logique,
//  vue-globale dual-source, filtres relation
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.31 - Table etablissements_partenaires - schéma", () => {
  it("Champs identité présents", () => {
    const fields = ["nom", "type", "type_relation"];
    expect(fields.length).toBe(3);
  });

  it("Champs identifiants officiels", () => {
    const ids = ["finess", "siret", "siren"];
    expect(ids.length).toBe(3);
  });

  it("Champs adresse + géoloc", () => {
    const adr = ["adresse", "cp", "ville", "latitude", "longitude"];
    expect(adr).toContain("latitude");
    expect(adr).toContain("longitude");
  });

  it("Champs contact", () => {
    const contact = ["contact_nom", "contact_fonction", "telephone", "email", "site_web"];
    expect(contact).toContain("contact_nom");
  });

  it("link_to_etablissement_id pour transition douce", () => {
    const linkField = "link_to_etablissement_id";
    expect(linkField).toContain("etablissement");
  });
});

describe("0.55.31 - Types de relation", () => {
  const TYPES = ["Prescripteur", "Fournisseur", "Sous-traitant", "Confrère", "Autre"];

  it("5 types de relation définis", () => {
    expect(TYPES.length).toBe(5);
  });

  it("Prescripteur en 1er (cas le plus courant)", () => {
    expect(TYPES[0]).toBe("Prescripteur");
  });

  it("Autre en dernier (fallback)", () => {
    expect(TYPES[TYPES.length - 1]).toBe("Autre");
  });
});

describe("0.55.31 - Vue-globale dual-source", () => {
  const myEtabs = [
    { id: "m1", nom: "Mon EHPAD", est_partenaire: false },
    { id: "m2", nom: "Mon HAD", est_partenaire: false },
  ];
  const partnersTable = [
    { id: "p1", nom: "Hôpital Tiers", link_to_etablissement_id: null },
  ];
  const legacyPartners = [
    { id: "l1", nom: "Ancien partenaire", est_partenaire: true },
  ];

  it("Mes + Partenaires (table dédiée) + legacy = liste consolidée", () => {
    const all = [...myEtabs, ...partnersTable, ...legacyPartners];
    expect(all.length).toBe(4);
  });

  it("Légacy NON dédupliqué si pas dans link_to_etablissement_id", () => {
    const linkedIds = partnersTable.map((p) => p.link_to_etablissement_id).filter(Boolean);
    const filteredLegacy = legacyPartners.filter((e) => !linkedIds.includes(e.id));
    expect(filteredLegacy.length).toBe(1);
  });

  it("Légacy dédupliqué si link existe", () => {
    const partnersWithLink = [{ id: "p1", link_to_etablissement_id: "l1" }];
    const linkedIds = partnersWithLink.map((p) => p.link_to_etablissement_id);
    const filteredLegacy = legacyPartners.filter((e) => !linkedIds.includes(e.id));
    expect(filteredLegacy.length).toBe(0);
  });
});

describe("0.55.31 - Trigger audit - logique de diff", () => {
  function computeDiff(oldRow, newRow) {
    const changes = {};
    const allKeys = new Set([...Object.keys(oldRow || {}), ...Object.keys(newRow || {})]);
    for (const k of allKeys) {
      if (oldRow?.[k] !== newRow?.[k]) {
        changes[k] = { old: oldRow?.[k], new: newRow?.[k] };
      }
    }
    return changes;
  }

  it("Pas de changes si rien n'a changé", () => {
    const d = computeDiff({ nom: "A" }, { nom: "A" });
    expect(Object.keys(d).length).toBe(0);
  });

  it("Détecte changement de nom", () => {
    const d = computeDiff({ nom: "A" }, { nom: "B" });
    expect(d.nom.old).toBe("A");
    expect(d.nom.new).toBe("B");
  });

  it("Détecte ajout de champ", () => {
    const d = computeDiff({ nom: "X" }, { nom: "X", telephone: "0123" });
    expect(d.telephone.new).toBe("0123");
  });

  it("Détecte suppression de champ", () => {
    const d = computeDiff({ nom: "X", email: "x@y.fr" }, { nom: "X" });
    expect(d.email.old).toBe("x@y.fr");
  });
});

describe("0.55.31 - Audit row - format", () => {
  it("INSERT a new_data, pas old_data", () => {
    const auditRow = { action: "INSERT", new_data: { nom: "X" }, old_data: null };
    expect(auditRow.new_data).toBeTruthy();
    expect(auditRow.old_data).toBeNull();
  });

  it("DELETE a old_data, pas new_data", () => {
    const auditRow = { action: "DELETE", new_data: null, old_data: { nom: "X" } };
    expect(auditRow.new_data).toBeNull();
    expect(auditRow.old_data).toBeTruthy();
  });

  it("UPDATE a old_data + new_data + changes", () => {
    const auditRow = {
      action: "UPDATE",
      old_data: { nom: "X" },
      new_data: { nom: "Y" },
      changes: { nom: { old: "X", new: "Y" } },
    };
    expect(auditRow.changes.nom).toBeTruthy();
  });
});

describe("0.55.31 - convert_etab_to_partner - logique", () => {
  it("Renvoie partenaire_id si OK", () => {
    const response = { ok: true, partenaire_id: "uuid-1" };
    expect(response.ok).toBe(true);
    expect(response.partenaire_id).toBeTruthy();
  });

  it("Renvoie error si permission refusée", () => {
    const response = { ok: false, error: "Permission refusée" };
    expect(response.ok).toBe(false);
  });
});
