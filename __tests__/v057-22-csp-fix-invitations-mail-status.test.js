// =============================================================
//  Tests unitaires — 0.57.22
//  Fix warning CSP 'upgrade-insecure-requests' en report-only
//  + Tracking statut d'envoi mail dans la table invitations
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.22 - Version", () => {
  it("Version 0.57.22+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(22);
  });
});

describe("0.57.22 - Fix warning CSP upgrade-insecure-requests en report-only", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  it("'upgrade-insecure-requests' retirée du tableau CSP_DIRECTIVES actif", () => {
    // Pas en début de ligne (= pas une entrée active du tableau)
    const activeMatch = /^\s*"upgrade-insecure-requests"/m.test(src);
    expect(activeMatch).toBe(false);
  });

  it("Justification documentée dans le commentaire (warning report-only)", () => {
    expect(src).toMatch(/ignorée en mode report-only/);
    expect(src).toMatch(/HSTS/);
  });

  it("0.57.22 commentaire présent (ou évolué en 0.57.24+ avec report-uri)", () => {
    // 0.57.22 : commentaire "À réintroduire si on bascule en enforcing"
    // 0.57.24 : commentaire évolué pour mentionner report-uri /api/csp-report
    const has057_22 = /réintroduire.*enforcing|enforcing.*réintroduire/i.test(src);
    const has057_24 = /report-uri.*\/api\/csp-report/i.test(src);
    expect(has057_22 || has057_24, "Doc 0.57.22 ou 0.57.24 doit être présente").toBe(true);
  });
});

describe("0.57.22 - SQL patch invitations.mail_*", () => {
  const sqlPath = "supabase/aveho-PATCH-vers-0.57.22.sql";

  it("Patch SQL existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), sqlPath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("ADD COLUMN mail_envoye_at TIMESTAMPTZ NULL", () => {
    expect(src).toMatch(/ADD COLUMN IF NOT EXISTS mail_envoye_at TIMESTAMPTZ NULL/);
  });

  it("ADD COLUMN mail_erreur TEXT NULL", () => {
    expect(src).toMatch(/ADD COLUMN IF NOT EXISTS mail_erreur TEXT NULL/);
  });

  it("ADD COLUMN mail_tentatives INTEGER DEFAULT 0", () => {
    expect(src).toMatch(/ADD COLUMN IF NOT EXISTS mail_tentatives INTEGER DEFAULT 0/);
  });

  it("Patch idempotent (IF NOT EXISTS partout)", () => {
    const adds = src.match(/ADD COLUMN/g) || [];
    const ifNotExists = src.match(/IF NOT EXISTS/g) || [];
    expect(ifNotExists.length).toBeGreaterThanOrEqual(adds.length);
  });

  it("Index sur mail_erreur (perf requête échecs)", () => {
    expect(src).toMatch(/CREATE INDEX IF NOT EXISTS idx_invitations_mail_erreur/);
    expect(src).toMatch(/WHERE mail_erreur IS NOT NULL/);
  });

  it("Backfill optionnel pour les invitations anciennes", () => {
    expect(src).toMatch(/UPDATE public\.invitations/);
    expect(src).toMatch(/mail_tentatives = 1/);
  });

  it("COMMENT ON COLUMN pour documentation", () => {
    const comments = src.match(/COMMENT ON COLUMN/g) || [];
    expect(comments.length).toBeGreaterThanOrEqual(3);
  });

  it("Vérification post-migration via information_schema", () => {
    expect(src).toMatch(/information_schema\.columns/);
  });

  it("Bloc ROLLBACK (commenté) inclus", () => {
    expect(src).toMatch(/ROLLBACK/);
    expect(src).toMatch(/DROP COLUMN IF EXISTS mail_envoye_at/);
  });
});

describe("0.57.22 - Code app/utilisateurs/page.js persiste le statut mail", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/utilisateurs/page.js"),
    "utf-8"
  );

  it("Update invitations.mail_envoye_at après envoi initial", () => {
    expect(src).toMatch(/mail_envoye_at:\s*mailWarning\s*\?\s*null\s*:\s*new Date\(\)\.toISOString\(\)/);
  });

  it("Update invitations.mail_erreur après envoi initial", () => {
    expect(src).toMatch(/mail_erreur:\s*mailWarning\s*\|\|\s*null/);
  });

  it("Update mail_tentatives sur renvoi (+1)", () => {
    expect(src).toMatch(/mail_tentatives:\s*\(i\.mail_tentatives\s*\|\|\s*0\)\s*\+\s*1/);
  });

  it("Try/catch silencieux si patch SQL pas appliqué", () => {
    // L'app doit continuer de marcher même si SQL patch pas joué
    expect(src).toMatch(/SQL patch 0\.57\.22 non appliqué/);
  });

  it("Affichage colonne 'Mail' dans le tableau invitations", () => {
    expect(src).toMatch(/<th>Mail<\/th>/);
  });

  it("Affichage statut 'Envoyé' (succès) avec icône ti-mail-check", () => {
    expect(src).toMatch(/ti ti-mail-check/);
    expect(src).toMatch(/Envoyé/);
  });

  it("Affichage statut 'Échec' avec icône ti-mail-x + tooltip détaillé", () => {
    expect(src).toMatch(/ti ti-mail-x/);
    expect(src).toMatch(/Échec/);
    // Le title doit montrer le détail de l'erreur
    expect(src).toMatch(/Échec\s*:\s*\$\{i\.mail_erreur\}/);
  });

  it("Affichage statut 'Inconnu' (avant 0.57.22) avec icône ti-mail-question", () => {
    expect(src).toMatch(/ti ti-mail-question/);
  });

  it("loadAll() rechargé après renvoi pour refresh statut", () => {
    // 2 nouveaux loadAll() ajoutés dans relancerInvitation
    const matches = src.match(/await loadAll\(\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("0.57.22 - Score sécurité headers maintenu 10/10", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "next.config.js"), "utf-8");

  // Tous les autres headers de 0.57.17 doivent être préservés
  const REQUIRED_HEADERS = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Strict-Transport-Security",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "Content-Security-Policy-Report-Only",
    "X-Aveho-Security-Audit",
  ];

  REQUIRED_HEADERS.forEach((h) => {
    it(`Header ${h} toujours présent`, () => {
      expect(src).toMatch(new RegExp(h.replace(/-/g, "-")));
    });
  });

  it("poweredByHeader: false maintenu", () => {
    expect(src).toMatch(/poweredByHeader:\s*false/);
  });
});
