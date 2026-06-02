"use client";
// =============================================================
//  lib/exportExcel.js (Alpha 0.57.3)
//
//  RÉ-EXPORTEUR de compatibilité.
//
//  L'implémentation a migré vers lib/exportData.js (CSV par défaut,
//  XLSX optionnel en lazy load) pour règler la vulnérabilité HIGH
//  Prototype Pollution + ReDoS dans `xlsx`.
//
//  Comportement par défaut conservé (mais format change : .csv au lieu
//  de .xlsx). Pour forcer XLSX dans les appelants, passer
//  `{ format: "xlsx" }` dans les options.
// =============================================================

export { exportRows, exportBilan, exportQuickCSV } from "./exportData";
