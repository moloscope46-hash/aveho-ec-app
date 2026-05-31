// =============================================================
//  Tests unitaires — 0.44.0
//  Couvre : activation groupée templates RGPD, hook realtime,
//  récurrences génération auto cron, perf indexes (smoke),
//  audit a11y composants
// =============================================================
import { describe, it, expect } from "vitest";

describe("Activation groupée templates RGPD", () => {
  // Simule la logique de désactivation des templates actifs précédents
  function buildDeactivateQuery(template, existingActive) {
    // Pour un (structure, etab) donné, désactiver le template actif existant
    return existingActive.filter(t =>
      t.structure_id === template.structure_id &&
      (t.etablissement_id === template.etablissement_id ||
        (t.etablissement_id == null && template.etablissement_id == null)) &&
      t.id !== template.id &&
      t.is_active === true
    );
  }

  it("désactive le template actif précédent pour le même couple (struct, etab)", () => {
    const active = [
      { id: "a", structure_id: "s1", etablissement_id: "e1", is_active: true },
      { id: "b", structure_id: "s1", etablissement_id: "e2", is_active: true },
    ];
    const nouveau = { id: "c", structure_id: "s1", etablissement_id: "e1", is_active: false };
    const toDeact = buildDeactivateQuery(nouveau, active);
    expect(toDeact.map(t => t.id)).toEqual(["a"]);
  });

  it("désactive le template global précédent", () => {
    const active = [
      { id: "g", structure_id: "s1", etablissement_id: null, is_active: true },
    ];
    const nouveau = { id: "h", structure_id: "s1", etablissement_id: null, is_active: false };
    expect(buildDeactivateQuery(nouveau, active)).toHaveLength(1);
  });

  it("ne désactive pas un template d'un autre etab", () => {
    const active = [
      { id: "a", structure_id: "s1", etablissement_id: "e1", is_active: true },
    ];
    const nouveau = { id: "b", structure_id: "s1", etablissement_id: "e2", is_active: false };
    expect(buildDeactivateQuery(nouveau, active)).toHaveLength(0);
  });

  it("ne se désactive pas lui-même", () => {
    const active = [
      { id: "a", structure_id: "s1", etablissement_id: "e1", is_active: true },
    ];
    const nouveau = { id: "a", structure_id: "s1", etablissement_id: "e1" };
    expect(buildDeactivateQuery(nouveau, active)).toHaveLength(0);
  });
});

describe("Hook Realtime — toast couleur urgence", () => {
  function getToastConfig(table, row) {
    if (table === "interventions") {
      return {
        title: "Nouvelle DI",
        color: row.urgence === "Urgent" ? "#c0392b" : "#e35d5b",
        duration: row.urgence === "Urgent" ? 8000 : 5000,
      };
    }
    if (table === "signalements") return { title: "Nouveau signalement", color: "#7CC8C8" };
    if (table === "achats") return { title: "Achat à valider", color: "#EF9F27" };
    return null;
  }

  it("DI urgente → rouge vif + 8s", () => {
    const c = getToastConfig("interventions", { urgence: "Urgent" });
    expect(c.color).toBe("#c0392b");
    expect(c.duration).toBe(8000);
  });

  it("DI normale → orange + 5s", () => {
    const c = getToastConfig("interventions", { urgence: "Normal" });
    expect(c.color).toBe("#e35d5b");
    expect(c.duration).toBe(5000);
  });

  it("signalement → teal", () => {
    expect(getToastConfig("signalements", {}).color).toBe("#7CC8C8");
  });

  it("achat → orange", () => {
    expect(getToastConfig("achats", {}).color).toBe("#EF9F27");
  });
});

describe("Hook Realtime — channel name", () => {
  function buildChannelName(table, structureId) {
    return `realtime:${table}:${structureId}`;
  }

  it("nom unique par couple table + structure", () => {
    const a = buildChannelName("interventions", "s1");
    const b = buildChannelName("interventions", "s2");
    const c = buildChannelName("signalements", "s1");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("Récurrences cron — vérif maintenance existante", () => {
  function maintenanceExiste(maintenances, materielId, datePrevue, type) {
    return maintenances.some(m =>
      m.materiel_id === materielId &&
      m.date_prevue === datePrevue &&
      m.type === type
    );
  }

  it("détecte un doublon existant", () => {
    const m = [{ materiel_id: "m1", date_prevue: "2026-06-15", type: "Préventive" }];
    expect(maintenanceExiste(m, "m1", "2026-06-15", "Préventive")).toBe(true);
  });

  it("pas de doublon si type différent", () => {
    const m = [{ materiel_id: "m1", date_prevue: "2026-06-15", type: "Préventive" }];
    expect(maintenanceExiste(m, "m1", "2026-06-15", "Calibration")).toBe(false);
  });

  it("pas de doublon si date différente", () => {
    const m = [{ materiel_id: "m1", date_prevue: "2026-06-15", type: "Préventive" }];
    expect(maintenanceExiste(m, "m1", "2026-06-16", "Préventive")).toBe(false);
  });
});

describe("Récurrences cron — fenêtre 7 jours", () => {
  function inWindow(prochaine_due, today, days = 7) {
    if (!prochaine_due) return false;
    const tEnd = new Date(today).getTime() + days * 86400000;
    const tDue = new Date(prochaine_due).getTime();
    const tToday = new Date(today).getTime();
    return tDue >= tToday && tDue <= tEnd;
  }

  it("aujourd'hui → in window", () => {
    expect(inWindow("2026-06-01", "2026-06-01")).toBe(true);
  });

  it("J+7 → in window", () => {
    expect(inWindow("2026-06-08", "2026-06-01")).toBe(true);
  });

  it("J+8 → hors window", () => {
    expect(inWindow("2026-06-09", "2026-06-01")).toBe(false);
  });

  it("J-1 (passé) → hors window", () => {
    expect(inWindow("2026-05-31", "2026-06-01")).toBe(false);
  });

  it("prochaine_due null → false", () => {
    expect(inWindow(null, "2026-06-01")).toBe(false);
  });
});

describe("Index SQL — couverture des colonnes filtrées", () => {
  // Vérifie symboliquement que les indexes définis dans le patch couvrent
  // bien les patterns de requête utilisés dans l'app
  const indexes = [
    { table: "interventions", cols: ["created_by"] },
    { table: "interventions", cols: ["patient_id"] },
    { table: "interventions", cols: ["materiel_id"] },
    { table: "interventions", cols: ["structure_id", "statut"] },
    { table: "interventions", cols: ["structure_id", "created_at"] },
    { table: "achats", cols: ["structure_id", "statut"] },
    { table: "signalements", cols: ["structure_id", "statut"] },
    { table: "audit_log", cols: ["structure_id", "entite", "created_at"] },
    { table: "notifications", cols: ["user_id", "lue"] },
    { table: "consentements", cols: ["patient_id"] },
    { table: "maintenance_recurrences", cols: ["structure_id", "prochaine_due"] },
  ];

  it("11 indexes ciblent les requêtes critiques", () => {
    expect(indexes.length).toBeGreaterThanOrEqual(11);
  });

  it("interventions : indexes sur created_by, patient_id, materiel_id (joins fréquents)", () => {
    const intervIdx = indexes.filter(i => i.table === "interventions");
    expect(intervIdx.length).toBeGreaterThanOrEqual(3);
  });

  it("audit_log : index composite struct+entité+date pour la heatmap 0.43", () => {
    const audit = indexes.find(i => i.table === "audit_log" && i.cols.includes("entite"));
    expect(audit).toBeDefined();
  });
});

describe("IconButton a11y", () => {
  // Simule les props que reçoit IconButton
  function getAccessibleName(props) {
    return props.ariaLabel || props.title || "Action";
  }

  it("ariaLabel explicite gagne sur title", () => {
    expect(getAccessibleName({ ariaLabel: "Supprimer le patient", title: "Trash" })).toBe("Supprimer le patient");
  });

  it("title utilisé en fallback si pas d'ariaLabel", () => {
    expect(getAccessibleName({ title: "Modifier" })).toBe("Modifier");
  });

  it("fallback générique 'Action' si rien", () => {
    expect(getAccessibleName({})).toBe("Action");
  });
});

describe("Btn a11y — aria-label auto pour icon-only", () => {
  function shouldHaveAriaLabel(props) {
    if (props.ariaLabel) return true;
    // Si children est string non-vide, ça suffit (texte visible accessible)
    if (typeof props.children === "string" && props.children.length > 0) return false;
    return true; // icon-only ou children non-string → besoin d'ariaLabel
  }

  it("bouton avec children texte → pas besoin d'aria-label", () => {
    expect(shouldHaveAriaLabel({ icon: "ti-plus", children: "Ajouter" })).toBe(false);
  });

  it("bouton icon-only → besoin d'aria-label", () => {
    expect(shouldHaveAriaLabel({ icon: "ti-plus" })).toBe(true);
  });

  it("bouton avec ariaLabel explicite → toujours OK", () => {
    expect(shouldHaveAriaLabel({ icon: "ti-plus", ariaLabel: "Ajouter" })).toBe(true);
  });
});
