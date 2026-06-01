// =============================================================
//  Tests unitaires — 0.56.17
//  Fix hydration mismatch FAB + consentements template_libelle
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.17 - FloatingActionBar hydration safe", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/FloatingActionBar.js"), "utf-8");

  it("Pas de <style jsx> qui cause hydration mismatch", () => {
    expect(src).not.toContain("<style jsx>");
  });

  it("État mounted pour éviter render avant hydration", () => {
    expect(src).toContain("const [mounted, setMounted]");
    expect(src).toContain("setMounted(true)");
    expect(src).toContain("!mounted");
  });

  it("Commentaire 0.56.17 explicite l'évitement #418/#423", () => {
    expect(src).toContain("0.56.17");
    expect(src).toMatch(/hydration|#418|#423/i);
  });
});

describe("0.56.17 - CSS FAB déplacé dans globals.css", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Animations fab-bubble-pop + fab-popup-slide définies globales", () => {
    expect(src).toContain("@keyframes fab-bubble-pop");
    expect(src).toContain("@keyframes fab-popup-slide");
    expect(src).toContain("@keyframes fab-fade-in");
  });

  it(".fab-bar avec safe-area-inset-bottom", () => {
    expect(src).toContain(".fab-bar");
    expect(src).toContain("safe-area-inset-bottom");
  });

  it("Media query mobile (640px et 768px)", () => {
    expect(src).toMatch(/@media \(max-width: 640px\)[\s\S]*\.fab-bar/);
    expect(src).toMatch(/@media \(max-width: 768px\)[\s\S]*\.fab-bar/);
  });
});

describe("0.56.17 - Fix consentements_rgpd template_libelle inexistant", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");

  it("Le select ne demande plus template_libelle (colonne inexistante)", () => {
    expect(src).not.toContain('select("id, date_signature, a_consenti, date_expiration, template_libelle")');
  });

  it("Garde les autres colonnes utiles", () => {
    expect(src).toContain('select("id, date_signature, a_consenti, date_expiration")');
  });
});
