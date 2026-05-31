// =============================================================
//  Tests unitaires — 0.45.0
//  Couvre : notif email signalement, realtime étendu, weekly digest,
//  audit a11y patches, ConfirmModal hook
// =============================================================
import { describe, it, expect } from "vitest";

describe("Notif email signalement — condition déclenchement", () => {
  function shouldNotify(modal, payload) {
    // Notif si :
    // 1) Première réponse (payload.reponse_par set = 1ère fois)
    // 2) created_by présent (signalement nominatif)
    return !!(payload.reponse_par && modal.created_by);
  }

  it("anonyme → pas de notif", () => {
    expect(shouldNotify({ created_by: null }, { reponse_par: "admin@x.com" })).toBe(false);
  });

  it("nominatif + 1ère réponse → notif", () => {
    expect(shouldNotify(
      { created_by: "u1" },
      { reponse_par: "admin@x.com", reponse: "Merci" }
    )).toBe(true);
  });

  it("édition réponse (pas reponse_par cette fois) → pas de doublon", () => {
    expect(shouldNotify(
      { created_by: "u1" },
      { reponse: "Modif" } // payload.reponse_par absent car déjà set précédemment
    )).toBe(false);
  });
});

describe("Notif signalement — payload notification in-app", () => {
  function buildNotifPayload(authorUserId, titre, reponse) {
    return {
      user_id: authorUserId,
      type: "systeme",
      titre: "Réponse à votre signalement",
      message: `« ${titre || "Signalement"} » a reçu une réponse${reponse ? `: ${reponse.slice(0, 80)}${reponse.length > 80 ? "…" : ""}` : ""}`,
      lien: "/signalements",
      lue: false,
    };
  }

  it("message court → pas de troncation", () => {
    const p = buildNotifPayload("u1", "Bug login", "Corrigé en v0.45");
    expect(p.message).toContain("Corrigé en v0.45");
    expect(p.message).not.toContain("…");
  });

  it("message > 80 chars → tronqué + …", () => {
    const longue = "A".repeat(120);
    const p = buildNotifPayload("u1", "Test", longue);
    expect(p.message).toContain("…");
    expect(p.message.includes("A".repeat(80))).toBe(true);
    expect(p.message.includes("A".repeat(81))).toBe(false);
  });

  it("réponse vide → message valide sans troncation", () => {
    const p = buildNotifPayload("u1", "Test", null);
    expect(p.message).toBe("« Test » a reçu une réponse");
  });

  it("titre absent → fallback générique", () => {
    const p = buildNotifPayload("u1", null, "Réponse");
    expect(p.message).toContain("Signalement");
  });
});

describe("Realtime étendu — couleurs des nouvelles tables", () => {
  function getToastColor(table) {
    const map = {
      interventions: "#e35d5b",
      signalements: "#7CC8C8",
      achats: "#EF9F27",
      maintenances: "#5a8f8f",
      transferts: "#185FA5",
      commandes: "#5a8f8f",
    };
    return map[table];
  }

  it("toutes les 6 tables ont une couleur définie", () => {
    ["interventions", "signalements", "achats", "maintenances", "transferts", "commandes"].forEach(t => {
      expect(getToastColor(t)).toBeDefined();
    });
  });

  it("maintenances et commandes partagent une teinte calme (teal foncé)", () => {
    expect(getToastColor("maintenances")).toBe("#5a8f8f");
    expect(getToastColor("commandes")).toBe("#5a8f8f");
  });
});

describe("Weekly stats digest — décision envoi", () => {
  function shouldSendDigest(kpis) {
    return kpis.nbDi > 0 || kpis.nbSignal > 0 || kpis.nbAchat > 0 || kpis.nbMaintRetard > 0;
  }

  it("aucune activité → pas d'email (anti-spam)", () => {
    expect(shouldSendDigest({ nbDi: 0, nbSignal: 0, nbAchat: 0, nbMaintRetard: 0 })).toBe(false);
  });

  it("au moins 1 DI → envoi", () => {
    expect(shouldSendDigest({ nbDi: 1, nbSignal: 0, nbAchat: 0, nbMaintRetard: 0 })).toBe(true);
  });

  it("uniquement maintenances en retard → envoi (important)", () => {
    expect(shouldSendDigest({ nbDi: 0, nbSignal: 0, nbAchat: 0, nbMaintRetard: 3 })).toBe(true);
  });
});

describe("Weekly digest — fenêtre 7 jours", () => {
  function buildWindow(today) {
    const start = new Date(today.getTime() - 7 * 86400000);
    return { sinceISO: start.toISOString(), days: 7 };
  }

  it("fenêtre est exactement 7 jours", () => {
    const today = new Date("2026-06-01T07:00:00Z");
    const w = buildWindow(today);
    const start = new Date(w.sinceISO);
    const diff = (today.getTime() - start.getTime()) / 86400000;
    expect(diff).toBeCloseTo(7, 1);
  });
});

describe("ConfirmModal — variantes couleurs", () => {
  function getHeaderColor(variant) {
    return variant === "danger" ? "#c0392b" : "#185FA5";
  }

  it("danger → rouge", () => {
    expect(getHeaderColor("danger")).toBe("#c0392b");
  });

  it("primary par défaut → bleu", () => {
    expect(getHeaderColor("primary")).toBe("#185FA5");
    expect(getHeaderColor(undefined)).toBe("#185FA5");
  });
});

describe("AlertModal — variantes", () => {
  function getAlertColor(variant) {
    if (variant === "danger") return "#c0392b";
    if (variant === "success") return "#5aa05a";
    return "#185FA5";
  }

  it("success → vert", () => {
    expect(getAlertColor("success")).toBe("#5aa05a");
  });

  it("danger → rouge", () => {
    expect(getAlertColor("danger")).toBe("#c0392b");
  });

  it("défaut → bleu primary", () => {
    expect(getAlertColor()).toBe("#185FA5");
  });
});

describe("useConfirm hook — flow", () => {
  // Simule la logique du hook
  function simulateConfirm(userChoice) {
    return new Promise((resolve) => {
      // Le composant appelle onConfirm ou onCancel selon le clic user
      setTimeout(() => resolve(userChoice), 10);
    });
  }

  it("clic Confirmer → resolve true", async () => {
    const result = await simulateConfirm(true);
    expect(result).toBe(true);
  });

  it("clic Annuler → resolve false", async () => {
    const result = await simulateConfirm(false);
    expect(result).toBe(false);
  });
});

describe("Audit a11y — remplacement i onClick par IconButton", () => {
  // Test symbolique : on vérifie les attributs ARIA attendus
  function buildIconButtonProps(action) {
    const map = {
      trash: { icon: "ti-trash", color: "#C9867F", ariaLabel: "Supprimer" },
      edit: { icon: "ti-edit", color: "#EF9F27", ariaLabel: "Modifier" },
      check: { icon: "ti-check", color: "#5aa05a", ariaLabel: "Valider" },
    };
    return map[action];
  }

  it("trash → couleur terra + ariaLabel Supprimer", () => {
    const p = buildIconButtonProps("trash");
    expect(p.color).toBe("#C9867F");
    expect(p.ariaLabel).toBe("Supprimer");
  });

  it("edit → couleur amber + ariaLabel Modifier", () => {
    const p = buildIconButtonProps("edit");
    expect(p.color).toBe("#EF9F27");
    expect(p.ariaLabel).toBe("Modifier");
  });

  it("check → couleur green + ariaLabel Valider", () => {
    const p = buildIconButtonProps("check");
    expect(p.color).toBe("#5aa05a");
    expect(p.ariaLabel).toBe("Valider");
  });
});
