// =============================================================
//  Tests unitaires — lib/format.js
//  Alpha 0.18.0
// =============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fmtEur, fmtDate, joursRestants, statutClass, relativeTime, activityDotColor } from "../lib/format.js";

describe("fmtEur", () => {
  it("formate un nombre en euros français", () => {
    const r = fmtEur(1234.5);
    // Le séparateur peut être un espace insécable selon l'env
    expect(r).toMatch(/1\s?234,50/);
    expect(r).toMatch(/€/);
  });
  it("gère null/undefined/string vide en 0", () => {
    expect(fmtEur(null)).toMatch(/0,00/);
    expect(fmtEur(undefined)).toMatch(/0,00/);
    expect(fmtEur("")).toMatch(/0,00/);
  });
  it("gère les négatifs", () => {
    expect(fmtEur(-42)).toMatch(/-42,00/);
  });
});

describe("fmtDate", () => {
  it("formate une ISO en jj/mm/aaaa", () => {
    expect(fmtDate("2024-03-15")).toBe("15/03/2024");
  });
  it("retourne — pour null/undefined/empty", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate(undefined)).toBe("—");
    expect(fmtDate("")).toBe("—");
  });
});

describe("joursRestants", () => {
  beforeEach(() => {
    // Fige la date au 15 mars 2024
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("retourne le nombre de jours restants pour une date future", () => {
    expect(joursRestants("2024-03-20")).toBeGreaterThanOrEqual(4);
    expect(joursRestants("2024-03-20")).toBeLessThanOrEqual(6);
  });
  it("retourne 0 pour une date passée", () => {
    expect(joursRestants("2024-03-01")).toBe(0);
  });
  it("retourne null pour rien", () => {
    expect(joursRestants(null)).toBe(null);
    expect(joursRestants(undefined)).toBe(null);
  });
});

describe("statutClass", () => {
  it("Validée → s-validee", () => {
    expect(statutClass("Validée")).toBe("s-validee");
  });
  it("Livrée → s-livree", () => {
    expect(statutClass("Livrée")).toBe("s-livree");
  });
  it("autre → s-encours", () => {
    expect(statutClass("En attente")).toBe("s-encours");
    expect(statutClass("Refusée")).toBe("s-encours");
    expect(statutClass("")).toBe("s-encours");
    expect(statutClass(null)).toBe("s-encours");
  });
});

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("< 1 min → à l'instant", () => {
    expect(relativeTime("2024-03-15T11:59:30Z")).toBe("à l'instant");
  });
  it("< 1h → il y a N min", () => {
    expect(relativeTime("2024-03-15T11:45:00Z")).toBe("il y a 15 min");
  });
  it("< 1j → il y a N h", () => {
    expect(relativeTime("2024-03-15T09:00:00Z")).toBe("il y a 3 h");
  });
  it("< 1 sem → il y a N j", () => {
    expect(relativeTime("2024-03-13T12:00:00Z")).toBe("il y a 2 j");
  });
  it("< 1 mois → il y a N sem", () => {
    expect(relativeTime("2024-03-01T12:00:00Z")).toBe("il y a 2 sem");
  });
  it("plus → il y a +30 j", () => {
    expect(relativeTime("2024-01-15T12:00:00Z")).toBe("il y a +30 j");
  });
  it("null → null", () => {
    expect(relativeTime(null)).toBe(null);
    expect(relativeTime(undefined)).toBe(null);
  });
});

describe("activityDotColor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("< 10 min → vert", () => {
    expect(activityDotColor("2024-03-15T11:55:00Z")).toBe("#5aa05a");
  });
  it("< 24h → orange", () => {
    expect(activityDotColor("2024-03-15T06:00:00Z")).toBe("#EF9F27");
  });
  it("> 24h → gris", () => {
    expect(activityDotColor("2024-03-10T12:00:00Z")).toBe("#cfd5db");
  });
  it("null → gris", () => {
    expect(activityDotColor(null)).toBe("#cfd5db");
    expect(activityDotColor(undefined)).toBe("#cfd5db");
  });
});
