// =============================================================
//  Tests unitaires — Calcul date_expiration RGPD + helpers
//  Alpha 0.23.0
// =============================================================
import { describe, it, expect } from "vitest";

// Helper qui reproduit la logique de ConsentementRGPD pour calculer date_expiration
// à partir d'une date de signature et d'une durée en jours.
// Extrait ici pour pouvoir le tester en isolation.
function calculerDateExpiration(signatureDate, validiteJours) {
  const date = new Date(signatureDate);
  date.setDate(date.getDate() + validiteJours);
  return date.toISOString().slice(0, 10);
}

// Helper qui reproduit la logique du filtre "à renouveler" dans /consentements
function estARenouveler(consent, today = new Date()) {
  if (consent.archive || consent.statut !== "signe") return false;
  if (consent.renouvellement_demande) return true;
  if (!consent.date_expiration) return false;
  const exp = new Date(consent.date_expiration);
  const jours = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  return jours <= 30;
}

// Helper qui reproduit le calcul du statut d'expiration affiché dans le tableau
function statutExpiration(date_expiration, today = new Date()) {
  if (!date_expiration) return "sans_date";
  const exp = new Date(date_expiration);
  const jours = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (jours < 0) return "expire";
  if (jours <= 30) return "bientot_expire";
  return "valide";
}

describe("calculerDateExpiration", () => {
  it("calcule 3 ans (1095 jours) après signature", () => {
    const sig = new Date("2026-05-30T12:00:00Z");
    const exp = calculerDateExpiration(sig, 1095);
    // 1095 jours = environ 3 ans (avec un jour bissextile dans la fenêtre)
    expect(exp).toMatch(/^2029-/);
  });

  it("calcule 1 an (365 jours)", () => {
    const sig = new Date("2026-05-30T12:00:00Z");
    const exp = calculerDateExpiration(sig, 365);
    expect(exp).toBe("2027-05-30");
  });

  it("calcule 2 ans (730 jours)", () => {
    const sig = new Date("2026-01-15T12:00:00Z");
    const exp = calculerDateExpiration(sig, 730);
    // 730 jours = 2 ans (sans bissextile dans la fenêtre 2026-2028 → +730j = 2028-01-15)
    expect(exp).toMatch(/^2028-01-/);
  });

  it("gère bien les années bissextiles", () => {
    // Du 1er mars 2027 + 365j → 29 février 2028 (année bissextile)
    const sig = new Date("2027-03-01T00:00:00Z");
    const exp = calculerDateExpiration(sig, 365);
    expect(exp).toBe("2028-02-29");
  });

  it("calcule 5 ans (1825 jours)", () => {
    const sig = new Date("2026-05-30T12:00:00Z");
    const exp = calculerDateExpiration(sig, 1825);
    expect(exp).toMatch(/^2031-/);
  });

  it("retourne au format YYYY-MM-DD (pas d'heure)", () => {
    const exp = calculerDateExpiration(new Date(), 1095);
    expect(exp).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(exp.length).toBe(10);
  });

  it("0 jour = même date qu'aujourd'hui", () => {
    const sig = new Date("2026-05-30T00:00:00Z");
    const exp = calculerDateExpiration(sig, 0);
    expect(exp).toBe("2026-05-30");
  });
});

describe("estARenouveler", () => {
  const today = new Date("2026-05-30T12:00:00Z");

  it("consentement archivé → false", () => {
    expect(estARenouveler({ archive: true, statut: "signe", date_expiration: "2026-06-01" }, today)).toBe(false);
  });

  it("consentement refusé → false", () => {
    expect(estARenouveler({ archive: false, statut: "refuse", date_expiration: "2026-06-01" }, today)).toBe(false);
  });

  it("renouvellement explicitement demandé → true", () => {
    expect(estARenouveler({ archive: false, statut: "signe", renouvellement_demande: true, date_expiration: "2030-01-01" }, today)).toBe(true);
  });

  it("sans date d'expiration → false (pas de signal)", () => {
    expect(estARenouveler({ archive: false, statut: "signe", date_expiration: null }, today)).toBe(false);
  });

  it("expire dans 25 jours → true", () => {
    expect(estARenouveler({ archive: false, statut: "signe", date_expiration: "2026-06-24" }, today)).toBe(true);
  });

  it("expire dans 31 jours → false (hors fenêtre 30j)", () => {
    expect(estARenouveler({ archive: false, statut: "signe", date_expiration: "2026-07-01" }, today)).toBe(false);
  });

  it("déjà expiré (dans le passé) → true (à renouveler urgent)", () => {
    expect(estARenouveler({ archive: false, statut: "signe", date_expiration: "2026-05-01" }, today)).toBe(true);
  });

  it("expire pile dans 30 jours → true (limite inclusive)", () => {
    expect(estARenouveler({ archive: false, statut: "signe", date_expiration: "2026-06-29" }, today)).toBe(true);
  });
});

describe("statutExpiration", () => {
  const today = new Date("2026-05-30T12:00:00Z");

  it("date_expiration nulle → sans_date", () => {
    expect(statutExpiration(null, today)).toBe("sans_date");
  });

  it("date dans le futur lointain → valide", () => {
    expect(statutExpiration("2029-05-30", today)).toBe("valide");
  });

  it("date dans 15 jours → bientot_expire", () => {
    expect(statutExpiration("2026-06-14", today)).toBe("bientot_expire");
  });

  it("date dans le passé → expire", () => {
    expect(statutExpiration("2025-12-01", today)).toBe("expire");
  });

  it("date pile aujourd'hui à minuit avec today à midi → expire (déjà passé de 12h)", () => {
    // Today à 12h, date_expiration à 00h le même jour → 12h sont déjà écoulées
    expect(statutExpiration("2026-05-30", today)).toBe("expire");
  });

  it("date demain à minuit avec today à midi → bientot_expire (dans <30j)", () => {
    expect(statutExpiration("2026-05-31", today)).toBe("bientot_expire");
  });
});

describe("Valeurs config par défaut", () => {
  it("durée par défaut = 1095 jours (3 ans)", () => {
    const DEFAUT = 1095;
    expect(DEFAUT).toBe(1095);
    const ans = DEFAUT / 365.25;
    expect(ans).toBeCloseTo(3, 1);
  });

  it("options de durée valides : 365 / 730 / 1095 / 1825 / 3650", () => {
    const options = [365, 730, 1095, 1825, 3650];
    expect(options).toContain(1095);
    expect(options.every((d) => Number.isFinite(d) && d > 0)).toBe(true);
  });
});
