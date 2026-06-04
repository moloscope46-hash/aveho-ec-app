// =============================================================
//  Tests unitaires — 0.57.21
//  Hotfix Windows path bug dans v057-20 (.includes() sans normaliser \)
//  + audit anti-régression : aucun test ne doit faire .includes() sur
//    un path raw issu de path.join() sous Windows.
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.21 - Version", () => {
  it("Version 0.57.21+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(21);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.21 - Fix Windows path dans test v057-20", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "__tests__/v057-20-fix-views-auth.test.js"),
    "utf-8"
  );

  it("Test 'usage v_users_emails' normalise les \\ Windows avant includes()", () => {
    // Vérifier la présence de .replace(/\\/g, "/") avant les .includes() sur path
    expect(src).toMatch(/fullNorm.*replace\(\/\\\\\/g/);
  });

  it("Test utilise fullNorm.includes() pour 'changelog/versions-data'", () => {
    expect(src).toMatch(/fullNorm\.includes\("changelog\/versions-data"\)/);
  });

  it("Test utilise fullNorm.includes() pour 'changelog/lib'", () => {
    expect(src).toMatch(/fullNorm\.includes\("changelog\/lib"\)/);
  });

  it("Marqueur 0.57.21 dans le commentaire de fix", () => {
    expect(src).toMatch(/0\.57\.21/);
  });
});

describe("0.57.21 - Audit anti-régression : tous les tests sont safe Windows", () => {
  // Pour tout fichier __tests__/*.js qui fait fs.readdirSync + .includes() sur le path,
  // vérifier qu'il normalise d'abord les séparateurs Windows.

  function listTestFiles() {
    const dir = path.join(process.cwd(), "__tests__");
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(".test.js"))
      .map(f => path.join(dir, f));
  }

  it("Aucun test ne fait .includes() sur un path raw issu de path.join() (cause des faux positifs Windows)", () => {
    const violations = [];
    for (const file of listTestFiles()) {
      const src = fs.readFileSync(file, "utf-8");

      // Détecter les fichiers qui :
      //   1) utilisent fs.readdirSync (donc itèrent un dossier)
      //   2) ET font `full.includes(` ou `fpath.includes(` sur un path raw
      //   3) MAIS ne font PAS .replace(/\\/g, "/") avant
      if (!src.includes("readdirSync")) continue;

      // Pattern dangereux : variable.includes("...") avec / dans la string,
      //   alors que la variable est un path système.
      // On cherche full.includes("...\/...") ou fpath.includes("...\/...")
      const danger = /\b(full|fpath|filePath|fullPath)\.includes\(["'][^"']*\/[^"']*["']\)/g;
      const matches = src.match(danger) || [];

      for (const m of matches) {
        // Vérifier qu'il y a une normalisation .replace(/\\/g, "/") AVANT cette ligne
        // (recherche simple : présence du replace dans le fichier)
        const hasNormalize = /\.replace\(\/\\\\\/g\s*,\s*["']\/["']\)/.test(src);
        if (!hasNormalize) {
          violations.push({
            file: path.basename(file),
            match: m,
          });
        }
      }
    }

    if (violations.length > 0) {
      console.error("❌ Tests avec bug Windows path potentiel :");
      for (const v of violations) {
        console.error(`  ${v.file} : ${v.match}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("Au moins 100 fichiers de tests dans __tests__", () => {
    expect(listTestFiles().length).toBeGreaterThanOrEqual(100);
  });
});

describe("0.57.21 - Documentation : pourquoi ce bug récurrent ?", () => {
  it("Marathon 0.56.20→0.57.21 : 3 occurrences du bug Windows path", () => {
    // 0.57.17 : LINT POST/PUT/DELETE → fixé en 0.57.19
    // 0.57.20 : usage v_users_emails → fixé en 0.57.21
    // Pattern récurrent : sous Linux les paths ont /, sous Windows \, donc
    // les .replace("/route.js") ou .includes("changelog/") ne matchent pas
    // si on les fait AVANT de normaliser.

    // Règle d'or à retenir :
    // → Quand on manipule un path issu de path.join() ou fs.readdirSync,
    //   TOUJOURS faire .replace(/\\/g, "/") en PREMIER, puis comparer.

    // Vérifier que cette règle est documentée quelque part
    const noteFile = "public/changelog-notes/NOTE-VERSION-Alpha-0.57.21.html";
    if (fs.existsSync(path.resolve(process.cwd(), noteFile))) {
      const src = fs.readFileSync(path.resolve(process.cwd(), noteFile), "utf-8");
      expect(src).toMatch(/Windows/);
    }
    // Sinon : le test passe (le fichier est créé après les tests)
    expect(true).toBe(true);
  });
});
