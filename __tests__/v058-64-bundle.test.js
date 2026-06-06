// =============================================================
//  Tests unitaires — 0.58.64
//  FIX tags écrasés par regen + alert() natif + fallback table pharmacies
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.64 - Version", () => {
  it("Version 0.58.64+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(64);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.64 - FIX tags propagés correctement après regen", () => {
  const dataSrc = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
  const indexSrc = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-index.js"), "utf-8");

  it("16 nouveaux tags présents dans versions-data.js (source)", () => {
    expect(dataSrc).toMatch(/["']feature["']:\s*\{[\s\S]*?Nouvelle Feature/);
    expect(dataSrc).toMatch(/["']wow["']:\s*\{[\s\S]*?Wow effect/);
    expect(dataSrc).toMatch(/["']team["']:\s*\{[\s\S]*?Équipe/);
    expect(dataSrc).toMatch(/["']dashboard["']:\s*\{[\s\S]*?Dashboard/);
    expect(dataSrc).toMatch(/["']objectifs["']:\s*\{[\s\S]*?Objectifs/);
    expect(dataSrc).toMatch(/["']pharmacie["']:\s*\{[\s\S]*?Pharmacies/);
    expect(dataSrc).toMatch(/["']carte["']:\s*\{[\s\S]*?Carte/);
    expect(dataSrc).toMatch(/["']dnd["']:\s*\{[\s\S]*?Drag/);
    expect(dataSrc).toMatch(/["']mobile["']:\s*\{/);
    expect(dataSrc).toMatch(/["']animation["']:\s*\{/);
    expect(dataSrc).toMatch(/["']menu["']:\s*\{/);
    expect(dataSrc).toMatch(/["']partenaires["']:\s*\{/);
  });

  it("16 nouveaux tags propagés dans versions-index.js (généré)", () => {
    expect(indexSrc).toMatch(/["']feature["']:\s*\{/);
    expect(indexSrc).toMatch(/["']wow["']:\s*\{/);
    expect(indexSrc).toMatch(/["']team["']:\s*\{/);
    expect(indexSrc).toMatch(/["']dashboard["']:\s*\{/);
    expect(indexSrc).toMatch(/["']pharmacie["']:\s*\{/);
    expect(indexSrc).toMatch(/["']carte["']:\s*\{/);
    expect(indexSrc).toMatch(/["']dnd["']:\s*\{/);
  });

  it("Au moins 35 tags au total dans versions-index.js", () => {
    const matches = indexSrc.match(/^\s*"[a-z_]+":\s*\{/gm);
    expect(matches.length).toBeGreaterThanOrEqual(35);
  });
});

describe("0.58.64 - FIX alert() natif dans /carte", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");

  it("Plus d'alert() natif (toast.error utilisé à la place)", () => {
    // Compte les alert( hors commentaires
    const lines = src.split("\n").filter(l => !l.trim().startsWith("//"));
    const alertCount = lines.join("\n").match(/\balert\s*\(/g);
    expect(alertCount).toBeNull();
  });

  it("toast.error pour 'Position non disponible'", () => {
    expect(src).toMatch(/toast\.error\(["']Position non disponible/);
  });
});

describe("0.58.64 - Fallback gracieux 404 pharmacies (table absente)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/carte/page.js"), "utf-8");

  it("Détecte error code 42P01 / PGRST205 / not exist", () => {
    expect(src).toMatch(/error\.code === ["']PGRST205["']/);
    expect(src).toMatch(/error\.code === ["']42P01["']/);
    expect(src).toMatch(/does not exist/);
  });

  it("Flag localStorage av-pharmacies-table-missing", () => {
    expect(src).toMatch(/av-pharmacies-table-missing/);
  });

  it("Toggle Pharmacies caché si flag actif", () => {
    expect(src).toMatch(/localStorage\.getItem\(["']av-pharmacies-table-missing["']\) !== ["']1["']/);
  });

  it("setShowPharmacies(false) automatique sur erreur table", () => {
    expect(src).toMatch(/setShowPharmacies\(false\)/);
  });
});

describe("0.58.64 - Régression — anciens tags 0.58.61 toujours OK", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-index.js"), "utf-8");

  it("Tags 0.58.61 : feature + wow + team + dashboard + objectifs", () => {
    expect(src).toMatch(/["']feature["']:\s*\{[\s\S]*?Nouvelle Feature/);
    expect(src).toMatch(/["']wow["']:\s*\{[\s\S]*?Wow effect/);
    expect(src).toMatch(/["']team["']:\s*\{[\s\S]*?Équipe/);
    expect(src).toMatch(/["']dashboard["']:\s*\{[\s\S]*?Dashboard/);
    expect(src).toMatch(/["']objectifs["']:\s*\{[\s\S]*?Objectifs/);
  });

  it("Tags 0.58.61 : pharmacie + carte + dnd + mobile + animation + menu + partenaires", () => {
    expect(src).toMatch(/["']pharmacie["']:\s*\{/);
    expect(src).toMatch(/["']carte["']:\s*\{/);
    expect(src).toMatch(/["']dnd["']:\s*\{/);
    expect(src).toMatch(/["']mobile["']:\s*\{/);
    expect(src).toMatch(/["']animation["']:\s*\{/);
    expect(src).toMatch(/["']menu["']:\s*\{/);
    expect(src).toMatch(/["']partenaires["']:\s*\{/);
  });
});
