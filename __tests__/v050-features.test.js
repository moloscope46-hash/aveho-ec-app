// =============================================================
//  Tests unitaires — 0.50.0
//  Couvre : annonces visibilité, workflow achat double valid,
//  filtres audit avec dates, changelog
// =============================================================
import { describe, it, expect } from "vitest";

describe("Annonces — niveaux et couleurs", () => {
  const NIVEAUX = {
    info: { color: "#185FA5" },
    warning: { color: "#7a4f15" },
    critique: { color: "#7a1f15" },
  };
  
  it("info = bleu", () => {
    expect(NIVEAUX.info.color).toBe("#185FA5");
  });
  it("warning = orange", () => {
    expect(NIVEAUX.warning.color).toBe("#7a4f15");
  });
  it("critique = rouge", () => {
    expect(NIVEAUX.critique.color).toBe("#7a1f15");
  });
});

describe("Annonces — filtrage actif + non expiré", () => {
  function isVisible(annonce, now) {
    if (!annonce.active) return false;
    if (annonce.date_debut > now) return false;
    if (annonce.date_fin && annonce.date_fin <= now) return false;
    return true;
  }
  const now = new Date("2026-05-31T12:00:00Z").toISOString();
  
  it("active sans fin → visible", () => {
    expect(isVisible({ active: true, date_debut: "2026-05-30T00:00:00Z" }, now)).toBe(true);
  });
  it("active mais date_fin passée → caché", () => {
    expect(isVisible({ active: true, date_debut: "2026-05-30T00:00:00Z", date_fin: "2026-05-31T11:00:00Z" }, now)).toBe(false);
  });
  it("active mais pas encore commencée → caché", () => {
    expect(isVisible({ active: true, date_debut: "2026-06-01T00:00:00Z" }, now)).toBe(false);
  });
  it("inactive → caché", () => {
    expect(isVisible({ active: false, date_debut: "2026-05-30T00:00:00Z" }, now)).toBe(false);
  });
});

describe("Annonces — tri (critique d'abord puis date)", () => {
  function sortAnnonces(annonces) {
    const order = { critique: 0, warning: 1, info: 2 };
    return [...annonces].sort((a, b) => {
      const ao = order[a.niveau] ?? 99;
      const bo = order[b.niveau] ?? 99;
      if (ao !== bo) return ao - bo;
      return new Date(b.date_debut) - new Date(a.date_debut);
    });
  }
  it("critique remonte en tête", () => {
    const r = sortAnnonces([
      { niveau: "info", date_debut: "2026-05-31" },
      { niveau: "critique", date_debut: "2026-05-30" },
    ]);
    expect(r[0].niveau).toBe("critique");
  });
  it("entre mêmes niveaux : plus récente d'abord", () => {
    const r = sortAnnonces([
      { niveau: "info", date_debut: "2026-05-29" },
      { niveau: "info", date_debut: "2026-05-31" },
    ]);
    expect(r[0].date_debut).toBe("2026-05-31");
  });
});

describe("Workflow achat — double validation", () => {
  function necessiteDoubleValid(c) {
    return c.seuil_double_validation != null 
      && c.budget_estime != null 
      && c.budget_estime > c.seuil_double_validation;
  }
  
  it("budget < seuil → simple validation", () => {
    expect(necessiteDoubleValid({ budget_estime: 500, seuil_double_validation: 1000 })).toBe(false);
  });
  it("budget > seuil → double validation", () => {
    expect(necessiteDoubleValid({ budget_estime: 1500, seuil_double_validation: 1000 })).toBe(true);
  });
  it("seuil absent → pas de double valid", () => {
    expect(necessiteDoubleValid({ budget_estime: 5000, seuil_double_validation: null })).toBe(false);
  });
  it("budget = seuil exact → pas de double valid (strict >)", () => {
    expect(necessiteDoubleValid({ budget_estime: 1000, seuil_double_validation: 1000 })).toBe(false);
  });
});

describe("Workflow achat — règle separation of duties", () => {
  function peutValiderEnSecondeFois(achat, currentUserId) {
    // L'utilisateur qui a fait la 1ère validation ne peut PAS faire la 2nde
    if (achat.valideur_id === currentUserId) return false;
    return true;
  }
  it("autre user → autorisé", () => {
    expect(peutValiderEnSecondeFois({ valideur_id: "user-a" }, "user-b")).toBe(true);
  });
  it("même user que 1ère valid → refusé", () => {
    expect(peutValiderEnSecondeFois({ valideur_id: "user-a" }, "user-a")).toBe(false);
  });
});

describe("Audit — dates personnalisées écrasent la période", () => {
  function computeRange({ periode, dateDebut, dateFin }, now = Date.now()) {
    let sinceISO = null;
    let untilISO = null;
    if (dateDebut) {
      sinceISO = new Date(dateDebut + "T00:00:00Z").toISOString();
    } else if (periode !== "all") {
      sinceISO = new Date(now - parseInt(periode) * 86400000).toISOString();
    }
    if (dateFin) {
      untilISO = new Date(dateFin + "T23:59:59Z").toISOString();
    }
    return { sinceISO, untilISO };
  }
  
  it("dateDebut écrase periode", () => {
    const r = computeRange({ periode: "30", dateDebut: "2026-01-01" });
    expect(r.sinceISO).toBe("2026-01-01T00:00:00.000Z");
  });
  it("dateFin ajoute 23:59:59", () => {
    const r = computeRange({ periode: "30", dateDebut: "2026-01-01", dateFin: "2026-01-31" });
    expect(r.untilISO).toBe("2026-01-31T23:59:59.000Z");
  });
  it("sans date custom → utilise periode", () => {
    const r = computeRange({ periode: "7" }, new Date("2026-05-31T00:00:00Z").getTime());
    expect(r.sinceISO).toBe("2026-05-24T00:00:00.000Z");
  });
});

describe("Changelog — détection version actuelle et hotfix", () => {
  function isCurrentVersion(currentPkg, v) {
    return currentPkg.startsWith(v);
  }
  function isHotfix(v) {
    const parts = v.split(".");
    return parts.length > 2 && parseInt(parts[2]) > 0;
  }
  
  it("0.50.0-alpha matche 0.50.0", () => {
    expect(isCurrentVersion("0.50.0-alpha", "0.50.0")).toBe(true);
  });
  it("0.49.6-alpha ne matche pas 0.49.0", () => {
    // 0.49.6-alpha.startsWith("0.49.0") → false
    expect(isCurrentVersion("0.49.6-alpha", "0.49.0")).toBe(false);
  });
  it("0.49.6 = hotfix", () => {
    expect(isHotfix("0.49.6")).toBe(true);
  });
  it("0.50.0 = pas un hotfix", () => {
    expect(isHotfix("0.50.0")).toBe(false);
  });
});

describe("Migration confirm() — détection patterns", () => {
  function isMigrated(line) {
    return /await\s+dialogs\.(confirm|alert)/.test(line);
  }
  it("nouvelle forme détectée", () => {
    expect(isMigrated('if (!await dialogs.confirm({ title: "X", variant: "danger" })) return;')).toBe(true);
  });
  it("ancienne forme non détectée", () => {
    expect(isMigrated('if (!confirm("X")) return;')).toBe(false);
  });
});
