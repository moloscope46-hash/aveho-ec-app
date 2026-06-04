// =============================================================
//  Tests unitaires — 0.57.37
//  6 sujets : security.txt + IndexedDB + Referer + CSP + SRI + 2FA
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.37 - Version", () => {
  it("Version 0.57.37+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(37);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.37 - Sujet 1 : security.txt + policy.html", () => {
  it("public/.well-known/security.txt existe", () => {
    const p = path.resolve(process.cwd(), "public/.well-known/security.txt");
    expect(fs.existsSync(p)).toBe(true);
  });

  it("security.txt respecte RFC 9116 (Contact + Expires)", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "public/.well-known/security.txt"),
      "utf-8"
    );
    expect(src).toMatch(/^Contact:/m);
    expect(src).toMatch(/^Expires:/m);
    expect(src).toMatch(/securite@aveho\.fr/);
  });

  it("policy.html existe et liste les engagements", () => {
    const p = path.resolve(process.cwd(), "public/.well-known/policy.html");
    expect(fs.existsSync(p)).toBe(true);
    const src = fs.readFileSync(p, "utf-8");
    expect(src).toMatch(/72h/);    // SLA accusé réception
    expect(src).toMatch(/14 jours/); // SLA évaluation
  });
});

describe("0.57.37 - Sujet 2 : clearUserData étendu (IndexedDB + sb-*)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/clearUserData.js"),
    "utf-8"
  );

  it("SENSITIVE_LS_PREFIXES inclut 'sb-' (Supabase Auth tokens)", () => {
    const match = src.match(/SENSITIVE_LS_PREFIXES\s*=\s*\[([\s\S]*?)\]/);
    expect(match[1]).toMatch(/["']sb-["']/);
  });

  it("Export clearWebauthnDb pour purger IndexedDB aveho-webauthn", () => {
    expect(src).toMatch(/export async function clearWebauthnDb/);
    expect(src).toMatch(/indexedDB\.deleteDatabase\(["']aveho-webauthn["']\)/);
  });

  it("clearUserData accepte option deepClean pour purger biométrie", () => {
    expect(src).toMatch(/options\.deepClean/);
    expect(src).toMatch(/bio_cleared/);
  });

  it("Mode logout normal NE purge PAS la biométrie (préserve face/empreinte)", () => {
    // Si on n'est pas en deepClean, bio_cleared doit être false
    expect(src).toMatch(/options\.deepClean === true[\s\S]*?:\s*false/);
  });
});

describe("0.57.37 - Sujet 3 : Liens externes avec rel=noopener noreferrer", () => {
  it("Aucun target='_blank' sans noopener (anti tabnabbing)", () => {
    const violations = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else if (item.name.endsWith(".js") || item.name.endsWith(".jsx")) {
          const src = fs.readFileSync(full, "utf-8");
          const fullNorm = full.replace(/\\/g, "/");
          if (fullNorm.includes("/changelog/versions-data")) continue;
          // Chaque target="_blank" doit avoir noopener à proximité
          const matches = src.matchAll(/target=["']_blank["']/g);
          for (const m of matches) {
            // Cherche noopener dans les 200 chars autour
            const start = Math.max(0, m.index - 100);
            const end = Math.min(src.length, m.index + 200);
            const context = src.substring(start, end);
            if (!context.includes("noopener")) {
              violations.push(`${fullNorm} @ ${m.index}`);
            }
          }
        }
      }
    }
    scan(path.resolve(process.cwd(), "app"));
    expect(violations, `target='_blank' sans noopener : ${violations.join(", ")}`).toEqual([]);
  });
});

describe("0.57.37 - Sujet 4 : CSP enrichie (base-uri + manifest-src)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "next.config.js"),
    "utf-8"
  );

  it("CSP contient base-uri 'self' (anti <base> tag hijack)", () => {
    expect(src).toMatch(/base-uri ['"]\s*self/);
  });

  it("CSP contient manifest-src 'self' (anti PWA spoof)", () => {
    expect(src).toMatch(/manifest-src ['"]\s*self/);
  });

  it("CSP reste en mode report-only par défaut (pas enforce sauvage)", () => {
    expect(src).toMatch(/Content-Security-Policy-Report-Only/);
  });
});

describe("0.57.37 - Sujet 5 : SRI sur scripts CDN externes", () => {
  const FILES_WITH_JSPDF = [
    "lib/consentPdf.js",
    "app/statistiques-rgpd/page.js",
    "app/statistiques-activite/page.js",
  ];

  FILES_WITH_JSPDF.forEach((f) => {
    it(`${f} : script jsPDF avec SRI integrity`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      expect(src).toMatch(/cdn\.jsdelivr\.net\/npm\/jspdf/);
      // Doit avoir integrity sha384-...
      expect(src).toMatch(/integrity\s*=\s*["']sha384-/);
      // Doit avoir crossOrigin="anonymous" (requis pour SRI)
      expect(src).toMatch(/crossOrigin\s*=\s*["']anonymous["']/);
    });
  });

  it("LINT : aucun script CDN externe sans SRI", () => {
    const violations = [];
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(full);
        } else if (item.name.endsWith(".js")) {
          const src = fs.readFileSync(full, "utf-8");
          const fullNorm = full.replace(/\\/g, "/");
          if (fullNorm.includes("/changelog/versions-data")) continue;
          // Trouve s.src = "https://cdn..." (et non images CDN)
          const matches = src.matchAll(/\.src\s*=\s*["']https:\/\/(cdn\.[\w.-]+|unpkg\.com|cdnjs\.[\w.-]+)[^"']+\.(?:js|mjs)["']/g);
          for (const m of matches) {
            // Cherche integrity dans les 500 chars suivants
            const after = src.substring(m.index, m.index + 500);
            if (!after.includes("integrity")) {
              violations.push(`${fullNorm} @ "${m[0].slice(0, 60)}..."`);
            }
          }
        }
      }
    }
    scan(path.resolve(process.cwd(), "app"));
    scan(path.resolve(process.cwd(), "lib"));
    expect(violations, `Scripts CDN externes sans SRI : ${violations.join(", ")}`).toEqual([]);
  });
});

describe("0.57.37 - Sujet 6 : 2FA TOTP (Supabase MFA)", () => {
  describe("lib/mfa.js", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "lib/mfa.js"),
      "utf-8"
    );

    it("Exporte les 6 fonctions clés", () => {
      expect(src).toMatch(/export async function enrollTotp/);
      expect(src).toMatch(/export async function verifyTotpEnrollment/);
      expect(src).toMatch(/export async function listMfaFactors/);
      expect(src).toMatch(/export async function checkMfaRequired/);
      expect(src).toMatch(/export async function challengeAndVerifyTotp/);
      expect(src).toMatch(/export async function unenrollMfaFactor/);
    });

    it("enrollTotp utilise mfa.enroll Supabase", () => {
      expect(src).toMatch(/supabase\.auth\.mfa\.enroll/);
      expect(src).toMatch(/factorType:\s*["']totp["']/);
    });

    it("Validation du code : 6 chiffres exactement", () => {
      expect(src).toMatch(/\/\^\\d\{6\}\$\//);
    });

    it("checkMfaRequired teste aal2 (Authentication Assurance Level 2)", () => {
      expect(src).toMatch(/getAuthenticatorAssuranceLevel/);
      expect(src).toMatch(/aal2/);
    });
  });

  describe("app/components/MfaSetup.js", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/components/MfaSetup.js"),
      "utf-8"
    );

    it("Composant client", () => {
      expect(src).toMatch(/["']use client["']/);
    });

    it("Import lib/mfa", () => {
      expect(src).toMatch(/from\s+["'][^"']*lib\/mfa["']/);
    });

    it("3 états : idle / verifying / active", () => {
      expect(src).toMatch(/step === ["']idle["']/);
      expect(src).toMatch(/step === ["']verifying["']/);
      expect(src).toMatch(/step === ["']active["']/);
    });

    it("Affiche QR code via dangerouslySetInnerHTML (SVG inline trusted Supabase)", () => {
      expect(src).toMatch(/qrCodeSvg/);
    });

    it("Input numérique max 6 chiffres", () => {
      expect(src).toMatch(/maxLength=\{6\}/);
    });

    it("Confirmation avant désactivation 2FA", () => {
      expect(src).toMatch(/confirm\(/);
    });
  });
});

describe("0.57.37 - LINT anti-régression : security.txt présent", () => {
  it("Le fichier security.txt sera bien servi par Next.js (public/.well-known/)", () => {
    const p = path.resolve(process.cwd(), "public/.well-known/security.txt");
    expect(fs.existsSync(p)).toBe(true);
    const stat = fs.statSync(p);
    expect(stat.size).toBeGreaterThan(100);  // pas un fichier vide
  });
});
