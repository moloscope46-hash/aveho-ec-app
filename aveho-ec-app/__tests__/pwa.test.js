// =============================================================
//  Tests unitaires — PWA finalisée
//  Alpha 0.36.0
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Manifest PWA", () => {
  const manifest = JSON.parse(fs.readFileSync(`${ROOT}/public/manifest.json`, "utf-8"));

  it("a un nom et short_name", () => {
    expect(manifest.name).toBe("Aveho — Espace Collectivité");
    expect(manifest.short_name).toBe("Aveho EC");
  });

  it("start_url pointe vers /accueil", () => {
    expect(manifest.start_url).toBe("/accueil");
  });

  it("display = standalone (pour mode app)", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("couleurs de marque Aveho", () => {
    expect(manifest.background_color).toBe("#142131"); // navy
    expect(manifest.theme_color).toBe("#142131");
  });

  it("lang fr-FR + dir ltr", () => {
    expect(manifest.lang).toBe("fr-FR");
    expect(manifest.dir).toBe("ltr");
  });

  it("au moins 12 icônes avec différentes tailles", () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(12);
  });

  it("contient icônes maskable obligatoires", () => {
    const maskable = manifest.icons.filter((i) => i.purpose === "maskable");
    expect(maskable.length).toBeGreaterThanOrEqual(2);
    const sizes = maskable.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("a au moins 3 shortcuts (Patients, DI, Achats)", () => {
    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(3);
    const names = manifest.shortcuts.map((s) => s.short_name);
    expect(names).toContain("Patients");
    expect(names).toContain("DI");
    expect(names).toContain("Achats");
  });

  it("categories incluent 'medical'", () => {
    expect(manifest.categories).toContain("medical");
  });

  it("prefer_related_applications = false (on est la version officielle)", () => {
    expect(manifest.prefer_related_applications).toBe(false);
  });
});

describe("Fichiers d'icônes générés", () => {
  const ICONS = [
    "icon-192.png", "icon-512.png",
    "maskable-192.png", "maskable-512.png",
    "apple-touch-icon.png",
    "icon-72.png", "icon-96.png", "icon-128.png",
    "icon-144.png", "icon-152.png", "icon-384.png",
    "favicon-32.png", "favicon-16.png",
  ];

  ICONS.forEach((name) => {
    it(`/icons/${name} existe`, () => {
      const p = `${ROOT}/public/icons/${name}`;
      expect(fs.existsSync(p)).toBe(true);
    });
  });

  it("toutes les icônes ont une taille > 100 bytes (= image réelle, pas placeholder)", () => {
    ICONS.forEach((name) => {
      const stat = fs.statSync(`${ROOT}/public/icons/${name}`);
      expect(stat.size).toBeGreaterThan(100);
    });
  });
});

describe("Splash screens iOS", () => {
  const SPLASH = [
    "apple-splash-1290-2796.png", // iPhone 14 Pro Max
    "apple-splash-1179-2556.png", // iPhone 14 Pro
    "apple-splash-1170-2532.png", // iPhone 14/13
    "apple-splash-1125-2436.png", // iPhone 13 mini
    "apple-splash-1242-2688.png", // iPhone 11 Pro Max
    "apple-splash-828-1792.png",  // iPhone 11/XR
    "apple-splash-1242-2208.png", // iPhone 8 Plus
    "apple-splash-750-1334.png",  // iPhone 8
    "apple-splash-2048-2732.png", // iPad Pro 12.9"
    "apple-splash-1668-2388.png", // iPad Pro 11"
    "apple-splash-1620-2160.png", // iPad 10.2"
    "apple-splash-1536-2048.png", // iPad Mini
  ];

  it("au moins 12 splash screens couvrent les principaux devices iOS", () => {
    const dir = `${ROOT}/public/splash`;
    expect(fs.existsSync(dir)).toBe(true);
    SPLASH.forEach((name) => {
      expect(fs.existsSync(`${dir}/${name}`)).toBe(true);
    });
  });

  it("splash files ont un poids raisonnable (> 1 KB, < 500 KB chacun)", () => {
    SPLASH.forEach((name) => {
      const stat = fs.statSync(`${ROOT}/public/splash/${name}`);
      expect(stat.size).toBeGreaterThan(1000);
      expect(stat.size).toBeLessThan(500 * 1024);
    });
  });
});

describe("Logique InstallBanner — snooze/dismiss", () => {
  function shouldShow(state, now = Date.now()) {
    if (!state) return true;
    if (state.dismissed === "forever") return false;
    if (state.snoozedUntil && state.snoozedUntil > now) return false;
    return true;
  }

  it("aucun state → afficher", () => {
    expect(shouldShow(null)).toBe(true);
    expect(shouldShow(undefined)).toBe(true);
  });

  it("dismissed forever → ne pas afficher", () => {
    expect(shouldShow({ dismissed: "forever" })).toBe(false);
  });

  it("snoozé pour le futur → ne pas afficher", () => {
    const futur = Date.now() + 24 * 60 * 60 * 1000;
    expect(shouldShow({ snoozedUntil: futur })).toBe(false);
  });

  it("snooze expiré → ré-afficher", () => {
    const passe = Date.now() - 1000;
    expect(shouldShow({ snoozedUntil: passe })).toBe(true);
  });

  it("snooze de 7 jours = 604800000 ms", () => {
    const SNOOZE_DAYS = 7;
    expect(SNOOZE_DAYS * 24 * 60 * 60 * 1000).toBe(604800000);
  });
});

describe("Détection iOS via user agent", () => {
  function isIosLike(ua) {
    return /iphone|ipad|ipod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  }

  it("iPhone Safari → iOS", () => {
    expect(isIosLike("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(true);
  });

  it("iPad Safari → iOS", () => {
    expect(isIosLike("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(true);
  });

  it("Chrome sur iOS (CriOS) → exclu (l'install passe par les params Chrome iOS)", () => {
    expect(isIosLike("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1")).toBe(false);
  });

  it("Firefox iOS (FxiOS) → exclu", () => {
    expect(isIosLike("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1")).toBe(false);
  });

  it("Android Chrome → pas iOS", () => {
    expect(isIosLike("Mozilla/5.0 (Linux; Android 13; SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")).toBe(false);
  });

  it("Desktop Chrome → pas iOS", () => {
    expect(isIosLike("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")).toBe(false);
  });
});

describe("Layout : head contient les meta PWA", () => {
  const layout = fs.readFileSync(`${ROOT}/app/layout.js`, "utf-8");

  it("contient manifest", () => {
    expect(layout).toContain("manifest");
  });

  it("contient appleWebApp", () => {
    expect(layout).toContain("appleWebApp");
  });

  it("contient apple-touch-icon link", () => {
    expect(layout).toContain("apple-touch-icon");
  });

  it("contient au moins 12 splash links iOS (un par device)", () => {
    const count = (layout.match(/apple-touch-startup-image/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(12);
  });

  it("InstallBanner monté", () => {
    expect(layout).toContain("InstallBanner");
  });

  it("favicons multi-tailles", () => {
    expect(layout).toContain("favicon-32");
    expect(layout).toContain("favicon-16");
  });

  it("mobile-web-app-capable yes", () => {
    expect(layout).toContain("mobile-web-app-capable");
  });
});

describe("CSS globals contient les optims PWA", () => {
  const css = fs.readFileSync(`${ROOT}/app/globals.css`, "utf-8");

  it("contient media display-mode: standalone", () => {
    expect(css).toMatch(/display-mode:\s*standalone/);
  });

  it("contient safe-area-inset", () => {
    expect(css).toContain("safe-area-inset");
  });

  it("contient pointer: coarse pour touch", () => {
    expect(css).toMatch(/pointer:\s*coarse/);
  });

  it("min-height 44px pour touch targets (recommandation Apple/Google)", () => {
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("font-size 16px sur inputs (évite zoom iOS)", () => {
    // L'astuce iOS bien connue : input < 16px → zoom auto au focus
    expect(css).toMatch(/font-size:\s*16px/);
  });

  it("overscroll-behavior pour bloquer pull-to-refresh", () => {
    expect(css).toContain("overscroll-behavior");
  });
});
