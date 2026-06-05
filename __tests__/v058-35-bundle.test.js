// =============================================================
//  Tests unitaires — 0.58.35
//  FAB bulle droite + BatimentServiceSwitcher TopBar + Équipes popup
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.35 - Version", () => {
  it("Version 0.58.35+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(35);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.35 - FAB : bouton bulle à DROITE", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");

  it("Position right (et plus left)", () => {
    expect(src).toMatch(/right:\s*16/);
  });

  it("flexDirection row-reverse pour glissement vers la gauche", () => {
    expect(src).toMatch(/flexDirection:\s*["']row-reverse["']/);
  });

  it("Bouton principal en cercle (borderRadius 50%) et pas icône hamburger ti-menu-2", () => {
    expect(src).toMatch(/borderRadius:\s*["']50%["']/);
    // L'icône principale fermée doit être ti-sparkles ou similaire (pas hamburger)
    expect(src).not.toMatch(/ti-menu-2/);
  });

  it("Bouton fermé : gradient teal (couleur Aveho)", () => {
    expect(src).toMatch(/linear-gradient\(135deg,\s*#7CC8C8/);
  });

  it("Pulse halo autour du bouton fermé", () => {
    expect(src).toMatch(/av-fab-pulse/);
    expect(src).toMatch(/@keyframes av-fab-pulse/);
  });

  it("Bulles glissent vers la gauche (translateX +20px)", () => {
    expect(src).toMatch(/translateX\(20px\)\s+scale\(0\.6\)/);
  });

  it("Tooltip aligné à GAUCHE du bouton (right: calc(100% + 8px))", () => {
    expect(src).toMatch(/right:\s*["']calc\(100%/);
  });
});

describe("0.58.35 - BatimentServiceSwitcher", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/BatimentServiceSwitcher.js"), "utf-8");

  it("Composant exporté avec prop auth", () => {
    expect(src).toMatch(/export default function BatimentServiceSwitcher\(\{\s*auth\s*\}\)/);
  });

  it("Storage keys avec préfixe av- (purgeables au logout)", () => {
    expect(src).toMatch(/STORAGE_BAT\s*=\s*["']av-current-batiment-id["']/);
    expect(src).toMatch(/STORAGE_SVC\s*=\s*["']av-current-service-id["']/);
  });

  it("Charge bâtiments quand auth.etabId change", () => {
    expect(src).toMatch(/from\(["']batiments["']\)\.select\("id, nom"\)\.eq\(["']etablissement_id["'],\s*auth\.etabId\)/);
  });

  it("Charge services via étages → services", () => {
    expect(src).toMatch(/from\(["']etages["']\).*\.eq\(["']batiment_id["']/);
    expect(src).toMatch(/from\(["']services["']\).*\.in\(["']etage_id["']/);
  });

  it("Event 'av-current-context-change' dispatched", () => {
    expect(src).toMatch(/av-current-context-change/);
  });

  it("CSS class bat-svc-switch hidden sur mobile (max-width 768px)", () => {
    expect(src).toMatch(/\.bat-svc-switch.*display:\s*none/);
    expect(src).toMatch(/@media \(max-width:\s*768px\)/);
  });

  it("Icônes : ti-building pour bâtiment + ti-stethoscope pour service", () => {
    expect(src).toMatch(/ti-building/);
    expect(src).toMatch(/ti-stethoscope/);
  });
});

describe("0.58.35 - TopBar : intégration BatimentServiceSwitcher", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");

  it("Import BatimentServiceSwitcher", () => {
    expect(src).toMatch(/import\s+BatimentServiceSwitcher\s+from\s+["']\.\/components\/BatimentServiceSwitcher["']/);
  });

  it("Render <BatimentServiceSwitcher auth={auth} /> après le sélecteur d'établissement", () => {
    expect(src).toMatch(/<BatimentServiceSwitcher\s+auth=\{auth\}\s*\/>/);
  });
});

describe("0.58.35 - /collectivite : popup établissement avec onglets Bâtiments + Équipes", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/collectivite/page.js"), "utf-8");

  it("State popupTab pour switcher onglet", () => {
    expect(src).toMatch(/popupTab,\s*setPopupTab/);
  });

  it("openEtabPopup charge aussi les équipes (batiment_id IN ...)", () => {
    expect(src).toMatch(/from\(["']equipes["']\)/);
    expect(src).toMatch(/\.in\(["']batiment_id["'],\s*batIds\)/);
  });

  it("popupTree inclut maintenant equipes", () => {
    expect(src).toMatch(/setPopupTree\(\{\s*bats:[^}]*equipes/);
  });

  it("UI onglets Bâtiments + Équipes & Services dans le Modal", () => {
    expect(src).toMatch(/onClick=\{\(\)\s*=>\s*setPopupTab\(["']bats["']\)/);
    expect(src).toMatch(/onClick=\{\(\)\s*=>\s*setPopupTab\(["']equipes["']\)/);
    expect(src).toMatch(/Équipes\s*&amp;\s*Services|Équipes\s*&\s*Services/);
  });

  it("Composant EquipesServicesView défini + utilisé", () => {
    expect(src).toMatch(/function EquipesServicesView/);
    expect(src).toMatch(/<EquipesServicesView/);
  });

  it("EquipeCard sous-composant pour chaque équipe", () => {
    expect(src).toMatch(/function EquipeCard/);
    expect(src).toMatch(/<EquipeCard/);
  });

  it("Click équipe → /equipe/{id}", () => {
    expect(src).toMatch(/onOpenEquipe=\{\(id\)\s*=>\s*\{\s*window\.location\.href = `\/equipe\/\$\{id\}`;\s*\}\}/);
  });

  it("Reset popupTab quand modal fermé", () => {
    expect(src).toMatch(/setPopupTab\(["']bats["']\)/);
  });
});
