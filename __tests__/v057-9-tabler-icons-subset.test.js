// =============================================================
//  Tests unitaires — 0.57.9
//  Tabler Icons subset : 244 KB → 14.7 KB CSS (-94%)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.9 - Version + bump", () => {
  it("Version 0.57.9+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(9);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.9 - Tabler Icons subset (322 icônes au lieu de 4962)", () => {
  const subsetPath = "app/tabler-icons-subset.css";

  it("Fichier subset existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), subsetPath))).toBe(true);
  });

  it("Subset est petit (< 30 KB vs 244 KB source)", () => {
    const size = fs.statSync(path.resolve(process.cwd(), subsetPath)).size;
    expect(size).toBeLessThan(30 * 1024);
  });

  it("Contient le @font-face Tabler", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), subsetPath), "utf-8");
    expect(src).toMatch(/@font-face/);
    expect(src).toMatch(/tabler-icons/);
  });

  it("Référence les fonts dans /tabler-icons/ (public)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), subsetPath), "utf-8");
    expect(src).toMatch(/url\(["']\/tabler-icons\/tabler-icons\.woff2/);
  });

  it("Contient la classe générique .ti", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), subsetPath), "utf-8");
    expect(src).toMatch(/\.ti\s*\{/);
  });

  it("Contient au moins 200 classes d'icônes (.ti-NAME:before)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), subsetPath), "utf-8");
    const matches = src.match(/\.ti-[a-z0-9-]+:before/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it("Beaucoup moins que les 4962 icônes du package complet", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), subsetPath), "utf-8");
    const matches = src.match(/\.ti-[a-z0-9-]+:before/g) || [];
    expect(matches.length).toBeLessThan(500);
  });
});

describe("0.57.9 - globals.css importe le subset (pas le package complet)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Import du subset local", () => {
    expect(src).toMatch(/@import\s+["']\.\/tabler-icons-subset\.css["']/);
  });

  it("Plus d'import du package complet @tabler/icons-webfont", () => {
    expect(src).not.toMatch(/@import\s+["']@tabler\/icons-webfont/);
  });
});

describe("0.57.9 - Fonts copiées dans public/tabler-icons/", () => {
  it("woff2 (format prioritaire) présent", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/tabler-icons/tabler-icons.woff2"))).toBe(true);
  });

  it("woff (fallback) présent", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/tabler-icons/tabler-icons.woff"))).toBe(true);
  });

  it("ttf (fallback ancien) présent", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/tabler-icons/tabler-icons.ttf"))).toBe(true);
  });
});

describe("0.57.9 - Script build-tabler-icons-subset.mjs", () => {
  it("Script existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "scripts/build-tabler-icons-subset.mjs"))).toBe(true);
  });

  it("Script structure de base", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "scripts/build-tabler-icons-subset.mjs"), "utf-8");
    expect(src).toMatch(/scanIcons/);
    expect(src).toMatch(/TABLER_CSS/);
    expect(src).toMatch(/tabler-icons-subset\.css/);
    // Pattern de match d'icônes utilisées
    expect(src).toMatch(/ti-/);
  });
});

describe("0.57.9 - Icônes effectivement utilisées sont dans le subset", () => {
  const subset = fs.readFileSync(path.resolve(process.cwd(), "app/tabler-icons-subset.css"), "utf-8");

  // Quelques icônes critiques qu'on sait utilisées partout
  const ESSENTIAL = [
    "ti-home",
    "ti-search",
    "ti-user",
    "ti-loader-2",
    "ti-x",
    "ti-check",
    "ti-plus",
    "ti-trash",
  ];

  ESSENTIAL.forEach((icon) => {
    it(`Icône ${icon} présente dans le subset`, () => {
      expect(subset).toContain(`.${icon}:before`);
    });
  });
});
