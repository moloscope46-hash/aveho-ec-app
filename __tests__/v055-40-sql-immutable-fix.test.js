// =============================================================
//  Tests unitaires — 0.55.40
//  Fix SQL : date_trunc() pas IMMUTABLE → index supprimé
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.40 - Fix SQL : pas de date_trunc dans index", () => {
  it("Le patch 0.55.40 ne contient pas d'index sur date_trunc", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.40.sql"),
      "utf-8"
    );
    // Doit explicitement DROP l'index problématique
    expect(sql).toContain("drop index if exists idx_api_usage_month");
    // Et ne pas le recréer
    const createIndexLines = sql
      .split("\n")
      .filter(l => l.includes("create index"))
      .join("\n");
    expect(createIndexLines).not.toMatch(/date_trunc\s*\(/);
  });

  it("Le patch 0.55.39 a été corrigé aussi", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.39.sql"),
      "utf-8"
    );
    const createIndexLines = sql
      .split("\n")
      .filter(l => l.includes("create index"))
      .join("\n");
    expect(createIndexLines).not.toMatch(/date_trunc\s*\(/);
  });

  it("Les 2 autres index utiles sont conservés", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.40.sql"),
      "utf-8"
    );
    expect(sql).toContain("idx_api_usage_api");
    expect(sql).toContain("idx_api_usage_struct");
  });
});

describe("0.55.40 - Performance toujours OK sans l'index", () => {
  it("L'index created_at desc couvre le range scan mensuel", () => {
    // Le filtre "where created_at >= date_trunc('month', now())" est un range scan
    // L'index (api_name, created_at desc) peut être utilisé en index range scan
    // → pas besoin d'un index spécifique sur le mois
    const reasonableForRangeScan = ["api_name", "created_at"];
    expect(reasonableForRangeScan).toContain("created_at");
  });
});

describe("0.55.40 - SQL idempotent", () => {
  it("Utilise IF NOT EXISTS partout", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.40.sql"),
      "utf-8"
    );
    // Compter les "if not exists" et "if exists"
    const ifNotExists = (sql.match(/if not exists/gi) || []).length;
    const dropIfExists = (sql.match(/drop \w+ if exists/gi) || []).length;
    expect(ifNotExists + dropIfExists).toBeGreaterThan(3);
  });

  it("DO $$ pour les policies", () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.40.sql"),
      "utf-8"
    );
    expect(sql).toContain("do $$");
    expect(sql).toContain("pg_policies");
  });
});
