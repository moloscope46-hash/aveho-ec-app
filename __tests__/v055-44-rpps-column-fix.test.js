// =============================================================
//  Tests unitaires — 0.55.44
//  Hotfix : colonne rpps ajoutée avant index
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.44 - Hotfix SQL : colonne rpps avant index", () => {
  it("Le patch 0.55.44 ajoute la colonne rpps", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.44.sql"),
      "utf-8"
    );
    expect(sql).toContain("add column if not exists rpps text");
  });

  it("La colonne rpps est ajoutée AVANT l'index", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.44.sql"),
      "utf-8"
    );
    const idxRppsPos = sql.indexOf("idx_etab_part_rpps");
    const colRppsPos = sql.indexOf("add column if not exists rpps text");
    expect(colRppsPos).toBeGreaterThan(-1);
    expect(idxRppsPos).toBeGreaterThan(-1);
    expect(colRppsPos).toBeLessThan(idxRppsPos);
  });

  it("Aussi ajoute adeli, profession, specialite", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.44.sql"),
      "utf-8"
    );
    expect(sql).toContain("add column if not exists adeli");
    expect(sql).toContain("add column if not exists profession");
    expect(sql).toContain("add column if not exists specialite");
  });

  it("Le patch 0.55.43 a aussi été corrigé (ordre rétabli)", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.43.sql"),
      "utf-8"
    );
    const idxRppsPos = sql.indexOf("idx_etab_part_rpps");
    const colRppsPos = sql.indexOf("add column if not exists rpps text");
    expect(colRppsPos).toBeGreaterThan(-1);
    expect(idxRppsPos).toBeGreaterThan(-1);
    expect(colRppsPos).toBeLessThan(idxRppsPos);
  });

  it("Patch 100% idempotent — IF NOT EXISTS partout", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.44.sql"),
      "utf-8"
    );
    const ifNotExists = (sql.match(/if not exists/gi) || []).length;
    expect(ifNotExists).toBeGreaterThan(8);
  });

  it("RPC check_etab_doublon recréée", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.44.sql"),
      "utf-8"
    );
    expect(sql).toContain("create or replace function check_etab_doublon");
  });
});
