// =============================================================
//  Tests unitaires — useStickyState + logique préférences notif
//  Alpha 0.29.0
// =============================================================
import { describe, it, expect, beforeEach } from "vitest";

describe("useStickyState — convention de clé", () => {
  function buildFullKey(userId, key) {
    return `aveho:${userId || "anon"}:${key}`;
  }

  it("préfixe aveho: + userId + key", () => {
    expect(buildFullKey("user1", "interventions:fStatut"))
      .toBe("aveho:user1:interventions:fStatut");
  });

  it("fallback anon si userId vide", () => {
    expect(buildFullKey(null, "patients:filters")).toBe("aveho:anon:patients:filters");
    expect(buildFullKey(undefined, "x")).toBe("aveho:anon:x");
    expect(buildFullKey("", "x")).toBe("aveho:anon:x");
  });

  it("clés distinctes entre utilisateurs", () => {
    const k1 = buildFullKey("alice", "achats:fStatut");
    const k2 = buildFullKey("bob", "achats:fStatut");
    expect(k1).not.toBe(k2);
  });
});

describe("useStickyState — détection valeurs vides", () => {
  function isEmpty(v) {
    return v === "" || v === null || v === undefined
      || (Array.isArray(v) && v.length === 0)
      || (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);
  }

  it("chaîne vide est vide", () => {
    expect(isEmpty("")).toBe(true);
  });

  it("null/undefined sont vides", () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it("tableau vide est vide", () => {
    expect(isEmpty([])).toBe(true);
  });

  it("objet sans clés est vide", () => {
    expect(isEmpty({})).toBe(true);
  });

  it("chaîne non vide n'est pas vide", () => {
    expect(isEmpty("test")).toBe(false);
  });

  it("0 n'est pas vide", () => {
    expect(isEmpty(0)).toBe(false);
  });

  it("false n'est pas vide", () => {
    expect(isEmpty(false)).toBe(false);
  });

  it("tableau avec items n'est pas vide", () => {
    expect(isEmpty([1])).toBe(false);
  });

  it("objet avec clés n'est pas vide", () => {
    expect(isEmpty({ q: "test" })).toBe(false);
  });
});

describe("NotificationPreferences — catégories par défaut", () => {
  const CATEGORIES = [
    { key: "di", default: true },
    { key: "achat", default: true },
    { key: "transfert", default: true },
    { key: "signalement", default: true },
    { key: "maintenance", default: true },
    { key: "consent_a_renouveler", default: true },
    { key: "consent_auto_archive", default: false }, // seule catégorie off par défaut
  ];

  function isActive(prefs, key) {
    if (key in prefs) return prefs[key] === true;
    const cat = CATEGORIES.find((c) => c.key === key);
    return cat?.default !== false;
  }

  it("toutes les catégories par défaut sauf consent_auto_archive", () => {
    const prefs = {};
    expect(isActive(prefs, "di")).toBe(true);
    expect(isActive(prefs, "achat")).toBe(true);
    expect(isActive(prefs, "transfert")).toBe(true);
    expect(isActive(prefs, "signalement")).toBe(true);
    expect(isActive(prefs, "maintenance")).toBe(true);
    expect(isActive(prefs, "consent_a_renouveler")).toBe(true);
    expect(isActive(prefs, "consent_auto_archive")).toBe(false);
  });

  it("préférence explicite override le défaut", () => {
    const prefs = { di: false, consent_auto_archive: true };
    expect(isActive(prefs, "di")).toBe(false);
    expect(isActive(prefs, "consent_auto_archive")).toBe(true);
  });

  it("catégorie inconnue → true (permissive)", () => {
    expect(isActive({}, "categorie_inexistante")).toBe(true);
  });
});

describe("Filtrage côté send-push", () => {
  function shouldSendTo(userId, eventType, prefsByUser) {
    const pref = prefsByUser[userId];
    if (!pref) return true; // pas de pref → accepte
    if (pref.prefs && eventType in pref.prefs && pref.prefs[eventType] === false) return false;
    return true;
  }

  it("user sans pref reçoit tout", () => {
    expect(shouldSendTo("alice", "di", {})).toBe(true);
  });

  it("user avec pref di=false ne reçoit pas les DI", () => {
    const prefs = { alice: { prefs: { di: false } } };
    expect(shouldSendTo("alice", "di", prefs)).toBe(false);
  });

  it("user avec pref di=false reçoit quand même les autres types", () => {
    const prefs = { alice: { prefs: { di: false } } };
    expect(shouldSendTo("alice", "achat", prefs)).toBe(true);
  });

  it("filtrage utilisateur par utilisateur", () => {
    const prefs = {
      alice: { prefs: { di: false } },
      bob: { prefs: { di: true } },
      claire: {},
    };
    expect(shouldSendTo("alice", "di", prefs)).toBe(false);
    expect(shouldSendTo("bob", "di", prefs)).toBe(true);
    expect(shouldSendTo("claire", "di", prefs)).toBe(true);
  });
});

describe("Quiet hours", () => {
  function isInQuietHours(currentHHMM, quietHours) {
    if (!quietHours?.start || !quietHours?.end) return false;
    const start = quietHours.start;
    const end = quietHours.end;
    // Si start > end (ex: 22:00 - 07:00) → traverse minuit
    if (start > end) {
      return currentHHMM >= start || currentHHMM < end;
    }
    return currentHHMM >= start && currentHHMM < end;
  }

  it("23:00 dans 22:00-07:00 → silencieux", () => {
    expect(isInQuietHours("23:00", { start: "22:00", end: "07:00" })).toBe(true);
  });

  it("05:00 dans 22:00-07:00 → silencieux (après minuit)", () => {
    expect(isInQuietHours("05:00", { start: "22:00", end: "07:00" })).toBe(true);
  });

  it("14:00 dans 22:00-07:00 → actif", () => {
    expect(isInQuietHours("14:00", { start: "22:00", end: "07:00" })).toBe(false);
  });

  it("07:00 limite → actif (exclusif)", () => {
    expect(isInQuietHours("07:00", { start: "22:00", end: "07:00" })).toBe(false);
  });

  it("22:00 limite → silencieux (inclusif)", () => {
    expect(isInQuietHours("22:00", { start: "22:00", end: "07:00" })).toBe(true);
  });

  it("plage classique 13:00-14:00 (sieste)", () => {
    expect(isInQuietHours("13:30", { start: "13:00", end: "14:00" })).toBe(true);
    expect(isInQuietHours("12:30", { start: "13:00", end: "14:00" })).toBe(false);
    expect(isInQuietHours("14:30", { start: "13:00", end: "14:00" })).toBe(false);
  });

  it("quietHours null/incomplet → jamais silencieux", () => {
    expect(isInQuietHours("23:00", null)).toBe(false);
    expect(isInQuietHours("23:00", {})).toBe(false);
    expect(isInQuietHours("23:00", { start: "22:00" })).toBe(false);
  });
});

describe("Action color helper (dashboard profil)", () => {
  const actionMap = {
    creer: { bg: "#eef9ef", fg: "#2e6f33" },
    modifier: { bg: "#eef5fc", fg: "#185FA5" },
    supprimer: { bg: "#fef0ee", fg: "#c0392b" },
  };

  function actionColor(action) {
    return actionMap[action] || { bg: "#f4f7fa", fg: "#6c7a89" };
  }

  it("creer → vert", () => {
    expect(actionColor("creer").fg).toBe("#2e6f33");
  });

  it("modifier → bleu", () => {
    expect(actionColor("modifier").fg).toBe("#185FA5");
  });

  it("supprimer → rouge", () => {
    expect(actionColor("supprimer").fg).toBe("#c0392b");
  });

  it("action inconnue → fallback gris", () => {
    expect(actionColor("xxx").fg).toBe("#6c7a89");
  });
});

describe("Scénarios end-to-end", () => {
  it("Scénario : Alice désactive DI, Bob reçoit toujours", () => {
    // Alice configure prefs.di = false
    const prefsByUser = {
      alice: { prefs: { di: false } },
    };
    const event = "di";

    function should(userId) {
      const pref = prefsByUser[userId];
      if (!pref) return true;
      if (pref.prefs && event in pref.prefs && pref.prefs[event] === false) return false;
      return true;
    }

    expect(should("alice")).toBe(false);
    expect(should("bob")).toBe(true);
  });

  it("Scénario : sticky state — filtre interventions persiste", () => {
    // Simulation
    const storage = {};
    function set(key, value) { storage[key] = JSON.stringify(value); }
    function get(key) {
      const raw = storage[key];
      return raw === undefined ? null : JSON.parse(raw);
    }

    // Alice est connectée, choisit fStatut="En cours"
    const aliceKey = "aveho:alice:interventions:fStatut";
    set(aliceKey, "En cours");

    // Refresh → on relit
    expect(get(aliceKey)).toBe("En cours");

    // Alice se déconnecte, Bob se connecte
    const bobKey = "aveho:bob:interventions:fStatut";
    expect(get(bobKey)).toBe(null); // Bob n'a pas encore filtré
  });
});
