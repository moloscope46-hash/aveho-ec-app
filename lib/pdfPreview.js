"use client";
// =============================================================
//  pdfPreview (Alpha 0.13)
//  Affiche un aperçu A4 d'un document HTML avant d'imprimer.
//  Permet d'éviter d'imprimer par accident un document mal cadré.
//
//  Usage :
//    openPdfPreview({
//      titre: "Planning Maintenance",
//      html: "...",  // contenu HTML complet (incluant style)
//      filename: "planning-maintenance"  // pour le nom dans la barre
//    })
//
//  Comportement :
//    1. Ouvre une modale fullscreen avec iframe A4 (zoom auto)
//    2. Boutons "Imprimer" et "Annuler"
//    3. À l'impression, le document HTML est passé à window.print
// =============================================================

// 0.57.34 : escape helper defense-in-depth pour le titre injecté dans innerHTML
// En pratique appelé avec des constantes mais on protège quand même au cas où
// du contenu venant de la BDD/utilisateur transiterait par cette fonction
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function openPdfPreview({ titre = "Aperçu", html, filename = "document" }) {
  // 0.57.34 : escape le titre (defense-in-depth)
  const safeTitre = escapeHtml(titre);

  // Créer une div overlay si elle n'existe pas
  let overlay = document.getElementById("aveho-pdf-preview");
  if (overlay) overlay.remove();
  overlay = document.createElement("div");
  overlay.id = "aveho-pdf-preview";
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(20,33,49,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:'Segoe UI',sans-serif";

  overlay.innerHTML = `
    <div style="background:#fff;padding:14px 22px;border-radius:14px 14px 0 0;width:90%;max-width:900px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:11px;letter-spacing:2px;color:#7CC8C8;font-weight:700">APERÇU AVANT IMPRESSION</div>
        <div style="font-size:16px;font-weight:600;color:#142131;margin-top:2px">${safeTitre}</div>
      </div>
      <div style="display:flex;gap:10px">
        <button id="aveho-pdf-cancel" style="padding:9px 18px;background:#fff;border:1px solid #e3e9ee;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600;color:#142131">
          <i class="ti ti-x" style="margin-right:4px"></i> Annuler
        </button>
        <button id="aveho-pdf-print" style="padding:9px 18px;background:#142131;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:600">
          <i class="ti ti-printer" style="margin-right:4px"></i> Imprimer
        </button>
      </div>
    </div>
    <iframe id="aveho-pdf-iframe" style="width:90%;max-width:900px;height:80vh;border:none;background:#fff;border-radius:0 0 14px 14px;box-shadow:0 20px 60px rgba(0,0,0,0.4)"></iframe>
    <p style="color:#cfe0e0;font-size:12px;margin-top:10px">Échap pour fermer · Le format final sera A4 portrait</p>
  `;
  document.body.appendChild(overlay);

  // Alpha 0.18.0 : remplacement de contentDocument.write() (deprecated)
  // par un blob URL chargé via iframe.src — moderne, mieux supporté,
  // et évite les avertissements navigateur.
  const iframe = document.getElementById("aveho-pdf-iframe");
  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;

  function close() {
    overlay.remove();
    URL.revokeObjectURL(blobUrl); // libère la mémoire
    document.removeEventListener("keydown", onEsc);
  }
  function onEsc(e) { if (e.key === "Escape") close(); }
  document.addEventListener("keydown", onEsc);
  document.getElementById("aveho-pdf-cancel").onclick = close;
  document.getElementById("aveho-pdf-print").onclick = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // On ne ferme pas automatiquement : laisser le temps au print dialog
  };
}
