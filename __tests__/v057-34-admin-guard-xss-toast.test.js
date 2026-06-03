// =============================================================
//  Tests unitaires — 0.57.34
//  AdminGuard sur les 9 pages admin + escape XSS toast realtime + pdfPreview
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.34 - Version", () => {
  it("Version 0.57.34+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(34);
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.34 - AdminGuard composant créé", () => {
  const guardPath = path.resolve(process.cwd(), "app/components/AdminGuard.js");

  it("Fichier existe", () => {
    expect(fs.existsSync(guardPath)).toBe(true);
  });

  const src = fs.readFileSync(guardPath, "utf-8");

  it("Use client (composant client)", () => {
    expect(src).toMatch(/["']use client["']/);
  });

  it("Vérifie auth.role admin via plusieurs checks (defense-in-depth)", () => {
    expect(src).toMatch(/auth\.can\?\.\(.gerer_roles./);
    expect(src).toMatch(/auth\.can\?\.\(.manage_collectivite./);
    expect(src).toMatch(/auth\.role\?\.systeme === ["']admin["']/);
    expect(src).toMatch(/auth\.role\?\.nom === ["']Administrateur["']/);
  });

  it("Attend auth.ready avant de juger", () => {
    expect(src).toMatch(/auth\.ready/);
  });

  it("Affiche un message clair si pas admin (pas un crash)", () => {
    expect(src).toMatch(/Accès restreint/);
    expect(src).toMatch(/réservée aux administrateurs/i);
  });

  it("Bouton retour vers fallbackUrl (par défaut /accueil)", () => {
    expect(src).toMatch(/fallbackUrl/);
    expect(src).toMatch(/router\.push\(fallbackUrl\)/);
  });
});

describe("0.57.34 - 9 pages admin wrappées avec AdminGuard", () => {
  const ADMIN_PAGES = [
    "avis-google",
    "bulletins-archive",
    "doublons-forces",
    "mail-diagnostic",
    "medecins-prescripteurs",
    "prescriptions-archive",
    "referentiels-sante",
    "rpps-diagnostic",
    "rpps-dump",
  ];

  ADMIN_PAGES.forEach((name) => {
    describe(name, () => {
      const src = fs.readFileSync(
        path.resolve(process.cwd(), `app/admin/${name}/page.js`),
        "utf-8"
      );

      it("Import AdminGuard", () => {
        expect(src).toMatch(/import\s+AdminGuard\s+from\s+["'][^"']*AdminGuard["']/);
      });

      it("Export default wrap avec <AdminGuard>", () => {
        expect(src).toMatch(/<AdminGuard>/);
        expect(src).toMatch(/<\/AdminGuard>/);
      });
    });
  });
});

describe("0.57.34 - useRealtimeTable : escape XSS toast", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/useRealtimeTable.js"),
    "utf-8"
  );

  it("Helper escapeHtml défini", () => {
    expect(src).toMatch(/function escapeHtml/);
    expect(src).toMatch(/&amp;/);
    expect(src).toMatch(/&lt;/);
    expect(src).toMatch(/&gt;/);
    expect(src).toMatch(/&quot;/);
    expect(src).toMatch(/&#39;/);
  });

  it("Helper safeIconClass (whitelist Tabler icons)", () => {
    expect(src).toMatch(/function safeIconClass/);
    expect(src).toMatch(/\/\^ti-/);  // regex ^ti-...
  });

  it("Helper safeColor (whitelist hex)", () => {
    expect(src).toMatch(/function safeColor/);
    expect(src).toMatch(/\[0-9a-fA-F\]/);
  });

  it("showRealtimeToast applique les escape avant innerHTML", () => {
    expect(src).toMatch(/safeTitle\s*=\s*escapeHtml\(title\)/);
    expect(src).toMatch(/safeMessage\s*=\s*escapeHtml\(message\)/);
    expect(src).toMatch(/safeIcon\s*=\s*safeIconClass\(icon\)/);
    expect(src).toMatch(/safeColorVal\s*=\s*safeColor\(color\)/);
  });

  it("innerHTML utilise les versions safe (pas les bruts)", () => {
    // L'innerHTML doit utiliser safeTitle, safeMessage, safeIcon, safeColorVal
    const innerHtmlBlock = src.substring(
      src.indexOf("toast.innerHTML = `"),
      src.indexOf("toast.querySelector")
    );
    expect(innerHtmlBlock).toMatch(/\$\{safeTitle\}/);
    expect(innerHtmlBlock).toMatch(/\$\{safeMessage\}/);
    expect(innerHtmlBlock).toMatch(/\$\{safeIcon\}/);
    expect(innerHtmlBlock).toMatch(/\$\{safeColorVal\}/);
    // Ne doit pas avoir les versions brutes
    expect(innerHtmlBlock).not.toMatch(/\$\{title\}/);
    expect(innerHtmlBlock).not.toMatch(/\$\{message\}/);
  });
});

describe("0.57.34 - pdfPreview : escape titre defense-in-depth", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/pdfPreview.js"),
    "utf-8"
  );

  it("escapeHtml helper défini", () => {
    expect(src).toMatch(/function escapeHtml/);
  });

  it("safeTitre utilisé dans innerHTML (pas titre direct)", () => {
    // safeTitre est créé via escapeHtml(titre)
    expect(src).toMatch(/safeTitre\s*=\s*escapeHtml\(titre\)/);
    // safeTitre est utilisé dans le innerHTML
    expect(src).toMatch(/\$\{safeTitre\}/);
    // La version non-escapée ne doit PLUS être utilisée dans le innerHTML
    // (on cherche ${titre} mais pas dans un commentaire ou une string explicative)
    const codeOnly = src.split("\n")
      .filter(l => !/^\s*\/\//.test(l))
      .filter(l => !l.includes("escapeHtml(titre)"))  // skip la ligne qui crée safeTitre
      .join("\n");
    expect(codeOnly).not.toMatch(/\$\{titre\}/);
  });
});

describe("0.57.34 - Fix prerender /statistiques-interventions", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/statistiques-interventions/page.js"),
    "utf-8"
  );

  it("Export dynamic = 'force-dynamic' (évite crash SSG)", () => {
    expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });
});

describe("0.57.34 - LINT anti-régression : toutes les pages /admin/* utilisent AdminGuard", () => {
  function findAdminPages() {
    const dir = path.join(process.cwd(), "app/admin");
    if (!fs.existsSync(dir)) return [];
    const pages = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const pagePath = path.join(dir, item.name, "page.js");
      if (fs.existsSync(pagePath)) pages.push({ name: item.name, path: pagePath });
    }
    return pages;
  }

  it("Aucune page /admin/* n'expose son contenu sans AdminGuard", () => {
    const violations = [];
    for (const page of findAdminPages()) {
      const src = fs.readFileSync(page.path, "utf-8");
      if (!/AdminGuard/.test(src)) {
        violations.push(page.name);
      }
    }
    expect(
      violations,
      `Pages admin sans AdminGuard : ${violations.join(", ")}`
    ).toEqual([]);
  });
});
