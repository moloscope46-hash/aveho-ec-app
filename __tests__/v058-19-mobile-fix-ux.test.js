// =============================================================
//  Tests unitaires — 0.58.19 MOBILE FIX + UX
//
//  Bug critique : containing block créé par PageTransition (willChange)
//    + KpiCard (transformStyle preserve-3d + willChange) qui faisait
//    que tous les overlays position:fixed n'étaient plus relatifs au
//    viewport mais à ces parents → invisibles quand l'user scroll en bas
//
//  Fixes :
//  1. PageTransition : willChange retiré
//  2. KpiCard : transformStyle + willChange retirés
//  3. TopBar menu-overlay + menu-drawer : Portal vers document.body
//  4. Modal : Portal vers document.body
//  5. Drawer premium : Portal vers document.body
//  6. CSS mobile : 100dvh + safe-area-inset partout
//  7. Bottom-sheet : poignée visuelle + safe-area + drag-handle
//  8. BulkToolbar : safe-area-inset-bottom
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.19 - Version", () => {
  it("Version 0.58.19+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(19);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.19 - Fix containing blocks (root cause)", () => {
  it("PageTransition : plus de willChange (créait containing block global app)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/PageTransition.js"), "utf-8");
    // L'ancienne ligne `willChange: 'opacity, transform'` dans le style{} doit avoir disparu.
    // (Les commentaires explicatifs historiques peuvent rester.)
    // Exclure les lignes qui commencent par // (commentaires)
    const codeLines = src.split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
    expect(codeLines).not.toMatch(/willChange:\s*["']opacity,\s*transform["']/);
    // Marqueur de version pour confirmer la fix
    expect(src).toMatch(/0\.58\.19/);
    expect(src).toMatch(/containing block/i);
  });

  it("KpiCard : plus de transformStyle: 'preserve-3d' permanent", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/KpiCard.js"), "utf-8");
    // transformStyle ne doit plus être dans le style permanent du wrapper
    expect(src).not.toMatch(/transformStyle:\s*["']preserve-3d["']/);
  });

  it("KpiCard : plus de willChange: 'transform' permanent", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/KpiCard.js"), "utf-8");
    // willChange ne doit plus être appliqué en permanence
    expect(src).not.toMatch(/willChange:\s*onClick\s*\?\s*["']transform["']/);
  });
});

describe("0.58.19 - Portals pour overlays (échappent aux containing blocks)", () => {
  it("TopBar : import createPortal de react-dom", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);
  });

  it("TopBar : menu-overlay + menu-drawer rendus via createPortal(document.body)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");
    expect(src).toMatch(/createPortal\(/);
    expect(src).toMatch(/document\.body/);
    // Guard hydratation
    expect(src).toMatch(/mounted && createPortal/);
  });

  it("Modal : import createPortal + render via Portal vers document.body", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/Modal.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);
    expect(src).toMatch(/return createPortal\(/);
    expect(src).toMatch(/document\.body\)/);
    // Guard hydratation
    expect(src).toMatch(/const \[mounted, setMounted\]/);
  });

  it("Drawer premium : import createPortal + render via Portal vers document.body", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Drawer.js"), "utf-8");
    expect(src).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);
    expect(src).toMatch(/return createPortal\(/);
    expect(src).toMatch(/document\.body\)/);
    expect(src).toMatch(/const \[mounted, setMounted\]/);
  });

  it("Dialog premium : déjà rendu via createRoot vers av-dialog-root (pas concerné)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Dialog.js"), "utf-8");
    // Dialog utilise createRoot et document.body directement
    expect(src).toMatch(/document\.body\.appendChild/);
  });
});

describe("0.58.19 - CSS mobile responsive", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("menu-drawer : height 100dvh (Safari iOS dynamic height) avec fallback 100vh", () => {
    expect(css).toMatch(/\.menu-drawer\{[\s\S]*?height:100vh;[\s\S]*?height:100dvh/);
  });

  it("menu-drawer : top + bottom + left explicites (et plus juste top:0)", () => {
    expect(css).toMatch(/\.menu-drawer\{[\s\S]*?top:0;left:0;bottom:0/);
  });

  it("menu-scroll : padding-bottom inclut env(safe-area-inset-bottom)", () => {
    expect(css).toMatch(/\.menu-scroll\{[\s\S]*?padding:[\s\S]*?env\(safe-area-inset-bottom/);
  });

  it("menu-overlay : top/right/bottom/left explicites (fallback navigateurs anciens)", () => {
    expect(css).toMatch(/\.menu-overlay\{[\s\S]*?top:0;right:0;bottom:0;left:0/);
  });

  it("Bottom-sheet mobile : poignée visuelle ::before (style iOS)", () => {
    expect(css).toMatch(/\.modal::before\{/);
    expect(css).toMatch(/\.modal::before[\s\S]*?width:40px;height:4px/);
  });

  it("Bottom-sheet mobile : max-height + padding-bottom safe-area", () => {
    expect(css).toMatch(/\.modal\{[\s\S]*?max-height:calc\(92vh - env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.modal\{[\s\S]*?padding-bottom:calc\(22px \+ env\(safe-area-inset-bottom/);
  });

  it("Bottom-sheet mobile : animation modal-bottom-up", () => {
    expect(css).toMatch(/animation:\s*modal-bottom-up/);
    expect(css).toMatch(/@keyframes modal-bottom-up/);
  });

  it("Drawer premium mobile : full-width + safe-area-inset-bottom sur footer", () => {
    expect(css).toMatch(/\.av-drawer-panel\{[\s\S]*?width:100%\s*!important/);
    expect(css).toMatch(/\.av-drawer-panel > div:last-child\{[\s\S]*?env\(safe-area-inset-bottom/);
  });
});

describe("0.58.19 - BulkToolbar safe-area", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/BulkToolbar.js"), "utf-8");

  it("bottom inclut env(safe-area-inset-bottom)", () => {
    expect(src).toMatch(/env\(safe-area-inset-bottom/);
  });
});

describe("0.58.19 - Drawer premium className av-drawer-panel", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Drawer.js"), "utf-8");

  it("className='av-drawer-panel' pour cibler le panel mobile", () => {
    expect(src).toMatch(/className=["']av-drawer-panel["']/);
  });
});
