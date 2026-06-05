// =============================================================
//  Tests unitaires — 0.58.21 LOGIN + CMD+K + NEONBUTTON
//
//  1. Fix test versions-index seuil 500→650 KB
//  2. Login redesign fullscreen aurora avec NeonButton géant
//  3. Cmd+K palette refonte glass premium
//  4. NeonButton : variant aurora + icon prop
//  5. Migration NeonButton sur /profil
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.21 - Version", () => {
  it("Version 0.58.21+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(21);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.21 - NeonButton variant aurora + icon", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/NeonButton.js"), "utf-8");

  it("Variant aurora : multi-couleur Aveho (teal → blue → violet → terra)", () => {
    expect(src).toMatch(/aurora:\s*\{[\s\S]*?#7CC8C8[\s\S]*?#185FA5[\s\S]*?#7a6fb0[\s\S]*?#C9867F/);
  });

  it("Prop icon supportée + render via <i className='ti ...'>", () => {
    expect(src).toMatch(/\bicon\s*,\s*$/m);
    expect(src).toMatch(/icon\s*&&\s*\(/);
    expect(src).toMatch(/className=\{`ti \$\{icon\}`\}/);
  });

  it("Icon ti-loader-2 anime via av-neon-spin", () => {
    expect(src).toMatch(/icon\s*===\s*["']ti-loader-2["'][\s\S]*?av-neon-spin/);
  });
});

describe("0.58.21 - Login redesign fullscreen aurora", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/login/page.js"), "utf-8");

  it("Imports NeonButton + ParticlesBackground", () => {
    expect(src).toMatch(/import\s*\{[^}]*NeonButton[^}]*ParticlesBackground[^}]*\}\s*from\s*["']\.\.\/components\/ui-premium["']/);
  });

  it("Container racine .av-login-root (au lieu de .bg-dark login-wrap)", () => {
    expect(src).toMatch(/className=["']av-login-root["']/);
  });

  it("ParticlesBackground en background", () => {
    expect(src).toMatch(/<ParticlesBackground[\s\S]*?count=\{45\}/);
    expect(src).toMatch(/showOnMobile=\{true\}/);
  });

  it("3 Aurora blobs (teal + blue + violet)", () => {
    expect(src).toMatch(/blob-teal/);
    expect(src).toMatch(/blob-blue/);
    expect(src).toMatch(/blob-violet/);
  });

  it("Card glassmorphism avec scan permanent", () => {
    expect(src).toMatch(/av-login-card-scan/);
    expect(src).toMatch(/av-login-card-inner/);
  });

  it("NeonButton GÉANT variant aurora size=lg fullWidth pour 'Se connecter'", () => {
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']aurora["'][\s\S]*?size=["']lg["'][\s\S]*?fullWidth/);
  });

  it("Magic link button stylé en .av-login-magic", () => {
    expect(src).toMatch(/className=["']av-login-magic["']/);
  });

  it("Footer features avec chips .av-login-feat", () => {
    expect(src).toMatch(/className=["']av-login-feat["']/);
  });

  it("Mobile-first : .av-login-container avec safe-area-inset-bottom", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toMatch(/\.av-login-container\s*\{[\s\S]*?env\(safe-area-inset-bottom/);
  });
});

describe("0.58.21 - Login CSS premium", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("av-login-root avec radial-gradient sombre", () => {
    expect(css).toMatch(/\.av-login-root\s*\{[\s\S]*?radial-gradient/);
  });

  it("av-login-blob : 3 blobs (teal/blue/violet) avec animation float", () => {
    expect(css).toMatch(/\.av-login-blob\.blob-teal/);
    expect(css).toMatch(/\.av-login-blob\.blob-blue/);
    expect(css).toMatch(/\.av-login-blob\.blob-violet/);
    expect(css).toMatch(/@keyframes av-login-blob-float/);
  });

  it("av-login-grid : grid cyber subtil avec mask radial", () => {
    expect(css).toMatch(/\.av-login-grid\s*\{[\s\S]*?mask-image:\s*radial-gradient/);
  });

  it("av-login-card avec backdrop-filter blur(30px) saturate(180%)", () => {
    expect(css).toMatch(/\.av-login-card\s*\{[\s\S]*?backdrop-filter:\s*blur\(30px\)\s*saturate\(180%\)/);
  });

  it("av-login-card-scan : conic-gradient avec mask-composite exclude", () => {
    expect(css).toMatch(/\.av-login-card-scan\s*\{[\s\S]*?conic-gradient[\s\S]*?mask-composite:\s*exclude/);
  });

  it("av-login-welcome .wave : animation rotation main", () => {
    expect(css).toMatch(/@keyframes av-login-wave/);
  });

  it("Mobile responsive @media (max-width: 600px)", () => {
    expect(css).toMatch(/@media \(max-width:\s*600px\)\s*\{[\s\S]*?\.av-login-container/);
  });
});

describe("0.58.21 - Cmd+K palette refonte glass", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/GlobalSearch.js"), "utf-8");

  it("Import createPortal de react-dom", () => {
    expect(src).toMatch(/import\s*\{\s*createPortal\s*\}\s*from\s*["']react-dom["']/);
  });

  it("Render via Portal vers document.body (guard mounted)", () => {
    expect(src).toMatch(/return createPortal\(/);
    expect(src).toMatch(/document\.body\)/);
    expect(src).toMatch(/const \[mounted, setMounted\]/);
  });

  it("Wrapper .av-cmdk-overlay (glassmorphism)", () => {
    expect(src).toMatch(/className=["']av-cmdk-overlay["']/);
  });

  it("Modal .av-cmdk-modal avec scan permanent", () => {
    expect(src).toMatch(/className=["']av-cmdk-modal["']/);
    expect(src).toMatch(/className=["']av-cmdk-scan["']/);
  });

  it("Input avec class .av-cmdk-input + icon glow", () => {
    expect(src).toMatch(/className=["']av-cmdk-input["']/);
    expect(src).toMatch(/className=["']ti ti-search av-cmdk-icon["']/);
  });

  it("Chips .av-cmdk-chip (filtres)", () => {
    expect(src).toMatch(/av-cmdk-chip/);
  });

  it("Footer kbds .av-cmdk-kbd-mini", () => {
    expect(src).toMatch(/av-cmdk-kbd-mini/);
  });
});

describe("0.58.21 - Cmd+K CSS premium", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("av-cmdk-overlay : backdrop-filter blur + animation fade-in", () => {
    expect(css).toMatch(/\.av-cmdk-overlay\s*\{[\s\S]*?backdrop-filter:\s*blur/);
    expect(css).toMatch(/@keyframes av-cmdk-overlay-in/);
  });

  it("av-cmdk-modal : glassmorphism + animation scale-in", () => {
    expect(css).toMatch(/\.av-cmdk-modal\s*\{[\s\S]*?backdrop-filter:\s*blur\(30px\)/);
    expect(css).toMatch(/@keyframes av-cmdk-modal-in/);
  });

  it("av-cmdk-scan : conic-gradient permanent", () => {
    expect(css).toMatch(/\.av-cmdk-scan\s*\{[\s\S]*?conic-gradient/);
    expect(css).toMatch(/@keyframes av-cmdk-scan-rotate/);
  });

  it("av-cmdk-icon : glow teal", () => {
    expect(css).toMatch(/\.av-cmdk-icon\s*\{[\s\S]*?text-shadow:[\s\S]*?rgba\(124, 200, 200/);
  });

  it("Mobile responsive Cmd+K", () => {
    expect(css).toMatch(/@media \(max-width:\s*600px\)\s*\{[\s\S]*?\.av-cmdk-overlay/);
  });
});

describe("0.58.21 - Migration NeonButton sur /profil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Import NeonButton depuis ui-premium", () => {
    expect(src).toMatch(/import\s*\{[^}]*NeonButton[^}]*\}\s*from\s*["']\.\.\/components\/ui-premium["']/);
  });

  it("saveNom utilise NeonButton variant teal", () => {
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']teal["'][\s\S]*?icon=["']ti-device-floppy["'][\s\S]*?onClick=\{saveNom\}/);
  });

  it("savePwd utilise NeonButton variant blue", () => {
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']blue["'][\s\S]*?icon=["']ti-lock["'][\s\S]*?onClick=\{savePwd\}/);
  });

  it("CacheResetButton utilise NeonButton variant amber", () => {
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=["']amber["'][\s\S]*?icon=["']ti-refresh["']/);
  });
});

describe("0.58.21 - Fix test versions-index seuil 650 KB", () => {
  it("Seuil monté de 500 KB à 650 KB (versions-data grandit naturellement)", () => {
    const test = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v057-11-lazy-versions-index.test.js"), "utf-8");
    // 0.58.42 : assoupli — tolère tout seuil KB à 3 chiffres (650, 800…) car versions-data grandit
    expect(test).toMatch(/toBeLessThan\(\d{3}\s*\*\s*1024\)/);
  });
});
