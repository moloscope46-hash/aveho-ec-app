// =============================================================
//  Tests unitaires — 0.58.66
//  Hotfix build SSR-safe + EquipeSelector 4 formulaires + Filtres tuiles combinés + Sparkline 90j
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.66 - Version", () => {
  it("Version 0.58.66+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(66);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.66 - HOTFIX BUILD : Supabase client SSR-safe", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/supabase.js"), "utf-8");

  it("Stub client returned when env vars missing (no throw)", () => {
    // 0.58.66 : ne throw plus, retourne un Proxy stub
    expect(src).toMatch(/Proxy\(/);
    expect(src).toMatch(/from: \(\) => stubBuilder/);
  });

  it("Stub couvre auth + storage + rpc + channel + functions", () => {
    expect(src).toMatch(/auth:\s*\{/);
    expect(src).toMatch(/storage:\s*\{/);
    expect(src).toMatch(/rpc:/);
    expect(src).toMatch(/channel:/);
    expect(src).toMatch(/functions:/);
  });

  it("createBrowserClient seulement si url + key OK", () => {
    expect(src).toMatch(/if \(!url \|\| !key\)/);
    expect(src).toMatch(/return createBrowserClient\(url, key\)/);
  });
});

describe("0.58.66 - EquipeSelector dans 4 formulaires restants", () => {
  it("/achats payload + import + UI", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/equipe_id: form\.equipe_id \|\| null/);
    expect(src).toMatch(/<EquipeSelector[\s\S]*?label="Équipe responsable"/);
  });

  it("/signalements payload + import + UI conditionnelle", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/signalements/page.js"), "utf-8");
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/equipe_id: form\.equipe_id \|\| null/);
    expect(src).toMatch(/!modal\?\.id \|\| isAdmin/);
  });

  it("/transferts payload + import + UI", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/transferts/page.js"), "utf-8");
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/equipe_id: form\.equipe_id \|\| null/);
    expect(src).toMatch(/<EquipeSelector[\s\S]*?label="Équipe responsable"/);
  });

  it("/panier (commandes) payload + state equipeId", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/panier/page.js"), "utf-8");
    expect(src).toMatch(/import EquipeSelector from/);
    expect(src).toMatch(/const \[equipeId, setEquipeId\] = useState/);
    expect(src).toMatch(/equipe_id: equipeId \|\| null/);
    expect(src).toMatch(/<EquipeSelector/);
  });
});

describe("0.58.66 - Filtres avancés Vue Tuiles changelog (combiner tri + tag)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Récap visuel avec chips pour chaque filtre actif", () => {
    // 0.58.73 : le commentaire est en minuscule "récap visuel" (pas "Récap")
    expect(src).toMatch(/récap visuel des filtres actifs combinés/i);
  });

  it("Chips removables : filter / search / themes individuels", () => {
    expect(src).toMatch(/onClick=\{\(\) => setFilter\("all"\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => setSearch\(""\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => toggleTheme\(t\)\}/);
  });

  it("Bouton 'Tout réinitialiser' visible quand filtres actifs", () => {
    expect(src).toMatch(/Tout réinitialiser/);
    expect(src).toMatch(/onClick=\{resetFilters\}/);
  });

  it("Sort + tag toujours combinés dans useMemo filtered", () => {
    expect(src).toMatch(/\[filter, search, selectedThemes, sortMode/);
  });

  it("Couleur de chip = couleur du theme", () => {
    expect(src).toMatch(/background: themeData\.color/);
  });
});

describe("0.58.66 - Sparkline 90j (rétention max CRON)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/TeamGoalsSparkline.js"), "utf-8");

  it("3 modes : 7j / 30j / 90j", () => {
    expect(src).toMatch(/onClick=\{\(\) => setRangeDays\(7\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => setRangeDays\(30\)\}/);
    expect(src).toMatch(/onClick=\{\(\) => setRangeDays\(90\)\}/);
  });

  it("displayHistory slice -90 pour 90j", () => {
    expect(src).toMatch(/history\.slice\(-90\)/);
  });

  it("Dimensions adaptées 380x90 (90j)", () => {
    expect(src).toMatch(/rangeDays === 90 \? 380/);
    expect(src).toMatch(/rangeDays === 90 \? 90/);
  });

  it("Points encore plus petits en 90j (r=1.2)", () => {
    expect(src).toMatch(/rangeDays === 90 \? 1\.2/);
  });

  it("Fallback localStorage étendu à 90j", () => {
    expect(src).toMatch(/history\.slice\(-90\)/);
  });

  it("Tooltip 'rétention maximale du serveur'", () => {
    expect(src).toMatch(/rétention maximale du serveur/);
  });
});
