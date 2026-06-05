// =============================================================
//  Tests unitaires — 0.58.10 UI PHASE 9
//
//  toast.info()/neutral() + Migration toast finale (0 alert natif)
//  + FilterBar pills modernes + Select custom premium
//  + PageTransition entre routes + Pagination améliorée
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Helper recursif pour trouver tous les page.js dans app/
function findPageFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPageFiles(fp, results);
    } else if (entry.isFile() && entry.name === "page.js") {
      results.push(fp);
    }
  }
  return results;
}

describe("0.58.10 - Version", () => {
  it("Version 0.58.10+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(10);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.10 - toast.info() + toast.neutral()", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Toast.js"), "utf-8");

  it("toast.info() existe", () => {
    expect(src).toMatch(/info:\s+\(title,\s*message,\s*opts\)\s*=>\s*showToast/);
  });

  it("toast.neutral() ajouté (raccourci pour infos non-critiques, duration 2500ms)", () => {
    expect(src).toMatch(/neutral:[\s\S]*?duration:\s*2500/);
  });

  it("4 types + 1 helper neutral", () => {
    expect(src).toMatch(/success:/);
    expect(src).toMatch(/info:/);
    expect(src).toMatch(/warning:/);
    expect(src).toMatch(/error:/);
    expect(src).toMatch(/neutral:/);
  });
});

describe("0.58.10 - 0 alert() natif dans toute l'app", () => {
  it("ZÉRO alert() natif dans toutes les pages /app", () => {
    const files = findPageFiles(path.resolve(process.cwd(), "app"));
    const violations = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf-8");
      // Strip commentaires
      const codeOnly = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\/\/.*$/gm, "");
      // alert hors dialogs.alert
      const nativeAlerts = (codeOnly.match(/(?<!dialogs\.)\balert\(/g) || []).length;
      if (nativeAlerts > 0) {
        violations.push(`${f} → ${nativeAlerts} alert()`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("0.58.10 - FilterBar pills modernes", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("filter-bar avec container pill (border-radius 99px + padding 5px)", () => {
    expect(css).toMatch(/\.filter-bar\s*\{[\s\S]*?border-radius:\s*99px/);
    expect(css).toMatch(/\.filter-bar\s*\{[\s\S]*?padding:\s*5px/);
  });

  it("filter-bar-label en uppercase letter-spacing", () => {
    expect(css).toMatch(/\.filter-bar-label\s*\{[\s\S]*?text-transform:\s*uppercase/);
  });

  it("filter-bar-chip avec hover transform translateY + shadow", () => {
    expect(css).toMatch(/\.filter-bar-chip:hover:not\(\.on\)\s*\{[\s\S]*?translateY\(-1px\)/);
  });

  it("filter-bar-chip.on avec gradient teal + box-shadow multi-couches", () => {
    expect(css).toMatch(/\.filter-bar-chip\.on\s*\{[\s\S]*?linear-gradient\(135deg,#7CC8C8/);
    expect(css).toMatch(/\.filter-bar-chip\.on\s*\{[\s\S]*?box-shadow:[\s\S]*?rgba\(124,200,200/);
  });

  it("filter-bar-cnt avec background pill", () => {
    expect(css).toMatch(/\.filter-bar-cnt\s*\{[\s\S]*?border-radius:\s*99px/);
  });
});

describe("0.58.10 - Select custom premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Select.js"), "utf-8");

  it("Export default function Select", () => {
    expect(src).toMatch(/export default function Select/);
  });

  it("Props : value/onChange/options/searchable/disabled/size/variant/fullWidth", () => {
    expect(src).toMatch(/value,/);
    expect(src).toMatch(/onChange,/);
    expect(src).toMatch(/options\s*=\s*\[\]/);
    expect(src).toMatch(/searchable\s*=\s*false/);
    expect(src).toMatch(/disabled\s*=\s*false/);
    expect(src).toMatch(/size\s*=\s*["']md["']/);
    expect(src).toMatch(/variant\s*=\s*["']default["']/);
    expect(src).toMatch(/fullWidth\s*=\s*false/);
  });

  it("3 tailles (sm, md, lg)", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*padH/);
    expect(src).toMatch(/md:\s*\{[^}]*padH/);
    expect(src).toMatch(/lg:\s*\{[^}]*padH/);
  });

  it("Keyboard navigation : ArrowDown/ArrowUp/Enter/Escape", () => {
    expect(src).toMatch(/e\.key === ["']ArrowDown["']/);
    expect(src).toMatch(/e\.key === ["']ArrowUp["']/);
    expect(src).toMatch(/e\.key === ["']Enter["']/);
    expect(src).toMatch(/e\.key === ["']Escape["']/);
  });

  it("Click outside pour fermer (mousedown listener)", () => {
    expect(src).toMatch(/document\.addEventListener\(["']mousedown["']/);
  });

  it("Recherche live si searchable", () => {
    expect(src).toMatch(/searchQ/);
    expect(src).toMatch(/filtered\s*=\s*searchable\s*&&\s*searchQ/);
  });

  it("Animation av-select-pop déclarée", () => {
    expect(src).toMatch(/animation:\s*["']av-select-pop/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-select-pop/);
  });

  it("Accessibilité : role listbox + role option + aria-selected", () => {
    expect(src).toMatch(/role=["']listbox["']/);
    expect(src).toMatch(/role=["']option["']/);
    expect(src).toMatch(/aria-selected=\{isSelected\}/);
  });

  it("Sous-options : icon + desc + iconColor", () => {
    expect(src).toMatch(/opt\.icon/);
    expect(src).toMatch(/opt\.desc/);
    expect(src).toMatch(/opt\.iconColor/);
  });
});

describe("0.58.10 - Select exporté depuis ui-premium", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/index.js"),
    "utf-8"
  );
  it("Select exporté", () => {
    expect(src).toMatch(/Select/);
  });
});

describe("0.58.10 - PageTransition entre routes", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/PageTransition.js"), "utf-8");

  it("'use client' directive (client component pour usePathname)", () => {
    expect(src).toMatch(/^["']use client["']/);
  });

  it("Utilise usePathname de next/navigation", () => {
    expect(src).toMatch(/import\s+\{\s*usePathname\s*\}\s+from\s+["']next\/navigation["']/);
  });

  it("Animation slide-in déclenchée par key (0.58.22 : remplaçant av-page-enter)", () => {
    // 0.58.22 : av-page-enter remplacé par slide-in direction-aware
    expect(src).toMatch(/animation:\s*`?\$?\{?animName\}?|av-page-slide-in-(right|left)|av-page-enter/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    // L'un ou l'autre des keyframes doit exister
    expect(css).toMatch(/@keyframes (av-page-enter|av-page-slide-in-right)/);
  });

  it("Layout utilise <PageTransition>", () => {
    const layout = fs.readFileSync(path.resolve(process.cwd(), "app/layout.js"), "utf-8");
    expect(layout).toMatch(/import\s+PageTransition\s+from\s+["']\.\/components\/PageTransition["']/);
    expect(layout).toMatch(/<PageTransition>\{children\}<\/PageTransition>/);
  });
});

describe("0.58.10 - Pagination premium", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Pagination avec gap + flex-wrap + padding revus", () => {
    expect(css).toMatch(/\.pagination\s*\{[\s\S]*?gap:\s*14px/);
  });

  it("pagination-info avec b dans pill teal", () => {
    expect(css).toMatch(/\.pagination-info\s+b\s*\{[\s\S]*?border-radius:\s*99px/);
    expect(css).toMatch(/\.pagination-info\s+b\s*\{[\s\S]*?rgba\(124,200,200/);
  });

  it("pagination button avec hover translate + shadow teal", () => {
    expect(css).toMatch(/\.pagination\s+button:hover:not\(:disabled\)\s*\{[\s\S]*?translateY\(-1px\)/);
    expect(css).toMatch(/\.pagination\s+button:hover:not\(:disabled\)\s*\{[\s\S]*?rgba\(124,200,200/);
  });

  it("pagination button active/aria-current avec gradient", () => {
    expect(css).toMatch(/\.pagination\s+button\.active[\s\S]*?linear-gradient\(135deg,#7CC8C8/);
    expect(css).toMatch(/aria-current=["']page["']\]/);
  });

  it("Dark mode pagination : background panel + border line", () => {
    expect(css).toMatch(/html\[data-theme="dark"\]\s+\.pagination\s+button\s*\{[\s\S]*?aveho-panel/);
  });
});

describe("0.58.10 - Récap migration toast finale", () => {
  it("Toast utilisé dans au moins 15 pages au total", () => {
    const files = findPageFiles(path.resolve(process.cwd(), "app"));
    let count = 0;
    for (const f of files) {
      const src = fs.readFileSync(f, "utf-8");
      const codeOnly = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/\/\/.*$/gm, "");
      if (/toast\.(error|success|info|warning|neutral)\(/.test(codeOnly)) count++;
    }
    expect(count).toBeGreaterThanOrEqual(15);
  });
});
