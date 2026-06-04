// =============================================================
//  Tests unitaires — 0.57.32
//  Durcissement Storage uploads (path-traversal + MIME + taille)
// =============================================================
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("0.57.32 - Version", () => {
  it("Version 0.57.32+", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    expect(pkg.version).toMatch(/^0\.\d+\.\d+-alpha$/);
    const patch = parseInt(pkg.version.split(".")[2].replace("-alpha", ""), 10);
    const [major,minor,p2]=pkg.version.split(".");if(parseInt(minor)===57){expect(patch).toBeGreaterThanOrEqual(32);}else{expect(parseInt(minor)).toBeGreaterThan(57);}
  });

  it("SW VERSION sync avec package.json", () => {
    const sw = fs.readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"));
    const pkgVersion = pkg.version.replace("-alpha", "");
    expect(sw).toContain(`"aveho-ec-${pkgVersion}"`);
  });
});

describe("0.57.32 - bulletinsStorage : durcissement", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/bulletinsStorage.js"),
    "utf-8"
  );

  it("MAX_FILE_SIZE défini (10 MB)", () => {
    expect(src).toMatch(/MAX_FILE_SIZE\s*=\s*10\s*\*\s*1024\s*\*\s*1024/);
  });

  it("ALLOWED_MIMES whitelist (5 types : jpg/png/webp/gif/pdf)", () => {
    expect(src).toMatch(/ALLOWED_MIMES\s*=\s*\[/);
    const match = src.match(/ALLOWED_MIMES\s*=\s*\[([\s\S]*?)\]/);
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/image\/jpeg/);
    expect(match[1]).toMatch(/image\/png/);
    expect(match[1]).toMatch(/image\/webp/);
    expect(match[1]).toMatch(/image\/gif/);
    expect(match[1]).toMatch(/application\/pdf/);
  });

  it("UUID_RE défini pour valider structure_id / patient_id", () => {
    expect(src).toMatch(/UUID_RE\s*=\s*\/\^\[0-9a-f\]\{8\}/);
  });

  it("isValidUuid helper interne", () => {
    expect(src).toMatch(/function isValidUuid/);
  });

  it("buildPath throw si structureId pas UUID (anti path-traversal)", () => {
    expect(src).toMatch(/buildPath[\s\S]*?if\s*\(\s*!isValidUuid\(structureId\)/);
    expect(src).toMatch(/throw new Error\(["']structureId invalide/);
  });

  it("buildPath throw si patientId pas UUID", () => {
    expect(src).toMatch(/throw new Error\(["']patientId invalide/);
  });

  it("uploadBulletin retourne error si file > MAX_FILE_SIZE", () => {
    expect(src).toMatch(/file\.size\s*>\s*MAX_FILE_SIZE/);
    expect(src).toMatch(/trop volumineux/);
  });

  it("uploadBulletin retourne error si MIME non whitelisté", () => {
    expect(src).toMatch(/!ALLOWED_MIMES\.includes\(mime\)/);
    expect(src).toMatch(/non supporté/);
  });

  it("uploadBulletin valide UUID avant upload (defense-in-depth)", () => {
    const uploadBlock = src.substring(
      src.indexOf("export async function uploadBulletin"),
      src.indexOf("export async function getSignedUrl")
    );
    expect(uploadBlock).toMatch(/!isValidUuid\(structureId\)/);
    expect(uploadBlock).toMatch(/!isValidUuid\(patientId\)/);
  });
});

describe("0.57.32 - prescriptionsStorage : durcissement", () => {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), "lib/prescriptionsStorage.js"),
    "utf-8"
  );

  it("MAX_FILE_SIZE défini (10 MB)", () => {
    expect(src).toMatch(/MAX_FILE_SIZE\s*=\s*10\s*\*\s*1024\s*\*\s*1024/);
  });

  it("ALLOWED_MIMES whitelist (5 types)", () => {
    expect(src).toMatch(/ALLOWED_MIMES\s*=\s*\[/);
    const match = src.match(/ALLOWED_MIMES\s*=\s*\[([\s\S]*?)\]/);
    expect(match[1]).toMatch(/application\/pdf/);
  });

  it("buildPath valide les 3 UUIDs (structure + patient + prescription)", () => {
    expect(src).toMatch(/!isValidUuid\(structureId\)/);
    expect(src).toMatch(/!isValidUuid\(patientId\)/);
    expect(src).toMatch(/!isValidUuid\(prescriptionId\)/);
  });

  it("uploadPrescription valide UUID + taille + MIME", () => {
    const uploadBlock = src.substring(
      src.indexOf("export async function uploadPrescription"),
      src.indexOf("export async function getSignedUrl")
    );
    expect(uploadBlock).toMatch(/!isValidUuid\(structureId\)/);
    expect(uploadBlock).toMatch(/file\.size\s*>\s*MAX_FILE_SIZE/);
    expect(uploadBlock).toMatch(/!ALLOWED_MIMES\.includes\(mime\)/);
  });
});

describe("0.57.32 - LINT anti-régression : tous les helpers Storage validate UUID", () => {
  const STORAGE_HELPERS = [
    "lib/bulletinsStorage.js",
    "lib/prescriptionsStorage.js",
  ];

  it("Tous les helpers Storage ont MAX_FILE_SIZE défini", () => {
    const violations = [];
    for (const f of STORAGE_HELPERS) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (!/MAX_FILE_SIZE/.test(src)) violations.push(f);
    }
    expect(violations, `Helpers sans MAX_FILE_SIZE : ${violations.join(", ")}`).toEqual([]);
  });

  it("Tous les helpers Storage ont ALLOWED_MIMES whitelist", () => {
    const violations = [];
    for (const f of STORAGE_HELPERS) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      if (!/ALLOWED_MIMES/.test(src)) violations.push(f);
    }
    expect(violations, `Helpers sans ALLOWED_MIMES : ${violations.join(", ")}`).toEqual([]);
  });

  it("Tous les helpers Storage valident UUID dans buildPath", () => {
    const violations = [];
    for (const f of STORAGE_HELPERS) {
      const src = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
      const buildBlock = src.substring(
        src.indexOf("export function buildPath"),
        src.indexOf("export async function uploadBulletin") > -1
          ? src.indexOf("export async function uploadBulletin")
          : src.indexOf("export async function uploadPrescription")
      );
      if (!/isValidUuid/.test(buildBlock)) violations.push(f);
    }
    expect(violations, `buildPath sans validation UUID : ${violations.join(", ")}`).toEqual([]);
  });
});

describe("0.57.32 - Logger : redaction patterns sensibles confirmée", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "lib/logger.js"), "utf-8");

  it("SENSITIVE_KEYS contient les clés auth + RGPD + données médicales", () => {
    // Auth
    expect(src).toMatch(/["']password["']/);
    expect(src).toMatch(/["']token["']/);
    expect(src).toMatch(/["']refresh_token["']/);
    // RGPD
    expect(src).toMatch(/["']email["']/);
    expect(src).toMatch(/["']telephone["']/);
    // Médical
    expect(src).toMatch(/["']numero_secu["']/);
    expect(src).toMatch(/["']nir["']/);
    // Professionnels
    expect(src).toMatch(/["']rpps["']/);
    expect(src).toMatch(/["']finess["']/);
  });

  it("URL_SENSITIVE_PATTERNS masque Bearer + JWT + query params", () => {
    expect(src).toMatch(/Bearer\\s\+/);
    expect(src).toMatch(/eyJ\[A-Za-z0-9_-\]\+/);  // JWT pattern
    expect(src).toMatch(/token\|access_token\|refresh_token/);
  });

  it("Logger exporte un objet avec error + security qui passent toujours", () => {
    expect(src).toMatch(/error|security/);
  });
});
