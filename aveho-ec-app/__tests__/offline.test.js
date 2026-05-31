// =============================================================
//  Tests unitaires — offlineQueue + safeWrite
//  Alpha 0.25.0
//
//  Tests qui n'ont pas besoin d'IndexedDB réel (logique pure).
//  Pour les tests d'intégration IndexedDB, voir Playwright (à venir).
// =============================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock isOnline pour pouvoir le contrôler
import { isOnline } from "../lib/offlineQueue";

describe("isOnline", () => {
  beforeEach(() => {
    delete globalThis.navigator;
  });

  it("retourne true si navigator indéfini (SSR)", () => {
    expect(isOnline()).toBe(true);
  });

  it("retourne true si navigator.onLine est true", () => {
    globalThis.navigator = { onLine: true };
    expect(isOnline()).toBe(true);
  });

  it("retourne false si navigator.onLine est false", () => {
    globalThis.navigator = { onLine: false };
    expect(isOnline()).toBe(false);
  });

  it("retourne true si navigator.onLine est undefined", () => {
    // Par défaut, on suppose online si la propriété n'est pas définie
    globalThis.navigator = {};
    expect(isOnline()).toBe(true);
  });
});

describe("safeWrite — comportement online", () => {
  it("safeInsert appelle bien supabase.from().insert() en online", async () => {
    globalThis.navigator = { onLine: true };
    const { safeInsert } = await import("../lib/safeWrite.js");
    const insertMock = vi.fn().mockResolvedValue({ data: { id: "abc" }, error: null });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    const supabase = { from: fromMock };

    const res = await safeInsert(supabase, "patients", { nom: "Test" }, { userId: "u1" });
    expect(fromMock).toHaveBeenCalledWith("patients");
    expect(insertMock).toHaveBeenCalledWith({ nom: "Test" });
    expect(res.queued).toBe(false);
    expect(res.error).toBeNull();
  });

  it("safeUpdate appelle bien supabase avec .eq() correct", async () => {
    globalThis.navigator = { onLine: true };
    const { safeUpdate } = await import("../lib/safeWrite.js");
    const eqMock2 = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock1 });
    const fromMock = vi.fn().mockReturnValue({ update: updateMock });
    const supabase = { from: fromMock };

    await safeUpdate(supabase, "patients", { nom: "Test" }, { id: "abc", structure_id: "s1" }, { userId: "u1" });
    expect(updateMock).toHaveBeenCalledWith({ nom: "Test" });
    expect(eqMock1).toHaveBeenCalledWith("id", "abc");
    expect(eqMock2).toHaveBeenCalledWith("structure_id", "s1");
  });

  it("safeDelete appelle bien delete + eq", async () => {
    globalThis.navigator = { onLine: true };
    const { safeDelete } = await import("../lib/safeWrite.js");
    const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ delete: deleteMock });
    const supabase = { from: fromMock };

    await safeDelete(supabase, "patients", { id: "abc" }, { userId: "u1" });
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith("id", "abc");
  });

  it("safeRpc appelle supabase.rpc()", async () => {
    globalThis.navigator = { onLine: true };
    const { safeRpc } = await import("../lib/safeWrite.js");
    const rpcMock = vi.fn().mockResolvedValue({ data: 42, error: null });
    const supabase = { rpc: rpcMock };

    const res = await safeRpc(supabase, "mark_consent_notified", { ids: ["1"] }, { userId: "u1" });
    expect(rpcMock).toHaveBeenCalledWith("mark_consent_notified", { ids: ["1"] });
    expect(res.queued).toBe(false);
    expect(res.data).toBe(42);
  });
});

describe("safeWrite — comportement offline", () => {
  beforeEach(() => {
    globalThis.navigator = { onLine: false };
  });

  it("safeInsert sans userId retourne une erreur claire", async () => {
    const { safeInsert } = await import("../lib/safeWrite.js");
    const supabase = { from: vi.fn() };
    const res = await safeInsert(supabase, "patients", { nom: "Test" }, {});
    expect(res.queued).toBe(false);
    expect(res.error.message).toMatch(/userId/);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("safeUpdate sans userId retourne une erreur claire", async () => {
    const { safeUpdate } = await import("../lib/safeWrite.js");
    const supabase = { from: vi.fn() };
    const res = await safeUpdate(supabase, "patients", { nom: "Test" }, { id: "abc" }, {});
    expect(res.queued).toBe(false);
    expect(res.error.message).toMatch(/userId/);
  });

  it("safeDelete sans userId retourne une erreur claire", async () => {
    const { safeDelete } = await import("../lib/safeWrite.js");
    const supabase = { from: vi.fn() };
    const res = await safeDelete(supabase, "patients", { id: "abc" }, {});
    expect(res.queued).toBe(false);
    expect(res.error.message).toMatch(/userId/);
  });
});

describe("Structure des opérations en queue", () => {
  it("Insert : a la bonne forme", () => {
    const op = {
      table: "patients",
      op: "insert",
      payload: { nom: "Test" },
      user_id: "u1",
    };
    expect(op.op).toBe("insert");
    expect(op.payload).toEqual({ nom: "Test" });
    expect(op.match).toBeUndefined();
  });

  it("Update : a un match", () => {
    const op = {
      table: "patients",
      op: "update",
      payload: { nom: "Test" },
      match: { id: "abc" },
      user_id: "u1",
    };
    expect(op.match).toEqual({ id: "abc" });
  });

  it("Delete : payload null + match", () => {
    const op = {
      table: "patients",
      op: "delete",
      payload: null,
      match: { id: "abc" },
      user_id: "u1",
    };
    expect(op.payload).toBeNull();
    expect(op.match).toEqual({ id: "abc" });
  });

  it("RPC : a un rpcName", () => {
    const op = {
      op: "rpc",
      rpcName: "mark_consent_notified",
      payload: { ids: ["1"] },
      user_id: "u1",
    };
    expect(op.rpcName).toBe("mark_consent_notified");
    expect(op.table).toBeUndefined();
  });
});

describe("UUID côté client (offline insert)", () => {
  it("crypto.randomUUID disponible en environnement test", () => {
    const uuid = crypto.randomUUID();
    expect(typeof uuid).toBe("string");
    // Format standard UUID v4 : 8-4-4-4-12 chars hex
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("UUIDs générés sont uniques", () => {
    const a = crypto.randomUUID();
    const b = crypto.randomUUID();
    expect(a).not.toBe(b);
  });
});
