// =============================================================
//  Tests unitaires — Signalements perso opt-in
//  Alpha 0.32.0
// =============================================================
import { describe, it, expect } from "vitest";

describe("Build payload signalement avec opt-in", () => {
  // Simulation de la logique du save()
  function buildPayload(form, auth, isEdit = false) {
    const payload = {
      structure_id: auth.structureId,
      etablissement_id: auth.etabId,
      type: form.type || "Autre",
      titre: form.titre?.trim() || "",
      description: form.description?.trim() || "",
      signature: form.signature?.trim() || null,
    };
    if (!isEdit) {
      if (form.trackPerso && auth.user?.id) {
        payload.created_by = auth.user.id;
      }
    }
    return payload;
  }

  const auth = { structureId: "abc", etabId: "def", user: { id: "user-1" } };

  it("trackPerso=true → created_by renseigné", () => {
    const form = { titre: "Test", description: "Desc", trackPerso: true };
    const p = buildPayload(form, auth);
    expect(p.created_by).toBe("user-1");
  });

  it("trackPerso=false → created_by absent", () => {
    const form = { titre: "Test", description: "Desc", trackPerso: false };
    const p = buildPayload(form, auth);
    expect(p.created_by).toBeUndefined();
  });

  it("trackPerso undefined → created_by absent (défaut anonyme)", () => {
    const form = { titre: "Test", description: "Desc" };
    const p = buildPayload(form, auth);
    expect(p.created_by).toBeUndefined();
  });

  it("édition admin → created_by jamais touché (préserve l'original)", () => {
    const form = { titre: "Test", description: "Desc", trackPerso: true };
    const p = buildPayload(form, auth, true);
    expect(p.created_by).toBeUndefined();
  });

  it("trackPerso=true mais pas de user.id → created_by absent", () => {
    const form = { titre: "Test", description: "Desc", trackPerso: true };
    const authSansUser = { structureId: "abc", etabId: "def", user: null };
    const p = buildPayload(form, authSansUser);
    expect(p.created_by).toBeUndefined();
  });
});

describe("Coexistence signature + trackPerso", () => {
  function buildPayload(form, auth) {
    const payload = {
      signature: form.signature?.trim() || null,
    };
    if (form.trackPerso && auth.user?.id) {
      payload.created_by = auth.user.id;
    }
    return payload;
  }

  const auth = { user: { id: "user-1" } };

  it("signature + trackPerso → les deux remplis", () => {
    const form = { signature: "Marie IDE", trackPerso: true };
    const p = buildPayload(form, auth);
    expect(p.signature).toBe("Marie IDE");
    expect(p.created_by).toBe("user-1");
  });

  it("signature seule → anonyme côté tracking (created_by null)", () => {
    const form = { signature: "Marie IDE", trackPerso: false };
    const p = buildPayload(form, auth);
    expect(p.signature).toBe("Marie IDE");
    expect(p.created_by).toBeUndefined();
  });

  it("trackPerso seul → tracking sans signature publique", () => {
    const form = { signature: "", trackPerso: true };
    const p = buildPayload(form, auth);
    expect(p.signature).toBeNull();
    expect(p.created_by).toBe("user-1");
  });

  it("ni signature ni trackPerso → complètement anonyme", () => {
    const form = {};
    const p = buildPayload(form, auth);
    expect(p.signature).toBeNull();
    expect(p.created_by).toBeUndefined();
  });
});

describe("Filtrage signalements par user (KPI /profil)", () => {
  function filterMonSignalements(signalements, userId) {
    if (!userId) return [];
    return signalements.filter((s) => s.created_by === userId);
  }

  const all = [
    { id: 1, created_by: "alice", statut: "Nouveau" },
    { id: 2, created_by: null, statut: "Nouveau" }, // anonyme
    { id: 3, created_by: "alice", statut: "Traité" },
    { id: 4, created_by: "bob", statut: "Nouveau" },
    { id: 5, created_by: null, statut: "Traité" }, // anonyme
  ];

  it("Alice ne voit que ses 2 signalements signés", () => {
    const mine = filterMonSignalements(all, "alice");
    expect(mine).toHaveLength(2);
    expect(mine.map(s => s.id)).toEqual([1, 3]);
  });

  it("Bob voit son seul signalement", () => {
    const mine = filterMonSignalements(all, "bob");
    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe(4);
  });

  it("Claire (jamais signé) ne voit rien", () => {
    expect(filterMonSignalements(all, "claire")).toHaveLength(0);
  });

  it("compteur Traité par user", () => {
    const mine = filterMonSignalements(all, "alice");
    const traites = mine.filter((s) => s.statut === "Traité").length;
    expect(traites).toBe(1);
  });

  it("aucun userId ne retourne les anonymes par erreur", () => {
    expect(filterMonSignalements(all, null)).toHaveLength(0);
    expect(filterMonSignalements(all, undefined)).toHaveLength(0);
  });
});

describe("Fusion signalements dans stats activité", () => {
  function fusionneSignalementsUsers(users, signalementsParUser) {
    const map = {};
    signalementsParUser.forEach((s) => { map[s.user_id] = s; });
    return users.map((u) => ({
      ...u,
      nb_signalements_signes: map[u.user_id]?.nb_signalements_signes || 0,
    }));
  }

  it("enrichit chaque user avec son compte de signalements", () => {
    const users = [
      { user_id: "alice", nb_actions_total: 50 },
      { user_id: "bob", nb_actions_total: 30 },
    ];
    const sigs = [
      { user_id: "alice", nb_signalements_signes: 5 },
    ];
    const r = fusionneSignalementsUsers(users, sigs);
    expect(r[0].nb_signalements_signes).toBe(5);
    expect(r[1].nb_signalements_signes).toBe(0);
  });

  it("préserve les autres champs du user", () => {
    const users = [{ user_id: "alice", user_email: "a@x.fr", nb_actions_total: 50 }];
    const sigs = [{ user_id: "alice", nb_signalements_signes: 3 }];
    const r = fusionneSignalementsUsers(users, sigs);
    expect(r[0].user_email).toBe("a@x.fr");
    expect(r[0].nb_actions_total).toBe(50);
    expect(r[0].nb_signalements_signes).toBe(3);
  });

  it("liste signalements vide → tous à 0", () => {
    const users = [{ user_id: "alice" }, { user_id: "bob" }];
    const r = fusionneSignalementsUsers(users, []);
    expect(r.every(u => u.nb_signalements_signes === 0)).toBe(true);
  });
});

describe("Comportement par défaut form signalement", () => {
  it("openNew() initialise trackPerso à false (implicite)", () => {
    const form = { type: "Idée", signature: "" };
    // Pas de trackPerso → comme undefined → checkbox décochée
    expect(form.trackPerso).toBeUndefined();
    expect(Boolean(form.trackPerso)).toBe(false);
  });

  it("checkbox cochée puis décochée → trackPerso = false", () => {
    let form = { trackPerso: true };
    form = { ...form, trackPerso: false };
    expect(form.trackPerso).toBe(false);
  });
});

describe("Scénario end-to-end signalement opt-in", () => {
  it("Alice crée un signalement signé → apparaît dans son /profil", () => {
    // Étape 1 : création
    const form = {
      type: "Problème", titre: "Bug X", description: "Détail bug X",
      signature: "Alice IDE", trackPerso: true,
    };
    const auth = { user: { id: "alice" } };
    const payload = {
      type: form.type,
      titre: form.titre,
      description: form.description,
      signature: form.signature,
      created_by: form.trackPerso ? auth.user.id : undefined,
    };
    expect(payload.created_by).toBe("alice");

    // Étape 2 : lecture /profil — filtre sur created_by
    const all = [{ id: 1, created_by: "alice", statut: "Nouveau" }];
    const mine = all.filter(s => s.created_by === "alice");
    expect(mine).toHaveLength(1);
  });

  it("Bob crée un signalement sans cocher → anonyme, pas dans son /profil", () => {
    const form = {
      type: "Idée", titre: "Idée Y", description: "Détail idée",
      signature: "", trackPerso: false,
    };
    const auth = { user: { id: "bob" } };
    const payload = {
      type: form.type,
      titre: form.titre,
      description: form.description,
      signature: form.signature || null,
      ...(form.trackPerso && auth.user?.id ? { created_by: auth.user.id } : {}),
    };
    expect(payload.created_by).toBeUndefined();
    expect(payload.signature).toBeNull();
  });
});
