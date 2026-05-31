// =============================================================
//  Tests unitaires — TrendBadge + drill-down heatmap
//  Alpha 0.37.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("Calcul de tendance N vs N-1", () => {
  // Reproduit la logique du composant TrendBadge
  function computeTrend(current, previous) {
    if (current == null || previous == null) return { type: "unknown" };
    if (previous === 0) {
      if (current === 0) return { type: "neutral" };
      return { type: "new" };
    }
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    const abs = Math.abs(pct);
    if (abs < 2) return { type: "neutral", pct };
    return { type: diff > 0 ? "up" : "down", pct, abs };
  }

  it("hausse 25% : 100 → 125", () => {
    const t = computeTrend(125, 100);
    expect(t.type).toBe("up");
    expect(t.abs).toBe(25);
  });

  it("baisse 20% : 100 → 80", () => {
    const t = computeTrend(80, 100);
    expect(t.type).toBe("down");
    expect(t.abs).toBe(20);
  });

  it("neutre si écart < 2% (101 vs 100)", () => {
    const t = computeTrend(101, 100);
    expect(t.type).toBe("neutral");
  });

  it("neutre si écart < 2% (99 vs 100)", () => {
    const t = computeTrend(99, 100);
    expect(t.type).toBe("neutral");
  });

  it("écart de 2% pile → up (pas neutre)", () => {
    const t = computeTrend(102, 100);
    expect(t.type).toBe("up");
    expect(t.abs).toBe(2);
  });

  it("previous = 0 et current = 0 → neutral", () => {
    const t = computeTrend(0, 0);
    expect(t.type).toBe("neutral");
  });

  it("previous = 0 et current > 0 → new (pas de % calculable)", () => {
    const t = computeTrend(15, 0);
    expect(t.type).toBe("new");
  });

  it("current null → unknown", () => {
    expect(computeTrend(null, 10).type).toBe("unknown");
  });

  it("previous null → unknown", () => {
    expect(computeTrend(10, null).type).toBe("unknown");
  });

  it("hausse importante 500% : 10 → 60", () => {
    const t = computeTrend(60, 10);
    expect(t.type).toBe("up");
    expect(t.abs).toBe(500);
  });

  it("doublement exact 100% : 50 → 100", () => {
    const t = computeTrend(100, 50);
    expect(t.type).toBe("up");
    expect(t.abs).toBe(100);
  });
});

describe("Mode inverse (baisse = bon)", () => {
  // Pour taux de refus, erreurs : la baisse est positive
  function determineGoodness(diff, inverse) {
    const isUp = diff > 0;
    return inverse ? !isUp : isUp;
  }

  it("mode normal : hausse = bon", () => {
    expect(determineGoodness(10, false)).toBe(true);
  });

  it("mode normal : baisse = mauvais", () => {
    expect(determineGoodness(-10, false)).toBe(false);
  });

  it("mode inverse : hausse = mauvais (ex: taux de refus +)", () => {
    expect(determineGoodness(10, true)).toBe(false);
  });

  it("mode inverse : baisse = bon (ex: taux de refus -)", () => {
    expect(determineGoodness(-10, true)).toBe(true);
  });
});

describe("Drill heatmap — paramétrage RPC", () => {
  function validateDrillParams({ p_structure_id, p_jour_semaine, p_heure, p_limit }) {
    const errors = [];
    if (!p_structure_id) errors.push("structure_id requis");
    if (p_jour_semaine == null || p_jour_semaine < 0 || p_jour_semaine > 6) {
      errors.push("jour_semaine doit être entre 0 (dimanche) et 6 (samedi)");
    }
    if (p_heure == null || p_heure < 0 || p_heure > 23) {
      errors.push("heure doit être entre 0 et 23");
    }
    if (p_limit != null && (p_limit < 1 || p_limit > 100)) {
      errors.push("limit doit être entre 1 et 100");
    }
    return errors;
  }

  it("params valides", () => {
    const errors = validateDrillParams({
      p_structure_id: "abc-123",
      p_jour_semaine: 1,
      p_heure: 14,
      p_limit: 50,
    });
    expect(errors).toEqual([]);
  });

  it("jour_semaine 0 (dimanche) valide", () => {
    const errors = validateDrillParams({
      p_structure_id: "abc",
      p_jour_semaine: 0,
      p_heure: 12,
    });
    expect(errors).toEqual([]);
  });

  it("jour_semaine 6 (samedi) valide", () => {
    const errors = validateDrillParams({
      p_structure_id: "abc",
      p_jour_semaine: 6,
      p_heure: 12,
    });
    expect(errors).toEqual([]);
  });

  it("jour_semaine 7 invalide", () => {
    const errors = validateDrillParams({
      p_structure_id: "abc",
      p_jour_semaine: 7,
      p_heure: 12,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("heure 24 invalide", () => {
    const errors = validateDrillParams({
      p_structure_id: "abc",
      p_jour_semaine: 1,
      p_heure: 24,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("structure_id manquant", () => {
    const errors = validateDrillParams({
      p_jour_semaine: 1,
      p_heure: 12,
    });
    expect(errors[0]).toContain("structure_id");
  });
});

describe("Heatmap : déclenchement onCellClick", () => {
  function shouldBeClickable(nb_actions, onCellClick) {
    return Boolean(onCellClick) && nb_actions > 0;
  }

  it("cellule avec actions + callback → cliquable", () => {
    expect(shouldBeClickable(5, () => {})).toBe(true);
  });

  it("cellule vide → non cliquable même si callback", () => {
    expect(shouldBeClickable(0, () => {})).toBe(false);
  });

  it("pas de callback → non cliquable", () => {
    expect(shouldBeClickable(5, null)).toBe(false);
  });

  it("undefined callback → non cliquable", () => {
    expect(shouldBeClickable(5, undefined)).toBe(false);
  });
});

describe("Couleurs par action (drill table)", () => {
  function actionColor(action) {
    const map = {
      creer: { bg: "#dff5e0", fg: "#2e6f33" },
      modifier: { bg: "#fcefda", fg: "#7a4f15" },
      supprimer: { bg: "#fef0ee", fg: "#c0392b" },
      valider: { bg: "#eaf7f7", fg: "#1c5454" },
      refuser: { bg: "#fef0ee", fg: "#c0392b" },
      recevoir: { bg: "#e8e0f0", fg: "#5e4a8c" },
      cloturer: { bg: "#d8e8f0", fg: "#1c4d6a" },
    };
    return map[action] || { bg: "#f4f7fa", fg: "#6c7a89" };
  }

  it("creer → vert", () => {
    expect(actionColor("creer").fg).toBe("#2e6f33");
  });

  it("supprimer → rouge", () => {
    expect(actionColor("supprimer").fg).toBe("#c0392b");
  });

  it("valider et cloturer → bleu/teal (cohérent workflow)", () => {
    expect(actionColor("valider").fg).toBe("#1c5454");
    expect(actionColor("cloturer").fg).toBe("#1c4d6a");
  });

  it("action inconnue → gris neutre", () => {
    expect(actionColor("zzz").bg).toBe("#f4f7fa");
  });
});

describe("Icône par entité", () => {
  function entiteIcon(entite) {
    const map = {
      intervention: "ti-tools",
      achat: "ti-shopping-cart",
      transfert: "ti-arrows-exchange",
      signalement: "ti-message",
      patient: "ti-user",
      materiel: "ti-armchair-2",
      maintenance: "ti-tool",
      consentement: "ti-shield-check",
    };
    return map[entite] || "ti-circle";
  }

  it("8 entités mappées", () => {
    expect(entiteIcon("intervention")).toBe("ti-tools");
    expect(entiteIcon("achat")).toBe("ti-shopping-cart");
    expect(entiteIcon("transfert")).toBe("ti-arrows-exchange");
    expect(entiteIcon("signalement")).toBe("ti-message");
    expect(entiteIcon("patient")).toBe("ti-user");
    expect(entiteIcon("materiel")).toBe("ti-armchair-2");
    expect(entiteIcon("maintenance")).toBe("ti-tool");
    expect(entiteIcon("consentement")).toBe("ti-shield-check");
  });

  it("entité inconnue → ti-circle fallback", () => {
    expect(entiteIcon("inconnue")).toBe("ti-circle");
  });
});

describe("Scénarios end-to-end stats activité enrichies", () => {
  function computeTrend(current, previous) {
    if (current == null || previous == null) return { type: "unknown" };
    if (previous === 0) {
      if (current === 0) return { type: "neutral" };
      return { type: "new" };
    }
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    if (Math.abs(pct) < 2) return { type: "neutral" };
    return { type: diff > 0 ? "up" : "down", pct };
  }

  it("Scénario : ce mois 145 DI vs 120 → +21% hausse", () => {
    const t = computeTrend(145, 120);
    expect(t.type).toBe("up");
    expect(t.pct).toBe(21);
  });

  it("Scénario : période creuse en août, 35 actions vs 200 en juillet", () => {
    const t = computeTrend(35, 200);
    expect(t.type).toBe("down");
    expect(t.pct).toBe(-82); // (35-200)/200 = -0.825 → arrondi -82
  });

  it("Scénario : nouvelle activité (premier mois)", () => {
    const t = computeTrend(42, 0);
    expect(t.type).toBe("new");
  });

  it("Scénario : équipe stable, +1 action sur 250 → neutre", () => {
    // 251/250 = 0.4% → neutre
    const t = computeTrend(251, 250);
    expect(t.type).toBe("neutral");
  });
});
