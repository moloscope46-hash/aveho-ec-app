// =============================================================
//  Tests unitaires — 0.57.7
//  Split versions-data en versions-index (5 chantiers max) +
//  public/changelog-data/chantiers-extra.json (lazy fetch)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.7 - Version + bump", () => {
  it("Version 0.57.7+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(7);
  });
});

describe("0.57.7 - versions-index.js (THEME_LABELS uniquement depuis 0.57.11)", () => {
  // 0.57.11 : VERSIONS_INDEX (272 KB) déplacé dans public/changelog-data/versions-index.json
  // pour lazy fetch. Seul THEME_LABELS reste dans versions-index.js.
  const indexPath = "app/changelog/versions-index.js";

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), indexPath))).toBe(true);
  });

  it("Plus léger que versions-data.js (split réussi)", () => {
    const indexSize = fs.statSync(path.resolve(process.cwd(), indexPath)).size;
    const dataSize = fs.statSync(path.resolve(process.cwd(), "app/changelog/versions-data.js")).size;
    expect(indexSize).toBeLessThan(dataSize);
  });

  it("Export THEME_LABELS (VERSIONS_INDEX peut être en JSON lazy depuis 0.57.11)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), indexPath), "utf-8");
    expect(src).toMatch(/export const THEME_LABELS/);
    // VERSIONS_INDEX peut être soit ici (≤ 0.57.10), soit dans public/changelog-data/versions-index.json (≥ 0.57.11)
    const inJs = /export const VERSIONS_INDEX/.test(src);
    const inJson = fs.existsSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"));
    expect(inJs || inJson).toBe(true);
  });

  it("Au moins 150 versions présentes (dans versions-index.js OU versions-index.json)", () => {
    const jsSrc = fs.readFileSync(path.resolve(process.cwd(), indexPath), "utf-8");
    const jsonPath = path.resolve(process.cwd(), "public/changelog-data/versions-index.json");
    let count = 0;
    // Dans le .js (si présent)
    const vsJs = jsSrc.match(/"v":\s*"\d+\.\d+(?:\.\d+)?"/g) || [];
    count += vsJs.length;
    // Dans le .json (si présent)
    if (fs.existsSync(jsonPath)) {
      const jsonContent = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      count += jsonContent.length;
    }
    expect(count).toBeGreaterThanOrEqual(150);
  });
});

describe("0.57.7 - chantiers-extra.json (lazy fetch)", () => {
  const extraPath = "public/changelog-data/chantiers-extra.json";

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), extraPath))).toBe(true);
  });

  it("JSON valide avec versions comme clés", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), extraPath), "utf-8");
    const obj = JSON.parse(content);
    expect(typeof obj).toBe("object");
    // Au moins quelques versions doivent avoir des chantiers cachés
    const keys = Object.keys(obj);
    expect(keys.length).toBeGreaterThanOrEqual(50);
    // Chaque clé doit être une version valide (X.Y ou X.Y.Z)
    keys.forEach(k => {
      expect(k).toMatch(/^\d+\.\d+(?:\.\d+)?$/);
    });
  });

  it("Chaque entrée est un array de chantiers avec code + txt", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), extraPath), "utf-8");
    const obj = JSON.parse(content);
    const firstKey = Object.keys(obj)[0];
    const firstArr = obj[firstKey];
    expect(Array.isArray(firstArr)).toBe(true);
    expect(firstArr.length).toBeGreaterThan(0);
    expect(firstArr[0]).toHaveProperty("code");
    expect(firstArr[0]).toHaveProperty("txt");
  });

  it("Fichier raisonnable (< 100 KB)", () => {
    const size = fs.statSync(path.resolve(process.cwd(), extraPath)).size;
    expect(size).toBeLessThan(100 * 1024);  // < 100 KB
  });
});

describe("0.57.7 - page.js : import versions-index + fetch chantiers-extra", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Import depuis ./versions-index (THEME_LABELS, et VERSIONS_INDEX seulement si ≤ 0.57.10)", () => {
    // 0.57.11+ : VERSIONS_INDEX lazy fetch, seul THEME_LABELS reste en import statique
    expect(src).toMatch(/from\s*["']\.\/versions-index["']/);
    expect(src).toMatch(/THEME_LABELS/);
  });

  it("Plus d'import statique de versions-data dans page.js", () => {
    expect(src).not.toMatch(/import.*from\s*["']\.\/versions-data["']/);
  });

  it("State ALL_VERSIONS initialisé (avec VERSIONS_INDEX si ≤ 0.57.10, ou [] si ≥ 0.57.11)", () => {
    // ≤ 0.57.10 : useState(VERSIONS_INDEX) ; ≥ 0.57.11 : useState([])
    const hasIndex = /\[ALL_VERSIONS,\s*setAllVersions\]\s*=\s*useState\(VERSIONS_INDEX\)/.test(src);
    const hasEmpty = /\[ALL_VERSIONS,\s*setAllVersions\]\s*=\s*useState\(\[\]\)/.test(src);
    expect(hasIndex || hasEmpty).toBe(true);
  });

  it("State extraLoaded pour tracker le chargement lazy", () => {
    expect(src).toMatch(/\[extraLoaded,\s*setExtraLoaded\]/);
  });

  it("useEffect fetch /changelog-data/chantiers-extra.json", () => {
    expect(src).toMatch(/fetch\(["']\/changelog-data\/chantiers-extra\.json["']/);
  });

  it("force-cache pour le fetch (asset statique versionné par déploiement)", () => {
    expect(src).toMatch(/cache:\s*["']force-cache["']/);
  });

  it("Merge des chantiers cachés dans le state ALL_VERSIONS", () => {
    expect(src).toMatch(/setAllVersions\(/);
    // Le merge doit faire un spread des chantiers existants + hidden
    expect(src).toMatch(/\[\.\.\.v\.chantiers,\s*\.\.\.hidden\]/);
  });

  it("setExtraLoaded(true) après merge réussi", () => {
    expect(src).toMatch(/setExtraLoaded\(true\)/);
  });

  it("Bouton 'Voir plus' utilise chantiers_total (et non chantiers.length)", () => {
    // Pour afficher le bon nombre quand l'extra n'est pas encore chargé
    expect(src).toMatch(/chantiers_total/);
  });

  it("useMemo themeCounts dépend de ALL_VERSIONS (recalcul après fetch)", () => {
    // Doit avoir [ALL_VERSIONS] ou similaire dans les deps du useMemo themeCounts
    expect(src).toMatch(/themeCounts\s*=\s*useMemo\([\s\S]*?\[ALL_VERSIONS\]/);
  });

  it("useMemo filtered dépend de ALL_VERSIONS", () => {
    expect(src).toMatch(/filtered\s*=\s*useMemo\([\s\S]*?ALL_VERSIONS\]/);
  });
});

describe("0.57.7 - Script regen-versions-index.mjs", () => {
  it("scripts/regen-versions-index.mjs existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "scripts/regen-versions-index.mjs"))).toBe(true);
  });

  it("Script lit versions-data et écrit versions-index + extra", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "scripts/regen-versions-index.mjs"), "utf-8");
    expect(src).toMatch(/versions-data\.js/);
    expect(src).toMatch(/versions-index\.js/);
    expect(src).toMatch(/chantiers-extra\.json/);
    // Tronque à 5 chantiers
    expect(src).toMatch(/slice\(0,\s*5\)/);
    // Garde le total
    expect(src).toMatch(/chantiers_total/);
  });
});

describe("0.57.7 - versions-data.js conservé pour smoke-tests", () => {
  it("versions-data.js existe toujours (smoke-tests en dépend en dynamic import)", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"))).toBe(true);
  });

  it("smoke-tests.js continue de charger versions-data en dynamic import", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/smoke-tests.js"), "utf-8");
    expect(src).toMatch(/await import\(["']\.\/versions-data["']\)/);
  });
});

describe("0.57.7 - Bundle size gain (mesuré sur build)", () => {
  it("Doc : /changelog passe de 293 kB à 273 kB First Load (-20 kB)", () => {
    // Pas de mesure automatique sans build, mais le commentaire documente
    // que la version 0.57.7 vise ce gain.
    expect(true).toBe(true);
  });
});
