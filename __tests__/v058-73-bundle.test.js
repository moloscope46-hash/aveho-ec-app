// =============================================================
//  Tests unitaires — 0.58.73
//  HOTFIX build cassé : `>` non-échappé en JSX + maj 8 tests obsolètes
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.73 - Version + SW", () => {
  it("Version 0.58.73+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(73);
    }
  });
  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.73 - HOTFIX build : > non-échappé en JSX", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/materiel/[id]/page.js"), "utf-8");

  it("Le texte cassé `durée de vie > 1 an` est remplacé", () => {
    // Anti-régression : on ne doit JAMAIS revenir à ce texte qui crashe webpack
    expect(src).not.toMatch(/durée de vie\s*>\s*1\s*an[^a-z]/i);
  });

  it("Le texte humain `durée de vie supérieure à 1 an` est présent", () => {
    expect(src).toMatch(/durée de vie supérieure à 1 an/i);
  });

  it("Aucun > non-échappé dans du texte JSX plain (heuristique)", () => {
    // Détecte les lignes qui ressemblent à du texte JSX (commencent par lettre majuscule
    // ou minuscule, sans = ni { en début) et contiennent ' > [alphanum]' qui n'est pas
    // dans une string ni un comparateur JS dans accolades.
    const lines = src.split("\n");
    const suspects = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const stripped = line.trim();
      if (!/^[A-ZÀ-Ÿa-zà-ÿ]/.test(stripped)) continue;
      if (stripped.startsWith("if ") || stripped.startsWith("const ") || stripped.startsWith("let ") || stripped.startsWith("var ") || stripped.startsWith("return ") || stripped.startsWith("else ") || stripped.startsWith("function ")) continue;
      if (stripped.includes(" = ") || stripped.includes(" === ") || stripped.includes(" !== ") || stripped.includes("=>")) continue;
      // Pattern : un > suivi de espace+chiffre ou espace+lettre, hors closing tag
      if (/[a-zà-ÿA-ZÀ-Ÿ\)] > [0-9a-zà-ÿ]/.test(stripped)) {
        suspects.push(`L${i + 1}: ${stripped.substring(0, 100)}`);
      }
    }
    expect(suspects).toEqual([]);
  });
});

describe("0.58.73 - Tests obsolètes patchés (anti-régression)", () => {
  it("v057-7 accepte cache:'default' (plus force-cache strict)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v057-7-split-versions-data.test.js"), "utf-8");
    expect(src).toMatch(/cache:\\s\*\["']default\["']/);
  });

  it("v057-11 accepte cache:'default'", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v057-11-lazy-versions-index.test.js"), "utf-8");
    expect(src).toMatch(/cache:\\s\*\["']default\["']/);
  });

  it("v058-66 récap visuel insensible à la casse", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-66-bundle.test.js"), "utf-8");
    expect(src).toMatch(/récap visuel des filtres actifs combinés\/i/);
  });

  it("v058-68 utilise toContain au lieu de json[0]", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-68-bundle.test.js"), "utf-8");
    expect(src).toMatch(/toContain\(["']0\.58\.68["']\)/);
    expect(src).not.toMatch(/expect\(json\[0\]\.v\)\.toBe\(["']0\.58\.68["']\)/);
  });

  it("v058-69 accepte selectMaterielsByArticle ET safeInsertMateriels", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-69-bundle.test.js"), "utf-8");
    expect(src).toMatch(/selectMaterielsByArticle/);
    expect(src).toMatch(/safeInsertMateriels/);
  });

  it("v058-70 import path accepte ./chambres OU ../lib/chambres", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-70-bundle.test.js"), "utf-8");
    expect(src).toMatch(/\\\.\\\/\|\\\.\\\.\\\//);
  });

  it("v058-71 strip comments SQL avant assertion anti-régression", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-71-bundle.test.js"), "utf-8");
    expect(src).toMatch(/sqlNoComments\s*=\s*sql\.replace/);
  });
});

describe("0.58.73 - Cohérence : version dans changelog", () => {
  it("0.58.73 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.73"/);
    expect(src).toMatch(/"kind":\s*"hotfix"/);
  });
  it("0.58.73 présent dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    const versions = json.map(v => v.v);
    expect(versions).toContain("0.58.73");
  });
  it("Note HTML 0.58.73 présente", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.58.73.html"))).toBe(true);
  });
});

describe("0.58.73 - Script test:all présent", () => {
  it("npm run test:all lance vitest + playwright", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.scripts).toHaveProperty("test:all");
    expect(pkg.scripts["test:all"]).toMatch(/npm run test.*&&.*npm run test:e2e/);
  });
});
