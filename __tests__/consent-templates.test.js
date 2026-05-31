// =============================================================
//  Tests unitaires — Modèles consentement personnalisables
//  Alpha 0.34.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("nextVersion — incrément semver simple", () => {
  function nextVersion(latestVersion) {
    if (!latestVersion) return "1.0";
    const match = latestVersion.match(/^(\d+)\.(\d+)$/);
    if (!match) return "1.0";
    const [, major, minor] = match;
    return `${major}.${parseInt(minor) + 1}`;
  }

  it("null → 1.0", () => {
    expect(nextVersion(null)).toBe("1.0");
    expect(nextVersion(undefined)).toBe("1.0");
    expect(nextVersion("")).toBe("1.0");
  });

  it("1.0 → 1.1", () => {
    expect(nextVersion("1.0")).toBe("1.1");
  });

  it("1.5 → 1.6", () => {
    expect(nextVersion("1.5")).toBe("1.6");
  });

  it("2.10 → 2.11 (gère les 2 chiffres)", () => {
    expect(nextVersion("2.10")).toBe("2.11");
  });

  it("format invalide → 1.0", () => {
    expect(nextVersion("v1.0")).toBe("1.0");
    expect(nextVersion("1.0.5")).toBe("1.0");
    expect(nextVersion("xxx")).toBe("1.0");
  });

  it("ordre préservé : v3 > v2 > v1", () => {
    const versions = ["1.0", nextVersion("1.0"), nextVersion(nextVersion("1.0"))];
    expect(versions).toEqual(["1.0", "1.1", "1.2"]);
  });
});

describe("validateTemplate — détection des variables requises", () => {
  const KNOWN = ["patient_nom_prenom", "patient_naissance_block", "patient_dossier_block",
    "patient_naissance_block_signature", "collectivite_nom", "etablissement_nom_block",
    "date_signature", "finalites_block"];

  function validateTemplate(contenu_md) {
    const warnings = [];
    const required = ["patient_nom_prenom", "date_signature", "finalites_block"];
    required.forEach((v) => {
      if (!contenu_md.includes(`{{${v}}}`)) {
        warnings.push(`Variable manquante : {{${v}}}`);
      }
    });
    const matches = contenu_md.match(/\{\{([a-z_]+)\}\}/g) || [];
    const unknown = matches
      .map((m) => m.replace(/[{}]/g, ""))
      .filter((k) => !KNOWN.includes(k));
    const uniqueUnknown = [...new Set(unknown)];
    uniqueUnknown.forEach((k) => {
      warnings.push(`Variable inconnue : {{${k}}}`);
    });
    return warnings;
  }

  it("template complet → aucun warning", () => {
    const md = "Patient : {{patient_nom_prenom}}, signé le {{date_signature}}. Finalités :\n{{finalites_block}}";
    expect(validateTemplate(md)).toEqual([]);
  });

  it("manque patient_nom_prenom → warning", () => {
    const md = "Signé le {{date_signature}}. {{finalites_block}}";
    const warn = validateTemplate(md);
    expect(warn.some(w => w.includes("patient_nom_prenom"))).toBe(true);
  });

  it("manque date_signature → warning", () => {
    const md = "Patient {{patient_nom_prenom}} {{finalites_block}}";
    const warn = validateTemplate(md);
    expect(warn.some(w => w.includes("date_signature"))).toBe(true);
  });

  it("manque finalites_block → warning", () => {
    const md = "Patient {{patient_nom_prenom}} signé le {{date_signature}}";
    const warn = validateTemplate(md);
    expect(warn.some(w => w.includes("finalites_block"))).toBe(true);
  });

  it("variable inconnue → warning", () => {
    const md = "{{patient_nom_prenom}} {{date_signature}} {{finalites_block}} {{var_inexistante}}";
    const warn = validateTemplate(md);
    expect(warn.some(w => w.includes("var_inexistante"))).toBe(true);
  });

  it("plusieurs occurrences de la même variable inconnue → 1 seul warning", () => {
    const md = "{{patient_nom_prenom}} {{date_signature}} {{finalites_block}} {{xxx}} {{xxx}} {{xxx}}";
    const warn = validateTemplate(md);
    const xxxWarnings = warn.filter(w => w.includes("xxx"));
    expect(xxxWarnings).toHaveLength(1);
  });

  it("tous les warnings cumulés", () => {
    const md = "Texte sans aucune variable";
    const warn = validateTemplate(md);
    // 3 requises manquantes
    expect(warn.length).toBeGreaterThanOrEqual(3);
  });

  it("variables avec underscore en milieu de mot", () => {
    const md = "{{patient_nom_prenom}} {{patient_naissance_block}} {{date_signature}} {{finalites_block}}";
    expect(validateTemplate(md)).toEqual([]);
  });
});

describe("Rendu template — substitution variables", () => {
  function render(template, vars) {
    let out = template;
    out = out.replace(/\{\{patient_nom_prenom\}\}/g, vars.patient_nom_prenom || "—");
    out = out.replace(/\{\{collectivite_nom\}\}/g, vars.collectivite_nom || "—");
    out = out.replace(/\{\{date_signature\}\}/g, vars.date_signature || "");
    return out;
  }

  it("substitution simple", () => {
    const r = render("Bonjour {{patient_nom_prenom}}", { patient_nom_prenom: "Marie" });
    expect(r).toBe("Bonjour Marie");
  });

  it("substitution multiple de la même variable", () => {
    const r = render("{{patient_nom_prenom}} signé par {{patient_nom_prenom}}",
      { patient_nom_prenom: "Marie" });
    expect(r).toBe("Marie signé par Marie");
  });

  it("substitution avec valeur vide → fallback —", () => {
    const r = render("Patient : {{patient_nom_prenom}}", {});
    expect(r).toBe("Patient : —");
  });

  it("plusieurs variables différentes", () => {
    const r = render("Le {{date_signature}} {{patient_nom_prenom}} pour {{collectivite_nom}}",
      { patient_nom_prenom: "Marie", collectivite_nom: "Aveho", date_signature: "01/01/2026" });
    expect(r).toBe("Le 01/01/2026 Marie pour Aveho");
  });
});

describe("État d'un template — règles métier", () => {
  function canEdit(template, usageCount) {
    return !template.is_active && usageCount === 0;
  }
  function canActivate(template) {
    return !template.is_active;
  }

  it("template actif → non éditable", () => {
    expect(canEdit({ is_active: true }, 0)).toBe(false);
  });

  it("template utilisé (usage > 0) → non éditable", () => {
    expect(canEdit({ is_active: false }, 5)).toBe(false);
  });

  it("brouillon vierge → éditable", () => {
    expect(canEdit({ is_active: false }, 0)).toBe(true);
  });

  it("template actif → non ré-activable", () => {
    expect(canActivate({ is_active: true })).toBe(false);
  });

  it("brouillon → activable", () => {
    expect(canActivate({ is_active: false })).toBe(true);
  });
});

describe("Fallback template par défaut", () => {
  function loadTemplate(dbResult) {
    if (!dbResult) {
      return { id: null, version: "1.0", contenu_md: "DEFAULT", nom: "Template par défaut (code)" };
    }
    return {
      id: dbResult.template_id,
      version: dbResult.version,
      contenu_md: dbResult.contenu_md,
      nom: dbResult.nom,
    };
  }

  it("aucun template en BDD → fallback hardcode", () => {
    const t = loadTemplate(null);
    expect(t.id).toBeNull();
    expect(t.contenu_md).toBe("DEFAULT");
  });

  it("template en BDD → utilise BDD", () => {
    const t = loadTemplate({ template_id: "abc", version: "2.0", contenu_md: "CUSTOM", nom: "Mon template" });
    expect(t.id).toBe("abc");
    expect(t.version).toBe("2.0");
    expect(t.contenu_md).toBe("CUSTOM");
  });
});

describe("Scénario complet : création + activation", () => {
  it("Workflow : créer brouillon → preview → activer", () => {
    const templates = [];
    // Étape 1 : créer un brouillon
    const draft = {
      id: "uuid-1",
      version: "1.0",
      contenu_md: "{{patient_nom_prenom}} {{date_signature}} {{finalites_block}}",
      is_active: false,
      created_at: new Date().toISOString(),
    };
    templates.push(draft);
    expect(templates.find(t => t.is_active)).toBeUndefined();

    // Étape 2 : activer
    templates[0].is_active = true;
    templates[0].activated_at = new Date().toISOString();
    const active = templates.find(t => t.is_active);
    expect(active).toBeDefined();
    expect(active.id).toBe("uuid-1");
  });

  it("Workflow : créer v1.0 → activer → créer v1.1 (1.0 reste, désactivé après activation 1.1)", () => {
    const templates = [
      { id: "uuid-1", version: "1.0", is_active: true, activated_at: "2026-01-01" },
    ];
    // Créer v1.1
    templates.unshift({ id: "uuid-2", version: "1.1", is_active: false, contenu_md: "..." });
    // Activer v1.1 (simulation du trigger : désactiver l'ancien)
    templates.forEach((t) => t.is_active = (t.id === "uuid-2"));
    expect(templates.filter(t => t.is_active)).toHaveLength(1);
    expect(templates.find(t => t.is_active).id).toBe("uuid-2");
    // L'ancien reste pour audit
    expect(templates.find(t => t.id === "uuid-1")).toBeDefined();
  });

  it("Workflow : template utilisé ne peut plus être modifié", () => {
    const template = { id: "uuid-1", is_active: false };
    const usageCount = 12; // 12 consentements signés avec ce template
    function canEdit(t, c) { return !t.is_active && c === 0; }
    expect(canEdit(template, usageCount)).toBe(false);
  });
});
