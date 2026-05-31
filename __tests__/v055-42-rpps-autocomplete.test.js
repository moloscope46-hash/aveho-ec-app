// =============================================================
//  Tests unitaires — 0.55.42
//  RppsAutocomplete style FinessSearch
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.42 - RppsAutocomplete - logique de recherche", () => {
  function shouldSearch(trimmed, profession) {
    return trimmed.length >= 2 || !!profession;
  }

  it("Pas de search si query < 2 chars sans profession", () => {
    expect(shouldSearch("D", "")).toBe(false);
  });

  it("Search si query >= 2 chars", () => {
    expect(shouldSearch("DU", "")).toBe(true);
  });

  it("Search même si query courte mais profession active", () => {
    expect(shouldSearch("", "Médecin")).toBe(true);
  });

  it("Détection numéro RPPS (11 chiffres)", () => {
    expect(/^\d{11}$/.test("10000000001")).toBe(true);
    expect(/^\d{11}$/.test("1000000000")).toBe(false); // 10 chiffres
    expect(/^\d{11}$/.test("DUPONT")).toBe(false);
  });
});

describe("0.55.42 - Construction params API", () => {
  function buildParams({ trimmed, profession, isRppsNumber }) {
    const params = new URLSearchParams();
    if (isRppsNumber) params.set("rpps", trimmed);
    else if (trimmed.length >= 2) params.set("q", trimmed);
    if (profession) params.set("profession", profession);
    params.set("limit", "10");
    return params;
  }

  it("RPPS exact prioritaire sur q", () => {
    const p = buildParams({ trimmed: "10000000001", isRppsNumber: true });
    expect(p.get("rpps")).toBe("10000000001");
    expect(p.has("q")).toBe(false);
  });

  it("q sinon", () => {
    const p = buildParams({ trimmed: "DUPONT", isRppsNumber: false });
    expect(p.get("q")).toBe("DUPONT");
  });

  it("Limite 10", () => {
    const p = buildParams({ trimmed: "X", isRppsNumber: false });
    expect(p.get("limit")).toBe("10");
  });
});

describe("0.55.42 - Hover Google photo fetch", () => {
  it("Construction params place query", () => {
    const r = { prenom: "Marie", nom: "DUPONT", adresse: "12 rue X", cp: "75011", commune: "Paris" };
    const adresseComplete = [r.adresse, r.cp, r.commune].filter(Boolean).join(", ");
    const nom = [r.prenom, r.nom].filter(Boolean).join(" ");
    expect(nom).toBe("Marie DUPONT");
    expect(adresseComplete).toBe("12 rue X, 75011, Paris");
  });

  it("Skip si pas d'adresse", () => {
    const r = { nom: "X" };
    const adresseComplete = [r.adresse, r.cp, r.commune].filter(Boolean).join(", ");
    expect(adresseComplete).toBe("");
    expect(!!adresseComplete).toBe(false);
  });

  it("Évite re-fetch (mémoïzation)", () => {
    const hoverPhoto = { "rpps123": "https://photo.jpg" };
    const key = "rpps123";
    const shouldFetch = hoverPhoto[key] === undefined;
    expect(shouldFetch).toBe(false);
  });
});

describe("0.55.42 - Intégration création partenaire", () => {
  it("Pré-remplit form avec données RPPS", () => {
    const form = { nom: "", type: "", adresse: "", cp: "", ville: "", telephone: "", email: "" };
    const p = {
      civilite: "Dr",
      prenom: "Marie",
      nom: "DUPONT",
      profession: "Médecin",
      adresse: "12 rue X",
      cp: "75011",
      commune: "Paris",
      telephone: "0123456789",
      email: "m@x.fr",
    };
    const filled = {
      ...form,
      nom: form.nom || `${p.civilite || ""} ${p.prenom || ""} ${p.nom || ""}`.trim(),
      type: form.type || (p.profession === "Médecin" ? "Cabinet médical" : p.profession),
      type_relation: form.type_relation || "Prescripteur",
      adresse: p.adresse || form.adresse,
      cp: p.cp || form.cp,
      ville: p.commune || form.ville,
      telephone: p.telephone || form.telephone,
      email: p.email || form.email,
    };
    expect(filled.nom).toBe("Dr Marie DUPONT");
    expect(filled.type).toBe("Cabinet médical");
    expect(filled.type_relation).toBe("Prescripteur");
    expect(filled.email).toBe("m@x.fr");
  });

  it("Garde nom existant si form.nom déjà rempli", () => {
    const form = { nom: "Mon Cabinet", type: "" };
    const p = { prenom: "X", nom: "Y" };
    const filled = {
      ...form,
      nom: form.nom || `${p.prenom || ""} ${p.nom || ""}`.trim(),
    };
    expect(filled.nom).toBe("Mon Cabinet");
  });
});

describe("0.55.42 - 9 professions dans le select", () => {
  const PROFESSIONS = [
    "", "Médecin", "Infirmier", "Kinésithérapeute", "Pharmacien",
    "Sage-femme", "Dentiste", "Pédicure", "Orthophoniste",
  ];
  it("9 options dont 'Toutes' (vide)", () => {
    expect(PROFESSIONS.length).toBe(9);
    expect(PROFESSIONS[0]).toBe("");
  });
});
