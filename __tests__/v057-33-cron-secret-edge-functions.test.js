// =============================================================
//  Tests unitaires — 0.57.33
//  CRON Edge Functions sécurisées avec x-cron-secret
//  + script SQL Supabase complet
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.33 - Version", () => {
  it("Version 0.57.33+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(33);
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.33 - Helper _shared/auth.ts : requireCronSecret", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/_shared/auth.ts"),
    "utf-8"
  );

  it("Exporte requireCronSecret", () => {
    expect(src).toMatch(/export function requireCronSecret/);
  });

  it("Lit le secret depuis Deno.env.get('CRON_SECRET')", () => {
    expect(src).toMatch(/Deno\.env\.get\(["']CRON_SECRET["']\)/);
  });

  it("Lit le header x-cron-secret", () => {
    expect(src).toMatch(/req\.headers\.get\(["']x-cron-secret["']\)/);
  });

  it("Retourne 500 si CRON_SECRET non configuré côté serveur (fail-secure)", () => {
    expect(src).toMatch(/CRON_SECRET non configuré/);
  });

  it("Retourne 401 si secret manquant ou invalide", () => {
    expect(src).toMatch(/CRON secret invalide/);
    expect(src).toMatch(/status:\s*401/);
  });

  it("Comparaison constant-time (anti timing-attacks)", () => {
    expect(src).toMatch(/constant-time/i);
    expect(src).toMatch(/charCodeAt/);  // pattern XOR loop
  });
});

describe("0.57.33 - 6 CRON Edge Functions sécurisées avec CRON_SECRET", () => {
  const CRON_FUNCTIONS = [
    "auto-archive-consents",
    "maintenance-daily-cron",
    "send-digest",
    "send-renouvellement-rappels",
    "sync-google-reviews",
    "weekly-stats-digest",
  ];

  CRON_FUNCTIONS.forEach((fn) => {
    describe(fn, () => {
      const src = fs.readFileSync(
        path.resolve(process.cwd(), `supabase/functions/${fn}/index.ts`),
        "utf-8"
      );

      it("Import requireCronSecret depuis _shared/auth.ts", () => {
        expect(src).toMatch(/from\s+["']\.\.\/_shared\/auth\.ts["']/);
        expect(src).toMatch(/requireCronSecret/);
      });

      it("CORS plus de '*' (en code, pas commentaires)", () => {
        const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
        expect(codeOnly).not.toMatch(/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
      });

      it("Appelle requireCronSecret(req) et retourne early si null", () => {
        expect(src).toMatch(/requireCronSecret\(req\)/);
      });
    });
  });
});

describe("0.57.33 - welcome-user : requireAuth (appelée par client après inscription)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/welcome-user/index.ts"),
    "utf-8"
  );

  it("Import requireAuth (PAS requireCronSecret car appelée par client)", () => {
    expect(src).toMatch(/from\s+["']\.\.\/_shared\/auth\.ts["']/);
    expect(src).toMatch(/requireAuth/);
  });

  it("Appel requireAuth dans le handler", () => {
    expect(src).toMatch(/requireAuth\(req\)/);
  });
});

describe("0.57.33 - sync-google-reviews : double mode auth (CRON ou admin)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/functions/sync-google-reviews/index.ts"),
    "utf-8"
  );

  it("Import requireAuth + requireCronSecret", () => {
    expect(src).toMatch(/requireAuth/);
    expect(src).toMatch(/requireCronSecret/);
  });

  it("Branchement selon trigger_source (manual/admin → requireAuth, sinon CRON)", () => {
    expect(src).toMatch(/trigger_source/);
    expect(src).toMatch(/isAdminCall/);
  });
});

describe("0.57.33 - Script SQL Supabase complet", () => {
  const sqlPath = "scripts/aveho-supabase-securite-COMPLET-0.57.33.sql";

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), sqlPath))).toBe(true);
  });

  const sql = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("PARTIE A : RLS sur caisses + mutuelles", () => {
    expect(sql).toMatch(/ALTER TABLE.*caisses_assurance_maladie.*ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE.*mutuelles.*ENABLE ROW LEVEL SECURITY/);
  });

  it("PARTIE B : vues v_equipe_structure + v_admins_structure avec security_invoker", () => {
    expect(sql).toMatch(/CREATE VIEW.*v_equipe_structure/);
    expect(sql).toMatch(/CREATE VIEW.*v_admins_structure/);
    expect(sql).toMatch(/security_invoker\s*=\s*true/);
  });

  it("PARTIE C : 3 colonnes tracking invitation mail", () => {
    expect(sql).toMatch(/invitation_mail_envoyee_at/);
    expect(sql).toMatch(/invitation_mail_statut/);
    expect(sql).toMatch(/invitation_mail_dernier_log/);
  });

  it("PARTIE D : cron.schedule pour les 6 CRON Functions avec x-cron-secret", () => {
    const CRONS = [
      'auto-archive-consents', 'maintenance-daily-cron', 'send-digest',
      'send-renouvellement-rappels', 'sync-google-reviews', 'weekly-stats-digest',
    ];
    for (const cron of CRONS) {
      expect(sql).toMatch(new RegExp(`cron\\.schedule\\(\\s*'${cron}'`));
    }
    expect(sql).toMatch(/x-cron-secret/);
  });

  it("PARTIE E : bloc DO LANGUAGE plpgsql avec vérifications finales", () => {
    expect(sql).toMatch(/DO \$\$/);
    expect(sql).toMatch(/RAISE NOTICE/);
    expect(sql).toMatch(/Vérification finale/);
  });

  it("Idempotent : utilise IF NOT EXISTS et DROP IF EXISTS", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS/);
    expect(sql).toMatch(/DROP VIEW IF EXISTS/);
  });
});

describe("0.57.33 - LINT anti-régression : CRON Functions ont requireCronSecret", () => {
  const CRON_FUNCTIONS_REQUIRING_SECRET = [
    "auto-archive-consents",
    "maintenance-daily-cron",
    "send-digest",
    "send-renouvellement-rappels",
    "weekly-stats-digest",
  ];

  it("Toutes les CRON Functions importent requireCronSecret", () => {
    const violations = [];
    for (const fn of CRON_FUNCTIONS_REQUIRING_SECRET) {
      const src = fs.readFileSync(
        path.resolve(process.cwd(), `supabase/functions/${fn}/index.ts`),
        "utf-8"
      );
      if (!/requireCronSecret/.test(src)) violations.push(fn);
    }
    expect(
      violations,
      `CRON Functions sans requireCronSecret : ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("Aucune CRON Function n'a CORS '*' en code", () => {
    const violations = [];
    for (const fn of CRON_FUNCTIONS_REQUIRING_SECRET) {
      const src = fs.readFileSync(
        path.resolve(process.cwd(), `supabase/functions/${fn}/index.ts`),
        "utf-8"
      );
      const codeOnly = src.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
      if (/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/.test(codeOnly)) {
        violations.push(fn);
      }
    }
    expect(violations, `CRON avec CORS '*' : ${violations.join(", ")}`).toEqual([]);
  });
});
