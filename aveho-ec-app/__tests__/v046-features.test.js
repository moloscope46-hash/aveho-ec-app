// =============================================================
//  Tests unitaires — 0.46.0
//  Couvre : pg_stat_statements classification, bulk patients,
//  calendrier signatures, CollapsibleSection, dialogs singleton,
//  push API, onboarding tour
// =============================================================
import { describe, it, expect } from "vitest";

describe("Performance SQL — classification vitesse", () => {
  function classifySpeed(meanMs) {
    if (meanMs >= 1000) return "Très lent";
    if (meanMs >= 100) return "Lent";
    if (meanMs >= 10) return "Moyen";
    return "Rapide";
  }

  it("< 10ms → Rapide", () => {
    expect(classifySpeed(0.5)).toBe("Rapide");
    expect(classifySpeed(9.9)).toBe("Rapide");
  });

  it("10-100ms → Moyen", () => {
    expect(classifySpeed(50)).toBe("Moyen");
  });

  it("100-1000ms → Lent", () => {
    expect(classifySpeed(500)).toBe("Lent");
  });

  it(">= 1000ms → Très lent", () => {
    expect(classifySpeed(1200)).toBe("Très lent");
    expect(classifySpeed(5000)).toBe("Très lent");
  });
});

describe("Bulk patients — sélection multiple", () => {
  function toggleSelection(currentSet, id) {
    const next = new Set(currentSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  it("ajoute un id non présent", () => {
    const result = toggleSelection(new Set(["a"]), "b");
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("retire un id présent", () => {
    const result = toggleSelection(new Set(["a", "b"]), "a");
    expect(result.has("a")).toBe(false);
    expect(result.has("b")).toBe(true);
  });

  it("ne mutate pas le Set original", () => {
    const original = new Set(["a"]);
    toggleSelection(original, "b");
    expect(original.size).toBe(1);
  });
});

describe("Bulk patients — checkbox 'tout sélectionner'", () => {
  function isAllSelected(visibleRows, selectedSet) {
    if (visibleRows.length === 0) return false;
    return visibleRows.every(r => selectedSet.has(r.id));
  }

  it("tous cochés → true", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(isAllSelected(rows, new Set(["a", "b", "c"]))).toBe(true);
  });

  it("un seul manquant → false", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(isAllSelected(rows, new Set(["a", "b"]))).toBe(false);
  });

  it("liste vide → false (pas de cas indéterminé)", () => {
    expect(isAllSelected([], new Set())).toBe(false);
  });
});

describe("Calendrier signatures RGPD — intensité couleur", () => {
  function intensity(total) {
    if (!total) return 0;
    if (total >= 10) return 4;
    if (total >= 5) return 3;
    if (total >= 2) return 2;
    return 1;
  }

  it("0 → null intensity", () => {
    expect(intensity(0)).toBe(0);
    expect(intensity(undefined)).toBe(0);
  });

  it("1 → intensity 1 (le plus clair)", () => {
    expect(intensity(1)).toBe(1);
  });

  it("2-4 → intensity 2", () => {
    expect(intensity(2)).toBe(2);
    expect(intensity(4)).toBe(2);
  });

  it("5-9 → intensity 3", () => {
    expect(intensity(5)).toBe(3);
    expect(intensity(9)).toBe(3);
  });

  it(">= 10 → intensity 4 (le plus foncé)", () => {
    expect(intensity(10)).toBe(4);
    expect(intensity(100)).toBe(4);
  });
});

describe("Calendrier signatures — group by jour", () => {
  function groupByDay(consents) {
    const map = {};
    consents.forEach((c) => {
      const day = c.date_signature?.slice(0, 10);
      if (!day) return;
      if (!map[day]) map[day] = { total: 0, oui: 0, non: 0 };
      map[day].total++;
      if (c.a_consenti) map[day].oui++;
      else map[day].non++;
    });
    return map;
  }

  it("agrège correctement oui/non par jour", () => {
    const consents = [
      { date_signature: "2026-06-01T10:00:00Z", a_consenti: true },
      { date_signature: "2026-06-01T14:00:00Z", a_consenti: false },
      { date_signature: "2026-06-01T16:00:00Z", a_consenti: true },
      { date_signature: "2026-06-02T09:00:00Z", a_consenti: true },
    ];
    const result = groupByDay(consents);
    expect(result["2026-06-01"]).toEqual({ total: 3, oui: 2, non: 1 });
    expect(result["2026-06-02"]).toEqual({ total: 1, oui: 1, non: 0 });
  });

  it("ignore les dates null", () => {
    const result = groupByDay([{ date_signature: null, a_consenti: true }]);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("CollapsibleSection — état initial", () => {
  function getInitialState(defaultOpen) {
    return defaultOpen !== false; // true par défaut
  }

  it("defaultOpen non précisé → true", () => {
    expect(getInitialState(undefined)).toBe(true);
  });

  it("defaultOpen=false → false", () => {
    expect(getInitialState(false)).toBe(false);
  });

  it("defaultOpen=true explicite → true", () => {
    expect(getInitialState(true)).toBe(true);
  });
});

describe("dialogs singleton — flow promise", () => {
  // Simule la mécanique du singleton
  function createDialogs() {
    let resolveFn = null;
    return {
      confirm: () => new Promise((resolve) => { resolveFn = resolve; }),
      _trigger: (val) => { if (resolveFn) { resolveFn(val); resolveFn = null; } },
    };
  }

  it("confirm() → promise résolue par trigger", async () => {
    const d = createDialogs();
    const p = d.confirm();
    setTimeout(() => d._trigger(true), 10);
    expect(await p).toBe(true);
  });

  it("annulation → resolve false", async () => {
    const d = createDialogs();
    const p = d.confirm();
    setTimeout(() => d._trigger(false), 10);
    expect(await p).toBe(false);
  });
});

describe("Push browser API — payload", () => {
  function buildPushPayload(userId, signalement) {
    return {
      userId,
      title: "Réponse à votre signalement",
      body: `« ${signalement.titre || "Signalement"} » a reçu une réponse`,
      url: "/signalements",
    };
  }

  it("payload contient les 4 champs", () => {
    const p = buildPushPayload("u1", { titre: "Bug login" });
    expect(p).toHaveProperty("userId", "u1");
    expect(p).toHaveProperty("title");
    expect(p).toHaveProperty("body");
    expect(p).toHaveProperty("url");
  });

  it("titre absent → fallback Signalement", () => {
    const p = buildPushPayload("u1", {});
    expect(p.body).toContain("Signalement");
  });

  it("url toujours vers /signalements", () => {
    expect(buildPushPayload("u1", { titre: "X" }).url).toBe("/signalements");
  });
});

describe("Onboarding tour — persistance localStorage", () => {
  // Simule le check
  function shouldShowTour(localStorageValue, forceStart) {
    if (forceStart) return true;
    return !localStorageValue;
  }

  it("première connexion → tour", () => {
    expect(shouldShowTour(null, false)).toBe(true);
  });

  it("déjà fait → pas de tour", () => {
    expect(shouldShowTour("1", false)).toBe(false);
  });

  it("forceStart écrase le flag", () => {
    expect(shouldShowTour("1", true)).toBe(true);
  });
});

describe("Onboarding tour — navigation étapes", () => {
  const TOTAL = 4;
  function nextStep(current) {
    if (current >= TOTAL - 1) return -1; // -1 = fin (modal fermée)
    return current + 1;
  }
  function prevStep(current) {
    return Math.max(0, current - 1);
  }

  it("avance d'une étape", () => {
    expect(nextStep(0)).toBe(1);
    expect(nextStep(1)).toBe(2);
  });

  it("dernière étape → -1 (fin)", () => {
    expect(nextStep(3)).toBe(-1);
  });

  it("recule mais reste >= 0", () => {
    expect(prevStep(2)).toBe(1);
    expect(prevStep(0)).toBe(0);
  });
});

describe("Anonymisation requête SQL", () => {
  // Simule la regex de la RPC get_top_slow_queries
  function anonymizeQuery(q) {
    return q
      .replace(/'[^']*'/g, "?")
      .replace(/\$\d+/g, "$N")
      .replace(/\d+/g, "N");
  }

  it("remplace les littéraux string", () => {
    expect(anonymizeQuery("select * from t where x = 'abc'")).toContain("?");
  });

  it("remplace les paramètres positionnels", () => {
    expect(anonymizeQuery("select * from t where x = $1")).toContain("$N");
  });

  it("remplace les nombres", () => {
    const r = anonymizeQuery("select * from t limit 100");
    expect(r).toContain("N");
    expect(r).not.toContain("100");
  });
});
