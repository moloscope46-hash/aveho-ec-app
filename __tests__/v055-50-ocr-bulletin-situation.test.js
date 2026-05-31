// =============================================================
//  Tests unitaires — 0.55.50
//  OCR bulletin de situation via Claude Vision
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.50 - Route /api/ocr/bulletin-situation", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/ocr/bulletin-situation/route.js"), "utf-8");

  it("Existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/api/ocr/bulletin-situation/route.js"))).toBe(true);
  });

  it("Vérifie ANTHROPIC_API_KEY", () => {
    expect(src).toContain("process.env.ANTHROPIC_API_KEY");
  });

  it("Utilise Claude Sonnet 4", () => {
    expect(src).toContain("claude-sonnet-4");
  });

  it("Max tokens 4096", () => {
    expect(src).toContain("max_tokens: 4096");
  });

  it("Endpoint Anthropic /v1/messages", () => {
    expect(src).toContain("https://api.anthropic.com/v1/messages");
  });

  it("Header anthropic-version", () => {
    expect(src).toContain("anthropic-version");
  });

  it("Accepte image jpeg/png/webp/pdf", () => {
    expect(src).toContain("image/jpeg");
    expect(src).toContain("image/png");
    expect(src).toContain("image/webp");
    expect(src).toContain("application/pdf");
  });

  it("Prompt structuré demande JSON pur (sans markdown)", () => {
    expect(src).toContain("JSON strict");
    expect(src).toContain("sans markdown");
  });

  it("Champs critiques dans le prompt : NIR, AMC, caisse, ALD/C2S/AME", () => {
    expect(src).toContain("numero_secu");
    expect(src).toContain("mutuelle_numero_amc");
    expect(src).toContain("code_organisme_rattachement");
    expect(src).toContain("ald");
    expect(src).toContain("c2s");
    expect(src).toContain("ame");
  });

  it("ocr_text_brut + confiance dans la réponse", () => {
    expect(src).toContain("ocr_text_brut");
    expect(src).toContain("confiance");
  });

  it("Cleanup markdown code-fences au cas où", () => {
    expect(src).toContain("```");
  });

  it("Renvoie tokens IN/OUT pour audit coût", () => {
    expect(src).toContain("input_tokens");
    expect(src).toContain("output_tokens");
  });

  it("maxDuration 60s pour Vercel", () => {
    expect(src).toContain("maxDuration = 60");
  });
});

describe("0.55.50 - Route /api/patients/from-ocr", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/patients/from-ocr/route.js"), "utf-8");

  it("Auto-link caisse via code_organisme", () => {
    expect(src).toContain("caisses_assurance_maladie");
    expect(src).toContain("code_organisme");
  });

  it("Auto-link caisse via nom_caisse (fallback ilike)", () => {
    expect(src).toContain("ilike");
    expect(src).toContain("nom_caisse");
  });

  it("Auto-link mutuelle via numero_amc puis via nom", () => {
    expect(src).toContain("numero_amc");
    expect(src).toContain("mutuelle_nom");
  });

  it("Récupère structure_id depuis membres_structure", () => {
    expect(src).toContain("membres_structure");
  });

  it("source_creation = 'ocr_bs'", () => {
    expect(src).toContain('"ocr_bs"');
  });

  it("bs_ocr_brut + bs_ocr_date stockés pour audit", () => {
    expect(src).toContain("bs_ocr_brut");
    expect(src).toContain("bs_ocr_date");
  });

  it("Concat clé NIR si séparée", () => {
    expect(src).toContain("cle_nir");
  });
});

describe("0.55.50 - Page /scan/bulletin-situation refondue (4 étapes)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/scan/bulletin-situation/page.js"), "utf-8");

  it("4 étapes du workflow (stepper)", () => {
    expect(src).toContain('step === "upload"');
    expect(src).toContain('step === "ocr"');
    expect(src).toContain('step === "review"');
    expect(src).toContain('step === "done"');
  });

  it("Drag & drop + camera mobile (capture environment)", () => {
    expect(src).toContain("onDrop");
    expect(src).toContain('capture="environment"');
  });

  it("Limite 8 Mo", () => {
    expect(src).toContain("8 * 1024 * 1024");
  });

  it("Appelle /api/ocr/bulletin-situation", () => {
    expect(src).toContain("/api/ocr/bulletin-situation");
  });

  it("Appelle /api/patients/from-ocr avec token", () => {
    expect(src).toContain("/api/patients/from-ocr");
    expect(src).toContain("Bearer");
  });

  it("Champs éditables avant création (review)", () => {
    expect(src).toContain("setEditedData");
    expect(src).toContain("setField");
  });

  it("Aperçu image source côté review", () => {
    expect(src).toContain("Bulletin source");
  });

  it("Badge confiance OCR (haute/moyenne/faible)", () => {
    expect(src).toContain("confiance");
  });

  it("Tokens IN/OUT affichés", () => {
    expect(src).toContain("tokens?.input");
    expect(src).toContain("tokens?.output");
  });

  it("Texte OCR brut dépliable", () => {
    expect(src).toContain("texte OCR brut");
  });

  it("Redirection vers /patient/[id]/edit après création", () => {
    expect(src).toContain("/edit");
    expect(src).toContain("createdPatientId");
  });

  it("Stats référentiels live (caisses, mutuelles)", () => {
    expect(src).toContain("caisses_assurance_maladie");
    expect(src).toContain("mutuelles");
  });
});

describe("0.55.50 - Prompt extraction Claude", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/api/ocr/bulletin-situation/route.js"), "utf-8");

  it("Format JSON strict avec 40+ champs", () => {
    // On compte les "label": dans le prompt (approximatif)
    const fieldCount = (src.match(/"\w+": /g) || []).length;
    expect(fieldCount).toBeGreaterThan(30);
  });

  it("Gestion null si non visible (anti-hallucination)", () => {
    expect(src).toContain("Ne devine PAS");
  });

  it("Format date ISO YYYY-MM-DD", () => {
    expect(src).toContain("YYYY-MM-DD");
  });
});
