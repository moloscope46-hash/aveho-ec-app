// =============================================================
//  Tests unitaires — 0.58.0
//  Refonte UI/UX premium : 6 composants + Hero Dashboard
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.0 - Version", () => {
  it("Version 0.58.0+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor] = pkg.version.split(".");
    expect(parseInt(major)).toBe(0);
    expect(parseInt(minor)).toBeGreaterThanOrEqual(58);
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.0 - Design tokens premium", () => {
  const tokens = fs.readFileSync(
    path.resolve(process.cwd(), "app/design-tokens.css"),
    "utf-8"
  );

  it("Fichier design-tokens.css existe et est importé", () => {
    expect(tokens.length).toBeGreaterThan(1000);
    const globals = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(globals).toMatch(/@import\s+["']\.\/design-tokens\.css["']/);
  });

  it("Définit les couleurs de marque (navy + teal + terra)", () => {
    expect(tokens).toMatch(/--av-navy:\s*#142131/);
    expect(tokens).toMatch(/--av-teal:\s*#7CC8C8/);
    expect(tokens).toMatch(/--av-terra:\s*#C9867F/);
  });

  it("Définit les gradients premium", () => {
    expect(tokens).toMatch(/--av-grad-navy:/);
    expect(tokens).toMatch(/--av-grad-teal:/);
    expect(tokens).toMatch(/--av-grad-hero:/);
    expect(tokens).toMatch(/--av-mesh-navy:/);
  });

  it("Définit les ombres multi-layer (xs/sm/md/lg/xl/2xl)", () => {
    expect(tokens).toMatch(/--av-shadow-xs:/);
    expect(tokens).toMatch(/--av-shadow-sm:/);
    expect(tokens).toMatch(/--av-shadow-md:/);
    expect(tokens).toMatch(/--av-shadow-lg:/);
    expect(tokens).toMatch(/--av-shadow-xl:/);
    expect(tokens).toMatch(/--av-shadow-2xl:/);
  });

  it("Définit les ombres colorées (teal, blue, terra, amber)", () => {
    expect(tokens).toMatch(/--av-shadow-teal:/);
    expect(tokens).toMatch(/--av-shadow-blue:/);
    expect(tokens).toMatch(/--av-shadow-terra:/);
    expect(tokens).toMatch(/--av-shadow-amber:/);
  });

  it("Définit les transitions cubic-bezier", () => {
    expect(tokens).toMatch(/--av-ease-out:\s*cubic-bezier/);
    expect(tokens).toMatch(/--av-ease-spring:\s*cubic-bezier/);
  });

  it("Définit les keyframes animations (fade, shimmer, pulse)", () => {
    expect(tokens).toMatch(/@keyframes av-fade-in-up/);
    expect(tokens).toMatch(/@keyframes av-shimmer/);
    expect(tokens).toMatch(/@keyframes av-pulse-ring/);
    expect(tokens).toMatch(/@keyframes av-scale-in/);
  });

  it("Animation stagger pour entrée en cascade", () => {
    expect(tokens).toMatch(/\.av-stagger > \*/);
    expect(tokens).toMatch(/animation-delay:\s*0\.05s/);
  });

  it("Glassmorphism utilitaire (av-glass + av-glass-dark)", () => {
    expect(tokens).toMatch(/\.av-glass\s*\{[\s\S]*?backdrop-filter/);
    expect(tokens).toMatch(/\.av-glass-dark/);
  });

  it("Respect prefers-reduced-motion (accessibilité)", () => {
    expect(tokens).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});

describe("0.58.0 - Composant KpiCard", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/KpiCard.js"),
    "utf-8"
  );

  it("Export default", () => {
    expect(src).toMatch(/export default function KpiCard/);
  });

  it("7 variants supportés (teal, blue, terra, amber, navy, violet, success)", () => {
    expect(src).toMatch(/teal:/);
    expect(src).toMatch(/blue:/);
    expect(src).toMatch(/terra:/);
    expect(src).toMatch(/amber:/);
    expect(src).toMatch(/navy:/);
    expect(src).toMatch(/violet:/);
    expect(src).toMatch(/success:/);
  });

  it("Hook useCountUp pour animation de valeur", () => {
    expect(src).toMatch(/function useCountUp/);
    expect(src).toMatch(/requestAnimationFrame/);
    expect(src).toMatch(/easeOutCubic|1 - Math\.pow\(1 - progress, 3\)/);
  });

  it("Calcul trend automatique depuis 'previous'", () => {
    expect(src).toMatch(/typeof previous === ["']number["']/);
    expect(src).toMatch(/value - previous/);
  });

  it("3 tailles supportées (sm, md, lg)", () => {
    expect(src).toMatch(/sm:\s*\{[^}]*padding/);
    expect(src).toMatch(/md:\s*\{[^}]*padding/);
    expect(src).toMatch(/lg:\s*\{[^}]*padding/);
  });

  it("Loading state avec skeleton shimmer", () => {
    expect(src).toMatch(/loading/);
    expect(src).toMatch(/av-shimmer/);
  });

  it("Hover effects sur card interactive", () => {
    expect(src).toMatch(/onMouseEnter/);
    expect(src).toMatch(/translateY\(-4px\)/);
  });
});

describe("0.58.0 - Composant Sparkline (SVG mini chart)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/Sparkline.js"),
    "utf-8"
  );

  it("Export default", () => {
    expect(src).toMatch(/export default function Sparkline/);
  });

  it("Path SVG calculé depuis les data points", () => {
    expect(src).toMatch(/data\.map.*\(v, i\)/);
    expect(src).toMatch(/M \$\{p\.x\} \$\{p\.y\}/);
  });

  it("Zone area sous la ligne (gradient fill)", () => {
    expect(src).toMatch(/areaPath/);
    expect(src).toMatch(/linearGradient/);
  });

  it("Animation stroke-dashoffset au mount", () => {
    expect(src).toMatch(/strokeDashoffset/);
    expect(src).toMatch(/transition.*stroke-dashoffset/);
  });

  it("Point final avec halo pulse", () => {
    expect(src).toMatch(/showDot/);
    expect(src).toMatch(/av-pulse-ring/);
  });
});

describe("0.58.0 - Composant Skeleton", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/Skeleton.js"),
    "utf-8"
  );

  it("Export default + variants (circle, card)", () => {
    expect(src).toMatch(/export default function Skeleton/);
    expect(src).toMatch(/variant === ["']circle["']/);
    expect(src).toMatch(/variant === ["']card["']/);
  });

  it("Animation shimmer via background-position", () => {
    expect(src).toMatch(/av-shimmer/);
    expect(src).toMatch(/linear-gradient/);
  });

  it("Helpers : SkeletonText, SkeletonRow, SkeletonGrid", () => {
    expect(src).toMatch(/export function SkeletonText/);
    expect(src).toMatch(/export function SkeletonRow/);
    expect(src).toMatch(/export function SkeletonGrid/);
  });
});

describe("0.58.0 - Composant EmptyState", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/EmptyState.js"),
    "utf-8"
  );

  it("Export default avec props standards", () => {
    expect(src).toMatch(/export default function EmptyState/);
    expect(src).toMatch(/title/);
    expect(src).toMatch(/message/);
    expect(src).toMatch(/actionLabel/);
    expect(src).toMatch(/onAction/);
  });

  it("Halo pulse animation autour de l'icône", () => {
    expect(src).toMatch(/av-pulse-soft/);
  });

  it("6 variants colorés", () => {
    const variants = src.match(/VARIANTS\s*=\s*\{([\s\S]*?)\};/);
    expect(variants).toBeTruthy();
    expect(variants[1].split(":").length).toBeGreaterThanOrEqual(6);
  });
});

describe("0.58.0 - Composant MetricCard avec progress bar", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/MetricCard.js"),
    "utf-8"
  );

  it("Progress bar animée", () => {
    expect(src).toMatch(/setAnimPercent/);
    expect(src).toMatch(/transition.*width.*1200ms/);
  });

  it("Shimmer overlay sur la bar (effet brillance)", () => {
    expect(src).toMatch(/av-shimmer/);
  });

  it("Breakdown détaillé optionnel", () => {
    expect(src).toMatch(/breakdown\.map/);
  });
});

describe("0.58.0 - Système Toast premium", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/Toast.js"),
    "utf-8"
  );

  it("4 types de toast (success, info, warning, error)", () => {
    expect(src).toMatch(/success:/);
    expect(src).toMatch(/info:/);
    expect(src).toMatch(/warning:/);
    expect(src).toMatch(/error:/);
  });

  it("Export showToast + helpers shortcuts (toast.success, etc.)", () => {
    expect(src).toMatch(/export function showToast/);
    expect(src).toMatch(/export const toast/);
    expect(src).toMatch(/success:.*showToast/);
  });

  it("Escape HTML des inputs (anti-XSS)", () => {
    expect(src).toMatch(/function escapeHtml/);
    expect(src).toMatch(/&amp;/);
  });

  it("Auto-dismiss avec timeout configurable", () => {
    expect(src).toMatch(/duration\s*=\s*4000/);
    expect(src).toMatch(/setTimeout.*removeToast/);
  });

  it("Slide-in animation (translateX)", () => {
    expect(src).toMatch(/translateX\(110%\)/);
  });
});

describe("0.58.0 - Index ui-premium centralisé", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/ui-premium/index.js"),
    "utf-8"
  );

  it("Exporte les 6 composants premium", () => {
    expect(src).toMatch(/KpiCard/);
    expect(src).toMatch(/Sparkline/);
    expect(src).toMatch(/MetricCard/);
    expect(src).toMatch(/EmptyState/);
    expect(src).toMatch(/Skeleton/);
    expect(src).toMatch(/showToast/);
  });
});

describe("0.58.0 - HeroDashboard intégré dans Accueil", () => {
  it("HeroDashboard.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"))).toBe(true);
  });

  it("Importe les composants premium", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"),
      "utf-8"
    );
    expect(src).toMatch(/KpiCard/);
    expect(src).toMatch(/SkeletonGrid/);
  });

  it("Greeting selon l'heure (Bonjour/Bonsoir/etc)", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/accueil/HeroDashboard.js"),
      "utf-8"
    );
    expect(src).toMatch(/function getGreeting/);
    expect(src).toMatch(/Bonjour/);
    expect(src).toMatch(/Bonsoir/);
  });

  it("Accueil/page.js importe et utilise HeroDashboard", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/accueil/page.js"),
      "utf-8"
    );
    expect(src).toMatch(/import\s+HeroDashboard/);
    expect(src).toMatch(/<HeroDashboard/);
  });
});

describe("0.58.0 - Login premium upgrade CSS", () => {
  const css = fs.readFileSync(
    path.resolve(process.cwd(), "app/globals.css"),
    "utf-8"
  );

  it("Blobs animés (av-float-1 + av-float-2)", () => {
    expect(css).toMatch(/@keyframes av-float-1/);
    expect(css).toMatch(/@keyframes av-float-2/);
  });

  it("Effect shine sur le titre accent", () => {
    expect(css).toMatch(/@keyframes av-shine/);
  });

  it("Input focus ring teal", () => {
    expect(css).toMatch(/input:focus[\s\S]*?box-shadow:.*rgba\(124,200,200/);
  });
});
