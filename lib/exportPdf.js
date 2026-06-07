// =============================================================
//  Helper Export PDF (Alpha 0.4 + 0.62.77 footer logo structure)
//  Génère un PDF en s'appuyant sur la fonction "Imprimer" du navigateur.
//
//  Usage :
//    import { exportPDF } from "../../lib/exportPdf";
//    exportPDF({
//      titre: "Liste des patients - Hôpital Cédric",
//      sousTitre: "Édition du 29/05/2026",
//      rows: [...],
//      columns: [{key:"nom",label:"Nom"},{key:"prenom",label:"Prénom"}],
//      structure: { nom, siret, telephone, email, logo_url },  // 0.62.77
//    });
// =============================================================

export function exportPDF({ titre, sousTitre, rows, columns, footer, structure }) {
  if (!rows || rows.length === 0) {
    alert("Aucune donnée à exporter.");
    return;
  }
  const esc = (v) => v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const body = rows.map((r) => {
    const tds = columns.map((c) => {
      const val = c.render ? c.render(r) : r[c.key];
      const s = (typeof val === "string" || typeof val === "number") ? val : "";
      return `<td>${esc(s)}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  // 0.62.77 : Header avec logo structure si fourni
  const headerLogoBlock = (structure?.logo_url) ? `
    <div class="head-with-logo">
      <img src="${esc(structure.logo_url)}" alt="Logo" class="head-logo" />
      <div class="head-text">
        <div class="eyebrow">${esc(structure?.nom || "AVEHO — ESPACE COLLECTIVITÉ")}</div>
        <h1>${esc(titre)}</h1>
        ${sousTitre ? `<div class="sub">${esc(sousTitre)}</div>` : ""}
      </div>
    </div>` : `
    <div>
      <div class="eyebrow">${esc(structure?.nom || "AVEHO — ESPACE COLLECTIVITÉ")}</div>
      <h1>${esc(titre)}</h1>
      ${sousTitre ? `<div class="sub">${esc(sousTitre)}</div>` : ""}
    </div>`;

  // 0.62.77 : Footer structure (logo + nom + SIRET + tel + email)
  const structureFooter = structure ? `
    <div class="footer-structure">
      ${structure.logo_url ? `<img src="${esc(structure.logo_url)}" alt="" class="footer-logo" />` : ""}
      <div class="footer-info">
        ${structure.nom ? `<div class="footer-nom">${esc(structure.nom)}</div>` : ""}
        <div class="footer-meta">
          ${structure.siret ? `SIRET ${esc(structure.siret)}` : ""}
          ${structure.siret && structure.telephone ? " · " : ""}
          ${structure.telephone ? `<span>📞 ${esc(structure.telephone)}</span>` : ""}
          ${(structure.siret || structure.telephone) && structure.email ? " · " : ""}
          ${structure.email ? `<span>✉ ${esc(structure.email)}</span>` : ""}
        </div>
      </div>
    </div>` : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(titre)}</title>
    <style>
      @page { margin: 14mm; size: A4; }
      *{box-sizing:border-box}
      body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#142131;margin:0;padding:0}
      .head{border-bottom:3px solid #7CC8C8;padding-bottom:10px;margin-bottom:18px}
      .head-with-logo{display:flex;align-items:center;gap:14px}
      .head-logo{width:60px;height:60px;object-fit:contain;border-radius:8px;background:#fafbfc;padding:4px}
      .head-text{flex:1}
      .eyebrow{color:#7CC8C8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
      h1{margin:6px 0 2px;font-size:20px;font-weight:700}
      .sub{color:#6c7a89;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#142131;color:#fff;text-align:left;padding:8px 10px;font-weight:600}
      td{padding:6px 10px;border-bottom:1px solid #e3e9ee}
      tbody tr:nth-child(odd){background:#fafbfc}
      .foot{margin-top:24px;color:#9aa7b4;font-size:10px;text-align:center;border-top:1px solid #e3e9ee;padding-top:10px}
      /* 0.62.77 : Footer structure */
      .footer-structure{margin-top:18px;padding-top:12px;border-top:2px solid #7CC8C8;display:flex;align-items:center;gap:12px}
      .footer-logo{width:44px;height:44px;object-fit:contain;border-radius:6px;background:#fafbfc;padding:3px;flex-shrink:0}
      .footer-info{flex:1}
      .footer-nom{font-size:12px;font-weight:700;color:#142131}
      .footer-meta{font-size:10px;color:#6c7a89;margin-top:2px;line-height:1.5}
    </style></head>
    <body>
      <div class="head">
        ${headerLogoBlock}
      </div>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${structureFooter}
      <div class="foot">${esc(footer || `Document généré le ${new Date().toLocaleString("fr-FR")} — ${rows.length} ligne(s)`)}</div>
    </body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=900,height=700");
  if (!w) { URL.revokeObjectURL(url); alert("Impossible d'ouvrir la fenêtre d'impression (popup bloquée ?)."); return; }
  setTimeout(() => {
    try { w.print(); } catch {}
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 500);
}

// =============================================================
//  Helper pour charger la structure courante (avec cache localStorage)
// =============================================================
export async function loadStructureForPDF(supabase, structureId) {
  if (!structureId) return null;
  // Cache localStorage 5 min
  try {
    const cached = JSON.parse(localStorage.getItem(`av-struct-pdf-${structureId}`) || "null");
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data;
  } catch {}

  try {
    const { data } = await supabase
      .from("structures")
      .select("nom, siret, telephone, email, logo_url, adresse, cp, ville")
      .eq("id", structureId)
      .maybeSingle();
    if (data) {
      try { localStorage.setItem(`av-struct-pdf-${structureId}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
    }
    return data;
  } catch {
    return null;
  }
}
