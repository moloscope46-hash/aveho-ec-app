// =============================================================
//  Tests unitaires — 0.57.2
//  Refacto changelog/page.js : extraction SqlModal + helpers
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.2 - Refacto changelog/page.js : extractions", () => {
  it("Version 0.57.2+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
  });

  it("app/changelog/lib/helpers.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/changelog/lib/helpers.js"))).toBe(true);
  });

  it("helpers.js exporte ICONS_BY_CODE, getCodeMeta, versionKey, compareVersions", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/lib/helpers.js"), "utf-8");
    expect(src).toMatch(/export const ICONS_BY_CODE/);
    expect(src).toMatch(/export function getCodeMeta/);
    expect(src).toMatch(/export function versionKey/);
    expect(src).toMatch(/export function compareVersions/);
  });

  it("app/changelog/SqlModal.js existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "app/changelog/SqlModal.js"))).toBe(true);
  });

  it("SqlModal.js : default export + gère son propre fetch + ESC + clipboard", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/SqlModal.js"), "utf-8");
    expect(src).toContain("export default function SqlModal");
    expect(src).toMatch(/fetch\(`?\/changelog-sql\//);
    expect(src).toContain('e.key === "Escape"');
    expect(src).toContain("navigator.clipboard.writeText");
  });

  it("SqlModal accepte les props sqlModal + onClose", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/SqlModal.js"), "utf-8");
    expect(src).toMatch(/function SqlModal\(\s*\{\s*sqlModal,\s*onClose\s*\}/);
  });

  it("page.js a moins de 1500 lignes (refacto 0.57.2 + lazy loads 0.57.6 + split 0.57.7)", () => {
    // 0.57.2 : 1603 → 1363 lignes après extraction SqlModal + helpers
    // 0.57.7 : +~50 lignes pour le state ALL_VERSIONS dynamique + useEffect fetch
    //          chantiers-extra.json. Le seuil passe de 1400 à 1500.
    const full = path.resolve(process.cwd(), "app/changelog/page.js");
    const lines = fs.readFileSync(full, "utf-8").split("\n").length;
    expect(lines).toBeLessThan(1500);
  });

  it("page.js importe helpers depuis ./lib/helpers", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    expect(src).toContain('from "./lib/helpers"');
    expect(src).toContain("getCodeMeta");
    expect(src).toContain("compareVersions");
  });

  it("page.js importe SqlModal (statique ou dynamic depuis 0.57.6)", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    // 0.57.6 : SqlModal est maintenant en dynamic import pour économiser
    // sur le bundle initial. On accepte les deux patterns.
    const staticImport = src.includes('import SqlModal from "./SqlModal"');
    const dynamicImport = /const SqlModal\s*=\s*dynamic\([\s\S]*?["']\.\/SqlModal["']/.test(src);
    expect(staticImport || dynamicImport).toBe(true);
  });

  it("page.js n'a plus de définition locale d'helpers", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    expect(src).not.toMatch(/^const ICONS_BY_CODE\s*=/m);
    expect(src).not.toMatch(/^function getCodeMeta\(/m);
    expect(src).not.toMatch(/^function versionKey\(/m);
    expect(src).not.toMatch(/^function compareVersions\(/m);
  });

  it("page.js n'a plus la logique fetch SQL / copySqlToClipboard / ESC sql", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    // sqlCacheRef et sqlCopied ne devraient plus être dans page.js
    expect(src).not.toMatch(/sqlCacheRef\.current/);
    expect(src).not.toMatch(/setSqlCopied\(/);
    expect(src).not.toMatch(/async function copySqlToClipboard/);
  });

  it("page.js utilise <SqlModal /> au lieu du JSX inline géant", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/page.js"), "utf-8");
    expect(src).toContain("<SqlModal sqlModal={sqlModal}");
  });
});

describe("0.57.2 - Fix imports tabs/ (héritage 0.57.1)", () => {
  it("TabAudit importe bulletinsStorage avec le bon nombre de ..", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/edit/tabs/TabAudit.js"), "utf-8");
    // tabs/ → 5 niveaux pour atteindre /lib/
    expect(src).toContain('"../../../../../lib/bulletinsStorage"');
  });

  it("TabPrescriptions importe prescriptionsStorage avec le bon nombre de ..", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/edit/tabs/TabPrescriptions.js"), "utf-8");
    expect(src).toContain('"../../../../../lib/prescriptionsStorage"');
  });
});
