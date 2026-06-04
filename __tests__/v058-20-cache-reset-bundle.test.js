// =============================================================
//  Tests unitaires — 0.58.20 BUNDLE
//
//  1. lib/cacheReset : utility de factory reset front
//  2. /profil : bouton "Vider le cache et recharger"
//  3. ConicCard : nouveau composant card avec scan-line conic
//  4. ParticlesBackground : canvas particules teal
//  5. /accueil : ParticlesBackground intégré
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.20 - Version", () => {
  it("Version 0.58.20+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(20);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.20 - lib/cacheReset utility", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/cacheReset.js"), "utf-8");

  it("'use client' + 5 fonctions exportées", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export async function unregisterAllServiceWorkers/);
    expect(src).toMatch(/export async function clearAllCaches/);
    expect(src).toMatch(/export function clearLocalStorageExceptAuth/);
    expect(src).toMatch(/export function clearSessionStorage/);
    expect(src).toMatch(/export async function fullCacheReset/);
  });

  it("unregisterAllServiceWorkers : navigator.serviceWorker.getRegistrations + unregister", () => {
    expect(src).toMatch(/navigator\.serviceWorker\.getRegistrations\(\)/);
    expect(src).toMatch(/regs\.map\(\(r\)\s*=>\s*r\.unregister\(\)\)/);
  });

  it("clearAllCaches : caches.keys() + caches.delete()", () => {
    expect(src).toMatch(/caches\.keys\(\)/);
    expect(src).toMatch(/caches\.delete\(/);
  });

  it("clearLocalStorageExceptAuth : préserve les clés sb-*", () => {
    expect(src).toMatch(/k\.startsWith\(["']sb-["']\)/);
    expect(src).toMatch(/supabase\.auth\.token/);
  });

  it("fullCacheReset : reload avec cache-busting (?_cache_reset=timestamp)", () => {
    expect(src).toMatch(/_cache_reset/);
    expect(src).toMatch(/window\.location\.href\s*=\s*url\.toString\(\)/);
  });

  it("fullCacheReset : options reload + keepAuth", () => {
    expect(src).toMatch(/\{\s*reload\s*=\s*true,\s*keepAuth\s*=\s*true\s*\}/);
  });
});

describe("0.58.20 - /profil : bouton 'Vider le cache'", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Import fullCacheReset depuis lib/cacheReset", () => {
    expect(src).toMatch(/import\s+\{\s*fullCacheReset\s*\}\s+from\s+["']\.\.\/\.\.\/lib\/cacheReset["']/);
  });

  it("Panel 'Problème d'affichage ?' avec icon ti-refresh-alert", () => {
    expect(src).toMatch(/Problème d'affichage/);
    expect(src).toMatch(/ti-refresh-alert/);
  });

  it("Composant CacheResetButton défini avec état confirming", () => {
    expect(src).toMatch(/function CacheResetButton/);
    expect(src).toMatch(/setConfirming/);
  });

  it("Bouton confirme avant reset (UX safety)", () => {
    expect(src).toMatch(/Confirmer\s*:\s*vider et recharger/);
    expect(src).toMatch(/Annuler/);
  });

  it("Appelle fullCacheReset avec keepAuth: true", () => {
    expect(src).toMatch(/fullCacheReset\(\{\s*reload:\s*true,\s*keepAuth:\s*true\s*\}\)/);
  });

  it("Affiche un loading state pendant le reset", () => {
    expect(src).toMatch(/ti-loader-2/);
    expect(src).toMatch(/Nettoyage en cours/);
  });
});

describe("0.58.20 - ConicCard premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/ConicCard.js"), "utf-8");

  it("'use client' + export default function ConicCard", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function ConicCard/);
  });

  it("6 variants (teal/blue/violet/terra/amber/aurora)", () => {
    expect(src).toMatch(/teal:\s*\{/);
    expect(src).toMatch(/blue:\s*\{/);
    expect(src).toMatch(/violet:\s*\{/);
    expect(src).toMatch(/terra:\s*\{/);
    expect(src).toMatch(/amber:\s*\{/);
    expect(src).toMatch(/aurora:\s*\{/);
  });

  it("Variant aurora : conic-gradient multi-couleur (4 couleurs Aveho)", () => {
    expect(src).toMatch(/conic-gradient[\s\S]*?\$\{v\.accent\}[\s\S]*?#185FA5[\s\S]*?#7a6fb0[\s\S]*?#C9867F/);
  });

  it("3 vitesses (slow 12s / normal 4s / fast 2s)", () => {
    expect(src).toMatch(/slow:\s*["']12s["']/);
    expect(src).toMatch(/normal:\s*["']4s["']/);
    expect(src).toMatch(/fast:\s*["']2s["']/);
  });

  it("Conic-gradient avec mask exclusion (border-only)", () => {
    expect(src).toMatch(/maskComposite:\s*["']exclude["']/);
    expect(src).toMatch(/WebkitMaskComposite:\s*["']xor["']/);
  });

  it("Animation av-scan-rotate permanente", () => {
    expect(src).toMatch(/animation:\s*`av-scan-rotate \$\{dur\} linear infinite`/);
  });

  it("3 sizes (sm/md/lg)", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*padding:\s*14/);
    expect(src).toMatch(/md:\s*\{[^}]*padding:\s*18/);
    expect(src).toMatch(/lg:\s*\{[^}]*padding:\s*22/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/ConicCard/);
  });
});

describe("0.58.20 - ParticlesBackground canvas", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/ParticlesBackground.js"), "utf-8");

  it("'use client' + export default function ParticlesBackground", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function ParticlesBackground/);
  });

  it("Props : count (30) + color + speed + linkDistance + showOnMobile", () => {
    expect(src).toMatch(/count\s*=\s*30/);
    expect(src).toMatch(/speed\s*=\s*0\.3/);
    expect(src).toMatch(/linkDistance\s*=\s*140/);
    expect(src).toMatch(/showOnMobile\s*=\s*false/);
  });

  it("Canvas + requestAnimationFrame loop", () => {
    expect(src).toMatch(/requestAnimationFrame\(tick\)/);
    expect(src).toMatch(/canvas\.getContext\(["']2d["']\)/);
  });

  it("Respect prefers-reduced-motion", () => {
    expect(src).toMatch(/prefers-reduced-motion/);
  });

  it("Skip mobile par défaut (window.innerWidth < 768)", () => {
    expect(src).toMatch(/!showOnMobile.*window\.innerWidth\s*<\s*768/);
  });

  it("Pause si tab non visible (visibilitychange)", () => {
    expect(src).toMatch(/visibilitychange/);
    expect(src).toMatch(/document\.hidden/);
  });

  it("Connexions entre particules proches (linkDistance)", () => {
    expect(src).toMatch(/dist\s*<\s*linkDistance/);
    expect(src).toMatch(/ctx\.lineTo/);
  });

  it("Cleanup : cancelAnimationFrame + removeEventListener au unmount", () => {
    expect(src).toMatch(/cancelAnimationFrame/);
    expect(src).toMatch(/removeEventListener\(["']resize["']/);
    expect(src).toMatch(/removeEventListener\(["']visibilitychange["']/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/ParticlesBackground/);
  });
});

describe("0.58.20 - /accueil : ParticlesBackground intégré", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Import ParticlesBackground depuis ui-premium", () => {
    expect(src).toMatch(/import\s+\{\s*ParticlesBackground\s*\}\s+from\s+["']\.\.\/components\/ui-premium["']/);
  });

  it("ParticlesBackground rendu en fond fixed (zIndex 0)", () => {
    expect(src).toMatch(/<ParticlesBackground/);
    expect(src).toMatch(/position:\s*["']fixed["']/);
  });

  it("Container .wrap a position relative + zIndex 1 (au-dessus des particules)", () => {
    expect(src).toMatch(/className="wrap"\s+style=\{\{\s*position:\s*["']relative["'],\s*zIndex:\s*1\s*\}\}/);
  });
});

describe("0.58.20 - Récap composants premium (24 au total)", () => {
  it("24 composants exportés depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    const components = [
      "KpiCard", "Sparkline", "MetricCard",
      "Skeleton", "EmptyState",
      "Toast", "PageHero",
      "Tabs", "TabPanel",
      "Avatar", "AvatarGroup",
      "Select", "DatePicker", "Combobox",
      "TimePicker", "Dialog", "Drawer",
      "RangePicker", "Stepper",
      "BulkToolbar", "ProgressBar", "Tooltip",
      "CodeBlock", "NeonButton",
      // Nouveaux 0.58.20
      "ConicCard", "ParticlesBackground",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
