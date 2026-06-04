// =============================================================
//  Tests unitaires — 0.58.16 HOTFIX UI
//
//  Fix 1 : .wrap padding-bottom 110→140px + safe-area-inset
//  Fix 2 : menu-overlay z-index 48→9998, menu-drawer 49→9999
//  Fix 3 : Hook useDropdownPosition + auto-flip up sur Select,
//          TimePicker, RangePicker, Combobox
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.58.16 - Version", () => {
  it("Version 0.58.16+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const [, minor, patchWithSuffix] = pkg.version.split(".");
    if (parseInt(minor) === 58) {
      const patch = parseInt(patchWithSuffix.replace("-alpha", ""), 10);
      expect(patch).toBeGreaterThanOrEqual(16);
    }
  });

  it("SW VERSION sync", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.58.16 - Fix 1 : .wrap padding-bottom + safe-area", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("Padding-bottom desktop passé à 140px + safe-area-inset", () => {
    expect(css).toMatch(/\.wrap\{max-width:1180px;margin:0 auto;padding:30px 24px calc\(140px \+ env\(safe-area-inset-bottom/);
  });

  it("Padding-bottom mobile passé à 160px + safe-area-inset", () => {
    expect(css).toMatch(/\.wrap\{padding:18px 12px calc\(160px \+ env\(safe-area-inset-bottom/);
  });

  it("Plus de padding 110px sur la classe .wrap", () => {
    expect(css).not.toMatch(/\.wrap\{max-width:1180px;margin:0 auto;padding:30px 24px 110px\}/);
  });
});

describe("0.58.16 - Fix 2 : z-index menu burger", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("menu-overlay z-index passé à 9998 (était 48)", () => {
    expect(css).toMatch(/\.menu-overlay\{[^}]*z-index:9998/);
    // L'ancien z-index 48 doit avoir disparu sur menu-overlay
    expect(css).not.toMatch(/\.menu-overlay\{[^}]*z-index:48[^9]/);
  });

  it("menu-drawer z-index passé à 9999 (était 49)", () => {
    expect(css).toMatch(/\.menu-drawer\{[\s\S]*?z-index:9999/);
    // L'ancien z-index 49 doit avoir disparu sur menu-drawer
    expect(css).not.toMatch(/\.menu-drawer\{[\s\S]{0,500}?z-index:49[^9]/);
  });

  it("menu-overlay et menu-drawer toujours en position fixed", () => {
    expect(css).toMatch(/\.menu-overlay\{position:fixed/);
    expect(css).toMatch(/\.menu-drawer\{[\s\S]*?position:fixed/);
  });
});

describe("0.58.16 - Fix 3 : Hook useDropdownPosition", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/useDropdownPosition.js"), "utf-8");

  it("'use client' + export useDropdownPosition + dropdownPositionStyle", () => {
    expect(src).toMatch(/^["']use client["']/);
    expect(src).toMatch(/export function useDropdownPosition/);
    expect(src).toMatch(/export function dropdownPositionStyle/);
  });

  it("Calcul spaceBelow et spaceAbove via getBoundingClientRect", () => {
    expect(src).toMatch(/getBoundingClientRect/);
    expect(src).toMatch(/spaceBelow\s*=\s*vh\s*-\s*rect\.bottom\s*-\s*margin/);
    expect(src).toMatch(/spaceAbove\s*=\s*rect\.top\s*-\s*margin/);
  });

  it("Flip si spaceBelow < maxHeight ET spaceAbove > spaceBelow", () => {
    expect(src).toMatch(/spaceBelow\s*<\s*maxHeight\s*&&\s*spaceAbove\s*>\s*spaceBelow/);
  });

  it("Recalcul au scroll et resize", () => {
    expect(src).toMatch(/window\.addEventListener\(["']scroll["']/);
    expect(src).toMatch(/window\.addEventListener\(["']resize["']/);
  });

  it("Cleanup listeners au unmount", () => {
    expect(src).toMatch(/window\.removeEventListener\(["']scroll["']/);
    expect(src).toMatch(/window\.removeEventListener\(["']resize["']/);
  });

  it("dropdownPositionStyle helper : bottom calc si flipUp, sinon top calc", () => {
    expect(src).toMatch(/flipUp[\s\S]*?bottom:\s*["']calc\(100%\s*\+\s*6px\)["']/);
    expect(src).toMatch(/top:\s*["']calc\(100%\s*\+\s*6px\)["']/);
  });
});

describe("0.58.16 - Fix 3 : Application sur Select", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Select.js"), "utf-8");

  it("Import useDropdownPosition + dropdownPositionStyle", () => {
    expect(src).toMatch(/import\s+\{\s*useDropdownPosition,\s*dropdownPositionStyle\s*\}\s+from\s+["']\.\/useDropdownPosition["']/);
  });

  it("Hook flipUp = useDropdownPosition(rootRef, open, { maxHeight: 320 })", () => {
    expect(src).toMatch(/const flipUp\s*=\s*useDropdownPosition\(rootRef,\s*open,\s*\{\s*maxHeight:\s*320\s*\}\)/);
  });

  it("Application ...dropdownPositionStyle(flipUp) sur le dropdown", () => {
    expect(src).toMatch(/\.\.\.dropdownPositionStyle\(flipUp\)/);
  });

  it("Plus de top: calc(100% + 6px) hardcodé", () => {
    // Le top doit venir de dropdownPositionStyle, plus en dur
    const dropdownArea = src.split("role=\"listbox\"")[1] || "";
    expect(dropdownArea.slice(0, 500)).not.toMatch(/top:\s*["']calc\(100%\s*\+\s*6px\)["']/);
  });
});

describe("0.58.16 - Fix 3 : Application sur TimePicker", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/TimePicker.js"), "utf-8");

  it("Import useDropdownPosition + dropdownPositionStyle", () => {
    expect(src).toMatch(/import\s+\{\s*useDropdownPosition,\s*dropdownPositionStyle\s*\}\s+from\s+["']\.\/useDropdownPosition["']/);
  });

  it("Hook flipUp = useDropdownPosition(rootRef, open, { maxHeight: 280 })", () => {
    expect(src).toMatch(/const flipUp\s*=\s*useDropdownPosition\(rootRef,\s*open,\s*\{\s*maxHeight:\s*280\s*\}\)/);
  });

  it("Application ...dropdownPositionStyle(flipUp)", () => {
    expect(src).toMatch(/\.\.\.dropdownPositionStyle\(flipUp\)/);
  });
});

describe("0.58.16 - Fix 3 : Application sur RangePicker", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/RangePicker.js"), "utf-8");

  it("Import useDropdownPosition + dropdownPositionStyle", () => {
    expect(src).toMatch(/import\s+\{\s*useDropdownPosition,\s*dropdownPositionStyle\s*\}\s+from\s+["']\.\/useDropdownPosition["']/);
  });

  it("Hook flipUp = useDropdownPosition(rootRef, open, { maxHeight: 280 })", () => {
    expect(src).toMatch(/const flipUp\s*=\s*useDropdownPosition\(rootRef,\s*open,\s*\{\s*maxHeight:\s*280\s*\}\)/);
  });

  it("Application ...dropdownPositionStyle(flipUp)", () => {
    expect(src).toMatch(/\.\.\.dropdownPositionStyle\(flipUp\)/);
  });
});

describe("0.58.16 - Fix 3 : Application sur Combobox", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/Combobox.js"), "utf-8");

  it("Import useDropdownPosition + dropdownPositionStyle", () => {
    expect(src).toMatch(/import\s+\{\s*useDropdownPosition,\s*dropdownPositionStyle\s*\}\s+from\s+["']\.\/useDropdownPosition["']/);
  });

  it("Hook flipUp = useDropdownPosition(rootRef, open, { maxHeight: 320 })", () => {
    expect(src).toMatch(/const flipUp\s*=\s*useDropdownPosition\(rootRef,\s*open,\s*\{\s*maxHeight:\s*320\s*\}\)/);
  });

  it("Application ...dropdownPositionStyle(flipUp)", () => {
    expect(src).toMatch(/\.\.\.dropdownPositionStyle\(flipUp\)/);
  });
});

describe("0.58.16 - DatePicker non concerné (input type=date natif)", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/components/ui-premium/DatePicker.js"), "utf-8");

  it("DatePicker utilise un input HTML5 natif, pas de dropdown custom à flip", () => {
    // Pas d'import useDropdownPosition (le composant n'en a pas besoin)
    expect(src).not.toMatch(/useDropdownPosition/);
    // Utilise bien un input type=date natif
    expect(src).toMatch(/type=["']date["']/);
  });
});
