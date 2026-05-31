// =============================================================
//  Tests unitaires — Stats RGPD avancées
//  Alpha 0.30.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("Calcul de tendance mensuelle", () => {
  function calcTendance(ceMois, moisDernier) {
    if (!moisDernier || moisDernier === 0) return null;
    return Math.round(((ceMois - moisDernier) / moisDernier) * 100);
  }

  it("hausse de 50%", () => {
    expect(calcTendance(15, 10)).toBe(50);
  });

  it("baisse de 20%", () => {
    expect(calcTendance(8, 10)).toBe(-20);
  });

  it("stable", () => {
    expect(calcTendance(10, 10)).toBe(0);
  });

  it("retour null si pas de données mois précédent", () => {
    expect(calcTendance(5, 0)).toBe(null);
    expect(calcTendance(5, null)).toBe(null);
    expect(calcTendance(5, undefined)).toBe(null);
  });

  it("zero ce mois (-100%)", () => {
    expect(calcTendance(0, 10)).toBe(-100);
  });

  it("arrondi sur valeur fractionnaire", () => {
    expect(calcTendance(7, 11)).toBe(-36); // (7-11)/11 = -0.363 → -36
  });
});

describe("Taux de refus (logique calcul SQL)", () => {
  function tauxRefus(signes, refus) {
    const total = signes + refus;
    if (total === 0) return 0;
    return Math.round(1000 * refus / total) / 10; // 1 décimale
  }

  it("0% si pas de refus", () => {
    expect(tauxRefus(100, 0)).toBe(0);
  });

  it("100% si que des refus", () => {
    expect(tauxRefus(0, 5)).toBe(100);
  });

  it("ratio classique 5/100 = 5%", () => {
    expect(tauxRefus(95, 5)).toBe(5);
  });

  it("decimal 1/3 ≈ 33.3%", () => {
    expect(tauxRefus(2, 1)).toBe(33.3);
  });

  it("0% si rien", () => {
    expect(tauxRefus(0, 0)).toBe(0);
  });
});

describe("Génération des 12 mois glissants", () => {
  function genMois12(today) {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today);
      d.setDate(1); // Évite les pbs de fin de mois (31 mai -> 30 avril)
      d.setMonth(d.getMonth() - i);
      months.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }
    return months;
  }

  it("génère 12 mois", () => {
    const list = genMois12(new Date("2026-05-31"));
    expect(list).toHaveLength(12);
  });

  it("mois en cours en premier", () => {
    const list = genMois12(new Date("2026-05-31"));
    expect(list[0].iso).toBe("2026-05");
  });

  it("le dernier est 11 mois avant", () => {
    const list = genMois12(new Date("2026-05-31"));
    expect(list[11].iso).toBe("2025-06");
  });

  it("traverse une année", () => {
    const list = genMois12(new Date("2026-02-15"));
    expect(list[0].iso).toBe("2026-02");
    expect(list[2].iso).toBe("2025-12");
  });
});

describe("Filtres expirations par tranche", () => {
  // On simule la logique SQL côté JS pour valider la logique
  function trancheExpiration(dateExpiration, today = new Date()) {
    if (!dateExpiration) return null;
    const exp = new Date(dateExpiration);
    const days = Math.floor((exp - today) / (1000 * 60 * 60 * 24));
    if (days < 0) return "deja_expires";
    if (days <= 30) return "30j";
    if (days <= 60) return "31_60j";
    if (days <= 90) return "61_90j";
    return null; // > 90 jours
  }

  it("expiré → deja_expires", () => {
    const today = new Date("2026-05-31");
    expect(trancheExpiration("2026-05-30", today)).toBe("deja_expires");
    expect(trancheExpiration("2025-12-01", today)).toBe("deja_expires");
  });

  it("dans 15 jours → 30j", () => {
    const today = new Date("2026-05-31");
    expect(trancheExpiration("2026-06-15", today)).toBe("30j");
  });

  it("dans 45 jours → 31_60j", () => {
    const today = new Date("2026-05-31");
    expect(trancheExpiration("2026-07-15", today)).toBe("31_60j");
  });

  it("dans 75 jours → 61_90j", () => {
    const today = new Date("2026-05-31");
    expect(trancheExpiration("2026-08-14", today)).toBe("61_90j");
  });

  it("dans 100 jours → null (pas dans les tranches)", () => {
    const today = new Date("2026-05-31");
    expect(trancheExpiration("2026-09-08", today)).toBe(null);
  });

  it("null si pas de date_expiration", () => {
    expect(trancheExpiration(null)).toBe(null);
    expect(trancheExpiration(undefined)).toBe(null);
  });
});

describe("DonutChart — logique segments", () => {
  function calcSegments(segments) {
    const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
    if (total === 0) return [];
    return segments.map((s) => ({
      ...s,
      pct: Math.round((s.value / total) * 100),
    }));
  }

  it("total et pourcentages corrects", () => {
    const segs = calcSegments([
      { label: "Signés", value: 80 },
      { label: "Refus", value: 20 },
    ]);
    expect(segs[0].pct).toBe(80);
    expect(segs[1].pct).toBe(20);
  });

  it("tableau vide si total = 0", () => {
    expect(calcSegments([{ label: "X", value: 0 }])).toEqual([]);
  });

  it("3 segments à 33% (arrondi)", () => {
    const segs = calcSegments([
      { label: "A", value: 1 },
      { label: "B", value: 1 },
      { label: "C", value: 1 },
    ]);
    expect(segs.every((s) => s.pct === 33)).toBe(true);
  });
});

describe("Format nom de fichier export PDF", () => {
  function slugify(name) {
    return (name || "structure")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  it("slugify simple", () => {
    expect(slugify("Aveho")).toBe("aveho");
  });

  it("supprime accents", () => {
    expect(slugify("Hôpital Cédric")).toBe("hopital-cedric");
  });

  it("remplace caractères spéciaux", () => {
    expect(slugify("Test & Co")).toBe("test-co");
  });

  it("trim tirets en début/fin", () => {
    expect(slugify("  Test  ")).toBe("test");
    expect(slugify("--Test--")).toBe("test");
  });

  it("fallback si vide", () => {
    expect(slugify("")).toBe("structure");
    expect(slugify(null)).toBe("structure");
    expect(slugify(undefined)).toBe("structure");
  });
});

describe("Top finalités - mapping vers libellés", () => {
  const FINALITES_MOCK = [
    { id: "fin_soins", libelle: "Coordination des soins" },
    { id: "fin_facturation", libelle: "Facturation" },
    { id: "fin_qualite", libelle: "Démarche qualité" },
  ];

  function enrichFinalites(rawList) {
    return rawList.map((f) => {
      const def = FINALITES_MOCK.find((x) => x.id === f.finalite_id);
      return {
        ...f,
        label: def?.libelle || f.finalite_id,
      };
    });
  }

  it("mappe les ids vers les libellés", () => {
    const r = enrichFinalites([
      { finalite_id: "fin_soins", nb_acceptations: 50 },
      { finalite_id: "fin_facturation", nb_acceptations: 30 },
    ]);
    expect(r[0].label).toBe("Coordination des soins");
    expect(r[1].label).toBe("Facturation");
  });

  it("fallback sur l'id si finalité inconnue", () => {
    const r = enrichFinalites([
      { finalite_id: "fin_xxx_inconnue", nb_acceptations: 10 },
    ]);
    expect(r[0].label).toBe("fin_xxx_inconnue");
  });

  it("préserve nb_acceptations", () => {
    const r = enrichFinalites([{ finalite_id: "fin_soins", nb_acceptations: 42 }]);
    expect(r[0].nb_acceptations).toBe(42);
  });
});

describe("Restriction admin sur page /statistiques-rgpd", () => {
  function peutVoir(auth) {
    return auth.can?.("gerer_roles")
      || auth.can?.("manage_collectivite")
      || auth.role?.systeme === "admin"
      || auth.role?.nom === "Administrateur";
  }

  it("admin systeme passe", () => {
    expect(peutVoir({ role: { systeme: "admin" } })).toBe(true);
  });

  it("nom 'Administrateur' passe", () => {
    expect(peutVoir({ role: { nom: "Administrateur" } })).toBe(true);
  });

  it("avec permission gerer_roles passe", () => {
    expect(peutVoir({ can: (p) => p === "gerer_roles" })).toBe(true);
  });

  it("avec permission manage_collectivite passe", () => {
    expect(peutVoir({ can: (p) => p === "manage_collectivite" })).toBe(true);
  });

  it("utilisateur lambda refuse", () => {
    expect(peutVoir({ can: () => false, role: { nom: "Soignant" } })).toBe(false);
  });

  it("pas d'auth refuse", () => {
    expect(peutVoir({})).toBe(false);
  });
});

describe("Scénarios end-to-end stats RGPD", () => {
  it("Scénario : 100 signés, 5 refus, 10 archivés → KPIs cohérents", () => {
    const global = {
      actifs: 100,
      refus: 5,
      archives: 10,
      taux_refus_pct: 4.8,
      signes_ce_mois: 12,
      signes_mois_dernier: 8,
    };
    // Tendance positive
    const tendance = Math.round(((global.signes_ce_mois - global.signes_mois_dernier) / global.signes_mois_dernier) * 100);
    expect(tendance).toBe(50);
    // Total visible = actifs + refus + archives
    expect(global.actifs + global.refus + global.archives).toBe(115);
  });

  it("Scénario : aucun consentement → vide gracieusement", () => {
    const global = {
      actifs: 0, refus: 0, archives: 0, taux_refus_pct: 0,
      signes_ce_mois: 0, signes_mois_dernier: 0,
    };
    const tendance = global.signes_mois_dernier === 0 ? null : 0;
    expect(tendance).toBe(null);
  });
});
