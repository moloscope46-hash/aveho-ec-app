// =============================================================
//  Tests 0.58.88 — HOTFIX BUILD : fragment JSX orphelin
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.88 - Version + SW", () => {
  it("Version 0.58.88+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.58\.(8[8-9]|9\d)|^0\.59|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.58.88", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.58.88"');
  });
});

describe("0.58.88 - Fragment JSX balance dans fichiers récents", () => {
  const files = [
    "app/mobile/patient/new/page.js",
    "app/etablissement/page.js",
    "app/stock/page.js",
    "app/vehicules/page.js",
    "app/mobile/cuve/remplissage/page.js",
    "app/components/CartDropdown.js",
    "app/components/DepotArticlesModal.js",
  ];
  files.forEach(f => {
    it(`${f} — fragments <> et </> balanced`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      const opens = (src.match(/<>/g) || []).length;
      const closes = (src.match(/<\/>/g) || []).length;
      expect(opens).toBe(closes);
    });
  });
});

describe("0.58.88 - Fix spécifique /mobile/patient/new", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("Plus de </> orphelin après </Section>", () => {
    // Pattern qui causait le bug : </Section>\n          </>\n        )}
    // Ne doit plus exister après le fix
    expect(src).not.toMatch(/<\/Section>\s*\n\s*<\/>\s*\n\s*\)\}\s*\n\s*\{\/\* ÉTAPE 1bis/);
  });
  it("Step 1 Identité termine bien par </Section>", () => {
    expect(src).toMatch(/Lieu de naissance[\s\S]{0,400}<\/Section>\s*\n\s*\)\}/);
  });
});

describe("0.58.88 - Cohérence changelog", () => {
  it("0.58.88 présent dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.58\.88"/);
  });
  it("Note HTML 0.58.88 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.58.88.html"))).toBe(true);
  });
});
