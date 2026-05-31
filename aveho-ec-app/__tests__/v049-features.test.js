// =============================================================
//  Tests unitaires — 0.49.0
//  Couvre : MultiEtabSummary, BulkActions, NotifCategories, 
//  Onboarding par rôle, migration confirm(), badge version
// =============================================================
import { describe, it, expect } from "vitest";

describe("Badge version — affichage", () => {
  function displayVersion(pkgVersion) {
    return "v" + pkgVersion.replace(/-alpha$/, "");
  }
  it("retire suffixe -alpha", () => {
    expect(displayVersion("0.49.0-alpha")).toBe("v0.49.0");
  });
  it("garde version sans suffixe", () => {
    expect(displayVersion("1.0.0")).toBe("v1.0.0");
  });
  it("garde autre suffixe (beta)", () => {
    expect(displayVersion("0.49.0-beta")).toBe("v0.49.0-beta");
  });
});

describe("MultiEtabSummary — affichage conditionnel", () => {
  function shouldShow(etablissements) {
    return !!(etablissements && etablissements.length >= 2);
  }
  it("0 étab → caché", () => {
    expect(shouldShow([])).toBe(false);
  });
  it("1 étab → caché (pas utile)", () => {
    expect(shouldShow([{ id: "a" }])).toBe(false);
  });
  it("2+ étabs → affiché", () => {
    expect(shouldShow([{ id: "a" }, { id: "b" }])).toBe(true);
  });
  it("null → caché", () => {
    expect(shouldShow(null)).toBe(false);
  });
});

describe("BulkActions — formatage CSV", () => {
  function escapeCSV(v) {
    return `"${String(v ?? "").replace(/"/g, '""')}"`;
  }
  it("escape les guillemets", () => {
    expect(escapeCSV('hello "world"')).toBe('"hello ""world"""');
  });
  it("gère null/undefined", () => {
    expect(escapeCSV(null)).toBe('""');
    expect(escapeCSV(undefined)).toBe('""');
  });
  it("préserve les autres caractères", () => {
    expect(escapeCSV("abc;def")).toBe('"abc;def"');
  });
});

describe("BulkActions — toggle selection", () => {
  function toggle(set, id) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
  it("ajoute si absent", () => {
    expect(toggle(new Set(), "a").has("a")).toBe(true);
  });
  it("retire si présent", () => {
    expect(toggle(new Set(["a"]), "a").has("a")).toBe(false);
  });
});

describe("BulkActions — toggleAll selon état", () => {
  function toggleAll(currentSet, rows) {
    if (rows.length > 0 && rows.every(r => currentSet.has(r.id))) {
      // Toutes cochées → décocher tout
      return new Set();
    }
    // Sinon : cocher toutes
    const next = new Set(currentSet);
    rows.forEach(r => next.add(r.id));
    return next;
  }
  it("aucune cochée → cocher toutes", () => {
    const r = toggleAll(new Set(), [{ id: "a" }, { id: "b" }]);
    expect(r.size).toBe(2);
  });
  it("toutes cochées → décocher", () => {
    const r = toggleAll(new Set(["a", "b"]), [{ id: "a" }, { id: "b" }]);
    expect(r.size).toBe(0);
  });
  it("partiellement cochées → tout cocher", () => {
    const r = toggleAll(new Set(["a"]), [{ id: "a" }, { id: "b" }]);
    expect(r.size).toBe(2);
  });
});

describe("NotifCategories — défaut activé si clé absente", () => {
  function isEnabled(prefs, key) {
    return prefs[key] !== false;
  }
  it("clé absente → activée par défaut", () => {
    expect(isEnabled({}, "di")).toBe(true);
  });
  it("explicit false → désactivée", () => {
    expect(isEnabled({ di: false }, "di")).toBe(false);
  });
  it("explicit true → activée", () => {
    expect(isEnabled({ di: true }, "di")).toBe(true);
  });
});

describe("NotifCategories — toggle preserve other keys", () => {
  function toggle(prefs, key) {
    const current = prefs[key] !== false;
    return { ...prefs, [key]: !current };
  }
  it("toggle une clé sans toucher aux autres", () => {
    const result = toggle({ di: true, achat: false }, "di");
    expect(result.di).toBe(false);
    expect(result.achat).toBe(false); // inchangé
  });
  it("toggle depuis défaut (true) → false", () => {
    const result = toggle({}, "di");
    expect(result.di).toBe(false);
  });
});

describe("Onboarding — étapes par rôle", () => {
  const BASE = [{ title: "S1" }, { title: "S2" }, { title: "S3" }];
  const ADMIN = [{ title: "Admin" }];
  const FINAL = { title: "Fin", isLast: true };

  function buildSteps(isAdmin) {
    return [...BASE, ...(isAdmin ? ADMIN : []), FINAL];
  }

  it("user simple → 4 étapes (3 base + final)", () => {
    expect(buildSteps(false)).toHaveLength(4);
  });
  it("admin → 5 étapes (3 base + admin + final)", () => {
    expect(buildSteps(true)).toHaveLength(5);
  });
  it("dernière étape est toujours la final (avec isLast)", () => {
    expect(buildSteps(false).at(-1).isLast).toBe(true);
    expect(buildSteps(true).at(-1).isLast).toBe(true);
  });
});

describe("Migration confirm() — pattern detection", () => {
  function hasConfirmAwaitable(line) {
    return /await\s+dialogs\.confirm/.test(line);
  }
  it("nouvelle ligne migrée détectée", () => {
    expect(hasConfirmAwaitable('if (!await dialogs.confirm({ title: "X", variant: "danger" })) return;')).toBe(true);
  });
  it("ancienne ligne pas détectée comme migrée", () => {
    expect(hasConfirmAwaitable('if (!confirm("X")) return;')).toBe(false);
  });
});
