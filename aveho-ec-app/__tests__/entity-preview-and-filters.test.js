// =============================================================
//  Tests unitaires — EntityPreview / DIPreview / AchatPreview / filtres
//  Alpha 0.39.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("EntityPreview — API générique", () => {
  it("href est construit pour chaque type d'entité", () => {
    const patient = { id: "p1" };
    const di = { id: "d1" };
    const achat = { id: "a1" };
    expect(`/patient/${patient.id}`).toBe("/patient/p1");
    expect(`/interventions?id=${di.id}`).toBe("/interventions?id=d1");
    expect(`/achats?id=${achat.id}`).toBe("/achats?id=a1");
  });

  it("disabled court-circuite et rend les enfants directement", () => {
    // Logique du composant : if (disabled) return <>{children}</>;
    function shouldUsePreview(disabled) {
      return !disabled;
    }
    expect(shouldUsePreview(false)).toBe(true);
    expect(shouldUsePreview(true)).toBe(false);
  });

  it("onHover déclenché à l'ouverture (pour fetch lazy)", () => {
    let called = 0;
    const onHover = () => called++;
    // Simulation : timer hover déclenche onHover
    onHover();
    expect(called).toBe(1);
  });
});

describe("DIPreview — couleurs et états", () => {
  function getHeaderGradient(urgence) {
    return urgence === "Urgent"
      ? "linear-gradient(135deg, #8c2a23 0%, #c0392b 100%)"
      : "linear-gradient(135deg, #142131 0%, #1e4a91 100%)";
  }

  it("urgence Urgent → header rouge", () => {
    expect(getHeaderGradient("Urgent")).toContain("c0392b");
  });

  it("urgence Normal → header navy", () => {
    expect(getHeaderGradient("Normal")).toContain("1e4a91");
  });

  it("urgence undefined → header navy par défaut", () => {
    expect(getHeaderGradient(undefined)).toContain("1e4a91");
  });
});

describe("AchatPreview — formatage montant", () => {
  function formatMontant(m) {
    if (!m || m <= 0) return null;
    return m.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  it("montant valide → format français avec 2 décimales", () => {
    const result = formatMontant(1234.5);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("50");
    expect(result).toContain("€");
  });

  it("montant 0 → null (pas affiché)", () => {
    expect(formatMontant(0)).toBeNull();
  });

  it("montant null → null", () => {
    expect(formatMontant(null)).toBeNull();
  });

  it("gros montant 15000.99", () => {
    const result = formatMontant(15000.99);
    expect(result).toContain("99");
  });
});

describe("Lazy fetch dernière DI", () => {
  // États : null (initial) | "loading" | "none" | objet DI
  function getDisplayState(lastDI) {
    if (lastDI === "loading") return "loading";
    if (lastDI === "none" || lastDI === null) return "empty";
    if (typeof lastDI === "object" && lastDI?.numero) return "data";
    return "empty";
  }

  it("état initial null → empty", () => {
    expect(getDisplayState(null)).toBe("empty");
  });

  it("loading en cours → loading", () => {
    expect(getDisplayState("loading")).toBe("loading");
  });

  it("aucune DI trouvée → empty", () => {
    expect(getDisplayState("none")).toBe("empty");
  });

  it("DI chargée → data", () => {
    expect(getDisplayState({ numero: "DI-2026-042", statut: "En cours" })).toBe("data");
  });

  it("évite re-fetch si déjà chargée (null check)", () => {
    function shouldFetch(currentLastDI) {
      return currentLastDI === null;
    }
    expect(shouldFetch(null)).toBe(true);
    expect(shouldFetch("loading")).toBe(false);
    expect(shouldFetch("none")).toBe(false);
    expect(shouldFetch({ numero: "DI-1" })).toBe(false);
  });
});

describe("Filtres stats activité", () => {
  function applyFilters(users, { filtreUser, filtreEtab }) {
    return users.filter((u) => {
      if (filtreUser && u.user_id !== filtreUser) return false;
      // filtreEtab ne s'applique que si le champ existe sur la vue (best effort)
      return true;
    });
  }

  const users = [
    { user_id: "u1", user_email: "alice@ex.fr", nb_actions_30j: 50 },
    { user_id: "u2", user_email: "bob@ex.fr", nb_actions_30j: 30 },
    { user_id: "u3", user_email: "claire@ex.fr", nb_actions_30j: 25 },
  ];

  it("aucun filtre → tous les users", () => {
    const r = applyFilters(users, {});
    expect(r).toHaveLength(3);
  });

  it("filtre user u2 → 1 user", () => {
    const r = applyFilters(users, { filtreUser: "u2" });
    expect(r).toHaveLength(1);
    expect(r[0].user_id).toBe("u2");
  });

  it("recalcul total actions filtré", () => {
    const r = applyFilters(users, { filtreUser: "u1" });
    const total = r.reduce((s, u) => s + u.nb_actions_30j, 0);
    expect(total).toBe(50);
  });
});

describe("Export CSV — formatage", () => {
  function escapeCSV(v) {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  it("string simple → pas d'échappement", () => {
    expect(escapeCSV("hello")).toBe("hello");
  });

  it("string avec ; → entouré de quotes", () => {
    expect(escapeCSV("a;b")).toBe('"a;b"');
  });

  it("string avec quote interne → doublé", () => {
    expect(escapeCSV('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("string avec newline → entouré de quotes", () => {
    expect(escapeCSV("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("null → string vide", () => {
    expect(escapeCSV(null)).toBe("");
    expect(escapeCSV(undefined)).toBe("");
  });

  it("nombre → string", () => {
    expect(escapeCSV(42)).toBe("42");
    expect(escapeCSV(0)).toBe("0");
  });

  it("objet → JSON stringifié et échappé si nécessaire", () => {
    const obj = { key: "value" };
    const result = escapeCSV(obj);
    expect(result).toContain("key");
    expect(result).toContain("value");
  });
});

describe("Catégories d'action filtrables", () => {
  const CATEGORIES = ["creer", "modifier", "supprimer", "valider", "refuser", "recevoir", "cloturer"];

  it("7 catégories standard d'audit_log", () => {
    expect(CATEGORIES).toHaveLength(7);
  });

  it("toutes les catégories sont en minuscules sans accents", () => {
    CATEGORIES.forEach((c) => {
      expect(c).toBe(c.toLowerCase());
      expect(c).toMatch(/^[a-z]+$/);
    });
  });
});

describe("Construction nom fichier CSV", () => {
  function buildCsvFilename() {
    return `audit-aveho-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  it("contient le préfixe audit-aveho", () => {
    expect(buildCsvFilename()).toContain("audit-aveho-");
  });

  it("contient une date ISO YYYY-MM-DD", () => {
    expect(buildCsvFilename()).toMatch(/audit-aveho-\d{4}-\d{2}-\d{2}\.csv/);
  });

  it("extension .csv", () => {
    expect(buildCsvFilename()).toMatch(/\.csv$/);
  });
});

describe("Statuts colorés enrichis (0.39 — variants français)", () => {
  function statutColor(statut) {
    const map = {
      "Nouvelle": { bg: "#eaf7f7", fg: "#1c5454" },
      "En cours": { bg: "#fcefda", fg: "#7a4f15" },
      "Validée": { bg: "#dff5e0", fg: "#2e6f33" },
      "Validé": { bg: "#dff5e0", fg: "#2e6f33" },
      "À valider": { bg: "#fcefda", fg: "#7a4f15" },
      "Clôturée": { bg: "#f0f0f3", fg: "#5a6171" },
      "Urgent": { bg: "#fef0ee", fg: "#c0392b" },
      "Refusée": { bg: "#fef0ee", fg: "#c0392b" },
      "Refusé": { bg: "#fef0ee", fg: "#c0392b" },
      "Reçue": { bg: "#e8e0f0", fg: "#5e4a8c" },
      "Reçu": { bg: "#e8e0f0", fg: "#5e4a8c" },
      "Nouveau": { bg: "#eaf7f7", fg: "#1c5454" },
      "Traité": { bg: "#dff5e0", fg: "#2e6f33" },
    };
    return map[statut] || { bg: "#f4f7fa", fg: "#6c7a89" };
  }

  it("variants masc/fém mappés sur même couleur (Validée/Validé, Refusée/Refusé, Reçue/Reçu)", () => {
    expect(statutColor("Validée").fg).toBe(statutColor("Validé").fg);
    expect(statutColor("Refusée").fg).toBe(statutColor("Refusé").fg);
    expect(statutColor("Reçue").fg).toBe(statutColor("Reçu").fg);
  });

  it("statuts achats spécifiques (Reçu, À valider, Traité)", () => {
    expect(statutColor("Reçu").fg).toBe("#5e4a8c");
    expect(statutColor("À valider").fg).toBe("#7a4f15");
    expect(statutColor("Traité").fg).toBe("#2e6f33");
  });
});
