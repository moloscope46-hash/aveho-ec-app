// =============================================================
//  Tests unitaires — 0.58.61
//  Notif persistante + Trajet pharmacie + Drag&drop dashboard peaufiné + Refonte changelog tuiles + max tags
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.61 - Version", () => {
  it("Version 0.58.61+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(61);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.61 - Notification persistante goal atteint", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardWidgets.js"), "utf-8");

  it("Insert dans table notifications après le toast", () => {
    expect(src).toMatch(/from\(["']notifications["']\)\.insert/);
    expect(src).toMatch(/objectif_atteint/);
  });

  it("Dédup via localStorage av-team-goals-notified", () => {
    expect(src).toMatch(/av-team-goals-notified/);
    expect(src).toMatch(/notified\.includes\(goalId\)/);
  });

  it("Récupère structure_id depuis membres_structure", () => {
    expect(src).toMatch(/from\(["']membres_structure["']\)[\s\S]*?structure_id/);
  });

  it("Lien vers /accueil + titre 🎯 Objectif d'équipe atteint", () => {
    expect(src).toMatch(/lien:\s*["']\/accueil["']/);
    expect(src).toMatch(/Objectif d'équipe atteint/);
  });

  it("Garde max 100 entrées (slice -100)", () => {
    expect(src).toMatch(/notified\.length > 100/);
    expect(src).toMatch(/slice\(-100\)/);
  });
});

describe("0.58.61 - Trajet pharmacie de garde la plus proche", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");

  it("Calcul Haversine pour distance user/pharmacie", () => {
    expect(src).toMatch(/Haversine|R = 6371/);
    expect(src).toMatch(/Math\.asin\(Math\.sqrt\(a\)\)/);
  });

  it("Distance affichée dans le popup (km ou m)", () => {
    expect(src).toMatch(/ti-route/);
    expect(src).toMatch(/À \$\{distLabel\} de vous/);
  });

  it("Bouton Itinéraire ouvre Google Maps directions", () => {
    expect(src).toMatch(/google\.com\/maps\/dir\/\?api=1/);
    expect(src).toMatch(/travelmode=driving/);
  });

  it("Bouton fallback 'Voir sur Google Maps' si pas de position", () => {
    expect(src).toMatch(/google\.com\/maps\/search\/\?api=1/);
  });

  it("Bouton 'Pharmacie de garde la plus proche' dans la sidebar", () => {
    expect(src).toMatch(/Pharmacie de garde la plus proche/);
    expect(src).toMatch(/distances\.sort\(\(a, b\) => a\.d - b\.d\)/);
  });

  it("Zoom map.setView sur la pharmacie trouvée", () => {
    expect(src).toMatch(/map\.setView\(\[nearest\.p\.latitude, nearest\.p\.longitude\]/);
  });
});

describe("0.58.61 - Drag&drop dashboard peaufiné", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Box-shadow accent au drag (lifted) et drop target", () => {
    expect(src).toMatch(/0 14px 30px \$\{meta\.color\}44/);
    expect(src).toMatch(/0 8px 22px \$\{meta\.color\}55/);
  });

  it("Outline solid (pas dashed) sur le drop target", () => {
    expect(src).toMatch(/`3px solid \$\{meta\.color\}`/);
  });

  it("Ligne d'insertion teal pulsante au-dessus du drop target", () => {
    expect(src).toMatch(/av-drop-line-pulse/);
    expect(src).toMatch(/editLayout && isDragOver && \(/);
    expect(css).toMatch(/@keyframes av-drop-line-pulse/);
  });

  it("Transform scale 0.98 sur l'élément en cours de drag", () => {
    expect(src).toMatch(/isDragged[\s\S]{0,30}scale\(0\.98\)/);
  });

  it("Transition plus douce (280ms cubic-bezier)", () => {
    expect(src).toMatch(/transform 280ms cubic-bezier/);
  });
});

describe("0.58.61 - Refonte page changelog : vue tuiles", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("State viewMode persisté en localStorage", () => {
    expect(src).toMatch(/const \[viewMode, setViewMode\]/);
    expect(src).toMatch(/av-changelog-view/);
  });

  it("Toggle Liste / Tuiles avec icônes ti-list + ti-layout-grid", () => {
    expect(src).toMatch(/ti-list[\s\S]{0,40}Liste/);
    expect(src).toMatch(/ti-layout-grid[\s\S]{0,40}Tuiles/);
  });

  it("Grid CSS auto-fill 320px minimum en mode tuiles", () => {
    expect(src).toMatch(/repeat\(auto-fill, minmax\(320px, 1fr\)\)/);
  });

  it("Dot timeline caché en mode tuiles (viewMode === 'list' && ...)", () => {
    expect(src).toMatch(/viewMode === ["']list["'] && \(/);
  });

  it("Card height 100% en mode tuiles pour grille uniforme", () => {
    expect(src).toMatch(/height: viewMode === ["']tiles["'] \? ["']100%["']/);
  });
});

describe("0.58.61 - Nouveaux tags THEME_LABELS", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-index.js"), "utf-8");

  it("Nouveau tag 'feature' (Nouvelle Feature)", () => {
    expect(src).toMatch(/["']feature["']:\s*\{[\s\S]*?Nouvelle Feature/);
  });

  it("Nouveau tag 'wow' (Wow effect ✨)", () => {
    expect(src).toMatch(/["']wow["']:\s*\{[\s\S]*?Wow effect/);
  });

  it("Nouveau tag 'team' (Équipe & Collab)", () => {
    expect(src).toMatch(/["']team["']:\s*\{[\s\S]*?Équipe/);
  });

  it("Nouveau tag 'dashboard' (Dashboard & Widgets)", () => {
    expect(src).toMatch(/["']dashboard["']:\s*\{[\s\S]*?Dashboard/);
  });

  it("Nouveau tag 'objectifs' (Objectifs)", () => {
    expect(src).toMatch(/["']objectifs["']:\s*\{[\s\S]*?Objectifs/);
  });

  it("Nouveau tag 'pharmacie' (Pharmacies)", () => {
    expect(src).toMatch(/["']pharmacie["']:\s*\{[\s\S]*?Pharmacies/);
  });

  it("Nouveau tag 'carte' (Carte interactive)", () => {
    expect(src).toMatch(/["']carte["']:\s*\{[\s\S]*?Carte/);
  });

  it("Nouveau tag 'dnd' (Drag & Drop)", () => {
    expect(src).toMatch(/["']dnd["']:\s*\{[\s\S]*?Drag/);
  });

  it("Nouveau tag 'mobile' + 'animation' + 'menu' + 'partenaires'", () => {
    expect(src).toMatch(/["']mobile["']:\s*\{/);
    expect(src).toMatch(/["']animation["']:\s*\{/);
    expect(src).toMatch(/["']menu["']:\s*\{/);
    expect(src).toMatch(/["']partenaires["']:\s*\{/);
  });

  it("Au moins 30 tags au total", () => {
    const matches = src.match(/^\s*"[a-z_]+":\s*\{/gm);
    expect(matches.length).toBeGreaterThanOrEqual(30);
  });
});

describe("0.58.61 - Thèmes enrichis dans 0.58.59 + 0.58.60", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");

  it("0.58.60 a au moins 8 tags", () => {
    const v60Match = src.match(/"v":\s*"0\.58\.60"[\s\S]*?"themes":\s*(\[[^\]]+\])/);
    expect(v60Match).toBeTruthy();
    const themes = JSON.parse(v60Match[1]);
    expect(themes.length).toBeGreaterThanOrEqual(8);
  });

  it("0.58.59 a au moins 8 tags", () => {
    const v59Match = src.match(/"v":\s*"0\.58\.59"[\s\S]*?"themes":\s*(\[[^\]]+\])/);
    expect(v59Match).toBeTruthy();
    const themes = JSON.parse(v59Match[1]);
    expect(themes.length).toBeGreaterThanOrEqual(8);
  });
});
