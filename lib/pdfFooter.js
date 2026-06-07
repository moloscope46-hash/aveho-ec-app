// =============================================================
//  lib/pdfFooter.js — Footer commun pour PDF BL / devis / commandes
//  0.62.106 : centralise le footer professionnel Aveho
// =============================================================

/**
 * Ajoute un footer pro à un PDF jsPDF.
 *
 * @param {jsPDF} doc - Instance jsPDF
 * @param {object} options - Options du footer
 * @param {string} options.structureNom - Nom de la structure (Aveho EC)
 * @param {string} options.structureAdresse - Adresse complète
 * @param {string} options.structureSiret - SIRET
 * @param {string} options.structureRcs - RCS
 * @param {string} options.structureTel - Téléphone contact
 * @param {string} options.structureEmail - Email contact
 * @param {string} options.structureWeb - Site web
 * @param {string} options.docType - Type de document (BL, Devis, Bon de commande)
 * @param {string} options.docNumero - Numéro du document
 * @param {boolean} options.includeMentions - Inclure mentions légales (par défaut true)
 */
export function addPdfFooter(doc, options = {}) {
  const {
    structureNom = "Aveho EC",
    structureAdresse = "",
    structureSiret = "",
    structureRcs = "",
    structureTel = "",
    structureEmail = "",
    structureWeb = "",
    docType = "Document",
    docNumero = "",
    includeMentions = true,
  } = options;

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const pageCount = doc.internal.getNumberOfPages();
  const footerY = pageHeight - 28; // 28mm depuis le bas

  // Footer sur chaque page
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Ligne séparation gradient navy → teal
    doc.setDrawColor(20, 33, 49);
    doc.setLineWidth(0.5);
    doc.line(15, footerY, pageWidth - 15, footerY);

    // Ligne 1 : nom + adresse structure
    doc.setFontSize(7.5);
    doc.setTextColor(20, 33, 49);
    doc.setFont(undefined, "bold");
    doc.text(structureNom, 15, footerY + 5);
    doc.setFont(undefined, "normal");
    if (structureAdresse) {
      doc.text(structureAdresse, 15, footerY + 9);
    }

    // Ligne 2 : SIRET, RCS, contact
    doc.setFontSize(7);
    doc.setTextColor(90, 104, 120);
    let infoLine = "";
    if (structureSiret) infoLine += `SIRET ${structureSiret}`;
    if (structureRcs) infoLine += `${infoLine ? " · " : ""}RCS ${structureRcs}`;
    if (infoLine) doc.text(infoLine, 15, footerY + 13);

    // Ligne 3 : contact (tel/email/web)
    let contactLine = "";
    if (structureTel) contactLine += `☎ ${structureTel}`;
    if (structureEmail) contactLine += `${contactLine ? "  ✉ " : "✉ "}${structureEmail}`;
    if (structureWeb) contactLine += `${contactLine ? "  🌐 " : "🌐 "}${structureWeb}`;
    if (contactLine) doc.text(contactLine, 15, footerY + 17);

    // Pagination "Page X/Y" à droite
    doc.setFontSize(7);
    doc.setTextColor(124, 200, 200);
    doc.text(`Page ${i}/${pageCount}`, pageWidth - 15, footerY + 5, { align: "right" });

    // Type doc + numéro
    if (docType && docNumero) {
      doc.setTextColor(20, 33, 49);
      doc.setFont(undefined, "bold");
      doc.setFontSize(7);
      doc.text(`${docType} N° ${docNumero}`, pageWidth - 15, footerY + 9, { align: "right" });
      doc.setFont(undefined, "normal");
    }

    // Mentions légales (sur dernière page uniquement)
    if (includeMentions && i === pageCount) {
      doc.setFontSize(6.5);
      doc.setTextColor(138, 152, 168);
      const mentions = "Document généré automatiquement par Aveho EC · Conditions générales de vente applicables · Tout retard de paiement entraîne pénalité au taux légal · Pas d'escompte pour paiement anticipé";
      const split = doc.splitTextToSize(mentions, pageWidth - 30);
      doc.text(split, 15, footerY + 22);
    }
  }
}

/**
 * Footer simplifié pour PDF mono-page
 */
export function addPdfFooterSimple(doc, structureInfo) {
  return addPdfFooter(doc, {
    ...structureInfo,
    includeMentions: false,
  });
}

/**
 * Récupère les infos structure depuis Supabase pour le footer
 *
 * @param {SupabaseClient} supabase - Client Supabase
 * @param {string} structureId - ID de la structure
 * @returns {Promise<object>} Infos structure formatées pour addPdfFooter
 */
export async function getStructureFooterInfo(supabase, structureId) {
  if (!structureId) return {};
  try {
    const { data } = await supabase
      .from("structures")
      .select("*")
      .eq("id", structureId)
      .maybeSingle();
    if (!data) return {};
    return {
      structureNom: data.nom || "Aveho EC",
      structureAdresse: [data.adresse, data.cp, data.ville].filter(Boolean).join(", "),
      structureSiret: data.siret || "",
      structureRcs: data.rcs || data.numero_rcs || "",
      structureTel: data.telephone || "",
      structureEmail: data.email || "",
      structureWeb: data.site_web || "",
    };
  } catch (e) {
    return {};
  }
}
