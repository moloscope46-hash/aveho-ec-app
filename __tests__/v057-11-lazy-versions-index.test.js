// =============================================================
//  Tests unitaires — 0.57.11
//  Lazy fetch VERSIONS_INDEX (272 KB → JSON public)
//  Mesuré via Lighthouse : /changelog Perf 35 → 54 (+19),
//  TBT 2.1s → 394ms (-82%), First Load 275 → 201 kB (-74 kB)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.11 - Version + bump", () => {
  it("Version 0.57.11+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(11);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.11 - versions-index.json (lazy fetch public)", () => {
  const jsonPath = "public/changelog-data/versions-index.json";

  it("Fichier JSON existe dans public/changelog-data/", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), jsonPath))).toBe(true);
  });

  it("JSON valide avec array de versions", () => {
    const content = fs.readFileSync(path.resolve(process.cwd(), jsonPath), "utf-8");
    const data = JSON.parse(content);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(150);
  });

  it("Chaque version a { v, kind, titre, chantiers, chantiers_total }", () => {
    const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), jsonPath), "utf-8"));
    const first = data[0];
    expect(first).toHaveProperty("v");
    expect(first).toHaveProperty("kind");
    expect(first).toHaveProperty("titre");
    expect(first).toHaveProperty("chantiers");
    expect(first).toHaveProperty("chantiers_total");
    expect(Array.isArray(first.chantiers)).toBe(true);
  });

  it("Chantiers tronqués à 5 max par version", () => {
    const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), jsonPath), "utf-8"));
    data.forEach((v) => {
      expect(v.chantiers.length).toBeLessThanOrEqual(5);
    });
  });

  it("Taille raisonnable (~150-650 KB JSON brut, gzip ~50-130 KB)", () => {
    const size = fs.statSync(path.resolve(process.cwd(), jsonPath)).size;
    expect(size).toBeGreaterThan(150 * 1024);
    // 0.58.21 : seuil monté à 650 KB (versions-data grandit naturellement à chaque release)
    expect(size).toBeLessThan(650 * 1024);
  });
});

describe("0.57.11 - versions-index.js (allégé)", () => {
  const jsPath = "app/changelog/versions-index.js";

  it("Plus que THEME_LABELS (VERSIONS_INDEX déplacé en JSON)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), jsPath), "utf-8");
    expect(src).toMatch(/export const THEME_LABELS/);
    // VERSIONS_INDEX ne doit PLUS être exporté ici
    expect(src).not.toMatch(/export const VERSIONS_INDEX\s*=/);
  });

  it("Fichier très léger (< 10 KB)", () => {
    const size = fs.statSync(path.resolve(process.cwd(), jsPath)).size;
    expect(size).toBeLessThan(10 * 1024);
  });
});

describe("0.57.11 - page.js : fetch lazy versions-index + chantiers-extra", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Plus d'import statique de VERSIONS_INDEX", () => {
    // Doit importer SEULEMENT THEME_LABELS depuis versions-index
    expect(src).not.toMatch(/import\s*\{[^}]*VERSIONS_INDEX[^}]*\}\s*from\s*["']\.\/versions-index["']/);
    expect(src).toMatch(/import\s*\{\s*THEME_LABELS\s*\}\s*from\s*["']\.\/versions-index["']/);
  });

  it("State ALL_VERSIONS initialisé à un array vide", () => {
    expect(src).toMatch(/\[ALL_VERSIONS,\s*setAllVersions\]\s*=\s*useState\(\[\]\)/);
  });

  it("State versionsLoaded pour tracker le chargement initial", () => {
    expect(src).toMatch(/\[versionsLoaded,\s*setVersionsLoaded\]/);
  });

  it("useEffect fetch versions-index.json + chantiers-extra.json en parallèle", () => {
    expect(src).toMatch(/fetch\(["']\/changelog-data\/versions-index\.json["']/);
    expect(src).toMatch(/fetch\(["']\/changelog-data\/chantiers-extra\.json["']/);
    // Promise.all pour le parallélisme
    expect(src).toMatch(/Promise\.all/);
  });

  it("force-cache pour les 2 fetches (assets statiques)", () => {
    // Doit avoir au moins 2 occurrences de force-cache
    const matches = src.match(/cache:\s*["']force-cache["']/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("setVersionsLoaded(true) après fetch réussi", () => {
    expect(src).toMatch(/setVersionsLoaded\(true\)/);
  });

  it("Loader visuel pendant le chargement initial", () => {
    expect(src).toMatch(/!versionsLoaded/);
    // Et un ti-loader-2 dans le rendu skeleton
    expect(src).toMatch(/ti-loader-2/);
  });

  it("Message 'Aucun résultat' seulement après versionsLoaded", () => {
    // Pour ne pas afficher 'Aucun résultat' pendant le fetch
    expect(src).toMatch(/versionsLoaded\s*&&\s*filtered\.length\s*===\s*0/);
  });
});

describe("0.57.11 - Script regen-versions-index.mjs (génère JSON)", () => {
  const scriptPath = "scripts/regen-versions-index.mjs";

  it("Script existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), scriptPath))).toBe(true);
  });

  it("Génère public/changelog-data/versions-index.json", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), scriptPath), "utf-8");
    expect(src).toMatch(/public\/changelog-data\/versions-index\.json/);
  });

  it("Génère versions-index.js avec uniquement THEME_LABELS", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), scriptPath), "utf-8");
    expect(src).toMatch(/export const THEME_LABELS/);
    // Pas de "export const VERSIONS_INDEX" dans le template du script
    expect(src).not.toMatch(/export const VERSIONS_INDEX\s*=\s*\$\{JSON/);
  });
});
