// =============================================================
//  Tests unitaires — 0.58.37
//  Fix 5 tests obsolètes (v058-31 FAB gauche→droite, v058-35 regex multi-line)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.37 - Version", () => {
  it("Version 0.58.37+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(37);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.37 - Tests v058-31 assouplis pour FAB droite (0.58.35)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-31-bundle.test.js"), "utf-8");

  it("Position fixed accepte left OU right (FAB peut être à gauche OU à droite)", () => {
    expect(src).toMatch(/\(left\|right\):/);
  });

  it("Bouton menu accepte ti-menu-2 OU ti-sparkles", () => {
    expect(src).toMatch(/ti-\(menu-2\|sparkles\)/);
  });

  it("translateX accepte sens positif OU négatif", () => {
    expect(src).toMatch(/translateX\\\(-\?20px\\\)/);
  });
});

describe("0.58.37 - Tests v058-35 regex multi-line", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-35-bundle.test.js"), "utf-8");

  it("Charge bâtiments : regex multi-line [\\s\\S]*?", () => {
    expect(src).toMatch(/from\\\(\["'\]batiments\["'\]\\\)\[\\\\s\\\\S\]\*\?/);
  });

  it("Charge services : regex multi-line [\\s\\S]*?", () => {
    expect(src).toMatch(/from\\\(\["'\]etages\["'\]\\\)\[\\\\s\\\\S\]\*\?/);
  });
});
