// =============================================================
//  Tests unitaires — 0.55.56
//  Plan B RPPS : dump local + fallback automatique
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.56 - SQL : table rpps_dump + RPC", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.56.sql"), "utf-8");
  const rpcSql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.55.56-rpc.sql"), "utf-8");

  it("Table rpps_dump avec PK rpps (idempotent)", () => {
    expect(sql).toContain("create table if not exists rpps_dump");
    expect(sql).toContain("rpps text primary key");
  });

  it("Colonnes essentielles présentes", () => {
    expect(sql).toContain("nom text");
    expect(sql).toContain("prenom text");
    expect(sql).toContain("profession_libelle");
    expect(sql).toContain("specialite_libelle");
    expect(sql).toContain("code_insee_commune");
    expect(sql).toContain("latitude numeric");
    expect(sql).toContain("longitude numeric");
  });

  it("Table de méta rpps_dump_meta avec contrainte single row", () => {
    expect(sql).toContain("create table if not exists rpps_dump_meta");
    expect(sql).toContain("constraint single_row check (id = 1)");
  });

  it("Index full-text + index par profession/cp/insee/coords", () => {
    expect(sql).toContain("to_tsvector('french'");
    expect(sql).toContain("idx_rpps_dump_profession");
    expect(sql).toContain("idx_rpps_dump_cp");
    expect(sql).toContain("idx_rpps_dump_insee");
    expect(sql).toContain("idx_rpps_dump_coords");
  });

  it("Fonction search_rpps_local (security definer)", () => {
    expect(sql).toContain("function search_rpps_local");
    expect(sql).toContain("security definer");
    expect(sql).toContain("returns table");
  });

  it("Fonction rpps_dump_status retourne âge en jours", () => {
    expect(sql).toContain("function rpps_dump_status");
    expect(sql).toContain("age_jours");
  });

  it("RLS activée + policy read auth", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("rpps_dump read auth");
  });

  it("RPC upsert batch 5000 (JSONB) avec ON CONFLICT", () => {
    expect(rpcSql).toContain("function upsert_rpps_dump_batch");
    expect(rpcSql).toContain("jsonb_to_recordset");
    expect(rpcSql).toContain("on conflict (rpps) do update");
  });

  it("RPC rpps_dump_truncate + rpps_dump_meta_update", () => {
    expect(rpcSql).toContain("function rpps_dump_truncate");
    expect(rpcSql).toContain("function rpps_dump_meta_update");
  });
});

describe("0.55.56 - Route /api/rpps fallback automatique", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/rpps/route.js"), "utf-8");

  it("maxDuration 30s + dynamic force-dynamic ajoutés", () => {
    expect(src).toContain("maxDuration = 30");
    expect(src).toContain('dynamic = "force-dynamic"');
  });

  it("Fonction fallbackToLocalDump existe", () => {
    expect(src).toContain("async function fallbackToLocalDump");
    expect(src).toContain('"search_rpps_local"');
  });

  it("Fallback appelé sur RPPS exact si ANS KO", () => {
    expect(src).toContain("fallbackToLocalDump");
    // Au moins 3 appels (RPPS exact + ANS KO + ANS vide)
    const matches = src.match(/fallbackToLocalDump\(/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("Source 'dump_local' clairement marquée dans la réponse", () => {
    expect(src).toContain('source: "dump_local"');
  });

  it("Champ fallback_reason pour debug", () => {
    expect(src).toContain("fallback_reason");
  });

  it("Normalisation : adresse, cp, ville, lat/lng exposés", () => {
    expect(src).toContain("source_record");
    // Format compat ANS : nom, prenom, profession, cp, commune, latitude, longitude
    expect(src).toContain("cp: r.code_postal");
    expect(src).toContain("commune: r.ville");
  });
});

describe("0.55.56 - Route /api/rpps/dump-status", () => {
  const p = "app/api/rpps/dump-status/route.js";

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Appelle RPC rpps_dump_status", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
    expect(src).toContain('rpc("rpps_dump_status")');
  });

  it("Retourne is_fresh (âge < 60 jours) + empty (records = 0)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
    expect(src).toContain("is_fresh");
    expect(src).toContain("empty");
  });
});

describe("0.55.56 - Page admin /admin/rpps-dump", () => {
  const p = "app/admin/rpps-dump/page.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Affiche le statut du dump", () => {
    expect(src).toContain("/api/rpps/dump-status");
    expect(src).toContain("État du dump local");
  });

  it("Upload CSV + parsing", () => {
    expect(src).toContain('accept=".csv');
    expect(src).toContain("parseCSVLine");
  });

  it("Détection automatique du séparateur (; , \\t)", () => {
    expect(src).toContain("Séparateur détecté");
  });

  it("Mapping flexible des colonnes (findIdx)", () => {
    expect(src).toContain("findIdx");
    expect(src).toContain("identification nationale");
    expect(src).toContain("profession");
  });

  it("Batch de 5000 + appel RPC upsert_rpps_dump_batch", () => {
    expect(src).toContain("BATCH_SIZE = 5000");
    expect(src).toContain('rpc("upsert_rpps_dump_batch"');
  });

  it("Truncate avant seed via RPC", () => {
    expect(src).toContain('rpc("rpps_dump_truncate")');
  });

  it("Progress bar + log live", () => {
    expect(src).toContain("setProgress");
    expect(src).toContain("seedLog");
  });

  it("Section test fallback (source ANS vs dump_local)", () => {
    expect(src).toContain("Tester le fallback");
    expect(src).toContain("fallback_reason");
  });

  it("Bouton meta_update à la fin (completed/failed)", () => {
    expect(src).toContain('rpc("rpps_dump_meta_update"');
  });
});

describe("0.55.56 - Menu admin inclut Dump RPPS", () => {
  it("Entrée /admin/rpps-dump dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/rpps-dump");
    expect(src).toContain("Plan B");
  });
});
