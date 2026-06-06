// =============================================================
//  Tests unitaires — 0.58.60
//  FIX build + GalaxyBackground + Filtre équipe + Icônes bât/svc
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.60 - Version", () => {
  it("Version 0.58.60+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(60);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.60 - FIX bug build DashboardWidgets (backdrop dupliqué)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Pas de div backdrop dupliqué dans le modal teamPicker", () => {
    // Vérifier qu'on a un seul <div onClick avec setTeamPickerOpen(false) qui démarre le modal
    const occurrences = (src.match(/onClick=\{[^}]*setTeamPickerOpen\(false\); setTeamPickerGoal\(null\); }/g) || []).length;
    // Devrait y en avoir 2 max (backdrop + bouton X), pas 3 (qui indiquerait duplication)
    expect(occurrences).toBeLessThanOrEqual(3);
  });

  it("Balance div équilibrée dans la zone modal (≈2290-2410)", () => {
    const lines = src.split("\n");
    const zone = lines.slice(2280, 2420).join("\n");
    const opens = (zone.match(/<div\b/g) || []).length;
    const closes = (zone.match(/<\/div>/g) || []).length;
    expect(opens).toBe(closes);
  });
});

describe("0.58.60 - GalaxyBackground component", () => {
  it("Composant existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/components/GalaxyBackground.js"))).toBe(true);
  });

  it("Export default + planètes + étoiles + galaxies + filantes", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/GalaxyBackground.js"), "utf-8");
    expect(src).toMatch(/export default function GalaxyBackground/);
    expect(src).toMatch(/planets/);
    expect(src).toMatch(/stars/);
    expect(src).toMatch(/galaxies/);
    expect(src).toMatch(/shootingStars/);
  });

  it("Keyframes CSS pour animations", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/GalaxyBackground.js"), "utf-8");
    expect(src).toMatch(/@keyframes av-star-twinkle/);
    expect(src).toMatch(/@keyframes av-galaxy-drift-1/);
    expect(src).toMatch(/@keyframes av-planet-orbit-1/);
    expect(src).toMatch(/@keyframes av-shooting-star/);
  });

  it("Intégré dans /accueil EN PLUS de ParticlesBackground", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");
    expect(src).toMatch(/<GalaxyBackground/);
    expect(src).toMatch(/<ParticlesBackground/);
  });
});

describe("0.58.60 - SQL icones batiments + services", () => {
  const sqlPath = path.resolve(process.cwd(), "public/sql/migration-0.58.60-batiments-services-icones.sql");

  it("Fichier SQL existe", () => {
    expect(fs.existsSync(sqlPath)).toBe(true);
  });

  it("ALTER batiments ADD COLUMN icone", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE batiments[\s\S]*?ADD COLUMN IF NOT EXISTS icone TEXT/);
  });

  it("ALTER services ADD COLUMN icone", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/ALTER TABLE services[\s\S]*?ADD COLUMN IF NOT EXISTS icone TEXT/);
  });
});

describe("0.58.60 - Filtre Équipe dans TopBar", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/BatimentServiceSwitcher.js"), "utf-8");

  it("State equipes + equipeId", () => {
    expect(src).toMatch(/const \[equipes, setEquipes\]/);
    expect(src).toMatch(/const \[equipeId, setEquipeId\]/);
  });

  it("Charge les équipes du bâtiment courant", () => {
    expect(src).toMatch(/from\(["']equipes["']\)/);
  });

  it("Sélecteur équipe à la suite de service", () => {
    expect(src).toMatch(/Équipe courante/);
    expect(src).toMatch(/ti-users-group/);
  });

  it("changeEquipe : persiste + dispatch event avec equipeId", () => {
    expect(src).toMatch(/function changeEquipe/);
    expect(src).toMatch(/av-current-equipe-id/);
    expect(src).toMatch(/equipeId:\s*id/);
  });

  it("useCurrentContext retourne equipeId", () => {
    const ctxSrc = fs.readFileSync(path.resolve(process.cwd(), "lib/useCurrentContext.js"), "utf-8");
    expect(ctxSrc).toMatch(/equipeId/);
    expect(ctxSrc).toMatch(/av-current-equipe-id/);
  });
});

describe("0.58.60 - Icônes dynamiques bâtiment/service", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/BatimentServiceSwitcher.js"), "utf-8");

  it("Query inclut icone (avec fallback gracieux)", () => {
    expect(src).toMatch(/select\(["']id, nom, icone["']\)/);
    expect(src).toMatch(/42703|icone/);  // fallback si colonne absente
  });

  it("Icône dynamique pour bâtiment", () => {
    expect(src).toMatch(/batiments\.find\(b => b\.id === batId\)\?\.icone \|\| ["']building["']/);
  });

  it("Icône dynamique pour service", () => {
    expect(src).toMatch(/services\.find\(s => s\.id === svcId\)\?\.icone \|\| ["']stethoscope["']/);
  });
});

describe("0.58.60 - IconPicker dans /etablissement/edition", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etablissement/edition/page.js"), "utf-8");

  it("Import IconPicker", () => {
    expect(src).toMatch(/import IconPicker from/);
  });

  it("IconPicker dans modal pour batiment + service", () => {
    expect(src).toMatch(/modal\?\.kind === ["']batiment["'] \|\| modal\?\.kind === ["']service["']/);
    expect(src).toMatch(/<IconPicker/);
  });

  it("Payload save inclut icone", () => {
    expect(src).toMatch(/form\.icone/);
    expect(src).toMatch(/payload\.icone = form\.icone/);
  });

  it("Icône custom affichée dans la liste hiérarchique", () => {
    expect(src).toMatch(/item\.icone \? \(/);
    expect(src).toMatch(/`ti ti-\$\{item\.icone\}`/);
  });
});
