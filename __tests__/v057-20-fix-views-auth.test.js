// =============================================================
//  Tests unitaires — 0.57.20
//  Fix views auth.users (v_users_emails + v_users_complete)
//  → ajout security_invoker = true + filtre par structure
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.20 - Version", () => {
  it("Version 0.57.20+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(20);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.20 - Script SQL fix views auth.users", () => {
  const sqlPath = "scripts/fix-views-auth-exposed.sql";

  it("Script fix views existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), sqlPath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("Documente les 2 views à fixer", () => {
    expect(src).toMatch(/v_users_emails/);
    expect(src).toMatch(/v_users_complete/);
  });

  it("Sauvegarde des definitions originales pour rollback", () => {
    // Bloc commentaire avec les CREATE VIEW originaux
    expect(src).toMatch(/ORIGINAL.*exposait/);
  });

  it("DROP VIEW IF EXISTS v_users_emails avant recreate", () => {
    expect(src).toMatch(/DROP VIEW IF EXISTS public\.v_users_emails/);
  });

  it("Recrée v_users_emails avec security_invoker = true", () => {
    const normalized = src.replace(/\s+/g, " ");
    expect(normalized).toMatch(/CREATE VIEW public\.v_users_emails\s+WITH \(security_invoker = true\)/);
  });

  it("v_users_emails filtre via auth.uid() + membres_structure", () => {
    expect(src).toMatch(/auth\.uid\(\)/);
    expect(src).toMatch(/membres_structure/);
    expect(src).toMatch(/structure_id IN/);
  });

  it("v_users_emails inclut l'utilisateur lui-même (lui + sa structure)", () => {
    // Le UNION pour inclure auth.uid() en plus de la structure
    expect(src).toMatch(/SELECT auth\.uid\(\)\s*UNION/);
  });

  it("DROP VIEW IF EXISTS v_users_complete avant recreate", () => {
    expect(src).toMatch(/DROP VIEW IF EXISTS public\.v_users_complete/);
  });

  it("Recrée v_users_complete avec security_invoker = true", () => {
    const normalized = src.replace(/\s+/g, " ");
    expect(normalized).toMatch(/CREATE VIEW public\.v_users_complete\s+WITH \(security_invoker = true\)/);
  });

  it("v_users_complete filtre WHERE structure_id IN (membres_structure caller)", () => {
    // Le filtre par structure du caller
    const block = src.substring(src.indexOf("v_users_complete"), src.length);
    expect(block).toMatch(/WHERE ms\.structure_id IN/);
    expect(block).toMatch(/WHERE user_id = auth\.uid\(\)/);
  });

  it("GRANT SELECT TO authenticated sur les 2 views", () => {
    expect(src).toMatch(/GRANT SELECT ON public\.v_users_emails TO authenticated/);
    expect(src).toMatch(/GRANT SELECT ON public\.v_users_complete TO authenticated/);
  });

  it("Vérification post-fix : check reloptions security_invoker", () => {
    expect(src).toMatch(/reloptions/);
    expect(src).toMatch(/pg_class/);
  });

  it("Bloc rollback d'urgence présent (commenté)", () => {
    expect(src).toMatch(/ROLLBACK D'URGENCE/);
    // Le rollback recrée la view sans security_invoker
    const rollbackBlock = src.substring(src.indexOf("ROLLBACK"), src.length);
    expect(rollbackBlock).toMatch(/CREATE VIEW public\.v_users_emails/);
  });

  it("Test fonctionnel documenté (page /signalements)", () => {
    expect(src).toMatch(/signalements/);
  });

  it("Recommandation snapshot Supabase", () => {
    expect(src).toMatch(/SNAPSHOT/);
  });
});

describe("0.57.20 - Usage de v_users_emails dans le code Aveho", () => {
  it("app/signalements/page.js utilise toujours v_users_emails (compatibilité préservée)", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/signalements/page.js"),
      "utf-8"
    );
    expect(src).toMatch(/v_users_emails/);
    expect(src).toMatch(/RLS-safe/);
  });

  it("Pas d'autre usage de v_users_emails non documenté", () => {
    // Compter les occurrences dans app/ (hors changelog versions-data)
    function walk(dir) {
      let count = 0;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        // 0.57.21 : normalise les \ Windows en / pour les .includes()
        const fullNorm = full.replace(/\\/g, "/");
        if (item.isDirectory()) {
          if (item.name === "node_modules" || item.name === ".next") continue;
          count += walk(full);
        } else if (item.name.endsWith(".js")) {
          if (fullNorm.includes("changelog/versions-data")) continue;
          if (fullNorm.includes("changelog/lib")) continue;
          const src = fs.readFileSync(full, "utf-8");
          if (src.includes("v_users_emails")) count++;
        }
      }
      return count;
    }
    const usages = walk(path.join(process.cwd(), "app"));
    expect(usages, "v_users_emails ne doit être utilisé qu'à 1 endroit (signalements)").toBe(1);
  });
});

describe("0.57.20 - Score sécurité RLS final attendu", () => {
  const sqlPath = "scripts/fix-views-auth-exposed.sql";
  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("Stratégie sécurité documentée (security_invoker + filtre structure)", () => {
    expect(src).toMatch(/security_invoker/);
    expect(src).toMatch(/filtre par structure/i);
  });

  it("Alerte Supabase 'auth_users_exposed' visée à disparaître", () => {
    expect(src).toMatch(/auth_users_exposed/);
  });
});
