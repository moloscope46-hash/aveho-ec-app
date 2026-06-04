// =============================================================
//  Tests unitaires — 0.57.39 HOTFIX
//  Bug critique en prod : "Lbl is not defined" sur /patient/[id]/edit
//  + IconButton manquant dans maintenance
//
//  LINT anti-régression : détecte les composants JSX utilisés mais
//  non importés / non définis localement.
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.39 - Version", () => {
  it("Version 0.57.39+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(39);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.39 - Fix bug Lbl manquant dans TabSecu", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/patient/[id]/edit/tabs/TabSecu.js"),
    "utf-8"
  );

  it("TabSecu.js importe Lbl depuis ./_helpers", () => {
    const importLine = src.match(/import\s+\{([^}]+)\}\s+from\s+["']\.\/_helpers["']/);
    expect(importLine).toBeTruthy();
    expect(importLine[1]).toMatch(/\bLbl\b/);
  });

  it("TabSecu.js utilise <Lbl> (sinon import inutile)", () => {
    expect(src).toMatch(/<Lbl>/);
  });
});

describe("0.57.39 - Fix bug IconButton manquant dans maintenance", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/maintenance/page.js"),
    "utf-8"
  );

  it("maintenance/page.js importe IconButton depuis ../ui", () => {
    const importLine = src.match(/import\s+\{([^}]+)\}\s+from\s+["']\.\.\/ui["']/);
    expect(importLine).toBeTruthy();
    expect(importLine[1]).toMatch(/\bIconButton\b/);
  });

  it("maintenance/page.js utilise <IconButton>", () => {
    expect(src).toMatch(/<IconButton/);
  });
});

describe("0.57.39 - LINT anti-régression CRITIQUE : composants utilisés = composants importés", () => {
  // Composants connus exportés depuis app/ui.js
  const UI_COMPONENTS = new Set([
    "PageHead", "Panel", "StateMsg", "Modal", "Btn", "IconButton",
    "FilterBar", "Pill", "Spinner", "Empty", "ErrorBox",
  ]);
  // Composants helpers Tab*
  const HELPER_COMPONENTS = new Set([
    "Lbl", "Field", "FieldSelect", "FieldCheckbox", "Toggle", "KvBlock",
  ]);
  const ALL_KNOWN = new Set([...UI_COMPONENTS, ...HELPER_COMPONENTS]);

  function findPages() {
    const pages = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else if ((item.name.endsWith(".js") || item.name.endsWith(".jsx"))) {
          const fullNorm = full.replace(/\\/g, "/");
          if (fullNorm.includes("/__tests__/") || fullNorm.includes("/changelog/versions-data")) continue;
          pages.push(full);
        }
      }
    }
    scan(path.resolve(process.cwd(), "app"));
    return pages;
  }

  it("Aucun composant connu utilisé dans le JSX sans être importé ou défini localement", () => {
    const violations = [];
    for (const page of findPages()) {
      const src = fs.readFileSync(page, "utf-8");

      // Récupère les imports : `import X from` ET `import { A, B } from` ET `import X, { A, B } from`
      const imported = new Set();
      // Pattern 1 : default uniquement → import X from
      for (const m of src.matchAll(/import\s+([A-Z]\w+)(?:\s*,\s*\{[^}]*\})?\s+from/g)) {
        imported.add(m[1]);
      }
      // Pattern 2 : named imports → import ... { A, B } from
      for (const m of src.matchAll(/import\s+(?:[A-Z]\w+\s*,\s*)?\{([^}]+)\}\s+from/g)) {
        for (const name of m[1].split(",")) {
          const clean = name.trim().split(" as ")[0].trim();
          if (clean && clean[0] === clean[0].toUpperCase()) {
            imported.add(clean);
          }
        }
      }
      // Définitions locales : function X, const X, class X, export function X, export default function X
      for (const m of src.matchAll(/^(?:export\s+(?:default\s+)?)?(?:function|const|class)\s+([A-Z]\w+)\s*[=({]/gm)) {
        imported.add(m[1]);
      }

      // Composants JSX utilisés (uniquement les noms qu'on sait reconnaître)
      const used = new Set();
      for (const m of src.matchAll(/<([A-Z]\w+)\b/g)) {
        if (ALL_KNOWN.has(m[1])) used.add(m[1]);
      }

      for (const comp of used) {
        if (!imported.has(comp)) {
          const fullNorm = page.replace(/\\/g, "/");
          violations.push(`${fullNorm} → <${comp}>`);
        }
      }
    }
    expect(
      violations,
      `Composants UI/Helpers utilisés sans import dans le JSX (= crash runtime garanti) :\n${violations.join("\n")}`
    ).toEqual([]);
  });
});

describe("0.57.39 - Pattern de détection robuste (anti-faux-positifs)", () => {
  it("Reconnaît le pattern 'import X, { A, B } from'", () => {
    const code = `import BulkActions, { useBulkSelection } from "../BulkActions";`;
    const imported = new Set();
    for (const m of code.matchAll(/import\s+([A-Z]\w+)(?:\s*,\s*\{[^}]*\})?\s+from/g)) {
      imported.add(m[1]);
    }
    for (const m of code.matchAll(/import\s+(?:[A-Z]\w+\s*,\s*)?\{([^}]+)\}\s+from/g)) {
      for (const name of m[1].split(",")) {
        const clean = name.trim().split(" as ")[0].trim();
        if (clean && clean[0] === clean[0].toUpperCase()) imported.add(clean);
      }
    }
    expect(imported.has("BulkActions")).toBe(true);
    expect(imported.has("useBulkSelection")).toBe(false); // commence par minuscule
  });
});
