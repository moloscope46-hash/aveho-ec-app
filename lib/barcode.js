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
  // 0.58.71 : AI étendus pour UDI/DM avec longueurs fixes/variables documentées
  // Fixed = longueur stricte ; variable = jusqu'au FNC1 (\x1d) ou fin
  const aiMap = {
    "00":  { key: "sscc", len: 18, fixed: true },
    "01":  { key: "gtin", len: 14, fixed: true },         // GTIN-14
    "02":  { key: "gtin_contained", len: 14, fixed: true },
    "10":  { key: "lot", len: 20, variable: true },
    "11":  { key: "fabrication", len: 6, fixed: true },   // YYMMDD
    "13":  { key: "packaging", len: 6, fixed: true },
    "15":  { key: "best_before", len: 6, fixed: true },
    "17":  { key: "peremption", len: 6, fixed: true },    // YYMMDD
    "20":  { key: "variant", len: 2, fixed: true },
    "21":  { key: "serie", len: 20, variable: true },
    "22":  { key: "consumer_product", len: 29, variable: true },
    "240": { key: "ref_complement", len: 30, variable: true },
    "241": { key: "customer_part_number", len: 30, variable: true },
    "242": { key: "model", len: 6, variable: true },
    "243": { key: "package_component", len: 20, variable: true },
    "250": { key: "secondary_serial", len: 30, variable: true },
    "251": { key: "ref_source", len: 30, variable: true },
    "30":  { key: "quantity_var", len: 8, variable: true },
    "37":  { key: "quantity_count", len: 8, variable: true },
    "710": { key: "nhrn_france", len: 20, variable: true },  // National Healthcare Reimbursement Number (LPP en France pour DM)
    "711": { key: "nhrn_germany", len: 20, variable: true },
    "712": { key: "nhrn_portugal", len: 20, variable: true },
    "713": { key: "nhrn_brazil", len: 20, variable: true },
    "714": { key: "nhrn_china", len: 20, variable: true },
  };

  // Format avec parenthèses humain-lisible : "(01)03400938000146(10)ABC123(17)241231"
  if (code.includes("(")) {
    const regex = /\((\d{2,4})\)([^(]*)/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      const ai = m[1];
      const value = m[2].trim();
      const def = aiMap[ai];
      if (def) result[def.key] = value;
      else result[`ai_${ai}`] = value;
    }
    return result;
  }

  // Format brut avec FNC1 (\x1d ou \u001d) : parse séquentiel.
  // Norme GS1 : FNC1 termine les AI variables ; les AI fixes ont leur longueur dictée par l'AI.
  let s = code.replace(/^]C1/, "").replace(/^]d2/, "");  // strip Code128/DataMatrix prefix
  s = s.replace(/^\x1d/, "");                            // strip FNC1 leading
  const FNC1 = "\x1d";
  let i = 0;
  let safety = 0;
  while (i < s.length && safety++ < 30) {
    // Trouver l'AI (2 à 4 chars selon le code)
    let ai = null;
    for (const candLen of [4, 3, 2]) {
      const cand = s.substr(i, candLen);
      if (aiMap[cand]) { ai = cand; break; }
    }
    if (!ai) break;
    i += ai.length;
    const def = aiMap[ai];
    let value;
    if (def.fixed) {
      value = s.substr(i, def.len);
      i += def.len;
    } else {
      // Variable : lit jusqu'au prochain FNC1 ou fin
      const next = s.indexOf(FNC1, i);
      if (next >= 0) {
        value = s.substring(i, next);
        i = next + 1;  // skip FNC1
      } else {
        value = s.substring(i);
        i = s.length;
      }
    }
    result[def.key] = value;
  }
  return result;
}

/**
 * Construit l'UDI à partir d'un parsing GS1.
 * Retourne { di, pi } où di = Direct Identifier (GTIN), pi = Production Identifier
 * (concaténation lot + série + péremption).
 * @param {Object} parsed - résultat de parseGS1
 * @returns {{di: string|null, pi: string|null}}
 */
export function buildUdi(parsed) {
  if (!parsed) return { di: null, pi: null };
  const di = parsed.gtin || null;
  const piParts = [];
  if (parsed.lot) piParts.push(`(10)${parsed.lot}`);
  if (parsed.serie) piParts.push(`(21)${parsed.serie}`);
  if (parsed.peremption) piParts.push(`(17)${parsed.peremption}`);
  if (parsed.fabrication) piParts.push(`(11)${parsed.fabrication}`);
  const pi = piParts.length > 0 ? piParts.join("") : null;
  return { di, pi };
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

/**
 * 0.58.72 — URL d'image QR code via API publique qrserver.com (zéro dépendance).
 * Retourne une URL pointant vers une image PNG scannable par tout lecteur QR.
 *
 * @param {string} text - contenu à encoder (URL, ID, etc.)
 * @param {number} size - taille en px (défaut 240)
 * @param {string} bgcolor - hex sans # (défaut 'ffffff')
 * @param {string} color - hex sans # (défaut '142131' = NAVY Aveho)
 * @returns {string} URL de l'image QR
 */
export function generateQrCodeUrl(text, size = 240, bgcolor = "ffffff", color = "142131") {
  if (!text) return "";
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=${bgcolor}&color=${color}&margin=10&qzone=2`;
}

/**
 * 0.58.72 — Génère un IMG tag prêt à l'emploi pour étiquette matériel.
 * @param {string} text - URL ou identifiant à encoder
 * @param {Object} opts - { size, label, sublabel }
 * @returns {string} HTML d'un container imprimable
 */
export function generateQrLabelHtml(text, { size = 200, label = "", sublabel = "" } = {}) {
  const url = generateQrCodeUrl(text, size);
  return `<div style="display:inline-block;text-align:center;padding:12px;border:2px dashed #142131;border-radius:8px;background:#fff;font-family:Quicksand,sans-serif">
    <img src="${url}" alt="QR ${text}" style="display:block;margin:0 auto" width="${size}" height="${size}" />
    ${label ? `<div style="margin-top:8px;font-size:13px;font-weight:700;color:#142131">${label}</div>` : ""}
    ${sublabel ? `<div style="font-size:10.5px;color:#5a6878;font-family:Consolas,monospace;margin-top:2px">${sublabel}</div>` : ""}
  </div>`;
}
