// =============================================================
//  Tests unitaires — 0.55.52
//  Fix SW : chrome-extension scheme + safeCachePut
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.52 - Fix SW chrome-extension scheme", () => {
  const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

  it("Early return sur schémas non-http(s)", () => {
    expect(sw).toContain('!req.url.startsWith("http://")');
    expect(sw).toContain('!req.url.startsWith("https://")');
  });

  it("Helper safeCachePut existe", () => {
    expect(sw).toContain("async function safeCachePut");
  });

  it("safeCachePut filtre schémas non-http", () => {
    expect(sw).toContain('!url.startsWith("http://") && !url.startsWith("https://")');
  });

  it("safeCachePut ignore les responses opaques", () => {
    expect(sw).toContain('res.type === "opaque"');
  });

  it("safeCachePut silent fail (pas de console.error)", () => {
    expect(sw).toContain("Silent fail");
    // Le catch doit être vide (commenté), pas de console.error
    const match = sw.match(/async function safeCachePut[\s\S]*?\n\}/);
    expect(match).toBeTruthy();
    expect(match[0]).not.toContain("console.error");
  });

  it("cacheFirst utilise safeCachePut", () => {
    const match = sw.match(/async function cacheFirst[\s\S]*?\n\}/);
    expect(match).toBeTruthy();
    expect(match[0]).toContain("safeCachePut");
  });

  it("networkFirst utilise safeCachePut (et plus cache.put direct dans success path)", () => {
    const match = sw.match(/async function networkFirst[\s\S]*?\n\}/);
    expect(match).toBeTruthy();
    // Doit contenir au moins un appel safeCachePut
    expect(match[0]).toContain("safeCachePut");
  });

  it("staleWhileRevalidate utilise safeCachePut", () => {
    const match = sw.match(/async function staleWhileRevalidate[\s\S]*?\n\}/);
    expect(match).toBeTruthy();
    expect(match[0]).toContain("safeCachePut");
  });

  it("Commentaire explicatif chrome-extension dans SW", () => {
    expect(sw).toContain("chrome-extension");
    expect(sw).toContain("0.55.52");
  });
});
