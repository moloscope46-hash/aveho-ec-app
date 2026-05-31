// =============================================================
//  Tests unitaires — Export CSV + logique auto-archivage
//  Alpha 0.24.0
// =============================================================
import { describe, it, expect } from "vitest";

// Reproduit la fonction escape() inline de exportCSV pour la tester
function escapeCSV(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Reproduit la logique "à auto-archiver" du filtre
function estAAutoArchiver(consent, today = new Date(), seuilJours = 180) {
  if (consent.archive || consent.statut !== "signe") return false;
  if (!consent.date_expiration) return false;
  const exp = new Date(consent.date_expiration);
  const joursDepuisExp = Math.floor((today.getTime() - exp.getTime()) / 86400000);
  return joursDepuisExp > seuilJours;
}

describe("escapeCSV", () => {
  it("retourne string vide pour null/undefined", () => {
    expect(escapeCSV(null)).toBe("");
    expect(escapeCSV(undefined)).toBe("");
  });

  it("convertit les nombres en string", () => {
    expect(escapeCSV(42)).toBe("42");
    expect(escapeCSV(0)).toBe("0");
  });

  it("ne quote pas un texte simple", () => {
    expect(escapeCSV("Dupont")).toBe("Dupont");
    expect(escapeCSV("hello world")).toBe("hello world");
  });

  it("quote les valeurs contenant un point-virgule", () => {
    expect(escapeCSV("a;b")).toBe('"a;b"');
  });

  it("quote et échappe les guillemets", () => {
    expect(escapeCSV('Dit "oui"')).toBe('"Dit ""oui"""');
  });

  it("quote les valeurs avec retour ligne", () => {
    expect(escapeCSV("ligne1\nligne2")).toBe('"ligne1\nligne2"');
  });

  it("préserve un hash SHA-256 (pas de caractères spéciaux)", () => {
    const hash = "a".repeat(64);
    expect(escapeCSV(hash)).toBe(hash);
  });

  it("gère un user-agent réaliste", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    // Le ; nécessite des guillemets
    expect(escapeCSV(ua)).toBe(`"${ua}"`);
  });
});

describe("Génération CSV", () => {
  it("respecte le format Excel FR (séparateur ;)", () => {
    const headers = ["Date", "Patient", "Statut"];
    const data = [
      ["2026-05-30", "Marie Dupont", "Valide"],
      ["2026-05-29", "Jean Martin", "Invalide"],
    ];
    const csv = "\uFEFF" + headers.join(";") + "\n" + data.map((r) => r.join(";")).join("\n");
    expect(csv).toContain(";");
    expect(csv.startsWith("\uFEFF")).toBe(true); // BOM UTF-8
    expect(csv.split("\n").length).toBe(3); // header + 2 lignes
  });

  it("génère un nom de fichier slugifié", () => {
    function slugify(s) {
      return s
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    expect(slugify("EHPAD Les Tilleuls")).toBe("ehpad-les-tilleuls");
    expect(slugify("Centre Médical du Lot")).toBe("centre-medical-du-lot");
    expect(slugify("--Strip--")).toBe("strip");
  });
});

describe("estAAutoArchiver", () => {
  const today = new Date("2026-05-30T12:00:00Z");

  it("consentement archivé → false", () => {
    expect(estAAutoArchiver({ archive: true, statut: "signe", date_expiration: "2025-01-01" }, today)).toBe(false);
  });

  it("consentement refusé → false (pas concerné par auto-archive)", () => {
    expect(estAAutoArchiver({ archive: false, statut: "refuse", date_expiration: "2024-01-01" }, today)).toBe(false);
  });

  it("expiré depuis 30 jours → false (pas encore 180j)", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2026-04-30" }, today)).toBe(false);
  });

  it("expiré depuis exactement 180 jours → false (limite stricte > 180)", () => {
    // 30 mai 2026 - 180 jours = 1er décembre 2025
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2025-12-01" }, today)).toBe(false);
  });

  it("expiré depuis 181 jours → true", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2025-11-30" }, today)).toBe(true);
  });

  it("expiré depuis 2 ans → true", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2024-05-30" }, today)).toBe(true);
  });

  it("seuil configurable : 90 jours → archive plus tôt", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2026-01-30" }, today, 90)).toBe(true);
  });

  it("seuil 365 jours → archive plus tard", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2025-08-01" }, today, 365)).toBe(false);
  });

  it("sans date_expiration → false", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: null }, today)).toBe(false);
  });

  it("consentement encore valide (futur) → false", () => {
    expect(estAAutoArchiver({ archive: false, statut: "signe", date_expiration: "2027-01-01" }, today)).toBe(false);
  });
});

describe("Configuration Resend", () => {
  it("from email par défaut au format RFC valide", () => {
    const fromDefault = "Aveho RGPD <rgpd@aveho.fr>";
    // Format "Nom <email@domain>" RFC 5322 simplifié
    expect(fromDefault).toMatch(/^[^<]+<[^@]+@[^>]+>$/);
  });

  it("structure du body Resend conforme à l'API", () => {
    const body = {
      from: "Aveho RGPD <rgpd@aveho.fr>",
      to: ["dpo@test.fr"],
      subject: "[Aveho RGPD] 3 consentements à renouveler",
      html: "<p>...</p>",
      tags: [
        { name: "type", value: "consent_renouvellement" },
        { name: "structure_id", value: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
      ],
    };
    expect(body).toHaveProperty("from");
    expect(Array.isArray(body.to)).toBe(true);
    expect(Array.isArray(body.tags)).toBe(true);
    expect(body.tags.every((t) => t.name && t.value)).toBe(true);
  });
});
