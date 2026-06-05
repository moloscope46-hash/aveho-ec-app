"use client";
// =============================================================
//  lib/useCsvExport.js (0.58.43)
//
//  Hook qui factorise l'export CSV des pages listes.
//
//  Mutualise les 3 répétitions qui traînaient sur chaque page :
//    1) l'import dynamique de exportRows (lib/exportData)
//    2) le câblage usePageAction("export-csv") pour le Cmd+K
//    3) la fonction d'export réutilisable par un bouton UI
//
//  Usage :
//    const exportCsv = useCsvExport(
//      () => visibleRows,                       // lignes à exporter (souvent filtrées)
//      { filename: "patients_2026-06-06", columns: { "Nom": "nom", ... } }
//    );
//    <button onClick={exportCsv}>Export CSV</button>
//
//  - getRows : tableau OU fonction renvoyant le tableau (évaluée à l'export
//    → toujours les lignes visibles au moment du clic).
//  - options : objet OU fonction renvoyant { filename, columns, sheetName? }
//    (forme fonction = lazy, utile quand les colonnes dépendent d'un state
//    pas encore prêt au montage). Passé tel quel à exportRows.
// =============================================================

import { usePageAction } from "./usePageAction";

export function useCsvExport(getRows, options) {
  async function doExport() {
    const rows = typeof getRows === "function" ? getRows() : getRows;
    const opts = typeof options === "function" ? options() : options;
    const { exportRows } = await import("./exportData");
    await exportRows(rows || [], opts || {});
  }
  // Branche l'action Cmd+K "export-csv" sur la page courante (cleanup auto au démontage)
  usePageAction("export-csv", doExport);
  return doExport;
}
