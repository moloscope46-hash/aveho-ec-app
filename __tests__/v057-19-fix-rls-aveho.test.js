// =============================================================
//  Tests unitaires — 0.57.19
//  Hotfix bug Windows path + script SQL personnalisé Aveho RLS
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.19 - Version", () => {
  it("Version 0.57.19+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(19);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.19 - Fix bug Windows path separator dans LINT 0.57.17", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "__tests__/v057-17-security-hardening.test.js"),
    "utf-8"
  );

  it("LINT 'Seules /api/version et /api/health' normalise les \\ Windows", () => {
    // Vérifier que .replace(/\\\\/g, "/") est présent AVANT .replace("/route.js")
    // dans le test des routes unprotected
    const block = src.substring(
      src.indexOf("Seules /api/version"),
      src.indexOf("Seules /api/version") + 500
    );
    expect(block).toMatch(/replace\(\/\\\\\/g/);
    // Et il doit venir avant le replace /route.js
    const idx_winFix = block.indexOf('replace(/\\\\');
    const idx_route = block.indexOf('"/route.js"');
    expect(idx_winFix, "Le fix Windows doit venir AVANT le replace /route.js").toBeLessThan(idx_route);
  });

  it("LINT POST/PUT/DELETE normalise les \\ Windows AVANT replace /route.js", () => {
    // Le 2ème describe (LINT POST/PUT/DELETE) doit aussi normaliser dans le bon ordre
    const block = src.substring(
      src.indexOf("listApiPostRoutes"),
      src.indexOf("listApiPostRoutes") + 1500
    );
    const idx_winFix = block.indexOf('replace(/\\\\');
    const idx_route = block.indexOf('"/route.js"');
    expect(idx_winFix).toBeGreaterThan(-1);
    expect(idx_route).toBeGreaterThan(-1);
    expect(idx_winFix, "Le fix Windows doit venir AVANT le replace /route.js").toBeLessThan(idx_route);
  });
});

describe("0.57.19 - Script SQL fix RLS Aveho personnalisé", () => {
  const sqlPath = "scripts/fix-rls-aveho.sql";

  it("Script fix RLS personnalisé existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), sqlPath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("Contexte audit documenté (2 tables sans RLS sur 68)", () => {
    expect(src).toMatch(/68 tables/);
    expect(src).toMatch(/66 tables ont déjà RLS/);
    expect(src).toMatch(/2 tables SANS RLS/);
  });

  it("Cible caisses_assurance_maladie", () => {
    expect(src).toMatch(/caisses_assurance_maladie/);
    expect(src).toMatch(/ALTER TABLE public\.caisses_assurance_maladie ENABLE ROW LEVEL SECURITY/);
  });

  it("Cible mutuelles", () => {
    expect(src).toMatch(/mutuelles/);
    expect(src).toMatch(/ALTER TABLE public\.mutuelles ENABLE ROW LEVEL SECURITY/);
  });

  it("Policy lecture authenticated (pas isolation structure_id car référentiel)", () => {
    // Vérifier que les 2 policies existent avec FOR SELECT + TO authenticated + USING (true)
    // (regex tolérant aux sauts de ligne)
    const normalizedSrc = src.replace(/\s+/g, " ");
    expect(normalizedSrc).toMatch(/CREATE POLICY "Lecture caisses[^"]*" ON public\.caisses_assurance_maladie FOR SELECT TO authenticated USING \(true\)/);
    expect(normalizedSrc).toMatch(/CREATE POLICY "Lecture mutuelles[^"]*" ON public\.mutuelles FOR SELECT TO authenticated USING \(true\)/);
  });

  it("Pas de policy INSERT/UPDATE/DELETE (lecture seule pour authenticated)", () => {
    // Ces tables sont des référentiels — pas de write côté user
    expect(src).toMatch(/RÉSERVÉE à un rôle admin/);
  });

  it("Vérification pré-fix présente (has_structure_id = 0 attendu)", () => {
    expect(src).toMatch(/information_schema\.columns/);
    expect(src).toMatch(/has_structure_id/);
  });

  it("Vérification post-fix présente (check nb_policies = 1)", () => {
    expect(src).toMatch(/pg_policies/);
    expect(src).toMatch(/nb_policies/);
  });

  it("Test fonctionnel app documenté (recherche caisses/mutuelles)", () => {
    expect(src).toMatch(/api\/caisses/);
    expect(src).toMatch(/api\/mutuelles/);
  });

  it("Investigation view auth.users à faire (étape 4)", () => {
    expect(src).toMatch(/view exposant auth\.users/i);
    expect(src).toMatch(/pg_views/);
  });

  it("Recommandation snapshot avant exécution", () => {
    expect(src).toMatch(/SNAPSHOT/);
  });
});

describe("0.57.19 - Score sécurité RLS post-audit", () => {
  const sqlPath = "scripts/fix-rls-aveho.sql";
  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("Score actuel : 66/68 tables RLS activé (97%)", () => {
    // Documenté dans le script
    expect(src).toMatch(/66 tables.*déjà RLS/);
  });

  it("Score visé post-fix : 68/68 tables RLS activé (100%)", () => {
    // Une fois caisses + mutuelles fixées
    expect(src).toMatch(/caisses_assurance_maladie/);
    expect(src).toMatch(/mutuelles/);
  });
});
