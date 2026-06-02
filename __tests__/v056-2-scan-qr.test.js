// =============================================================
//  Tests unitaires — 0.56.2
//  Scan QR fonctionnel : composant + parser + page
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseQrContent } from "../lib/qrParser.js";

describe("0.56.2 - Parser qrParser.js", () => {
  it("Type 'empty' si texte vide", () => {
    expect(parseQrContent("").type).toBe("empty");
    expect(parseQrContent(null).type).toBe("empty");
  });

  it("Type 'url' pour http(s)://...", () => {
    const r = parseQrContent("https://www.example.com/page?q=1");
    expect(r.type).toBe("url");
    expect(r.label).toBe("URL externe");
  });

  it("Type 'url_aveho' pour les domaines Aveho", () => {
    const r = parseQrContent("https://aveho-ec.vercel.app/patient/123");
    expect(r.type).toBe("url_aveho");
    expect(r.url.pathname).toBe("/patient/123");
  });

  it("Type 'vcard' pour BEGIN:VCARD", () => {
    const r = parseQrContent("BEGIN:VCARD\nVERSION:3.0\nFN:Jean Dupont\nTEL:+33612345678\nEMAIL:jean@example.fr\nEND:VCARD");
    expect(r.type).toBe("vcard");
    expect(r.fn).toBe("Jean Dupont");
    expect(r.tel).toBe("+33612345678");
    expect(r.email).toBe("jean@example.fr");
  });

  it("Type 'wifi' pour WIFI:...", () => {
    const r = parseQrContent("WIFI:T:WPA;S:MonReseau;P:secret123;;");
    expect(r.type).toBe("wifi");
    expect(r.ssid).toBe("MonReseau");
    expect(r.auth).toBe("WPA");
  });

  it("Type 'vitale_qr' si NIR détecté", () => {
    const r = parseQrContent("1 85 04 75 116 001 22 DUPONT JEAN");
    expect(r.type).toBe("vitale_qr");
    expect(r.sexe).toBe("M");
    expect(r.annee_naissance).toBe(85);
    expect(r.mois_naissance).toBe(4);
  });

  it("NIR femme commence par 2", () => {
    const r = parseQrContent("2 90 06 75 116 001 22");
    expect(r.type).toBe("vitale_qr");
    expect(r.sexe).toBe("F");
  });

  it("Type 'gs1' si Application Identifiers (parenthèses)", () => {
    const r = parseQrContent("(01)03660005512345(17)260131(10)LOT2024A(21)SN12345");
    expect(r.type).toBe("gs1");
    expect(r.ais["01"]).toBe("03660005512345");
    expect(r.ais["10"]).toBe("LOT2024A");
    expect(r.ais["17"]).toBe("260131");
    expect(r.ais["21"]).toBe("SN12345");
    expect(r.ais_labeled.find(a => a.ai === "01").label).toBe("GTIN");
    expect(r.ais_labeled.find(a => a.ai === "17").label).toBe("Péremption");
  });

  it("Type 'ean' si 8 ou 13 chiffres", () => {
    const r13 = parseQrContent("3017620422003");
    expect(r13.type).toBe("ean");
    expect(r13.label).toBe("Code EAN-13");
    const r8 = parseQrContent("96385074");
    expect(r8.type).toBe("ean");
    expect(r8.label).toBe("Code EAN-8");
  });

  it("Type 'text' pour n'importe quoi d'autre", () => {
    const r = parseQrContent("Juste du texte libre");
    expect(r.type).toBe("text");
  });
});

describe("0.56.2 - Composant QrScanner.js", () => {
  const p = "app/QrScanner.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Composant existe", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), p))).toBe(true);
  });

  it("Import dynamique de html5-qrcode (pas top-level)", () => {
    // Doit utiliser dynamic import dans useEffect (allège le bundle)
    expect(src).toContain('await import("html5-qrcode")');
    expect(src).not.toMatch(/^import.*from ["']html5-qrcode["']/m);
  });

  it("Préfère la caméra arrière sur mobile", () => {
    expect(src).toContain("back|arrière|rear|environment");
  });

  it("Liste les caméras + select si plusieurs", () => {
    expect(src).toContain("Html5Qrcode.getCameras");
    expect(src).toContain("cameras.length > 1");
  });

  it("Fallback scan depuis fichier image", () => {
    expect(src).toContain("scanFromFile");
    expect(src).toContain('accept="image/*"');
  });

  it("Cleanup au unmount (scanner.stop + clear)", () => {
    expect(src).toContain("scanner.stop()");
    expect(src).toContain("scanner.clear()");
  });

  it("Props onResult + onError + active + autoStop", () => {
    expect(src).toContain("onResult");
    expect(src).toContain("onError");
    expect(src).toContain("active");
    expect(src).toContain("autoStop");
  });

  it("qrbox responsive (70% min(vw,vh))", () => {
    expect(src).toContain("Math.min(vw, vh) * 0.7");
  });
});

describe("0.56.2 - Page /scan/qr fonctionnelle", () => {
  const p = "app/scan/qr/page.js";
  const src = fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

  it("Importe QrScanner + parseQrContent", () => {
    expect(src).toContain('from "../../QrScanner"');
    expect(src).toContain('from "../../../lib/qrParser"');
  });

  it("État scanning + parsed + history", () => {
    expect(src).toContain("scanning");
    expect(src).toContain("parsed");
    expect(src).toContain("history");
  });

  it("Auto-navigate si url_aveho", () => {
    expect(src).toContain("url_aveho");
    expect(src).toContain("router.push");
  });

  it("Bouton re-scanner après résultat", () => {
    expect(src).toContain("Re-scanner");
    expect(src).toContain("rescan");
  });

  it("Affichage spécifique Vitale (NIR, sexe, naissance)", () => {
    expect(src).toContain('parsed.type === "vitale_qr"');
    expect(src).toContain("Données patient détectées");
    expect(src).toContain("Chercher ce patient");
    expect(src).toContain("Nouveau patient avec ce NIR");
  });

  it("Affichage spécifique GS1 (table AIs)", () => {
    expect(src).toContain('parsed.type === "gs1"');
    expect(src).toContain("Code GS1/UDI");
    expect(src).toContain("Chercher dans le matériel");
  });

  it("Affichage spécifique EAN avec recherche matériel", () => {
    expect(src).toContain('parsed.type === "ean"');
    expect(src).toContain("Chercher matériel par EAN");
  });

  it("Affichage spécifique vCard (nom, tel, email)", () => {
    expect(src).toContain('parsed.type === "vcard"');
    expect(src).toContain("Contact vCard");
  });

  it("Affichage spécifique WiFi (SSID, type)", () => {
    expect(src).toContain('parsed.type === "wifi"');
    expect(src).toContain("Config WiFi");
  });

  it("Historique des 10 derniers scans", () => {
    expect(src).toContain("history");
    expect(src).toContain("slice(0, 9)");
  });

  it("Panneau pédagogie types reconnus", () => {
    expect(src).toContain("Types reconnus");
    expect(src).toContain("TypeBadge");
  });

  it("Avertissement NIR seul non suffisant", () => {
    expect(src).toContain("NIR seul ne suffit pas");
  });
});

describe("0.56.2 - package.json a html5-qrcode", () => {
  it("Dépendance html5-qrcode présente", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.dependencies).toHaveProperty("html5-qrcode");
  });

  it("Version sur lignée 0.56.x", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.(5[6-9]|[6-9]\d)\.\d+-alpha$/);
  });
});
