// =============================================================
//  Tests unitaires — 0.42.0
//  Couvre : templates RGPD etab, audit log, présentation, digest history,
//  timeline DI fiche patient
// =============================================================
import { describe, it, expect } from "vitest";

describe("Templates RGPD — priorité etab > structure > code", () => {
  // La vue v_consent_template_actif résout cette priorité côté SQL.
  // Côté JS, on filtre par etablissement_id.
  function selectTemplate(etabTemplate, structureTemplate, hardcoded) {
    if (etabTemplate) return etabTemplate;
    if (structureTemplate) return structureTemplate;
    return hardcoded;
  }

  it("template etab → utilisé en priorité", () => {
    const etab = { id: "t1", nom: "Etab specific" };
    const struct = { id: "t2", nom: "Global" };
    const code = { id: null, nom: "Hardcoded" };
    expect(selectTemplate(etab, struct, code)).toEqual(etab);
  });

  it("pas de template etab → fallback structure", () => {
    const struct = { id: "t2", nom: "Global" };
    const code = { id: null, nom: "Hardcoded" };
    expect(selectTemplate(null, struct, code)).toEqual(struct);
  });

  it("ni etab ni structure → fallback hardcoded", () => {
    const code = { id: null, nom: "Hardcoded" };
    expect(selectTemplate(null, null, code)).toEqual(code);
  });
});

describe("Templates RGPD — payload sauvegarde", () => {
  function buildPayload(editor) {
    return {
      version: editor.version?.trim(),
      nom: editor.nom?.trim() || null,
      etablissement_id: editor.etablissement_id || null,
      is_active: false,
    };
  }

  it("etablissement_id null → global structure", () => {
    const p = buildPayload({ version: "1.0", nom: "Std", etablissement_id: null });
    expect(p.etablissement_id).toBeNull();
  });

  it("etablissement_id rempli → template etab", () => {
    const p = buildPayload({ version: "2.0", nom: "Etab", etablissement_id: "abc-123" });
    expect(p.etablissement_id).toBe("abc-123");
  });

  it("string vide etablissement_id → null", () => {
    const p = buildPayload({ version: "1.0", nom: "Std", etablissement_id: "" });
    expect(p.etablissement_id).toBeNull();
  });
});

describe("Audit log — couleur par action", () => {
  function actionColor(action) {
    const map = {
      creer: { bg: "#dff5e0", fg: "#2e6f33" },
      modifier: { bg: "#eef5fc", fg: "#185FA5" },
      supprimer: { bg: "#fef0ee", fg: "#c0392b" },
      valider: { bg: "#dff5e0", fg: "#2e6f33" },
      refuser: { bg: "#fef0ee", fg: "#c0392b" },
    };
    return map[action] || { bg: "#f4f7fa", fg: "#6c7a89" };
  }

  it("creer/valider partagent vert", () => {
    expect(actionColor("creer").fg).toBe(actionColor("valider").fg);
  });

  it("supprimer/refuser partagent rouge", () => {
    expect(actionColor("supprimer").fg).toBe(actionColor("refuser").fg);
  });

  it("action inconnue → couleur neutre", () => {
    expect(actionColor("xyz").fg).toBe("#6c7a89");
  });
});

describe("Audit log — pagination", () => {
  const PAGE_SIZE = 50;

  function totalPages(total) {
    return Math.ceil(total / PAGE_SIZE);
  }

  it("0 entrées → 0 pages", () => {
    expect(totalPages(0)).toBe(0);
  });

  it("50 entrées → 1 page", () => {
    expect(totalPages(50)).toBe(1);
  });

  it("51 entrées → 2 pages", () => {
    expect(totalPages(51)).toBe(2);
  });

  it("1000 entrées → 20 pages", () => {
    expect(totalPages(1000)).toBe(20);
  });
});

describe("Audit log — range Supabase", () => {
  const PAGE_SIZE = 50;

  function getRange(page) {
    return [page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1];
  }

  it("page 0 → range [0, 49]", () => {
    expect(getRange(0)).toEqual([0, 49]);
  });

  it("page 1 → range [50, 99]", () => {
    expect(getRange(1)).toEqual([50, 99]);
  });

  it("page 5 → range [250, 299]", () => {
    expect(getRange(5)).toEqual([250, 299]);
  });
});

describe("DigestHistory — compteurs", () => {
  function computeTotal(r) {
    return (r.di_actives || 0) 
      + (r.achats_a_valider || 0) 
      + (r.signalements_nouveaux || 0) 
      + (r.renouvellements_30j || 0);
  }

  it("compteurs tous 0 → total 0 → 'Vide'", () => {
    expect(computeTotal({ di_actives: 0, achats_a_valider: 0 })).toBe(0);
  });

  it("compteurs mixtes → somme correcte", () => {
    expect(computeTotal({ di_actives: 5, achats_a_valider: 2, signalements_nouveaux: 1, renouvellements_30j: 3 })).toBe(11);
  });

  it("contenu_resume null → 0", () => {
    expect(computeTotal({})).toBe(0);
  });
});

describe("DigestHistory — pill type", () => {
  function pillColor(type) {
    if (type === "hebdo") return { bg: "#e8e0f0", fg: "#5e4a8c" };
    return { bg: "#fcefda", fg: "#7a4f15" };
  }

  it("hebdo → violet", () => {
    expect(pillColor("hebdo").fg).toBe("#5e4a8c");
  });

  it("quotidien → orange", () => {
    expect(pillColor("quotidien").fg).toBe("#7a4f15");
  });

  it("autre → quotidien par défaut", () => {
    expect(pillColor("xyz").fg).toBe("#7a4f15");
  });
});

describe("Fiche patient — filtre matériel timeline", () => {
  function filtrer(interventions, libelle) {
    if (!libelle) return interventions;
    return interventions.filter(d => d.materiels?.libelle === libelle);
  }

  function extraireMatLibelles(interventions) {
    return [...new Set(interventions.map(d => d.materiels?.libelle).filter(Boolean))].sort();
  }

  const di = [
    { id: "1", materiels: { libelle: "Lit médicalisé" } },
    { id: "2", materiels: { libelle: "Pompe" } },
    { id: "3", materiels: { libelle: "Lit médicalisé" } },
    { id: "4", materiels: null },
    { id: "5", materiels: { libelle: "Concentrateur O2" } },
  ];

  it("aucun filtre → toutes les DI", () => {
    expect(filtrer(di, "")).toHaveLength(5);
  });

  it("filtre 'Lit médicalisé' → 2 DI", () => {
    expect(filtrer(di, "Lit médicalisé")).toHaveLength(2);
  });

  it("liste matériels uniques triée", () => {
    expect(extraireMatLibelles(di)).toEqual(["Concentrateur O2", "Lit médicalisé", "Pompe"]);
  });

  it("filtre matériel introuvable → 0", () => {
    expect(filtrer(di, "Inexistant")).toHaveLength(0);
  });
});

describe("Mode présentation — tri urgences + statuts visibles", () => {
  function isStatutVisible(statut) {
    return !["Clôturée", "Refusée"].includes(statut);
  }

  it("Nouvelle → visible", () => {
    expect(isStatutVisible("Nouvelle")).toBe(true);
  });

  it("En cours → visible", () => {
    expect(isStatutVisible("En cours")).toBe(true);
  });

  it("Clôturée → masquée", () => {
    expect(isStatutVisible("Clôturée")).toBe(false);
  });

  it("Refusée → masquée", () => {
    expect(isStatutVisible("Refusée")).toBe(false);
  });
});

describe("Mode présentation — split urgences/autres", () => {
  function split(rows) {
    const urgents = rows.filter(r => r.urgence === "Urgent");
    const autres = rows.filter(r => r.urgence !== "Urgent");
    return { urgents, autres };
  }

  it("liste vide → 2 tableaux vides", () => {
    const { urgents, autres } = split([]);
    expect(urgents).toEqual([]);
    expect(autres).toEqual([]);
  });

  it("mix urgents/normaux", () => {
    const { urgents, autres } = split([
      { id: "1", urgence: "Urgent" },
      { id: "2", urgence: "Normal" },
      { id: "3", urgence: "Urgent" },
      { id: "4", urgence: null },
    ]);
    expect(urgents).toHaveLength(2);
    expect(autres).toHaveLength(2);
  });
});

describe("Mode présentation — refresh interval", () => {
  function parseRefresh(param) {
    const n = parseInt(param || "60", 10);
    return Number.isFinite(n) && n >= 10 ? n : 60;
  }

  it("défaut 60s", () => {
    expect(parseRefresh(null)).toBe(60);
    expect(parseRefresh(undefined)).toBe(60);
  });

  it("paramètre valide", () => {
    expect(parseRefresh("30")).toBe(30);
    expect(parseRefresh("120")).toBe(120);
  });

  it("paramètre invalide → défaut", () => {
    expect(parseRefresh("abc")).toBe(60);
  });
});
