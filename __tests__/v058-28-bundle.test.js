// =============================================================
//  Tests unitaires — 0.58.28
//
//  1. ConicCard animation count-up
//  2. Mode présentation : raccourcis clavier visuels (KeyboardHints)
//  3. NotifBell preview : marquer comme lu inline + fix lu→lue
//  4. Skeleton dans /parametres et /profil
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.28 - Version", () => {
  it("Version 0.58.28+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(28);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.28 - ConicCard animation count-up", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/ConicCard.js"), "utf-8");

  it("Hook useCountUp défini localement", () => {
    expect(src).toMatch(/function useCountUp\(target, duration = 1000\)/);
  });

  it("Utilise easeOutCubic", () => {
    expect(src).toMatch(/1 - Math\.pow\(1 - progress, 3\)/);
  });

  it("animatedValue + displayValue dans le composant", () => {
    expect(src).toMatch(/const animatedValue = useCountUp/);
    expect(src).toMatch(/const displayValue = typeof value === ["']number["']/);
  });

  it("Render displayValue + tabular-nums", () => {
    expect(src).toMatch(/typeof value === ["']number["'] \? displayValue : value/);
    expect(src).toMatch(/fontVariantNumeric:\s*["']tabular-nums["']/);
  });
});

describe("0.58.28 - KeyboardHints overlay", () => {
  it("Composant KeyboardHints créé", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/KeyboardHints.js"))).toBe(true);
  });

  it("Affichage conditionnel selon isPresentationMode/isFocusMode", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/KeyboardHints.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*isPresentationMode\s*\}\s*from\s*["']\.\.\/lib\/presentationMode["']/);
    expect(src).toMatch(/import\s*\{\s*isFocusMode\s*\}\s*from\s*["']\.\.\/lib\/focusMode["']/);
    expect(src).toMatch(/setVisible\(isPresentationMode\(\) \|\| isFocusMode\(\)\)/);
  });

  it("4 hints au minimum (Cmd+K, Présentation, Focus, Esc)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/KeyboardHints.js"), "utf-8");
    expect(src).toMatch(/const HINTS = \[/);
    expect(src).toMatch(/keys:\s*\[["']Ctrl["'],\s*["']K["']\]/);
    expect(src).toMatch(/keys:\s*\[["']Ctrl["'],\s*["']Shift["'],\s*["']P["']\]/);
    expect(src).toMatch(/keys:\s*\[["']Ctrl["'],\s*["']Shift["'],\s*["']F["']\]/);
    expect(src).toMatch(/keys:\s*\[["']Esc["']\]/);
  });

  it("Listeners events présentation/focus mode change", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/KeyboardHints.js"), "utf-8");
    expect(src).toMatch(/av-presentation-mode-change/);
    expect(src).toMatch(/av-focus-mode-change/);
  });

  it("Layout : import et render dans layout.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");
    expect(src).toMatch(/import KeyboardHints from\s*["']\.\/KeyboardHints["']/);
    expect(src).toMatch(/<KeyboardHints\s*\/>/);
  });
});

describe("0.58.28 - NotifBell preview : mark-as-read inline + fix lue", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/NotifBell.js"), "utf-8");

  it("Fix bug : utilise it.lue (et pas it.lu)", () => {
    // Le preview utilise it.lue (champ réel DB)
    expect(src).toMatch(/!it\.lue/);
    expect(src).toMatch(/it\.lue \? 500 : 700/);
  });

  it("Bouton mark-as-read inline visible si non lu", () => {
    expect(src).toMatch(/Bouton "marquer comme lu" inline/);
    expect(src).toMatch(/!it\.lue && \(/);
    expect(src).toMatch(/aria-label=["']Marquer comme lue["']/);
  });

  it("Update Supabase + state optimiste", () => {
    expect(src).toMatch(/await supabase\.from\(["']notifications["']\)\.update\(\{ lue: true \}\)\.eq\(["']id["'], it\.id\)/);
    expect(src).toMatch(/setItems\(\(prev\) => prev\.map/);
  });

  it("Stop propagation pour éviter l'ouverture du Drawer", () => {
    expect(src).toMatch(/e\.stopPropagation\(\)/);
  });
});

describe("0.58.28 - Skeleton dans /parametres et /profil", () => {
  it("/parametres : import TabPanel + utilisation au chargement", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*TabPanel[^}]*\}\s*from\s*["']\.\.\/components\/ui-premium["']/);
    expect(src).toMatch(/loading\s*\?\s*<TabPanel\s+active=["']loading["']\s+loading=\{true\}/);
  });

  it("/profil : import TabPanel + utilisation au chargement", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*TabPanel[^}]*\}\s*from\s*["']\.\.\/components\/ui-premium["']/);
    expect(src).toMatch(/loading\s*\?\s*<TabPanel\s+active=["']loading["']\s+loading=\{true\}/);
  });
});
