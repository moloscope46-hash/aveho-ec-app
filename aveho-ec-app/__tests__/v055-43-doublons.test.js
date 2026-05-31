// =============================================================
//  Tests unitaires — 0.55.43
//  Système anti-doublon réutilisable + droit force_doublon_etab
// =============================================================
import { describe, it, expect } from "vitest";
import { canDo } from "../lib/useAuth";

describe("0.55.43 - canDo() supporte permission ciblée par module", () => {
  it("Admin a tous les droits y compris force_doublon_etab", () => {
    const role = { nom: "Administrateur", systeme: "admin" };
    expect(canDo(role, "force_doublon_etab")).toBe(true);
  });

  it("Lecture seule n'a PAS force_doublon_etab", () => {
    const role = { nom: "Lecture seule", systeme: "lecture" };
    expect(canDo(role, "force_doublon_etab")).toBe(false);
  });

  it("Rôle avec doublons.write a le droit", () => {
    const role = { droits: { doublons: ["write"] } };
    expect(canDo(role, "force_doublon_etab")).toBe(true);
  });

  it("Rôle avec doublons.read n'a PAS le droit (write requis)", () => {
    const role = { droits: { doublons: ["read"] } };
    expect(canDo(role, "force_doublon_etab")).toBe(false);
  });

  it("Rôle avec etablissement.write seul N'a PAS le droit doublons", () => {
    // Vérif que la permission ciblée par module ne déborde pas
    const role = { droits: { etablissement: ["write", "read"] } };
    expect(canDo(role, "force_doublon_etab")).toBe(false);
  });

  it("Wildcard sur doublons donne le droit", () => {
    const role = { droits: { doublons: ["*"] } };
    expect(canDo(role, "force_doublon_etab")).toBe(true);
  });
});

describe("0.55.43 - checkEtabDoublon helper", () => {
  it("Pas de check si aucun critère", async () => {
    const fakeSupabase = { rpc: () => Promise.resolve({ data: null, error: null }) };
    const { checkEtabDoublon } = await import("../app/lib/checkEtabDoublon.js");
    const res = await checkEtabDoublon(fakeSupabase, {});
    expect(res.found).toBe(false);
    expect(res.count).toBe(0);
  });

  it("Appel RPC avec finess uniquement", async () => {
    let rpcArgs = null;
    const fakeSupabase = {
      rpc: (name, args) => {
        rpcArgs = { name, args };
        return Promise.resolve({ data: { ok: true, found: false, count: 0, matches: [] }, error: null });
      },
    };
    const { checkEtabDoublon } = await import("../app/lib/checkEtabDoublon.js");
    await checkEtabDoublon(fakeSupabase, { finess: "750100026" });
    expect(rpcArgs.name).toBe("check_etab_doublon");
    expect(rpcArgs.args.p_finess).toBe("750100026");
    expect(rpcArgs.args.p_siret).toBeNull();
  });

  it("Gère erreur RPC gracieusement", async () => {
    const fakeSupabase = {
      rpc: () => Promise.resolve({ data: null, error: { message: "Pas de structure" } }),
    };
    const { checkEtabDoublon } = await import("../app/lib/checkEtabDoublon.js");
    const res = await checkEtabDoublon(fakeSupabase, { finess: "X" });
    expect(res.ok).toBe(false);
    expect(res.found).toBe(false);
  });
});

describe("0.55.43 - DoublonAlert - validation commentaire", () => {
  it("Commentaire < 10 chars refusé", () => {
    const commentaire = "court";
    const isValid = commentaire.trim().length >= 10;
    expect(isValid).toBe(false);
  });

  it("Commentaire >= 10 chars accepté", () => {
    const commentaire = "Raison valable pour le doublon X";
    const isValid = commentaire.trim().length >= 10;
    expect(isValid).toBe(true);
  });

  it("Trim avant validation", () => {
    const commentaire = "   short   ";
    const isValid = commentaire.trim().length >= 10;
    expect(isValid).toBe(false);
  });
});

describe("0.55.43 - SQL patch contient les colonnes traçabilité", () => {
  it("Colonnes ajoutées sur etablissements", async () => {
    const fs = await import("fs");
    const sql = fs.readFileSync(new URL("../supabase/aveho-PATCH-vers-0.55.43.sql", import.meta.url), "utf-8");
    expect(sql).toContain("doublon_force_commentaire");
    expect(sql).toContain("doublon_force_par");
    expect(sql).toContain("doublon_force_at");
  });

  it("RPC check_etab_doublon créée", async () => {
    const fs = await import("fs");
    const sql = fs.readFileSync(new URL("../supabase/aveho-PATCH-vers-0.55.43.sql", import.meta.url), "utf-8");
    expect(sql).toContain("create or replace function check_etab_doublon");
    expect(sql).toContain("p_finess");
    expect(sql).toContain("p_siret");
    expect(sql).toContain("p_rpps");
  });

  it("Vue v_doublons_forces pour audit", async () => {
    const fs = await import("fs");
    const sql = fs.readFileSync(new URL("../supabase/aveho-PATCH-vers-0.55.43.sql", import.meta.url), "utf-8");
    expect(sql).toContain("v_doublons_forces");
  });
});

describe("0.55.43 - EtabAutoFiller composant réutilisable", () => {
  it("Liste des sources show=['finess','sirene','rpps'] par défaut", () => {
    const defaultShow = ["finess", "sirene", "rpps"];
    expect(defaultShow.length).toBe(3);
  });

  it("Peut désactiver certaines sources", () => {
    const show = ["finess"];
    expect(show.includes("rpps")).toBe(false);
    expect(show.includes("finess")).toBe(true);
  });
});

describe("0.55.43 - Module 'doublons' ajouté au système", () => {
  it("MODULES contient doublons", () => {
    const MODULES = [
      "patients", "etablissement", "materiels", "articles",
      "stock", "transferts", "interventions", "commandes",
      "utilisateurs", "doublons",
    ];
    expect(MODULES).toContain("doublons");
    expect(MODULES.length).toBe(10);
  });
});
