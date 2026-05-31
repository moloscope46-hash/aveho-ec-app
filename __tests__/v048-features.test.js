// =============================================================
//  Tests unitaires — 0.48.0
//  Couvre : VersionCheck, fiche patient enrichie, drawer swipe
// =============================================================
import { describe, it, expect } from "vitest";

describe("VersionCheck — détection update", () => {
  function shouldShowUpdate(storedVersion, fetchedVersion, snoozedUntil, now) {
    if (!storedVersion) return false; // 1er passage : on enregistre, on n'alerte pas
    if (storedVersion === fetchedVersion) return false;
    if (snoozedUntil > now) return false;
    return true;
  }
  const now = Date.now();

  it("première visite (pas de stored) → pas d'alerte", () => {
    expect(shouldShowUpdate(null, "0.48.0", 0, now)).toBe(false);
  });
  it("même version → pas d'alerte", () => {
    expect(shouldShowUpdate("0.48.0", "0.48.0", 0, now)).toBe(false);
  });
  it("version différente sans snooze → alerte", () => {
    expect(shouldShowUpdate("0.47.0", "0.48.0", 0, now)).toBe(true);
  });
  it("snooze actif → pas d'alerte même si différente", () => {
    expect(shouldShowUpdate("0.47.0", "0.48.0", now + 60000, now)).toBe(false);
  });
  it("snooze expiré → alerte reprend", () => {
    expect(shouldShowUpdate("0.47.0", "0.48.0", now - 60000, now)).toBe(true);
  });
});

describe("VersionCheck — payload API", () => {
  function buildVersionPayload(pkgVersion, buildId) {
    return {
      version: pkgVersion,
      buildId: buildId || null,
      timestamp: Date.now(),
    };
  }
  it("contient les 3 champs requis", () => {
    const p = buildVersionPayload("0.48.0-alpha");
    expect(p).toHaveProperty("version", "0.48.0-alpha");
    expect(p).toHaveProperty("buildId", null);
    expect(p).toHaveProperty("timestamp");
    expect(typeof p.timestamp).toBe("number");
  });
});

describe("VersionCheck — snooze 1h", () => {
  const ONE_HOUR = 60 * 60 * 1000;
  function snoozeUntil() {
    return Date.now() + ONE_HOUR;
  }
  it("snooze est dans le futur d'environ 1h", () => {
    const target = snoozeUntil();
    const diff = target - Date.now();
    expect(diff).toBeGreaterThan(ONE_HOUR - 100);
    expect(diff).toBeLessThan(ONE_HOUR + 100);
  });
});

describe("Fiche patient — calcul âge", () => {
  function ageFromBirth(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (365.25 * 86400000));
  }
  it("date null → null", () => {
    expect(ageFromBirth(null)).toBe(null);
  });
  it("âge correct sur date passée connue", () => {
    // 30 ans approx
    const isoIlYa30ans = new Date(Date.now() - 30 * 365.25 * 86400000).toISOString().slice(0, 10);
    const age = ageFromBirth(isoIlYa30ans);
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });
});

describe("Fiche patient — statut RGPD pour KPI", () => {
  function rgpdStatus(consents) {
    if (consents.find(c => c.a_consenti)) return "OK";
    if (consents.find(c => !c.a_consenti)) return "Refus";
    return "à recueillir";
  }
  it("aucun consentement → à recueillir", () => {
    expect(rgpdStatus([])).toBe("à recueillir");
  });
  it("au moins 1 consenti → OK", () => {
    expect(rgpdStatus([{ a_consenti: true }, { a_consenti: false }])).toBe("OK");
  });
  it("uniquement refus → Refus", () => {
    expect(rgpdStatus([{ a_consenti: false }, { a_consenti: false }])).toBe("Refus");
  });
});

describe("Drawer mobile — détection swipe close", () => {
  const THRESHOLD = -80;
  function shouldClose(touchDelta) {
    return touchDelta < THRESHOLD;
  }
  it("swipe court (< 80px) ne ferme pas", () => {
    expect(shouldClose(-40)).toBe(false);
    expect(shouldClose(-79)).toBe(false);
  });
  it("swipe au seuil exact ne ferme pas (strict <)", () => {
    expect(shouldClose(-80)).toBe(false);
  });
  it("swipe > seuil ferme", () => {
    expect(shouldClose(-100)).toBe(true);
    expect(shouldClose(-200)).toBe(true);
  });
  it("swipe vers la droite (dx positif) jamais", () => {
    expect(shouldClose(50)).toBe(false);
  });
});

describe("Drawer mobile — track delta uniquement vers la gauche", () => {
  function calcDelta(startX, currentX) {
    const dx = currentX - startX;
    return dx < 0 ? dx : 0; // ignore swipes vers la droite
  }
  it("gauche → delta négatif", () => {
    expect(calcDelta(200, 100)).toBe(-100);
  });
  it("droite → 0 (ignoré)", () => {
    expect(calcDelta(100, 200)).toBe(0);
  });
  it("immobile → 0", () => {
    expect(calcDelta(100, 100)).toBe(0);
  });
});

describe("Timeline patient — fusion + tri", () => {
  function mergeEvents(interventions, achats, consents) {
    return [
      ...interventions.map(i => ({ ts: i.created_at, type: "di", data: i })),
      ...achats.map(a => ({ ts: a.created_at, type: "achat", data: a })),
      ...consents.map(c => ({ ts: c.date_signature, type: "consent", data: c })),
    ].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  }
  it("fusionne les 3 sources", () => {
    const result = mergeEvents(
      [{ created_at: "2026-01-15T10:00:00Z" }],
      [{ created_at: "2026-02-01T10:00:00Z" }],
      [{ date_signature: "2026-03-01T10:00:00Z" }]
    );
    expect(result).toHaveLength(3);
  });
  it("trie du plus récent au plus ancien", () => {
    const result = mergeEvents(
      [{ created_at: "2026-01-15T10:00:00Z" }],
      [{ created_at: "2026-03-01T10:00:00Z" }],
      [{ date_signature: "2026-02-01T10:00:00Z" }]
    );
    expect(result[0].type).toBe("achat"); // mars
    expect(result[1].type).toBe("consent"); // févr
    expect(result[2].type).toBe("di"); // janv
  });
  it("sources vides → résultat vide", () => {
    expect(mergeEvents([], [], [])).toHaveLength(0);
  });
});
