// =============================================================
//  Tests unitaires — lib/qrcode.js et consentPdf.js
//  Alpha 0.22.0
//
//  Notes :
//  - buildVerifyUrl ne dépend pas de window mais retourne "" si pas dispo
//  - generateQR / generateQRDataURL et generateConsentPDF nécessitent
//    le DOM (CDN script + window.jspdf). Pas testables ici sans jsdom complet.
//    On teste seulement les helpers purs.
// =============================================================
import { describe, it, expect, beforeEach } from "vitest";
import { buildVerifyUrl } from "../lib/qrcode.js";

describe("buildVerifyUrl", () => {
  beforeEach(() => {
    // Mock window pour le test
    globalThis.window = { location: { origin: "https://aveho-app.vercel.app" } };
  });

  it("construit une URL avec l'origin courante", () => {
    const url = buildVerifyUrl("abc-123", "deadbeef");
    expect(url).toBe("https://aveho-app.vercel.app/verifier/abc-123?h=deadbeef");
  });

  it("encode correctement les caractères spéciaux du hash", () => {
    const url = buildVerifyUrl("abc-123", "hash+with/special=chars");
    expect(url).toContain("h=hash%2Bwith%2Fspecial%3Dchars");
  });

  it("retourne une chaîne vide si window indéfini (SSR)", () => {
    delete globalThis.window;
    const url = buildVerifyUrl("abc-123", "hash");
    expect(url).toBe("");
    // Restaurer
    globalThis.window = { location: { origin: "https://test.local" } };
  });

  it("préserve le consentId tel quel (UUID format)", () => {
    const url = buildVerifyUrl("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "h");
    expect(url).toContain("/verifier/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("préserve un hash SHA-256 réaliste (64 hex chars)", () => {
    const hash = "a".repeat(64);
    const url = buildVerifyUrl("abc", hash);
    expect(url).toContain(`h=${hash}`);
  });
});

describe("Format URL de vérification", () => {
  beforeEach(() => {
    globalThis.window = { location: { origin: "https://app.aveho.fr" } };
  });

  it("est conforme au pattern attendu par la page /verifier/[id]", () => {
    const url = buildVerifyUrl("uuid-test", "hash-test");
    expect(url).toMatch(/^https:\/\/[^/]+\/verifier\/[^?]+\?h=.+$/);
  });

  it("génère une URL parsable par URL()", () => {
    const url = buildVerifyUrl("test-id", "test-hash");
    expect(() => new URL(url)).not.toThrow();
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/verifier/test-id");
    expect(parsed.searchParams.get("h")).toBe("test-hash");
  });
});
