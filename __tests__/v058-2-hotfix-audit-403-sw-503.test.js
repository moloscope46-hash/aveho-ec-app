// =============================================================
//  Tests unitaires — 0.58.2 HOTFIX
//
//  3 bugs prod signalés :
//   1. audit_log POST 403 (RLS rejette les insert anonymes)
//   2. /accueil 503 (SW fallback transitoire)
//   3. "Banner not shown" warning Chrome (inoffensif, voulu)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.2 - Version", () => {
  it("Version 0.58.2+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(2);
    }
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.2 - Fix audit_log 403 (skip insert si pas d'auth)", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/securityAudit.js"),
    "utf-8"
  );

  it("Skip insert si ctx.userId est falsy (évite 403 RLS)", () => {
    expect(src).toMatch(/if\s*\(\s*!ctx\?\.userId\s*\)/);
  });

  it("Commentaire explicite sur le fix 0.58.2", () => {
    expect(src).toMatch(/0\.58\.2.*Fix bug 403|Fix bug 403/);
  });

  it("Insert utilise ctx.userId direct (pas || null) quand userId existe", () => {
    // On a déjà vérifié userId ci-dessus, donc on peut faire user_id: ctx.userId
    expect(src).toMatch(/user_id:\s*ctx\.userId/);
  });

  it("Log seulement en localhost (analyse dev) pour éviter pollution prod", () => {
    expect(src).toMatch(/localhost/);
  });

  it("Capture l'erreur Supabase ({error}) pour log warn (pas crash)", () => {
    expect(src).toMatch(/const\s*\{\s*error\s*\}\s*=\s*await\s+supabase\.from\(/);
    expect(src).toMatch(/rejected/);
  });
});

describe("0.58.2 - Fix SW : plus jamais 503 sur pages HTML", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "public/sw.js"),
    "utf-8"
  );

  it("isHtmlReq élargi : navigate || document || Accept text/html", () => {
    expect(src).toMatch(/isHtmlReq/);
    expect(src).toMatch(/text\/html/);
    expect(src).toMatch(/req\.headers\.get\(["']accept["']\)/);
  });

  it("Plus de return Response 503 statusText Offline (qui pollue logs)", () => {
    // L'ancien message d'erreur 503 textuel est supprimé
    expect(src).not.toMatch(/Hors-ligne — aucune donnée en cache/);
  });

  it("Réponse 200 pour fallback HTML (au lieu de 503)", () => {
    const networkFirstBlock = src.substring(
      src.indexOf("async function networkFirst"),
      src.indexOf("async function staleWhileRevalidate")
    );
    expect(networkFirstBlock).toMatch(/status:\s*200/);
  });

  it("Response.error() pour les chunks JS (Next.js gère retry)", () => {
    const networkFirstBlock = src.substring(
      src.indexOf("async function networkFirst"),
      src.indexOf("async function staleWhileRevalidate")
    );
    expect(networkFirstBlock).toMatch(/Response\.error\(\)/);
  });
});

describe("0.58.2 - InstallBanner : warning Chrome documenté", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "app/InstallBanner.js"),
    "utf-8"
  );

  it("Commentaire explicite que le warning est voulu/inoffensif", () => {
    expect(src).toMatch(/Banner not shown.*warning|inoffensif|voulu|attendu/i);
  });

  it("preventDefault() bien présent (notre design custom)", () => {
    expect(src).toMatch(/e\.preventDefault\(\)/);
  });
});
