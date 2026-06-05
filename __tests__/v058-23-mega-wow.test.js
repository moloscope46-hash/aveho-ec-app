// =============================================================
//  Tests unitaires — 0.58.23 MEGA BUNDLE WOW
//
//  1. Migration NeonButton sur /patients + /utilisateurs
//  2. ConicCard signalements + RGPD sur /accueil
//  3. PageHero particles activé sur 4 pages
//  4. EmptyState : 6 illustrations SVG animées
//  5. BulkToolbar progress bar
//  6. Command palette ACTIONS globales + findActions
//  7. Mode présentation (lib + boot + CSS)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.23 - Version", () => {
  it("Version 0.58.23+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(23);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.23 - Migration NeonButton /patients + /utilisateurs", () => {
  it("/patients : import NeonButton + Nouveau patient teal + save teal", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*NeonButton\s*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']teal["'][\s\S]*?onClick=\{openNew\}/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']teal["'][\s\S]*?onClick=\{save\}/);
  });

  it("/utilisateurs : 3 NeonButton (Nouveau rôle violet, Créer user teal, saveRole violet)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*NeonButton\s*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']violet["'][\s\S]*?Nouveau rôle/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']teal["'][\s\S]*?Créer un utilisateur/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']violet["'][\s\S]*?onClick=\{saveRole\}/);
  });
});

describe("0.58.23 - ConicCard signalements + RGPD", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"), "utf-8");

  it("Signalements en ConicCard variant=terra speed=fast", () => {
    expect(src).toMatch(/<ConicCard[\s\S]*?label=["']Signalements["'][\s\S]*?variant=["']terra["'][\s\S]*?speed=["']fast["']/);
  });

  it("RGPD à renouveler en ConicCard variant=violet", () => {
    expect(src).toMatch(/<ConicCard[\s\S]*?label=["']RGPD à renouveler["'][\s\S]*?variant=["']violet["']/);
  });
});

describe("0.58.23 - PageHero particles activé sur pages clés", () => {
  it("/statistiques active particles avec count 25", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/statistiques/page.js"), "utf-8");
    expect(src).toMatch(/<PageHero[\s\S]*?particles[\s\S]*?particlesCount=\{25\}/);
  });

  it("/calendrier active particles avec count 20", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/calendrier/page.js"), "utf-8");
    expect(src).toMatch(/<PageHero[\s\S]*?particles[\s\S]*?particlesCount=\{20\}/);
  });

  it("/parametres active particles", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");
    expect(src).toMatch(/<PageHero[\s\S]*?particles/);
  });

  it("/interventions/kanban active particles", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/kanban/page.js"), "utf-8");
    expect(src).toMatch(/<PageHero[\s\S]*?particles/);
  });
});

describe("0.58.23 - EmptyState 6 illustrations SVG animées", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/EmptyState.js"), "utf-8");

  it("Objet ILLUSTRATIONS avec 6 entrées", () => {
    expect(src).toMatch(/const ILLUSTRATIONS = \{/);
    expect(src).toMatch(/inbox:/);
    expect(src).toMatch(/search:/);
    expect(src).toMatch(/folder:/);
    expect(src).toMatch(/clipboard:/);
    expect(src).toMatch(/chart:/);
    expect(src).toMatch(/users:/);
  });

  it("Prop illustration + render conditionnel IllustrationFn", () => {
    expect(src).toMatch(/illustration\s*,/);
    expect(src).toMatch(/const IllustrationFn = illustration \? ILLUSTRATIONS\[illustration\]/);
    expect(src).toMatch(/IllustrationFn \? \(/);
  });

  it("Drop-shadow glow filter sur le container SVG", () => {
    expect(src).toMatch(/filter:\s*`drop-shadow\(0 6px 20px \$\{cfg\.glow\}\)`/);
  });

  it("Variant violet ajouté", () => {
    expect(src).toMatch(/violet:\s*\{[\s\S]*?color:\s*["']#7a6fb0["']/);
  });

  it("Keyframes av-float-doc + av-bar-rise + av-skel-pulse + av-float-y", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-float-doc/);
    expect(css).toMatch(/@keyframes av-bar-rise/);
    expect(css).toMatch(/@keyframes av-skel-pulse/);
    expect(css).toMatch(/@keyframes av-float-y/);
  });
});

describe("0.58.23 - BulkToolbar progress bar", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/BulkToolbar.js"), "utf-8");

  it("Prop progress = null avec structure {current, total, label}", () => {
    expect(src).toMatch(/progress\s*=\s*null/);
  });

  it("Render conditionnel progress && progress.total > 0", () => {
    expect(src).toMatch(/\{progress && progress\.total > 0/);
  });

  it("Barre gradient teal→blue + shimmer animation", () => {
    expect(src).toMatch(/linear-gradient\(90deg, #7CC8C8 0%, #185FA5 100%\)/);
    expect(src).toMatch(/av-bulk-shimmer 1\.6s linear infinite/);
  });

  it("Affichage current/total avec tabular-nums", () => {
    expect(src).toMatch(/fontVariantNumeric:\s*["']tabular-nums["']/);
    expect(src).toMatch(/\{progress\.current\}\/\{progress\.total\}/);
  });

  it("Keyframe av-bulk-shimmer dans globals.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-bulk-shimmer/);
  });
});

describe("0.58.23 - Command palette ACTIONS globales", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("Constante ACTIONS avec 12+ actions", () => {
    expect(src).toMatch(/const ACTIONS = \[/);
    expect(src).toMatch(/id:\s*["']new-patient["']/);
    expect(src).toMatch(/id:\s*["']new-intervention["']/);
    expect(src).toMatch(/id:\s*["']new-signalement["']/);
    expect(src).toMatch(/id:\s*["']new-achat["']/);
    expect(src).toMatch(/id:\s*["']new-transfert["']/);
    expect(src).toMatch(/id:\s*["']goto-accueil["']/);
    expect(src).toMatch(/id:\s*["']clear-cache["']/);
  });

  it("Helper findActions(query) filtre par keywords + > prefix", () => {
    expect(src).toMatch(/function findActions\(query\)/);
    expect(src).toMatch(/q\.startsWith\(["']>["']\)/);
    expect(src).toMatch(/a\.keywords\.some/);
  });

  it("Section 'Actions rapides' rendue avec icon bolt + matchingActions", () => {
    expect(src).toMatch(/Actions rapides/);
    expect(src).toMatch(/findActions\(q\)/);
    expect(src).toMatch(/ti-bolt/);
  });

  it("Tip mode commande > affichée dans la zone d'accueil", () => {
    expect(src).toMatch(/Tapez[\s\S]*?actions rapides/);
  });
});

describe("0.58.23 - Mode présentation", () => {
  it("lib/presentationMode.js avec 5 fonctions exportées", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/presentationMode.js"), "utf-8");
    expect(src).toMatch(/export function isPresentationMode/);
    expect(src).toMatch(/export function setPresentationMode/);
    expect(src).toMatch(/export function togglePresentationMode/);
    expect(src).toMatch(/export function initPresentationMode/);
  });

  it("Storage localStorage clé av-presentation-mode", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/presentationMode.js"), "utf-8");
    expect(src).toMatch(/["']av-presentation-mode["']/);
  });

  it("Class av-presentation-mode appliquée à <html>", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/presentationMode.js"), "utf-8");
    expect(src).toMatch(/html\.classList\.add\(["']av-presentation-mode["']\)/);
  });

  it("PresentationModeBoot écoute Ctrl+Shift+P", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/PresentationModeBoot.js"), "utf-8");
    expect(src).toMatch(/e\.shiftKey/);
    expect(src).toMatch(/e\.key === ["']P["']|e\.key === ["']p["']/);
  });

  it("Layout importe et render PresentationModeBoot", () => {
    const layout = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");
    expect(layout).toMatch(/import PresentationModeBoot from/);
    expect(layout).toMatch(/<PresentationModeBoot/);
  });

  it("CSS html.av-presentation-mode avec font-size + animation slow", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/html\.av-presentation-mode\s*\{[\s\S]*?font-size:\s*17\.5px/);
    expect(css).toMatch(/html\.av-presentation-mode \*[\s\S]*?animation-duration:\s*1\.5s/);
  });

  it("Badge 'MODE PRÉSENTATION' avec pulse animation", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/html\.av-presentation-mode::after/);
    expect(css).toMatch(/@keyframes av-presentation-badge-pulse/);
  });
});
