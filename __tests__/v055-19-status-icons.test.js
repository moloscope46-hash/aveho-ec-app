// =============================================================
//  Tests unitaires — 0.55.19
//  Couvre : StatusIcons (logique de calcul couleur, features)
// =============================================================
import { describe, it, expect } from "vitest";

describe("0.55.19 - StatusIcons - couleurs", () => {
  const COLOR = {
    ok: "#5aa05a",
    ko: "#c0392b",
    warn: "#EF9F27",
    unknown: "#8a98a8",
  };

  function colorFor(f) {
    if (f.ok) return COLOR.ok;
    if (f.ko) return COLOR.ko;
    return COLOR.unknown;
  }

  it("ok → vert", () => {
    expect(colorFor({ ok: true })).toBe(COLOR.ok);
  });

  it("ko → rouge", () => {
    expect(colorFor({ ok: false, ko: true })).toBe(COLOR.ko);
  });

  it("ni ok ni ko → gris", () => {
    expect(colorFor({ ok: false, ko: false })).toBe(COLOR.unknown);
  });
});

describe("0.55.19 - StatusIcons - permissions notification", () => {
  function parseNotifState(perm) {
    if (perm === "granted") return { ok: true, ko: false };
    if (perm === "denied") return { ok: false, ko: true };
    if (perm === "unsupported") return { ok: false, ko: false };
    return { ok: false, ko: false }; // default = prompt
  }

  it("granted → vert", () => {
    expect(parseNotifState("granted").ok).toBe(true);
  });

  it("denied → rouge", () => {
    expect(parseNotifState("denied").ko).toBe(true);
  });

  it("default → neutre", () => {
    const s = parseNotifState("default");
    expect(s.ok).toBe(false);
    expect(s.ko).toBe(false);
  });

  it("unsupported → neutre", () => {
    const s = parseNotifState("unsupported");
    expect(s.ok).toBe(false);
    expect(s.ko).toBe(false);
  });
});

describe("0.55.19 - StatusIcons - PWA détection", () => {
  function isPwaInstalled(displayModeMatch, navigatorStandalone) {
    return !!displayModeMatch || navigatorStandalone === true;
  }

  it("display-mode: standalone → installée", () => {
    expect(isPwaInstalled(true, undefined)).toBe(true);
  });

  it("navigator.standalone (iOS) → installée", () => {
    expect(isPwaInstalled(false, true)).toBe(true);
  });

  it("aucun → pas installée", () => {
    expect(isPwaInstalled(false, false)).toBe(false);
    expect(isPwaInstalled(false, undefined)).toBe(false);
  });
});

describe("0.55.19 - StatusIcons - features ordre", () => {
  function buildFeatureIds(status) {
    const ids = ["online", "notif", "geoloc", "pwa", "sw"];
    if (status.bioSupported) {
      ids.push("bioEmpreinte", "bioFace");
    }
    return ids;
  }

  it("5 features de base sans bio", () => {
    const ids = buildFeatureIds({ bioSupported: false });
    expect(ids.length).toBe(5);
  });

  it("7 features avec bio supportée", () => {
    const ids = buildFeatureIds({ bioSupported: true });
    expect(ids.length).toBe(7);
    expect(ids).toContain("bioEmpreinte");
    expect(ids).toContain("bioFace");
  });

  it("ordre : online en premier", () => {
    const ids = buildFeatureIds({ bioSupported: true });
    expect(ids[0]).toBe("online");
  });
});

describe("0.55.19 - StatusIcons - actions conditionnelles", () => {
  function getAction(featureId, status) {
    if (featureId === "notif" && status.notif === "default") {
      return { label: "Autoriser" };
    }
    if (featureId === "geoloc" && status.geoloc === "prompt") {
      return { label: "Autoriser" };
    }
    if (featureId === "bioEmpreinte" && !status.bioEmpreinte) {
      return { label: "Gérer" };
    }
    return null;
  }

  it("Autoriser sur notif default", () => {
    expect(getAction("notif", { notif: "default" })).toEqual({ label: "Autoriser" });
  });

  it("Pas d'action sur notif granted", () => {
    expect(getAction("notif", { notif: "granted" })).toBe(null);
  });

  it("Pas d'action sur notif denied (l'user doit ouvrir les réglages navigateur)", () => {
    expect(getAction("notif", { notif: "denied" })).toBe(null);
  });

  it("Gérer sur empreinte non activée", () => {
    expect(getAction("bioEmpreinte", { bioEmpreinte: false })).toEqual({ label: "Gérer" });
  });
});
