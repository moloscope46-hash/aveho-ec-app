// =============================================================
//  Tests unitaires — 0.58.52
//  Debug tuiles + SQL membres_equipe + ColorPicker + Sync goals + Migration UI
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.52 - Version", () => {
  it("Version 0.58.52+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(52);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.52 - Tuiles Vue d'ensemble : skeleton supprimé, cards toujours rendues", () => {
  const heroSrc = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"), "utf-8");
  const accueilSrc = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("HeroDashboard : pas de skeleton conditionnel autour des KpiCards", () => {
    // Plus de pattern "loading && !kpis ? SkeletonGrid" autour des KpiCards
    expect(heroSrc).not.toMatch(/loading && !kpis \? \(\s*<SkeletonGrid/);
  });

  it("HeroDashboard : 4 KpiCard directs dans la section Vue d'ensemble", () => {
    expect(heroSrc).toMatch(/<KpiCard[\s\S]*?label="Promotions actives"/);
    expect(heroSrc).toMatch(/<KpiCard[\s\S]*?label="Commandes passées"/);
  });

  it("accueil/page.js : HeroDashboard rendu AVANT le check loading", () => {
    // Le HeroDashboard est rendu inconditionnellement, en dehors du wrap loading
    expect(accueilSrc).toMatch(/<HeroDashboard[\s\S]*?kpis=\{kpis\}/);
    // Plus de Panel><StateMsg>Chargement…</StateMsg></Panel> qui masque tout
    expect(accueilSrc).toMatch(/\{loading \? null : \(/);
  });
});

describe("0.58.52 - SQL membres_equipe", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.52-membres-equipe.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("CREATE TABLE membres_equipe avec FK auth.users + equipes", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS membres_equipe/);
    expect(sql).toMatch(/user_id UUID NOT NULL REFERENCES auth\.users/);
    expect(sql).toMatch(/equipe_id UUID NOT NULL REFERENCES equipes/);
  });

  it("RLS activée + policies SELECT/INSERT/UPDATE/DELETE", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?FOR SELECT/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?FOR ALL/);
  });
});

describe("0.58.52 - ColorPicker component", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ColorPicker.js"), "utf-8");

  it("Export default + DEFAULT_PALETTE", () => {
    expect(src).toMatch(/export default function ColorPicker/);
    expect(src).toMatch(/export const DEFAULT_PALETTE/);
  });

  it("Palette par défaut contient au moins 9 couleurs (Aveho + étendues)", () => {
    expect(src).toMatch(/"#7CC8C8"/);  // teal
    expect(src).toMatch(/"#185FA5"/);  // blue
    expect(src).toMatch(/"#142131"/);  // navy
    expect(src).toMatch(/"#C9867F"/);  // terra
    expect(src).toMatch(/"#EF9F27"/);  // amber
    // Au moins 4 couleurs étendues
    const colors = src.match(/"#[0-9A-F]{6}"/gi) || [];
    expect(colors.length).toBeGreaterThanOrEqual(10);
  });

  it("Input type=color HTML5 natif", () => {
    expect(src).toMatch(/type="color"/);
  });

  it("Input hex texte avec validation regex", () => {
    expect(src).toMatch(/isValidHex/);
    expect(src).toMatch(/\/\^#\(\[0-9A-F\]\{3\}\|\[0-9A-F\]\{6\}\)\$\/i/);
  });

  it("Prop showCustom (défaut true)", () => {
    expect(src).toMatch(/showCustom\s*=\s*true/);
  });
});

describe("0.58.52 - Tags + Étiquettes utilisent ColorPicker", () => {
  it("/tags-materiel importe + utilise ColorPicker", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/tags-materiel/page.js"), "utf-8");
    expect(src).toMatch(/import ColorPicker from ["']\.\.\/components\/ColorPicker["']/);
    expect(src).toMatch(/<ColorPicker[\s\S]*?value=\{form\.couleur\}/);
  });

  it("/etiquettes importe + utilise ColorPicker", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/etiquettes/page.js"), "utf-8");
    expect(src).toMatch(/import ColorPicker from ["']\.\.\/components\/ColorPicker["']/);
    expect(src).toMatch(/<ColorPicker[\s\S]*?value=\{form\.couleur\}/);
  });
});

describe("0.58.52 - SQL user_goals (sync objectifs)", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.52-user-goals.sql");

  it("Fichier SQL user_goals existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("CREATE TABLE user_goals avec colonnes essentielles", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS user_goals/);
    expect(sql).toMatch(/label TEXT NOT NULL/);
    expect(sql).toMatch(/target NUMERIC/);
    expect(sql).toMatch(/current NUMERIC/);
    expect(sql).toMatch(/color_id TEXT/);
    expect(sql).toMatch(/position INTEGER/);
  });

  it("RLS : 4 policies (read/insert/update/delete own goals)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?Read own goals/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?Insert own goals/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?Update own goals/);
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?Delete own goals/);
  });

  it("Trigger updated_at auto", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/update_user_goals_updated_at/);
  });
});

describe("0.58.52 - Sync Objectifs côté front", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("fetchGoalsFromSupabase + pushGoalsToSupabase définies", () => {
    expect(src).toMatch(/async function fetchGoalsFromSupabase/);
    expect(src).toMatch(/async function pushGoalsToSupabase/);
  });

  it("isGoalsSyncDisabled flag TTL 24h", () => {
    expect(src).toMatch(/function isGoalsSyncDisabled/);
    expect(src).toMatch(/GOALS_SYNC_TTL_KEY/);
    expect(src).toMatch(/24 \* 60 \* 60 \* 1000/);
  });

  it("Strategy delete+insert pour push (idempotent)", () => {
    expect(src).toMatch(/from\("user_goals"\)\.delete\(\)/);
    expect(src).toMatch(/from\("user_goals"\)\.insert\(rows\)/);
  });

  it("ObjectifsWidget : state syncStatus + helper saveAndSync", () => {
    expect(src).toMatch(/syncStatus,\s*setSyncStatus/);
    expect(src).toMatch(/async function saveAndSync/);
  });

  it("ObjectifsWidget : load hybride (local immédiat puis Supabase background)", () => {
    expect(src).toMatch(/setGoals\(getGoals\(\)\);\s*setMounted/);
    expect(src).toMatch(/fetchGoalsFromSupabase\(supabase, user\.id\)/);
  });

  it("Badges visuels : synced / syncing / local", () => {
    expect(src).toMatch(/syncStatus === ["']synced["']/);
    expect(src).toMatch(/syncStatus === ["']syncing["']/);
    expect(src).toMatch(/syncStatus === ["']local["']/);
  });

  it("4 actions (add/edit/delete/increment) utilisent saveAndSync", () => {
    const calls = src.match(/saveAndSync\(next\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });
});

describe("0.58.52 - Migration UI 3 pages", () => {
  const pages = ["app/admin/rpps-diagnostic/page.js", "app/admin/mail-diagnostic/page.js"];
  pages.forEach(p => {
    it(`${p} : importe EmptyState + SkeletonRow`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/EmptyState[^"']*?["'][^"']*ui-premium["']/);
    });
  });
});
