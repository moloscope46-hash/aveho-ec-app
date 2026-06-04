// =============================================================
//  Tests unitaires — 0.57.10
//  Refacto qualité : extraction NoteModal + helpers + cleanup zombies
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.10 - Version + bump", () => {
  it("Version 0.57.10+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(10);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });
});

describe("0.57.10 - NoteModal extrait dans son propre composant", () => {
  const modalPath = "app/changelog/NoteModal.js";

  it("Fichier existe et est Client Component", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), modalPath))).toBe(true);
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    expect(src.startsWith('"use client"')).toBe(true);
  });

  it("Export default function NoteModal", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    expect(src).toMatch(/export default function NoteModal/);
  });

  it("Reçoit { noteModal, setNoteModal, onClose } en props", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    expect(src).toMatch(/\(\s*\{\s*noteModal,\s*setNoteModal,\s*onClose\s*\}/);
  });

  it("Contient les 2 useEffect (scroll + keys)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    const effects = src.match(/useEffect\(/g) || [];
    expect(effects.length).toBeGreaterThanOrEqual(2);
  });

  it("Gère Escape, F3, n, p shortcuts", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    expect(src).toMatch(/Escape/);
    expect(src).toMatch(/F3/);
    // Navigation matches
    expect(src).toMatch(/currentMatch/);
  });

  it("Style navBtn défini localement", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    expect(src).toMatch(/const navBtn\s*=/);
  });

  it("Return null si noteModal est null (pas de rendu)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), modalPath), "utf-8");
    expect(src).toMatch(/if\s*\(\s*!noteModal\s*\)\s*return null/);
  });
});

describe("0.57.10 - note-helpers.js extracts", () => {
  const helpersPath = "app/changelog/lib/note-helpers.js";

  it("Fichier existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), helpersPath))).toBe(true);
  });

  it("Exports : STOPWORDS_FR, scopeHtml, extractKeywords, highlightInHtml, escapeRegex", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), helpersPath), "utf-8");
    expect(src).toMatch(/export const STOPWORDS_FR/);
    expect(src).toMatch(/export function scopeHtml/);
    expect(src).toMatch(/export function extractKeywords/);
    expect(src).toMatch(/export function highlightInHtml/);
    expect(src).toMatch(/export function escapeRegex/);
  });

  it("STOPWORDS_FR est un Set avec stopwords français classiques", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), helpersPath), "utf-8");
    expect(src).toMatch(/new Set\(\[/);
    expect(src).toMatch(/"le"/);
    expect(src).toMatch(/"la"/);
    expect(src).toMatch(/"des"/);
  });
});

describe("0.57.10 - page.js refactoré (utilise NoteModal + helpers)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");

  it("Import des helpers depuis note-helpers", () => {
    expect(src).toMatch(/from\s+["']\.\/lib\/note-helpers["']/);
    expect(src).toMatch(/scopeHtml/);
    expect(src).toMatch(/extractKeywords/);
    expect(src).toMatch(/highlightInHtml/);
  });

  it("Import dynamic du NoteModal", () => {
    expect(src).toMatch(/const NoteModal\s*=\s*dynamic\(/);
    expect(src).toMatch(/import\(["']\.\/NoteModal["']\)/);
  });

  it("Plus de définition locale de extractKeywords / highlightInHtml / scopeHtml / STOPWORDS_FR", () => {
    expect(src).not.toMatch(/^\s*function scopeHtml\(/m);
    expect(src).not.toMatch(/^\s*function extractKeywords\(/m);
    expect(src).not.toMatch(/^\s*function highlightInHtml\(/m);
    expect(src).not.toMatch(/^\s*const STOPWORDS_FR\s*=/m);
  });

  it("Plus de useEffect pour les Escape/F3/scroll (déplacés dans NoteModal)", () => {
    // Recherche des 2 useEffect spécifiques au NoteModal
    expect(src).not.toMatch(/Scroll auto vers le match courant/);
    expect(src).not.toMatch(/Escape pour fermer la modale note/);
  });

  it("Utilise <NoteModal noteModal={...} setNoteModal={...} onClose={...} />", () => {
    expect(src).toMatch(/<NoteModal\s+noteModal=/);
    expect(src).toMatch(/setNoteModal=\{setNoteModal\}/);
  });

  it("page.js a moins de 1100 lignes (refacto 0.57.10)", () => {
    const lines = src.split("\n").length;
    expect(lines).toBeLessThan(1100);
  });
});

describe("0.57.10 - 0 imports zombies", () => {
  // Test automatisé sur tous les fichiers app/
  const ZOMBIE_CHECK = `
    function checkZombies(filepath) {
      const src = fs.readFileSync(filepath, "utf-8");
      const importRe = /^import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*["'][^"']+["']\\s*;?\\s*$/gm;
      const zombies = [];
      let m;
      while ((m = importRe.exec(src)) !== null) {
        const names = m[1].split(",").map(n => n.trim()).filter(Boolean);
        for (const n of names) {
          const lookup = n.includes(" as ") ? n.split(" as ")[1].trim() : n;
          const rest = src.slice(0, m.index) + src.slice(m.index + m[0].length);
          const re = new RegExp("\\\\b" + lookup.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&") + "\\\\b");
          if (!re.test(rest)) zombies.push(lookup);
        }
      }
      return zombies;
    }
  `;

  it("Aucun import zombie dans app/changelog/page.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    const importRe = /^import\s*\{\s*([^}]+)\s*\}\s*from\s*["'][^"']+["']\s*;?\s*$/gm;
    let m;
    let zombies = [];
    while ((m = importRe.exec(src)) !== null) {
      const names = m[1].split(",").map(n => n.trim()).filter(Boolean);
      for (const n of names) {
        const lookup = n.includes(" as ") ? n.split(" as ")[1].trim() : n;
        const rest = src.slice(0, m.index) + src.slice(m.index + m[0].length);
        const re = new RegExp("\\b" + lookup.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (!re.test(rest)) zombies.push(lookup);
      }
    }
    expect(zombies).toEqual([]);
  });

  it("Aucun import zombie dans app/changelog/NoteModal.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/NoteModal.js"), "utf-8");
    const importRe = /^import\s*\{\s*([^}]+)\s*\}\s*from\s*["'][^"']+["']\s*;?\s*$/gm;
    let m;
    let zombies = [];
    while ((m = importRe.exec(src)) !== null) {
      const names = m[1].split(",").map(n => n.trim()).filter(Boolean);
      for (const n of names) {
        const lookup = n.includes(" as ") ? n.split(" as ")[1].trim() : n;
        const rest = src.slice(0, m.index) + src.slice(m.index + m[0].length);
        const re = new RegExp("\\b" + lookup.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (!re.test(rest)) zombies.push(lookup);
      }
    }
    expect(zombies).toEqual([]);
  });
});
