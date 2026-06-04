// =============================================================
//  Tests unitaires — 0.58.5 UI PHASE 4
//
//  Avatar dans UserMenu + EmptyState sur listes vides
//  + Tabs sur Paramètres
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.5 - Version", () => {
  it("Version 0.58.5+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(5);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.5 - Avatar dans UserMenu", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/UserMenu.js"), "utf-8");

  it("Import Avatar depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{\s*Avatar\s*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("Utilise <Avatar> avec name + size", () => {
    expect(src).toMatch(/<Avatar[\s\S]*?name=\{displayName\}/);
  });

  it("Avatar dans le header (lg) avec ring (halo)", () => {
    expect(src).toMatch(/<Avatar[\s\S]*?size=\{52\}[\s\S]*?ring/);
  });

  it("Avatar dans le bouton trigger (small)", () => {
    expect(src).toMatch(/<Avatar[\s\S]*?size=\{30\}/);
  });

  it("Plus de span um-avatar (l'ancien custom)", () => {
    expect(src).not.toMatch(/<span\s+className=["']um-avatar["']/);
    expect(src).not.toMatch(/<span\s+className=["']um-avatar lg["']/);
  });
});

describe("0.58.5 - UserMenu premium CSS", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("um-btn avec hover translate + shadow teal", () => {
    expect(css).toMatch(/\.um-btn:hover[\s\S]*?translateY\(-1px\)/);
    expect(css).toMatch(/\.um-btn:hover[\s\S]*?rgba\(124,200,200/);
  });

  it("um-head avec gradient + radial decorative", () => {
    expect(css).toMatch(/\.um-head\s*\{[\s\S]*?linear-gradient/);
    expect(css).toMatch(/\.um-head::before\s*\{[\s\S]*?radial-gradient/);
  });

  it("um-id-role avec pill style (background + border + padding pill)", () => {
    expect(css).toMatch(/\.um-id-role\s*\{[\s\S]*?border-radius:\s*99px/);
  });

  it("um-item hover avec padding-left animation", () => {
    expect(css).toMatch(/\.um-item:hover\s*\{[\s\S]*?padding-left:\s*22px/);
  });

  it("um-sheet animation pop scale", () => {
    expect(css).toMatch(/@keyframes um-pop[\s\S]*?scale\(0\.97\)/);
  });
});

describe("0.58.5 - EmptyState déployé sur listes vides", () => {
  it("patients/page.js utilise EmptyState", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*EmptyState[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<EmptyState/);
    // Au moins 2 EmptyState (vide initial + résultat filtre)
    expect((src.match(/<EmptyState/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("interventions/page.js utilise EmptyState", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*EmptyState[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<EmptyState[\s\S]*?actionLabel=["']Créer une demande["']/);
  });

  it("signalements/page.js utilise EmptyState", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/signalements/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*EmptyState[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/<EmptyState/);
  });

  it("EmptyState patients avec call-to-action 'Créer le premier'", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/actionLabel=["']Créer le premier patient["']/);
    expect(src).toMatch(/onAction=\{openNew\}/);
  });

  it("Variants colorés appropriés (teal/terra/gray)", () => {
    const srcPatients = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(srcPatients).toMatch(/variant=["']teal["']/);
    const srcInterventions = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(srcInterventions).toMatch(/variant=["']terra["']/);
  });
});

describe("0.58.5 - Tabs sur Paramètres", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/parametres/page.js"), "utf-8");

  it("Import Tabs + PageHero depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*Tabs[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/PageHero/);
  });

  it("State activeTab géré", () => {
    expect(src).toMatch(/const \[activeTab, setActiveTab\] = useState\(["']general["']\)/);
  });

  it("3 onglets : Général, Notifications, RGPD", () => {
    expect(src).toMatch(/id:\s*["']general["']/);
    expect(src).toMatch(/id:\s*["']notifs["']/);
    expect(src).toMatch(/id:\s*["']rgpd["']/);
  });

  it("Icons + labels pour chaque tab", () => {
    expect(src).toMatch(/icon:\s*["']ti-adjustments["']/);
    expect(src).toMatch(/icon:\s*["']ti-bell["']/);
    expect(src).toMatch(/icon:\s*["']ti-shield-check["']/);
  });

  it("Render conditionnel par tab", () => {
    expect(src).toMatch(/activeTab === ["']general["']/);
    expect(src).toMatch(/activeTab === ["']notifs["']/);
    expect(src).toMatch(/activeTab === ["']rgpd["']/);
  });

  it("PageHero remplace PageHead minimaliste", () => {
    expect(src).toMatch(/<PageHero[\s\S]*?icon=["']ti-settings["']/);
    expect(src).toMatch(/breadcrumbs=\{\[/);
  });

  it("Variant navy pour le hero administration", () => {
    expect(src).toMatch(/<PageHero[\s\S]*?variant=["']navy["']/);
  });
});
