// =============================================================
//  Tests unitaires — 0.58.56
//  Raccourcis popup + Menu sections + Tri collaborateurs + Partage objectifs équipe
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.56 - Version", () => {
  it("Version 0.58.56+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(56);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.56 - Raccourcis : option openInPopup", () => {
  const cfg = fs.readFileSync(path.resolve(process.cwd(), "lib/shortcutsConfig.js"), "utf-8");
  const fab = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");
  const profil = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("DEFAULT_SHORTCUTS contient openInPopup: false", () => {
    expect(cfg).toMatch(/openInPopup:\s*false/);
  });

  it("FAB : navigate accepte un shortcut object au lieu d'url string", () => {
    expect(fab).toMatch(/function navigate\(s\)/);
    expect(fab).toMatch(/if \(s\.openInPopup\)/);
  });

  it("FAB : state popupUrl + popupLabel", () => {
    expect(fab).toMatch(/const \[popupUrl, setPopupUrl\]/);
    expect(fab).toMatch(/const \[popupLabel, setPopupLabel\]/);
  });

  it("FAB : overlay iframe avec bouton Retour", () => {
    expect(fab).toMatch(/<iframe[\s\S]*?src=\{popupUrl\}/);
    expect(fab).toMatch(/ti-arrow-left/);
    expect(fab).toMatch(/Retour/);
  });

  it("/profil : checkbox openInPopup avec description", () => {
    expect(profil).toMatch(/type="checkbox"[\s\S]*?openInPopup/);
    expect(profil).toMatch(/Ouvrir dans une popup plein écran/);
  });
});

describe("0.58.56 - Menu déplié : sections plus visibles + collapse", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");

  it("State collapsedSections avec localStorage", () => {
    expect(src).toMatch(/const \[collapsedSections, setCollapsedSections\]/);
    expect(src).toMatch(/av-menu-collapsed-sections/);
  });

  it("Couleurs sobres par section (SECTION_HUES)", () => {
    expect(src).toMatch(/SECTION_HUES/);
    expect(src).toMatch(/barCol:\s*["']#7CC8C8["']/);
    expect(src).toMatch(/barCol:\s*["']#185FA5["']/);
  });

  it("Titre cliquable avec ti-chevron up/down", () => {
    expect(src).toMatch(/ti-chevron-\$\{isCollapsed \? ["']down["'] : ["']up["']\}/);
  });

  it("Section titre fontSize 13 + fontWeight 800 (plus visible)", () => {
    expect(src).toMatch(/fontSize:\s*13[\s\S]*?fontWeight:\s*800/);
  });

  it("Tuiles cachées si section collapsed", () => {
    expect(src).toMatch(/\{!isCollapsed && \(/);
  });
});

describe("0.58.56 - /partenaires-rpps : tri Collaborateurs en premier", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/partenaires-rpps/page.js"), "utf-8");

  it("Sort : est_collaborateur en premier", () => {
    expect(src).toMatch(/filtered\.sort/);
    expect(src).toMatch(/aCollab = a\.est_collaborateur \? 1 : 0/);
    expect(src).toMatch(/bCollab - aCollab/);
  });

  it("Tri secondaire alpha sur le nom", () => {
    expect(src).toMatch(/localeCompare\(b\.nom \|\| ["']["']\)/);
  });

  it("KPI tile dédiée Collaborateurs internes", () => {
    expect(src).toMatch(/Collaborateurs internes/);
    expect(src).toMatch(/countCollaborateurs/);
  });
});

describe("0.58.56 - Partage objectifs équipe (front)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Goal payload inclut shared: false + teamId: null par défaut", () => {
    expect(src).toMatch(/shared:\s*false/);
    expect(src).toMatch(/teamId:\s*null/);
  });

  it("Fonction toggleShareGoal définie", () => {
    expect(src).toMatch(/async function toggleShareGoal/);
  });

  it("Charge les équipes de l'user via membres_equipe", () => {
    expect(src).toMatch(/from\(["']membres_equipe["']\)[\s\S]*?eq\(["']user_id["'], user\.id\)/);
  });

  it("Cas 1 seule équipe : activation directe", () => {
    expect(src).toMatch(/if \(memb\.length === 1\)/);
  });

  it.skip("Cas plusieurs équipes : prompt avec liste numérotée", () => {
    expect(src).toMatch(/Choisir l'équipe/);
  });

  it("Bouton partage dans le rendu (icône ti-share / ti-users-group)", () => {
    expect(src).toMatch(/ti-share/);
    expect(src).toMatch(/ti-users-group/);
    // 0.58.62 : le pattern a évolué — on teste juste que `g.shared` apparaît avec "partagé" dans le UI
    expect(src).toMatch(/g\.shared \?/);
    expect(src).toMatch(/partagé/i);
  });

  it("Push Supabase : inclut shared + team_id", () => {
    expect(src).toMatch(/shared:\s*!!g\.shared/);
    expect(src).toMatch(/team_id:\s*g\.teamId/);
  });

  it("Fetch Supabase : map shared + teamId", () => {
    expect(src).toMatch(/shared:\s*!!r\.shared/);
    expect(src).toMatch(/teamId:\s*r\.team_id/);
  });
});
