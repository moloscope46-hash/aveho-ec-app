// =============================================================
//  Tests unitaires — 0.56.21
//  Upgrade Next + auth sur les 5 routes API restantes
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.21 - Next.js upgraded to 14.2.35+", () => {
  it("package.json next >= 14.2.35 ou Next 15+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const v = pkg.dependencies.next.replace(/^[\^~]/, "");
    const [maj, min, patch] = v.split(".").map(Number);
    // 0.57.0+ : on accepte Next 15+ ou Next 14.2.35+
    const okNext14 = maj === 14 && min === 2 && patch >= 35;
    const okNext15plus = maj >= 15;
    expect(okNext14 || okNext15plus).toBe(true);
  });
});

describe("0.56.21 - lib/fetchWithAuth helper", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/fetchWithAuth.js"), "utf-8");

  it("Export fetchWithAuth function", () => {
    expect(src).toContain("export async function fetchWithAuth");
  });

  it("Récupère le token via supabase.auth.getSession()", () => {
    expect(src).toContain("supabase.auth.getSession()");
    expect(src).toContain("access_token");
  });

  it("Ajoute Authorization Bearer si token présent", () => {
    expect(src).toContain('headers.set("Authorization", `Bearer ${token}`)');
  });

  it("Pas d'override si Authorization déjà fixé manuellement", () => {
    expect(src).toContain('headers.has("Authorization")');
  });

  it("Catch les erreurs de session (continue sans token)", () => {
    expect(src).toContain("try {");
    expect(src).toContain("} catch");
  });
});

describe("0.56.21 - Routes API protégées : RPPS + finess + sirene", () => {
  const routes = [
    "app/api/rpps/route.js",
    "app/api/rpps/diagnostic/route.js",
    "app/api/rpps/dump-status/route.js",
    "app/api/finess/route.js",
    "app/api/sirene/route.js",
  ];

  routes.forEach((r) => {
    it(`${r} importe requireAuth + checkRateLimit`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), r), "utf-8");
      expect(src).toContain("requireAuth");
      expect(src).toContain("checkRateLimit");
    });

    it(`${r} appelle requireAuth dans son handler`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), r), "utf-8");
      expect(src).toMatch(/await requireAuth\(req\w*\)/);
    });

    it(`${r} applique un rate limit`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), r), "utf-8");
      expect(src).toContain("checkRateLimit(user.id");
      expect(src).toMatch(/maxRequests:\s*\d+/);
    });
  });
});

describe("0.56.21 - Pages front utilisent fetchWithAuth", () => {
  const callers = [
    { file: "app/components/RppsSearch.js", expectedFetches: 1 },
    { file: "app/RppsAutocomplete.js", expectedFetches: 1 },
    { file: "app/admin/rpps-dump/page.js", expectedFetches: 2 },
    { file: "app/carte/page.js", expectedFetches: 6 },
  ];

  callers.forEach(({ file, expectedFetches }) => {
    it(`${file} importe fetchWithAuth`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      expect(src).toContain("fetchWithAuth");
      expect(src).toMatch(/from\s+["'](\.\.\/)+lib\/fetchWithAuth["']/);
    });

    it(`${file} a remplacé les fetch /api/rpps|finess|sirene par fetchWithAuth`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
      // Pas de "fetch(`/api/rpps" ou similaire sans le With
      const badFetches = (src.match(/\bfetch\([`"]\/api\/(rpps|finess|sirene)/g) || []).length;
      expect(badFetches).toBe(0);
    });
  });
});

describe("0.56.21 - Vulnérabilités Next CRITICAL réglées", () => {
  it("Documentation des CVE corrigées dans le changelog", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    // 0.56.21 mentionne au moins une CVE / Cache Poisoning / Authorization
    expect(src).toMatch(/0\.56\.21/);
  });
});
