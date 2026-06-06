// =============================================================
//  lib/barcode.js (0.58.67)
//
//  Génération + validation de codes-barres EAN13 / GS1-128.
//  Utilisé dans la fiche article pour auto-générer ou valider.
// =============================================================

/**
 * Calcule le checksum EAN13 (13ème chiffre).
 * @param {string} code12 - 12 chiffres
 * @returns {string} - chiffre de contrôle (0-9)
 */
export function ean13Checksum(code12) {
  if (!/^\d{12}$/.test(code12)) throw new Error("EAN13 base doit faire 12 chiffres");
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Valide un code EAN13 complet.
 * @param {string} code - 13 chiffres
 * @returns {boolean}
 */
export function isValidEan13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13Checksum(code.slice(0, 12)) === code[12];
}

/**
 * Génère un EAN13 valide avec un préfixe (par défaut : 200-299 pour usage interne).
 * @param {string} [prefix="200"] - préfixe à 3 chiffres
 * @returns {string} - EAN13 valide
 */
export function generateEan13(prefix = "200") {
  if (!/^\d{3}$/.test(prefix)) throw new Error("Préfixe doit faire 3 chiffres");
  const random9 = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  const base12 = prefix + random9;
  return base12 + ean13Checksum(base12);
}

/**
 * Détecte le type de code-barres à partir de son contenu.
 * @param {string} code
 * @returns {"EAN13" | "EAN8" | "CODE128" | "GS1-128" | "DATAMATRIX" | "UNKNOWN"}
 */
export function detectBarcodeType(code) {
  if (!code) return "UNKNOWN";
  if (/^\d{13}$/.test(code) && isValidEan13(code)) return "EAN13";
  if (/^\d{8}$/.test(code)) return "EAN8";
  if (code.startsWith("(") && /^\(\d{2,4}\)/.test(code)) return "GS1-128";   // AI format
  if (/^\d{14,}$/.test(code)) return "GS1-128";
  return "CODE128";
}

/**
 * Parse un code GS1-128 et extrait les AI (Application Identifiers).
 * Codes courants : 01=GTIN, 10=Lot, 17=Date péremption, 21=Série, 11=Date fabrication
 * @param {string} code - ex: "(01)03400938000146(10)ABC123(17)241231"
 * @returns {Object} - { gtin, lot, peremption, serie, fabrication }
 */
export function parseGS1(code) {
  if (!code) return {};
  const result = {};
  // Normaliser : enlever parenthèses pour parsing
  const clean = code.replace(/\(/g, "").replace(/\)/g, " ").trim();
  // Match AI patterns
  const aiMap = {
    "01": { key: "gtin", len: 14 },        // GTIN-14
    "10": { key: "lot", len: 20, variable: true },
    "11": { key: "fabrication", len: 6 },  // YYMMDD
    "17": { key: "peremption", len: 6 },   // YYMMDD
    "21": { key: "serie", len: 20, variable: true },
    "240": { key: "ref_complement", len: 30, variable: true },
  };
  // Si parenthèses présentes, parse par tokens
  if (code.includes("(")) {
    const regex = /\((\d{2,4})\)([^(]+)/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      const ai = m[1];
      const value = m[2];
      const def = aiMap[ai];
      if (def) result[def.key] = value;
    }
  }
  return result;
}

/**
 * Formate une date GS1 YYMMDD en ISO (YYYY-MM-DD).
 * @param {string} yymmdd
 * @returns {string|null}
 */
export function formatGS1Date(yymmdd) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const fullYear = yy < 70 ? 2000 + yy : 1900 + yy;
  return `${fullYear}-${mm}-${dd}`;
}

/**
 * Génère un SVG simple barcode EAN13 (basique, sans dépendance).
 * Pour usage production préférer une lib type bwip-js, mais celui-ci suffit pour aperçu.
 * @param {string} code - EAN13 valide
 * @returns {string} - SVG string
 */
export function generateEan13Svg(code) {
  if (!isValidEan13(code)) return null;
  // Pattern EAN13 simplifié (vrai EAN13 = encodage L/G/R complexe)
  // Pour vrai usage, importer bwip-js dynamically.
  const w = 200, h = 80;
  // Rendu visuel approximatif : barres alternées + texte sous le code
  let bars = "";
  for (let i = 0; i < code.length * 7; i++) {
    const digit = parseInt(code[Math.floor(i / 7)], 10);
    const x = 10 + i * 1.5;
    const isBlack = ((i + digit) % 3) !== 0;
    if (isBlack) bars += `<rect x="${x}" y="10" width="1.2" height="50" fill="#142131"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="background:#fff">
    ${bars}
    <text x="100" y="74" font-family="Consolas,monospace" font-size="11" font-weight="700" fill="#142131" text-anchor="middle">${code}</text>
  </svg>`;
}
