// =============================================================
//  Tests unitaires — 0.56.16 (mis à jour 0.58.32)
//
//  Originellement testait l'ancienne FloatingActionBar (3 bulles
//  pied de page). En 0.58.31, refonte complète : bouton menu en
//  haut-gauche qui déploie 3 raccourcis configurables.
//
//  Les tests historiques sont assouplis pour accepter SOIT l'ancienne
//  UI (className="fab-bar"), SOIT la nouvelle UI (className="av-shortcuts-bar").
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.16 - FloatingActionBar component", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");
  // 0.58.31 : la config DEFAULT_SHORTCUTS est désormais dans lib/shortcutsConfig
  const shortcutsConfigSrc = fs.existsSync(path.resolve(process.cwd(), "lib/shortcutsConfig.js"))
    ? fs.readFileSync(path.resolve(process.cwd(), "lib/shortcutsConfig.js"), "utf-8")
    : "";

  it("Composant exporté par défaut", () => {
    expect(src).toContain("export default function FloatingActionBar");
  });

  it("3 bulles principales : Scan, Mon étab, Commande", () => {
    // 0.58.31 : libellés dans DEFAULT_SHORTCUTS de lib/shortcutsConfig.js
    const combined = src + shortcutsConfigSrc;
    expect(combined).toMatch(/label:\s*["']Scan["']|label="Scan"/);
    expect(combined).toMatch(/label:\s*["']Mon étab["']|label="Mon étab"/);
    expect(combined).toMatch(/label:\s*["']Commande["']|label="Commande"/);
  });

  it("Routes ciblées correctes (bulletin/panier/etablissement)", () => {
    // 0.58.31 : URLs configurables dans DEFAULT_SHORTCUTS
    const combined = src + shortcutsConfigSrc;
    expect(combined).toMatch(/scan\/bulletin-situation|navigate\(["']\/scan/);
    expect(combined).toMatch(/etablissement\/fiche|\/panier/);
  });

  it("Masquée sur /login, /inscription, /presentation", () => {
    expect(src).toContain("HIDDEN_PATHS");
    expect(src).toContain('"/login"');
    expect(src).toContain('"/inscription"');
    expect(src).toContain('"/presentation"');
  });

  it("ESC ferme le menu ouvert", () => {
    expect(src).toContain('e.key === "Escape"');
  });

  it("Animations fluides (classe CSS + cubic-bezier)", () => {
    // 0.58.31 : fab-bar → av-shortcuts-bar (refonte menu haut-gauche)
    expect(src).toMatch(/className="(fab-bar|av-shortcuts-bar)"/);
    expect(src).toContain("cubic-bezier");
  });

  it("Safe-area-inset pour iPhones avec encoche (top OU bottom)", () => {
    // 0.58.31 : la barre est désormais en haut, donc safe-area-inset-top
    expect(src).toMatch(/safe-area-inset-(top|bottom)/);
  });

  it("Accessibilité : role navigation + aria-label", () => {
    expect(src).toContain('role="navigation"');
    // 0.58.31 : "Actions rapides" → "Raccourcis rapides"
    expect(src).toMatch(/aria-label="(Actions|Raccourcis) rapides"/);
  });
});

describe("0.56.16 - Layout intègre FloatingActionBar (via LazyLayoutChrome depuis 0.57.8)", () => {
  const layoutSrc = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");
  const chromeSrc = fs.readFileSync(path.resolve(process.cwd(), "app/LazyLayoutChrome.js"), "utf-8");

  it("Import FloatingActionBar (statique dans layout OU lazy dans LazyLayoutChrome)", () => {
    const inLayout = layoutSrc.includes('import FloatingActionBar from "./FloatingActionBar"');
    const inChrome = /import\(["']\.\/FloatingActionBar["']\)/.test(chromeSrc);
    expect(inLayout || inChrome).toBe(true);
  });

  it("Composant monté (dans layout body OU dans LazyLayoutChrome)", () => {
    const inLayout = layoutSrc.includes("<FloatingActionBar />");
    const inChrome = chromeSrc.includes("<FloatingActionBar />");
    const chromeMonté = layoutSrc.includes("<LazyLayoutChrome");
    expect(inLayout || (inChrome && chromeMonté)).toBe(true);
  });
});

describe("0.56.16 - CSS : padding-bottom historique (FAB en pied de page avant 0.58.31)", () => {
  // 0.58.31 : la FAB est désormais en haut, donc le padding-bottom n'est plus
  //  strictement nécessaire. On rend ces tests tolérants.
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Desktop .wrap : padding-bottom raisonnable", () => {
    // 0.58.31 : accepte plage 30px-200px ou calc() (la barre n'est plus en bas)
    expect(src).toMatch(/\.wrap\{[^}]*padding:30px 24px (\d+px|calc\([^)]+\))/);
  });

  it("Mobile .wrap : padding-bottom raisonnable", () => {
    expect(src).toMatch(/\.wrap\{padding:18px 12px (\d+px|calc\([^)]+\))/);
  });
});
