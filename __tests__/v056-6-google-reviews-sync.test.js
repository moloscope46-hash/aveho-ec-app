// =============================================================
//  Tests unitaires — 0.56.6
//  Sync Google Reviews + Edge Function + page admin
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.6 - SQL ajout google_place_id + table avis", () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.6.sql"), "utf-8");

  it("Ajoute google_place_id + rating + count + sync status sur etablissements", () => {
    expect(sql).toContain("add column if not exists google_place_id text");
    expect(sql).toContain("add column if not exists google_rating numeric");
    expect(sql).toContain("add column if not exists google_ratings_count int");
    expect(sql).toContain("add column if not exists google_last_sync_at timestamptz");
    expect(sql).toContain("add column if not exists google_sync_status text");
  });

  it("Index partiel sur google_place_id (where not null)", () => {
    expect(sql).toContain("idx_etablissements_google_place_id");
    expect(sql).toContain("where google_place_id is not null");
  });

  it("Table etablissements_avis_google avec FK + structure", () => {
    expect(sql).toContain("create table if not exists etablissements_avis_google");
    expect(sql).toContain("etablissement_id uuid not null references etablissements(id) on delete cascade");
    expect(sql).toContain("structure_id uuid not null");
  });

  it("Champs Google review (author, rating, publish, content, reply)", () => {
    expect(sql).toContain("author_name text not null");
    expect(sql).toContain("author_profile_photo_url text");
    expect(sql).toContain("rating int not null check (rating between 1 and 5)");
    expect(sql).toContain("publish_time timestamptz");
    expect(sql).toContain("text_content text");
    expect(sql).toContain("reply_text text");
  });

  it("Raw payload jsonb pour debug", () => {
    expect(sql).toContain("raw_payload jsonb");
  });

  it("Unique nulls not distinct (etab, author, publish) pour déduplication", () => {
    expect(sql).toContain("unique nulls not distinct (etablissement_id, author_name, publish_time)");
  });

  it("4 RLS isolant par structure", () => {
    expect(sql).toContain("avis_google_select");
    expect(sql).toContain("avis_google_insert");
    expect(sql).toContain("avis_google_update");
    expect(sql).toContain("avis_google_delete");
  });

  it("Table google_sync_logs pour audit des runs", () => {
    expect(sql).toContain("create table if not exists google_sync_logs");
    expect(sql).toContain("trigger_source text");
    expect(sql).toContain("etablissements_total");
    expect(sql).toContain("nouveaux_avis int");
    expect(sql).toContain("details jsonb");
  });

  it("RPC upsert_avis_google_batch avec jsonb_to_recordset + ON CONFLICT", () => {
    expect(sql).toContain("function upsert_avis_google_batch");
    expect(sql).toContain("jsonb_to_recordset");
    expect(sql).toContain("on conflict (etablissement_id, author_name, publish_time) do update");
  });

  it("RPC avis_google_stats avec répartition par note", () => {
    expect(sql).toContain("function avis_google_stats");
    expect(sql).toContain("avis_5_etoiles");
    expect(sql).toContain("avis_1_etoile");
    expect(sql).toContain("rating_moyen");
    expect(sql).toContain("derniere_sync");
  });

  it("Cron pg_cron schedule toutes les 6h", () => {
    expect(sql).toContain("pg_cron");
    expect(sql).toContain("'0 */6 * * *'");
    expect(sql).toContain("sync-google-reviews-cron");
  });

  it("Cron utilise net.http_post avec service_role", () => {
    expect(sql).toContain("net.http_post");
    expect(sql).toContain("service_role_key");
  });
});

describe("0.56.6 - Edge Function sync-google-reviews", () => {
  const p = "supabase/functions/sync-google-reviews/index.ts";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Utilise Deno.serve (Edge Function Supabase)", () => {
    expect(src).toContain("Deno.serve");
  });

  it("Vérifie GOOGLE_PLACES_API_KEY + SUPABASE creds", () => {
    expect(src).toContain('Deno.env.get("GOOGLE_PLACES_API_KEY")');
    expect(src).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("Client service_role (bypass RLS)", () => {
    expect(src).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(src).toContain("createClient");
  });

  it("Filtre etablissements avec google_place_id not null", () => {
    expect(src).toContain('.not("google_place_id", "is", null)');
  });

  it("Appelle Google Places Details avec reviews field", () => {
    expect(src).toContain("maps.googleapis.com/maps/api/place/details/json");
    expect(src).toContain("reviews");
    expect(src).toContain("language=fr");
  });

  it("Gère le rate limit OVER_QUERY_LIMIT (arrête la boucle)", () => {
    expect(src).toContain("OVER_QUERY_LIMIT");
    expect(src).toContain("rate_limited");
  });

  it("Update statut sync (ok/api_error/rate_limited) sur etablissement", () => {
    expect(src).toContain("google_sync_status");
    expect(src).toContain("google_last_sync_at");
    expect(src).toContain("google_rating");
    expect(src).toContain("google_ratings_count");
  });

  it("Upsert avis via RPC upsert_avis_google_batch", () => {
    expect(src).toContain('rpc("upsert_avis_google_batch"');
    expect(src).toContain("p_etablissement_id");
    expect(src).toContain("p_avis");
  });

  it("Délai 200ms entre 2 établissements (rate limit)", () => {
    expect(src).toContain("setTimeout(r, 200)");
  });

  it("Log du run dans google_sync_logs", () => {
    expect(src).toContain("google_sync_logs");
    expect(src).toContain("logRun");
  });

  it("Support sync 1 seul établissement via etablissement_id body", () => {
    expect(src).toContain("etabIdFilter");
    expect(src).toContain("body.etablissement_id");
  });
});

describe("0.56.6 - Route /api/google-reviews/sync", () => {
  const p = "app/api/google-reviews/sync/route.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Route existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("maxDuration 60 + dynamic force", () => {
    expect(src).toContain("maxDuration = 60");
    expect(src).toContain('dynamic = "force-dynamic"');
  });

  it("Appelle Edge Function via functions.invoke", () => {
    expect(src).toContain('functions.invoke("sync-google-reviews"');
    expect(src).toContain("trigger_source");
  });

  it("Lecture du body d'erreur via getReader (réflexe 48)", () => {
    expect(src).toContain("error.context?.body");
    expect(src).toContain("getReader");
    expect(src).toContain("TextDecoder");
  });

  it("Supporte sync d'un seul établissement via body.etablissement_id", () => {
    expect(src).toContain("body.etablissement_id");
  });
});

describe("0.56.6 - Page /admin/avis-google", () => {
  const p = "app/admin/avis-google/page.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Charge RPC avis_google_stats + tables", () => {
    expect(src).toContain('rpc("avis_google_stats")');
    expect(src).toContain('from("etablissements_avis_google")');
    expect(src).toContain('from("google_sync_logs")');
  });

  it("Stats 6 KPI (étabs, total avis, rating, 5★, 1-2★ critiques, dernière sync)", () => {
    const matches = src.match(/<Kpi /g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  it("Bouton sync globale + sync par établissement", () => {
    expect(src).toContain("triggerSync");
    expect(src).toContain("Lancer la sync");
  });

  it("Liste établissements avec badge statut coloré (ok/error/rate_limited)", () => {
    expect(src).toContain("google_sync_status");
    expect(src).toContain('"rate_limited"');
    expect(src).toContain('"api_error"');
  });

  it("Filtre par note + par établissement", () => {
    expect(src).toContain("filterRating");
    expect(src).toContain("filterEtab");
    expect(src).toContain('"low"');
  });

  it("Mise en évidence critiques (1-2 étoiles) avec bordure rouge", () => {
    expect(src).toContain("a.rating <= 2");
    expect(src).toContain("#c0392b");
  });

  it("Composant Stars avec étoiles remplies", () => {
    expect(src).toContain("function Stars");
    expect(src).toContain("ti-star-filled");
  });

  it("Affichage réponse de l'établissement si présente", () => {
    expect(src).toContain("reply_text");
    expect(src).toContain("Réponse de l'établissement");
  });

  it("Historique 10 derniers runs avec badge cron/manual", () => {
    expect(src).toContain("Historique des syncs");
    expect(src).toContain("trigger_source");
  });

  it("Pédagogie : explication cron 6h + limite Google 5 avis", () => {
    expect(src).toContain("toutes les 6h");
    expect(src).toContain("maximum 5 avis");
  });
});

describe("0.56.6 - Menu admin Avis Google", () => {
  it("Entrée /admin/avis-google dans TopBar", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toContain("/admin/avis-google");
    expect(src).toContain("Avis Google");
  });
});
