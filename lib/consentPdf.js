"use client";
// =============================================================
//  consentPdf — Génération PDF du consentement RGPD
//  Alpha 0.22.0
//
//  Utilise jsPDF chargé dynamiquement depuis CDN (cohérent avec
//  la stratégie 0.15+ pour les modules lourds).
//  Format A4 portrait, intègre le texte, la signature image
//  (via URL signée Storage) et le QR code de vérification.
// =============================================================
// 0.57.10 : imports retirés (consentementToHtml non utilisés)

import { generateQRDataURL, buildVerifyUrl } from "./qrcode";
import { logger } from "./logger";

let _jspdfPromise = null;
// 0.57.37 : SRI ajouté sur le script jsPDF (defense against CDN compromise)
async function loadJsPdf() {
  if (typeof window === "undefined") throw new Error("PDF : côté client uniquement");
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (_jspdfPromise) return _jspdfPromise;
  _jspdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
    s.integrity = "sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/";
    s.crossOrigin = "anonymous";
    s.async = true;
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => reject(new Error("Impossible de charger jsPDF (CDN down ou SRI mismatch)"));
    document.head.appendChild(s);
  });
  return _jspdfPromise;
}

// Charge une image (URL) en data URL pour l'intégrer au PDF
function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Lecture image impossible"));
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

// Texte du markdown → tableau de paragraphes pour jsPDF
// jsPDF n'interprète pas le markdown, donc on dégrade en texte simple
// avec gestion des sauts de ligne et des sections.
function markdownToPlainBlocks(md) {
  const blocks = [];
  const lines = md.split("\n");
  let currentParagraph = "";

  function flush() {
    if (currentParagraph.trim()) {
      blocks.push({ type: "p", text: currentParagraph.trim() });
      currentParagraph = "";
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      flush();
      continue;
    }
    if (trimmed === "---") {
      flush();
      blocks.push({ type: "hr" });
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flush();
      blocks.push({ type: "li", text: trimmed.slice(2) });
      continue;
    }
    // Détecter en-tête bold (**XXX**) seuls sur la ligne
    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      flush();
      blocks.push({ type: "h", text: trimmed.replace(/\*\*/g, "") });
      continue;
    }
    // Sinon : ajouter au paragraphe en cours (sans la syntaxe markdown gras intra-ligne)
    const clean = trimmed.replace(/\*\*([^*]+)\*\*/g, "$1");
    currentParagraph += (currentParagraph ? " " : "") + clean;
  }
  flush();
  return blocks;
}

/**
 * Génère et télécharge un PDF du consentement signé
 * @param {object} consent — ligne consentement_rgpd
 * @param {object} opts — { signatureUrl?, supabase? }
 *   signatureUrl : URL signée Storage de la signature PNG (récupérée en amont)
 *   supabase : client supabase pour générer l'URL signée si besoin
 */
export async function generateConsentPDF(consent, opts = {}) {
  const jsPDF = await loadJsPdf();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentW = pageWidth - 2 * margin;
  let y = margin;

  // --- En-tête bandeau navy
  doc.setFillColor(20, 33, 49); // #142131
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CONSENTEMENT RGPD", margin, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${consent.collectivite_nom || ""}${consent.etablissement_nom ? " — " + consent.etablissement_nom : ""}`, margin, 19);
  y = 32;

  // --- Bloc identité patient + statut (encadré)
  doc.setFillColor(244, 247, 250);
  doc.setDrawColor(227, 233, 238);
  doc.roundedRect(margin, y, contentW, 28, 2, 2, "FD");
  doc.setTextColor(20, 33, 49);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Patient :", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(consent.patient_nom_prenom || "—", margin + 28, y + 6);

  if (consent.patient_date_naissance) {
    doc.setFont("helvetica", "bold");
    doc.text("Né(e) le :", margin + 4, y + 12);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(consent.patient_date_naissance).toLocaleDateString("fr-FR"), margin + 28, y + 12);
  }
  if (consent.patient_numero_dossier) {
    doc.setFont("helvetica", "bold");
    doc.text("Dossier :", margin + 90, y + 12);
    doc.setFont("helvetica", "normal");
    doc.text(consent.patient_numero_dossier, margin + 110, y + 12);
  }

  // Badge statut
  const isSigne = consent.statut === "signe";
  doc.setFillColor(...(isSigne ? [232, 245, 233] : [254, 240, 238]));
  doc.setDrawColor(...(isSigne ? [90, 160, 90] : [192, 57, 43]));
  doc.roundedRect(margin + 4, y + 18, 60, 6, 1, 1, "FD");
  doc.setTextColor(...(isSigne ? [46, 111, 51] : [192, 57, 43]));
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(isSigne ? "✓ SIGNÉ" : "✗ REFUSÉ", margin + 6, y + 22);
  if (consent.date_expiration) {
    doc.setTextColor(108, 122, 137);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Valide jusqu'au ${new Date(consent.date_expiration).toLocaleDateString("fr-FR")}`, margin + 68, y + 22);
  }
  y += 34;

  // --- Texte du consentement
  doc.setTextColor(42, 58, 72);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const blocks = markdownToPlainBlocks(consent.texte_consentement || "");

  function ensureSpace(needed) {
    if (y + needed > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
  }

  for (const block of blocks) {
    if (block.type === "hr") {
      ensureSpace(4);
      doc.setDrawColor(207, 213, 219);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      continue;
    }
    if (block.type === "h") {
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 95, 165);
      const lines = doc.splitTextToSize(block.text, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 1;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(42, 58, 72);
      continue;
    }
    if (block.type === "li") {
      const lines = doc.splitTextToSize("• " + block.text, contentW - 4);
      ensureSpace(lines.length * 4 + 1);
      doc.text(lines, margin + 4, y);
      y += lines.length * 4 + 1;
      continue;
    }
    // p
    const lines = doc.splitTextToSize(block.text, contentW);
    ensureSpace(lines.length * 4 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 2;
  }

  // --- Bloc signature + QR (nouvelle page si nécessaire)
  ensureSpace(80);
  y += 4;
  doc.setDrawColor(207, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 33, 49);
  doc.text("Signature électronique", margin, y);
  y += 6;

  // Image signature (si statut signé)
  if (isSigne && opts.signatureUrl) {
    try {
      const dataUrl = await loadImageAsDataURL(opts.signatureUrl);
      doc.setDrawColor(207, 213, 219);
      doc.rect(margin, y, 80, 32);
      doc.addImage(dataUrl, "PNG", margin + 1, y + 1, 78, 30);
    } catch (e) {
      logger.warn("Signature image non chargeable :", e);
      doc.setTextColor(192, 57, 43);
      doc.setFontSize(9);
      doc.text("[Image de signature non chargeable]", margin, y + 16);
    }
  } else {
    doc.setTextColor(108, 122, 137);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(isSigne ? "[Signature manquante]" : "[Consentement refusé — pas de signature]", margin, y + 16);
  }

  // Bloc métadonnées de signature (à droite de l'image)
  const metaX = margin + 90;
  let metaY = y + 4;
  doc.setTextColor(20, 33, 49);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Signataire :", metaX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(consent.signe_par_nom || consent.patient_nom_prenom || "—", metaX + 22, metaY);
  metaY += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Rôle :", metaX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(consent.signe_par_role === "representant_legal" ? "Représentant légal" : "Patient", metaX + 22, metaY);
  metaY += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Date :", metaX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(consent.date_signature).toLocaleString("fr-FR"), metaX + 22, metaY);
  metaY += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Recueilli par :", metaX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(consent.recueilli_par_nom || consent.recueilli_par_email || "—", metaX + 22, metaY);
  metaY += 4;

  if (consent.signature_hash) {
    doc.setFont("helvetica", "bold");
    doc.text("Hash SHA-256 :", metaX, metaY);
    doc.setFont("courier", "normal");
    doc.setFontSize(6);
    // Split du hash sur 2 lignes pour lisibilité
    const half = consent.signature_hash.length / 2;
    doc.text(consent.signature_hash.slice(0, half), metaX, metaY + 4);
    doc.text(consent.signature_hash.slice(half), metaX, metaY + 7);
    doc.setFontSize(8);
  }

  y += 36;

  // --- QR code de vérification (uniquement si signé + hash dispo)
  if (isSigne && consent.signature_hash) {
    try {
      const verifyUrl = buildVerifyUrl(consent.id, consent.signature_hash);
      const qrDataUrl = await generateQRDataURL(verifyUrl, { errorCorrection: "M", cellSize: 4, margin: 2 });
      ensureSpace(40);
      doc.setFillColor(244, 247, 250);
      doc.setDrawColor(207, 213, 219);
      doc.roundedRect(margin, y, contentW, 32, 2, 2, "FD");

      doc.addImage(qrDataUrl, "PNG", margin + 3, y + 3, 26, 26);

      doc.setTextColor(20, 33, 49);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Vérification d'intégrité", margin + 33, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(42, 58, 72);
      const verifText = doc.splitTextToSize(
        "Scannez ce code avec votre smartphone pour vérifier en ligne l'authenticité et l'intégrité de ce consentement. La vérification compare le hash de la signature avec celui enregistré dans notre base de données.",
        contentW - 36
      );
      doc.text(verifText, margin + 33, y + 12);

      doc.setFontSize(6);
      doc.setTextColor(108, 122, 137);
      doc.text(`URL : ${verifyUrl.length > 80 ? verifyUrl.slice(0, 77) + "..." : verifyUrl}`, margin + 33, y + 28);

      y += 36;
    } catch (e) {
      logger.warn("QR code non généré :", e);
    }
  }

  // --- Footer sur chaque page (pied de page avec numérotation)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(108, 122, 137);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Aveho — Espace Collectivité · Consentement RGPD · ${consent.collectivite_nom || ""}`,
      margin,
      pageHeight - 10
    );
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    doc.text(
      `Document généré le ${new Date().toLocaleString("fr-FR")}`,
      margin,
      pageHeight - 6
    );
  }

  // --- Nom de fichier + télécharger
  const patientSlug = (consent.patient_nom_prenom || "patient")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dateSlug = new Date(consent.date_signature).toISOString().slice(0, 10);
  const filename = `consentement-rgpd-${patientSlug}-${dateSlug}.pdf`;

  doc.save(filename);
  return filename;
}
