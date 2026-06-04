// =============================================================
//  Tests unitaires — 0.58.3 PHASE 2 REFONTE UI
//
//  Upgrade Btn (ripple + loading + size + variants gradients) +
//  PageHero + Tabs + TopBar premium
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.3 - Version", () => {
  it("Version 0.58.3+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(3);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.3 - Btn premium upgrade (ui.js)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/ui.js"), "utf-8");

  it("Nouvelles props : loading, size, rightIcon, fullWidth", () => {
    expect(src).toMatch(/loading\s*=\s*false/);
    expect(src).toMatch(/rightIcon/);
    expect(src).toMatch(/fullWidth\s*=\s*false/);
  });

  it("Ripple effect handler", () => {
    expect(src).toMatch(/Ripple effect|handleClick/);
    expect(src).toMatch(/av-ripple/);
    expect(src).toMatch(/document\.createElement\(["']span["']\)/);
  });

  it("Loading state : aria-busy + spinner", () => {
    expect(src).toMatch(/aria-busy/);
    expect(src).toMatch(/btn-spinner/);
  });

  it("Classes CSS dynamiques (btn-premium + size + fullWidth)", () => {
    expect(src).toMatch(/btn-premium/);
    expect(src).toMatch(/btn-full/);
    expect(src).toMatch(/btn-sm|btn-lg/);
  });

  it("Compat 100% : si props anciennes uniquement, comportement préservé", () => {
    // Pas de breaking : children, icon, onClick, etc. toujours là
    expect(src).toMatch(/variant\s*=\s*["']primary["']/);
    expect(src).toMatch(/icon,/);
    expect(src).toMatch(/children,/);
    expect(src).toMatch(/onClick,/);
  });
});

describe("0.58.3 - CSS Btn premium", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Keyframe ripple", () => {
    expect(css).toMatch(/@keyframes av-ripple/);
  });

  it("Classes btn-premium + variantes", () => {
    expect(css).toMatch(/\.btn-premium\s*\{/);
    expect(css).toMatch(/\.btn-spinner\s*\{/);
    expect(css).toMatch(/\.btn-sm\s*\{/);
    expect(css).toMatch(/\.btn-lg\s*\{/);
    expect(css).toMatch(/\.btn-full\s*\{/);
  });

  it("btn-save avec gradient teal + ombre", () => {
    // Cherche le bloc btn-save APRES "BTN PREMIUM"
    const btnSect = css.substring(css.indexOf("BTN PREMIUM"));
    expect(btnSect).toMatch(/\.btn-save\s*\{/);
    expect(btnSect).toMatch(/linear-gradient.*7CC8C8.*5db5b5/);
    expect(btnSect).toMatch(/box-shadow:.*rgba\(124,200,200/);
  });

  it("btn-danger avec gradient rouge", () => {
    const btnSect = css.substring(css.indexOf("BTN PREMIUM"));
    expect(btnSect).toMatch(/\.btn-danger\s*\{/);
    expect(btnSect).toMatch(/linear-gradient.*c0392b/);
  });
});

describe("0.58.3 - Composant PageHero", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/PageHero.js"),
    "utf-8"
  );

  it("Export default", () => {
    expect(src).toMatch(/export default function PageHero/);
  });

  it("6 variants colorés", () => {
    expect(src).toMatch(/VARIANTS\s*=\s*\{[\s\S]*?teal:[\s\S]*?blue:[\s\S]*?terra:[\s\S]*?navy:[\s\S]*?violet:[\s\S]*?amber:/);
  });

  it("Breadcrumbs avec Link Next.js", () => {
    expect(src).toMatch(/import\s+Link\s+from\s+["']next\/link["']/);
    expect(src).toMatch(/breadcrumbs\.map/);
  });

  it("Icon avec halo glow effet", () => {
    expect(src).toMatch(/Halo glow|filter:\s*["']blur/);
  });

  it("Stats inline en bas du hero", () => {
    expect(src).toMatch(/stats\.map/);
    expect(src).toMatch(/Stats inline/);
  });

  it("Actions à droite", () => {
    expect(src).toMatch(/actions\s*&&/);
  });

  it("Mode compact pour zones réduites", () => {
    expect(src).toMatch(/compact/);
  });

  it("Eyebrow optionnel (label au-dessus du titre)", () => {
    expect(src).toMatch(/eyebrow/);
  });
});

describe("0.58.3 - Composant Tabs", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/Tabs.js"),
    "utf-8"
  );

  it("Export default", () => {
    expect(src).toMatch(/export default function Tabs/);
  });

  it("3 variants : pills, underline, segmented", () => {
    expect(src).toMatch(/variant === ["']pills["']/);
    expect(src).toMatch(/variant === ["']underline["']/);
    // segmented = fallback par défaut, doc dans le code
    expect(src).toMatch(/STYLE SEGMENTED/);
  });

  it("Indicator animé pour underline + segmented", () => {
    expect(src).toMatch(/indicatorStyle/);
    expect(src).toMatch(/getBoundingClientRect/);
  });

  it("Count badge optionnel par tab", () => {
    expect(src).toMatch(/t\.count !== undefined/);
  });

  it("3 tailles : sm, md, lg", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*padH/);
    expect(src).toMatch(/md:\s*\{[^}]*padH/);
    expect(src).toMatch(/lg:\s*\{[^}]*padH/);
  });

  it("Accessibilité (role + aria-selected)", () => {
    expect(src).toMatch(/role=["']tablist["']/);
    expect(src).toMatch(/role=["']tab["']/);
    expect(src).toMatch(/aria-selected/);
  });
});

describe("0.58.3 - TopBar premium CSS", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Background plus profond (4 stops gradient)", () => {
    expect(css).toMatch(/0d1822.*142131.*1d3540.*2a5a5a/);
  });

  it("Glassmorphism backdrop-filter", () => {
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*?backdrop-filter:\s*blur/);
  });

  it("Border-bottom + shadow sur scroll", () => {
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*?border-bottom:[\s\S]*?rgba\(124,200,200/);
    expect(css).toMatch(/\.topbar\s*\{[\s\S]*?box-shadow:[\s\S]*?rgba\(20,33,49/);
  });

  it("Burger menu et tb-icon avec border + hover translate", () => {
    expect(css).toMatch(/\.tb-icon\s*\{[\s\S]*?border:[\s\S]*?rgba\(255,255,255/);
    expect(css).toMatch(/\.tb-icon:hover\s*\{[\s\S]*?transform:\s*translateY/);
  });

  it("Badge notification avec pulse animation", () => {
    expect(css).toMatch(/@keyframes av-badge-pulse/);
    expect(css).toMatch(/\.tb-badge\s*\{[\s\S]*?animation:\s*av-badge-pulse/);
  });

  it("Logo accent avec text-shadow glow", () => {
    expect(css).toMatch(/\.logo\s+\.v\s*\{[\s\S]*?text-shadow/);
  });

  it("Version badge avec hover translate", () => {
    expect(css).toMatch(/\.version-badge:hover\s*\{[\s\S]*?translateY/);
  });
});

describe("0.58.3 - Index ui-premium étendu", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/index.js"),
    "utf-8"
  );

  it("Exporte PageHero + Tabs (en plus des 6 précédents)", () => {
    expect(src).toMatch(/PageHero/);
    expect(src).toMatch(/Tabs/);
  });

  it("Maintient les 6 exports précédents", () => {
    expect(src).toMatch(/KpiCard/);
    expect(src).toMatch(/Sparkline/);
    expect(src).toMatch(/MetricCard/);
    expect(src).toMatch(/EmptyState/);
    expect(src).toMatch(/Skeleton/);
    expect(src).toMatch(/showToast/);
  });
});
