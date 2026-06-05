// =============================================================
//  Tests unitaires — 0.58.27
//
//  1. NotifBell preview hover (3 dernières notifs)
//  2. Tour produit premium /accueil avec steps custom
//  3. Mode présentation watermark logo Aveho
//  4. Cmd+K résultats search avec preview panel
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.27 - Version", () => {
  it("Version 0.58.27+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(27);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(sw).toContain(`"aveho-ec-${pkg.version.replace("-alpha", "")}"`);
  });
});

describe("0.58.27 - NotifBell preview hover", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/NotifBell.js"), "utf-8");

  it("State previewOpen + timer ref", () => {
    expect(src).toMatch(/const \[previewOpen, setPreviewOpen\]/);
    expect(src).toMatch(/previewTimerRef/);
  });

  it("Handlers Enter/Leave avec delay 350ms et 200ms", () => {
    expect(src).toMatch(/handlePreviewEnter/);
    expect(src).toMatch(/handlePreviewLeave/);
    expect(src).toMatch(/setTimeout\(\(\) => setPreviewOpen\(true\), 350\)/);
    expect(src).toMatch(/setTimeout\(\(\) => setPreviewOpen\(false\), 200\)/);
  });

  it("Slice 3 dernières notifs (lastThree)", () => {
    expect(src).toMatch(/const lastThree = items\.slice\(0, 3\)/);
  });

  it("Preview panel avec glassmorphism + footer 'Voir tout'", () => {
    expect(src).toMatch(/previewOpen && !open && \(/);
    expect(src).toMatch(/Voir toutes les notifications/);
  });

  it("Keyframe av-notif-preview-in", () => {
    expect(src).toMatch(/@keyframes av-notif-preview-in/);
  });

  it("Dot non lu coloré + icône type", () => {
    expect(src).toMatch(/!it\.lu &&/);
    expect(src).toMatch(/boxShadow:\s*`0 0 8px \$\{type\.color\}99`/);
  });
});

describe("0.58.27 - Tour produit premium /accueil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/accueil/page.js"), "utf-8");

  it("Import PremiumOnboardingTour depuis components/OnboardingTour", () => {
    expect(src).toMatch(/import PremiumOnboardingTour from\s*["']\.\.\/components\/OnboardingTour["']/);
  });

  it("PREMIUM_TOUR_STEPS avec 5 steps", () => {
    expect(src).toMatch(/const PREMIUM_TOUR_STEPS = \[/);
    // 5 entrées de step (title:)
    const matches = src.match(/title:\s*["']/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("Steps couvrent Cmd+K, KPIs, Notifs, Présentation, Focus", () => {
    expect(src).toMatch(/Recherche universelle Cmd\+K/);
    expect(src).toMatch(/KPIs en mode mission control/);
    expect(src).toMatch(/Notifications avec preview/);
    expect(src).toMatch(/Mode présentation/);
    expect(src).toMatch(/Mode focus zen/);
  });

  it("PremiumTourTrigger composant + détection ?tour=premium", () => {
    expect(src).toMatch(/function PremiumTourTrigger/);
    expect(src).toMatch(/params\.get\(["']tour["']\) === ["']premium["']/);
  });

  it("storageKey av-tour-premium-058", () => {
    expect(src).toMatch(/storageKey=["']av-tour-premium-058["']/);
  });
});

describe("0.58.27 - ReplayTourButton lance le tour premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Redirige vers /accueil?tour=premium", () => {
    expect(src).toMatch(/router\.push\(["']\/accueil\?tour=premium["']\)/);
  });

  it("Reset le storage av-tour-premium-058", () => {
    expect(src).toMatch(/localStorage\.removeItem\(["']av-tour-premium-058["']\)/);
  });
});

describe("0.58.27 - Mode présentation watermark logo Aveho", () => {
  it("Logo SVG existe dans public/", () => {
    const logoPath = path.resolve(process.cwd(), "public/logo-aveho.svg");
    expect(fs.existsSync(logoPath)).toBe(true);
    const svg = fs.readFileSync(logoPath, "utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toMatch(/aveho/i);
  });

  it("CSS html.av-presentation-mode body::before utilise logo-aveho.svg", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/html\.av-presentation-mode body::before[\s\S]*?background-image:\s*url\(["']\/logo-aveho\.svg["']\)/);
  });

  it("Opacity 0.35 par défaut, 0.55 au hover, watermark mobile plus discret", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/opacity:\s*0\.35/);
    expect(css).toMatch(/body:hover::before[\s\S]*?opacity:\s*0\.55/);
    expect(css).toMatch(/@media \(max-width:\s*768px\)[\s\S]*?opacity:\s*0\.25/);
  });
});

describe("0.58.27 - Cmd+K résultats avec preview panel", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("Layout flex avec liste + preview side", () => {
    expect(src).toMatch(/results\[sel\] && \(/);
  });

  it("Preview panel avec eyebrow 'Aperçu' + type", () => {
    expect(src).toMatch(/Aperçu \{t\.lbl\}/);
  });

  it("CTA 'Appuyez sur ↵ pour ouvrir'", () => {
    expect(src).toMatch(/Appuyez sur ↵ pour ouvrir/);
  });

  it("Animation av-cmdk-preview-in", () => {
    expect(src).toMatch(/av-cmdk-preview-in 200ms/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/@keyframes av-cmdk-preview-in/);
  });

  it("Métadonnées additionnelles si r.meta présent", () => {
    expect(src).toMatch(/\{r\.meta && \(/);
    expect(src).toMatch(/Object\.entries\(r\.meta\)/);
  });
});
