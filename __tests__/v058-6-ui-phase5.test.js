// =============================================================
//  Tests unitaires — 0.58.6 UI PHASE 5
//
//  Profil refondu avec 4 onglets + Avatar XL
//  EmptyState sur achats + maintenance + commandes
//  Avatar dans liste utilisateurs
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.6 - Version", () => {
  it("Version 0.58.6+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(6);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.6 - Profil refondu avec PageHero + Tabs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Import PageHero + Tabs + Avatar depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*PageHero[^}]*Tabs[^}]*Avatar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("State activeTab géré (défaut 'activite')", () => {
    expect(src).toMatch(/const \[activeTab, setActiveTab\] = useState\(["']activite["']\)/);
  });

  it("PageHero variant=blue avec breadcrumbs", () => {
    expect(src).toMatch(/<PageHero[\s\S]*?variant=["']blue["']/);
    expect(src).toMatch(/breadcrumbs=\{\[/);
  });

  it("4 onglets : activite, profil, notifs, secu", () => {
    expect(src).toMatch(/id:\s*["']activite["']/);
    expect(src).toMatch(/id:\s*["']profil["']/);
    expect(src).toMatch(/id:\s*["']notifs["']/);
    expect(src).toMatch(/id:\s*["']secu["']/);
  });

  it("Icons pour chaque onglet", () => {
    expect(src).toMatch(/icon:\s*["']ti-chart-bar["']/);  // activite
    expect(src).toMatch(/icon:\s*["']ti-user["']/);        // profil
    expect(src).toMatch(/icon:\s*["']ti-bell-cog["']/);    // notifs
    expect(src).toMatch(/icon:\s*["']ti-shield-lock["']/); // secu
  });

  it("Render conditionnel par tab", () => {
    expect(src).toMatch(/activeTab === ["']activite["']/);
    expect(src).toMatch(/activeTab === ["']profil["']/);
    expect(src).toMatch(/activeTab === ["']notifs["']/);
    expect(src).toMatch(/activeTab === ["']secu["']/);
  });

  it("Avatar XL avec ring dans le panneau identité", () => {
    expect(src).toMatch(/<Avatar[\s\S]*?name=\{nom \|\| auth\.user\?\.email\}[\s\S]*?size=\{64\}[\s\S]*?ring/);
  });
});

describe("0.58.6 - EmptyState sur achats + maintenance + commandes", () => {
  function checkEmptyState(file, expectedAction) {
    const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    // 0.58.62 : accepte actionLabel="..." OU actionLabel={... "..." ...} (expression dynamique)
    const actionRegex = new RegExp(`actionLabel=(?:["']${expectedAction}|\\{[^}]*["']${expectedAction})`);
    return {
      hasImport: /import\s+\{[^}]*EmptyState[^}]*\}\s+from\s+["'][^"']*ui-premium["']/.test(src),
      hasUsage: /<EmptyState/.test(src),
      hasAction: actionRegex.test(src),
    };
  }

  it("achats/page.js utilise EmptyState avec call-to-action", () => {
    const r = checkEmptyState("app/achats/page.js", "Créer la première demande");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
    expect(r.hasAction).toBe(true);
  });

  it("maintenance/page.js utilise EmptyState avec call-to-action", () => {
    const r = checkEmptyState("app/maintenance/page.js", "Planifier la première");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
    expect(r.hasAction).toBe(true);
  });

  it("commandes/page.js utilise EmptyState avec call-to-action", () => {
    const r = checkEmptyState("app/commandes/page.js", "Voir les promotions");
    expect(r.hasImport).toBe(true);
    expect(r.hasUsage).toBe(true);
    expect(r.hasAction).toBe(true);
  });

  it("Variants colorés appropriés (amber/blue/teal)", () => {
    const achatsSrc = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");
    expect(achatsSrc).toMatch(/<EmptyState[\s\S]*?variant=["']amber["']/);
    const maintSrc = fs.readFileSync(path.resolve(process.cwd(), "app/maintenance/page.js"), "utf-8");
    expect(maintSrc).toMatch(/<EmptyState[\s\S]*?variant=["']blue["']/);
    const cmdSrc = fs.readFileSync(path.resolve(process.cwd(), "app/commandes/page.js"), "utf-8");
    expect(cmdSrc).toMatch(/<EmptyState[\s\S]*?variant=["']teal["']/);
  });
});

describe("0.58.6 - Avatar dans liste utilisateurs", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/utilisateurs/page.js"), "utf-8");

  it("Import Avatar depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{[^}]*Avatar[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
  });

  it("Utilise <Avatar> avec name du membre + size 32", () => {
    expect(src).toMatch(/<Avatar[\s\S]*?name=\{m\.nom_affiche \|\| m\.user_id\}[\s\S]*?size=\{32\}/);
  });
});

describe("0.58.6 - Récap déploiement composants premium", () => {
  it("Avatar utilisé dans au moins 3 endroits", () => {
    const files = [
      "app/UserMenu.js",
      "app/profil/page.js",
      "app/utilisateurs/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<Avatar\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("EmptyState utilisé dans au moins 6 pages", () => {
    const files = [
      "app/patients/page.js",
      "app/interventions/page.js",
      "app/signalements/page.js",
      "app/achats/page.js",
      "app/maintenance/page.js",
      "app/commandes/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<EmptyState\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it("Tabs utilisé dans au moins 2 pages", () => {
    const files = [
      "app/parametres/page.js",
      "app/profil/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<Tabs\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("PageHero utilisé dans au moins 6 pages", () => {
    const files = [
      "app/statistiques/page.js",
      "app/interventions/kanban/page.js",
      "app/calendrier/page.js",
      "app/materiels/page.js",
      "app/parametres/page.js",
      "app/profil/page.js",
    ];
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (/<PageHero\b/.test(src)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });
});
