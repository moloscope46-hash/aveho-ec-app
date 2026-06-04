// =============================================================
//  Tests unitaires — 0.56.16
//  FloatingActionBar : 3 bulles flottantes mobile + desktop
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.16 - FloatingActionBar component", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");

  it("Composant exporté par défaut", () => {
    expect(src).toContain("export default function FloatingActionBar");
  });

  it("3 bulles principales : Scan, Mon étab, Commande", () => {
    expect(src).toContain('label="Scan"');
    expect(src).toContain('label="Mon étab"');
    expect(src).toContain('label="Commande"');
  });

  it("Bulle Scan ouvre popup avec 4 actions OCR/scan", () => {
    expect(src).toContain('"Créer un patient"');
    expect(src).toContain('"Lire ordonnance"');
    expect(src).toContain('"Scanner code-barre"');
    expect(src).toContain('"Scanner QR code"');
  });

  it("Bulle Mon étab navigue direct vers /etablissement/fiche", () => {
    expect(src).toContain('navigate("/etablissement/fiche")');
  });

  it("Bulle Commande ouvre popup avec panier + commandes + achats", () => {
    expect(src).toContain('"Voir mon panier"');
    expect(src).toContain('"Mes commandes"');
    expect(src).toContain('"Achats"');
  });

  it("Routes ciblées correctes (bulletin/prescription/codebarre/qr)", () => {
    expect(src).toContain('navigate("/scan/bulletin-situation")');
    expect(src).toContain('navigate("/scan/prescription")');
    expect(src).toContain('navigate("/scan/codebarre")');
    expect(src).toContain('navigate("/scan/qr")');
    expect(src).toContain('navigate("/panier")');
    expect(src).toContain('navigate("/commandes")');
    expect(src).toContain('navigate("/achats")');
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

  it("Backdrop avec blur pour les popups", () => {
    expect(src).toContain("backdropFilter");
    expect(src).toContain("rgba(20,33,49,.55)");
  });

  it("Animations fluides (entrée pop-in + popup slide)", () => {
    // 0.56.17 : déplacé dans globals.css mais classe utilisée dans le JSX
    expect(src).toContain('className="fab-bar"');
    expect(src).toContain("cubic-bezier");
  });

  it("Safe-area-inset-bottom pour iPhones avec encoche", () => {
    expect(src).toContain("safe-area-inset-bottom");
  });

  it("Glassmorphism : background semi-transparent + blur (dans globals.css)", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toContain("backdrop-filter: blur");
    expect(css).toContain("rgba(255, 255, 255, 0.88)");
  });

  it("Responsive mobile : gap et padding réduits sur < 640px (dans globals.css)", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toContain("@media (max-width: 640px)");
  });

  it("État actif visible (transform scale + ombre élargie)", () => {
    expect(src).toContain("active");
    expect(src).toContain("translateY(-3px) scale(1.05)");
  });

  it("Accessibilité : role navigation + aria-label sur barre", () => {
    expect(src).toContain('role="navigation"');
    expect(src).toContain('aria-label="Actions rapides"');
  });

  it("Accessibilité : role dialog + aria-label sur popup", () => {
    expect(src).toContain('role="dialog"');
  });

  it("Bouton fermer la popup avec aria-label", () => {
    expect(src).toContain('aria-label="Fermer"');
  });
});

describe("0.56.16 - Layout intègre FloatingActionBar (via LazyLayoutChrome depuis 0.57.8)", () => {
  // 0.57.8 : FloatingActionBar est désormais lazy-loadé via LazyLayoutChrome.js
  // (Next 15 interdit ssr:false dans un Server Component, donc on a déplacé
  // les imports dans un Client Component séparé).
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
    // Et LazyLayoutChrome doit être monté dans le layout
    const chromeMonté = layoutSrc.includes("<LazyLayoutChrome");
    expect(inLayout || (inChrome && chromeMonté)).toBe(true);
  });
});

describe("0.56.16 - CSS : padding-bottom ajusté pour la FAB", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Desktop .wrap : padding-bottom augmenté à 110px (0.58.16 : 140px + safe-area)", () => {
    // 0.58.16 hotfix UI : passé à 140px + safe-area-inset-bottom
    expect(src).toMatch(/\.wrap\{[^}]*padding:30px 24px (110px|calc\(140px \+ env\(safe-area)/);
  });

  it("Mobile .wrap : padding-bottom augmenté à 130px (0.58.16 : 160px + safe-area)", () => {
    // 0.58.16 hotfix UI : passé à 160px + safe-area-inset-bottom
    expect(src).toMatch(/\.wrap\{padding:18px 12px (130px|calc\(160px \+ env\(safe-area)/);
  });
});
