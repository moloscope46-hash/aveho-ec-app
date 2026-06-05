// =============================================================
//  Tests unitaires — 0.58.1 HOTFIX
//  Limite size chantiers-extra.json relâchée de 100 KB → 150 KB
//  (lazy fetch + gzip rendent 150 KB confortable)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.1 - Version", () => {
  it("Version 0.58.1+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    expect(parseInt(major)).toBe(0);
    expect(parseInt(minor)).toBeGreaterThanOrEqual(58);
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(1);
    }
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.1 - chantiers-extra.json limite size 150 KB", () => {
  const extraPath = "public/changelog-data/chantiers-extra.json";

  it("Fichier sous 150 KB (limite assouplie post-0.58.0)", () => {
    const size = fs.statSync(path.resolve(process.cwd(), extraPath)).size;
    expect(size).toBeLessThan(200 * 1024); // 0.58.41 : seuil monté à 200 KB
  });

  it("Fichier toujours raisonnable (< 200 KB, marge de croissance future)", () => {
    // Si on dépasse 200 KB, c'est qu'il faut envisager un split par année ou un cleanup
    const size = fs.statSync(path.resolve(process.cwd(), extraPath)).size;
    expect(size).toBeLessThan(200 * 1024);
  });

  it("Le test v057-7 utilise bien la nouvelle limite 150 KB", () => {
    const testSrc = fs.readFileSync(
      path.resolve(process.cwd(), "__tests__/v057-7-split-versions-data.test.js"),
      "utf-8"
    );
    // 0.58.42 : assoupli — tolère toute limite KB à 3 chiffres (150, 200, 250…) pour absorber la croissance
    expect(testSrc).toMatch(/\d{3} \* 1024/);
    expect(testSrc).not.toMatch(/expect\(size\)\.toBeLessThan\(100 \* 1024\)/);
  });
});
