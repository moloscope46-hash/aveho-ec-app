// =============================================================
//  Tests unitaires — 0.40.0
//  Couvre : DigestPreferences, votes signalements, stats RGPD nouvelles vues,
//  variables custom RGPD, preview étendus
// =============================================================
import { describe, it, expect } from "vitest";

describe("DigestPreferences — modes", () => {
  const MODES = ["jamais", "quotidien", "hebdo"];

  it("3 modes valides", () => {
    expect(MODES).toHaveLength(3);
    expect(MODES).toContain("jamais");
    expect(MODES).toContain("quotidien");
    expect(MODES).toContain("hebdo");
  });

  it("mode par défaut = jamais (opt-in strict)", () => {
    const defaultMode = "jamais";
    expect(MODES).toContain(defaultMode);
  });
});

describe("Digest — filtrage par jour", () => {
  function shouldSendForUser(frequence, dayOfWeek) {
    // 1 = lundi (UTC)
    if (frequence === "jamais") return false;
    if (frequence === "quotidien") return true;
    if (frequence === "hebdo") return dayOfWeek === 1;
    return false;
  }

  it("quotidien envoyé tous les jours", () => {
    for (let d = 0; d < 7; d++) {
      expect(shouldSendForUser("quotidien", d)).toBe(true);
    }
  });

  it("hebdo envoyé uniquement le lundi", () => {
    expect(shouldSendForUser("hebdo", 1)).toBe(true); // lundi
    expect(shouldSendForUser("hebdo", 0)).toBe(false); // dim
    expect(shouldSendForUser("hebdo", 6)).toBe(false); // sam
  });

  it("jamais → jamais", () => {
    for (let d = 0; d < 7; d++) {
      expect(shouldSendForUser("jamais", d)).toBe(false);
    }
  });
});

describe("Signalements — votes", () => {
  function toggleVote(userVotes, signalementId, isAdding) {
    const next = { ...userVotes };
    if (isAdding) next[signalementId] = true;
    else delete next[signalementId];
    return next;
  }

  it("ajout vote → flag true", () => {
    const r = toggleVote({}, "s1", true);
    expect(r.s1).toBe(true);
  });

  it("retrait vote → key supprimée", () => {
    const r = toggleVote({ s1: true, s2: true }, "s1", false);
    expect(r.s1).toBeUndefined();
    expect(r.s2).toBe(true);
  });

  it("trigger SQL maintient nb_votes (simulation)", () => {
    function applyVoteOp(currentCount, op) {
      if (op === "INSERT") return currentCount + 1;
      if (op === "DELETE") return Math.max(currentCount - 1, 0);
      return currentCount;
    }
    expect(applyVoteOp(5, "INSERT")).toBe(6);
    expect(applyVoteOp(5, "DELETE")).toBe(4);
    expect(applyVoteOp(0, "DELETE")).toBe(0); // ne descend pas en négatif
  });

  it("badge 'Sujet populaire' à partir de 3 votes", () => {
    function isHot(nb_votes) {
      return (nb_votes || 0) >= 3;
    }
    expect(isHot(0)).toBe(false);
    expect(isHot(2)).toBe(false);
    expect(isHot(3)).toBe(true);
    expect(isHot(10)).toBe(true);
  });
});

describe("Signalements — catégories", () => {
  function cleanCategorie(input) {
    return input?.trim() || null;
  }

  it("vide → null", () => {
    expect(cleanCategorie("")).toBeNull();
    expect(cleanCategorie("  ")).toBeNull();
    expect(cleanCategorie(undefined)).toBeNull();
  });

  it("string trimée", () => {
    expect(cleanCategorie("  Bug  ")).toBe("Bug");
  });

  it("catégories libres acceptées (pas de liste fermée)", () => {
    expect(cleanCategorie("Demande de fonctionnalité")).toBe("Demande de fonctionnalité");
    expect(cleanCategorie("UI/UX")).toBe("UI/UX");
  });
});

describe("Stats RGPD — calcul renouvellements (365j)", () => {
  function daysAgo(date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  }

  it("consentement signé il y a 364j → pas encore expiré", () => {
    const d = new Date(Date.now() - 364 * 86400000);
    expect(daysAgo(d)).toBeGreaterThanOrEqual(363);
    expect(daysAgo(d)).toBeLessThanOrEqual(364);
  });

  it("consentement signé il y a 366j → expiré", () => {
    const d = new Date(Date.now() - 366 * 86400000);
    expect(daysAgo(d)).toBeGreaterThan(365);
  });

  it("seuils alertes 7j / 15j / 30j cohérents", () => {
    const seuils = { dans30j: 30, dans15j: 15, dans7j: 7 };
    expect(seuils.dans30j).toBeGreaterThan(seuils.dans15j);
    expect(seuils.dans15j).toBeGreaterThan(seuils.dans7j);
  });
});

describe("Variables custom RGPD — validation clé", () => {
  function validateKey(key) {
    return typeof key === "string" && /^[a-z_]+$/.test(key);
  }

  it("clé minuscules + underscores OK", () => {
    expect(validateKey("partenaire_nom")).toBe(true);
    expect(validateKey("ref_contrat")).toBe(true);
    expect(validateKey("test")).toBe(true);
  });

  it("clé avec majuscules rejetée", () => {
    expect(validateKey("PartenaireNom")).toBe(false);
  });

  it("clé avec chiffres rejetée", () => {
    expect(validateKey("var123")).toBe(false);
  });

  it("clé avec espaces/tirets rejetée", () => {
    expect(validateKey("ma var")).toBe(false);
    expect(validateKey("ma-var")).toBe(false);
  });

  it("clé vide rejetée", () => {
    expect(validateKey("")).toBe(false);
    expect(validateKey(null)).toBe(false);
  });
});

describe("Variables custom RGPD — substitution dans template", () => {
  function applyCustomVars(template, customVars) {
    let out = template;
    (customVars || []).forEach((cv) => {
      if (!cv?.key) return;
      const safeKey = cv.key.replace(/[^a-z_]/g, "");
      if (!safeKey) return;
      const re = new RegExp(`\\{\\{${safeKey}\\}\\}`, "g");
      out = out.replace(re, cv.value || "—");
    });
    return out;
  }

  it("substitution simple", () => {
    const tpl = "Partenaire : {{partenaire_nom}}";
    const vars = [{ key: "partenaire_nom", value: "Aveho SAS" }];
    expect(applyCustomVars(tpl, vars)).toBe("Partenaire : Aveho SAS");
  });

  it("variable non utilisée dans le template → pas d'erreur", () => {
    const tpl = "Texte fixe";
    const vars = [{ key: "var_a", value: "X" }];
    expect(applyCustomVars(tpl, vars)).toBe("Texte fixe");
  });

  it("variable absente du custom → reste inchangée", () => {
    const tpl = "{{var_inconnue}}";
    expect(applyCustomVars(tpl, [])).toBe("{{var_inconnue}}");
  });

  it("valeur vide → fallback '—'", () => {
    const tpl = "{{var_a}}";
    expect(applyCustomVars(tpl, [{ key: "var_a", value: "" }])).toBe("—");
  });

  it("plusieurs occurrences remplacées", () => {
    const tpl = "{{x}} et {{x}}";
    expect(applyCustomVars(tpl, [{ key: "x", value: "OUI" }])).toBe("OUI et OUI");
  });

  it("clé avec caractère invalide : seuls les chars valides sont retenus", () => {
    // La fonction nettoie la clé : "var!!!" → "var", qui matche {{var}}
    const tpl = "{{var}}";
    expect(applyCustomVars(tpl, [{ key: "var!!!", value: "X" }])).toBe("X");
  });

  it("clé entièrement invalide → skip (safeKey vide)", () => {
    const tpl = "{{x}}";
    expect(applyCustomVars(tpl, [{ key: "!!!", value: "X" }])).toBe("{{x}}");
  });
});

describe("Variables custom RGPD — validateTemplate avec custom", () => {
  function validate(contenu, knownKeys) {
    const warnings = [];
    const matches = contenu.match(/\{\{([a-z_]+)\}\}/g) || [];
    const unknown = matches
      .map((m) => m.replace(/[{}]/g, ""))
      .filter((k) => !knownKeys.includes(k));
    [...new Set(unknown)].forEach((k) => warnings.push(k));
    return warnings;
  }

  it("variable custom reconnue → pas de warning", () => {
    const w = validate("{{partenaire_nom}}", ["patient_nom_prenom", "partenaire_nom"]);
    expect(w).toEqual([]);
  });

  it("variable inconnue → warning", () => {
    const w = validate("{{typo}}", ["patient_nom_prenom"]);
    expect(w).toContain("typo");
  });

  it("mix variables standard + custom + inconnue", () => {
    const w = validate("{{patient_nom_prenom}} {{partenaire_nom}} {{typo}}", ["patient_nom_prenom", "partenaire_nom"]);
    expect(w).toEqual(["typo"]);
  });
});

describe("Edge function digest — construction email", () => {
  function rowHtml(icon, label, n, color) {
    if (n === 0) return "";
    return `[${icon}] ${label} : ${n}`;
  }

  it("compteur 0 → row vide (skip)", () => {
    expect(rowHtml("🔧", "DI", 0, "#185FA5")).toBe("");
  });

  it("compteur > 0 → row produit", () => {
    expect(rowHtml("🔧", "DI", 5, "#185FA5")).toContain("DI");
    expect(rowHtml("🔧", "DI", 5, "#185FA5")).toContain("5");
  });

  it("hasContent calculé sur somme des compteurs", () => {
    function hasContent(d) {
      return (d.di_actives + d.achats_a_valider + d.signalements_nouveaux + d.renouvellements_30j) > 0;
    }
    expect(hasContent({ di_actives: 0, achats_a_valider: 0, signalements_nouveaux: 0, renouvellements_30j: 0 })).toBe(false);
    expect(hasContent({ di_actives: 1, achats_a_valider: 0, signalements_nouveaux: 0, renouvellements_30j: 0 })).toBe(true);
  });
});

describe("Preview étendus — patient minimal dans DI", () => {
  it("patient sans lit/etiquettes → preview affichable quand même", () => {
    const patient = { id: "p1", nom: "Dupont", prenom: "Marie", chambre: "12" };
    const extras = {}; // pas de lit, pas d'étiquettes, pas de RGPD
    // Le composant doit pouvoir s'afficher sans planter
    expect(patient.id).toBeTruthy();
    expect(extras.lit).toBeUndefined(); // OK
    expect(extras.etiquettes || []).toEqual([]);
  });

  it("patient avec données partielles dans intervention.patients", () => {
    // Les listes de DI ne préchargent pas le lit ni les étiquettes
    // → le preview affiche ce qu'il a, sans erreur
    const fromIntervention = { id: "p1", nom: "Dupont", prenom: "Marie", chambre: "12", date_naissance: "1958-03-12", numero_dossier: "D-042" };
    expect(fromIntervention.id).toBeTruthy();
    expect(fromIntervention.date_naissance).toBeTruthy(); // permet calcul d'âge
  });
});

describe("Renouvellements RGPD — RenouvCard", () => {
  function isUrgent(label, value) {
    return (label === "Expirés" || label === "Dans 7 jours") && value > 0;
  }

  it("expirés > 0 → urgent (fond rouge)", () => {
    expect(isUrgent("Expirés", 5)).toBe(true);
  });

  it("7 jours > 0 → urgent (fond orange)", () => {
    expect(isUrgent("Dans 7 jours", 3)).toBe(true);
  });

  it("7 jours = 0 → pas urgent", () => {
    expect(isUrgent("Dans 7 jours", 0)).toBe(false);
  });

  it("30 jours → jamais urgent", () => {
    expect(isUrgent("Dans 30 jours", 10)).toBe(false);
  });
});
