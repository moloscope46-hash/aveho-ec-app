// =============================================================
//  Tests unitaires — 0.43.0
//  Couvre : stats DI, calendrier maintenance, realtime, duplication
//  templates, audit heatmap, récurrences maintenance
// =============================================================
import { describe, it, expect } from "vitest";

describe("Stats DI — KPIs", () => {
  function pctUrgent(total, nb_urgent) {
    if (!total) return 0;
    return Math.round(100 * nb_urgent / total);
  }
  function pctResolu(total, nb_resolu) {
    if (!total) return 0;
    return Math.round(100 * nb_resolu / total);
  }
  function tendance(ceMois, moisDernier) {
    if (!moisDernier) return null;
    return Math.round(((ceMois - moisDernier) / moisDernier) * 100);
  }

  it("% urgent calculé sans division par zéro", () => {
    expect(pctUrgent(0, 0)).toBe(0);
    expect(pctUrgent(10, 3)).toBe(30);
    expect(pctUrgent(7, 1)).toBe(14);
  });

  it("% résolu", () => {
    expect(pctResolu(100, 75)).toBe(75);
    expect(pctResolu(0, 0)).toBe(0);
  });

  it("tendance mois courant vs précédent", () => {
    expect(tendance(50, 25)).toBe(100); // +100%
    expect(tendance(10, 20)).toBe(-50);
    expect(tendance(10, 0)).toBeNull();
  });
});

describe("Calendrier maintenance — calcul offset semaine", () => {
  // Lundi = 1, Dimanche = 0 → mappé sur 6 pour démarrer lundi
  function getOffset(jsDay) {
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  it("dimanche → offset 6", () => {
    expect(getOffset(0)).toBe(6);
  });

  it("lundi → offset 0", () => {
    expect(getOffset(1)).toBe(0);
  });

  it("mercredi → offset 2", () => {
    expect(getOffset(3)).toBe(2);
  });

  it("samedi → offset 5", () => {
    expect(getOffset(6)).toBe(5);
  });
});

describe("Calendrier maintenance — group by jour", () => {
  function groupByDay(rows) {
    const map = {};
    rows.forEach((r) => {
      if (!r.date_prevue) return;
      const d = r.date_prevue.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }

  it("multiple maintenances même jour", () => {
    const g = groupByDay([
      { id: "1", date_prevue: "2026-06-15" },
      { id: "2", date_prevue: "2026-06-15" },
      { id: "3", date_prevue: "2026-06-20" },
    ]);
    expect(g["2026-06-15"]).toHaveLength(2);
    expect(g["2026-06-20"]).toHaveLength(1);
  });

  it("ignore date_prevue null", () => {
    const g = groupByDay([{ id: "1", date_prevue: null }]);
    expect(Object.keys(g)).toHaveLength(0);
  });

  it("timestamp ISO → tronqué à YYYY-MM-DD", () => {
    const g = groupByDay([{ id: "1", date_prevue: "2026-06-15T14:30:00Z" }]);
    expect(g["2026-06-15"]).toBeDefined();
  });
});

describe("NotifBell Realtime — déduplication par id", () => {
  function addNotif(prev, payload) {
    if (prev.some((n) => n.id === payload.id)) return prev;
    return [payload, ...prev].slice(0, 30);
  }

  it("ajout simple", () => {
    expect(addNotif([], { id: "a", titre: "Test" })).toHaveLength(1);
  });

  it("doublon ignoré", () => {
    const r = addNotif([{ id: "a", titre: "A" }], { id: "a", titre: "A2" });
    expect(r).toHaveLength(1);
    expect(r[0].titre).toBe("A"); // pas écrasé
  });

  it("limite 30 max", () => {
    const prev = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}` }));
    const r = addNotif(prev, { id: "new", titre: "Nouveau" });
    expect(r).toHaveLength(30);
    expect(r[0].id).toBe("new"); // nouveau en tête
  });
});

describe("NotifBell — détection conditions toast natif", () => {
  function shouldShowToast(notifPermission, documentHidden) {
    return notifPermission === "granted" && documentHidden === true;
  }

  it("permission granted + tab caché → toast", () => {
    expect(shouldShowToast("granted", true)).toBe(true);
  });

  it("permission granted + tab visible → pas de toast (déjà visible)", () => {
    expect(shouldShowToast("granted", false)).toBe(false);
  });

  it("permission denied → jamais", () => {
    expect(shouldShowToast("denied", true)).toBe(false);
  });
});

describe("Templates RGPD — duplication multi-etabs", () => {
  function buildInserts(source, etabIds, userId) {
    return etabIds.map((etabId) => ({
      structure_id: source.structure_id,
      etablissement_id: etabId,
      version: source.version,
      nom: source.nom ? `${source.nom} (copie)` : `Copie de v${source.version}`,
      contenu_md: source.contenu_md,
      is_active: false, // toujours brouillon à la duplication
      created_by: userId,
    }));
  }

  const source = {
    structure_id: "s1",
    version: "2.0",
    nom: "Template 2026",
    contenu_md: "# Contenu",
  };

  it("1 etab → 1 insert", () => {
    const r = buildInserts(source, ["etab1"], "u1");
    expect(r).toHaveLength(1);
    expect(r[0].etablissement_id).toBe("etab1");
  });

  it("3 etabs → 3 inserts indépendants", () => {
    const r = buildInserts(source, ["etab1", "etab2", "etab3"], "u1");
    expect(r).toHaveLength(3);
    expect(new Set(r.map(x => x.etablissement_id))).toEqual(new Set(["etab1", "etab2", "etab3"]));
  });

  it("tous les inserts sont is_active=false (brouillon)", () => {
    const r = buildInserts(source, ["etab1", "etab2"], "u1");
    r.forEach(x => expect(x.is_active).toBe(false));
  });

  it("nom inclut '(copie)' pour distinguer", () => {
    const r = buildInserts(source, ["etab1"], "u1");
    expect(r[0].nom).toContain("copie");
  });

  it("fallback nom sans nom source", () => {
    const r = buildInserts({ ...source, nom: null }, ["etab1"], "u1");
    expect(r[0].nom).toBe("Copie de v2.0");
  });
});

describe("Audit heatmap — RPC params", () => {
  function buildRpcParams(structureId, action, entite, periode) {
    const jours = periode === "all" ? 90 : parseInt(periode);
    return {
      p_structure_id: structureId,
      p_action: action || null,
      p_entite: entite || null,
      p_jours: jours,
    };
  }

  it("aucun filtre → null pour action/entite", () => {
    const p = buildRpcParams("s1", "", "", "30");
    expect(p.p_action).toBeNull();
    expect(p.p_entite).toBeNull();
    expect(p.p_jours).toBe(30);
  });

  it("filtres remplis", () => {
    const p = buildRpcParams("s1", "creer", "di", "7");
    expect(p.p_action).toBe("creer");
    expect(p.p_entite).toBe("di");
    expect(p.p_jours).toBe(7);
  });

  it("periode all → 90 jours par défaut", () => {
    const p = buildRpcParams("s1", "", "", "all");
    expect(p.p_jours).toBe(90);
  });
});

describe("Récurrences maintenance — catégorisation échéance", () => {
  function categoriser(r, today = "2026-06-01") {
    if (!r.actif) return "inactif";
    if (!r.prochaine_due) return "sans-date";
    if (r.prochaine_due < today) return "retard";
    const diff = (new Date(r.prochaine_due) - new Date(today)) / 86400000;
    if (diff <= 7) return "imminent";
    if (diff <= 30) return "proche";
    return "ok";
  }

  it("prochaine_due passée → retard", () => {
    expect(categoriser({ actif: true, prochaine_due: "2026-05-20" })).toBe("retard");
  });

  it("dans 5 jours → imminent", () => {
    expect(categoriser({ actif: true, prochaine_due: "2026-06-06" })).toBe("imminent");
  });

  it("dans 20 jours → proche", () => {
    expect(categoriser({ actif: true, prochaine_due: "2026-06-21" })).toBe("proche");
  });

  it("dans 60 jours → ok", () => {
    expect(categoriser({ actif: true, prochaine_due: "2026-07-31" })).toBe("ok");
  });

  it("inactif → catégorie inactif", () => {
    expect(categoriser({ actif: false, prochaine_due: "2026-05-20" })).toBe("inactif");
  });

  it("sans date → sans-date", () => {
    expect(categoriser({ actif: true, prochaine_due: null })).toBe("sans-date");
  });
});

describe("Récurrences — calcul prochaine_due automatique", () => {
  // DST-safe (cf hotfix 0.41)
  function calcProchaine(derniere, frequence_jours) {
    if (!derniere || !frequence_jours) return null;
    const t = new Date(derniere).getTime();
    return new Date(t + frequence_jours * 86400000).toISOString().slice(0, 10);
  }

  it("90 jours après le 2026-06-01", () => {
    expect(calcProchaine("2026-06-01", 90)).toBe("2026-08-30");
  });

  it("365 jours = 1 an", () => {
    expect(calcProchaine("2026-01-01", 365)).toBe("2027-01-01");
  });

  it("marquer comme faite aujourd'hui recalcule à +N jours", () => {
    // Simulation : si on est le 2026-06-15 et que freq = 30j, prochaine = 2026-07-15
    const today = "2026-06-15";
    expect(calcProchaine(today, 30)).toBe("2026-07-15");
  });
});

describe("Stats DI — split résolu vs autres pour stacked chart", () => {
  function buildStackedData(rows) {
    return rows.map((m) => ({
      label: m.mois_label?.slice(0, 3) || "",
      nb_resolu: m.nb_resolu,
      nb_autres: Math.max((m.nb_total || 0) - (m.nb_resolu || 0), 0),
    }));
  }

  it("split correct", () => {
    const r = buildStackedData([{ mois_label: "Jan", nb_total: 10, nb_resolu: 7 }]);
    expect(r[0].nb_resolu).toBe(7);
    expect(r[0].nb_autres).toBe(3);
  });

  it("nb_resolu > total (cas pathologique) → autres clampé à 0", () => {
    const r = buildStackedData([{ mois_label: "Jan", nb_total: 5, nb_resolu: 7 }]);
    expect(r[0].nb_autres).toBe(0);
  });

  it("label tronqué à 3 chars", () => {
    const r = buildStackedData([{ mois_label: "Janvier", nb_total: 5, nb_resolu: 3 }]);
    expect(r[0].label).toBe("Jan");
  });
});
