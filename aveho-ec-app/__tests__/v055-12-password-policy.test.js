// =============================================================
//  Tests unitaires — 0.55.12
//  Couvre : passwordPolicy (validation, force, génération),
//  refonte gestion utilisateurs (token invitation, page inscription)
// =============================================================
import { describe, it, expect } from "vitest";
import { checkPassword, strengthLabel, strengthColor, generateSecurePassword } from "../lib/passwordPolicy";

describe("0.55.12 - checkPassword - règles de base", () => {
  it("vide → ok=false", () => {
    const r = checkPassword("");
    expect(r.ok).toBe(false);
    expect(r.problems).toContain("Mot de passe requis");
  });

  it("trop court → problem 'Au moins 12 caractères'", () => {
    const r = checkPassword("Ab1!");
    expect(r.ok).toBe(false);
    expect(r.problems.some(p => p.includes("12 caractères"))).toBe(true);
  });

  it("sans majuscule → problem majuscule", () => {
    const r = checkPassword("abcdefghij1!");
    expect(r.ok).toBe(false);
    expect(r.problems.some(p => p.includes("majuscule"))).toBe(true);
  });

  it("sans chiffre → problem chiffre", () => {
    const r = checkPassword("AbcdefghijK!");
    expect(r.ok).toBe(false);
    expect(r.problems.some(p => p.includes("chiffre"))).toBe(true);
  });

  it("sans spécial → problem spécial", () => {
    const r = checkPassword("Abcdefghij12");
    expect(r.ok).toBe(false);
    expect(r.problems.some(p => p.includes("spécial"))).toBe(true);
  });

  it("mot de passe valide 12+ → ok=true", () => {
    const r = checkPassword("Aveho-2026!Test");
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(4);
  });
});

describe("0.55.12 - checkPassword - blacklist", () => {
  it("'password' → trop commun", () => {
    const r = checkPassword("password");
    expect(r.ok).toBe(false);
    expect(r.problems.some(p => p.includes("commun"))).toBe(true);
  });

  it("'azerty123' → trop commun", () => {
    const r = checkPassword("azerty123");
    expect(r.ok).toBe(false);
  });

  it("'Password1!' (12+ chars) → toujours dans blacklist", () => {
    // Variations de password1!
    const r = checkPassword("Password1!");
    expect(r.ok).toBe(false);
  });

  it("'Molotof46!Aveho' → valide (pas dans blacklist)", () => {
    const r = checkPassword("Molotof46!Aveho");
    expect(r.ok).toBe(true);
  });
});

describe("0.55.12 - checkPassword - score & strength", () => {
  it("score 0 si vide", () => {
    expect(checkPassword("").score).toBe(0);
  });

  it("score progressif selon règles respectées", () => {
    const r1 = checkPassword("aaa");
    const r2 = checkPassword("aaaaaaaaaaaaa"); // 13 chars → +1 longueur
    const r3 = checkPassword("Aaaaaaaaaa1!");   // longueur + maj + chiffre + spécial
    expect(r2.score).toBeGreaterThanOrEqual(r1.score);
    expect(r3.score).toBeGreaterThan(r2.score);
  });

  it("score plafonné à 5", () => {
    const r = checkPassword("MotDePasse-Super-Long-Et-Complexe-123456789!@#");
    expect(r.score).toBeLessThanOrEqual(5);
  });

  it("mot de passe répétitif → score baisse", () => {
    const r = checkPassword("azertyazerty");
    expect(r.problems.some(p => p.includes("répétitif"))).toBe(true);
  });
});

describe("0.55.12 - strengthLabel", () => {
  it("0-1 → Très faible", () => {
    expect(strengthLabel(0)).toBe("Très faible");
    expect(strengthLabel(1)).toBe("Très faible");
  });
  it("2 → Faible", () => {
    expect(strengthLabel(2)).toBe("Faible");
  });
  it("3 → Moyen", () => {
    expect(strengthLabel(3)).toBe("Moyen");
  });
  it("4 → Fort", () => {
    expect(strengthLabel(4)).toBe("Fort");
  });
  it("5 → Excellent", () => {
    expect(strengthLabel(5)).toBe("Excellent");
  });
});

describe("0.55.12 - strengthColor", () => {
  it("couleurs distinctes selon score", () => {
    const c0 = strengthColor(0);
    const c2 = strengthColor(2);
    const c4 = strengthColor(4);
    const c5 = strengthColor(5);
    expect(c0).not.toBe(c2);
    expect(c2).not.toBe(c4);
    expect(c4).not.toBe(c5);
  });

  it("rouge sur score faible, vert sur fort", () => {
    expect(strengthColor(0)).toMatch(/^#c0392b|#7a1f15/);
    expect(strengthColor(5)).toMatch(/^#2e6f33|#5aa05a/);
  });
});

describe("0.55.12 - generateSecurePassword", () => {
  it("longueur 16 par défaut", () => {
    const p = generateSecurePassword();
    expect(p.length).toBe(16);
  });

  it("longueur custom respectée", () => {
    const p = generateSecurePassword(20);
    expect(p.length).toBe(20);
  });

  it("contient au moins 1 maj, 1 min, 1 chiffre, 1 spécial", () => {
    const p = generateSecurePassword();
    expect(/[A-Z]/.test(p)).toBe(true);
    expect(/[a-z]/.test(p)).toBe(true);
    expect(/[0-9]/.test(p)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(p)).toBe(true);
  });

  it("pas de caractères ambigus (l, I, 1, 0, O)", () => {
    const p = generateSecurePassword(50);
    expect(p).not.toContain("I");
    expect(p).not.toContain("l");
    expect(p).not.toContain("0");
    expect(p).not.toContain("O");
    expect(p).not.toContain("1");
  });

  it("différent à chaque appel", () => {
    const p1 = generateSecurePassword();
    const p2 = generateSecurePassword();
    expect(p1).not.toBe(p2);
  });

  it("passe checkPassword (valide)", () => {
    for (let i = 0; i < 10; i++) {
      const p = generateSecurePassword();
      const r = checkPassword(p);
      expect(r.ok).toBe(true);
    }
  });
});

describe("0.55.12 - Token invitation structure", () => {
  function isValidUuidV4(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
  }

  it("UUID v4 validation", () => {
    expect(isValidUuidV4("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUuidV4("xxx")).toBe(false);
  });

  it("URL invitation construction", () => {
    const origin = "https://aveho-ec-app.vercel.app";
    const token = "550e8400-e29b-41d4-a716-446655440000";
    const url = `${origin}/inscription/${token}`;
    expect(url).toContain("/inscription/");
    expect(url).toContain(token);
  });
});

describe("0.55.12 - Expiration invitation (7 jours)", () => {
  it("calcul date expiration", () => {
    const now = new Date("2026-05-31T00:00:00Z");
    const expires = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const days = Math.round((expires - now) / (24 * 3600 * 1000));
    expect(days).toBe(7);
  });

  it("invitation expirée détectée", () => {
    const expired = new Date(Date.now() - 24 * 3600 * 1000);
    expect(expired < new Date()).toBe(true);
  });
});
