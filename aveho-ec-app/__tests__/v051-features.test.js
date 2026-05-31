// =============================================================
//  Tests unitaires — 0.51.0
//  Couvre : stats annonces, recherche audit, statut système,
//  validations en attente, migration confirm()
// =============================================================
import { describe, it, expect } from "vitest";

describe("AZ - Stats annonces - calcul taux dismiss", () => {
  function tauxDismiss(nbDismisses, nbDestinataires) {
    if (nbDestinataires === 0) return 0;
    return Math.round(100 * (nbDismisses / nbDestinataires) * 10) / 10;
  }
  
  it("0 destinataires → 0%", () => {
    expect(tauxDismiss(5, 0)).toBe(0);
  });
  it("50% pile", () => {
    expect(tauxDismiss(10, 20)).toBe(50);
  });
  it("1 décimale conservée", () => {
    expect(tauxDismiss(1, 3)).toBe(33.3);
  });
  it("100%", () => {
    expect(tauxDismiss(20, 20)).toBe(100);
  });
});

describe("AZ - Couleurs barre de progression dismiss", () => {
  function progressColor(taux) {
    if (taux > 50) return "#5aa05a";  // vert = bonne lecture (beaucoup ont dismissé après lecture)
    if (taux > 25) return "#EF9F27";  // orange = moyen
    return "#185FA5";  // bleu = peu de lecture
  }
  
  it("< 25% → bleu", () => {
    expect(progressColor(10)).toBe("#185FA5");
    expect(progressColor(25)).toBe("#185FA5");
  });
  it("entre 25 et 50% → orange", () => {
    expect(progressColor(40)).toBe("#EF9F27");
  });
  it("> 50% → vert", () => {
    expect(progressColor(70)).toBe("#5aa05a");
  });
});

describe("AQ - Statut système - agrégation overall", () => {
  function aggregateStatus(services) {
    if (services.some(s => s.status === "down")) return "down";
    if (services.some(s => s.status === "degraded")) return "degraded";
    if (services.every(s => s.status === "operational")) return "operational";
    return "checking";
  }
  
  it("tous OK → operational", () => {
    expect(aggregateStatus([
      { status: "operational" }, { status: "operational" }
    ])).toBe("operational");
  });
  it("un seul down → overall down (priorité au pire)", () => {
    expect(aggregateStatus([
      { status: "operational" }, { status: "down" }
    ])).toBe("down");
  });
  it("dégradé mais pas down → degraded", () => {
    expect(aggregateStatus([
      { status: "operational" }, { status: "degraded" }
    ])).toBe("degraded");
  });
  it("vide → operational (every() sur [] = true par défaut)", () => {
    expect(aggregateStatus([])).toBe("operational");
  });
});

describe("AQ - Mapping label + couleur statut", () => {
  function statusLabel(s) {
    return s === "operational" ? "Opérationnel" : s === "degraded" ? "Dégradé" : s === "checking" ? "Vérification…" : "Hors service";
  }
  
  it("operational → 'Opérationnel'", () => {
    expect(statusLabel("operational")).toBe("Opérationnel");
  });
  it("degraded → 'Dégradé'", () => {
    expect(statusLabel("degraded")).toBe("Dégradé");
  });
  it("down → 'Hors service'", () => {
    expect(statusLabel("down")).toBe("Hors service");
  });
});

describe("BA - Recherche audit étendue", () => {
  function buildOrClause(filtre) {
    if (!filtre) return null;
    return `user_email.ilike.%${filtre}%,entite_id.ilike.%${filtre}%,details::text.ilike.%${filtre}%`;
  }
  
  it("inclut details::text", () => {
    const r = buildOrClause("test");
    expect(r).toContain("details::text.ilike");
  });
  it("inclut user_email + entite_id + details", () => {
    const r = buildOrClause("test");
    expect(r.split(",").length).toBe(3);
  });
  it("filtre vide → null", () => {
    expect(buildOrClause("")).toBeNull();
    expect(buildOrClause(null)).toBeNull();
  });
});

describe("BB - Mes validations en attente - éligibilité", () => {
  function shouldShowValidationItem(achat, currentUserId) {
    // 1ère validation : statut "À valider" → tout manager peut valider
    if (achat.statut === "À valider" || achat.statut === "En attente") return true;
    // 2nde validation : statut "Validée (1/2)" et current user ≠ premier valideur
    if (achat.statut === "Validée (1/2)" && achat.valideur_id !== currentUserId) return true;
    return false;
  }
  
  it("statut 'À valider' → visible", () => {
    expect(shouldShowValidationItem({ statut: "À valider" }, "user-a")).toBe(true);
  });
  it("statut 'Validée (1/2)' par un autre → visible", () => {
    expect(shouldShowValidationItem({ statut: "Validée (1/2)", valideur_id: "user-b" }, "user-a")).toBe(true);
  });
  it("statut 'Validée (1/2)' par soi-même → caché (séparation pouvoirs)", () => {
    expect(shouldShowValidationItem({ statut: "Validée (1/2)", valideur_id: "user-a" }, "user-a")).toBe(false);
  });
  it("statut 'Validée' → caché (déjà finalisé)", () => {
    expect(shouldShowValidationItem({ statut: "Validée" }, "user-a")).toBe(false);
  });
});

describe("BB - Affichage uniquement aux managers", () => {
  function shouldShowWidget(auth) {
    return !!(auth?.can?.("valider_achat") || auth?.role?.nom === "Administrateur");
  }
  
  it("user normal → caché", () => {
    expect(shouldShowWidget({ role: { nom: "Soignant" }, can: () => false })).toBe(false);
  });
  it("admin → visible", () => {
    expect(shouldShowWidget({ role: { nom: "Administrateur" }, can: () => false })).toBe(true);
  });
  it("user avec permission → visible", () => {
    expect(shouldShowWidget({ role: { nom: "Cadre" }, can: (p) => p === "valider_achat" })).toBe(true);
  });
});

describe("AA - Migration confirm() - patterns finaux", () => {
  function isMigrated(text) {
    return /await\s+dialogs\.confirm/.test(text);
  }
  
  it("variable confirmMsg migrée", () => {
    expect(isMigrated('if (!await dialogs.confirm({ title: confirmMsg, variant: "danger" })) return;')).toBe(true);
  });
  it("ancienne forme variable détectée", () => {
    expect(isMigrated('if (!confirm(confirmMsg)) return;')).toBe(false);
  });
});
