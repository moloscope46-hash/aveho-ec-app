// =============================================================
//  Tests unitaires — 0.55.48
//  Diagnostic API RPPS (vérifier IP en production)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.48 - Endpoint /api/rpps/diagnostic", () => {
  const routeSrc = fs.readFileSync(
    path.resolve(process.cwd(), "app/api/rpps/diagnostic/route.js"),
    "utf-8"
  );

  it("Existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/rpps/diagnostic/route.js"))).toBe(true);
  });

  it("Teste 4 endpoints en parallèle (3 ANS + BAN)", () => {
    expect(routeSrc).toContain("Promise.all");
    expect(routeSrc).toContain("Practitioner?family=DUPONT");
    expect(routeSrc).toContain("PractitionerRole?location.address-city=Paris");
    expect(routeSrc).toContain("identifier=10000000001");
    expect(routeSrc).toContain("api-adresse.data.gouv.fr");
  });

  it("Récupère l'IP sortante via ipify", () => {
    expect(routeSrc).toContain("api.ipify.org");
  });

  it("Détecte environnement Vercel (env, region)", () => {
    expect(routeSrc).toContain("process.env.VERCEL");
    expect(routeSrc).toContain("process.env.VERCEL_ENV");
    expect(routeSrc).toContain("process.env.VERCEL_REGION");
  });

  it("Timeout 10s sur chaque test", () => {
    expect(routeSrc).toContain("10000");
    expect(routeSrc).toContain("AbortController");
  });

  it("Body tronqué à 800 chars pour la réponse JSON", () => {
    expect(routeSrc).toContain("text.slice(0, 800)");
  });

  it("Diagnostic summary BLACKLISTED si ≥2 retours 403", () => {
    expect(routeSrc).toContain("BLACKLISTED");
    expect(routeSrc).toContain("ansBlocked >= 2");
  });

  it("Diagnostic summary DOWN si 0 endpoint OK", () => {
    expect(routeSrc).toContain('"DOWN"');
  });

  it("Diagnostic summary PARTIAL si entre 1 et 2 OK", () => {
    expect(routeSrc).toContain('"PARTIAL"');
  });

  it("Query custom via param ?q=", () => {
    expect(routeSrc).toContain('searchParams.get("q")');
  });

  it("No-store cache pour avoir résultats frais", () => {
    expect(routeSrc).toContain('"Cache-Control": "no-store');
  });
});

describe("0.55.48 - Page /admin/rpps-diagnostic", () => {
  const pageSrc = fs.readFileSync(
    path.resolve(process.cwd(), "app/admin/rpps-diagnostic/page.js"),
    "utf-8"
  );

  it("Existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/admin/rpps-diagnostic/page.js"))).toBe(true);
  });

  it("Lance le diagnostic au mount", () => {
    expect(pageSrc).toContain("runDiagnostic");
    expect(pageSrc).toContain("useEffect");
  });

  it("Bouton relancer + champ query custom", () => {
    expect(pageSrc).toContain("Relancer le diagnostic");
    expect(pageSrc).toContain("customQuery");
  });

  it("Affiche IP sortante en évidence", () => {
    expect(pageSrc).toContain("IP sortante");
    expect(pageSrc).toContain("outgoing_ip");
  });

  it("Affiche région Vercel", () => {
    expect(pageSrc).toContain("vercel_region");
  });

  it("Cards par test (status, durée, body brut)", () => {
    expect(pageSrc).toContain("function TestCard");
    expect(pageSrc).toContain("body_raw");
  });

  it("Pédagogie : explique les codes HTTP", () => {
    expect(pageSrc).toContain("HTTP 403");
    expect(pageSrc).toContain("HTTP 200");
    expect(pageSrc).toContain("blacklistée");
  });

  it("3 options de solution si blacklist", () => {
    expect(pageSrc).toContain("cyber@esante.gouv.fr");
    expect(pageSrc).toContain("proxy/relay");
    expect(pageSrc).toContain("dump RPPS");
  });

  it("Couleur summary (vert/ambre/rouge)", () => {
    expect(pageSrc).toContain('summary.color === "green"');
    expect(pageSrc).toContain('summary.color === "amber"');
  });
});

describe("0.55.48 - Menu admin contient l'entrée diagnostic", () => {
  it("Diagnostic API RPPS dans le menu Administration", () => {
    const topbar = fs.readFileSync(
      path.resolve(process.cwd(), "app/TopBar.js"),
      "utf-8"
    );
    expect(topbar).toContain("/admin/rpps-diagnostic");
    expect(topbar).toContain("Diagnostic API RPPS");
  });
});
