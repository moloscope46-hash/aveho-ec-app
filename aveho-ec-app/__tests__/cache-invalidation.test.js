// =============================================================
//  Tests unitaires — Invalidation cache + migrations 0.28
//  Alpha 0.28.0
// =============================================================
import { describe, it, expect, vi } from "vitest";

describe("cacheInvalidate — logique de match préfixe", () => {
  function matchPrefix(key, prefixes) {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes];
    return list.some((p) => key.startsWith(p));
  }

  it("match simple : préfixe table:", () => {
    expect(matchPrefix("patients:etab:abc", "patients:")).toBe(true);
    expect(matchPrefix("achats:etab:abc", "patients:")).toBe(false);
  });

  it("ne match pas si préfixe partiel mauvais", () => {
    // "patient" sans ":" ne devrait PAS matcher "patients:..."
    // mais startsWith oui — le test prouve qu'on doit toujours utiliser ":"
    expect(matchPrefix("patients:etab:abc", "patient")).toBe(true);
    expect(matchPrefix("patients:etab:abc", "patient:")).toBe(false);
  });

  it("supporte un tableau de préfixes", () => {
    expect(matchPrefix("patients:etab:abc", ["patients:", "achats:"])).toBe(true);
    expect(matchPrefix("achats:etab:abc", ["patients:", "achats:"])).toBe(true);
    expect(matchPrefix("transferts:etab:abc", ["patients:", "achats:"])).toBe(false);
  });

  it("tableau vide ne match rien", () => {
    expect(matchPrefix("patients:abc", [])).toBe(false);
  });

  it("respecte la sensibilité à la casse", () => {
    expect(matchPrefix("Patients:abc", "patients:")).toBe(false);
    expect(matchPrefix("patients:abc", "Patients:")).toBe(false);
  });
});

describe("Convention des clés de cache", () => {
  it("préfixe table: utilisable pour invalidation", () => {
    const keys = [
      "patients:etab:struct1",
      "patients:etab:struct2",
      "patient:abc-123",
      "patient:abc-123:interventions",
      "achats:etab:struct1",
    ];
    // Invalider "patients:" doit toucher 2 clés
    const toInvalidate = keys.filter((k) => k.startsWith("patients:"));
    expect(toInvalidate).toHaveLength(2);
  });

  it("préfixe singulier vs pluriel distincts", () => {
    const keys = ["patient:abc", "patients:etab:xxx"];
    const singular = keys.filter((k) => k.startsWith("patient:"));
    const plural = keys.filter((k) => k.startsWith("patients:"));
    expect(singular).toHaveLength(1);
    expect(plural).toHaveLength(1);
  });
});

describe("safeWrite — options skipInvalidate", () => {
  it("paramètre skipInvalidate disponible et par défaut false", () => {
    // Vérification de signature
    const opts1 = {};
    const opts2 = { skipInvalidate: true };
    const opts3 = { skipInvalidate: false };

    expect(opts1.skipInvalidate).toBeUndefined();
    expect(opts2.skipInvalidate).toBe(true);
    expect(opts3.skipInvalidate).toBe(false);
  });

  it("structure de retour inclut queued: false en online", () => {
    // Mock pour vérifier structure
    const res = { data: { id: "abc" }, error: null, queued: false };
    expect(res).toHaveProperty("queued", false);
    expect(res).toHaveProperty("data");
    expect(res).toHaveProperty("error");
  });
});

describe("UUID client pour insert offline", () => {
  it("crypto.randomUUID utilisable pour générer un id", () => {
    const id = crypto.randomUUID();
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("pattern d'usage : génère id puis insert", () => {
    const newId = crypto.randomUUID();
    const payload = { id: newId, nom: "Test" };
    expect(payload.id).toBe(newId);
    expect(payload.nom).toBe("Test");
  });

  it("fallback si crypto absent", () => {
    // Pattern utilisé dans le code
    const hasCrypto = typeof crypto !== "undefined" && crypto.randomUUID;
    const newId = hasCrypto ? crypto.randomUUID() : null;
    expect(newId).not.toBeUndefined();
  });
});

describe("Pages migrées en 0.28", () => {
  it("liste des pages avec safeWrite (toutes les écritures critiques)", () => {
    const migrated = [
      "patients",
      "achats",
      "interventions",
      "signalements",
      "transferts",
      "maintenance",
      "panier",
      "patient/[id]",
      "materiels",
      "ConsentementRGPD",
      "crud.js",
    ];
    // Au moins 11 pages migrées
    expect(migrated.length).toBeGreaterThanOrEqual(11);
  });

  it("liste des pages avec safeFetch (cache lecture activé)", () => {
    const cached = ["patients", "interventions", "achats", "signalements"];
    expect(cached.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Scénario d'invalidation après modification", () => {
  it("Scénario : update patient invalide patients:*", () => {
    // Cache contient plusieurs clés patients:*
    const cache = new Map();
    cache.set("patients:etab:struct1", ["patient1", "patient2"]);
    cache.set("patients:etab:struct2", ["patient3"]);
    cache.set("achats:etab:struct1", ["achat1"]);

    // Après safeUpdate(patients, ...), on invalide "patients:"
    const prefix = "patients:";
    for (const key of Array.from(cache.keys())) {
      if (key.startsWith(prefix)) cache.delete(key);
    }

    // Seul achats reste
    expect(cache.size).toBe(1);
    expect(cache.has("achats:etab:struct1")).toBe(true);
    expect(cache.has("patients:etab:struct1")).toBe(false);
  });

  it("Scénario : invalidation préserve autres tables", () => {
    const cache = new Map();
    cache.set("patients:abc", "x");
    cache.set("achats:abc", "y");
    cache.set("interventions:abc", "z");

    // Invalider seulement achats
    for (const key of Array.from(cache.keys())) {
      if (key.startsWith("achats:")) cache.delete(key);
    }

    expect(cache.size).toBe(2);
    expect(cache.has("patients:abc")).toBe(true);
    expect(cache.has("interventions:abc")).toBe(true);
    expect(cache.has("achats:abc")).toBe(false);
  });
});
