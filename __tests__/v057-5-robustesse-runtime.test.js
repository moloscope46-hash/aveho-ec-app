// =============================================================
//  Tests unitaires — 0.57.5
//  Robustesse runtime : promises non gérées, useEffect async sans
//  try/catch, fuites mémoire (event listeners, timers)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.5 - Version + bump", () => {
  it("Version 0.57.5+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(5);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.5 - lib/useAsyncEffect helper", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/useAsyncEffect.js"), "utf-8");

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "lib/useAsyncEffect.js"))).toBe(true);
  });

  it("Export useAsyncEffect (hook)", () => {
    expect(src).toMatch(/export function useAsyncEffect/);
  });

  it("Wrap try/catch avec logger.error en cas d'erreur", () => {
    expect(src).toContain("try {");
    expect(src).toMatch(/logger\.error/);
  });

  it("Fournit un context { isMounted, signal } à la callback", () => {
    expect(src).toMatch(/isMounted\s*:/);
    expect(src).toMatch(/signal/);
  });

  it("AbortController utilisé pour annuler les requêtes pendantes", () => {
    expect(src).toContain("AbortController");
    expect(src).toMatch(/abort\(\)/);
  });

  it("Flag mounted réinitialisé à false au cleanup", () => {
    expect(src).toMatch(/mounted\s*=\s*false/);
  });
});

describe("0.57.5 - SignaturePad : cleanup HID listener au démontage", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/SignaturePad.js"), "utf-8");

  it("hidListenerRef stocké pour cleanup", () => {
    expect(src).toContain("hidListenerRef");
  });

  it("removeEventListener('inputreport') dans le cleanup useEffect", () => {
    expect(src).toMatch(/removeEventListener\(["']inputreport["']/);
  });

  it("getDevices() a un .catch (browser unsupported)", () => {
    // Le .catch est sur la chaîne .then().catch(), donc on regarde
    // qu'il y a bien un .catch quelque part dans le fichier.
    expect(src).toMatch(/\.catch\(/);
    // Et qu'il loggue le getDevices failed pour traçabilité
    expect(src).toMatch(/getDevices failed|WebHID getDevices/);
  });
});

describe("0.57.5 - Promises avec .catch ajoutées", () => {
  const files = [
    {
      file: "app/ConsentementRGPD.js",
      mustHaveCatchCount: 4,  // 4 promises supabase chained avec catch
    },
    {
      file: "app/NotificationOptIn.js",
      mustHaveCatchCount: 2,  // 2 .catch sur serviceWorker.ready
    },
    {
      file: "app/components/EtabPhoto.js",
      mustHaveCatchCount: 1,  // fetchGooglePlace catch
    },
    {
      file: "app/OfflineBanner.js",
      mustHaveCatchCount: 1,  // getQueueItems catch
    },
    {
      file: "app/crud.js",
      mustHaveCatchCount: 3,  // 3 imports dynamiques pour CSV/PDF
    },
  ];

  files.forEach(({ file, mustHaveCatchCount }) => {
    it(`${file} : ${mustHaveCatchCount}+ .catch() sur les promises`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      const matches = src.match(/\.catch\(/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(mustHaveCatchCount);
    });
  });
});

describe("0.57.5 - useEffect async wrap try/catch + logger sur 18+ pages", () => {
  const pages = [
    "app/AnnoncesBanner.js",
    "app/MesValidationsEnAttente.js",
    "app/NotificationPreferences.js",
    "app/statistiques-rgpd/page.js",
    "app/magasins/page.js",
    "app/audit/page.js",
    "app/etablissement/page.js",
    "app/promotions/page.js",
    "app/calendrier/page.js",
    "app/digest-dashboard/page.js",
    "app/materiels/page.js",
    "app/annuaire-rpps/page.js",
    "app/commandes/page.js",
    "app/scan/bulletin-situation/page.js",
    "app/scan/prescription/page.js",
    "app/vue-globale/page.js",
    "app/patient/[id]/page.js",
  ];

  pages.forEach((p) => {
    it(`${p} : try/catch présent + import logger`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      // try { ... } catch
      expect(src).toContain("try {");
      expect(src).toMatch(/catch\s*\(/);
      // logger.error appelé quelque part
      expect(src).toMatch(/logger\.(error|warn)\(/);
    });
  });
});

describe("0.57.5 - patient/[id]/page.js : try/catch englobant le useEffect géant", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");

  it("logger importé", () => {
    expect(src).toMatch(/import\s*\{\s*logger\s*\}\s*from/);
  });

  it("try/catch + finally setLoading(false)", () => {
    // Le useEffect doit avoir try ... catch ... finally avec setLoading
    expect(src).toMatch(/try\s*\{[\s\S]*catch[\s\S]*finally\s*\{[\s\S]*setLoading\(false\)/);
  });

  it("Caisse + mutuelle ont .catch individuels", () => {
    // Pour ne pas faire planter Promise.all si l'une rejette
    expect(src).toMatch(/setCaisseInfo[\s\S]{0,200}\.catch/);
    expect(src).toMatch(/setMutuelleInfo[\s\S]{0,200}\.catch/);
  });
});

describe("0.57.5 - achats/page.js : .catch sur notifyValideurs async", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");

  it("notifyValideurs.then a .catch chaîné", () => {
    // Le try/catch ne couvre PAS la promise qui s'exécute après l'await import.
    // Donc on a ajouté .catch dans la chaîne.
    expect(src).toMatch(/notifyValideurs\(supabase[\s\S]{0,500}\.catch/);
  });
});

describe("0.57.5 - lib/useAsyncEffect disponible et fonctionnel", () => {
  it("export typescript-friendly (function declaration)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "lib/useAsyncEffect.js"), "utf-8");
    expect(src).toMatch(/export function useAsyncEffect\s*\(/);
  });
});
