// =============================================================
//  Tests unitaires — 0.56.19
//  Bouton </> sur changelog + popup CodeViewer
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.56.19 - CodeViewer composant", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/CodeViewer.js"), "utf-8");

  it("Composant exporté par défaut", () => {
    expect(src).toContain("export default function CodeViewer");
  });

  it("ESC ferme la popup", () => {
    expect(src).toContain('e.key === "Escape"');
    expect(src).toContain("window.addEventListener");
    expect(src).toContain("window.removeEventListener");
  });

  it("Onglets before/after si snippet.before présent", () => {
    expect(src).toContain("hasBefore");
    expect(src).toContain('setTab("before")');
    expect(src).toContain('setTab("after")');
  });

  it("Copie avec feedback Copié 1.8s", () => {
    expect(src).toContain("navigator.clipboard?.writeText");
    expect(src).toContain("setCopied(true)");
    expect(src).toContain("1800");
  });

  it("Lien GitHub construit depuis snippet.file", () => {
    expect(src).toContain("github.com/moloscope46-hash/aveho-ec-app/blob/main");
    expect(src).toContain("Voir sur GitHub");
  });

  it("Coloration syntaxique pour JS et SQL", () => {
    expect(src).toContain("function highlightCode");
    expect(src).toContain('lang === "sql"');
    expect(src).toContain("select");
    expect(src).toContain("function");
  });

  it("Badge langage coloré dans le header", () => {
    expect(src).toContain("function langColor");
    expect(src).toMatch(/js:\s*"#EF9F27"/);
    expect(src).toMatch(/sql:\s*"#7a6fb0"/);
  });

  it("Backdrop semi-transparent + blur", () => {
    expect(src).toContain("rgba(20,33,49,.7)");
    expect(src).toContain("backdropFilter");
  });
});

describe("0.56.19 - Intégration changelog page", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Import CodeViewer (statique ou dynamic depuis 0.57.6)", () => {
    // 0.57.6 : CodeViewer est maintenant en dynamic import pour économiser
    // sur le bundle initial. On accepte les deux patterns.
    const staticImport = src.includes('import CodeViewer from "./CodeViewer"');
    const dynamicImport = /const CodeViewer\s*=\s*dynamic\([\s\S]*?["']\.\/CodeViewer["']/.test(src);
    expect(staticImport || dynamicImport).toBe(true);
  });

  it("État codeSnippet pour gérer l'ouverture de la popup", () => {
    expect(src).toContain("const [codeSnippet, setCodeSnippet]");
  });

  it("Bouton </> conditionnel sur hasCode (c.code_snippet présent)", () => {
    expect(src).toContain("const hasCode = !!c.code_snippet");
    expect(src).toContain("{hasCode && (");
  });

  it("Le clic du bouton </> appelle stopPropagation pour ne pas ouvrir la note", () => {
    expect(src).toMatch(/onClick=\{\(e\)\s*=>\s*\{\s*e\.stopPropagation\(\)/);
  });

  it("CodeViewer monté à la fin du JSX si codeSnippet présent", () => {
    expect(src).toContain("<CodeViewer snippet={codeSnippet}");
    expect(src).toContain("onClose={() => setCodeSnippet(null)}");
  });
});

describe("0.56.19 - versions-data avec code_snippet", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");

  it("Version 0.56.19 présente avec entrée code_snippet", () => {
    expect(src).toContain('"v": "0.56.19"');
    expect(src).toContain('"code_snippet"');
  });

  it("0.56.18 enrichi avec code_snippet sur CoordonneesPanel", () => {
    expect(src).toMatch(/"v":\s*"0\.56\.18"[\s\S]*?CoordonneesPanel[\s\S]*?code_snippet/);
  });

  it("0.56.17 enrichi avec code_snippet sur hydration mounted state", () => {
    expect(src).toMatch(/"v":\s*"0\.56\.17"[\s\S]*?mounted[\s\S]*?code_snippet/);
  });
});
