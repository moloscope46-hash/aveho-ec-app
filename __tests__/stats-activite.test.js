// =============================================================
//  Tests unitaires — Stats activité utilisateurs + Heatmap
//  Alpha 0.31.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("Sélection période — switch valeur par user", () => {
  function valuePourPeriode(user, periode) {
    if (periode === "7") return user.nb_actions_7j;
    if (periode === "30") return user.nb_actions_30j;
    return user.nb_actions_total;
  }

  const user = { nb_actions_7j: 5, nb_actions_30j: 25, nb_actions_total: 120 };

  it("période 7j retourne nb_actions_7j", () => {
    expect(valuePourPeriode(user, "7")).toBe(5);
  });

  it("période 30j retourne nb_actions_30j", () => {
    expect(valuePourPeriode(user, "30")).toBe(25);
  });

  it("période 90j (ou autre) retourne nb_actions_total", () => {
    expect(valuePourPeriode(user, "90")).toBe(120);
    expect(valuePourPeriode(user, "all")).toBe(120);
  });
});

describe("Tri des utilisateurs par activité", () => {
  function trierTop(users, periode) {
    return [...users].sort((a, b) => {
      const aVal = periode === "7" ? a.nb_actions_7j : periode === "30" ? a.nb_actions_30j : a.nb_actions_total;
      const bVal = periode === "7" ? b.nb_actions_7j : periode === "30" ? b.nb_actions_30j : b.nb_actions_total;
      return bVal - aVal;
    });
  }

  const users = [
    { user_id: "a", nb_actions_7j: 5, nb_actions_30j: 20, nb_actions_total: 50 },
    { user_id: "b", nb_actions_7j: 10, nb_actions_30j: 15, nb_actions_total: 100 },
    { user_id: "c", nb_actions_7j: 2, nb_actions_30j: 40, nb_actions_total: 80 },
  ];

  it("tri sur 7j donne b > a > c", () => {
    const sorted = trierTop(users, "7");
    expect(sorted.map(u => u.user_id)).toEqual(["b", "a", "c"]);
  });

  it("tri sur 30j donne c > a > b", () => {
    const sorted = trierTop(users, "30");
    expect(sorted.map(u => u.user_id)).toEqual(["c", "a", "b"]);
  });

  it("tri sur total donne b > c > a", () => {
    const sorted = trierTop(users, "90");
    expect(sorted.map(u => u.user_id)).toEqual(["b", "c", "a"]);
  });
});

describe("Filtrage top par catégorie", () => {
  function topPar(users, key, n = 5) {
    return [...users]
      .sort((a, b) => (b[key] || 0) - (a[key] || 0))
      .filter((u) => (u[key] || 0) > 0)
      .slice(0, n);
  }

  const users = [
    { id: 1, nb_di_creees: 10 },
    { id: 2, nb_di_creees: 0 },
    { id: 3, nb_di_creees: 25 },
    { id: 4, nb_di_creees: 5 },
  ];

  it("filtre les zéros", () => {
    const r = topPar(users, "nb_di_creees");
    expect(r.map((u) => u.id)).toEqual([3, 1, 4]);
    expect(r).toHaveLength(3); // user 2 (zero) exclu
  });

  it("respecte la limite n", () => {
    const r = topPar(users, "nb_di_creees", 2);
    expect(r).toHaveLength(2);
    expect(r[0].id).toBe(3);
  });
});

describe("Heatmap — ordre des jours et lookup", () => {
  // Convention : 0 = dimanche (PostgreSQL EXTRACT dow)
  // Affichage : Lun=1, Mar=2, Mer=3, Jeu=4, Ven=5, Sam=6, Dim=0
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  it("dow=1 (lundi) est en première position", () => {
    expect(dowOrder[0]).toBe(1);
    expect(jours[0]).toBe("Lun");
  });

  it("dow=0 (dimanche) est en dernière position", () => {
    expect(dowOrder[6]).toBe(0);
    expect(jours[6]).toBe("Dim");
  });

  it("dow=6 (samedi) est avant-dernier", () => {
    expect(dowOrder[5]).toBe(6);
    expect(jours[5]).toBe("Sam");
  });

  it("matrice complète couverte (7 jours × 24h = 168 cellules max)", () => {
    expect(dowOrder.length * 24).toBe(168);
  });
});

describe("Heatmap — calcul d'opacité logarithmique", () => {
  function opacityFor(nb, maxNb) {
    if (!nb || maxNb === 0) return 0;
    return Math.min(1, Math.log10(nb + 1) / Math.log10(maxNb + 1));
  }

  it("nb = 0 → opacité 0", () => {
    expect(opacityFor(0, 100)).toBe(0);
  });

  it("nb = max → opacité 1", () => {
    expect(opacityFor(100, 100)).toBe(1);
  });

  it("échelle log : 10 sur 100 → ~50% (pas 10%)", () => {
    const op = opacityFor(10, 100);
    expect(op).toBeGreaterThan(0.4);
    expect(op).toBeLessThan(0.6);
  });

  it("nb=1 sur max=100 → faible mais > 0", () => {
    const op = opacityFor(1, 100);
    expect(op).toBeGreaterThan(0);
    expect(op).toBeLessThan(0.2);
  });

  it("maxNb=0 → toujours 0", () => {
    expect(opacityFor(5, 0)).toBe(0);
  });
});

describe("Calcul total et nb users actifs", () => {
  function calcStats(users, periode) {
    const total = users.reduce((s, u) => {
      const val = periode === "7" ? u.nb_actions_7j : periode === "30" ? u.nb_actions_30j : u.nb_actions_total;
      return s + (val || 0);
    }, 0);
    const actifs = users.filter((u) => {
      const val = periode === "7" ? u.nb_actions_7j : periode === "30" ? u.nb_actions_30j : u.nb_actions_total;
      return (val || 0) > 0;
    }).length;
    return { total, actifs };
  }

  const users = [
    { nb_actions_7j: 10, nb_actions_30j: 30, nb_actions_total: 100 },
    { nb_actions_7j: 0, nb_actions_30j: 5, nb_actions_total: 50 },
    { nb_actions_7j: 2, nb_actions_30j: 0, nb_actions_total: 0 },
  ];

  it("total sur 7j", () => {
    expect(calcStats(users, "7").total).toBe(12);
  });

  it("total sur 30j", () => {
    expect(calcStats(users, "30").total).toBe(35);
  });

  it("total sur 90j", () => {
    expect(calcStats(users, "90").total).toBe(150);
  });

  it("user actifs sur 7j = 2 (exclut le user avec 0)", () => {
    expect(calcStats(users, "7").actifs).toBe(2);
  });

  it("user actifs sur 30j = 2", () => {
    expect(calcStats(users, "30").actifs).toBe(2);
  });
});

describe("Moyenne actions par user", () => {
  function moyenne(total, actifs) {
    return actifs > 0 ? Math.round(total / actifs) : 0;
  }

  it("calcul classique", () => {
    expect(moyenne(100, 4)).toBe(25);
  });

  it("zero user actifs → 0 (pas NaN)", () => {
    expect(moyenne(50, 0)).toBe(0);
  });

  it("arrondi", () => {
    expect(moyenne(10, 3)).toBe(3); // 3.33 → 3
    expect(moyenne(11, 3)).toBe(4); // 3.66 → 4
  });
});

describe("Truncation email (lisibilité)", () => {
  function emailShort(email) {
    if (!email || email === "—") return "—";
    return email.length > 28 ? email.slice(0, 25) + "…" : email;
  }

  it("email court reste intact", () => {
    expect(emailShort("test@aveho.fr")).toBe("test@aveho.fr");
  });

  it("email long tronqué avec …", () => {
    expect(emailShort("tres-tres-long-email-cedric@avehosoft-services.fr"))
      .toBe("tres-tres-long-email-cedr…");
  });

  it("null/undefined/— retourne —", () => {
    expect(emailShort(null)).toBe("—");
    expect(emailShort(undefined)).toBe("—");
    expect(emailShort("—")).toBe("—");
  });

  it("limite à 28 caractères", () => {
    expect(emailShort("a".repeat(28))).toBe("a".repeat(28));
    expect(emailShort("a".repeat(29))).toHaveLength(26); // 25 + …
  });
});

describe("Podium couleurs (rang)", () => {
  function podiumColor(rank) {
    if (rank === 0) return { bg: "#fef3e2", icon: "ti-trophy" }; // or
    if (rank === 1) return { bg: "#f0f0f3", icon: "ti-award" }; // argent
    if (rank === 2) return { bg: "#fcefda", icon: "ti-medal" }; // bronze
    return { bg: "#fff", icon: "ti-user" };
  }

  it("rang 0 = or (trophy)", () => {
    expect(podiumColor(0).icon).toBe("ti-trophy");
  });

  it("rang 1 = argent (award)", () => {
    expect(podiumColor(1).icon).toBe("ti-award");
  });

  it("rang 2 = bronze (medal)", () => {
    expect(podiumColor(2).icon).toBe("ti-medal");
  });

  it("rang 3+ = user normal", () => {
    expect(podiumColor(3).icon).toBe("ti-user");
    expect(podiumColor(10).icon).toBe("ti-user");
  });
});

describe("Scénario end-to-end stats activité", () => {
  it("Scénario : 5 users, calculs cohérents", () => {
    const users = [
      { user_id: "a", user_email: "alice@x.fr", nb_di_creees: 20, nb_achats_demandes: 5, nb_validations: 10, nb_actions_total: 50, nb_actions_30j: 30, nb_actions_7j: 8 },
      { user_id: "b", user_email: "bob@x.fr", nb_di_creees: 5, nb_achats_demandes: 15, nb_validations: 8, nb_actions_total: 40, nb_actions_30j: 20, nb_actions_7j: 5 },
      { user_id: "c", user_email: "claire@x.fr", nb_di_creees: 0, nb_achats_demandes: 0, nb_validations: 2, nb_actions_total: 2, nb_actions_30j: 0, nb_actions_7j: 0 },
    ];

    // Top global sur 30j
    const top30 = [...users].sort((a, b) => b.nb_actions_30j - a.nb_actions_30j);
    expect(top30[0].user_id).toBe("a"); // 30 actions
    expect(top30[1].user_id).toBe("b"); // 20 actions

    // Top DI
    const topDi = [...users].sort((a, b) => b.nb_di_creees - a.nb_di_creees).filter(u => u.nb_di_creees > 0);
    expect(topDi).toHaveLength(2); // claire exclue
    expect(topDi[0].user_id).toBe("a");

    // Total 30j = 50
    const total30 = users.reduce((s, u) => s + u.nb_actions_30j, 0);
    expect(total30).toBe(50);

    // Users actifs 7j = 2 (alice + bob, claire à 0)
    const actifs7j = users.filter(u => u.nb_actions_7j > 0).length;
    expect(actifs7j).toBe(2);
  });
});
