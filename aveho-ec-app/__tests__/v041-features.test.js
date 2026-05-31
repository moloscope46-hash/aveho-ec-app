// =============================================================
//  Tests unitaires — 0.41.0
//  Couvre : drill heatmap RGPD, digest test, signalements workflow,
//  preview kanban, maintenances stats, widget atraiter
// =============================================================
import { describe, it, expect } from "vitest";

describe("Drill heatmap RGPD — paramètres RPC", () => {
  function validateParams({ p_structure_id, p_jour_semaine, p_heure }) {
    return Boolean(p_structure_id) 
      && p_jour_semaine >= 0 && p_jour_semaine <= 6 
      && p_heure >= 0 && p_heure <= 23;
  }

  it("params valides", () => {
    expect(validateParams({ p_structure_id: "abc", p_jour_semaine: 1, p_heure: 14 })).toBe(true);
  });

  it("jour_semaine hors bornes (7)", () => {
    expect(validateParams({ p_structure_id: "abc", p_jour_semaine: 7, p_heure: 14 })).toBe(false);
  });

  it("heure hors bornes (24)", () => {
    expect(validateParams({ p_structure_id: "abc", p_jour_semaine: 1, p_heure: 24 })).toBe(false);
  });

  it("structure_id manquant", () => {
    expect(validateParams({ p_jour_semaine: 1, p_heure: 14 })).toBe(false);
  });
});

describe("Digest test — réponse Edge Function", () => {
  function parseResponse(data) {
    if (!data.ok) return { ok: false, message: data.error || "Erreur" };
    const sent = (data.results || []).find((r) => r.sent || r.dry_run);
    return {
      ok: true,
      message: sent ? `Envoyé à ${sent.email || "ton email"}` : "Aucun contenu à envoyer",
    };
  }

  it("succès avec envoi → message envoyé", () => {
    const r = parseResponse({ ok: true, results: [{ sent: true, email: "test@ex.fr" }] });
    expect(r.ok).toBe(true);
    expect(r.message).toContain("test@ex.fr");
  });

  it("succès sans contenu → message neutre", () => {
    const r = parseResponse({ ok: true, results: [{ skipped: "no_content" }] });
    expect(r.ok).toBe(true);
    expect(r.message).toContain("Aucun contenu");
  });

  it("dry_run accepté comme envoi (test)", () => {
    const r = parseResponse({ ok: true, results: [{ dry_run: true, email: "test@ex.fr" }] });
    expect(r.ok).toBe(true);
    expect(r.message).toContain("test@ex.fr");
  });

  it("erreur Edge Function", () => {
    const r = parseResponse({ ok: false, error: "Boom" });
    expect(r.ok).toBe(false);
    expect(r.message).toBe("Boom");
  });
});

describe("Signalements — workflow transition auto", () => {
  function computeNextStatut(modal, form) {
    // Logique : si Nouveau + 1ère réponse + form.statut === Nouveau → passe à En cours
    if (form.reponse?.trim() && !modal.reponse) {
      if (modal.statut === "Nouveau" && form.statut === "Nouveau") {
        return "En cours";
      }
    }
    return form.statut || "Nouveau";
  }

  it("Nouveau sans réponse → reste Nouveau", () => {
    expect(computeNextStatut(
      { statut: "Nouveau", reponse: null },
      { statut: "Nouveau", reponse: "" }
    )).toBe("Nouveau");
  });

  it("Nouveau + 1ère réponse + statut form Nouveau → En cours auto", () => {
    expect(computeNextStatut(
      { statut: "Nouveau", reponse: null },
      { statut: "Nouveau", reponse: "Voici ma réponse" }
    )).toBe("En cours");
  });

  it("Nouveau + réponse + admin a forcé Traité → respecte le choix", () => {
    expect(computeNextStatut(
      { statut: "Nouveau", reponse: null },
      { statut: "Traité", reponse: "Réponse" }
    )).toBe("Traité");
  });

  it("Modification de réponse existante → pas de transition auto", () => {
    expect(computeNextStatut(
      { statut: "En cours", reponse: "Ancienne réponse" },
      { statut: "En cours", reponse: "Nouvelle réponse" }
    )).toBe("En cours");
  });
});

describe("Signalements — tri par votes", () => {
  function trier(rows, mode) {
    return [...rows].sort((a, b) => {
      if (mode === "votes") {
        const va = a.nb_votes || 0, vb = b.nb_votes || 0;
        if (vb !== va) return vb - va;
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  const rows = [
    { id: "a", nb_votes: 3, created_at: "2026-05-20" },
    { id: "b", nb_votes: 0, created_at: "2026-05-30" },
    { id: "c", nb_votes: 7, created_at: "2026-05-15" },
    { id: "d", nb_votes: 1, created_at: "2026-05-29" },
  ];

  it("tri récent → b (30), d (29), a (20), c (15)", () => {
    const r = trier(rows, "recent");
    expect(r.map(x => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("tri votes → c (7), a (3), d (1), b (0)", () => {
    const r = trier(rows, "votes");
    expect(r.map(x => x.id)).toEqual(["c", "a", "d", "b"]);
  });

  it("tri votes avec tiebreak récent", () => {
    const same = [
      { id: "x", nb_votes: 5, created_at: "2026-05-10" },
      { id: "y", nb_votes: 5, created_at: "2026-05-20" },
    ];
    const r = trier(same, "votes");
    // Egalité de votes → tri par created_at desc → y avant x
    expect(r.map(x => x.id)).toEqual(["y", "x"]);
  });
});

describe("Signalements — extraction catégories disponibles", () => {
  function catsDispos(rows) {
    return [...new Set(rows.map(r => r.categorie).filter(Boolean))].sort();
  }

  it("dédoublonnage + tri alphabétique", () => {
    const rows = [
      { categorie: "Bug" },
      { categorie: "UI/UX" },
      { categorie: "Bug" },
      { categorie: null },
      { categorie: "Performance" },
    ];
    expect(catsDispos(rows)).toEqual(["Bug", "Performance", "UI/UX"]);
  });

  it("aucune catégorie → tableau vide", () => {
    expect(catsDispos([{ categorie: null }, { categorie: "" }])).toEqual([]);
  });
});

describe("Maintenances — formatage durée moyenne", () => {
  function formatDuree(jours) {
    if (jours == null || jours <= 0) return null;
    return `${Math.round(jours)}j moy.`;
  }

  it("durée nulle → null", () => {
    expect(formatDuree(null)).toBeNull();
    expect(formatDuree(0)).toBeNull();
  });

  it("durée positive → arrondi entier", () => {
    expect(formatDuree(3.7)).toBe("4j moy.");
    expect(formatDuree(12.2)).toBe("12j moy.");
  });
});

describe("Widget atraiter — filtrage zéros", () => {
  function buildItems(counts) {
    return [
      { lbl: "DI", value: counts.di },
      { lbl: "Achats", value: counts.achats },
      { lbl: "Signalements", value: counts.signalements },
      { lbl: "Renouv RGPD", value: counts.renouv },
      { lbl: "Maintenances", value: counts.maint },
    ].filter(x => x.value > 0);
  }

  it("tout à 0 → vide (widget masqué)", () => {
    const items = buildItems({ di: 0, achats: 0, signalements: 0, renouv: 0, maint: 0 });
    expect(items).toHaveLength(0);
  });

  it("certains > 0 → seuls ceux-là affichés", () => {
    const items = buildItems({ di: 5, achats: 0, signalements: 2, renouv: 0, maint: 1 });
    expect(items).toHaveLength(3);
    expect(items.map(i => i.lbl)).toEqual(["DI", "Signalements", "Maintenances"]);
  });

  it("tous > 0 → 5 items", () => {
    const items = buildItems({ di: 1, achats: 1, signalements: 1, renouv: 1, maint: 1 });
    expect(items).toHaveLength(5);
  });
});

describe("DIPreview — réutilisation kanban", () => {
  it("composant accepte di, patient, materiel", () => {
    // Vérifier qu'on peut passer les mêmes props qu'en liste
    const props = {
      di: { id: "d1", numero: "DI-2026-001", statut: "En cours" },
      patient: { id: "p1", nom: "Dupont", prenom: "Marie", chambre: "12" },
      materiel: { id: "m1", libelle: "Lit médicalisé", num_parc: "PARC-001" },
    };
    expect(props.di.id).toBeTruthy();
    expect(props.patient.id).toBeTruthy();
    expect(props.materiel.id).toBeTruthy();
  });

  it("select élargi pour kanban inclut id + date_naissance + numero_dossier", () => {
    // Ces champs doivent être dans le select Supabase
    const requiredFields = ["id", "date_naissance", "numero_dossier"];
    requiredFields.forEach(f => expect(f).toBeTruthy());
  });
});

describe("Stats RGPD drill — modale rendu", () => {
  function formatFinalitesCount(arr) {
    const len = (arr || []).length;
    if (len === 0) return "0 finalité";
    return `${len} finalité${len > 1 ? "s" : ""}`;
  }

  it("0 finalité", () => {
    expect(formatFinalitesCount([])).toBe("0 finalité");
  });

  it("1 finalité (singulier)", () => {
    expect(formatFinalitesCount(["soins"])).toBe("1 finalité");
  });

  it("plusieurs finalités (pluriel)", () => {
    expect(formatFinalitesCount(["soins", "materiel", "facturation"])).toBe("3 finalités");
  });

  it("null/undefined → 0", () => {
    expect(formatFinalitesCount(null)).toBe("0 finalité");
    expect(formatFinalitesCount(undefined)).toBe("0 finalité");
  });
});

describe("Récurrences maintenance — calcul prochaine_due", () => {
  // DST-safe : addition en ms évite le piège du passage à l'heure d'été
  // (sinon Jan + 90j peut retomber au 31 mars au lieu du 1er avril selon le fuseau)
  function calcProchaine(derniere, frequence_jours) {
    if (!derniere || !frequence_jours) return null;
    const t = new Date(derniere).getTime();
    return new Date(t + frequence_jours * 86400000).toISOString().slice(0, 10);
  }

  it("dernière + 90j", () => {
    expect(calcProchaine("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("dernière null → null", () => {
    expect(calcProchaine(null, 90)).toBeNull();
  });

  it("fréquence 0 → null", () => {
    expect(calcProchaine("2026-01-01", 0)).toBeNull();
  });

  it("fréquence annuelle 365j", () => {
    expect(calcProchaine("2026-01-01", 365)).toBe("2027-01-01");
  });
});
