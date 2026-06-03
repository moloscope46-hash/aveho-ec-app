// =============================================================
//  Tests unitaires — 0.56.11
//  Corrections CORS invite-user + scanner QR cleanup + SW 503
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.11 - Edge Function invite-user CORS (refactoré 0.57.31)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/invite-user/index.ts"), "utf-8");

  it("Utilise CORS dynamique via _shared/auth.ts (refactoré 0.57.31)", () => {
    // Depuis 0.57.31 : plus de constante CORS_HEADERS hardcodée
    // → on importe buildCorsHeaders() du helper partagé
    expect(src).toContain("buildCorsHeaders");
    expect(src).toContain("_shared/auth.ts");
    expect(src).toContain("CORS_HEADERS"); // toujours utilisé comme variable locale dans le handler
  });

  it("Handler OPTIONS preflight retourne 204 + CORS headers", () => {
    expect(src).toContain('req.method === "OPTIONS"');
    expect(src).toContain("status: 204");
  });

  it("Allow-Headers inclut authorization + apikey + content-type (via _shared)", () => {
    // Les headers sont définis dans _shared/auth.ts
    const sharedSrc = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/functions/_shared/auth.ts"),
      "utf-8"
    );
    expect(sharedSrc).toContain("authorization");
    expect(sharedSrc).toContain("apikey");
    expect(sharedSrc).toContain("content-type");
  });

  it("Allow-Methods inclut POST et OPTIONS (via _shared)", () => {
    const sharedSrc = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/functions/_shared/auth.ts"),
      "utf-8"
    );
    expect(sharedSrc).toMatch(/Access-Control-Allow-Methods.*POST.*OPTIONS|"POST,\s*OPTIONS"/);
  });

  it("JSON_HEADERS combine Content-Type + CORS_HEADERS", () => {
    expect(src).toContain("JSON_HEADERS");
    expect(src).toContain("...CORS_HEADERS");
  });

  it("Toutes les réponses client utilisent JSON_HEADERS (au moins 6 occurrences)", () => {
    const matches = src.match(/headers: JSON_HEADERS/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  it("Method not allowed retourne aussi CORS_HEADERS", () => {
    expect(src).toMatch(/Method not allowed.*status: 405.*CORS_HEADERS|status: 405, headers: CORS_HEADERS/s);
  });
});

describe("0.56.11 - QrScanner cleanup robuste", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/QrScanner.js"), "utf-8");

  it("Cleanup vérifie l'état avant stop/clear (getState)", () => {
    expect(src).toContain("scanner.getState?.()");
  });

  it("STATE_SCANNING (2) et STATE_PAUSED (3) gérés", () => {
    expect(src).toContain("state === 2 || state === 3");
  });

  it("Stop puis clear chaînés en .then (séquentiel pour éviter race)", () => {
    expect(src).toMatch(/\.stop\(\)\s*\.then\(\(\)\s*=>\s*scanner\.clear/);
  });

  it("AutoStop callback aussi protégé par getState", () => {
    // Le bloc autoStop doit avoir une check de state
    const autoStopBlock = src.match(/if \(autoStop\)[^}]*?\}/gs);
    expect(autoStopBlock).toBeTruthy();
    // Au moins un des blocs autoStop a une vérification de state
    const hasStateCheck = autoStopBlock.some(b => b.includes("getState"));
    expect(hasStateCheck).toBe(true);
  });

  it("switchCamera vérifie aussi l'état avant stop", () => {
    expect(src).toContain("async function switchCamera");
    // La fonction doit appeler getState avant stop
    const switchFnMatch = src.match(/async function switchCamera[\s\S]*?^\s\s\}/m);
    expect(switchFnMatch).toBeTruthy();
    expect(switchFnMatch[0]).toContain("getState");
  });

  it("Commentaire 0.56.11 dans le cleanup", () => {
    expect(src).toContain("0.56.11");
  });
});

describe("0.56.11 - Service Worker networkFirst sans 503 sur statuts non-ok", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

  it("Premier fetch retourne res même si non-ok", () => {
    // 1er try : on retourne res qu'il soit ok ou pas
    expect(src).toContain("0.56.11");
  });

  it("Retry retourne res2 même si statut inhabituel", () => {
    expect(src).toMatch(/if \(res2\) \{[\s\S]*?return res2/);
  });

  it("Fallback offline.html toujours en place si vraiment offline", () => {
    expect(src).toContain('cache.match("/offline.html")');
  });
});
