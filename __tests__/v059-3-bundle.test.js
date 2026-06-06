// =============================================================
//  Tests 0.59.3 — Stepper 5 + FAB QR + Dossier premium + Patho service
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.59.3 - Version + SW", () => {
  it("Version 0.59.3+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.59\.([3-9]|\d{2,})|^0\.[6-9]|^[1-9]/);
  });
  it("SW VERSION sync à 0.59.3", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    expect(sw).toContain('"aveho-ec-0.59.3"');
  });
});

describe("0.59.3 - Stepper visuel 5 étapes mobile patient", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/mobile/patient/new/page.js"), "utf-8");
  it("5 étapes avec icônes (Identité/Affectation/Contact/Médical/Validation)", () => {
    expect(src).toMatch(/n:\s*1,\s*ic:\s*"ti-id"/);
    expect(src).toMatch(/n:\s*1\.5,\s*ic:\s*"ti-building"/);
    expect(src).toMatch(/n:\s*2,\s*ic:\s*"ti-phone"/);
    expect(src).toMatch(/n:\s*3,\s*ic:\s*"ti-stethoscope"/);
    expect(src).toMatch(/n:\s*4,\s*ic:\s*"ti-check"/);
  });
  it("Bullet courante avec border blanc + box-shadow", () => {
    expect(src).toMatch(/border:\s*isCurrent\s*\?\s*"2px solid #fff"/);
    expect(src).toMatch(/boxShadow:\s*isCurrent\s*\?/);
  });
  it("Lignes connectées entre bullets", () => {
    expect(src).toMatch(/idx > 0.*step-line|left:\s*"-50%"/s);
  });
});

describe("0.59.3 - FAB Réimprimer QR sur page patient", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/patient/[id]/page.js"), "utf-8");
  it("FAB violet position fixed bottom-right", () => {
    expect(src).toMatch(/position:\s*"fixed",\s*bottom:\s*90,\s*right:\s*20/);
    expect(src).toMatch(/#5e4a8c.*#473873/);
  });
  it("Click → /patients/[id]/qr", () => {
    expect(src).toMatch(/router\.push\(`\/patients\/\$\{patId\}\/qr`\)/);
  });
  it("Icône qrcode + tooltip changement chambre", () => {
    expect(src).toMatch(/ti-qrcode/);
    expect(src).toMatch(/changé de chambre|Réimprimer QR/);
  });
  it("Animation scale au hover", () => {
    expect(src).toMatch(/onMouseEnter.*scale\(1\.1\)/);
  });
  it("Lien 'Dossier médical' ajouté à la barre d'actions", () => {
    expect(src).toMatch(/Dossier médical/);
    expect(src).toMatch(/\/patient\/\$\{patId\}\/dossier/);
  });
});

describe("0.59.3 - Page /patient/[id]/dossier", () => {
  const dossierPath = path.resolve(process.cwd(), "app/patient/[id]/dossier/page.js");
  it("Page existe", () => {
    expect(fs.existsSync(dossierPath)).toBe(true);
  });
  const src = fs.readFileSync(dossierPath, "utf-8");
  it("7 sections définies", () => {
    expect(src).toMatch(/id:\s*"synthese"/);
    expect(src).toMatch(/id:\s*"antecedents"/);
    expect(src).toMatch(/id:\s*"allergies"/);
    expect(src).toMatch(/id:\s*"traitements"/);
    expect(src).toMatch(/id:\s*"pathologie"/);
    expect(src).toMatch(/id:\s*"notes"/);
    expect(src).toMatch(/id:\s*"interventions"/);
  });
  it("Header coloré selon pathologie + initiales", () => {
    expect(src).toMatch(/pathologie\?\.couleur/);
    expect(src).toMatch(/pat\.prenom\?\.\[0\][\s\S]*pat\.nom\?\.\[0\]/);
  });
  it("Charge pathologie + collaborateur + interventions", () => {
    expect(src).toMatch(/from\("pathologies"\)/);
    expect(src).toMatch(/from\("v_collaborateurs"\)/);
    expect(src).toMatch(/from\("interventions"\)/);
  });
  it("Composant SyntheseCard avec warning si allergies", () => {
    expect(src).toMatch(/function SyntheseCard/);
    expect(src).toMatch(/warning=\{!!pat\.allergies\}/);
  });
  it("Composant EditableSection avec save direct DB", () => {
    expect(src).toMatch(/function EditableSection/);
    expect(src).toMatch(/saveField\("antecedents"/);
    expect(src).toMatch(/saveField\("allergies"/);
    expect(src).toMatch(/saveField\("traitements"/);
    expect(src).toMatch(/saveField\("notes"/);
  });
  it("Section pathologie affiche protocole + alertes", () => {
    expect(src).toMatch(/protocole_court/);
    expect(src).toMatch(/protocole_detail/);
    expect(src).toMatch(/pathologie\.alertes/);
  });
  it("Section interventions clickable vers /interventions/[id]", () => {
    expect(src).toMatch(/router\.push\(`\/interventions\/\$\{iv\.id\}`\)/);
  });
});

describe("0.59.3 - Multi-select pathologies dans edition service", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "app/etablissement/edition/page.js"), "utf-8");
  it("Composant ServicePathologies défini", () => {
    expect(src).toMatch(/function ServicePathologies/);
  });
  it("Apparaît uniquement si modal d'édition service", () => {
    expect(src).toMatch(/modal\?\.kind === "service" && modal\?\.row\?\.id/);
  });
  it("Charge pathologies actives + liens existants", () => {
    expect(src).toMatch(/from\("pathologies"\)[\s\S]*?\.eq\("actif",\s*true\)/);
    expect(src).toMatch(/from\("services_pathologies"\)[\s\S]*?\.eq\("service_id",\s*serviceId\)/);
  });
  it("Toggle insert/delete dans services_pathologies", () => {
    expect(src).toMatch(/from\("services_pathologies"\)\.delete\(\)/);
    expect(src).toMatch(/from\("services_pathologies"\)\.insert/);
  });
  it("Compteur N/Total + état Mise à jour", () => {
    expect(src).toMatch(/linked\.size\}\/\$\{pathologies\.length/);
    expect(src).toMatch(/Mise à jour/);
  });
  it("Lien vers /pathologies si vide", () => {
    expect(src).toMatch(/href="\/pathologies"/);
  });
});

describe("0.59.3 - Cohérence changelog", () => {
  it("0.59.3 dans versions-data.js", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "app/changelog/versions-data.js"), "utf-8");
    expect(src).toMatch(/"v":\s*"0\.59\.3"/);
  });
  it("Note HTML 0.59.3 existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/changelog-notes/NOTE-VERSION-Alpha-0.59.3.html"))).toBe(true);
  });
});
