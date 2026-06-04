// =============================================================
//  Tests unitaires — 0.57.23
//  Nettoyage Permissions-Policy : retrait de 7 features non
//  reconnues par Chrome (warnings 'Unrecognized feature').
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.23 - Version", () => {
  it("Version 0.57.23+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(23);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.23 - Permissions-Policy nettoyée des features non reconnues Chrome", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  // Bloc Permissions-Policy
  const ppBlock = src.substring(
    src.indexOf("Permissions-Policy"),
    src.indexOf("Cross-Origin-Opener-Policy")
  );

  // === Features retirées (warnings Chrome) ===
  const REMOVED_FEATURES = [
    "ambient-light-sensor",     // origin trial seulement
    "battery",                   // deprecated
    "document-domain",           // deprecated (remplacé par COOP)
    "execution-while-not-rendered",        // experimental
    "execution-while-out-of-viewport",     // experimental
    "navigation-override",       // experimental
    "speaker-selection",         // pas implémenté Chrome
  ];

  REMOVED_FEATURES.forEach((feature) => {
    it(`Feature '${feature}' retirée du tableau actif (causait warning Chrome)`, () => {
      // La feature peut être dans un commentaire mais pas dans une string active
      // Pattern actif : "feature=()"
      const activePattern = new RegExp(`^\\s*"${feature}=\\(`, "m");
      expect(activePattern.test(ppBlock), `${feature} doit être retiré`).toBe(false);
    });
  });

  // === Features standard maintenues ===
  const KEPT_FEATURES = [
    "camera",                     // OCR
    "geolocation",                // carte
    "web-share",                  // PWA partage
    "publickey-credentials-get",  // WebAuthn
    "sync-xhr",                   // Supabase realtime
    "microphone",                 // bloqué explicitement
    "payment",                    // bloqué
    "interest-cohort",            // bloque FLoC
    "bluetooth",
    "display-capture",
    "encrypted-media",
    "gamepad",
    "gyroscope",
    "hid",
    "idle-detection",
    "magnetometer",
    "midi",
    "screen-wake-lock",
    "serial",
    "usb",
    "xr-spatial-tracking",
  ];

  KEPT_FEATURES.forEach((feature) => {
    it(`Feature '${feature}' maintenue (standard supportée par Chrome)`, () => {
      const activePattern = new RegExp(`"${feature}=\\(`);
      expect(activePattern.test(ppBlock), `${feature} doit être présent`).toBe(true);
    });
  });

  it("Commentaire explicatif documente les 7 features retirées", () => {
    expect(ppBlock).toMatch(/non reconnues par Chrome/i);
    expect(ppBlock).toMatch(/warnings console/i);
  });

  it("Permissions-Policy a 21 features actives (vs 27 en 0.57.22)", () => {
    // Compter les patterns "feature=("
    const matches = ppBlock.match(/^\s*"[a-z-]+=\(/gm) || [];
    expect(matches.length).toBe(21);
  });
});

describe("0.57.23 - Score sécurité headers maintenu 10/10", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("X-Content-Type-Options présent", () => expect(src).toMatch(/X-Content-Type-Options/));
  it("X-Frame-Options présent", () => expect(src).toMatch(/X-Frame-Options/));
  it("HSTS preload 1 an maintenu", () => expect(src).toMatch(/max-age=31536000.*preload/));
  it("Referrer-Policy présent", () => expect(src).toMatch(/Referrer-Policy/));
  it("Permissions-Policy présent", () => expect(src).toMatch(/Permissions-Policy/));
  it("COOP présent", () => expect(src).toMatch(/Cross-Origin-Opener-Policy/));
  it("CORP présent", () => expect(src).toMatch(/Cross-Origin-Resource-Policy/));
  it("CSP Report-Only présent", () => expect(src).toMatch(/Content-Security-Policy-Report-Only/));
  it("X-Aveho-Security-Audit présent", () => expect(src).toMatch(/X-Aveho-Security-Audit/));
  it("poweredByHeader: false maintenu", () => expect(src).toMatch(/poweredByHeader:\s*false/));
});
