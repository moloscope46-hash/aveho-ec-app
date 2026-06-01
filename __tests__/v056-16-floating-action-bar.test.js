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
    expect(src).toContain("fab-bubble-pop");
    expect(src).toContain("fab-popup-slide");
    expect(src).toContain("cubic-bezier");
  });

  it("Safe-area-inset-bottom pour iPhones avec encoche", () => {
    expect(src).toContain("safe-area-inset-bottom");
  });

  it("Glassmorphism : background semi-transparent + blur", () => {
    expect(src).toContain("backdrop-filter: blur");
    expect(src).toContain("rgba(255, 255, 255, 0.88)");
  });

  it("Responsive mobile : gap et padding réduits sur < 640px", () => {
    expect(src).toContain("@media (max-width: 640px)");
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

describe("0.56.16 - Layout intègre FloatingActionBar", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");

  it("Import FloatingActionBar", () => {
    expect(src).toContain('import FloatingActionBar from "./FloatingActionBar"');
  });

  it("Composant monté dans le body", () => {
    expect(src).toContain("<FloatingActionBar />");
  });
});

describe("0.56.16 - CSS : padding-bottom ajusté pour la FAB", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Desktop .wrap : padding-bottom augmenté à 110px", () => {
    expect(src).toContain("padding:30px 24px 110px");
  });

  it("Mobile .wrap : padding-bottom augmenté à 130px", () => {
    expect(src).toContain("padding:18px 12px 130px");
  });
});
