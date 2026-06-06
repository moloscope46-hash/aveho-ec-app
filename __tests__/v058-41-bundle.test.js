// =============================================================
//  Tests unitaires — 0.58.41 HOTFIX
//
//  Fix 6 tests obsolètes + 3 pages SSG Vercel + 404 prod membres_equipe silent
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.41 - Version", () => {
  it("Version 0.58.41+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(41);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.41 - Fix tests obsolètes (regex assouplis)", () => {
  it("v058-38 DEFAULT_ORDER : regex assoupli avec [^\\]]*\\]", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-38-bundle.test.js"), "utf-8");
    // Regex doit accepter du contenu après "liens-favoris" (et non "]" directement)
    expect(src).toMatch(/"liens-favoris"\[\^\\\]\]\*\\\]/);
  });

  it("v058-37 regex test multi-line présent", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-37-bundle.test.js"), "utf-8");
    // 0.58.51 : le test v058-37 vérifie que v058-35 utilise [\s\S]*? — donc v058-37 cherche
    //   le pattern littéral \\s\\S (escaped dans la regex de matching). C'est OK.
    expect(src).toMatch(/from\\\(\["'\]batiments\["'\]\\\)\\\[\\\\s\\\\S/);
  });

  it("v057-7 chantiers-extra : limite bumpée à 200 KB", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v057-7-split-versions-data.test.js"), "utf-8");
    expect(src).toMatch(/toBeLessThan\(200 \* 1024\)/);
  });

  it("v058-1 hotfix size : limite bumpée à 200 KB", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v058-1-hotfix-size-limit.test.js"), "utf-8");
    expect(src).toMatch(/toBeLessThan\(200 \* 1024\)/);
  });

  it("v057-11 versions-index : limite bumpée à 800 KB", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v057-11-lazy-versions-index.test.js"), "utf-8");
    expect(src).toMatch(/toBeLessThan\(800 \* 1024\)/);
  });
});

describe("0.58.41 - UserAttachmentsInfo défensif (404 silent)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/UserAttachmentsInfo.js"), "utf-8");

  it("Check error Supabase au lieu de relier sur try/catch", () => {
    expect(src).toMatch(/error:\s*e1[\s\S]*?if\s*\(e1\)/);
  });

  it("Flag sessionStorage 'av-attachments-disabled' pour ne plus refetch après erreur", () => {
    expect(src).toMatch(/sessionStorage\.getItem\(["']av-attachments-disabled["']\)/);
    expect(src).toMatch(/sessionStorage\.setItem\(["']av-attachments-disabled["'],\s*["']true["']\)/);
  });

  it("Préfixe 'av-' pour purgeable au logout", () => {
    expect(src).toMatch(/av-attachments-disabled/);
  });
});

describe("0.58.41 - 3 pages SSG : pattern Suspense Inner+wrapper", () => {
  ["statistiques-activite", "consentements", "parametres"].forEach((page) => {
    describe(`Page /${page}`, () => {
      const filePath = path.resolve(process.cwd(), `app/${page}/page.js`);
      const src = fs.readFileSync(filePath, "utf-8");

      it("Import Suspense de react", () => {
        expect(src).toMatch(/import\s*\{[^}]*Suspense[^}]*\}\s*from\s*["']react["']/);
      });

      it("Export default wrapper avec <Suspense fallback={null}>", () => {
        expect(src).toMatch(/export default function[\s\S]*?<Suspense fallback=\{null\}>/);
      });

      it("Composant Inner (séparé du wrapper)", () => {
        expect(src).toMatch(/function\s+\w+Inner\s*\(/);
      });

      it("Plus de 'export const dynamic = force-dynamic' (ne fonctionne pas en client component)", () => {
        expect(src).not.toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
      });
    });
  });
});
