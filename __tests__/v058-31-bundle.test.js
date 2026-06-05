// =============================================================
//  Tests unitaires — 0.58.31
//
//  1. SireneSearch : portal vers body + position calculée
//  2. /collectivite : enlève partenaires + icône équipe + bouton créer
//  3. lib/shortcutsConfig : getters / setters / defaults
//  4. FloatingActionBar : refonte menu haut-gauche
//  5. /profil : ShortcutsConfigPanel
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.31 - Version", () => {
  it("Version 0.58.31+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(31);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.31 - SireneSearch : portal vers body", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/SireneSearch.js"), "utf-8");

  it("Import createPortal depuis react-dom", () => {
    expect(src).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);
  });

  it("inputBoxRef + dropdownPos state pour calculer la position", () => {
    expect(src).toMatch(/inputBoxRef = useRef/);
    expect(src).toMatch(/dropdownPos.*setDropdownPos/);
  });

  it("Recalc position au scroll/resize via getBoundingClientRect", () => {
    expect(src).toMatch(/getBoundingClientRect\(\)/);
    expect(src).toMatch(/window\.addEventListener\(["']scroll["']/);
    expect(src).toMatch(/window\.addEventListener\(["']resize["']/);
  });

  it("Dropdown porté via createPortal vers document.body", () => {
    expect(src).toMatch(/createPortal\(\(\s*<div data-sirene-dropdown/);
    expect(src).toMatch(/document\.body/);
  });

  it("z-index 99999 (au-dessus de tout)", () => {
    expect(src).toMatch(/zIndex:\s*99999/);
  });

  it("Click-out ignore les clics dans le dropdown porté", () => {
    expect(src).toMatch(/closest\?\.\(["']\[data-sirene-dropdown\]["']\)/);
  });
});

describe("0.58.31 - /collectivite : enlève partenaires + bouton créer + icône équipe", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/collectivite/page.js"), "utf-8");

  it("Filtre les partenaires à la lecture (!e.est_partenaire)", () => {
    expect(src).toMatch(/etabsNonPartenaires\s*=\s*\(es\s*\|\|\s*\[\]\)\.filter\(e\s*=>\s*!e\.est_partenaire\)/);
  });

  it("useRouter importé + instance", () => {
    expect(src).toMatch(/import\s*\{\s*useRouter\s*\}\s*from\s*["']next\/navigation["']/);
    expect(src).toMatch(/const router = useRouter\(\)/);
  });

  it("Bouton 'Créer un établissement' admin only avec redirect /etablissements?create=1", () => {
    expect(src).toMatch(/Créer un établissement/);
    expect(src).toMatch(/router\.push\(["']\/etablissements\?create=1["']\)/);
  });

  it("Tuile : 2 actions footer (Bâtiments + Équipe)", () => {
    expect(src).toMatch(/<i className="ti ti-stack-2"/);
    expect(src).toMatch(/<i className="ti ti-sitemap"/);
    expect(src).toMatch(/<span>Équipe<\/span>/);
  });

  it("Click Équipe → redirect /etablissement?etab={id} avec stopPropagation", () => {
    expect(src).toMatch(/router\.push\(`\/etablissement\?etab=\$\{etab\.id\}`\)/);
    expect(src).toMatch(/e\.stopPropagation\(\)/);
  });
});

describe("0.58.31 - /etablissements : auto-open create modal via ?create=1", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etablissements/page.js"), "utf-8");

  it("Import useSearchParams", () => {
    expect(src).toMatch(/import\s*\{\s*useSearchParams\s*\}\s*from\s*["']next\/navigation["']/);
  });

  it("useEffect détecte ?create=1 et appelle openCreateFiness", () => {
    expect(src).toMatch(/searchParams\?\.get\(["']create["']\)\s*===\s*["']1["']/);
    expect(src).toMatch(/openCreateFiness\(\)/);
  });

  it("Nettoie l'URL après ouverture (replaceState)", () => {
    expect(src).toMatch(/window\.history\.replaceState/);
  });
});

describe("0.58.31 - lib/shortcutsConfig", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/shortcutsConfig.js"), "utf-8");

  it("Exports principaux", () => {
    expect(src).toMatch(/export const DEFAULT_SHORTCUTS/);
    expect(src).toMatch(/export const SHORTCUT_COLORS/);
    expect(src).toMatch(/export const SHORTCUT_ICONS/);
    expect(src).toMatch(/export function getShortcutsConfig\(\)/);
    expect(src).toMatch(/export function setShortcutsConfig\(/);
    expect(src).toMatch(/export function resetShortcutsConfig\(\)/);
  });

  it("DEFAULT_SHORTCUTS : 3 raccourcis (scan, mon-etab, commande)", () => {
    expect(src).toMatch(/id:\s*["']scan["']/);
    expect(src).toMatch(/id:\s*["']mon-etab["']/);
    expect(src).toMatch(/id:\s*["']commande["']/);
  });

  it("Storage key 'av-shortcuts-config'", () => {
    expect(src).toMatch(/STORAGE_KEY\s*=\s*["']av-shortcuts-config["']/);
  });

  it("8 couleurs minimum dans la palette", () => {
    const colors = src.match(/{\s*color:\s*["']#[0-9a-f]{6}["']/gi) || [];
    expect(colors.length).toBeGreaterThanOrEqual(8);
  });

  it("28 icônes minimum dans la palette", () => {
    const icons = src.match(/["']ti-[a-z0-9-]+["']/g) || [];
    expect(icons.length).toBeGreaterThanOrEqual(28);
  });

  it("Event 'av-shortcuts-config-change' dispatched", () => {
    expect(src).toMatch(/av-shortcuts-config-change/);
  });
});

describe("0.58.31 - FloatingActionBar : refonte menu haut-gauche", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");

  it("Import getShortcutsConfig + DEFAULT_SHORTCUTS", () => {
    expect(src).toMatch(/import\s*\{[^}]*getShortcutsConfig[^}]*DEFAULT_SHORTCUTS[^}]*\}\s*from\s*["'][^"']*shortcutsConfig["']/);
  });

  it("Position fixed top-left (top calculé + left 16)", () => {
    expect(src).toMatch(/top:\s*["']calc\(74px/);
    expect(src).toMatch(/left:\s*16/);
  });

  it("Bouton hamburger ti-menu-2 + bascule ti-x quand open", () => {
    expect(src).toMatch(/ti-menu-2/);
    expect(src).toMatch(/open\s*\?\s*["']ti-x["']\s*:\s*["']ti-menu-2["']/);
  });

  it("Listener event 'av-shortcuts-config-change'", () => {
    expect(src).toMatch(/av-shortcuts-config-change/);
  });

  it("3 bulles avec animation stagger (idx * 60)", () => {
    expect(src).toMatch(/shortcuts\.map\(\(s, idx\)/);
    expect(src).toMatch(/idx \* 60/);
  });

  it("translateX animation slide vers la droite", () => {
    expect(src).toMatch(/translateX\(-20px\)\s+scale\(0\.6\)/);
    expect(src).toMatch(/translateX\(0\)\s+scale\(1\)/);
  });
});

describe("0.58.31 - /profil : ShortcutsConfigPanel", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Imports lib/shortcutsConfig", () => {
    expect(src).toMatch(/import\s*\{[^}]*getShortcutsConfig[^}]*setShortcutsConfig[^}]*\}\s*from\s*["'][^"']*shortcutsConfig["']/);
    expect(src).toMatch(/SHORTCUT_COLORS/);
    expect(src).toMatch(/SHORTCUT_ICONS/);
  });

  it("Composant ShortcutsConfigPanel défini + utilisé", () => {
    expect(src).toMatch(/function ShortcutsConfigPanel/);
    expect(src).toMatch(/<ShortcutsConfigPanel\s*\/>/);
  });

  it("State editingIdx pour modifier une bulle à la fois", () => {
    expect(src).toMatch(/editingIdx, setEditingIdx/);
  });

  it("3 champs : Libellé + Destination URL + Couleur + Icône", () => {
    expect(src).toMatch(/Libellé/);
    expect(src).toMatch(/Destination \(URL interne\)/);
    expect(src).toMatch(/Couleur/);
    expect(src).toMatch(/Icône/);
  });

  it("Map SHORTCUT_COLORS pour les swatches", () => {
    expect(src).toMatch(/SHORTCUT_COLORS\.map/);
  });

  it("Map SHORTCUT_ICONS pour la grid d'icônes", () => {
    expect(src).toMatch(/SHORTCUT_ICONS\.map/);
  });

  it("Bouton 'Réinitialiser aux valeurs par défaut'", () => {
    expect(src).toMatch(/Réinitialiser aux valeurs par défaut/);
    expect(src).toMatch(/resetShortcutsConfig\(\)/);
  });

  it("Panel parent dans Sécurité tab", () => {
    expect(src).toMatch(/Mes 3 raccourcis rapides/);
  });
});
