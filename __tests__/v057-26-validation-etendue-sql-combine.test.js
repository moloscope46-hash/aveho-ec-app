// =============================================================
//  Tests unitaires — 0.57.26
//  Validation étendue aux 8 routes API restantes + script SQL combiné
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.26 - Version", () => {
  it("Version 0.57.26+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(26);
  });
});

describe("0.57.26 - Validation étendue aux 8 routes restantes", () => {
  const VALIDATED_ROUTES = [
    "app/api/caisses/route.js",
    "app/api/mutuelles/route.js",
    "app/api/prescriptions/search/route.js",
    "app/api/prescriptions/export-csv/route.js",
    "app/api/prescriptions/verify-rpps/route.js",
    "app/api/google-reviews/sync/route.js",
    "app/api/ocr/bulletin-situation/route.js",
    "app/api/ocr/prescription/route.js",
  ];

  VALIDATED_ROUTES.forEach((route) => {
    describe(route, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), route), "utf-8");

      it("Import validateInput", () => {
        expect(src).toMatch(/validateInput/);
      });

      it("Appelle validate(body, ...)", () => {
        expect(src).toMatch(/validate\(body/);
      });

      it("Retourne 400 si validation échoue", () => {
        expect(src).toMatch(/errors\.length\s*>\s*0/);
        expect(src).toMatch(/status:\s*400/);
      });
    });
  });
});

describe("0.57.26 - Validations spécifiques par route", () => {
  it("caisses : nom + code_organisme required + email maxLen 254", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/caisses/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/nom:\s*\{[^}]*required:\s*true/);
    expect(src).toMatch(/code_organisme:\s*\{[^}]*required:\s*true/);
    expect(src).toMatch(/email:\s*\{[^}]*maxLen:\s*254/);
  });

  it("mutuelles : raison_sociale OU nom (conditional after validate)", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/mutuelles/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/!body\.raison_sociale\s*&&\s*!body\.nom/);
  });

  it("search : limit/offset bornés (anti-DoS scan)", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/prescriptions/search/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/limit:\s*\{[^}]*max:\s*500/);
    expect(src).toMatch(/offset:\s*\{[^}]*max:\s*1_?000_?000/);
  });

  it("verify-rpps : rpps required", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/prescriptions/verify-rpps/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/rpps:\s*\{[^}]*required:\s*true/);
  });

  it("OCR bulletin/prescription : image_base64 limité à 25 MB (anti-DoS upload)", () => {
    const ocrBulletin = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/ocr/bulletin-situation/route.js"),
      "utf-8"
    );
    const ocrPrescription = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/ocr/prescription/route.js"),
      "utf-8"
    );
    expect(ocrBulletin).toMatch(/image_base64[^}]*maxLen:\s*25_?000_?000/);
    expect(ocrPrescription).toMatch(/image_base64[^}]*maxLen:\s*25_?000_?000/);
  });

  it("google-reviews/sync : etablissement_id uuid optionnel", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/google-reviews/sync/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/etablissement_id:\s*\{\s*type:\s*["']uuid["']/);
  });

  it("export-csv : include_lignes boolean validé", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/api/prescriptions/export-csv/route.js"),
      "utf-8"
    );
    expect(src).toMatch(/include_lignes:\s*\{\s*type:\s*["']boolean["']/);
  });
});

describe("0.57.26 - Script SQL combiné Supabase", () => {
  const sqlPath = "scripts/aveho-supabase-securite-combine.sql";

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), sqlPath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("Documente les 3 parties (A, B, C)", () => {
    expect(src).toMatch(/PARTIE A.*RLS/);
    expect(src).toMatch(/PARTIE B.*[Vv]iews? auth\.users/);
    expect(src).toMatch(/PARTIE C.*[Tt]racking.*mail/);
  });

  it("Recommandation snapshot avant", () => {
    expect(src).toMatch(/[Ss]napshot/);
  });

  it("Idempotent (IF NOT EXISTS / DROP IF EXISTS)", () => {
    expect(src).toMatch(/IF NOT EXISTS/);
    expect(src).toMatch(/DROP.*IF EXISTS/);
  });

  it("PARTIE A : ENABLE ROW LEVEL SECURITY sur caisses + mutuelles", () => {
    expect(src).toMatch(/ALTER TABLE public\.caisses_assurance_maladie ENABLE ROW LEVEL SECURITY/);
    expect(src).toMatch(/ALTER TABLE public\.mutuelles ENABLE ROW LEVEL SECURITY/);
  });

  it("PARTIE A : CREATE POLICY SELECT TO authenticated", () => {
    expect(src).toMatch(/CREATE POLICY[\s\S]*caisses/);
    expect(src).toMatch(/CREATE POLICY[\s\S]*mutuelles/);
  });

  it("PARTIE B : DROP+CREATE views avec security_invoker=true", () => {
    const norm = src.replace(/\s+/g, " ");
    expect(norm).toMatch(/CREATE VIEW public\.v_users_emails\s+WITH \(security_invoker = true\)/);
    expect(norm).toMatch(/CREATE VIEW public\.v_users_complete\s+WITH \(security_invoker = true\)/);
  });

  it("PARTIE B : GRANT SELECT TO authenticated sur les views", () => {
    expect(src).toMatch(/GRANT SELECT ON public\.v_users_emails TO authenticated/);
    expect(src).toMatch(/GRANT SELECT ON public\.v_users_complete TO authenticated/);
  });

  it("PARTIE C : 3 ADD COLUMN sur invitations", () => {
    expect(src).toMatch(/ADD COLUMN IF NOT EXISTS mail_envoye_at TIMESTAMPTZ/);
    expect(src).toMatch(/ADD COLUMN IF NOT EXISTS mail_erreur TEXT/);
    expect(src).toMatch(/ADD COLUMN IF NOT EXISTS mail_tentatives INTEGER/);
  });

  it("PARTIE C : INDEX partiel sur mail_erreur", () => {
    expect(src).toMatch(/CREATE INDEX IF NOT EXISTS idx_invitations_mail_erreur/);
    expect(src).toMatch(/WHERE mail_erreur IS NOT NULL/);
  });

  it("Vérification finale globale (tableau de checks ✓ OK / ❌ FAIL)", () => {
    expect(src).toMatch(/VÉRIFICATION GLOBALE FINALE/);
    expect(src).toMatch(/check_name/);
  });
});

describe("0.57.26 - Score final : toutes les routes API POST validées", () => {
  function findRoutes(dir) {
    const routes = [];
    function walk(d) {
      for (const item of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, item.name);
        if (item.isDirectory()) walk(full);
        else if (item.name === "route.js") routes.push(full);
      }
    }
    walk(dir);
    return routes;
  }

  it("Toutes les routes POST/PUT qui parsent req.json() utilisent validate()", () => {
    const apiDir = path.join(process.cwd(), "app/api");
    const violations = [];

    for (const route of findRoutes(apiDir)) {
      const src = fs.readFileSync(route, "utf-8");
      const relPath = route.replace(/\\/g, "/").split("app/api/")[1] || route;

      // Skip routes publiques par design
      if (
        relPath.startsWith("version/") ||
        relPath.startsWith("health/") ||
        relPath.startsWith("csp-report/")
      ) continue;

      // Si la route fait await req.json(), elle DOIT utiliser validate()
      if (/await\s+req\.json\(\)/.test(src) && !/validate\(/.test(src)) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `Routes qui parsent req.json() sans validate() : ${violations.join(", ")}`
    ).toEqual([]);
  });
});
