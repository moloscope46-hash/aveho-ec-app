// =============================================================
//  Tests unitaires — 0.56.20
//  Hardening sécurité : auth + rate limit sur OCR
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.20 - lib/apiAuth helper centralisé", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/apiAuth.js"), "utf-8");

  it("Export requireAuth", () => {
    expect(src).toContain("export async function requireAuth");
  });

  it("Lit le header Authorization Bearer", () => {
    expect(src).toContain('req.headers.get("authorization")');
    expect(src).toContain("Bearer");
  });

  it("Retourne 401 si pas de token", () => {
    expect(src).toContain("Non authentifié");
    expect(src).toContain("status: 401");
  });

  it("Retourne 401 si token invalide via supabase.auth.getUser", () => {
    expect(src).toContain("supabase.auth.getUser(token)");
    expect(src).toContain('"Token invalide ou expiré"');
  });

  it("Export checkRateLimit avec defaults 10/60s", () => {
    expect(src).toContain("export function checkRateLimit");
    expect(src).toContain("maxRequests = 10");
    expect(src).toContain("windowMs = 60_000");
  });

  it("Rate limit retourne 429 avec Retry-After header", () => {
    expect(src).toContain("status: 429");
    expect(src).toContain('"Retry-After"');
  });
});

describe("0.56.20 - Route /api/ocr/bulletin-situation protégée", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/ocr/bulletin-situation/route.js"), "utf-8");

  it("Import requireAuth + checkRateLimit", () => {
    expect(src).toContain('from "../../../../lib/apiAuth"');
    expect(src).toContain("requireAuth");
    expect(src).toContain("checkRateLimit");
  });

  it("requireAuth appelé EN PREMIER dans POST", () => {
    const idx = src.indexOf("export async function POST");
    const apiKeyIdx = src.indexOf("process.env.ANTHROPIC_API_KEY");
    const authIdx = src.indexOf("await requireAuth(req)");
    expect(idx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(idx);
    expect(authIdx).toBeLessThan(apiKeyIdx);
  });

  it("Rate limit 10 req/min/user appliqué", () => {
    expect(src).toContain("checkRateLimit(user.id");
    expect(src).toContain("maxRequests: 10");
  });
});

describe("0.56.20 - Route /api/ocr/prescription protégée", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/ocr/prescription/route.js"), "utf-8");

  it("Import + appel requireAuth", () => {
    expect(src).toContain("requireAuth");
    expect(src).toContain("checkRateLimit");
    expect(src).toContain("await requireAuth(req)");
  });
});

describe("0.56.20 - Route /api/ocr/generic protégée", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/ocr/generic/route.js"), "utf-8");

  it("Import + appel requireAuth", () => {
    expect(src).toContain("requireAuth");
    expect(src).toContain("await requireAuth(req)");
  });
});

describe("0.56.20 - Pages scan envoient Authorization Bearer", () => {
  it("/scan/bulletin-situation passe le token", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/bulletin-situation/page.js"), "utf-8");
    expect(src).toContain("supabase.auth.getSession()");
    expect(src).toContain("Authorization: `Bearer ${token}`");
  });

  it("/scan/prescription passe le token", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/prescription/page.js"), "utf-8");
    expect(src).toContain("supabase.auth.getSession()");
    expect(src).toContain("Authorization: `Bearer ${token}`");
  });

  it("/scan/ocr (generic) passe le token", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/ocr/page.js"), "utf-8");
    expect(src).toContain('import { createClient } from "../../../lib/supabase"');
    expect(src).toContain("supabase.auth.getSession()");
    expect(src).toContain("Authorization: `Bearer ${token}`");
  });
});

describe("0.56.20 - Mot de passe retiré des tests publics", () => {
  it("v055-12 n'utilise plus Molotof46", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v055-12-password-policy.test.js"), "utf-8");
    expect(src).not.toContain("Molotof46");
  });

  it("v055-26 n'utilise plus Molotof46", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "__tests__/v055-26-security.test.js"), "utf-8");
    expect(src).not.toContain("Molotof46");
  });
});

describe("0.56.20 - SQL patch sécurité", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "supabase/aveho-PATCH-vers-0.56.20.sql"), "utf-8");

  it("Boucle DO qui grant toutes les fonctions sans grant existant", () => {
    expect(src).toContain("has_function_privilege");
    expect(src).toContain("grant execute on function");
    expect(src).toContain("authenticated");
  });

  it("Boucle alter function set search_path sur SECURITY DEFINER vulnérables", () => {
    expect(src).toContain("set search_path = public, pg_temp");
    expect(src).toContain("prosecdef = true");
  });

  it("Vérification finale fonctions_sans_grant + definer_sans_search_path", () => {
    expect(src).toContain("fonctions_sans_grant");
    expect(src).toContain("definer_sans_search_path");
  });
});
