// =============================================================
//  Helper d'export — Alpha 0.3
//  Exporte une liste de lignes (array d'objets) en fichier CSV
//  Excel-compatible (BOM UTF-8, séparateur ;, encodage Windows-friendly).
//  Usage : exportCSV("patients.csv", rows, [{key:"nom",label:"Nom"},...])
// =============================================================

export function exportCSV(filename, rows, columns) {
  if (!rows || rows.length === 0) {
    alert("Aucune donnée à exporter.");
    return;
  }
  // Échapper une valeur pour CSV : guillemets autour si elle contient ; , " ou \n
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[";\n,]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = columns.map((c) => esc(c.label)).join(";");
  const lines = rows.map((r) => columns.map((c) => {
    const val = c.render ? c.render(r) : r[c.key];
    return esc(val);
  }).join(";"));
  // BOM UTF-8 pour qu'Excel reconnaisse les accents
  const csv = "\uFEFF" + header + "\n" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
