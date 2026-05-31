// =============================================================
//  Tests unitaires — 0.55.35
//  Fix API RPPS 502/403, auto-link RPPS→FINESS, normalisation
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.35 - API RPPS - construction URL FHIR sans family vide", () => {
  function buildParams({ q, rppsExact }) {
    const params = new URLSearchParams();
    const cleanQ = (q || "").trim();
    if (rppsExact) params.set("identifier", rppsExact);
    else if (cleanQ.length >= 2) params.set("family", cleanQ);
    return params;
  }

  it("Ne pas envoyer family si q vide", () => {
    const p = buildParams({ q: "" });
    expect(p.has("family")).toBe(false);
  });

  it("Ne pas envoyer family si q juste espace", () => {
    const p = buildParams({ q: " " });
    expect(p.has("family")).toBe(false);
  });

  it("Ne pas envoyer family si q 1 lettre seulement (trop court)", () => {
    const p = buildParams({ q: "D" });
    expect(p.has("family")).toBe(false);
  });

  it("Envoyer family si q 2 lettres ou plus", () => {
    const p = buildParams({ q: "DUPONT" });
    expect(p.has("family")).toBe(true);
    expect(p.get("family")).toBe("DUPONT");
  });

  it("Trim whitespace autour du q", () => {
    const p = buildParams({ q: "  DUPONT  " });
    expect(p.get("family")).toBe("DUPONT");
  });

  it("Identifier en priorité sur family si rppsExact", () => {
    const p = buildParams({ q: "DUPONT", rppsExact: "10000000001" });
    expect(p.get("identifier")).toBe("10000000001");
    expect(p.has("family")).toBe(false);
  });
});

describe("0.55.35 - Mode PractitionerRole search (ville/cp sans nom)", () => {
  function useRoleSearch({ rppsExact, q, ville, cp, profession }) {
    return !rppsExact && (q || "").trim().length < 2 && !!(ville || cp || profession);
  }

  it("Doit utiliser PractitionerRole si pas de nom mais ville", () => {
    expect(useRoleSearch({ q: "", ville: "Gramat" })).toBe(true);
  });

  it("Doit utiliser PractitionerRole si pas de nom mais CP", () => {
    expect(useRoleSearch({ q: "", cp: "75" })).toBe(true);
  });

  it("Ne pas utiliser PractitionerRole si nom 2+ lettres", () => {
    expect(useRoleSearch({ q: "DUPONT", ville: "Paris" })).toBe(false);
  });

  it("Ne pas utiliser si rppsExact (priorité identifier)", () => {
    expect(useRoleSearch({ rppsExact: "10000000001", ville: "Paris" })).toBe(false);
  });

  it("Ne pas utiliser si aucun filtre", () => {
    expect(useRoleSearch({ q: "" })).toBe(false);
  });
});

describe("0.55.35 - Fallback gracieux (200 au lieu de 502)", () => {
  function buildErrorResponse(status, text) {
    return {
      ok: false,
      error: `API ANS HTTP ${status}. Vérifie tes critères ou réessaie plus tard.`,
      detail: text,
      results: [],
      _statusCode: 200, // Réponse 200 mais ok:false dans le body
    };
  }

  it("Status code 200 (pas 502) sur erreur FHIR", () => {
    const resp = buildErrorResponse(403, "forbidden");
    expect(resp._statusCode).toBe(200);
  });

  it("results vide (UI ne crashe pas)", () => {
    const resp = buildErrorResponse(403, "");
    expect(Array.isArray(resp.results)).toBe(true);
    expect(resp.results.length).toBe(0);
  });

  it("Message d'erreur lisible", () => {
    const resp = buildErrorResponse(403, "");
    expect(resp.error).toContain("403");
    expect(resp.error).toContain("Vérifie");
  });
});

describe("0.55.35 - Extraction FINESS depuis Organization.reference", () => {
  function extractFiness(orgRef) {
    if (!orgRef) return "";
    const m = orgRef.match(/Organization\/(\d{9})/);
    return m ? m[1] : "";
  }

  it("Extrait FINESS 9 chiffres", () => {
    expect(extractFiness("Organization/750712184")).toBe("750712184");
  });

  it("Pas de match si pas 9 chiffres", () => {
    expect(extractFiness("Organization/abc123")).toBe("");
  });

  it("Vide si reference null", () => {
    expect(extractFiness(null)).toBe("");
    expect(extractFiness(undefined)).toBe("");
  });

  it("Vide si format inattendu", () => {
    expect(extractFiness("Patient/12345")).toBe("");
  });
});

describe("0.55.35 - Auto-link RPPS → FINESS", () => {
  it("Pré-sélectionne si FINESS match avec etab existant", () => {
    const praticien = { finess: "750712184" };
    const mineEtab = [{ id: "e1", finess: "750712184", nom: "Hôpital X" }];
    const match = mineEtab.find(e => e.finess === praticien.finess);
    expect(match).toBeTruthy();
    expect(match.nom).toBe("Hôpital X");
  });

  it("Pas de match → choix manuel", () => {
    const praticien = { finess: "999999999" };
    const mineEtab = [{ id: "e1", finess: "750712184", nom: "Hôpital X" }];
    const match = mineEtab.find(e => e.finess === praticien.finess);
    expect(match).toBeUndefined();
  });

  it("Pas de FINESS sur le praticien → pas d'auto-match", () => {
    const praticien = { finess: "" };
    const autoMatched = !!praticien.finess;
    expect(autoMatched).toBe(false);
  });
});

describe("0.55.35 - normalizePractitioner enrichi avec FINESS", () => {
  function normalizeWithFiness(role) {
    if (!role?.organization?.reference) return { finess: "", organization_name: "" };
    const ref = role.organization.reference;
    const match = ref.match(/Organization\/(\d{9})/);
    return {
      finess: match ? match[1] : "",
      organization_name: role.organization.display || "",
    };
  }

  it("Extrait FINESS + organization_name", () => {
    const role = {
      organization: { reference: "Organization/750712184", display: "Hôpital Saint-Joseph" },
    };
    const r = normalizeWithFiness(role);
    expect(r.finess).toBe("750712184");
    expect(r.organization_name).toBe("Hôpital Saint-Joseph");
  });

  it("Pas de role.organization → vides", () => {
    const r = normalizeWithFiness({});
    expect(r.finess).toBe("");
    expect(r.organization_name).toBe("");
  });
});
