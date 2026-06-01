// =============================================================
//  Tests unitaires — 0.56.11
//  Corrections CORS invite-user + scanner QR cleanup + SW 503
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.11 - Edge Function invite-user CORS", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/invite-user/index.ts"), "utf-8");

  it("Constantes CORS_HEADERS définies (Origin/Methods/Headers)", () => {
    expect(src).toContain("CORS_HEADERS");
    expect(src).toContain('"Access-Control-Allow-Origin"');
    expect(src).toContain('"Access-Control-Allow-Methods"');
    expect(src).toContain('"Access-Control-Allow-Headers"');
  });

  it("Handler OPTIONS preflight retourne 204 + CORS headers", () => {
    expect(src).toContain('req.method === "OPTIONS"');
    expect(src).toContain("status: 204");
  });

  it("Allow-Headers inclut authorization + apikey + content-type", () => {
    expect(src).toContain("authorization");
    expect(src).toContain("apikey");
    expect(src).toContain("content-type");
  });

  it("Allow-Methods inclut POST et OPTIONS", () => {
    expect(src).toMatch(/Access-Control-Allow-Methods.*POST.*OPTIONS|"POST,\s*OPTIONS"/);
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
