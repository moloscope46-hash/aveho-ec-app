// =============================================================
//  Helper Export PDF (Alpha 0.4)
//  Génère un PDF en s'appuyant sur la fonction "Imprimer" du navigateur
//  (qui propose "Enregistrer en PDF" comme destination). C'est plus léger
//  qu'embarquer une lib PDF (jsPDF, pdfmake) qui ferait grossir le bundle.
//
//  Usage :
//    import { exportPDF } from "../../lib/exportPdf";
//    exportPDF({
//      titre: "Liste des patients - Hôpital Cédric",
//      sousTitre: "Édition du 29/05/2026",
//      rows: [...],
//      columns: [{key:"nom",label:"Nom"},{key:"prenom",label:"Prénom"}],
//    });
// =============================================================

export function exportPDF({ titre, sousTitre, rows, columns, footer }) {
  if (!rows || rows.length === 0) {
    alert("Aucune donnée à exporter.");
    return;
  }
  const esc = (v) => v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const body = rows.map((r) => {
    const tds = columns.map((c) => {
      const val = c.render ? c.render(r) : r[c.key];
      // Si render retourne du JSX, on prend juste le texte
      const s = (typeof val === "string" || typeof val === "number") ? val : "";
      return `<td>${esc(s)}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(titre)}</title>
    <style>
      @page { margin: 14mm; size: A4; }
      *{box-sizing:border-box}
      body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#142131;margin:0;padding:0}
      .head{border-bottom:3px solid #7CC8C8;padding-bottom:10px;margin-bottom:18px}
      .eyebrow{color:#7CC8C8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
      h1{margin:6px 0 2px;font-size:20px;font-weight:700}
      .sub{color:#6c7a89;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#142131;color:#fff;text-align:left;padding:8px 10px;font-weight:600}
      td{padding:6px 10px;border-bottom:1px solid #e3e9ee}
      tbody tr:nth-child(odd){background:#fafbfc}
      .foot{margin-top:24px;color:#9aa7b4;font-size:10px;text-align:center;border-top:1px solid #e3e9ee;padding-top:10px}
    </style></head>
    <body>
      <div class="head">
        <div class="eyebrow">AVEHO — ESPACE COLLECTIVITÉ</div>
        <h1>${esc(titre)}</h1>
        ${sousTitre ? `<div class="sub">${esc(sousTitre)}</div>` : ""}
      </div>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="foot">${esc(footer || `Document généré le ${new Date().toLocaleString("fr-FR")} — ${rows.length} ligne(s)`)}</div>
    </body></html>`;

  // Alpha 0.18.0 : blob URL au lieu de document.write() (deprecated)
  // Ouvre une nouvelle fenêtre avec le HTML servi en blob,
  // ce qui évite les warnings et fonctionne mieux avec les CSP modernes.
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=900,height=700");
  if (!w) { URL.revokeObjectURL(url); alert("Impossible d'ouvrir la fenêtre d'impression (popup bloquée ?)."); return; }
  // Laisser le temps au rendu puis ouvrir la boîte d'impression
  setTimeout(() => {
    try { w.print(); } catch {}
    // Libère le blob après 30s (le temps de l'impression)
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 500);
}
