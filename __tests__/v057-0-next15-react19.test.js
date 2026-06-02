// =============================================================
//  Tests unitaires — 0.57.0
//  Saut Next.js 14.2.35 → 15.5 + React 18 → 19
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.0 - Next.js upgraded to 15.x", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));

  it("Version package 0.57.x", () => {
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
  });

  it("Next.js >= 15.0", () => {
    const v = pkg.dependencies.next.replace(/^[\^~]/, "");
    const maj = parseInt(v.split(".")[0], 10);
    expect(maj).toBeGreaterThanOrEqual(15);
  });

  it("React >= 19.0", () => {
    const v = pkg.dependencies.react.replace(/^[\^~]/, "");
    const maj = parseInt(v.split(".")[0], 10);
    expect(maj).toBeGreaterThanOrEqual(19);
  });

  it("React-DOM >= 19.0", () => {
    const v = pkg.dependencies["react-dom"].replace(/^[\^~]/, "");
    const maj = parseInt(v.split(".")[0], 10);
    expect(maj).toBeGreaterThanOrEqual(19);
  });
});

describe("0.57.0 - Pages dynamiques utilisent useParams() côté client", () => {
  // Next 15 a breaking change : `params` est devenu une Promise dans les
  // Server Components. Mais comme toutes nos pages dynamiques sont des
  // Client Components qui utilisent useParams(), aucune modif requise.
  const dynamicPages = [
    "app/materiel/[id]/page.js",
    "app/patient/[id]/page.js",
    "app/patient/[id]/edit/page.js",
    "app/patient/[id]/dashboard/page.js",
    "app/equipe/[id]/page.js",
    "app/inscription/[token]/page.js",
    "app/verifier/[id]/page.js",
  ];

  dynamicPages.forEach((p) => {
    it(`${p} : Client Component avec useParams()`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      // Doit commencer par "use client" (sinon serait Server Component cassé)
      expect(src.split("\n")[0]).toBe('"use client";');
      // Doit utiliser useParams (sinon serait pas accessible)
      expect(src).toMatch(/useParams\s*\(\s*\)/);
    });
  });
});

describe("0.57.0 - Aucun Server Component avec props params (refactor évité)", () => {
  it("Aucun Server Component avec destructuring params dans signature", () => {
    // Si un fichier sans "use client" prend ({ params }) → cassé en Next 15
    const fs2 = require("fs");
    const glob = (dir) => {
      const out = [];
      const walk = (d) => {
        for (const entry of fs2.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name === "page.js" || entry.name === "layout.js") out.push(full);
        }
      };
      walk(dir);
      return out;
    };

    const broken = [];
    for (const f of glob(path.resolve(process.cwd(), "app"))) {
      const src = fs2.readFileSync(f, "utf-8");
      const firstLine = src.split("\n")[0];
      const isClient = firstLine === '"use client";';
      if (!isClient) {
        // Server Component : ne doit pas destructurer params dans signature
        // car en Next 15 c'est une Promise → cassé
        if (/\(\s*\{\s*params\s*\}\s*\)/.test(src)) {
          broken.push(f);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});

describe("0.57.0 - Build et tests compatibles", () => {
  it("eslint-config-next aligné sur Next 15 si présent", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    if (pkg.devDependencies?.["eslint-config-next"]) {
      const v = pkg.devDependencies["eslint-config-next"].replace(/^[\^~]/, "");
      const maj = parseInt(v.split(".")[0], 10);
      expect(maj).toBeGreaterThanOrEqual(15);
    } else {
      // Pas d'eslint-config-next configuré → pas de constraint
      expect(true).toBe(true);
    }
  });
});
