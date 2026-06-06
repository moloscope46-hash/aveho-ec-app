// =============================================================
//  Tests unitaires — 0.58.63
//  Filtre equipe sur 4 pages restantes + EquipeSelector + Sparkline 7j + Tri tuiles + Pharmacies rattachement
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.63 - Version", () => {
  it("Version 0.58.63+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(63);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.63 - SQL pharmacies rattachement bât/svc/équipe", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.63-pharmacies-rattachement.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("ALTER pharmacies ADD batiment_id + service_id + equipe_id", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS batiment_id UUID/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS service_id UUID/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS equipe_id UUID/);
  });

  it("3 index partiels sur les colonnes ajoutées", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/idx_pharmacies_batiment_id/);
    expect(sql).toMatch(/idx_pharmacies_service_id/);
    expect(sql).toMatch(/idx_pharmacies_equipe_id/);
  });
});

describe("0.58.63 - Filtre équipe sur 4 pages restantes", () => {
  it("commandes filtre equipe_id", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/commandes/page.js"), "utf-8");
    expect(src).toMatch(/ctx\.equipeId && c\.equipe_id !== ctx\.equipeId/);
  });

  it("achats filtre equipe_id", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");
    expect(src).toMatch(/ctx\.equipeId && r\.equipe_id !== ctx\.equipeId/);
  });

  it("signalements filtre equipe_id", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/signalements/page.js"), "utf-8");
    expect(src).toMatch(/ctx\.equipeId && r\.equipe_id !== ctx\.equipeId/);
  });

  it("transferts filtre equipe_id", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");
    expect(src).toMatch(/ctx\.equipeId && r\.equipe_id !== ctx\.equipeId/);
  });
});

describe("0.58.63 - Composant EquipeSelector réutilisable", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/EquipeSelector.js"), "utf-8");

  it("Export default function EquipeSelector", () => {
    expect(src).toMatch(/export default function EquipeSelector/);
  });

  it("Props value / onChange / structureId / batimentId / label", () => {
    expect(src).toMatch(/value,\s*onChange,\s*structureId\s*=\s*null,\s*batimentId\s*=\s*null,\s*label/);
  });

  it("Charge équipes par batiment_id ou structure_id (fallback)", () => {
    expect(src).toMatch(/from\(["']equipes["']\)/);
    expect(src).toMatch(/\.eq\(["']batiment_id["'], batimentId\)/);
  });

  it("Icône ti-users-group + couleur de l'équipe sélectionnée", () => {
    expect(src).toMatch(/ti-users-group/);
    expect(src).toMatch(/current\?\.couleur \|\| ["']#7a6fb0["']/);
  });
});

describe("0.58.63 - EquipeSelector intégré dans 3 formulaires", () => {
  it("/patients formulaire utilise EquipeSelector", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/<EquipeSelector/);
    expect(src).toMatch(/equipe_id: form\.equipe_id \|\| null/);
  });

  it("/interventions formulaire utilise EquipeSelector", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/<EquipeSelector/);
    expect(src).toMatch(/equipe_id: form\.equipe_id \|\| null/);
  });

  it("/materiels rel.equipe_id populated via Crud", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiels/page.js"), "utf-8");
    expect(src).toMatch(/equipe_id:\s*\(eqs \|\| \[\]\)\.map/);
  });
});

describe("0.58.63 - TeamGoalsSparkline 7 jours", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamGoalsSparkline.js"), "utf-8");

  it("Composant existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/components/TeamGoalsSparkline.js"))).toBe(true);
  });

  it("Snapshot localStorage av-team-goals-history-7d (MAX_DAYS=7)", () => {
    expect(src).toMatch(/av-team-goals-history-7d/);
    expect(src).toMatch(/MAX_DAYS\s*=\s*7/);
  });

  it("SVG sparkline avec polyline + aire dégradée", () => {
    expect(src).toMatch(/<polyline/);
    expect(src).toMatch(/<polygon/);
    expect(src).toMatch(/sparkline-gradient/);
  });

  it("Trend (+/- pts) avec couleur adaptative", () => {
    expect(src).toMatch(/trendColor.*=.*trend > 0/);
    expect(src).toMatch(/ti-trending-/);
  });

  it("Integré dans TeamGoalsWidget", () => {
    const widgetSrc = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");
    expect(widgetSrc).toMatch(/import TeamGoalsSparkline/);
    expect(widgetSrc).toMatch(/<TeamGoalsSparkline[\s\S]*?stats=\{stats\}[\s\S]*?totalGoals=\{teamGoals\.length\}/);
  });
});

describe("0.58.63 - Filtres avancés Vue Tuiles changelog", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("State sortMode persisté en localStorage", () => {
    expect(src).toMatch(/const \[sortMode, setSortMode\]/);
    expect(src).toMatch(/av-changelog-sort/);
  });

  it("4 modes de tri : version-desc / version-asc / date-desc / tags-desc", () => {
    expect(src).toMatch(/sortMode === ["']version-asc["']/);
    expect(src).toMatch(/sortMode === ["']date-desc["']/);
    expect(src).toMatch(/sortMode === ["']tags-desc["']/);
  });

  it("Parser FR pour date-desc (mois français)", () => {
    expect(src).toMatch(/janvier.*février.*mars/);
  });

  it("Sélecteur UI avec icône ti-arrows-sort", () => {
    expect(src).toMatch(/ti-arrows-sort/);
  });
});

describe("0.58.63 - Pharmacies rattachement bât/svc/équipe", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/pharmacies/page.js"), "utf-8");

  it("Payload save inclut batiment_id + service_id + equipe_id", () => {
    expect(src).toMatch(/batiment_id: form\.batiment_id \|\| null/);
    expect(src).toMatch(/service_id: form\.service_id \|\| null/);
    expect(src).toMatch(/equipe_id: form\.equipe_id \|\| null/);
  });

  it("3 sélecteurs dans le modal (Bâtiment cascade vers Service)", () => {
    expect(src).toMatch(/Rattachement \(filtre TopBar\)/);
    expect(src).toMatch(/disabled=\{!form\.batiment_id\}/);
  });

  it("Import EquipeSelector + state batiments/services + fetch", () => {
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/const \[batiments, setBatiments\]/);
    expect(src).toMatch(/const \[services, setServices\]/);
  });

  it("Fetch via etages pour rattacher service à batiment", () => {
    expect(src).toMatch(/from\(["']etages["']\)\.select\(["']id, batiment_id["']\)/);
  });

  it("newPharmacie initialise batiment_id/service_id/equipe_id à null", () => {
    expect(src).toMatch(/batiment_id: null,\s*service_id: null,\s*equipe_id: null/);
  });
});
