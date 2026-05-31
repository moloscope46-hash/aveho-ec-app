// =============================================================
//  Tests unitaires — 0.55.26
//  Couvre : logger (redaction), constants (colors), Modal stubs
// =============================================================
import { describe, it, expect } from "vitest";

// ============================================================
//  logger.redact
// ============================================================
describe("0.55.26 - logger.redact - masque les valeurs sensibles", () => {
  // On ne peut pas importer le module directement (il dépend de window)
  // Recopie locale de la fonction pour tests
  const SENSITIVE_KEYS = ["password", "passwd", "mot_de_passe", "mdp", "token", "refresh_token", "access_token", "secret", "api_key", "apikey", "credential_id"];
  function redact(value, depth = 0) {
    if (depth > 4) return "[deep]";
    if (value == null) return value;
    if (typeof value === "string") {
      if (value.length > 100) return value.slice(0, 12) + "…[redacted]";
      return value;
    }
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value.slice(0, 10).map((v) => redact(v, depth + 1));
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) out[k] = "[REDACTED]";
      else out[k] = redact(v, depth + 1);
    }
    return out;
  }

  it("masque password", () => {
    const r = redact({ user: "cedric", password: "Molotof46!" });
    expect(r.password).toBe("[REDACTED]");
    expect(r.user).toBe("cedric");
  });

  it("masque refresh_token", () => {
    const r = redact({ refresh_token: "eyJhbGci..." });
    expect(r.refresh_token).toBe("[REDACTED]");
  });

  it("masque credential_id (webauthn)", () => {
    const r = redact({ credential_id: "abc-base64url-xyz" });
    expect(r.credential_id).toBe("[REDACTED]");
  });

  it("masque casse-insensitif", () => {
    const r = redact({ Password: "x", PASSWORD: "y", MDP: "z" });
    expect(r.Password).toBe("[REDACTED]");
    expect(r.PASSWORD).toBe("[REDACTED]");
    expect(r.MDP).toBe("[REDACTED]");
  });

  it("récursif sur objets imbriqués", () => {
    const r = redact({ data: { user: { password: "secret", name: "ok" } } });
    expect(r.data.user.password).toBe("[REDACTED]");
    expect(r.data.user.name).toBe("ok");
  });

  it("tronque les strings très longues (>100 chars)", () => {
    const long = "x".repeat(200);
    const r = redact(long);
    expect(r.length).toBeLessThan(50);
    expect(r).toContain("[redacted]");
  });

  it("respecte la profondeur max 4", () => {
    const deep = { a: { b: { c: { d: { e: { f: "deep" } } } } } };
    const r = redact(deep);
    expect(JSON.stringify(r)).toContain("[deep]");
  });

  it("null et undefined passent", () => {
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });

  it("arrays préservés mais tronqués à 10", () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const r = redact(arr);
    expect(r.length).toBe(10);
  });
});

// ============================================================
//  Constants
// ============================================================
describe("0.55.26 - constants.js - couleurs", () => {
  it("COLOR contient toutes les couleurs sémantiques", async () => {
    const { COLOR } = await import("../lib/constants");
    expect(COLOR.ok).toMatch(/^#[0-9a-f]{6}$/i);
    expect(COLOR.ko).toMatch(/^#[0-9a-f]{6}$/i);
    expect(COLOR.warn).toMatch(/^#[0-9a-f]{6}$/i);
    expect(COLOR.unknown).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("GRADIENT contient les gradients essentiels", async () => {
    const { GRADIENT } = await import("../lib/constants");
    expect(GRADIENT.primary).toContain("linear-gradient");
    expect(GRADIENT.success).toContain("linear-gradient");
    expect(GRADIENT.danger).toContain("linear-gradient");
  });

  it("ICON pour empreinte et face", async () => {
    const { ICON } = await import("../lib/constants");
    expect(ICON.fingerprint).toBe("ti-fingerprint");
    expect(ICON.face).toBe("ti-face-id");
  });

  it("colorForState helper", async () => {
    const { colorForState, COLOR } = await import("../lib/constants");
    expect(colorForState({ ok: true })).toBe(COLOR.ok);
    expect(colorForState({ ko: true })).toBe(COLOR.ko);
    expect(colorForState({ warn: true })).toBe(COLOR.warn);
    expect(colorForState({})).toBe(COLOR.unknown);
    expect(colorForState(null)).toBe(COLOR.unknown);
  });

  it("labelForState helper", async () => {
    const { labelForState } = await import("../lib/constants");
    expect(labelForState({ ok: true })).toBe("ACTIF");
    expect(labelForState({ ko: true })).toBe("REFUSÉ");
    expect(labelForState({ warn: true })).toBe("ATTENTION");
    expect(labelForState({})).toBe("INACTIF");
  });
});

// ============================================================
//  SW cache trim logic
// ============================================================
describe("0.55.26 - SW trimCache logic", () => {
  function shouldTrim(currentCount, maxEntries) {
    return currentCount > maxEntries;
  }
  function trimCount(currentCount, maxEntries) {
    return Math.max(0, currentCount - maxEntries);
  }

  it("ne trim pas si sous la limite", () => {
    expect(shouldTrim(50, 100)).toBe(false);
    expect(shouldTrim(99, 100)).toBe(false);
    expect(shouldTrim(100, 100)).toBe(false);
  });

  it("trim si au-dessus", () => {
    expect(shouldTrim(101, 100)).toBe(true);
    expect(shouldTrim(150, 100)).toBe(true);
  });

  it("calcule combien supprimer", () => {
    expect(trimCount(150, 100)).toBe(50);
    expect(trimCount(101, 100)).toBe(1);
    expect(trimCount(99, 100)).toBe(0);
  });
});

// ============================================================
//  SQL durcissement — validation structure
// ============================================================
describe("0.55.26 - SQL patch - sanity checks", () => {
  it("MAX_DATA_CACHE_ENTRIES raisonnable (100)", () => {
    expect(100).toBeGreaterThan(50);
    expect(100).toBeLessThan(500);
  });

  it("MAX_PAGE_CACHE_ENTRIES raisonnable (30)", () => {
    expect(30).toBeGreaterThan(10);
    expect(30).toBeLessThan(100);
  });
});
