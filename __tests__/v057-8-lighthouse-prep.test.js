// =============================================================
//  Tests unitaires — 0.57.8
//  Préparation à l'audit Lighthouse :
//   - next/font Quicksand
//   - 8 composants layout lazy
//   - preconnect Supabase
//   - script lighthouse-guide
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.8 - Version + bump", () => {
  it("Version 0.57.8+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(8);
  });
});

describe("0.57.8 - Quicksand via next/font (no FOUT/CLS)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");

  it("Import Quicksand depuis next/font/google", () => {
    expect(src).toMatch(/import\s*\{\s*Quicksand\s*\}\s*from\s*["']next\/font\/google["']/);
  });

  it("Configuration : 4 weights + subset latin + display swap", () => {
    expect(src).toMatch(/Quicksand\(\s*\{/);
    expect(src).toMatch(/subsets:\s*\[\s*["']latin["']/);
    expect(src).toMatch(/weight:\s*\[\s*["']400["']/);
    expect(src).toMatch(/display:\s*["']swap["']/);
  });

  it("Variable CSS générée (--font-quicksand)", () => {
    expect(src).toMatch(/variable:\s*["']--font-quicksand["']/);
  });

  it("html classe avec quicksand.variable", () => {
    expect(src).toMatch(/<html[^>]*className=\{quicksand\.variable\}/);
  });

  it("Plus de <link> vers Google Fonts CDN", () => {
    // On accepte la mention dans un commentaire (historique 0.57.8),
    // on vérifie juste qu'il n'y a plus de balise <link href="https://fonts.googleapis.com">
    expect(src).not.toMatch(/<link[^>]*href=["']https?:\/\/fonts\.googleapis/);
  });

  it("globals.css utilise --font-quicksand", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/--font-quicksand/);
  });
});

describe("0.57.8 - Preconnect Supabase (anticipe TTFB)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");

  it("Tag <link rel=\"preconnect\"> vers Supabase", () => {
    expect(src).toMatch(/rel=["']preconnect["']/);
    expect(src).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("crossOrigin=\"anonymous\" pour preconnect", () => {
    expect(src).toMatch(/crossOrigin=["']anonymous["']/);
  });
});

describe("0.57.8 - LazyLayoutChrome (8 composants lazy)", () => {
  const chromePath = "app/LazyLayoutChrome.js";

  it("Fichier existe et est un Client Component", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), chromePath))).toBe(true);
    const src = fs.readFileSync(path.resolve(process.cwd(), chromePath), "utf-8");
    expect(src.startsWith('"use client"')).toBe(true);
  });

  const COMPONENTS_LAZY = [
    "InstallBanner",
    "KeyboardHelp",
    "VersionCheck",
    "AnnoncesBanner",
    "FocusMode",
    "GeolocPrompt",
    "BiometricOptInModal",
    "FloatingActionBar",
  ];

  COMPONENTS_LAZY.forEach((comp) => {
    it(`${comp} chargé en dynamic ssr: false`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), chromePath), "utf-8");
      // Pattern : const Comp = dynamic(() => import("./Comp"), { ssr: false });
      const re = new RegExp(`const ${comp}\\s*=\\s*dynamic\\(\\(\\)\\s*=>\\s*import\\(["']\\.\\/${comp}["']\\)\\s*,\\s*\\{\\s*ssr:\\s*false\\s*\\}\\s*\\)`);
      expect(src).toMatch(re);
    });

    it(`${comp} monté dans le rendu de LazyLayoutChrome`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), chromePath), "utf-8");
      expect(src).toMatch(new RegExp(`<${comp}\\s*/?>`));
    });
  });
});

describe("0.57.8 - Layout : LazyLayoutChrome monté + imports critiques statiques", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");

  it("Import LazyLayoutChrome", () => {
    expect(src).toMatch(/import\s+LazyLayoutChrome\s+from\s+["']\.\/LazyLayoutChrome["']/);
  });

  it("<LazyLayoutChrome /> monté dans le body", () => {
    expect(src).toMatch(/<LazyLayoutChrome\s*\/>/);
  });

  // Composants critiques qui DOIVENT rester statiques (visibles dès le LCP)
  const STATIC_COMPONENTS = [
    "OfflineBanner",         // offline indicator
    "LectureSeuleBadge",     // permissions
    "GlobalSearch",          // /
    "AlertToastContainer",   // toasts
    "DialogsHost",           // confirm/alert
    "GlobalErrorCapture",    // capture early errors
  ];

  STATIC_COMPONENTS.forEach((comp) => {
    it(`${comp} reste en import statique (rendu critique)`, () => {
      const re = new RegExp(`import\\s+\\{?\\s*${comp}\\s*\\}?\\s+from\\s+["']`);
      expect(src).toMatch(re);
    });
  });

  it("Plus d'imports statiques des composants lazy", () => {
    // Sécurité : on vérifie qu'on n'a pas oublié de retirer un import
    expect(src).not.toMatch(/^import InstallBanner from/m);
    expect(src).not.toMatch(/^import KeyboardHelp from/m);
    expect(src).not.toMatch(/^import VersionCheck from/m);
    expect(src).not.toMatch(/^import AnnoncesBanner from/m);
    expect(src).not.toMatch(/^import FocusMode from/m);
    expect(src).not.toMatch(/^import GeolocPrompt from/m);
    expect(src).not.toMatch(/^import BiometricOptInModal from/m);
    expect(src).not.toMatch(/^import FloatingActionBar from/m);
  });
});

describe("0.57.8 - Script lighthouse-guide.sh", () => {
  it("scripts/lighthouse-guide.sh existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "scripts/lighthouse-guide.sh"))).toBe(true);
  });

  it("Script contient les seuils Core Web Vitals", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "scripts/lighthouse-guide.sh"), "utf-8");
    expect(src).toMatch(/LCP/);
    expect(src).toMatch(/INP/);
    expect(src).toMatch(/CLS/);
    // Seuil LCP 2.5s
    expect(src).toMatch(/2\.5s/);
    // Seuil CLS 0.1
    expect(src).toMatch(/0\.1/);
  });

  it("Liste les pages prioritaires à tester", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "scripts/lighthouse-guide.sh"), "utf-8");
    expect(src).toMatch(/\/login/);
    expect(src).toMatch(/\/vue-globale/);
    expect(src).toMatch(/\/patients/);
    expect(src).toMatch(/\/changelog/);
  });
});
