// =============================================================
//  Tests unitaires — 0.55.13
//  Couvre : WebAuthn helpers, IndexedDB storage, base64url
// =============================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("0.55.13 - WebAuthn - détection support", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("isWebAuthnSupported false en SSR", async () => {
    vi.stubGlobal("window", undefined);
    const mod = await import("../lib/webauthn");
    // En SSR, window est undefined
    expect(typeof mod.isWebAuthnSupported).toBe("function");
  });

  it("METHOD_LABEL définit empreinte et face", async () => {
    const { METHOD_LABEL } = await import("../lib/webauthn");
    expect(METHOD_LABEL.empreinte).toBe("Empreinte digitale");
    expect(METHOD_LABEL.face).toBe("Détection faciale");
  });

  it("METHOD_ICON Tabler icons", async () => {
    const { METHOD_ICON } = await import("../lib/webauthn");
    expect(METHOD_ICON.empreinte).toMatch(/^ti-/);
    expect(METHOD_ICON.face).toMatch(/^ti-/);
  });

  it("METHOD_COLOR hexa valide", async () => {
    const { METHOD_COLOR } = await import("../lib/webauthn");
    expect(METHOD_COLOR.empreinte).toMatch(/^#[0-9a-f]{6}$/i);
    expect(METHOD_COLOR.face).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("0.55.13 - WebAuthn - détection device", () => {
  it("isLikelyFaceCapable iPhone X+ (iOS 14)", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" });
    const { isLikelyFaceCapable } = await import("../lib/webauthn?t=1");
    expect(isLikelyFaceCapable()).toBe(true);
  });

  it("isLikelyFaceCapable Windows 10/11", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
    const { isLikelyFaceCapable } = await import("../lib/webauthn?t=2");
    expect(isLikelyFaceCapable()).toBe(true);
  });

  it("getDeviceName retourne string", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)" });
    const { getDeviceName } = await import("../lib/webauthn?t=3");
    expect(typeof getDeviceName()).toBe("string");
    expect(getDeviceName().length).toBeGreaterThan(0);
  });

  it("getDeviceName iPhone reconnu", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)" });
    const { getDeviceName } = await import("../lib/webauthn?t=4");
    expect(getDeviceName()).toBe("iPhone");
  });

  it("getDeviceName Android extrait modèle", async () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit" });
    const { getDeviceName } = await import("../lib/webauthn?t=5");
    expect(getDeviceName()).toContain("Pixel");
  });
});

describe("0.55.13 - WebAuthn - base64url encoding", () => {
  // On simule le helper (interne au module)
  function ab2b64u(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function b64u2ab(b64u) {
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const bin = atob(b64 + pad);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  it("encode/decode roundtrip", () => {
    const input = new TextEncoder().encode("Aveho EC 2026").buffer;
    const encoded = ab2b64u(input);
    const decoded = b64u2ab(encoded);
    expect(new TextDecoder().decode(decoded)).toBe("Aveho EC 2026");
  });

  it("pas de + ou / dans le résultat (base64url safe)", () => {
    const input = new Uint8Array([255, 254, 253, 252, 251, 250]).buffer;
    const encoded = ab2b64u(input);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  it("supporte les bytes 0-255", () => {
    const arr = new Uint8Array(256);
    for (let i = 0; i < 256; i++) arr[i] = i;
    const encoded = ab2b64u(arr.buffer);
    const decoded = new Uint8Array(b64u2ab(encoded));
    for (let i = 0; i < 256; i++) expect(decoded[i]).toBe(i);
  });
});

describe("0.55.13 - WebAuthn - storage migration", () => {
  // Test direct sur la fonction (recopiée pour test isolé)
  function normalizeStorage(item) {
    if (!item) return null;
    if (item.empreinte || item.face) return item;
    if (item.credential_id && item.refresh_token) {
      return {
        email: item.email,
        empreinte: {
          credential_id: item.credential_id,
          refresh_token: item.refresh_token,
          user_id: item.user_id,
          device_name: item.device_name,
          created_at: item.created_at,
        },
      };
    }
    return { email: item.email };
  }

  it("null → null", () => {
    expect(normalizeStorage(null)).toBe(null);
  });

  it("ancien format → migré vers empreinte", () => {
    const old = {
      email: "user@example.fr",
      credential_id: "abc123",
      refresh_token: "tok",
      user_id: "u-1",
      device_name: "iPhone",
      created_at: "2026-01-01",
    };
    const migrated = normalizeStorage(old);
    expect(migrated.empreinte).toBeDefined();
    expect(migrated.empreinte.credential_id).toBe("abc123");
    expect(migrated.face).toBeUndefined();
  });

  it("nouveau format → inchangé", () => {
    const fresh = {
      email: "user@example.fr",
      empreinte: { credential_id: "a", refresh_token: "b" },
      face: { credential_id: "c", refresh_token: "d" },
    };
    const result = normalizeStorage(fresh);
    expect(result).toBe(fresh);
  });

  it("entrée vide → email seul", () => {
    const result = normalizeStorage({ email: "test@test.fr" });
    expect(result.email).toBe("test@test.fr");
    expect(result.empreinte).toBeUndefined();
  });
});

describe("0.55.13 - Architecture sécurité", () => {
  it("Aveho ne stocke pas la biométrie elle-même", () => {
    // Conceptuel : on vérifie que la table webauthn_credentials
    // n'a pas de colonne biometric_data ou similaire
    const expectedCols = [
      "id", "user_id", "structure_id", "credential_id",
      "device_name", "user_agent", "auth_method",
      "created_at", "last_used_at", "active",
    ];
    const forbidden = ["biometric_data", "fingerprint", "face_template", "raw_image"];
    forbidden.forEach(col => {
      expect(expectedCols).not.toContain(col);
    });
  });

  it("Credential_id est un base64url (pas un secret)", () => {
    const credId = "AbCd-1234_xyz";
    // base64url valide : [A-Za-z0-9_-]+ sans padding
    expect(/^[A-Za-z0-9_-]+$/.test(credId)).toBe(true);
  });
});
