// =============================================================
//  Tests unitaires — 0.55.51
//  Fix SIRENE 502 + pages stub QR/Code-barre + OCR générique
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.51 - Fix API SIRENE robustesse", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/sirene/route.js"), "utf-8");

  it("maxDuration 30s pour Vercel", () => {
    expect(src).toContain("maxDuration = 30");
  });

  it("dynamic force-dynamic", () => {
    expect(src).toContain('dynamic = "force-dynamic"');
  });

  it("AbortController timeout 25s interne", () => {
    expect(src).toContain("AbortController");
    expect(src).toContain("25000");
  });

  it("Plus de 502 — retourne 200 avec ok:false", () => {
    // Le code retourne TOUJOURS status 200, jamais 502
    expect(src).not.toContain("status: 502");
    expect(src).toContain("ok: false");
  });

  it("Format unifié { ok, count, results }", () => {
    expect(src).toContain("ok: true");
    expect(src).toContain("count: results.length");
  });

  it("Limite max remontée à 50 (était 20)", () => {
    expect(src).toContain('"limit") || 10), 50');
  });

  it("Message timeout explicite", () => {
    expect(src).toContain("Timeout SIRENE");
    expect(src).toContain("trop lourde");
  });

  it("User-Agent identifié", () => {
    expect(src).toContain("Aveho-EC/0.55");
  });

  it("Support param commune en plus de code_postal", () => {
    expect(src).toContain("nom_commune");
  });

  it("Duration_ms toujours retourné", () => {
    expect(src).toContain("duration_ms");
  });
});

describe("0.55.51 - Fix API FINESS robustesse", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/finess/route.js"), "utf-8");

  it("maxDuration 30s ajoutée", () => {
    expect(src).toContain("maxDuration = 30");
  });

  it("dynamic force-dynamic", () => {
    expect(src).toContain('dynamic = "force-dynamic"');
  });
});

describe("0.55.51 - Pages stub /scan/qr et /scan/codebarre", () => {
  it("Page /scan/qr existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/scan/qr/page.js"))).toBe(true);
  });

  it("Page /scan/codebarre existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/scan/codebarre/page.js"))).toBe(true);
  });

  it("QR : mentionne Vitale + RFID + matériel", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/qr/page.js"), "utf-8");
    expect(src).toContain("Vitale");
    expect(src).toContain("matériel");
  });

  it("Code-barre : mentionne GS1/UDI + LPP + EAN-13", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/codebarre/page.js"), "utf-8");
    expect(src).toContain("GS1");
    expect(src).toContain("LPP");
    expect(src).toContain("EAN");
  });
});

describe("0.55.51 - Page /scan/ocr générique fonctionnelle", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/ocr/page.js"), "utf-8");

  it("Page existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/scan/ocr/page.js"))).toBe(true);
  });

  it("Upload + preview", () => {
    expect(src).toContain("handleFile");
    expect(src).toContain("filePreview");
  });

  it("Appelle /api/ocr/generic", () => {
    expect(src).toContain("/api/ocr/generic");
  });

  it("Textarea éditable + bouton copier", () => {
    expect(src).toContain("<textarea");
    expect(src).toContain("Copier");
    expect(src).toContain("navigator.clipboard.writeText");
  });

  it("Limite 8 Mo", () => {
    expect(src).toContain("8 * 1024 * 1024");
  });

  it("Capture caméra mobile", () => {
    expect(src).toContain('capture="environment"');
  });
});

describe("0.55.51 - Route /api/ocr/generic", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/ocr/generic/route.js"), "utf-8");

  it("Existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/ocr/generic/route.js"))).toBe(true);
  });

  it("Vérifie ANTHROPIC_API_KEY", () => {
    expect(src).toContain("process.env.ANTHROPIC_API_KEY");
  });

  it("Prompt OCR libre (pas de schéma JSON forcé)", () => {
    expect(src).toContain("Extrais TOUT le texte");
    expect(src).toContain("sans markdown");
  });

  it("maxDuration 60s + claude sonnet 4", () => {
    expect(src).toContain("maxDuration = 60");
    expect(src).toContain("claude-sonnet-4");
  });

  it("Retourne tokens IN/OUT pour audit", () => {
    expect(src).toContain("input_tokens");
    expect(src).toContain("output_tokens");
  });
});
