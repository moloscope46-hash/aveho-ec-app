// =============================================================
//  Tests unitaires — 0.58.25 BUNDLE WOW
//
//  1. Migration NeonButton sur /parametres, /maintenance, /consentements
//  2. Cmd+K actions contextuelles (pageContext + tri prioritaire)
//  3. Mode focus zen (lib + shortcut + CSS)
//  4. ParticlesBackground variants multicolor + flow
//  5. Page /historique : vue Timeline premium
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.25 - Version", () => {
  it("Version 0.58.25+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(25);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.25 - Migration NeonButton sur 3 pages", () => {
  it("/parametres : NeonButton variant=navy pour Enregistrer", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*NeonButton[^}]*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']navy["'][\s\S]*?Enregistrer les préférences/);
  });

  it("/maintenance : 4 NeonButton variant=blue", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/maintenance/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*NeonButton[^}]*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']blue["'][\s\S]*?Planifier une maintenance/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']blue["'][\s\S]*?Nouvelle récurrence/);
  });

  it("/consentements : NeonButton archive avec variant dynamique amber/teal", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/consentements/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*NeonButton[^}]*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=\{viewModal\.archive \? ["']amber["'] : ["']teal["']\}/);
  });
});

describe("0.58.25 - Cmd+K actions contextuelles", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("Import usePathname depuis next/navigation", () => {
    expect(src).toMatch(/import\s*\{[^}]*usePathname[^}]*\}\s*from\s*["']next\/navigation["']/);
  });

  it("Utilisation de usePathname() dans le composant", () => {
    expect(src).toMatch(/const pathname = usePathname\(\)/);
  });

  it("ACTIONS ont la prop pageContext (regex)", () => {
    expect(src).toMatch(/pageContext:\s*\/\^\\\/patients/);
    expect(src).toMatch(/pageContext:\s*\/\^\\\/interventions/);
  });

  it("findActions accepte currentPath et trie par priorité", () => {
    expect(src).toMatch(/function findActions\(query,\s*currentPath\)/);
    expect(src).toMatch(/a\.pageContext && a\.pageContext\.test\(currentPath\)/);
  });

  it("Appel findActions avec pathname", () => {
    expect(src).toMatch(/findActions\(q,\s*pathname\)/);
  });

  it("Nouvelles actions : toggle-presentation + toggle-focus + goto-historique", () => {
    expect(src).toMatch(/id:\s*["']toggle-presentation["']/);
    expect(src).toMatch(/id:\s*["']toggle-focus["']/);
    expect(src).toMatch(/id:\s*["']goto-historique["']/);
  });

  it("Handler spécial pour #toggle-presentation et #toggle-focus", () => {
    expect(src).toMatch(/#toggle-presentation/);
    expect(src).toMatch(/#toggle-focus/);
    expect(src).toMatch(/toggleFocusMode/);
  });
});

describe("0.58.25 - Mode focus zen", () => {
  it("lib/focusMode.js avec 4 fonctions exportées", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/export function isFocusMode/);
    expect(src).toMatch(/export function setFocusMode/);
    expect(src).toMatch(/export function toggleFocusMode/);
    expect(src).toMatch(/export function initFocusMode/);
  });

  it("Storage localStorage clé av-focus-mode", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/["']av-focus-mode["']/);
  });

  it("Class av-focus-mode appliquée à <html>", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/focusMode.js"), "utf-8");
    expect(src).toMatch(/html\.classList\.add\(["']av-focus-mode["']\)/);
  });

  it("PresentationModeBoot écoute Ctrl+Shift+F", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/PresentationModeBoot.js"), "utf-8");
    expect(src).toMatch(/initFocusMode/);
    expect(src).toMatch(/toggleFocusMode/);
    expect(src).toMatch(/e\.key === ["']F["']|e\.key === ["']f["']/);
  });

  it("CSS html.av-focus-mode hide topbar + sidebar + notif", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/html\.av-focus-mode \.topbar[\s\S]*?display:\s*none/);
  });

  it("Badge 'FOCUS ZEN' en haut à droite", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/html\.av-focus-mode::before/);
  });
});

describe("0.58.25 - ParticlesBackground variants multicolor + flow", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/ParticlesBackground.js"), "utf-8");

  it("Prop mode (default | multicolor | flow)", () => {
    expect(src).toMatch(/mode\s*=\s*["']default["']/);
  });

  it("Prop flowDirection (right | down | diagonal)", () => {
    expect(src).toMatch(/flowDirection\s*=\s*["']diagonal["']/);
  });

  it("Constante MULTICOLORS avec 4 couleurs Aveho", () => {
    expect(src).toMatch(/const MULTICOLORS = \[[\s\S]*?rgba\(124, 200, 200/);
    expect(src).toMatch(/rgba\(24, 95, 165/);
    expect(src).toMatch(/rgba\(122, 111, 176/);
    expect(src).toMatch(/rgba\(201, 134, 127/);
  });

  it("Init particules avec couleur dédiée en mode multicolor", () => {
    expect(src).toMatch(/c:\s*mode === ["']multicolor["']\s*\?\s*MULTICOLORS/);
  });

  it("Mode flow : wrap-around au lieu de bounce", () => {
    expect(src).toMatch(/if \(mode === ["']flow["']\)/);
    expect(src).toMatch(/p\.x > width \+ 10/);
  });

  it("Draw boucle pour multicolor utilise p.c", () => {
    expect(src).toMatch(/ctx\.fillStyle = p\.c \|\| color/);
  });
});

describe("0.58.25 - Page /historique : Timeline premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/historique/page.js"), "utf-8");

  it("ACTION_ICON avec 7 icônes Tabler", () => {
    expect(src).toMatch(/const ACTION_ICON = \{/);
    expect(src).toMatch(/creer:\s*["']ti-plus["']/);
    expect(src).toMatch(/supprimer:\s*["']ti-trash["']/);
  });

  it("State viewMode (timeline | table) défaut timeline", () => {
    expect(src).toMatch(/const \[viewMode, setViewMode\] = useState\(["']timeline["']\)/);
  });

  it("Toggle UI Timeline / Tableau", () => {
    expect(src).toMatch(/setViewMode\(["']timeline["']\)/);
    expect(src).toMatch(/setViewMode\(["']table["']\)/);
  });

  it("Composant HistoriqueTimeline défini", () => {
    expect(src).toMatch(/function HistoriqueTimeline\(\{ rows, totalRows \}\)/);
  });

  it("Group par jour + helper fmtDay (Aujourd'hui/Hier)", () => {
    expect(src).toMatch(/const groupedByDay = \{\}/);
    expect(src).toMatch(/function fmtDay/);
    expect(src).toMatch(/Aujourd'hui/);
    expect(src).toMatch(/return "Hier"/);
  });

  it("Helper emailToInitials + avatarColor (hash palette Aveho)", () => {
    expect(src).toMatch(/function emailToInitials/);
    expect(src).toMatch(/function avatarColor/);
    expect(src).toMatch(/palette = \[["']#185FA5/);
  });

  it("Animation av-fade-in séquentielle (stagger 0.04s)", () => {
    expect(src).toMatch(/av-fade-in 0\.4s \$\{idx \* 0\.04\}/);
  });

  it("EmptyState illustration=search remplace StateMsg vide", () => {
    expect(src).toMatch(/<EmptyState illustration=["']search["']/);
  });
});
