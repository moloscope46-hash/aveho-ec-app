// =============================================================
//  Tests unitaires — 0.58.62
//  FIX build nested-jsx + Filtre équipe sur patients/inter/materiels + Export PDF stats
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.62 - Version", () => {
  it("Version 0.58.62+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(62);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.62 - FIX nested styled-jsx FloatingActionBar (build Vercel)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");

  it("Un seul bloc <style jsx global> dans le composant", () => {
    const matches = src.match(/<style jsx global>/g) || [];
    expect(matches.length).toBe(1);
  });

  it("Le keyframe av-popup-fade-in est dans le bloc consolidé", () => {
    expect(src).toMatch(/av-popup-fade-in/);
  });

  it("Le keyframe av-fab-pulse est conservé", () => {
    expect(src).toMatch(/av-fab-pulse/);
  });
});

describe("0.58.62 - SQL equipe_id sur patients/interventions/materiels", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.62-equipe-id-patients-interventions-materiels.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("ALTER patients ADD COLUMN equipe_id", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE patients[\s\S]*?ADD COLUMN IF NOT EXISTS equipe_id UUID/);
  });

  it("ALTER interventions ADD COLUMN equipe_id", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE interventions[\s\S]*?ADD COLUMN IF NOT EXISTS equipe_id UUID/);
  });

  it("ALTER materiels ADD COLUMN equipe_id", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE materiels[\s\S]*?ADD COLUMN IF NOT EXISTS equipe_id UUID/);
  });

  it("Index sur equipe_id pour accélérer les filtres", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_patients_equipe_id/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_interventions_equipe_id/);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_materiels_equipe_id/);
  });
});

describe("0.58.62 - useContextPatientIds étendu avec equipeId", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/useContextPatientIds.js"), "utf-8");

  it("Active aussi le filtre si une équipe est sélectionnée", () => {
    expect(src).toMatch(/!ctx\.batimentId && !ctx\.serviceId && !ctx\.equipeId/);
  });

  it("Cas équipe seule : filtre patients directement par equipe_id", () => {
    expect(src).toMatch(/ctx\.equipeId && !ctx\.serviceId && !ctx\.batimentId/);
    expect(src).toMatch(/\.eq\(["']equipe_id["'], ctx\.equipeId\)/);
  });

  it("Combine équipe + bât/svc : intersection avec patients.equipe_id", () => {
    expect(src).toMatch(/patQuery\.eq\(["']equipe_id["'], ctx\.equipeId\)/);
  });

  it("useEffect a ctx.equipeId dans les deps", () => {
    expect(src).toMatch(/\[ctx\.active, ctx\.batimentId, ctx\.serviceId, ctx\.equipeId\]/);
  });
});

describe("0.58.62 - Filtre équipe dans /patients", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");

  it("Filtre actif si ctxFilter.equipeId", () => {
    expect(src).toMatch(/ctxFilter\.active && ctxFilter\.equipeId && r\.equipe_id !== ctxFilter\.equipeId/);
  });
});

describe("0.58.62 - Filtre équipe dans /interventions", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");

  it("Filtre actif si ctx.equipeId", () => {
    expect(src).toMatch(/ctx\.active && ctx\.equipeId && r\.equipe_id !== ctx\.equipeId/);
  });
});

describe("0.58.62 - Filtre équipe dans /materiels", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");

  it("extraFilter combine bât/svc + équipe", () => {
    expect(src).toMatch(/ctx\.equipeId && r\.equipe_id !== ctx\.equipeId/);
  });
});

describe("0.58.62 - Export PDF stats équipe", () => {
  it("Composant TeamStatsPdfExport existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/components/TeamStatsPdfExport.js"))).toBe(true);
  });

  it("Composant utilise window.open + window.print", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamStatsPdfExport.js"), "utf-8");
    expect(src).toMatch(/window\.open/);
    expect(src).toMatch(/window\.print/);
  });

  it("Génère HTML avec stats globales (Moyenne / Atteints / Taux)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamStatsPdfExport.js"), "utf-8");
    expect(src).toMatch(/Moyenne d'avancement/);
    expect(src).toMatch(/Objectifs atteints/);
    expect(src).toMatch(/Taux d'atteinte/);
  });

  it("Inclut table 'Par équipe' si plusieurs équipes", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamStatsPdfExport.js"), "utf-8");
    expect(src).toMatch(/stats\.teamStats && stats\.teamStats\.length > 1/);
  });

  it("Inclut table 'Détail des objectifs' avec progress bars", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamStatsPdfExport.js"), "utf-8");
    expect(src).toMatch(/Détail des objectifs/);
    expect(src).toMatch(/progress-fill/);
  });

  it("Import + usage dans DashboardWidgets", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");
    expect(src).toMatch(/import TeamStatsPdfExport/);
    expect(src).toMatch(/<TeamStatsPdfExport[\s\S]*?stats=\{stats\}[\s\S]*?teamGoals=\{teamGoals\}/);
  });
});

describe("0.58.62 - Notif persistante goal atteint (régression 0.58.61)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Insert dans notifications + dédup localStorage", () => {
    expect(src).toMatch(/av-team-goals-notified/);
    expect(src).toMatch(/from\(["']notifications["']\)\.insert/);
  });
});
