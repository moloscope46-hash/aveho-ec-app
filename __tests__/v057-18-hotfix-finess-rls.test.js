// =============================================================
//  Tests unitaires — 0.57.18
//  HOTFIX bis : FinessSearch.js utilisait fetch(url) avec url variable
//  (pattern non détecté par le LINT 0.57.16). LINT amélioré pour catch
//  ce pattern. + Script SQL audit RLS Supabase livré.
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.18 - Version + scripts", () => {
  it("Version 0.57.18+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    expect(patch).toBeGreaterThanOrEqual(18);
  });
});

describe("0.57.18 - Hotfix FinessSearch.js : fetch → fetchWithAuth", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/FinessSearch.js"),
    "utf-8"
  );

  it("FinessSearch.js importe fetchWithAuth", () => {
    expect(src).toMatch(/import\s*\{[^}]*fetchWithAuth[^}]*\}\s*from/);
  });

  it("FinessSearch.js utilise fetchWithAuth(url) au lieu de fetch(url)", () => {
    expect(src).toMatch(/await fetchWithAuth\(url\)/);
  });

  it("FinessSearch.js plus aucun fetch(url) direct", () => {
    // Vérifier qu'aucun "await fetch(url)" tout court (sans WithAuth) ne reste
    const matches = src.match(/(?<!fetchWithAuth)\bawait\s+fetch\(url\)/g);
    expect(matches).toBeNull();
  });

  it("Marqueur 0.57.18 présent dans le commentaire de fix", () => {
    expect(src).toMatch(/0\.57\.18/);
  });
});

describe("0.57.18 - LINT amélioré : détecte aussi le pattern variable url", () => {
  const lintSrc = fs.readFileSync(
    path.resolve(process.cwd(), "__tests__/v057-16-hotfix-fetchwithauth.test.js"),
    "utf-8"
  );

  it("LINT contient PATTERN 1 (literal /api/...)", () => {
    expect(lintSrc).toMatch(/PATTERN 1/);
  });

  it("LINT contient PATTERN 2 (variable url)", () => {
    expect(lintSrc).toMatch(/PATTERN 2/);
    expect(lintSrc).toMatch(/0\.57\.18.*FinessSearch/);
  });

  it("LINT détecte 'await fetch(url)' + 'url = ../api/'", () => {
    // Test indirect : le regex urlAssign doit chercher "url = ... /api/"
    expect(lintSrc).toMatch(/urlAssign/);
    expect(lintSrc).toMatch(/let\|const\|var/);
  });
});

describe("0.57.18 - Script SQL audit RLS Supabase livré", () => {
  const sqlPath = "scripts/audit-rls-supabase.sql";

  it("Script audit RLS existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), sqlPath))).toBe(true);
  });

  const src = fs.readFileSync(path.resolve(process.cwd(), sqlPath), "utf-8");

  it("Audit partie 1 : tables sans RLS", () => {
    expect(src).toMatch(/rowsecurity\s*=\s*false/);
    expect(src).toMatch(/RLS DÉSACTIVÉ/);
  });

  it("Audit partie 2 : tables avec RLS mais 0 policy", () => {
    expect(src).toMatch(/0 policy/);
  });

  it("Audit partie 3 : views exposant auth.users", () => {
    expect(src).toMatch(/auth\.users/);
    expect(src).toMatch(/VIEW EXPOSE AUTH\.USERS/);
  });

  it("Audit partie 4 : SECURITY DEFINER (privilege escalation)", () => {
    expect(src).toMatch(/SECURITY DEFINER/);
    expect(src).toMatch(/prosecdef/);
  });

  it("Fix template 'isolation par structure' inclus", () => {
    expect(src).toMatch(/Isolation par structure/i);
    expect(src).toMatch(/membres_structure/);
    expect(src).toMatch(/auth\.uid\(\)/);
  });

  it("Fix template 'figer search_path SECURITY DEFINER' inclus", () => {
    expect(src).toMatch(/ALTER FUNCTION.*SET search_path/);
  });

  it("Fix template 'recréer view sans auth.users' inclus", () => {
    expect(src).toMatch(/security_invoker\s*=\s*true/);
  });

  it("Recommandation snapshot avant PARTIE 2", () => {
    expect(src).toMatch(/SNAPSHOT|BACKUP/i);
  });
});

describe("0.57.18 - Anti-régression : LINT pattern variable détecté", () => {
  // Vérifier que le LINT v2 détecterait FinessSearch.js cassé
  // (si on remettait le bug)

  // On simule le bug : crée temporairement un fichier avec le pattern variable
  // → run la fonction findDirectFetches → doit le détecter
  // (test indirect via présence du code v2 dans le LINT)

  it("Le LINT v2 contient la détection 'await fetch(url)' + assignation url", () => {
    const lintSrc = fs.readFileSync(
      path.resolve(process.cwd(), "__tests__/v057-16-hotfix-fetchwithauth.test.js"),
      "utf-8"
    );
    expect(lintSrc).toMatch(/await\\s\+fetch\\\(url\\\)/);
    expect(lintSrc).toMatch(/urlAssign/);
  });
});
