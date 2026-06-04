// =============================================================
//  Tests unitaires — 0.58.17 ULTRA PREMIUM HITECH
//
//  Design tokens v2 (glow x4, glass, conic, mesh aurora, grid SVG)
//  + Hitech utilities (.av-card-scan, .av-tilt, .av-glass, etc.)
//  + Custom scrollbar premium
//  + Smooth scroll
//  + TopBar glassmorphism poussé (blur 20px + saturate 200%)
//  + TopBar animated border-bottom
//  + Logo .v neon multi-layer
//  + KpiCard 3D tilt parallax + glow renforcé
//  + PageHero aurora blobs + grid SVG + icon halo pulse
//  + NeonButton (gradient + scan-line + ripple + glow)
//  + Skeleton shimmer v2 (teinte teal)
//  + bg-dark avec grid cyber
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.17 - Version", () => {
  it("Version 0.58.17+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(17);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.17 - Design tokens v2", () => {
  const dt = fs.readFileSync(path.resolve(process.cwd(), "app/design-tokens.css"), "utf-8");

  it("Glow shadows sur 4 niveaux pour teal", () => {
    expect(dt).toMatch(/--av-glow-teal-sm:/);
    expect(dt).toMatch(/--av-glow-teal-md:/);
    expect(dt).toMatch(/--av-glow-teal-lg:/);
    expect(dt).toMatch(/--av-glow-teal-xl:/);
  });

  it("Glow shadows pour blue, violet, terra, amber", () => {
    expect(dt).toMatch(/--av-glow-blue-md:/);
    expect(dt).toMatch(/--av-glow-violet-md:/);
    expect(dt).toMatch(/--av-glow-terra-md:/);
    expect(dt).toMatch(/--av-glow-amber-md:/);
  });

  it("Glass surfaces (light/medium/heavy) + blur var", () => {
    expect(dt).toMatch(/--av-glass-light:/);
    expect(dt).toMatch(/--av-glass-medium:/);
    expect(dt).toMatch(/--av-glass-heavy:/);
    expect(dt).toMatch(/--av-glass-blur:\s*blur\(20px\)\s*saturate\(180%\)/);
    expect(dt).toMatch(/--av-glass-blur-heavy:\s*blur\(30px\)\s*saturate\(220%\)/);
  });

  it("Conic gradients (teal, blue, aurora, scan)", () => {
    expect(dt).toMatch(/--av-conic-teal:\s*conic-gradient/);
    expect(dt).toMatch(/--av-conic-aurora:\s*conic-gradient/);
    expect(dt).toMatch(/--av-conic-scan:\s*conic-gradient/);
  });

  it("Mesh aurora + cyber + grid SVG patterns", () => {
    expect(dt).toMatch(/--av-mesh-aurora:/);
    expect(dt).toMatch(/--av-mesh-cyber:/);
    expect(dt).toMatch(/--av-grid-svg:/);
    expect(dt).toMatch(/--av-grid-svg-strong:/);
  });

  it("@property --scan-angle pour animation conic smooth", () => {
    expect(dt).toMatch(/@property --scan-angle/);
    expect(dt).toMatch(/syntax:\s*['"]<angle>['"]/);
  });

  it("Keyframes : av-scan-rotate, av-bg-pos-shift, av-aurora, av-glow-pulse", () => {
    expect(dt).toMatch(/@keyframes av-scan-rotate/);
    expect(dt).toMatch(/@keyframes av-bg-pos-shift/);
    expect(dt).toMatch(/@keyframes av-aurora/);
    expect(dt).toMatch(/@keyframes av-glow-pulse/);
    expect(dt).toMatch(/@keyframes av-float-y/);
  });
});

describe("0.58.17 - Hitech utilities", () => {
  const dt = fs.readFileSync(path.resolve(process.cwd(), "app/design-tokens.css"), "utf-8");

  it(".av-card-scan avec ::before conic-gradient + mask exclusion", () => {
    expect(dt).toMatch(/\.av-card-scan/);
    expect(dt).toMatch(/\.av-card-scan::before/);
    expect(dt).toMatch(/mask-composite:\s*exclude/);
  });

  it(".av-tilt avec preserve-3d + perspective hover", () => {
    expect(dt).toMatch(/\.av-tilt[\s\S]*?transform-style:\s*preserve-3d/);
    expect(dt).toMatch(/\.av-tilt:hover[\s\S]*?perspective\(1000px\)[\s\S]*?rotateX/);
  });

  it(".av-glass et .av-glass-heavy avec backdrop-filter blur", () => {
    expect(dt).toMatch(/\.av-glass[^-]/);
    expect(dt).toMatch(/\.av-glass-heavy/);
  });

  it(".av-text-glow-teal avec text-shadow multi-layer", () => {
    expect(dt).toMatch(/\.av-text-glow-teal/);
    expect(dt).toMatch(/text-shadow:[\s\S]*?rgba\(124,\s*200,\s*200,\s*0?\.5\)/);
  });

  it(".av-grid-bg / .av-aurora-blob / .av-float / .av-glow-pulse", () => {
    expect(dt).toMatch(/\.av-grid-bg/);
    expect(dt).toMatch(/\.av-aurora-blob/);
    expect(dt).toMatch(/\.av-float/);
    expect(dt).toMatch(/\.av-glow-pulse/);
  });

  it("Custom scrollbar premium (track + thumb gradient teal)", () => {
    expect(dt).toMatch(/\*::-webkit-scrollbar-thumb/);
    expect(dt).toMatch(/linear-gradient\(180deg,\s*rgba\(124,\s*200,\s*200/);
  });

  it("Smooth scroll natif + respect prefers-reduced-motion", () => {
    expect(dt).toMatch(/html\s*\{\s*scroll-behavior:\s*smooth/);
    expect(dt).toMatch(/prefers-reduced-motion[\s\S]*?scroll-behavior:\s*auto/);
  });
});

describe("0.58.17 - TopBar glassmorphism v2", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Background semi-transparent rgba pour vrai glassmorphism", () => {
    expect(css).toMatch(/\.topbar\{[\s\S]*?background:linear-gradient\(90deg,rgba\(13,24,34,\.92\)/);
  });

  it("backdrop-filter passé à blur(20px) saturate(200%)", () => {
    expect(css).toMatch(/\.topbar\{[\s\S]*?backdrop-filter:blur\(20px\)\s*saturate\(200%\)/);
  });

  it("::after avec animated gradient bar (av-bg-pos-shift)", () => {
    expect(css).toMatch(/\.topbar::after/);
    expect(css).toMatch(/\.topbar::after\{[\s\S]*?animation:av-bg-pos-shift/);
  });

  it("Logo .v avec text-shadow neon multi-layer (4 layers)", () => {
    expect(css).toMatch(/\.logo \.v\{[\s\S]*?0 0 4px rgba\(124,200,200,\.9\)/);
    expect(css).toMatch(/\.logo \.v\{[\s\S]*?0 0 12px rgba\(124,200,200,\.65\)/);
    expect(css).toMatch(/\.logo \.v\{[\s\S]*?0 0 48px rgba\(124,200,200,\.15\)/);
  });
});

describe("0.58.17 - KpiCard 3D tilt", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/KpiCard.js"), "utf-8");

  it("transform-style: preserve-3d sur la card (RETIRÉ en 0.58.19 — créait containing block)", () => {
    // 0.58.19 : transformStyle preserve-3d retiré pour fixer bug overlays mobile
    // Le tilt 3D fonctionne quand même via perspective() dans le transform inline
    expect(src).not.toMatch(/transformStyle:\s*["']preserve-3d["']/);
  });

  it("onMouseMove pour tilt parallax suivant le curseur", () => {
    expect(src).toMatch(/onMouseMove=\{\(e\)\s*=>/);
    expect(src).toMatch(/getBoundingClientRect\(\)/);
    expect(src).toMatch(/perspective\(1000px\)/);
  });

  it("Hover applique perspective + rotateX + rotateY + scale", () => {
    expect(src).toMatch(/rotateX\(\$\{rotX\}deg\)\s*rotateY\(\$\{rotY\}deg\)/);
  });

  it("Variants enrichis : color + glow multi-layer", () => {
    expect(src).toMatch(/teal:[\s\S]*?glow:[\s\S]*?0 0 40px rgba\(124,\s*200,\s*200,\s*0\.45\)/);
    expect(src).toMatch(/color:\s*["']#7CC8C8["']/);
  });
});

describe("0.58.17 - PageHero hitech (aurora blobs + grid)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/PageHero.js"), "utf-8");

  it("isolation: 'isolate' pour stacking context propre", () => {
    expect(src).toMatch(/isolation:\s*["']isolate["']/);
  });

  it("Grid SVG cyber en background", () => {
    expect(src).toMatch(/backgroundImage:\s*["']var\(--av-grid-svg-strong\)["']/);
  });

  it("Mesh animé (background-position shift)", () => {
    expect(src).toMatch(/animation:\s*["']av-bg-pos-shift/);
    expect(src).toMatch(/var\(--av-mesh-aurora\)/);
  });

  it("Aurora blobs animées (2 minimum)", () => {
    const blobMatches = src.match(/className="av-aurora-blob"/g) || [];
    expect(blobMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("Icon halo avec animation av-glow-pulse + text-shadow accent", () => {
    expect(src).toMatch(/animation:\s*["']av-glow-pulse/);
    expect(src).toMatch(/textShadow:[\s\S]*?\$\{cfg\.accent\}/);
  });
});

describe("0.58.17 - NeonButton", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/NeonButton.js"), "utf-8");

  it("'use client' + export default function NeonButton", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export default function NeonButton/);
  });

  it("6 variants (teal/blue/violet/terra/amber/navy)", () => {
    expect(src).toMatch(/teal:\s*\{/);
    expect(src).toMatch(/blue:\s*\{/);
    expect(src).toMatch(/violet:\s*\{/);
    expect(src).toMatch(/terra:\s*\{/);
    expect(src).toMatch(/amber:\s*\{/);
    expect(src).toMatch(/navy:\s*\{/);
  });

  it("3 sizes (sm/md/lg)", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*padH:\s*12/);
    expect(src).toMatch(/md:\s*\{[^}]*padH:\s*18/);
    expect(src).toMatch(/lg:\s*\{[^}]*padH:\s*24/);
  });

  it("Ripple effect : setRipples + getBoundingClientRect + setTimeout cleanup", () => {
    expect(src).toMatch(/setRipples/);
    expect(src).toMatch(/setTimeout\([\s\S]*?setRipples[\s\S]*?700\)/);
  });

  it("Scan-line conic-gradient avec mask exclusion", () => {
    expect(src).toMatch(/var\(--av-conic-scan\)/);
    expect(src).toMatch(/maskComposite:\s*["']exclude["']/);
  });

  it("Shimmer light sweep continu (3.5s)", () => {
    expect(src).toMatch(/av-shimmer-premium 3\.5s/);
  });

  it("Glow multi-layer au hover (4px ring + 24px + 48px)", () => {
    expect(src).toMatch(/0 0 0 4px rgba\(124,200,200,\.20\)/);
    expect(src).toMatch(/0 8px 24px rgba\(124,200,200,\.40\)/);
    expect(src).toMatch(/0 0 48px rgba\(124,200,200,\.25\)/);
  });

  it("translateY au hover + transition cubic-bezier", () => {
    expect(src).toMatch(/translateY\(-2px\)/);
    expect(src).toMatch(/var\(--av-ease-out\)/);
  });

  it("Exporté depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    expect(idx).toMatch(/NeonButton/);
  });
});

describe("0.58.17 - Skeleton shimmer v2", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Skeleton.js"), "utf-8");

  it("Background avec teinte teal au centre (rgba(124,200,200,.18))", () => {
    expect(src).toMatch(/rgba\(124,200,200,\.18\)/);
  });

  it("Animation passée à ease-in-out 1.8s", () => {
    expect(src).toMatch(/av-shimmer 1\.8s ease-in-out infinite/);
  });
});

describe("0.58.17 - bg-dark avec grid cyber", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("bg-dark utilise var(--av-grid-svg) en overlay", () => {
    expect(css).toMatch(/\.bg-dark\{[\s\S]*?var\(--av-grid-svg\)/);
  });

  it("background-size 40px pour le grid", () => {
    expect(css).toMatch(/\.bg-dark\{[\s\S]*?background-size:\s*40px\s*40px/);
  });
});

describe("0.58.17 - Keyframes av-ripple + neon-btn scan", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("@keyframes av-ripple", () => {
    expect(css).toMatch(/@keyframes av-ripple/);
  });

  it(".av-neon-btn .av-neon-scan avec animation av-scan-rotate", () => {
    expect(css).toMatch(/\.av-neon-btn \.av-neon-scan/);
    expect(css).toMatch(/animation:\s*av-scan-rotate/);
  });
});

describe("0.58.17 - Récap composants premium (21 au total)", () => {
  it("21 composants exportés depuis ui-premium", () => {
    const idx = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/index.js"), "utf-8");
    const components = [
      "KpiCard", "Sparkline", "MetricCard",
      "Skeleton", "SkeletonText", "SkeletonRow", "SkeletonGrid",
      "SkeletonCard", "SkeletonAvatar", "SkeletonKpi",
      "EmptyState",
      "Toast", "showToast", "toast",
      "PageHero",
      "Tabs", "TabPanel",
      "Avatar", "AvatarGroup",
      "Select", "DatePicker", "Combobox",
      "TimePicker", "Dialog", "Drawer",
      "RangePicker", "Stepper", "StepperBody", "StepperFooter",
      "BulkToolbar", "ProgressBar", "Tooltip", "CodeBlock",
      // Nouveau 0.58.17
      "NeonButton",
    ];
    for (const c of components) {
      expect(idx).toMatch(new RegExp(`\\b${c}\\b`));
    }
  });
});
