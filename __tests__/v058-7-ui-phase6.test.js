// =============================================================
//  Tests unitaires — 0.58.7 UI PHASE 6
//
//  Kanban Drag&Drop premium (pickup + ghost + drop zone + flash)
//  + Migration toast (kanban + interventions + patients)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.7 - Version", () => {
  it("Version 0.58.7+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [major, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(7);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.7 - Kanban Drag&Drop premium CSS", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("kb-card avec transition premium", () => {
    expect(css).toMatch(/\.kb-card\s*\{[\s\S]*?transition:/);
    expect(css).toMatch(/\.kb-card:hover\s*\{[\s\S]*?translateY/);
  });

  it("kb-card-dragging (carte source soulevée)", () => {
    expect(css).toMatch(/\.kb-card-dragging\s*\{[\s\S]*?opacity:\s*0\.35/);
    expect(css).toMatch(/\.kb-card-dragging\s*\{[\s\S]*?scale\(0\.96\)/);
  });

  it("kb-ghost-premium avec multi-shadow + halo teal", () => {
    expect(css).toMatch(/\.kb-ghost-premium\s*\{[\s\S]*?rotate\(3deg\)/);
    expect(css).toMatch(/\.kb-ghost-premium\s*\{[\s\S]*?scale\(1\.04\)/);
    expect(css).toMatch(/\.kb-ghost-premium\s*\{[\s\S]*?rgba\(124,200,200/);
    expect(css).toMatch(/@keyframes kb-ghost-in/);
  });

  it("kb-col-over avec ring teal pulsant", () => {
    expect(css).toMatch(/\.kb-col-over\s*\{[\s\S]*?box-shadow:[\s\S]*?#7CC8C8 inset/);
    expect(css).toMatch(/\.kb-col-over\s*\{[\s\S]*?animation:\s*kb-col-pulse/);
    expect(css).toMatch(/@keyframes kb-col-pulse/);
  });

  it("kb-drag-active dim les autres colonnes", () => {
    expect(css).toMatch(/\.kb-drag-active\s+\.kb-col:not\(\.kb-col-over\)\s*\{[\s\S]*?opacity:\s*0\.7/);
  });

  it("kb-card-dropped avec animation flash teal", () => {
    expect(css).toMatch(/\.kb-card-dropped\s*\{[\s\S]*?animation:\s*kb-drop-flash/);
    expect(css).toMatch(/@keyframes kb-drop-flash/);
  });
});

describe("0.58.7 - Kanban JSX utilise les classes premium", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/kanban/page.js"), "utf-8");

  it("Carte utilise kb-card + kb-card-dragging conditionnel", () => {
    expect(src).toMatch(/className=\{`kb-card\$\{isDragging\s*\?\s*["']\s*kb-card-dragging["']/);
  });

  it("Carte utilise kb-card-dropped après le drop (flash)", () => {
    expect(src).toMatch(/droppedId\s*===\s*r\.id[\s\S]*?kb-card-dropped/);
  });

  it("Colonne utilise kb-col + kb-col-over conditionnel", () => {
    expect(src).toMatch(/className=\{`kb-col\$\{isOver\s*\?\s*["']\s*kb-col-over["']/);
  });

  it("Grid utilise kb-drag-active quand un drag est en cours", () => {
    expect(src).toMatch(/className=\{`kanban-grid\$\{dragId\s*\?\s*["']\s*kb-drag-active["']/);
  });

  it("Ghost utilise kb-ghost-premium", () => {
    expect(src).toMatch(/className=["']kb-ghost-premium["']/);
  });

  it("State droppedId géré", () => {
    expect(src).toMatch(/const \[droppedId, setDroppedId\]/);
    expect(src).toMatch(/setDroppedId\(id\)/);
    expect(src).toMatch(/setTimeout\(\(\)\s*=>\s*setDroppedId\(null\)/);
  });
});

describe("0.58.7 - Migration toast (kanban + interventions + patients)", () => {
  it("kanban : alert() supprimé, toast.error + toast.success", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/kanban/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*toast[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/toast\.error\(/);
    expect(src).toMatch(/toast\.success\(/);
    // Strip commentaires avant de chercher alert (sinon faux positif sur les notes)
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/\balert\(/);
  });

  it("interventions : alert() remplacé par toast", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*toast[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/toast\.error\(/);
    expect(src).toMatch(/toast\.success\(/);
    // Plus aucun alert dans cette page
    expect(src).not.toMatch(/\balert\(/);
  });

  it("patients : alert() remplacé par toast", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patients/page.js"), "utf-8");
    expect(src).toMatch(/import\s+\{[^}]*toast[^}]*\}\s+from\s+["'][^"']*ui-premium["']/);
    expect(src).toMatch(/toast\.error\(["']Vous n'avez pas le droit/);
    expect(src).toMatch(/toast\.success\([\s\S]*?supprimé/);
  });

  it("Feedback positif sur drop kanban (toast.success)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/interventions/kanban/page.js"), "utf-8");
    expect(src).toMatch(/toast\.success\(`Statut mis à jour/);
  });
});
