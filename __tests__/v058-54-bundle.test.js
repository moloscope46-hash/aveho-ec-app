// =============================================================
//  Tests unitaires — 0.58.54
//  Filtre ctx étendu + Création partenaires FINESS (pharmacies, SSIAD)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.54 - Version", () => {
  it("Version 0.58.54+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(54);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.54 - Hook useContextPatientIds", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/useContextPatientIds.js"), "utf-8");

  it("Export nommé useContextPatientIds", () => {
    expect(src).toMatch(/export function useContextPatientIds/);
  });

  it("Utilise useCurrentContext", () => {
    expect(src).toMatch(/useCurrentContext\(\)/);
  });

  it("Charge chambres → patients (2 requêtes Supabase)", () => {
    expect(src).toMatch(/from\(["']chambres["']\)/);
    expect(src).toMatch(/from\(["']patients["']\)/);
    expect(src).toMatch(/in\(["']chambre_id["']/);
  });

  it("Retourne null si ctx inactif (pas de filtrage)", () => {
    expect(src).toMatch(/if \(!ctx\.active/);
    expect(src).toMatch(/setPatientIds\(null\)/);
  });
});

describe("0.58.54 - Filtre ctx appliqué dans /commandes /achats /signalements", () => {
  const pages = [
    "app/commandes/page.js",
    "app/achats/page.js",
    "app/signalements/page.js",
  ];

  pages.forEach(p => {
    it(`${p} : importe useContextPatientIds`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/import \{ useContextPatientIds \} from ["'][^"']*useContextPatientIds["']/);
    });

    it(`${p} : applique le filtre via patient_id`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
      expect(src).toMatch(/ctx\.active && patientIds/);
      expect(src).toMatch(/patientIds\.has\(/);
    });
  });

  it("/commandes : filteredCmds memoizé", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/commandes/page.js"), "utf-8");
    expect(src).toMatch(/filteredCmds = useMemo/);
    expect(src).toMatch(/filteredCmds\.map/);
  });

  it("/commandes : empty state contextuel (différent si ctx actif)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/commandes/page.js"), "utf-8");
    expect(src).toMatch(/Aucune commande dans ce périmètre/);
  });
});

describe("0.58.54 - Ajout partenaire depuis FINESS (pharmacies, SSIAD)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/partenaires-rpps/page.js"), "utf-8");

  it("Import FinessSearch", () => {
    expect(src).toMatch(/import FinessSearch from ["']\.\.\/FinessSearch["']/);
  });

  it("State finessSearchOpen + setter", () => {
    expect(src).toMatch(/finessSearchOpen,\s*setFinessSearchOpen/);
  });

  it("Bouton 'Ajouter depuis FINESS' visible", () => {
    expect(src).toMatch(/Ajouter depuis FINESS \(pharmacie, SSIAD\)/);
    expect(src).toMatch(/onClick=\{\(\) => setFinessSearchOpen\(true\)\}/);
  });

  it("Fonction addPartenaireFromFiness", () => {
    expect(src).toMatch(/async function addPartenaireFromFiness/);
  });

  it("Détection pharmacie + SSIAD depuis le type FINESS", () => {
    expect(src).toMatch(/isPharmacie =[\s\S]*?includes\(["']pharmac["']\)/);
    expect(src).toMatch(/isSsiad =[\s\S]*?(?:ssiad|infirm|had)/);
  });

  it("Payload : profession dynamique + flags est_pharmacien/est_intervenant", () => {
    expect(src).toMatch(/profession:[\s\S]*?isPharmacie \?[\s\S]*?Pharmacie d'officine/);
    expect(src).toMatch(/est_pharmacien:\s*isPharmacie/);
    expect(src).toMatch(/est_intervenant:\s*isSsiad/);
  });

  it("Stocke le FINESS dans le champ rpps (faute de mieux)", () => {
    expect(src).toMatch(/rpps:\s*finessNum/);
  });

  it("Check doublons par FINESS avant insert", () => {
    expect(src).toMatch(/eq\(["']rpps["'], finessNum\)/);
    expect(src).toMatch(/Déjà partenaire/);
  });

  it("Modal FINESS avec defaultCategories pharma_lpp + domicile", () => {
    expect(src).toMatch(/defaultCategories=\{\["pharma_lpp", "domicile"\]\}/);
  });
});

describe("0.58.54 - Cohérence : 4 boutons CTA (RPPS + FINESS)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/partenaires-rpps/page.js"), "utf-8");

  it("Les 2 boutons sont dans un container flex", () => {
    expect(src).toMatch(/display:\s*["']flex["'],\s*gap:\s*8,\s*flexWrap:\s*["']wrap["']/);
  });

  it("Bouton RPPS conservé (violet)", () => {
    expect(src).toMatch(/Ajouter depuis RPPS \(médecins, IDE\)/);
  });
});
