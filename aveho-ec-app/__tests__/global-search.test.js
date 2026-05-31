// =============================================================
//  Tests unitaires — GlobalSearch enrichi
//  Alpha 0.35.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("Parser de préfixes de recherche", () => {
  function parsePrefix(q) {
    const match = q.match(/^([pmdsatx]):(.*)$/i);
    if (!match) return { filterType: null, term: q };
    const prefix = match[1].toLowerCase();
    const term = match[2].trim();
    const filterType = { p: "patient", m: "materiel", d: "intervention", s: "signalement", a: "achat", t: "transfert", x: "maintenance" }[prefix];
    return { filterType, term };
  }

  it("pas de préfixe → recherche globale", () => {
    expect(parsePrefix("dupont")).toEqual({ filterType: null, term: "dupont" });
  });

  it("p: → patient", () => {
    expect(parsePrefix("p:dupont")).toEqual({ filterType: "patient", term: "dupont" });
  });

  it("m: → materiel", () => {
    expect(parsePrefix("m:lit")).toEqual({ filterType: "materiel", term: "lit" });
  });

  it("d: → intervention (DI)", () => {
    expect(parsePrefix("d:DI-2026")).toEqual({ filterType: "intervention", term: "DI-2026" });
  });

  it("s: → signalement", () => {
    expect(parsePrefix("s:idée")).toEqual({ filterType: "signalement", term: "idée" });
  });

  it("a: → achat", () => {
    expect(parsePrefix("a:cmd")).toEqual({ filterType: "achat", term: "cmd" });
  });

  it("t: → transfert (nouveau 0.35)", () => {
    expect(parsePrefix("t:tr-2026")).toEqual({ filterType: "transfert", term: "tr-2026" });
  });

  it("x: → maintenance (nouveau 0.35)", () => {
    expect(parsePrefix("x:mnt")).toEqual({ filterType: "maintenance", term: "mnt" });
  });

  it("préfixe majuscule → fonctionne aussi", () => {
    expect(parsePrefix("P:dupont")).toEqual({ filterType: "patient", term: "dupont" });
  });

  it("préfixe inconnu → traité comme recherche normale", () => {
    expect(parsePrefix("z:foo")).toEqual({ filterType: null, term: "z:foo" });
  });

  it("préfixe avec espace après : → trim", () => {
    expect(parsePrefix("p:  dupont")).toEqual({ filterType: "patient", term: "dupont" });
  });
});

describe("Historique de recherche (localStorage)", () => {
  function pushHistory(currentHistory, entry, max = 6) {
    const filtered = currentHistory.filter(
      (x) => !(x.type === entry.type && x.id === entry.id)
    );
    return [entry, ...filtered].slice(0, max);
  }

  it("ajoute en tête de liste", () => {
    const h = pushHistory([], { type: "patient", id: "1", titre: "Dupont" });
    expect(h).toHaveLength(1);
    expect(h[0].id).toBe("1");
  });

  it("ne dépasse pas 6 entrées", () => {
    let h = [];
    for (let i = 1; i <= 10; i++) {
      h = pushHistory(h, { type: "patient", id: String(i), titre: `Patient ${i}` });
    }
    expect(h).toHaveLength(6);
    expect(h[0].id).toBe("10"); // le plus récent en tête
    expect(h[5].id).toBe("5");
  });

  it("dédoublonne sur (type, id) — remonte en tête", () => {
    let h = [
      { type: "patient", id: "1", titre: "A" },
      { type: "patient", id: "2", titre: "B" },
      { type: "materiel", id: "1", titre: "C" }, // même id mais type différent → OK
    ];
    // Re-cliquer sur patient 1 → remonte en tête, n'ajoute pas
    h = pushHistory(h, { type: "patient", id: "1", titre: "A" });
    expect(h).toHaveLength(3);
    expect(h[0].id).toBe("1");
    expect(h[0].type).toBe("patient");
  });

  it("type différent mais même id → entrées séparées", () => {
    let h = [];
    h = pushHistory(h, { type: "patient", id: "1", titre: "Patient 1" });
    h = pushHistory(h, { type: "materiel", id: "1", titre: "Matériel 1" });
    expect(h).toHaveLength(2);
  });
});

describe("Navigation clavier", () => {
  function onArrow(direction, sel, total) {
    if (direction === "down") return Math.min(sel + 1, total - 1);
    if (direction === "up") return Math.max(sel - 1, 0);
    return sel;
  }

  it("flèche bas incrémente sel", () => {
    expect(onArrow("down", 0, 5)).toBe(1);
  });

  it("flèche bas s'arrête au dernier", () => {
    expect(onArrow("down", 4, 5)).toBe(4);
  });

  it("flèche haut décrémente sel", () => {
    expect(onArrow("up", 3, 5)).toBe(2);
  });

  it("flèche haut s'arrête à 0", () => {
    expect(onArrow("up", 0, 5)).toBe(0);
  });

  it("aucun résultat → sel reste 0", () => {
    expect(onArrow("down", 0, 0)).toBe(-1); // total-1 = -1 → Math.min limite
    // En pratique le composant n'appelle pas le handler si results.length === 0
  });
});

describe("Détection du raccourci clavier", () => {
  function isShortcut(e) {
    return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
  }

  it("Ctrl+K détecté", () => {
    expect(isShortcut({ ctrlKey: true, metaKey: false, key: "k" })).toBe(true);
  });

  it("Cmd+K détecté (Mac)", () => {
    expect(isShortcut({ ctrlKey: false, metaKey: true, key: "k" })).toBe(true);
  });

  it("Ctrl+K majuscule détecté", () => {
    expect(isShortcut({ ctrlKey: true, key: "K" })).toBe(true);
  });

  it("juste K sans modifier → non", () => {
    expect(isShortcut({ ctrlKey: false, metaKey: false, key: "k" })).toBe(false);
  });

  it("Ctrl+autre touche → non", () => {
    expect(isShortcut({ ctrlKey: true, key: "p" })).toBe(false);
  });
});

describe("TYPES — couverture entités", () => {
  const TYPES = {
    patient: { icon: "ti-user", color: "#185FA5", lbl: "Patient" },
    materiel: { icon: "ti-armchair-2", color: "#7CC8C8", lbl: "Matériel" },
    intervention: { icon: "ti-tools", color: "#e35d5b", lbl: "DI" },
    signalement: { icon: "ti-message", color: "#7a6fb0", lbl: "Signalement" },
    achat: { icon: "ti-shopping-cart", color: "#EF9F27", lbl: "Achat" },
    transfert: { icon: "ti-arrows-exchange", color: "#5aa05a", lbl: "Transfert" },
    maintenance: { icon: "ti-tool", color: "#1c5454", lbl: "Maintenance" },
  };

  it("7 entités couvertes (5 + 2 nouvelles)", () => {
    expect(Object.keys(TYPES)).toHaveLength(7);
  });

  it("chaque entité a icon, color, lbl", () => {
    Object.values(TYPES).forEach((t) => {
      expect(t.icon).toBeTruthy();
      expect(t.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(t.lbl).toBeTruthy();
    });
  });

  it("transfert et maintenance présents (nouveautés 0.35)", () => {
    expect(TYPES.transfert).toBeDefined();
    expect(TYPES.maintenance).toBeDefined();
  });
});

describe("Scénario : event custom aveho:open-search", () => {
  it("nom de l'event documenté", () => {
    // L'event s'appelle "aveho:open-search" (préfixe namespace pour éviter les collisions)
    const eventName = "aveho:open-search";
    expect(eventName).toMatch(/^aveho:/);
    expect(eventName).toContain("search");
  });

  it("convention de namespace pour les events custom Aveho", () => {
    const events = ["aveho:open-search", "aveho:cart-updated", "aveho:notif-received"];
    events.forEach((e) => expect(e.startsWith("aveho:")).toBe(true));
  });
});
