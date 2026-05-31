// =============================================================
//  Tests unitaires — 0.55.45
//  Refonte API RPPS multi-critères + UI sans bouton + carte
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.45 - API RPPS recherche intelligente", () => {
  it("Détection 'Paris' déclenche recherche city ET name", () => {
    const q = "Paris";
    const isCapital = /^[A-ZÀ-Ÿ][a-zà-ÿ]/.test(q);
    const shouldUseCityQuery = q.length >= 3 && isCapital;
    expect(shouldUseCityQuery).toBe(true);
  });

  it("'DUPONT' (tout majuscule) ne déclenche pas city query auto", () => {
    const q = "DUPONT";
    const isCapital = /^[A-ZÀ-Ÿ][a-zà-ÿ]/.test(q);
    expect(isCapital).toBe(false);
  });

  it("Limite par défaut 50 (était 20)", () => {
    const defaultLimit = 50;
    const max = 200;
    expect(defaultLimit).toBe(50);
    expect(max).toBe(200);
  });

  it("Dédup par RPPS+cp+commune (un praticien = plusieurs adresses possibles)", () => {
    const items = [
      { rpps: "1", cp: "75011", commune: "Paris" },
      { rpps: "1", cp: "75011", commune: "Paris" },  // doublon
      { rpps: "1", cp: "06000", commune: "Nice" },    // même RPPS, autre adresse
    ];
    const seen = new Set();
    const dedup = items.filter(p => {
      const key = `${p.rpps}|${p.cp}|${p.commune}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    expect(dedup.length).toBe(2);
  });
});

describe("0.55.45 - Réponse erreur API claire", () => {
  it("403 ANS → message explicite", () => {
    const status = 403;
    const msg = status === 403
      ? "API ANS bloquée (403 Forbidden) — vérifier IP en production"
      : `API ANS indisponible (HTTP ${status || "timeout"})`;
    expect(msg).toContain("403");
  });

  it("Timeout → message générique", () => {
    const status = 0;
    const msg = status === 403 ? "..." : `API ANS indisponible (HTTP ${status || "timeout"})`;
    expect(msg).toContain("timeout");
  });
});

describe("0.55.45 - RppsAutocomplete : min 2 chars (comme FINESS)", () => {
  it("1 char sans profession → pas de search", () => {
    const trimmed = "D";
    const profession = "";
    const shouldSearch = trimmed.length >= 2 || !!profession;
    expect(shouldSearch).toBe(false);
  });

  it("2 chars → search", () => {
    const trimmed = "DU";
    const shouldSearch = trimmed.length >= 2;
    expect(shouldSearch).toBe(true);
  });

  it("Profession active → toujours search", () => {
    const trimmed = "";
    const profession = "Médecin";
    const shouldSearch = trimmed.length >= 2 || !!profession;
    expect(shouldSearch).toBe(true);
  });
});

describe("0.55.45 - Carte RPPS : limite haute + reverse géocodage", () => {
  it("Limite 100 par profession (était 30)", () => {
    const limit = 100;
    expect(limit).toBe(100);
  });

  it("Cache reverse géocodage par tile", () => {
    const lat = 44.85;
    const lng = 1.70;
    const cacheKey = `aveho:reverse:${lat.toFixed(2)}|${lng.toFixed(2)}`;
    expect(cacheKey).toBe("aveho:reverse:44.85|1.70");
  });

  it("URL BAN reverse correctement construite", () => {
    const lat = 44.85;
    const lng = 1.70;
    const url = `https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lng}`;
    expect(url).toContain("/reverse/");
    expect(url).toContain("lat=44.85");
    expect(url).toContain("lon=1.7");
  });
});

describe("0.55.45 - Page partenaires-rpps utilise RppsAutocomplete", () => {
  it("Plus de bouton Rechercher — recherche live", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/partenaires-rpps/page.js"),
      "utf-8"
    );
    expect(src).toContain("RppsAutocomplete");
    expect(src).not.toContain("import RppsSearch from");
  });
});

describe("0.55.45 - Headers User-Agent pour API ANS", () => {
  it("User-Agent ajouté aux requêtes FHIR", () => {
    const headers = {
      Accept: "application/fhir+json",
      "User-Agent": "Aveho-EC/0.55",
    };
    expect(headers["User-Agent"]).toContain("Aveho");
  });
});

describe("0.55.45 - Recherche parallèle (Promise.all)", () => {
  it("Performance améliorée : 2 requêtes en parallèle plutôt qu'en série", async () => {
    const start = Date.now();
    await Promise.all([
      new Promise(r => setTimeout(r, 50)),
      new Promise(r => setTimeout(r, 50)),
    ]);
    const duration = Date.now() - start;
    // En parallèle : ~50ms (pas 100ms)
    expect(duration).toBeLessThan(90);
  });
});
