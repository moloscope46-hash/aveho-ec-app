// =============================================================
//  Tests unitaires — 0.58.36
//  Onglets /collectivite + UserMenu bât/svc rattachés + fix consents
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.36 - Version", () => {
  it("Version 0.58.36+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(36);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.36 - /collectivite : onglets thématiques", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/collectivite/page.js"), "utf-8");

  it("State activeTab + helper switchTab", () => {
    expect(src).toMatch(/activeTab,\s*setActiveTab/);
    expect(src).toMatch(/function switchTab/);
  });

  it("4 onglets : identite, activite, localisation, etablissements", () => {
    expect(src).toMatch(/id:\s*["']identite["']/);
    expect(src).toMatch(/id:\s*["']activite["']/);
    expect(src).toMatch(/id:\s*["']localisation["']/);
    expect(src).toMatch(/id:\s*["']etablissements["']/);
  });

  it("Établissements en DERNIER onglet (ordre dans le tableau)", () => {
    // L'ordre doit être identite, activite, localisation, etablissements
    const tabsBlock = src.match(/\[\s*\{[^]*?id:\s*["']identite["'][^]*?id:\s*["']activite["'][^]*?id:\s*["']localisation["'][^]*?id:\s*["']etablissements["']/);
    expect(tabsBlock).toBeTruthy();
  });

  it("Wrapping conditionnel : activeTab === 'identite' / 'activite' / 'localisation' / 'etablissements'", () => {
    expect(src).toMatch(/activeTab === ["']identite["']/);
    expect(src).toMatch(/activeTab === ["']activite["']/);
    expect(src).toMatch(/activeTab === ["']localisation["']/);
    expect(src).toMatch(/activeTab === ["']etablissements["']/);
  });

  it("Persistance localStorage 'av-collectivite-tab'", () => {
    expect(src).toMatch(/av-collectivite-tab/);
  });

  it("Bouton Save masqué sur l'onglet 'etablissements'", () => {
    expect(src).toMatch(/activeTab !== ["']etablissements["']/);
  });

  it("Compteur établissements affiché dans le label de l'onglet", () => {
    expect(src).toMatch(/Établissements \(\$\{etabs\.length\}\)/);
  });
});

describe("0.58.36 - UserAttachmentsInfo component", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/UserAttachmentsInfo.js"), "utf-8");

  it("Composant exporté avec props userId + etabId", () => {
    expect(src).toMatch(/export default function UserAttachmentsInfo\(\{\s*userId,\s*etabId\s*\}\)/);
  });

  it("Charge équipes via membres_equipe → equipes → batiments", () => {
    expect(src).toMatch(/from\(["']membres_equipe["']\)/);
    expect(src).toMatch(/equipes\(id, nom, couleur, batiment_id, batiments\(id, nom, etablissement_id\)\)/);
  });

  it("Filtre par etabId (équipes de l'établissement courant + transversales)", () => {
    expect(src).toMatch(/batiments\?\.etablissement_id === etabId/);
  });

  it("Affichage : icône building + bâtiments (joints par ·)", () => {
    expect(src).toMatch(/ti-building/);
    expect(src).toMatch(/batiments\.map\(b => b\.nom\)\.join\(["']\s*·\s*["']\)/);
  });

  it("Affichage : icône users + équipes (max 3 + +N)", () => {
    expect(src).toMatch(/ti-users/);
    expect(src).toMatch(/equipes\.map\(eq => eq\.nom\)\.slice\(0, 3\)/);
  });

  it("Silencieux si aucune équipe ou erreur", () => {
    expect(src).toMatch(/equipes\.length === 0 && batiments\.length === 0/);
  });
});

describe("0.58.36 - UserMenu : intégration UserAttachmentsInfo", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/UserMenu.js"), "utf-8");

  it("Import UserAttachmentsInfo", () => {
    expect(src).toMatch(/import\s+UserAttachmentsInfo\s+from\s+["']\.\/components\/UserAttachmentsInfo["']/);
  });

  it("Render <UserAttachmentsInfo userId={auth?.user?.id} etabId={auth?.etabId} /> dans um-id", () => {
    expect(src).toMatch(/<UserAttachmentsInfo[^/]*userId=\{auth\?\.user\?\.id\}[^/]*etabId=\{auth\?\.etabId\}/);
  });
});

describe("0.58.36 - Fix consentements_rgpd 400 défensif", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");

  it("Query défensive avec try/catch + fallback aux colonnes minimales", () => {
    // Cherche le pattern IIFE avec try/catch
    expect(src).toMatch(/try \{\s*const r = await supabase[\s\S]*\.from\(["']consentements_rgpd["']\)[\s\S]*\.select\(["']id, date_signature, a_consenti, date_expiration["']\)/);
    expect(src).toMatch(/\.select\(["']id, date_signature["']\)\s*\.eq\(["']patient_id["']/);
  });
});
