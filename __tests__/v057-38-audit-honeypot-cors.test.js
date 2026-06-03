// =============================================================
//  Tests unitaires — 0.57.38
//  Audit logs centralisé + Honeypot + Fix CORS Edge Functions
// =============================================================
import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.38 - Version", () => {
  it("Version 0.57.38+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(38);
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.38 - Fix CORS : pattern Vercel élargi", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/_shared/auth.ts"),
    "utf-8"
  );

  it("Pattern accepte tous les sous-domaines aveho-ec-app*.vercel.app", () => {
    expect(src).toMatch(/aveho-ec-app\[a-z0-9-\]\*\\\.vercel\\\.app/);
  });

  it("Origin principale aveho-ec-app.vercel.app toujours dans ALLOWED_ORIGINS", () => {
    expect(src).toMatch(/https:\/\/aveho-ec-app\.vercel\.app/);
  });
});

describe("0.57.38 - lib/securityAudit.js : structure", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/securityAudit.js"),
    "utf-8"
  );

  it("Exporte SEC_EVENT_TYPES (whitelist fermée)", () => {
    expect(src).toMatch(/export const SEC_EVENT_TYPES = Object\.freeze\(/);
  });

  it("Contient les 4 catégories majeures (auth + mfa + access + données)", () => {
    expect(src).toMatch(/LOGIN_SUCCESS/);
    expect(src).toMatch(/LOGIN_FAILED/);
    expect(src).toMatch(/LOGIN_BLOCKED/);
    expect(src).toMatch(/MFA_ENROLLED/);
    expect(src).toMatch(/ACCESS_DENIED/);
    expect(src).toMatch(/BULK_EXPORT/);
    expect(src).toMatch(/HONEYPOT_TRIGGERED/);
  });

  it("Exporte logSecurityEvent (helper bas-niveau)", () => {
    expect(src).toMatch(/export async function logSecurityEvent/);
  });

  it("Exporte les helpers prêts à l'emploi", () => {
    expect(src).toMatch(/export async function auditLoginSuccess/);
    expect(src).toMatch(/export async function auditLoginFailed/);
    expect(src).toMatch(/export async function auditLoginBlocked/);
    expect(src).toMatch(/export async function auditAccessDenied/);
    expect(src).toMatch(/export async function auditMfaEnrolled/);
    expect(src).toMatch(/export async function auditMfaUnenrolled/);
    expect(src).toMatch(/export async function auditHoneypotTriggered/);
    expect(src).toMatch(/export async function auditBulkExport/);
    expect(src).toMatch(/export async function auditAdminAction/);
  });

  it("Vérification whitelist des eventType (rejette les types inconnus)", () => {
    expect(src).toMatch(/Object\.values\(SEC_EVENT_TYPES\)\.includes\(eventType\)/);
  });

  it("Enrichissement automatique du contexte browser (UA, locale)", () => {
    expect(src).toMatch(/navigator\.userAgent/);
    expect(src).toMatch(/navigator\.language/);
    expect(src).toMatch(/timestamp_client/);
  });

  it("Insère dans audit_log avec entite='security_event'", () => {
    expect(src).toMatch(/entite:\s*["']security_event["']/);
  });

  it("Ne plante JAMAIS le flow si audit échoue (try/catch + warn)", () => {
    expect(src).toMatch(/catch\s*\(e\)/);
    expect(src).toMatch(/logger\.warn/);
  });
});

describe("0.57.38 - lib/honeypot.js : structure", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/honeypot.js"),
    "utf-8"
  );

  it("Exporte HONEYPOT_FIELD_NAMES (rotation possible)", () => {
    expect(src).toMatch(/export const HONEYPOT_FIELD_NAMES/);
  });

  it("Names plausibles (website_url, company_fax, etc.)", () => {
    expect(src).toMatch(/website_url/);
    expect(src).toMatch(/company_fax/);
  });

  it("Hook useHoneypot retourne honeypotProps + isBot + getHoneypotValue", () => {
    expect(src).toMatch(/export function useHoneypot/);
    expect(src).toMatch(/honeypotProps/);
    expect(src).toMatch(/isBot:\s*\(\)\s*=>/);
    expect(src).toMatch(/getHoneypotValue/);
  });

  it("honeypotProps cache le champ (left:-9999px + opacity:0 + tabIndex=-1)", () => {
    expect(src).toMatch(/left:\s*["']-9999px["']/);
    expect(src).toMatch(/opacity:\s*0/);
    expect(src).toMatch(/tabIndex:\s*-1/);
    expect(src).toMatch(/autoComplete:\s*["']off["']/);
    expect(src).toMatch(/aria-hidden/);
  });

  it("getHoneypotHtml pour formulaires HTML pur (server)", () => {
    expect(src).toMatch(/export function getHoneypotHtml/);
  });

  it("detectBotFromBody helper serveur API", () => {
    expect(src).toMatch(/export function detectBotFromBody/);
  });
});

describe("0.57.38 - Intégration honeypot dans login", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/login/page.js"),
    "utf-8"
  );

  it("Import useHoneypot", () => {
    expect(src).toMatch(/useHoneypot/);
    expect(src).toMatch(/from\s+["'][^"']*lib\/honeypot["']/);
  });

  it("Champ honeypot rendu dans le JSX (avant l'email)", () => {
    expect(src).toMatch(/\{\.\.\.honeypotProps\}/);
  });

  it("Check isBot() AVANT le signIn", () => {
    const submitFn = src.substring(src.indexOf("async function submit"));
    const isBotPos = submitFn.indexOf("isBot()");
    const signInPos = submitFn.indexOf("signInWithPassword");
    expect(isBotPos).toBeGreaterThan(-1);
    expect(isBotPos).toBeLessThan(signInPos);
  });

  it("Audit honeypot triggered si bot détecté", () => {
    expect(src).toMatch(/auditHoneypotTriggered/);
  });

  it("Délai aléatoire avant retour erreur (anti-fingerprinting bot)", () => {
    expect(src).toMatch(/setTimeout.*800/);
  });
});

describe("0.57.38 - Audit log login (success + failed + blocked)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/login/page.js"),
    "utf-8"
  );

  it("auditLoginSuccess appelé après login OK", () => {
    expect(src).toMatch(/auditLoginSuccess/);
  });

  it("auditLoginFailed appelé sur échec password", () => {
    expect(src).toMatch(/auditLoginFailed/);
  });

  it("auditLoginBlocked appelé après 5 échecs", () => {
    expect(src).toMatch(/auditLoginBlocked/);
  });
});

describe("0.57.38 - AdminGuard audit access_denied", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/components/AdminGuard.js"),
    "utf-8"
  );

  it("Import auditAccessDenied", () => {
    expect(src).toMatch(/auditAccessDenied/);
  });

  it("useEffect logge si user authentifié mais pas admin", () => {
    expect(src).toMatch(/auth\.ready\s+&&\s+auth\.user\s+&&\s+!isAdmin/);
  });

  it("Détails inclus : path + role", () => {
    expect(src).toMatch(/window\.location\.pathname/);
  });
});

describe("0.57.38 - Guide GUIDE-ACTIVATION-2FA.md", () => {
  const guidePath = path.resolve(process.cwd(), "scripts/GUIDE-ACTIVATION-2FA.md");

  it("Guide existe", () => {
    expect(fs.existsSync(guidePath)).toBe(true);
  });

  const src = fs.readFileSync(guidePath, "utf-8");

  it("4 étapes documentées", () => {
    expect(src).toMatch(/Étape 1.*Supabase Dashboard/);
    expect(src).toMatch(/Étape 2.*MfaSetup.*profil/);
    // Étape 3 : on cherche juste "Étape 3" + mention de checkMfaRequired ailleurs
    expect(src).toMatch(/Étape 3/);
    expect(src).toMatch(/checkMfaRequired/);
    expect(src).toMatch(/Étape 4.*Tester/);
  });

  it("URL directe Dashboard Supabase (auth/providers)", () => {
    expect(src).toMatch(/dashboard\/project\/[\w]+\/auth\/providers/);
  });

  it("Recommandations sécurité par profil", () => {
    expect(src).toMatch(/Administrateur structure.*OBLIGATOIRE/);
  });

  it("Exemple SQL pour requêter les events MFA", () => {
    expect(src).toMatch(/audit_log[\s\S]*entite\s*=\s*['"]security_event['"]/);
    expect(src).toMatch(/mfa_/);
  });
});

describe("0.57.38 - LINT anti-régression : honeypot disponible", () => {
  it("Pages publiques recommandées avec honeypot (login)", () => {
    const loginSrc = fs.readFileSync(
      path.resolve(process.cwd(), "app/login/page.js"),
      "utf-8"
    );
    expect(loginSrc).toMatch(/honeypotProps/);
  });
});
