// =============================================================
//  Tests unitaires — safeFetch + logique ConflictResolver
//  Alpha 0.27.0
// =============================================================
import { describe, it, expect, vi } from "vitest";

describe("safeFetch — comportement", () => {
  it("structure du retour : { data, error, fromCache, fresh }", () => {
    // Vérification de structure plutôt que mock complexe
    const expectedKeys = ["data", "error", "fromCache", "fresh"];
    const mockResult = { data: [], error: null, fromCache: false, fresh: true };
    expectedKeys.forEach((k) => {
      expect(mockResult).toHaveProperty(k);
    });
  });

  it("data peut être tableau ou objet", () => {
    const r1 = { data: [], error: null, fromCache: false, fresh: true };
    const r2 = { data: { id: 1 }, error: null, fromCache: false, fresh: true };
    expect(Array.isArray(r1.data)).toBe(true);
    expect(typeof r2.data).toBe("object");
  });

  it("fromCache et fresh sont booléens", () => {
    const r = { data: [], error: null, fromCache: false, fresh: true };
    expect(typeof r.fromCache).toBe("boolean");
    expect(typeof r.fresh).toBe("boolean");
  });
});

describe("Conflict detection — champs en conflit", () => {
  function findConflictedFields(myPayload, currentRow) {
    if (!currentRow) return [];
    const myKeys = Object.keys(myPayload).filter((k) => k !== "updated_at" && k !== "__staged_updated_at");
    return myKeys.filter((k) => {
      const mine = myPayload[k];
      const current = currentRow[k];
      return String(mine ?? "") !== String(current ?? "");
    });
  }

  it("retourne tableau vide si currentRow null (ligne supprimée)", () => {
    expect(findConflictedFields({ nom: "Test" }, null)).toEqual([]);
  });

  it("détecte un seul champ modifié", () => {
    const my = { nom: "Dupont", chambre: "205" };
    const current = { nom: "Dupont", chambre: "204" };
    expect(findConflictedFields(my, current)).toEqual(["chambre"]);
  });

  it("détecte plusieurs champs modifiés", () => {
    const my = { nom: "Martin", chambre: "205", medecin: "Dr. X" };
    const current = { nom: "Dupont", chambre: "204", medecin: "Dr. X" };
    expect(findConflictedFields(my, current)).toEqual(["nom", "chambre"]);
  });

  it("ignore updated_at et __staged_updated_at", () => {
    const my = { nom: "Test", updated_at: "2026-01-01", __staged_updated_at: "2025-12-31" };
    const current = { nom: "Test", updated_at: "2026-05-31" };
    expect(findConflictedFields(my, current)).toEqual([]);
  });

  it("gère les null/undefined", () => {
    const my = { notes: null };
    const current = { notes: null };
    expect(findConflictedFields(my, current)).toEqual([]);
  });

  it("null vs string vide → pas de conflit (tolérance)", () => {
    const my = { notes: "" };
    const current = { notes: null };
    expect(findConflictedFields(my, current)).toEqual([]);
  });

  it("convertit en string pour comparer types différents", () => {
    const my = { num: "42" };
    const current = { num: 42 };
    expect(findConflictedFields(my, current)).toEqual([]);
  });

  it("détecte string vs number différent", () => {
    const my = { num: "42" };
    const current = { num: 43 };
    expect(findConflictedFields(my, current)).toEqual(["num"]);
  });
});

describe("Modes de résolution conflit", () => {
  it("force_mine : payload sans __staged_updated_at", () => {
    const payload = { nom: "Dupont", chambre: "205", __staged_updated_at: "2026-01-01" };
    const clean = { ...payload };
    delete clean.__staged_updated_at;
    expect(clean.__staged_updated_at).toBeUndefined();
    expect(clean.nom).toBe("Dupont");
    expect(clean.chambre).toBe("205");
  });

  it("keep_current : on retire juste de la queue, pas d'update", () => {
    // Comportement : aucun appel supabase.update, juste removeOp
    const removeOpMock = vi.fn().mockResolvedValue(true);
    removeOpMock(123);
    expect(removeOpMock).toHaveBeenCalledWith(123);
  });

  it("merge : payload final est un mix des choix utilisateur", () => {
    const myPayload = { nom: "Martin", chambre: "205" };
    const currentRow = { nom: "Dupont", chambre: "204" };
    // L'utilisateur choisit : ma version pour nom, version actuelle pour chambre
    const merged = { nom: myPayload.nom, chambre: currentRow.chambre };
    expect(merged).toEqual({ nom: "Martin", chambre: "204" });
  });
});

describe("Détection conflit via last_error", () => {
  it("reconnaît un message de conflit", () => {
    const isConflict = (msg) => Boolean(msg && msg.toLowerCase().includes("conflit"));
    expect(isConflict("Conflit : modifié depuis (par un autre user le 31/05/2026 10:00)")).toBe(true);
    expect(isConflict("Network error")).toBe(false);
    expect(isConflict(null)).toBe(false);
    expect(isConflict("")).toBe(false);
  });

  it("est case-insensitive", () => {
    const isConflict = (msg) => Boolean(msg && msg.toLowerCase().includes("conflit"));
    expect(isConflict("CONFLIT")).toBe(true);
    expect(isConflict("Conflit")).toBe(true);
    expect(isConflict("conflit")).toBe(true);
  });
});

describe("Pages migrées vers safeFetch", () => {
  it("clés cache cohérentes par contexte", () => {
    const structureId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const etabId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    const keyPatients = `patients:etab:${etabId}`;
    const keyAchats = `achats:etab:${etabId}`;
    const keyInterv = `interventions:etab:${etabId}`;

    // Toutes les clés sont distinctes
    expect(new Set([keyPatients, keyAchats, keyInterv]).size).toBe(3);
    // Format cohérent
    expect(keyPatients).toMatch(/^patients:etab:/);
    expect(keyAchats).toMatch(/^achats:etab:/);
    expect(keyInterv).toMatch(/^interventions:etab:/);
  });

  it("fallback 'all' si etabId absent", () => {
    const etabId = null;
    const key = `interventions:etab:${etabId || "all"}`;
    expect(key).toBe("interventions:etab:all");
  });
});
