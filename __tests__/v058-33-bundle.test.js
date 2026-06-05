// =============================================================
//  Tests unitaires — 0.58.33
//  Dashboard widgets configurables drag & drop
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.33 - Version", () => {
  it("Version 0.58.33+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(33);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.33 - lib/dashboardLayout", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/dashboardLayout.js"), "utf-8");

  it("Exports principaux", () => {
    expect(src).toMatch(/export const ALL_WIDGETS/);
    expect(src).toMatch(/export const DEFAULT_ORDER/);
    expect(src).toMatch(/export const DEFAULT_ACTIVE/);
    expect(src).toMatch(/export function getDashboardLayout/);
    expect(src).toMatch(/export function setDashboardLayout/);
    expect(src).toMatch(/export function resetDashboardLayout/);
  });

  it("ALL_WIDGETS contient les 5 widgets de base", () => {
    expect(src).toMatch(/id:\s*["']atraiter["']/);
    expect(src).toMatch(/id:\s*["']kpis["']/);
    expect(src).toMatch(/id:\s*["']raccourcis["']/);
    expect(src).toMatch(/id:\s*["']dernieres["']/);
    expect(src).toMatch(/id:\s*["']notifs["']/);
  });

  it("Storage key historique 'aveho_dashboard' (rétrocompat)", () => {
    expect(src).toMatch(/STORAGE_KEY\s*=\s*["']aveho_dashboard["']/);
  });

  it("Event 'av-dashboard-layout-change' dispatched", () => {
    expect(src).toMatch(/av-dashboard-layout-change/);
  });

  it("Helper mergeOrder garantit consistance (filtre inconnus + ajoute manquants)", () => {
    expect(src).toMatch(/function mergeOrder/);
    expect(src).toMatch(/known\.has\(id\)/);
  });

  it("Rétrocompat ancien format 0.6 (juste { active: {...} })", () => {
    expect(src).toMatch(/Rétrocompat|data\.active \|\| data\.order/);
  });
});

describe("0.58.33 - DashboardEditorToolbar component", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/DashboardEditorToolbar.js"), "utf-8");

  it("Composant exporté + props attendues", () => {
    expect(src).toMatch(/export default function DashboardEditorToolbar/);
    expect(src).toMatch(/active, order, onToggleWidget, onClose, onResetConfirm/);
  });

  it("Badge 'MODE ÉDITION'", () => {
    expect(src).toMatch(/MODE ÉDITION/);
  });

  it("Liste les widgets cachés cliquables pour réactiver", () => {
    expect(src).toMatch(/hiddenWidgets/);
    expect(src).toMatch(/!active\[w\.id\]/);
    expect(src).toMatch(/onToggleWidget\(w\.id\)/);
  });

  it("Bouton Réinitialiser + Terminé", () => {
    expect(src).toMatch(/Réinitialiser/);
    expect(src).toMatch(/Terminé/);
  });

  it("Animation entrée av-dashboard-editor-in", () => {
    expect(src).toMatch(/av-dashboard-editor-in/);
  });
});

describe("0.58.33 - /accueil : drag & drop natif HTML5", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Imports lib/dashboardLayout + DashboardEditorToolbar", () => {
    expect(src).toMatch(/import\s+DashboardEditorToolbar/);
    expect(src).toMatch(/from\s+["'][^"']*dashboardLayout["']/);
    expect(src).toMatch(/getDashboardLayout/);
    expect(src).toMatch(/setDashboardLayout/);
    expect(src).toMatch(/resetDashboardLayout/);
    expect(src).toMatch(/ALL_WIDGETS/);
  });

  it("State drag & drop : draggedWidget + dragOverWidget", () => {
    expect(src).toMatch(/draggedWidget,\s*setDraggedWidget/);
    expect(src).toMatch(/dragOverWidget,\s*setDragOverWidget/);
  });

  it("Handlers HTML5 drag&drop : handleDragStart/Over/Leave/Drop/End", () => {
    expect(src).toMatch(/function handleDragStart/);
    expect(src).toMatch(/function handleDragOver/);
    expect(src).toMatch(/function handleDrop/);
    expect(src).toMatch(/function handleDragEnd/);
  });

  it("Drop : splice + swap dans widgetOrder + persist via setDashboardLayout", () => {
    expect(src).toMatch(/next\.splice\(sourceIdx, 1\)/);
    expect(src).toMatch(/next\.splice\(targetIdx, 0, draggedWidget\)/);
    expect(src).toMatch(/setDashboardLayout\(\{\s*active: widgets,\s*order: next/);
  });

  it("Wrapper draggable={editLayout} sur chaque widget rendu", () => {
    expect(src).toMatch(/draggable=\{editLayout\}/);
    expect(src).toMatch(/onDragStart=\{\(e\)\s*=>\s*handleDragStart\(e,\s*k\)/);
    expect(src).toMatch(/onDrop=\{\(e\)\s*=>\s*handleDrop\(e,\s*k\)/);
  });

  it("Label flottant avec icon + ti-grip-vertical en mode édition", () => {
    expect(src).toMatch(/ti-grip-vertical/);
    expect(src).toMatch(/meta\.label/);
  });

  it("Bouton de fermeture (croix) sur chaque widget en mode édition", () => {
    expect(src).toMatch(/Masquer\s*\$\{meta\.label\}/);
    expect(src).toMatch(/toggleWidget\(k\)/);
  });

  it("Toolbar DashboardEditorToolbar utilisée + dialog confirm reset", () => {
    expect(src).toMatch(/<DashboardEditorToolbar/);
    expect(src).toMatch(/onResetConfirm/);
    expect(src).toMatch(/dialogs\.confirm/);
  });

  it("Listen event 'av-dashboard-layout-change' pour sync", () => {
    expect(src).toMatch(/av-dashboard-layout-change/);
  });

  it("Opacité du widget en cours de drag + transform sur drop target", () => {
    expect(src).toMatch(/isDragged \? 0\.4 : 1/);
    expect(src).toMatch(/isDragOver \?\s*["']translateY/);
  });
});
