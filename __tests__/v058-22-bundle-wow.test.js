// =============================================================
//  Tests unitaires — 0.58.22 BUNDLE WOW
//
//  1. ConicCard sur /accueil (DI à traiter + Achats à valider)
//  2. Migration NeonButton sur /interventions, /achats, /transferts, /signalements
//  3. PageHero : prop particles + variants couleur
//  4. Toast premium stack (MAX 4 + progress bar + glow)
//  5. PageTransition slide-in direction-aware
//  6. Drawer prop loading + DrawerSkeleton
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.22 - Version", () => {
  it("Version 0.58.22+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(22);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.22 - ConicCard sur /accueil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"), "utf-8");

  it("Import ConicCard depuis ui-premium", () => {
    expect(src).toMatch(/import\s*\{[^}]*ConicCard[^}]*\}\s*from\s*["']\.\.\/components\/ui-premium["']/);
  });

  it("DI à traiter en ConicCard variant=aurora (spotlight permanent)", () => {
    expect(src).toMatch(/<ConicCard[\s\S]*?label=["']DI à traiter["'][\s\S]*?variant=["']aurora["']/);
  });

  it("Achats à valider en ConicCard variant=amber", () => {
    expect(src).toMatch(/<ConicCard[\s\S]*?label=["']Achats à valider["'][\s\S]*?variant=["']amber["']/);
  });
});

describe("0.58.22 - Migration NeonButton sur 4 pages", () => {
  it("/interventions : NeonButton variant=blue pour Envoyer la demande", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*NeonButton\s*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']blue["'][\s\S]*?Envoyer la demande/);
  });

  it("/achats : NeonButton variant=amber pour Nouvelle demande", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*NeonButton\s*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']amber["'][\s\S]*?Nouvelle demande d'achat/);
  });

  it("/transferts : NeonButton variant=violet (2 boutons)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*NeonButton\s*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']violet["'][\s\S]*?Nouveau transfert/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']violet["'][\s\S]*?Créer le transfert/);
  });

  it("/signalements : NeonButton variant=teal (2 boutons)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/signalements/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*NeonButton\s*\}\s*from/);
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']teal["'][\s\S]*?Nouveau signalement/);
  });
});

describe("0.58.22 - PageHero particles prop", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/PageHero.js"), "utf-8");

  it("Import ParticlesBackground", () => {
    expect(src).toMatch(/import ParticlesBackground from ["']\.\/ParticlesBackground["']/);
  });

  it("Props particles + particlesCount", () => {
    expect(src).toMatch(/particles\s*=\s*false/);
    expect(src).toMatch(/particlesCount\s*=\s*20/);
  });

  it("VARIANTS contient particleColor pour chaque variant", () => {
    expect(src).toMatch(/teal:[\s\S]*?particleColor:/);
    expect(src).toMatch(/violet:[\s\S]*?particleColor:[\s\S]*?122, 111, 176/);
  });

  it("Render conditionnel {particles && ...}", () => {
    expect(src).toMatch(/\{particles\s*&&\s*\(/);
    expect(src).toMatch(/<ParticlesBackground[\s\S]*?count=\{particlesCount\}/);
  });
});

describe("0.58.22 - Toast premium stack", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Toast.js"), "utf-8");

  it("MAX_TOASTS = 4 + fonction trimContainer", () => {
    expect(src).toMatch(/const MAX_TOASTS = 4/);
    expect(src).toMatch(/function trimContainer/);
  });

  it("Glow par couleur dans TOAST_TYPES", () => {
    expect(src).toMatch(/glow:\s*["']rgba\(90,160,90/);  // success
    expect(src).toMatch(/glow:\s*["']rgba\(192,57,43/);  // error
  });

  it("Layered shadows + backdrop-filter sur le toast", () => {
    expect(src).toMatch(/backdropFilter:\s*["']blur\(20px\) saturate\(180%\)/);
    expect(src).toMatch(/0 0 0 1px rgba\(255, 255, 255, 0\.5\) inset/);
  });

  it("Progress bar template + animation av-toast-progress", () => {
    expect(src).toMatch(/data-toast-progress/);
    expect(src).toMatch(/av-toast-progress \$\{duration\}ms linear/);
  });

  it("Hover pause auto-dismiss", () => {
    expect(src).toMatch(/toast\.addEventListener\(["']mouseenter["']/);
    expect(src).toMatch(/animationPlayState = ["']paused["']/);
  });

  it("Keyframe av-toast-progress dans globals.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-toast-progress[\s\S]*?scaleX\(0\)/);
  });
});

describe("0.58.22 - PageTransition slide-in direction-aware", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/PageTransition.js"), "utf-8");

  it("State direction (forward | back)", () => {
    expect(src).toMatch(/const \[direction, setDirection\]/);
  });

  it("History stack via useRef pour détecter back", () => {
    expect(src).toMatch(/historyStackRef/);
    expect(src).toMatch(/stack\.lastIndexOf\(pathname\)/);
  });

  it("2 animations différentes selon direction", () => {
    expect(src).toMatch(/av-page-slide-in-left/);
    expect(src).toMatch(/av-page-slide-in-right/);
  });

  it("Keyframes slide-in-right + slide-in-left dans globals.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-page-slide-in-right/);
    expect(css).toMatch(/@keyframes av-page-slide-in-left/);
  });
});

describe("0.58.22 - Drawer Skeleton", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Drawer.js"), "utf-8");

  it("Prop loading = false par défaut", () => {
    expect(src).toMatch(/loading\s*=\s*false/);
  });

  it("Render conditionnel : loading ? <DrawerSkeleton /> : children", () => {
    expect(src).toMatch(/\{loading\s*\?\s*<DrawerSkeleton\s*\/>\s*:\s*children\}/);
  });

  it("Composant DrawerSkeleton défini avec av-skel-line", () => {
    expect(src).toMatch(/function DrawerSkeleton/);
    expect(src).toMatch(/av-skel-line/);
  });

  it("Skeleton avec header + 2 sections + grid 4 cards + paragraph", () => {
    // Présence des 4 patterns principaux
    expect(src).toMatch(/borderBottom:[\s\S]*?--av-g200/);  // header
    expect(src).toMatch(/gridTemplateColumns:[\s\S]*?1fr 1fr/);  // grid
    expect(src).toMatch(/\[0, 1, 2, 3\]\.map/);  // 4 cards
  });

  it("CSS av-skel-line + animation av-skel-shimmer dans globals.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/\.av-skel-line\s*\{[\s\S]*?animation:\s*av-skel-shimmer/);
    expect(css).toMatch(/@keyframes av-skel-shimmer/);
  });
});
