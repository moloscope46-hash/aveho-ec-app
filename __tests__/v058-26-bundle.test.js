// =============================================================
//  Tests unitaires — 0.58.26
//
//  1. Toggle Mode Focus dans /profil
//  2. ParticlesBackground mode cosmic (multicolor) sur /accueil
//  3. OnboardingTour custom component créé
//  4. Bouton "Rejouer la visite" dans /profil
//  5. Skeleton premium dans Tabs (prop loading + TabPanelSkeleton)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.26 - Version", () => {
  it("Version 0.58.26+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(26);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.26 - Toggle Mode Focus dans /profil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Import isFocusMode + toggleFocusMode", () => {
    expect(src).toMatch(/import\s*\{[^}]*isFocusMode[^}]*toggleFocusMode[^}]*\}\s*from\s*["']\.\.\/\.\.\/lib\/focusMode["']/);
  });

  it("Composant FocusModeToggle défini", () => {
    expect(src).toMatch(/function FocusModeToggle\(\)/);
  });

  it("FocusModeToggle écoute event av-focus-mode-change", () => {
    expect(src).toMatch(/addEventListener\(["']av-focus-mode-change["']/);
  });

  it("NeonButton variant amber/teal selon état focus", () => {
    expect(src).toMatch(/variant=\{isOn \? ["']amber["'] : ["']teal["']\}[\s\S]*?icon=\{isOn \? ["']ti-target-off["'] : ["']ti-target["']\}/);
  });

  it("Panel 'Mode focus zen' avec border-left vert", () => {
    expect(src).toMatch(/Mode focus zen/);
    expect(src).toMatch(/borderLeft:\s*["']4px solid #5aa05a["']/);
  });

  it("Mention raccourci Ctrl+Shift+F", () => {
    expect(src).toMatch(/Ctrl\+Shift\+F/);
  });
});

describe("0.58.26 - ParticlesBackground mode cosmic sur /accueil", () => {
  it("/accueil utilise mode=multicolor (cosmic)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");
    expect(src).toMatch(/<ParticlesBackground[\s\S]*?mode=["']multicolor["']/);
  });
});

describe("0.58.26 - OnboardingTour component créé", () => {
  const componentPath = "app/components/OnboardingTour.js";

  it("Composant existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), componentPath))).toBe(true);
  });

  it("Export default + props steps/storageKey/autoStart", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), componentPath), "utf-8");
    expect(src).toMatch(/export default function OnboardingTour/);
    expect(src).toMatch(/steps\s*=\s*\[\]/);
    expect(src).toMatch(/storageKey\s*=\s*["']av-onboarding["']/);
    expect(src).toMatch(/autoStart\s*=\s*true/);
  });

  it("Render via Portal vers document.body", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), componentPath), "utf-8");
    expect(src).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);
    expect(src).toMatch(/document\.body/);
  });

  it("SVG mask pour overlay avec spot lumineux", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), componentPath), "utf-8");
    expect(src).toMatch(/<mask id=["']av-tour-mask["']/);
  });

  it("Progress dots + navigation Suivant/Précédent/Skip", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), componentPath), "utf-8");
    expect(src).toMatch(/Passer/);
    expect(src).toMatch(/Précédent/);
    expect(src).toMatch(/Suivant/);
  });

  it("Keyframes av-tour-overlay-in + av-tour-popover-in", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-tour-overlay-in/);
    expect(css).toMatch(/@keyframes av-tour-popover-in/);
  });
});

describe("0.58.26 - Bouton Rejouer la visite dans /profil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Composant ReplayTourButton défini", () => {
    expect(src).toMatch(/function ReplayTourButton/);
  });

  it("Utilise resetOnboarding du helper existant", () => {
    expect(src).toMatch(/resetOnboarding\(\)/);
  });

  it("Redirect vers /accueil pour lancer le tour", () => {
    expect(src).toMatch(/router\.push\(["']\/accueil["']\)/);
  });

  it("Panel 'Visite guidée' avec border-left bleu", () => {
    expect(src).toMatch(/Visite guidée/);
    expect(src).toMatch(/borderLeft:\s*["']4px solid #185FA5["']/);
  });
});

describe("0.58.26 - Skeleton premium dans TabPanel", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Tabs.js"), "utf-8");

  it("TabPanel a la prop loading = false par défaut", () => {
    expect(src).toMatch(/function TabPanel\(\{ active, id, children, loading\s*=\s*false \}\)/);
  });

  it("Render conditionnel : loading ? TabPanelSkeleton : children", () => {
    expect(src).toMatch(/\{loading\s*\?\s*<TabPanelSkeleton\s*\/>\s*:\s*children\}/);
  });

  it("Composant TabPanelSkeleton défini", () => {
    expect(src).toMatch(/function TabPanelSkeleton\(\)/);
  });

  it("Skeleton avec header + 3 fields + grid 2 cards + 2 buttons", () => {
    expect(src).toMatch(/av-skel-line/);
    expect(src).toMatch(/\[0, 1, 2\]\.map/);
    expect(src).toMatch(/gridTemplateColumns:\s*["']1fr 1fr["']/);
  });
});
