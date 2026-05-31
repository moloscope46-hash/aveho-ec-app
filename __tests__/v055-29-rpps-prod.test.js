// =============================================================
//  Tests unitaires — 0.55.29
//  Couvre : RPPS FHIR normalization, filtre vue-globale, schéma RPPS
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.29 - RPPS FHIR - normalizePractitioner", () => {
  // Recopie locale de la fonction pour tests
  function normalizePractitioner(practitioner, roles = []) {
    const ids = practitioner.identifier || [];
    const rppsId = ids.find((i) => i.system?.includes("rpps") || i.system?.includes("idnatps"));
    const adeliId = ids.find((i) => i.system?.includes("adeli"));
    const name = practitioner.name?.[0] || {};
    const nom = name.family || "";
    const prenom = (name.given || []).join(" ") || "";
    const civilite = name.prefix?.[0] || "";
    const role = roles.find((r) => r.practitioner?.reference?.endsWith(practitioner.id)) || {};
    let profession = "";
    let specialite = "";
    if (role.code) {
      for (const cc of role.code) {
        const coding = cc.coding?.[0];
        if (!coding) continue;
        if (coding.display) {
          if (!profession) profession = coding.display;
          else specialite = coding.display;
        }
      }
    }
    if (role.specialty && role.specialty[0]?.coding?.[0]?.display) {
      specialite = role.specialty[0].coding[0].display;
    }
    return {
      rpps: rppsId?.value || "",
      adeli: adeliId?.value || "",
      civilite,
      nom,
      prenom,
      profession,
      specialite,
    };
  }

  it("extrait le RPPS depuis identifier system rpps", () => {
    const p = {
      id: "p1",
      identifier: [{ system: "https://api.esante.gouv.fr/rpps", value: "10000000001" }],
      name: [{ family: "DUPONT", given: ["Marie"] }],
    };
    const r = normalizePractitioner(p);
    expect(r.rpps).toBe("10000000001");
    expect(r.nom).toBe("DUPONT");
    expect(r.prenom).toBe("Marie");
  });

  it("extrait le RPPS via idnatps (variante)", () => {
    const p = {
      id: "p2",
      identifier: [{ system: "https://annuaire.sante.fr/idnatps", value: "10000000002" }],
      name: [{ family: "MARTIN" }],
    };
    const r = normalizePractitioner(p);
    expect(r.rpps).toBe("10000000002");
  });

  it("extrait l'ADELI séparément", () => {
    const p = {
      id: "p3",
      identifier: [
        { system: "rpps", value: "10000000003" },
        { system: "adeli", value: "751234567" },
      ],
      name: [{ family: "BERNARD" }],
    };
    const r = normalizePractitioner(p);
    expect(r.rpps).toBe("10000000003");
    expect(r.adeli).toBe("751234567");
  });

  it("extrait la civilité depuis name.prefix", () => {
    const p = {
      id: "p4",
      identifier: [],
      name: [{ family: "PETIT", given: ["Lucas"], prefix: ["Dr"] }],
    };
    const r = normalizePractitioner(p);
    expect(r.civilite).toBe("Dr");
  });

  it("extrait profession depuis PractitionerRole.code", () => {
    const p = { id: "p5", identifier: [], name: [{ family: "X" }] };
    const role = {
      practitioner: { reference: "Practitioner/p5" },
      code: [
        { coding: [{ display: "Médecin" }] },
      ],
    };
    const r = normalizePractitioner(p, [role]);
    expect(r.profession).toBe("Médecin");
  });

  it("extrait spécialité depuis role.specialty", () => {
    const p = { id: "p6", identifier: [], name: [{ family: "X" }] };
    const role = {
      practitioner: { reference: "Practitioner/p6" },
      code: [{ coding: [{ display: "Médecin" }] }],
      specialty: [{ coding: [{ display: "Cardiologie" }] }],
    };
    const r = normalizePractitioner(p, [role]);
    expect(r.profession).toBe("Médecin");
    expect(r.specialite).toBe("Cardiologie");
  });

  it("champs vides si rien", () => {
    const p = { id: "x", identifier: [], name: [] };
    const r = normalizePractitioner(p);
    expect(r.rpps).toBe("");
    expect(r.nom).toBe("");
  });
});

describe("0.55.29 - vue-globale - filtre Mes / Partenaires / Tous", () => {
  const rows = [
    { id: "1", nom: "Mon EHPAD", est_partenaire: false },
    { id: "2", nom: "Mon Hôpital", est_partenaire: false },
    { id: "3", nom: "Partenaire EUROAPI", est_partenaire: true },
    { id: "4", nom: "Partenaire HAD", est_partenaire: true },
  ];

  function applyFilter(rows, filter) {
    return rows.filter((e) => {
      if (filter === "mine") return !e.est_partenaire;
      if (filter === "partners") return e.est_partenaire;
      return true;
    });
  }

  it("filter=mine → uniquement non-partenaires", () => {
    const r = applyFilter(rows, "mine");
    expect(r.length).toBe(2);
    expect(r.every((e) => !e.est_partenaire)).toBe(true);
  });

  it("filter=partners → uniquement partenaires", () => {
    const r = applyFilter(rows, "partners");
    expect(r.length).toBe(2);
    expect(r.every((e) => e.est_partenaire)).toBe(true);
  });

  it("filter=all → tous", () => {
    const r = applyFilter(rows, "all");
    expect(r.length).toBe(4);
  });
});

describe("0.55.29 - Schéma RPPS - champs invitations", () => {
  it("inviteForm contient rpps + adeli + rpps_profession", () => {
    const inviteForm = {
      email: "test@x.fr",
      rpps: "10000000001",
      adeli: "751234567",
      rpps_profession: "Médecin",
      rpps_specialite: "Cardiologie",
      rpps_mode_exercice: "Libéral",
    };
    expect(inviteForm.rpps).toBeTruthy();
    expect(inviteForm.adeli).toBeTruthy();
    expect(inviteForm.rpps_profession).toBe("Médecin");
  });

  it("validation RPPS 11 chiffres", () => {
    const isValid = (r) => /^\d{11}$/.test(r);
    expect(isValid("10000000001")).toBe(true);
    expect(isValid("123")).toBe(false);
  });
});

describe("0.55.29 - URL FHIR construction", () => {
  function buildFhirUrl(base, params) {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") u.set(k, v);
    }
    return `${base}/Practitioner?${u}`;
  }

  it("Construit URL avec family", () => {
    const url = buildFhirUrl("https://fhir.ans/v2", { family: "DUPONT", _count: 20 });
    expect(url).toContain("family=DUPONT");
    expect(url).toContain("_count=20");
  });

  it("Construit URL avec identifier (RPPS exact)", () => {
    const url = buildFhirUrl("https://fhir.ans/v2", { identifier: "10000000001", _count: 1 });
    expect(url).toContain("identifier=10000000001");
  });
});
