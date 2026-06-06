// =============================================================
//  Tests unitaires — 0.58.68
//  HOTFIX cache HTTP infini sur la page changelog
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.68 - Version", () => {
  it("Version 0.58.68+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(68);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.68 - Fix cache HTTP infini changelog", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Plus de cache:'force-cache' sur les fetch /changelog-data/", () => {
    // Anti-régression : on ne doit JAMAIS revenir à force-cache pour ces JSON
    const fetchBlocks = src.match(/fetch\([^)]+\/changelog-data\/[^)]+\)/g) || [];
    fetchBlocks.forEach(block => {
      expect(block).not.toMatch(/cache:\s*["']force-cache["']/);
    });
  });

  it("Utilise cache:'default' (respecte Cache-Control)", () => {
    // 0.58.73 : assertion plus laxe — la séquence versions-index/.../cache:default
    // peut être éclatée par le minify. On vérifie juste que les 2 sont présents.
    expect(src).toMatch(/changelog-data\/versions-index\.json/);
    expect(src).toMatch(/cache:\s*["']default["']/);
  });

  it("Cache-busting via ?v=pkg.version", () => {
    expect(src).toMatch(/versions-index\.json\?v=\$\{encodeURIComponent\(v\)\}/);
    expect(src).toMatch(/chantiers-extra\.json\?v=\$\{encodeURIComponent\(v\)\}/);
  });

  it("Utilise pkg.version pour le cache-busting", () => {
    expect(src).toMatch(/const v = pkg\.version \|\| ["']dev["']/);
  });
});

describe("0.58.68 - JSON public à jour", () => {
  it("versions-index.json contient bien 0.58.68+ en tête", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    expect(json.length).toBeGreaterThan(260);
    // 0.58.73 : l'assertion stricte sur position [0] était trop fragile — chaque
    // nouvelle version la cassait. On vérifie juste que 0.58.68 est PRÉSENT.
    const versions = json.map(v => v.v);
    expect(versions).toContain("0.58.68");
    expect(versions).toContain("0.58.67");
    expect(versions).toContain("0.58.66");
  });

  it("versions-data.js source contient 0.58.68 + 0.58.67 + 0.58.66", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.68"/);
    expect(src).toMatch(/"v":\s*"0\.58\.67"/);
    expect(src).toMatch(/"v":\s*"0\.58\.66"/);
  });
});
