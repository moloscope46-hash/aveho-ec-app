"use client";
// =============================================================
//  Helper QR code — Alpha 0.22.0
//  Charge qrcode-generator depuis CDN au premier appel.
//  Génère un dataURL PNG (base64) ou SVG selon besoin.
// =============================================================

let _qrPromise = null;

async function loadQR() {
  if (typeof window === "undefined") throw new Error("QR : côté client uniquement");
  if (window.qrcode) return window.qrcode;
  if (_qrPromise) return _qrPromise;
  _qrPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
    s.async = true;
    s.onload = () => resolve(window.qrcode);
    s.onerror = () => reject(new Error("Impossible de charger qrcode-generator depuis le CDN"));
    document.head.appendChild(s);
  });
  return _qrPromise;
}

/**
 * Génère un QR code SVG pour une URL donnée
 * @param {string} text — texte à encoder (généralement une URL)
 * @param {object} opts — { size: 200, margin: 2, errorCorrection: "M" }
 * @returns {Promise<string>} — chaîne SVG inline
 */
export async function generateQR(text, opts = {}) {
  const qrcode = await loadQR();
  const errorCorrection = opts.errorCorrection || "M"; // L, M, Q, H
  const margin = opts.margin ?? 2;
  const size = opts.size || 200;

  // typeNumber=0 → auto-detect taille selon contenu
  const qr = qrcode(0, errorCorrection);
  qr.addData(text);
  qr.make();

  // Génère SVG via la méthode createSvgTag (pratique pour scalabilité)
  return qr.createSvgTag({
    cellSize: Math.max(1, Math.floor(size / (qr.getModuleCount() + margin * 2))),
    margin,
    scalable: true,
  });
}

/**
 * Génère le QR en data URL PNG (utile pour insertion dans PDF)
 * @param {string} text
 * @param {object} opts
 * @returns {Promise<string>} — data:image/png;base64,...
 */
export async function generateQRDataURL(text, opts = {}) {
  const qrcode = await loadQR();
  const errorCorrection = opts.errorCorrection || "M";
  const margin = opts.margin ?? 2;
  const cellSize = opts.cellSize || 4;

  const qr = qrcode(0, errorCorrection);
  qr.addData(text);
  qr.make();

  return qr.createDataURL(cellSize, margin);
}

/**
 * Construit l'URL de vérification publique d'un consentement
 * @param {string} consentId
 * @param {string} hash
 * @returns {string}
 */
export function buildVerifyUrl(consentId, hash) {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  return `${origin}/verifier/${consentId}?h=${encodeURIComponent(hash)}`;
}
