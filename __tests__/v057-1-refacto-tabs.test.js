// =============================================================
//  Tests unitaires — 0.57.1
//  Refacto patient/[id]/edit/page.js : split en tabs/*.js
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const tabsDir = "app/patient/[id]/edit/tabs";

describe("0.57.1 - Refacto patient/[id]/edit : tabs extraits", () => {
  it("Version 0.57.1+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.57\.\d+-alpha$/);
  });

  it("Dossier tabs/ existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), tabsDir))).toBe(true);
  });

  const expectedTabs = [
    "TabIdentite.js",
    "TabSecu.js",
    "TabAdresses.js",
    "TabContacts.js",
    "TabMedecin.js",
    "TabPrescriptions.js",
    "TabAudit.js",
    "_helpers.js",
  ];

  expectedTabs.forEach((file) => {
    it(`${file} existe et a un export par défaut ou nommé`, () => {
      const full = path.resolve(process.cwd(), tabsDir, file);
      expect(fs.existsSync(full)).toBe(true);
      const src = fs.readFileSync(full, "utf-8");
      // Soit `export default`, soit au moins un `export function|const`
      expect(src).toMatch(/export (default |function |const )/);
    });
  });

  it("page.js a moins de 500 lignes (vs 1065 avant refacto)", () => {
    const full = path.resolve(process.cwd(), "app/patient/[id]/edit/page.js");
    const lines = fs.readFileSync(full, "utf-8").split("\n").length;
    expect(lines).toBeLessThan(500);
  });

  it("page.js importe bien les tabs externes", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/edit/page.js"), "utf-8");
    expect(src).toContain('import TabIdentite from "./tabs/TabIdentite"');
    expect(src).toContain('import TabSecu from "./tabs/TabSecu"');
    expect(src).toContain('import TabAdresses from "./tabs/TabAdresses"');
    expect(src).toContain('import TabContacts from "./tabs/TabContacts"');
    expect(src).toContain('import TabMedecin from "./tabs/TabMedecin"');
    expect(src).toContain('import TabPrescriptions from "./tabs/TabPrescriptions"');
    expect(src).toContain('import TabAudit from "./tabs/TabAudit"');
  });

  it("_helpers.js expose Field, FieldSelect, Lbl, Toggle, KvBlock", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), tabsDir, "_helpers.js"), "utf-8");
    expect(src).toMatch(/export function Field\b/);
    expect(src).toMatch(/export function FieldSelect\b/);
    expect(src).toMatch(/export function Lbl\b/);
    expect(src).toMatch(/export function Toggle\b/);
    expect(src).toMatch(/export function KvBlock\b/);
  });

  it("page.js n'a plus de fonction TabXxx définie en interne", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/edit/page.js"), "utf-8");
    // Il ne doit plus y avoir de "function TabIdentite(..." dans page.js
    expect(src).not.toMatch(/^function TabIdentite\(/m);
    expect(src).not.toMatch(/^function TabSecu\(/m);
    expect(src).not.toMatch(/^function TabAdresses\(/m);
    expect(src).not.toMatch(/^function TabAudit\(/m);
  });

  it("Chaque Tab*.js fait moins de 250 lignes (lisibilité)", () => {
    const tabs = expectedTabs.filter(f => f.startsWith("Tab"));
    tabs.forEach((file) => {
      const lines = fs.readFileSync(path.resolve(process.cwd(), tabsDir, file), "utf-8").split("\n").length;
      expect(lines, `${file} doit être < 250 lignes`).toBeLessThan(250);
    });
  });
});
