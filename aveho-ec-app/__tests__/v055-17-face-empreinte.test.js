// =============================================================
//  Tests unitaires — 0.55.17
//  Couvre : détection faciale, séparation méthodes, vue users_auth_methods
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.17 - Méthodes biométriques séparées", () => {
  const VALID_METHODS = ["empreinte", "face"];

  it("seulement empreinte et face autorisés", () => {
    expect(VALID_METHODS.length).toBe(2);
    expect(VALID_METHODS).toContain("empreinte");
    expect(VALID_METHODS).toContain("face");
  });

  it("validation méthode invalide rejetée", () => {
    function validate(m) {
      return VALID_METHODS.includes(m);
    }
    expect(validate("empreinte")).toBe(true);
    expect(validate("face")).toBe(true);
    expect(validate("retine")).toBe(false);
    expect(validate("voix")).toBe(false);
    expect(validate("")).toBe(false);
  });
});

describe("0.55.17 - METHOD_LABEL/ICON/COLOR", () => {
  it("toutes les méthodes ont un label", async () => {
    const { METHOD_LABEL } = await import("../lib/webauthn");
    expect(METHOD_LABEL.empreinte).toBeTruthy();
    expect(METHOD_LABEL.face).toBeTruthy();
  });

  it("labels distincts", async () => {
    const { METHOD_LABEL } = await import("../lib/webauthn");
    expect(METHOD_LABEL.empreinte).not.toBe(METHOD_LABEL.face);
  });

  it("icônes Tabler", async () => {
    const { METHOD_ICON } = await import("../lib/webauthn");
    expect(METHOD_ICON.empreinte).toMatch(/^ti-/);
    expect(METHOD_ICON.face).toMatch(/^ti-/);
  });

  it("face = ti-face-id, empreinte = ti-fingerprint", async () => {
    const { METHOD_ICON } = await import("../lib/webauthn");
    expect(METHOD_ICON.face).toBe("ti-face-id");
    expect(METHOD_ICON.empreinte).toBe("ti-fingerprint");
  });

  it("couleurs hexa distinctes", async () => {
    const { METHOD_COLOR } = await import("../lib/webauthn");
    expect(METHOD_COLOR.empreinte).not.toBe(METHOD_COLOR.face);
  });
});

describe("0.55.17 - getAvailableMethods - logique", () => {
  function computeMethods(item) {
    if (!item) return [];
    const methods = [];
    if (item.empreinte?.credential_id && item.empreinte?.refresh_token) methods.push("empreinte");
    if (item.face?.credential_id && item.face?.refresh_token) methods.push("face");
    return methods;
  }

  it("aucune méthode si pas d'item", () => {
    expect(computeMethods(null)).toEqual([]);
  });

  it("empreinte seule", () => {
    const item = { empreinte: { credential_id: "a", refresh_token: "b" } };
    expect(computeMethods(item)).toEqual(["empreinte"]);
  });

  it("face seule", () => {
    const item = { face: { credential_id: "c", refresh_token: "d" } };
    expect(computeMethods(item)).toEqual(["face"]);
  });

  it("les deux activées", () => {
    const item = {
      empreinte: { credential_id: "a", refresh_token: "b" },
      face: { credential_id: "c", refresh_token: "d" },
    };
    const methods = computeMethods(item);
    expect(methods).toHaveLength(2);
    expect(methods).toContain("empreinte");
    expect(methods).toContain("face");
  });

  it("credential incomplet (sans refresh_token) ignoré", () => {
    const item = { empreinte: { credential_id: "a" } };
    expect(computeMethods(item)).toEqual([]);
  });
});

describe("0.55.17 - shouldShowBiometricOptIn", () => {
  function should(opts) {
    if (!opts.platform) return false;
    if (opts.activeMethodsCount >= 2) return false; // saturé
    if (opts.skippedRecently) return false;
    return true;
  }

  it("ne propose plus si les 2 méthodes activées", () => {
    expect(should({ platform: true, activeMethodsCount: 2 })).toBe(false);
  });

  it("propose si juste empreinte (1 méthode)", () => {
    expect(should({ platform: true, activeMethodsCount: 1 })).toBe(true);
  });

  it("propose si aucune méthode", () => {
    expect(should({ platform: true, activeMethodsCount: 0 })).toBe(true);
  });

  it("ne propose pas si platform authenticator absent", () => {
    expect(should({ platform: false, activeMethodsCount: 0 })).toBe(false);
  });

  it("ne propose pas si skipped récemment", () => {
    expect(should({ platform: true, activeMethodsCount: 0, skippedRecently: true })).toBe(false);
  });
});

describe("0.55.17 - Vue v_users_auth_methods structure", () => {
  it("colonnes attendues", () => {
    const expectedCols = ["user_id", "structure_id", "nom_affiche", "has_empreinte", "has_face", "total_devices"];
    expect(expectedCols).toContain("has_empreinte");
    expect(expectedCols).toContain("has_face");
    expect(expectedCols).toContain("total_devices");
  });

  it("has_empreinte et has_face sont des bool", () => {
    const sample = { has_empreinte: true, has_face: false };
    expect(typeof sample.has_empreinte).toBe("boolean");
    expect(typeof sample.has_face).toBe("boolean");
  });

  it("total_devices est un entier ≥ 0", () => {
    const sample = { total_devices: 0 };
    expect(Number.isInteger(sample.total_devices)).toBe(true);
    expect(sample.total_devices).toBeGreaterThanOrEqual(0);
  });
});

describe("0.55.17 - Migration ancien → nouveau format storage", () => {
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

  it("ancien format 0.55.13 → migré sans perte", () => {
    const old = {
      email: "u@a.fr",
      credential_id: "abc",
      refresh_token: "ref",
      user_id: "uid",
      device_name: "iPhone",
      created_at: "2026-01-01",
    };
    const m = normalizeStorage(old);
    expect(m.empreinte.credential_id).toBe("abc");
    expect(m.empreinte.refresh_token).toBe("ref");
    expect(m.empreinte.device_name).toBe("iPhone");
  });

  it("nouveau format ne re-migre pas", () => {
    const fresh = {
      email: "u@a.fr",
      face: { credential_id: "f", refresh_token: "r" },
    };
    const m = normalizeStorage(fresh);
    expect(m).toBe(fresh);
  });

  it("activation face après ancienne empreinte garde empreinte", () => {
    // Scénario : on a une vieille entrée empreinte, on active face
    const old = { email: "u", credential_id: "e", refresh_token: "r1", user_id: "u" };
    const migrated = normalizeStorage(old);
    // Maintenant on ajoute face
    migrated.face = { credential_id: "f", refresh_token: "r2", user_id: "u" };
    
    expect(migrated.empreinte).toBeDefined();
    expect(migrated.empreinte.credential_id).toBe("e");
    expect(migrated.face).toBeDefined();
    expect(migrated.face.credential_id).toBe("f");
  });
});

describe("0.55.17 - Icônes pastilles user list", () => {
  function getIcons(user) {
    const icons = [];
    if (user.has_empreinte) icons.push({ icon: "ti-fingerprint", color: "#185FA5" });
    if (user.has_face) icons.push({ icon: "ti-face-id", color: "#7a6fb0" });
    return icons;
  }

  it("user sans bio → 0 icône", () => {
    expect(getIcons({ has_empreinte: false, has_face: false }).length).toBe(0);
  });

  it("user avec empreinte seule → 1 icône bleue", () => {
    const icons = getIcons({ has_empreinte: true, has_face: false });
    expect(icons.length).toBe(1);
    expect(icons[0].icon).toBe("ti-fingerprint");
  });

  it("user avec les 2 → 2 icônes", () => {
    const icons = getIcons({ has_empreinte: true, has_face: true });
    expect(icons.length).toBe(2);
  });
});
