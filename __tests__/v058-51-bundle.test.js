// =============================================================
//  Tests unitaires — 0.58.51
//  Fix 4 tests obsolètes + 404 membres_equipe persistant + Migration 5 pages
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.51 - Version", () => {
  it("Version 0.58.51+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(51);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.51 - Fix tests obsolètes", () => {
  it("v058-40 NOTES_MAX_LEN test accepte ≥ 4 chiffres (50000)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-40-bundle.test.js"), "utf-8");
    // Pattern flexible : NOTES_MAX_LEN = au moins 4 chiffres
    expect(src).toMatch(/NOTES_MAX_LEN\\s\*=\\s\*\\d\{4,\}/);
  });

  it("v058-40 DEFAULT_ORDER test ne contraint plus 'notes' en dernier", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-40-bundle.test.js"), "utf-8");
    // Ancien pattern: \\\[[^\\\]]*"notes"\\\] → nouveau accepte autres widgets après
    expect(src).toMatch(/\[\^\\\]\]\*\["'\]notes\["'\]\[\^\\\]\]\*/);
  });

  it("v058-41 supprime assertion not.toMatch(\\\\\\\\s\\\\\\\\S)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-41-bundle.test.js"), "utf-8");
    // Le not.toMatch incorrect a été retiré
    expect(src).not.toMatch(/expect\(src\)\.not\.toMatch\(\/\\\\\\\\s\\\\\\\\S\/\)/);
  });

  it("v058-45 vigilance test utilise pattern JSX (sans dollar)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-45-bundle.test.js"), "utf-8");
    // Le code JSX utilise `Vigilance {vigColors.label}` (interpolation JSX, pas template literal)
    expect(src).toMatch(/Vigilance\\s\*\\\{vigColors\\\.label\\\}/);
  });
});

describe("0.58.51 - 404 membres_equipe : flag localStorage avec TTL 24h", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/UserAttachmentsInfo.js"), "utf-8");

  it("Utilise localStorage (au lieu de sessionStorage)", () => {
    expect(src).toMatch(/localStorage\.getItem\(FLAG_KEY/);
    expect(src).toMatch(/localStorage\.setItem\(FLAG_KEY/);
  });

  it("Flag avec timestamp d'expiration 24h", () => {
    expect(src).toMatch(/24 \* 60 \* 60 \* 1000/);
  });

  it("Comparaison until > Date.now() pour décider de skip", () => {
    expect(src).toMatch(/until > Date\.now\(\)/);
  });

  it("Clé localStorage : av-attachments-disabled-until", () => {
    expect(src).toMatch(/FLAG_KEY\s*=\s*["']av-attachments-disabled-until["']/);
  });
});

describe("0.58.51 - Migration UI premium 5 pages de plus", () => {
  const pages = [
    { path: "app/admin/bulletins-archive/page.js", icon: "ti-archive-off" },
    { path: "app/admin/referentiels-sante/page.js", icon: "ti-database-off" },
    { path: "app/admin/prescriptions-archive/page.js", icon: "ti-mood-empty" },
    { path: "app/partenaires-rpps/page.js", icon: "ti-stethoscope" },
    { path: "app/app-logs/page.js", icon: null },  // icon conditionnel
  ];

  pages.forEach(({ path: p, icon }) => {
    it(`${p} : importe EmptyState depuis ui-premium`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/EmptyState[^"']*?["'][^"']*ui-premium["']/);
    });
    if (icon) {
      it(`${p} : utilise icon=${icon}`, () => {
        const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
        expect(src).toMatch(new RegExp(`icon=["']${icon}["']`));
      });
    }
  });

  it("Total pages avec ui-premium : ≥ 40", () => {
    function findFiles(dir) {
      let results = [];
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== "node_modules" && item.name !== "components") {
          results = results.concat(findFiles(full));
        } else if (item.name === "page.js") {
          results.push(full);
        }
      }
      return results;
    }
    const files = findFiles(path.resolve(process.cwd(), "app"));
    const withPremium = files.filter(f => {
      const src = fs.readFileSync(f, "utf-8");
      return /from\s*["'][^"']*ui-premium["']/.test(src);
    });
    expect(withPremium.length).toBeGreaterThanOrEqual(40);
  });
});
