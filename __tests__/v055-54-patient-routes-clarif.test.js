// =============================================================
//  Tests unitaires — 0.55.54
//  Clarification routes /patient vs /patients
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.55.54 - Redirect /patient → /patients", () => {
  it("Page /patient/page.js existe et redirige", () => {
    const p = path.resolve(process.cwd(), "app/patient/page.js");
    expect(fs.existsSync(p)).toBe(true);
    const src = fs.readFileSync(p, "utf-8");
    expect(src).toContain('redirect("/patients")');
    expect(src).toContain('next/navigation');
  });
});

describe("0.55.54 - Fil d'Ariane sur la fiche patient", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");

  it("Lien retour vers /patients", () => {
    expect(src).toContain('router.push("/patients")');
    expect(src).toContain("Tous les patients");
  });

  it("Indicateur 'Fiche de [nom]'", () => {
    expect(src).toContain("Fiche de");
  });

  it("Style breadcrumb avec séparateur /", () => {
    expect(src).toContain('color: "#d3d9e0"');
  });
});

describe("0.55.54 - Fil d'Ariane sur l'édition patient", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/edit/page.js"), "utf-8");

  it("Lien retour vers /patients", () => {
    expect(src).toContain('router.push("/patients")');
    expect(src).toContain("Tous les patients");
  });

  it("Lien vers la fiche 360° du patient", () => {
    expect(src).toContain('router.push(`/patient/${patId}`)');
    expect(src).toContain("Fiche ");
  });

  it("Indicateur 'Édition' à la fin du fil", () => {
    expect(src).toContain(">Édition<");
  });
});

describe("0.55.54 - Pas de doublon dans le menu", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/TopBar.js"), "utf-8");

  it("Une seule entrée 'Patients' dans le menu", () => {
    const matches = src.match(/lbl: "Patients"/g) || [];
    expect(matches.length).toBe(1);
  });

  it("Pas d'entrée /patient (singulier) dans le menu", () => {
    // On cherche les entrées { p: "/patient", ...} sans le /
    const matches = src.match(/p:\s*"\/patient"\s*,/g) || [];
    expect(matches.length).toBe(0);
  });
});
