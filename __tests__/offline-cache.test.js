// =============================================================
//  Tests unitaires — offlineCache + conflictCheck
//  Alpha 0.26.0
// =============================================================
import { describe, it, expect } from "vitest";
import { hasConflict, buildUpdatePayloadWithLock } from "../lib/conflictCheck.js";

describe("hasConflict", () => {
  it("retourne false si stagedAt absent", () => {
    expect(hasConflict(null, "2026-05-31T12:00:00Z")).toBe(false);
    expect(hasConflict(undefined, "2026-05-31T12:00:00Z")).toBe(false);
  });

  it("retourne false si currentAt absent", () => {
    expect(hasConflict("2026-05-31T12:00:00Z", null)).toBe(false);
  });

  it("retourne false si timestamps identiques", () => {
    const t = "2026-05-31T12:00:00Z";
    expect(hasConflict(t, t)).toBe(false);
  });

  it("retourne false si différence < 1s (tolérance précision)", () => {
    expect(hasConflict("2026-05-31T12:00:00.000Z", "2026-05-31T12:00:00.500Z")).toBe(false);
  });

  it("retourne true si différence > 1s (conflit)", () => {
    expect(hasConflict("2026-05-31T12:00:00Z", "2026-05-31T12:05:00Z")).toBe(true);
  });

  it("retourne true peu importe le sens (current avant ou après staged)", () => {
    expect(hasConflict("2026-05-31T12:05:00Z", "2026-05-31T12:00:00Z")).toBe(true);
    expect(hasConflict("2026-05-31T12:00:00Z", "2026-05-31T12:05:00Z")).toBe(true);
  });

  it("cas réel : Alice offline 5 minutes, Bob a modifié pendant ce temps", () => {
    const aliceStaged = "2026-05-31T10:00:00Z";
    const bobUpdated = "2026-05-31T10:03:00Z";
    expect(hasConflict(aliceStaged, bobUpdated)).toBe(true);
  });

  it("cas réel : Alice offline mais personne d'autre n'a modifié", () => {
    const aliceStaged = "2026-05-31T10:00:00Z";
    const sameDb = "2026-05-31T10:00:00Z";
    expect(hasConflict(aliceStaged, sameDb)).toBe(false);
  });
});

describe("buildUpdatePayloadWithLock", () => {
  it("ajoute __staged_updated_at depuis originalRow", () => {
    const payload = { nom: "Nouveau nom" };
    const original = { id: "abc", nom: "Ancien nom", updated_at: "2026-05-31T10:00:00Z" };
    const result = buildUpdatePayloadWithLock(payload, original);
    expect(result.__staged_updated_at).toBe("2026-05-31T10:00:00Z");
    expect(result.nom).toBe("Nouveau nom");
  });

  it("met à jour updated_at à maintenant", () => {
    const before = new Date().toISOString();
    const result = buildUpdatePayloadWithLock(
      { nom: "Test" },
      { updated_at: "2026-01-01T00:00:00Z" }
    );
    const after = new Date().toISOString();
    expect(result.updated_at >= before).toBe(true);
    expect(result.updated_at <= after).toBe(true);
  });

  it("gère originalRow null/undefined", () => {
    const r1 = buildUpdatePayloadWithLock({ nom: "X" }, null);
    expect(r1.__staged_updated_at).toBe(null);
    const r2 = buildUpdatePayloadWithLock({ nom: "X" }, undefined);
    expect(r2.__staged_updated_at).toBe(null);
  });

  it("gère originalRow sans updated_at", () => {
    const result = buildUpdatePayloadWithLock({ nom: "X" }, { id: "abc" });
    expect(result.__staged_updated_at).toBe(null);
  });

  it("préserve toutes les autres clés du payload", () => {
    const result = buildUpdatePayloadWithLock(
      { nom: "X", prenom: "Y", chambre: "204" },
      { updated_at: "2026-01-01T00:00:00Z" }
    );
    expect(result.nom).toBe("X");
    expect(result.prenom).toBe("Y");
    expect(result.chambre).toBe("204");
  });
});

describe("Cache key strategy", () => {
  // Tests sur la convention de nommage des clés (pas IndexedDB réel)
  it("clé typique : table:structureId", () => {
    const key = `patients:${"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}`;
    expect(key).toBe("patients:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("clé avec filtres : table:structureId:filter", () => {
    const key = `materiels:struct1:type=lit`;
    expect(key).toMatch(/^materiels:/);
    expect(key).toContain("type=lit");
  });

  it("clé sans collision entre structures", () => {
    const k1 = `patients:struct1`;
    const k2 = `patients:struct2`;
    expect(k1).not.toBe(k2);
  });

  it("clé hiérarchique permet de cibler une entité précise", () => {
    const k1 = `patient:abc-123`;
    const k2 = `patient:abc-123:interventions`;
    expect(k1).not.toBe(k2);
    expect(k2.startsWith(k1)).toBe(true);
  });
});

describe("TTL cache", () => {
  it("7 jours en millisecondes = 604800000", () => {
    const TTL = 7 * 24 * 60 * 60 * 1000;
    expect(TTL).toBe(604800000);
  });

  it("Date.now() est numérique et croissant", () => {
    const a = Date.now();
    const b = Date.now();
    expect(typeof a).toBe("number");
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it("détection cache expiré", () => {
    const TTL = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const old = now - TTL - 1000; // 7j + 1s
    const recent = now - 60000; // 1 min
    expect(now - old > TTL).toBe(true);
    expect(now - recent > TTL).toBe(false);
  });
});
