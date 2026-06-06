// =============================================================
//  Tests unitaires — 0.58.65
//  Filtre carte equipe + Edge Function CRON snapshots + Sparkline 7j/30j Supabase
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.65 - Version", () => {
  it("Version 0.58.65+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(65);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.65 - SQL user_goals_snapshots", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.65-user-goals-snapshots.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("CREATE TABLE user_goals_snapshots", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS user_goals_snapshots/);
  });

  it("Colonnes : user_id, structure_id, snapshot_date, avg_pct, team_stats JSONB", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/user_id UUID NOT NULL REFERENCES auth\.users/);
    expect(sql).toMatch(/snapshot_date DATE NOT NULL/);
    expect(sql).toMatch(/avg_pct NUMERIC/);
    expect(sql).toMatch(/team_stats JSONB/);
  });

  it("UNIQUE (user_id, snapshot_date)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/UNIQUE \(user_id, snapshot_date\)/);
  });

  it("RLS activée + policy read own + struct", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/user_goals_snapshots_read_own_or_struct/);
  });

  it("Index pour requêtes par user + date desc", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/idx_user_goals_snapshots_user_date/);
  });
});

describe("0.58.65 - Edge Function goals-snapshot-cron", () => {
  const fnPath = path.resolve(process.cwd(), "supabase/functions/goals-snapshot-cron/index.ts");

  it("Fichier Edge Function existe", () => {
    expect(fs.existsSync(fnPath)).toBe(true);
  });

  it("Utilise requireCronSecret (anti-déclenchement non autorisé)", () => {
    const src = fs.readFileSync(fnPath, "utf-8");
    expect(src).toMatch(/requireCronSecret/);
  });

  it("Récupère tous les goals depuis user_goals", () => {
    const src = fs.readFileSync(fnPath, "utf-8");
    expect(src).toMatch(/from\(["']user_goals["']\)/);
  });

  it("Calcule avgPct + nbAtteints + tauxAtteinte + teamStats", () => {
    const src = fs.readFileSync(fnPath, "utf-8");
    expect(src).toMatch(/avgPct/);
    expect(src).toMatch(/nbAtteints/);
    expect(src).toMatch(/tauxAtteinte/);
    expect(src).toMatch(/teamStats/);
  });

  it("Upsert avec onConflict user_id,snapshot_date", () => {
    const src = fs.readFileSync(fnPath, "utf-8");
    expect(src).toMatch(/upsert.*onConflict.*["']user_id,snapshot_date["']/);
  });

  it("Cleanup automatique : garde 90 jours d'historique", () => {
    const src = fs.readFileSync(fnPath, "utf-8");
    expect(src).toMatch(/setDate\(cutoff\.getDate\(\) - 90\)/);
    expect(src).toMatch(/\.delete\(\)\.lt\(["']snapshot_date["']/);
  });
});

describe("0.58.65 - TeamGoalsSparkline refondu 7j/30j Supabase", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamGoalsSparkline.js"), "utf-8");

  it("State rangeDays (7 ou 30) persisté en localStorage", () => {
    expect(src).toMatch(/const \[rangeDays, setRangeDays\]/);
    expect(src).toMatch(/av-team-goals-range/);
  });

  it("State source : 'supabase' ou 'local'", () => {
    expect(src).toMatch(/const \[source, setSource\]/);
    expect(src).toMatch(/setSource\(["']supabase["']\)/);
    expect(src).toMatch(/setSource\(["']local["']\)/);
  });

  it("Fetch depuis user_goals_snapshots (Supabase)", () => {
    expect(src).toMatch(/from\(["']user_goals_snapshots["']\)/);
    expect(src).toMatch(/\.gte\(["']snapshot_date["']/);
  });

  it("Fallback localStorage si erreur ou auth absent", () => {
    expect(src).toMatch(/getLocalHistory\(\)/);
    expect(src).toMatch(/HISTORY_KEY/);
  });

  it("Toggle UI 7j / 30j", () => {
    expect(src).toMatch(/onClick=\{\(\) => setRangeDays\(7\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => setRangeDays\(30\)\}/);
  });

  it("Badge source 'Serveur' (vert) ou 'Local' (gris)", () => {
    expect(src).toMatch(/ti-cloud-check/);
    expect(src).toMatch(/Serveur/);
    expect(src).toMatch(/ti-device-floppy/);
  });

  it("Dimensions adaptées 320x80 (30j) vs 220x60 (7j)", () => {
    expect(src).toMatch(/rangeDays === 30 \? 320 : 220/);
    expect(src).toMatch(/rangeDays === 30 \? 80 : 60/);
  });

  it("Gradient id dynamique sparkline-gradient-${rangeDays}", () => {
    expect(src).toMatch(/sparkline-gradient-\$\{rangeDays\}/);
  });
});

describe("0.58.65 - Filtre carte par équipe", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");

  it("Import useCurrentContext", () => {
    expect(src).toMatch(/import \{ useCurrentContext \} from/);
  });

  it("Select pharmacies inclut equipe_id (+batiment_id, service_id)", () => {
    expect(src).toMatch(/select\(["'][^"']*equipe_id[^"']*["']\)/);
    expect(src).toMatch(/batiment_id, service_id, equipe_id/);
  });

  it("Tri prioritaire des pharmacies rattachées à ctx.equipeId", () => {
    expect(src).toMatch(/ctx\.active && ctx\.equipeId/);
    // 0.58.66 : pattern assoupli — tri stable par appartenance équipe
    expect(src).toMatch(/equipe_id === ctx\.equipeId/);
    expect(src).toMatch(/\[\.\.\.filtered\]\.sort/);
  });

  it("Halo teal accentué sur markers de l'équipe (isEquipeMatch)", () => {
    expect(src).toMatch(/isEquipeMatch/);
    expect(src).toMatch(/124,200,200,.65/);
  });

  it("Badge dans le panneau Pharmacies indiquant matchCount", () => {
    expect(src).toMatch(/matchCount = pharmacies\.filter\(p => p\.equipe_id === ctx\.equipeId\)/);
  });

  it("Deps useEffect markers incluent ctx.equipeId + ctx.active", () => {
    expect(src).toMatch(/leafletReady, showPharmacies, pharmacies, pharmaciesFilter, ctx\.equipeId, ctx\.active/);
  });
});

describe("0.58.65 - Anciennes features 0.58.63 non régressées", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamGoalsSparkline.js"), "utf-8");

  it("pushLocalSnapshot encore présent (fallback)", () => {
    expect(src).toMatch(/pushLocalSnapshot/);
  });

  it("Trend +/- pts toujours affichée", () => {
    expect(src).toMatch(/ti-trending-/);
    expect(src).toMatch(/trend > 0 \? "\+" : ""/);
  });
});
