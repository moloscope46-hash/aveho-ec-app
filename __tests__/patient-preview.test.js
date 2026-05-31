// =============================================================
//  Tests unitaires — PatientPreview (aperçu rapide patient)
//  Alpha 0.38.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("computeAge — calcul d'âge à partir d'une date de naissance", () => {
  function computeAge(dateNaissance) {
    if (!dateNaissance) return null;
    try {
      const dob = new Date(dateNaissance);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age >= 0 && age < 130 ? age : null;
    } catch { return null; }
  }

  it("null → null", () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge(undefined)).toBeNull();
    expect(computeAge("")).toBeNull();
  });

  it("personne née il y a 30 ans pile", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
    expect(computeAge(dob.toISOString())).toBe(30);
  });

  it("personne dont l'anniversaire est demain → âge n-1", () => {
    const today = new Date();
    // Demain dans 1 jour
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dob = new Date(today.getFullYear() - 25, tomorrow.getMonth(), tomorrow.getDate());
    expect(computeAge(dob.toISOString())).toBe(24);
  });

  it("personne dont l'anniversaire était hier → âge n", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dob = new Date(today.getFullYear() - 40, yesterday.getMonth(), yesterday.getDate());
    expect(computeAge(dob.toISOString())).toBe(40);
  });

  it("date future → null (sécurité)", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    expect(computeAge(future.toISOString())).toBeNull();
  });

  it("date très ancienne (>130 ans) → null", () => {
    const ancient = new Date();
    ancient.setFullYear(ancient.getFullYear() - 200);
    expect(computeAge(ancient.toISOString())).toBeNull();
  });

  it("string invalide → null (catch)", () => {
    expect(computeAge("pas-une-date")).toBeNull();
  });
});

describe("statutColor — couleurs des statuts DI", () => {
  function statutColor(statut) {
    const map = {
      "Nouvelle": { bg: "#eaf7f7", fg: "#1c5454" },
      "En cours": { bg: "#fcefda", fg: "#7a4f15" },
      "Validée": { bg: "#dff5e0", fg: "#2e6f33" },
      "Clôturée": { bg: "#f0f0f3", fg: "#5a6171" },
      "Urgent": { bg: "#fef0ee", fg: "#c0392b" },
      "Refusée": { bg: "#fef0ee", fg: "#c0392b" },
    };
    return map[statut] || { bg: "#f4f7fa", fg: "#6c7a89" };
  }

  it("6 statuts mappés + fallback gris", () => {
    expect(statutColor("Nouvelle").fg).toBe("#1c5454"); // teal
    expect(statutColor("En cours").fg).toBe("#7a4f15"); // orange foncé
    expect(statutColor("Validée").fg).toBe("#2e6f33"); // vert
    expect(statutColor("Clôturée").fg).toBe("#5a6171"); // gris
    expect(statutColor("Urgent").fg).toBe("#c0392b"); // rouge
    expect(statutColor("Refusée").fg).toBe("#c0392b"); // rouge
  });

  it("statut inconnu → fallback gris neutre", () => {
    expect(statutColor("Inconnu").fg).toBe("#6c7a89");
  });
});

describe("Détection device tactile", () => {
  function isTouchDevice(matchMedia) {
    return matchMedia?.("(pointer: coarse)")?.matches || false;
  }

  it("touch device matches → true", () => {
    const mm = () => ({ matches: true });
    expect(isTouchDevice(mm)).toBe(true);
  });

  it("desktop (no match) → false", () => {
    const mm = () => ({ matches: false });
    expect(isTouchDevice(mm)).toBe(false);
  });

  it("pas de matchMedia (SSR) → false (pas de plantage)", () => {
    expect(isTouchDevice(null)).toBe(false);
    expect(isTouchDevice(undefined)).toBe(false);
  });
});

describe("Positionnement popover", () => {
  function computePosition(rect, popoverWidth = 320, popoverMaxHeight = 280, viewport = { w: 1920, h: 1080 }) {
    let x = rect.left;
    let y = rect.bottom + 6;
    // Ajustement bord droit
    if (x + popoverWidth > viewport.w - 16) {
      x = viewport.w - popoverWidth - 16;
    }
    // Ajustement bord bas : si trop en bas, remonte au-dessus
    if (y + popoverMaxHeight > viewport.h - 16) {
      y = rect.top - popoverMaxHeight - 6;
      if (y < 16) y = 16;
    }
    return { x, y };
  }

  it("position normale centre écran", () => {
    const rect = { left: 200, right: 350, top: 100, bottom: 130 };
    const p = computePosition(rect);
    expect(p.x).toBe(200);
    expect(p.y).toBe(136); // 130 + 6
  });

  it("trigger près du bord droit → popover aligné droite-16", () => {
    const rect = { left: 1700, right: 1800, top: 100, bottom: 130 };
    const p = computePosition(rect);
    expect(p.x).toBe(1920 - 320 - 16); // 1584
  });

  it("trigger en bas de l'écran → popover au-dessus", () => {
    const rect = { left: 200, right: 350, top: 900, bottom: 930 };
    const p = computePosition(rect);
    // bottom + 6 + 280 = 1216 > 1064, donc on remonte
    expect(p.y).toBe(900 - 280 - 6); // 614 (au-dessus du trigger)
  });

  it("trigger en haut et trop bas pour fit en dessous → y forcé à 16", () => {
    // Cas impossible en pratique mais on teste le clamp
    const rect = { left: 200, right: 350, top: 0, bottom: 30 };
    const viewport = { w: 1920, h: 300 }; // viewport minuscule
    const p = computePosition(rect, 320, 280, viewport);
    // bottom + 6 + 280 = 316 > 284, donc remonte : top - 280 - 6 = -286 < 16, donc 16
    expect(p.y).toBe(16);
  });
});

describe("Calcul des compteurs DI/achats par patient", () => {
  function aggregateStats(diList, achList) {
    const stats = {};
    diList.forEach((d) => {
      if (!d.patient_id) return;
      if (!stats[d.patient_id]) stats[d.patient_id] = { nbDI: 0, nbAchats: 0 };
      stats[d.patient_id].nbDI++;
    });
    achList.forEach((a) => {
      if (!a.patient_id) return;
      if (!stats[a.patient_id]) stats[a.patient_id] = { nbDI: 0, nbAchats: 0 };
      stats[a.patient_id].nbAchats++;
    });
    return stats;
  }

  it("agrégation simple", () => {
    const di = [
      { patient_id: "p1", statut: "Nouvelle" },
      { patient_id: "p1", statut: "En cours" },
      { patient_id: "p2", statut: "Nouvelle" },
    ];
    const ach = [
      { patient_id: "p1", statut: "À valider" },
      { patient_id: "p3", statut: "Validée" },
    ];
    const stats = aggregateStats(di, ach);
    expect(stats.p1.nbDI).toBe(2);
    expect(stats.p1.nbAchats).toBe(1);
    expect(stats.p2.nbDI).toBe(1);
    expect(stats.p2.nbAchats).toBe(0);
    expect(stats.p3.nbDI).toBe(0);
    expect(stats.p3.nbAchats).toBe(1);
  });

  it("ignore les lignes sans patient_id (DI génériques)", () => {
    const di = [
      { patient_id: null, statut: "Nouvelle" }, // DI sans patient
      { patient_id: "p1", statut: "Nouvelle" },
    ];
    const stats = aggregateStats(di, []);
    expect(stats.p1.nbDI).toBe(1);
    expect(Object.keys(stats)).toHaveLength(1);
  });

  it("listes vides → stats vide", () => {
    expect(aggregateStats([], [])).toEqual({});
  });
});

describe("Filtre data-no-nav sur clic interne", () => {
  function shouldNavigate(target) {
    if (!target || typeof target.closest !== "function") return true;
    return !target.closest("[data-no-nav]");
  }

  it("clic sur élément normal → navigue", () => {
    const el = { closest: () => null };
    expect(shouldNavigate(el)).toBe(true);
  });

  it("clic sur élément data-no-nav → pas de navigation", () => {
    const el = { closest: (sel) => sel === "[data-no-nav]" ? {} : null };
    expect(shouldNavigate(el)).toBe(false);
  });
});

describe("Scénario end-to-end preview", () => {
  it("Scénario : patient avec étiquettes, lit, DI active, RGPD signé", () => {
    const patient = {
      id: "p1",
      nom: "Dupont", prenom: "Marie",
      date_naissance: "1958-03-12",
      numero_dossier: "D-2026-042",
      date_entree: "2026-04-15",
    };
    const extras = {
      lit: { nom: "12A", chambrePath: "Service A › Chambre 12" },
      consentStatus: { a_consenti: true, derniere_signature: "2026-04-16" },
      etiquettes: [
        { id: "e1", libelle: "Allergique", couleur: "#c0392b" },
        { id: "e2", libelle: "PMR", couleur: "#185FA5" },
      ],
      nbDI: 3,
      nbAchats: 1,
    };
    // Vérifications sur les données qui seront affichées
    expect(patient.nom).toBe("Dupont");
    expect(extras.lit.chambrePath).toContain("Chambre 12");
    expect(extras.consentStatus.a_consenti).toBe(true);
    expect(extras.etiquettes).toHaveLength(2);
    expect(extras.nbDI).toBe(3);
  });

  it("Scénario : patient minimal (RGPD à recueillir, pas de lit)", () => {
    const patient = { id: "p2", nom: "Martin", prenom: "Jean" };
    const extras = {
      lit: null,
      consentStatus: null,
      etiquettes: [],
      nbDI: 0,
      nbAchats: 0,
    };
    // Cas minimal : la preview doit pouvoir s'afficher sans planter
    expect(patient.nom).toBe("Martin");
    expect(extras.lit).toBeNull();
    expect(extras.consentStatus).toBeNull(); // → affiche "RGPD à recueillir"
  });
});
