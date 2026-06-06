// =============================================================
//  Tests unitaires — 0.58.57
//  Pharmacies + Modal équipe + Widget Team Goals + Filtre ctx transferts
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.57 - Version", () => {
  it("Version 0.58.57+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(57);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.57 - SQL pharmacies + depots.batiment_id", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.57-pharmacies-depots-batiment.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("Crée la table pharmacies avec colonnes essentielles", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS pharmacies/);
    expect(sql).toMatch(/horaires JSONB/);
    expect(sql).toMatch(/garde_disponible BOOLEAN/);
    expect(sql).toMatch(/specialites TEXT\[\]/);
    expect(sql).toMatch(/finess TEXT/);
  });

  it("RLS activée + 2 policies (read + manage admin)", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/Read pharmacies in own structure/);
    expect(sql).toMatch(/Manage pharmacies \(admin\)/);
  });

  it("Trigger updated_at auto", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/update_pharmacies_updated_at/);
  });

  it("Ajoute depots.batiment_id pour filtrage ctx", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE depots/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS batiment_id UUID REFERENCES batiments/);
  });
});

describe("0.58.57 - Page /pharmacies", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/pharmacies/page.js"), "utf-8");

  it("Page existe + export default", () => {
    expect(src).toMatch(/export default function PharmaciesPage/);
  });

  it("CRUD : newPharmacie + editPharmacie + savePharmacie + archivePharmacie", () => {
    expect(src).toMatch(/function newPharmacie/);
    expect(src).toMatch(/function editPharmacie/);
    expect(src).toMatch(/async function savePharmacie/);
    expect(src).toMatch(/async function archivePharmacie/);
  });

  it("Horaires : structure JSONB + editor par jour avec time pickers", () => {
    expect(src).toMatch(/JOURS_SEMAINE\s*=\s*\["lundi"/);
    expect(src).toMatch(/type="time"[\s\S]*?plage\.open/);
    expect(src).toMatch(/Ajouter plage/);
  });

  it("isOpenNow : calcule l'ouverture en temps réel", () => {
    expect(src).toMatch(/function isOpenNow/);
    expect(src).toMatch(/new Date\(\)/);
    expect(src).toMatch(/nowMins >= /);
  });

  it("Mini-planning hebdo (Lun→Dim avec couleur ouvert/fermé)", () => {
    expect(src).toMatch(/JOURS_SEMAINE\.map\(j => \{[\s\S]*?getDayStatus/);
  });

  it("Spécialités : LPP, VPH, oxygénothérapie, etc.", () => {
    expect(src).toMatch(/SPECIALITES/);
    expect(src).toMatch(/k:\s*["']lpp["']/);
    expect(src).toMatch(/k:\s*["']vph["']/);
    expect(src).toMatch(/k:\s*["']oxygenotherapie["']/);
  });

  it("Garde : checkboxes garde_disponible + garde_24h + notes", () => {
    expect(src).toMatch(/garde_disponible/);
    expect(src).toMatch(/garde_24h/);
    expect(src).toMatch(/garde_notes/);
  });

  it("Import FINESS avec category pharma_lpp pré-filtrée", () => {
    expect(src).toMatch(/defaultCategories=\{\["pharma_lpp"\]\}/);
  });

  it("Badge OUVERTE/FERMÉE temps réel sur les cartes", () => {
    expect(src).toMatch(/isOpen \? "OUVERTE" : "FERMÉE"/);
  });

  it("Filtres : all / officine / PUI / LPP / garde", () => {
    expect(src).toMatch(/k:\s*["']officine["']/);
    expect(src).toMatch(/k:\s*["']PUI["']/);
    expect(src).toMatch(/k:\s*["']garde["']/);
  });
});

describe("0.58.57 - Menu : item /pharmacies au lieu de ?type=pharmacie", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");

  it("/pharmacies dans la section Mes partenaires", () => {
    expect(src).toMatch(/p:\s*["']\/pharmacies["']/);
    expect(src).toMatch(/lbl:\s*["']Pharmacies["']/);
  });
});

describe("0.58.57 - Modal sélection équipe (remplace prompt)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("State teamPickerOpen + teamPickerGoal + availableTeams", () => {
    expect(src).toMatch(/const \[teamPickerOpen, setTeamPickerOpen\]/);
    expect(src).toMatch(/const \[teamPickerGoal, setTeamPickerGoal\]/);
    expect(src).toMatch(/const \[availableTeams, setAvailableTeams\]/);
  });

  it("Plus de dialogs.prompt avec teamsList numéroté", () => {
    expect(src).not.toMatch(/Tape le numéro/);
  });

  it("setTeamPickerOpen(true) au lieu de prompt si plusieurs équipes", () => {
    expect(src).toMatch(/setAvailableTeams\(memb\.map/);
    expect(src).toMatch(/setTeamPickerOpen\(true\)/);
  });

  it("function pickTeam définie + ferme le modal", () => {
    expect(src).toMatch(/function pickTeam/);
  });

  it("Modal overlay avec liste équipes + badge couleur", () => {
    expect(src).toMatch(/Partager avec une équipe/);
    expect(src).toMatch(/availableTeams\.map\(team => \(/);
    expect(src).toMatch(/team\.couleur/);
  });
});

describe("0.58.57 - Widget TeamGoalsWidget (objectifs équipe partagés)", () => {
  const widgets = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");
  const layout = fs.readFileSync(path.resolve(process.cwd(), "lib/dashboardLayout.js"), "utf-8");
  const accueil = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Export named TeamGoalsWidget", () => {
    expect(widgets).toMatch(/export function TeamGoalsWidget/);
  });

  it("Query : user_goals où shared=true + team_id IN mes équipes + user_id != moi", () => {
    expect(widgets).toMatch(/eq\(["']shared["'], true\)/);
    expect(widgets).toMatch(/\.in\(["']team_id["'], teamIds\)/);
    expect(widgets).toMatch(/\.neq\(["']user_id["'], user\.id\)/);
  });

  it("Enrich avec ownerName (jointure membres_structure)", () => {
    expect(widgets).toMatch(/ownerName:\s*ownersMap/);
  });

  it("Widget enregistré dans ALL_WIDGETS avec id 'objectifs-equipe'", () => {
    expect(layout).toMatch(/id:\s*["']objectifs-equipe["']/);
    expect(layout).toMatch(/icon:\s*["']ti-users-group["']/);
  });

  it("Widget opt-in (DEFAULT_ACTIVE false)", () => {
    expect(layout).toMatch(/["']objectifs-equipe["']:\s*false/);
  });

  it("Render dans /accueil via wrapWithDrag", () => {
    expect(accueil).toMatch(/k === ["']objectifs-equipe["']/);
    expect(accueil).toMatch(/<TeamGoalsWidget \/>/);
  });

  it("Card affiche ownerName + team.nom avec couleur d'équipe", () => {
    expect(widgets).toMatch(/g\.ownerName/);
    expect(widgets).toMatch(/g\.team\?\.couleur/);
  });
});

describe("0.58.57 - Filtre ctx /transferts via depots.batiment_id", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");

  it("Import useCurrentContext", () => {
    expect(src).toMatch(/import \{ useCurrentContext \}/);
  });

  it("State depotsCtx (Set des depot_ids du bât actif)", () => {
    expect(src).toMatch(/const \[depotsCtx, setDepotsCtx\]/);
  });

  it("Charge les dépôts du bâtiment via depots.batiment_id", () => {
    expect(src).toMatch(/\.from\(["']depots["']\)\.select\(["']id["']\)\.eq\(["']batiment_id["']/);
  });

  it("Filter rows : src_type=depot OR dst_type=depot dans le bâtiment", () => {
    expect(src).toMatch(/srcMatch = r\.src_type === ["']depot["']/);
    expect(src).toMatch(/dstMatch = r\.dst_type === ["']depot["']/);
  });

  it("Indicateur visuel 'Filtré sur le bâtiment'", () => {
    expect(src).toMatch(/Filtré sur le bâtiment/);
  });

  it("Empty state contextuel si filtre actif", () => {
    expect(src).toMatch(/Aucun transfert dans ce bâtiment/);
  });
});
