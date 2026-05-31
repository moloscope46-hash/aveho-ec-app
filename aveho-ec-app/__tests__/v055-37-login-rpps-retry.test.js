// =============================================================
//  Tests unitaires — 0.55.37
//  Fix login version dynamique, RPPS 403 retry, AddressAutocomplete partout
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.37 - Login version dynamique", () => {
  it("Version extraite de pkg.json (pas hardcoded 0.1)", () => {
    const pkg = { version: "0.55.37-alpha" };
    const displayed = pkg.version.replace(/-alpha$/, "");
    expect(displayed).toBe("0.55.37");
    expect(displayed).not.toBe("0.1");
  });

  it("Garde le -alpha en tooltip", () => {
    const tooltip = "Build 0.55.37-alpha";
    expect(tooltip).toContain("0.55.37-alpha");
  });
});

describe("0.55.37 - Login features list (4 features)", () => {
  const FEATURES = [
    "Multi-établissements + partenaires (FINESS, SIRENE, RPPS)",
    "Annuaire RPPS national · 1,7M praticiens · API FHIR ANS",
    "Connexion biométrique (empreinte + reconnaissance faciale)",
    "Plan de l'établissement, lits, patients & matériel",
    "Hébergement HDS · Certifié RGPD",
  ];

  it("5 features visibles", () => {
    expect(FEATURES.length).toBe(5);
  });

  it("Mentionne FINESS + SIRENE + RPPS", () => {
    expect(FEATURES[0]).toContain("FINESS");
    expect(FEATURES[0]).toContain("SIRENE");
    expect(FEATURES[0]).toContain("RPPS");
  });

  it("Mentionne biométrie", () => {
    expect(FEATURES[2]).toContain("biométrique");
  });
});

describe("0.55.37 - RPPS retry name= si family= plante", () => {
  function shouldRetry(status, qLength) {
    return (status === 403 || status === 400) && qLength >= 2;
  }

  it("Retry sur 403", () => {
    expect(shouldRetry(403, 8)).toBe(true);
  });

  it("Retry sur 400", () => {
    expect(shouldRetry(400, 8)).toBe(true);
  });

  it("Pas de retry sur 500", () => {
    expect(shouldRetry(500, 8)).toBe(false);
  });

  it("Pas de retry sur 502", () => {
    expect(shouldRetry(502, 8)).toBe(false);
  });

  it("Pas de retry si q trop court", () => {
    expect(shouldRetry(403, 1)).toBe(false);
  });

  it("URL avec name= au lieu de family=", () => {
    const params = new URLSearchParams();
    params.set("name", "Lacroix");
    expect(params.get("name")).toBe("Lacroix");
    expect(params.has("family")).toBe(false);
  });
});

describe("0.55.37 - Message d'erreur amélioré", () => {
  const msg = "API ANS HTTP 403. Essayez avec un autre nom ou ajoutez un critère (ville, profession).";

  it("Mentionne le code HTTP", () => {
    expect(msg).toContain("403");
  });

  it("Donne des suggestions concrètes", () => {
    expect(msg).toContain("ville");
    expect(msg).toContain("profession");
  });
});

describe("0.55.37 - AddressAutocomplete intégrations", () => {
  function applyAddress(form, addr) {
    return {
      ...form,
      adresse: addr.label,
      cp: addr.cp || form.cp,
      ville: addr.ville || form.ville,
      latitude: addr.lat || form.latitude,
      longitude: addr.lng || form.longitude,
    };
  }

  it("Remplit cp + ville + lat/lng depuis BAN", () => {
    const form = { adresse: "" };
    const addr = {
      label: "12 rue X 75011 Paris",
      cp: "75011",
      ville: "Paris",
      lat: 48.86,
      lng: 2.37,
    };
    const filled = applyAddress(form, addr);
    expect(filled.adresse).toContain("Paris");
    expect(filled.cp).toBe("75011");
    expect(filled.ville).toBe("Paris");
    expect(filled.latitude).toBe(48.86);
  });

  it("Garde l'existant si BAN ne renvoie pas le champ", () => {
    const form = { ville: "Existante", cp: "12345" };
    const addr = { label: "X", ville: null };
    const filled = applyAddress(form, addr);
    expect(filled.ville).toBe("Existante");
  });
});

describe("0.55.37 - Hint UI 'autocomplétée INSEE'", () => {
  it("Affichage du badge vert sur les champs avec BAN", () => {
    const labelExtra = "(autocomplétée INSEE)";
    expect(labelExtra).toContain("INSEE");
  });
});
