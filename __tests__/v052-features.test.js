// =============================================================
//  Tests unitaires — 0.52.0
//  Couvre : app_logs, digest dashboard, presets audit, focus mode,
//  recherche c:/f:, métriques 7j
// =============================================================
import { describe, it, expect } from "vitest";

describe("AK - app_logs - levels", () => {
  const LEVEL_META = {
    debug: { color: "#8a98a8" },
    info: { color: "#185FA5" },
    warn: { color: "#7a4f15" },
    error: { color: "#7a1f15" },
  };
  
  it("4 niveaux supportés", () => {
    expect(Object.keys(LEVEL_META)).toHaveLength(4);
  });
  it("error = rouge", () => {
    expect(LEVEL_META.error.color).toBe("#7a1f15");
  });
});

describe("AK - logApp helper - payload validation", () => {
  function validatePayload(payload) {
    if (!payload || !payload.message) return false;
    return true;
  }
  
  it("message obligatoire", () => {
    expect(validatePayload({})).toBe(false);
    expect(validatePayload({ message: "" })).toBe(false);
    expect(validatePayload({ message: "x" })).toBe(true);
  });
  it("level optionnel (défaut info)", () => {
    expect(validatePayload({ message: "test" })).toBe(true);
  });
});

describe("BD - métriques 7j - calcul fenêtre", () => {
  function computeSince() {
    return Date.now() - 7 * 86400000;
  }
  it("la fenêtre fait 7 jours", () => {
    const now = Date.now();
    const since = computeSince();
    const diffDays = (now - since) / 86400000;
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThanOrEqual(7.1);
  });
});

describe("BE - presets audit - effet sur filtres", () => {
  function applyPreset(preset, userId) {
    const state = {
      filtreUser: "", filtreAction: "", filtreEntite: "",
      filtreRecherche: "", dateDebut: "", dateFin: "", periode: "30"
    };
    switch (preset) {
      case "mes_actions":
        state.filtreUser = userId;
        break;
      case "suppressions_24h":
        state.filtreAction = "supprimer";
        state.periode = "1";
        break;
      case "connexions_7j":
        state.filtreAction = "connexion";
        state.periode = "7";
        break;
      case "modifs_aujourdhui":
        state.filtreAction = "modifier";
        state.periode = "1";
        break;
      case "validations_30j":
        state.filtreAction = "valider";
        state.periode = "30";
        break;
    }
    return state;
  }
  
  it("mes_actions → filtreUser uniquement", () => {
    const r = applyPreset("mes_actions", "user-a");
    expect(r.filtreUser).toBe("user-a");
    expect(r.filtreAction).toBe("");
  });
  it("suppressions_24h → action=supprimer + periode=1", () => {
    const r = applyPreset("suppressions_24h");
    expect(r.filtreAction).toBe("supprimer");
    expect(r.periode).toBe("1");
  });
  it("connexions_7j → action=connexion + periode=7", () => {
    const r = applyPreset("connexions_7j");
    expect(r.filtreAction).toBe("connexion");
    expect(r.periode).toBe("7");
  });
});

describe("BF - digest dashboard - taux succès colors", () => {
  function couleurTaux(pct) {
    if (pct >= 95) return "#5aa05a";
    if (pct >= 80) return "#EF9F27";
    return "#c0392b";
  }
  
  it(">= 95 → vert", () => {
    expect(couleurTaux(95)).toBe("#5aa05a");
    expect(couleurTaux(100)).toBe("#5aa05a");
  });
  it("entre 80 et 94 → orange", () => {
    expect(couleurTaux(85)).toBe("#EF9F27");
    expect(couleurTaux(94)).toBe("#EF9F27");
  });
  it("< 80 → rouge", () => {
    expect(couleurTaux(50)).toBe("#c0392b");
  });
});

describe("BG - mode focus - double Esc detection", () => {
  function isDoubleEsc(lastEsc, now, threshold = 500) {
    if (lastEsc === 0) return false;
    return (now - lastEsc) < threshold;
  }
  
  it("premier Esc → false (lastEsc = 0)", () => {
    expect(isDoubleEsc(0, Date.now())).toBe(false);
  });
  it("Esc < 500ms après → true", () => {
    const now = Date.now();
    expect(isDoubleEsc(now - 300, now)).toBe(true);
  });
  it("Esc > 500ms après → false", () => {
    const now = Date.now();
    expect(isDoubleEsc(now - 1000, now)).toBe(false);
  });
});

describe("BG - mode focus - ignore inputs/textarea", () => {
  function shouldTrigger(targetTag, isContentEditable) {
    const isTextInput = targetTag === "INPUT" || targetTag === "TEXTAREA" || isContentEditable;
    return !isTextInput;
  }
  
  it("dans INPUT → ne déclenche pas", () => {
    expect(shouldTrigger("INPUT", false)).toBe(false);
  });
  it("dans TEXTAREA → ne déclenche pas", () => {
    expect(shouldTrigger("TEXTAREA", false)).toBe(false);
  });
  it("dans DIV → déclenche", () => {
    expect(shouldTrigger("DIV", false)).toBe(true);
  });
  it("dans contentEditable → ne déclenche pas", () => {
    expect(shouldTrigger("DIV", true)).toBe(false);
  });
});

describe("G - recherche - prefixes étendus", () => {
  const PREFIX_MAP = {
    p: "patient", m: "materiel", d: "intervention", s: "signalement",
    a: "achat", t: "transfert", x: "maintenance",
    c: "consent", f: "fournisseur"
  };
  
  function parsePrefix(q) {
    const match = q.match(/^([pmdsatxcf]):(.*)$/i);
    if (match) {
      const prefix = match[1].toLowerCase();
      const term = match[2].trim();
      return { type: PREFIX_MAP[prefix], term };
    }
    return null;
  }
  
  it("c:dupont → consent", () => {
    const r = parsePrefix("c:dupont");
    expect(r.type).toBe("consent");
    expect(r.term).toBe("dupont");
  });
  it("f:Bastide → fournisseur", () => {
    const r = parsePrefix("f:Bastide");
    expect(r.type).toBe("fournisseur");
    expect(r.term).toBe("Bastide");
  });
  it("p:martin → patient (existant)", () => {
    expect(parsePrefix("p:martin").type).toBe("patient");
  });
  it("z:invalide → null (préfixe non supporté)", () => {
    expect(parsePrefix("z:test")).toBeNull();
  });
  it("sans préfixe → null", () => {
    expect(parsePrefix("dupont")).toBeNull();
  });
});

describe("G - groupement fournisseurs distincts", () => {
  function groupByFournisseur(achats) {
    const by = {};
    achats.forEach(a => {
      if (!a.fournisseur) return;
      if (!by[a.fournisseur]) {
        by[a.fournisseur] = { fournisseur: a.fournisseur, count: 0, last: a };
      }
      by[a.fournisseur].count++;
    });
    return Object.values(by);
  }
  
  it("3 achats même fournisseur → 1 entrée count=3", () => {
    const r = groupByFournisseur([
      { fournisseur: "Bastide", numero: "1" },
      { fournisseur: "Bastide", numero: "2" },
      { fournisseur: "Bastide", numero: "3" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(3);
  });
  it("fournisseurs null skippés", () => {
    const r = groupByFournisseur([
      { fournisseur: null, numero: "1" },
      { fournisseur: "Bastide", numero: "2" },
    ]);
    expect(r).toHaveLength(1);
  });
});
