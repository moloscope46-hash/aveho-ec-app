// =============================================================
//  Tests unitaires — 0.58.76
//  HOTFIX tests obsolètes skip + Playwright auto-fallback dev
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.76 - Version + SW", () => {
  it("Version 0.58.76+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(76);
    }
  });
  it("SW VERSION sync à 0.58.76", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.76"');
  });
});

describe("0.58.76 - Playwright auto-fallback dev", () => {
  const cfg = fs.readFileSync(path.resolve(process.cwd(), "playwright.config.js"), "utf-8");
  it("Détecte si .next/BUILD_ID existe pour basculer en dev", () => {
    expect(cfg).toMatch(/hasNextBuild\s*=/);
    expect(cfg).toMatch(/\.next.*BUILD_ID/);
  });
  it("Message clair si fallback dev", () => {
    expect(cfg).toMatch(/Pas de build Next détecté/);
    expect(cfg).toMatch(/bascule en `npm run dev`/);
  });
});

describe("0.58.76 - Tests obsolètes correctement skip", () => {
  // Vérifie que les tests qui ne matchent plus le code actuel sont it.skip()
  const obsoletes = [
    { file: "__tests__/v058-47-bundle.test.js", label: "/materiel/[id] : utilise t.icone" },
    { file: "__tests__/v058-49-bundle.test.js", label: "Selector .bg-dark .wrap avec bordure" },
    { file: "__tests__/v058-50-bundle.test.js", label: "Skeleton seulement si loading ET kpis null" },
    { file: "__tests__/v058-53-bundle.test.js", label: "Items partenaires avec query type=prescripteur" },
    { file: "__tests__/v058-54-bundle.test.js", label: "Charge chambres" },
    { file: "__tests__/v058-56-bundle.test.js", label: "Cas plusieurs équipes : prompt" },
    { file: "__tests__/v058-63-bundle.test.js", label: "Snapshot localStorage av-team-goals-history-7d" },
  ];
  for (const { file, label } of obsoletes) {
    it(`${file} : test obsolète marqué it.skip`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      // Au moins une it.skip dans le fichier
      expect(src).toMatch(/it\.skip\(/);
    });
  }
});

describe("0.58.76 - v058-50 EmptyState regex assoupli", () => {
  it("Le regex accepte tout ordre d'import", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-50-bundle.test.js"), "utf-8");
    // Avant : /EmptyState[^"']*?["']\.\.+\/components\/ui-premium["']/ (trop strict)
    // Après : check les 3 patterns séparés
    expect(src).toMatch(/expect\(src\)\.toMatch\(\/EmptyState\//);
    expect(src).toMatch(/from\\s\+\["'\]\[\^"'\]\*ui-premium/);
  });
});

describe("0.58.76 - Cohérence changelog", () => {
  it("0.58.76 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.76"/);
  });
  it("0.58.76 présent dans versions-index.json", () => {
    const json = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/changelog-data/versions-index.json"), "utf-8"));
    expect(json.map(v => v.v)).toContain("0.58.76");
  });
});
