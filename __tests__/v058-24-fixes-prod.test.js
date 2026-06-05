// =============================================================
//  Tests unitaires — 0.58.24 BUG FIXES PROD + WOW
//
//  1. Fix SW 504 → throw natif (moins de bruit console)
//  2. Fix audit_log 403 silent + SQL fix
//  3. EmptyState illustrations appliquées sur 6 pages
//  4. Toggle Mode Présentation dans /profil
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.24 - Version", () => {
  it("Version 0.58.24+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(24);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.24 - Fix SW 504 → throw natif", () => {
  const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

  it("Plus de retour explicite status: 504 (cacheFirst et networkFirst)", () => {
    // 0.58.24 remplace les Response 504 par des throw
    expect(sw).not.toMatch(/status:\s*504,\s*statusText:\s*["']Gateway Timeout["']/);
  });

  it("Mention explicite du fix dans les commentaires", () => {
    expect(sw).toMatch(/0\.58\.24.*throw|throw.*0\.58\.24/);
  });
});

describe("0.58.24 - Fix audit_log 403 silent", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/events.js"), "utf-8");

  it("Catch silent du 403 RLS avec warning console une seule fois", () => {
    expect(src).toMatch(/error\.code === ["']42501["']/);
    expect(src).toMatch(/window\._audit_log_warned_/);
  });

  it("Message diagnostic pointe vers SQL fix", () => {
    expect(src).toMatch(/SQL-FIX-audit_log-rls-0\.58\.24\.sql/);
  });

  it("Fichier SQL existe avec policy audit_log_insert_v2", () => {
    const sqlPath = path.resolve(process.cwd(), "scripts/SQL-FIX-audit_log-rls-0.58.24.sql");
    expect(fs.existsSync(sqlPath)).toBe(true);
    const sql = fs.readFileSync(sqlPath, "utf-8");
    expect(sql).toMatch(/CREATE POLICY "audit_log_insert_v2"/);
    expect(sql).toMatch(/user_id = auth\.uid\(\)/);
    expect(sql).toMatch(/EXISTS \([\s\S]*?membres_structures/);
  });
});

describe("0.58.24 - EmptyState illustrations sur 6 pages", () => {
  it("/patients : 2 illustrations (users + search)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/<EmptyState[\s\S]*?illustration=["']users["']/);
    expect(src).toMatch(/<EmptyState[\s\S]*?illustration=["']search["']/);
  });

  it("/interventions : illustration clipboard", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/<EmptyState[\s\S]*?illustration=["']clipboard["']/);
  });

  it("/achats : 2 illustrations (folder + search)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/achats/page.js"), "utf-8");
    expect(src).toMatch(/illustration=["']folder["']/);
    expect(src).toMatch(/illustration=["']search["']/);
  });

  it("/signalements : 2 illustrations (inbox + search)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/signalements/page.js"), "utf-8");
    expect(src).toMatch(/illustration=["']inbox["']/);
    expect(src).toMatch(/illustration=["']search["']/);
  });

  it("/maintenance : 2 illustrations (chart + search)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/maintenance/page.js"), "utf-8");
    expect(src).toMatch(/illustration=["']chart["']/);
    expect(src).toMatch(/illustration=["']search["']/);
  });

  it("/commandes : illustration folder", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/commandes/page.js"), "utf-8");
    expect(src).toMatch(/illustration=["']folder["']/);
  });
});

describe("0.58.24 - Toggle Mode Présentation dans /profil", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/profil/page.js"), "utf-8");

  it("Import isPresentationMode + togglePresentationMode", () => {
    expect(src).toMatch(/import\s*\{[^}]*isPresentationMode[^}]*togglePresentationMode[^}]*\}\s*from\s*["']\.\.\/\.\.\/lib\/presentationMode["']/);
  });

  it("Composant PresentationModeToggle défini", () => {
    expect(src).toMatch(/function PresentationModeToggle\(\)/);
  });

  it("État local + écoute event av-presentation-mode-change", () => {
    expect(src).toMatch(/const \[isOn, setIsOn\]/);
    expect(src).toMatch(/addEventListener\(["']av-presentation-mode-change["']/);
  });

  it("Bouton NeonButton variant amber/violet selon état", () => {
    expect(src).toMatch(/<NeonButton[\s\S]*?variant=\{isOn \? ["']amber["'] : ["']violet["']\}/);
  });

  it("Panel 'Mode présentation' dans /profil avec mention Ctrl+Shift+P", () => {
    expect(src).toMatch(/Mode présentation/);
    expect(src).toMatch(/Ctrl\+Shift\+P/);
  });
});
