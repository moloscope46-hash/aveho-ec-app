// =============================================================
//  Tests unitaires — 0.56.22
//  Qualité code : migration console.log → logger,
//                 try/catch sur 5 pages, upgrade vitest 4
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.22 - vitest upgraded to 4.x", () => {
  it("package.json vitest >= 4.1.0", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const v = pkg.devDependencies.vitest.replace(/^[\^~]/, "");
    const maj = parseInt(v.split(".")[0], 10);
    expect(maj).toBeGreaterThanOrEqual(4);
  });
});

describe("0.56.22 - console.* migré vers lib/logger", () => {
  const filesToCheck = [
    "app/carte/page.js",
    "app/changelog/page.js",
    "app/api/rpps/route.js",
    "app/api/finess/route.js",
    "app/lib/checkEtabDoublon.js",
    "app/NotificationOptIn.js",
    "lib/exportExcel.js",
  ];

  filesToCheck.forEach((f) => {
    it(`${f} : import logger présent`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/import \{ logger \} from ["']/);
    });

    it(`${f} : utilise logger.* au lieu de console.*`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      // Pas de console.log/warn/error résiduel
      // (sauf dans commentaires)
      const lines = src.split("\n").filter(l => !l.trim().startsWith("//"));
      const stripped = lines.join("\n");
      expect(stripped).not.toMatch(/\bconsole\.(log|warn|error)\(/);
    });
  });
});

describe("0.56.22 - try/catch ajouté sur les 5 pages identifiées", () => {
  const pages = [
    "app/admin/bulletins-archive/page.js",
    "app/journal/page.js",
    "app/materiel/[id]/page.js",
    "app/tags-materiel/page.js",
    "app/page.js",
  ];

  pages.forEach((p) => {
    it(`${p} : contient try { + catch ou .catch chaîné`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      // soit try { ... } catch (...)
      // soit .catch((...) => ...)
      const hasTryCatch = src.includes("try {") && /catch\s*\(/.test(src);
      const hasPromiseCatch = /\.catch\(\(/.test(src);
      expect(hasTryCatch || hasPromiseCatch).toBe(true);
    });

    it(`${p} : import logger présent`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/import \{ logger \} from ["']/);
    });
  });
});

describe("0.56.22 - logger.error appelé pour reporter les erreurs", () => {
  const pages = [
    "app/admin/bulletins-archive/page.js",
    "app/journal/page.js",
    "app/materiel/[id]/page.js",
    "app/tags-materiel/page.js",
  ];

  pages.forEach((p) => {
    it(`${p} : logger.error présent dans le catch`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/logger\.error\(/);
    });
  });
});
