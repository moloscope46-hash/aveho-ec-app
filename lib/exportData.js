"use client";
// =============================================================
//  lib/exportData.js (Alpha 0.57.3)
//
//  Export de données en CSV (par défaut) ou XLSX (lazy, opt-in).
//
//  Pourquoi : la dépendance `xlsx` (SheetJS) a 2 vulnérabilités HIGH
//  sans fix upstream (Prototype Pollution + ReDoS). Pour les usages
//  simples — tableaux 2D sans formules, sans multi-feuilles dans une
//  même cellule — le CSV natif est tout aussi pratique :
//   - 0 dépendance (sécurité parfaite)
//   - 0 bundle JS supplémentaire (~ -200KB)
//   - ouvrable nativement par Excel, LibreOffice, Google Sheets, Numbers
//   - import facile dans Power BI, Tableau, Python pandas, etc.
//
//  API :
//    import { exportRows, exportBilan } from "@/lib/exportData";
//
//    // Mode CSV par défaut (option B — sécurisé, recommandé)
//    await exportRows(data, { filename: "patients", columns: {...} });
//
//    // Mode XLSX optionnel (lazy load xlsx, garde la vulnérabilité)
//    await exportRows(data, { filename: "patients", format: "xlsx", columns: {...} });
//
//  Compat 100% avec l'ancien lib/exportExcel.js (réexporte aussi
//  exportRows + exportBilan pour les pages qui l'utilisaient).
// =============================================================

import { logger } from "./logger";

// =============================================================
// CSV : génération native sans dépendance
// =============================================================

/**
 * Échappe une valeur pour CSV (RFC 4180).
 * Si la valeur contient virgule, guillemet, retour à la ligne ou point-virgule,
 * on entoure de guillemets et on double les guillemets internes.
 */
function csvEscape(value) {
  if (value == null) return "";
  let s = String(value);
  // Protection contre l'injection CSV (=, +, -, @ au début)
  // Excel évalue ces caractères comme une formule. Préfixer avec une apostrophe.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (/[",;\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Convertit un tableau d'objets en string CSV.
 * @param {Array<Array<string>>} rows - lignes (incluant header en 1ère ligne)
 * @param {string} sep - séparateur (',' ou ';')
 */
function rowsToCSV(rows, sep = ";") {
  return rows.map((row) => row.map(csvEscape).join(sep)).join("\r\n");
}

/**
 * Force le téléchargement d'un fichier texte.
 */
function downloadText(content, filename, mimeType = "text/csv;charset=utf-8") {
  // BOM UTF-8 pour qu'Excel français reconnaisse l'encodage (sinon accents cassés)
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Libère la mémoire après un court délai
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// =============================================================
// xlsx lazy (uniquement si format: "xlsx" demandé explicitement)
//
// 0.57.3 : xlsx a été supprimé du package.json (vuln HIGH non patchée).
// Si quelqu'un demande encore format: "xlsx", on tente le dynamic import
// dans un try/catch — qui échouera proprement et on fallback en CSV.
// =============================================================
let _xlsxPromise = null;
let _xlsxUnavailable = false;
async function loadXLSX() {
  if (typeof window === "undefined") return null;
  if (_xlsxUnavailable) return null;
  if (window.XLSX) return window.XLSX;
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = (async () => {
    try {
      // Import dynamique commenté pour éviter que webpack ne tente
      // de résoudre xlsx au build (il n'est plus dans package.json).
      // Si tu veux ré-activer XLSX, réinstalle xlsx (npm i xlsx) et
      // décommente la ligne ci-dessous.
      // const XLSX = await import("xlsx");
      // window.XLSX = XLSX;
      // return XLSX;
      _xlsxUnavailable = true;
      logger.info("[exportData] xlsx désactivé (vuln HIGH). Fallback CSV.");
      return null;
    } catch (e) {
      _xlsxUnavailable = true;
      logger.error("Impossible de charger xlsx :", e);
      return null;
    }
  })();
  return _xlsxPromise;
}

// =============================================================
// API publique
// =============================================================

/**
 * Export simple d'un tableau de données.
 *
 * @param {Array<Object>} rows - lignes à exporter
 * @param {Object} options
 *   - filename (string, sans extension) : nom du fichier
 *   - sheetName (string) : nom de la feuille (pour XLSX uniquement)
 *   - columns ({ "Header": "field" | r => value })
 *   - format ("csv" | "xlsx") : défaut "csv"
 *   - csvSeparator (";" | ",") : défaut ";" (compat Excel français)
 *   - autoWidth (bool) : ajuste largeur colonnes (XLSX uniquement)
 */
export async function exportRows(rows, options = {}) {
  const format = options.format || "csv";

  // Normalise les colonnes
  let columnsMap = options.columns;
  if (!columnsMap && rows.length > 0) {
    columnsMap = {};
    Object.keys(rows[0]).forEach((k) => {
      columnsMap[k] = (r) => r[k];
    });
  }
  const normalizedMap = {};
  Object.entries(columnsMap || {}).forEach(([header, accessor]) => {
    normalizedMap[header] = typeof accessor === "function" ? accessor : (r) => r[accessor];
  });

  if (format === "csv") {
    return exportRowsCSV(rows, normalizedMap, options);
  }
  if (format === "xlsx") {
    return exportRowsXLSX(rows, normalizedMap, options);
  }
  logger.warn(`[exportData] Format inconnu: ${format} — fallback CSV`);
  return exportRowsCSV(rows, normalizedMap, options);
}

function exportRowsCSV(rows, normalizedMap, options) {
  const filename = (options.filename || "export") + ".csv";
  const sep = options.csvSeparator || ";";
  const headers = Object.keys(normalizedMap);
  const dataLines = rows.map((r) => headers.map((h) => normalizedMap[h](r) ?? ""));
  const csvContent = rowsToCSV([headers, ...dataLines], sep);
  downloadText(csvContent, filename);
}

async function exportRowsXLSX(rows, normalizedMap, options) {
  const XLSX = await loadXLSX();
  if (!XLSX) {
    alert("Impossible de charger Excel. Fallback en CSV.");
    return exportRowsCSV(rows, normalizedMap, options);
  }
  const filename = (options.filename || "export") + ".xlsx";
  const sheetName = (options.sheetName || "Données").slice(0, 31);

  if (!rows || rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["Aucune donnée"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    return;
  }

  const headers = Object.keys(normalizedMap);
  const data = rows.map((r) => headers.map((h) => normalizedMap[h](r) ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  if (options.autoWidth !== false) {
    ws["!cols"] = headers.map((h) => {
      const maxLen = Math.max(
        h.length,
        ...rows.slice(0, 200).map((r) => {
          const v = normalizedMap[h](r);
          return v == null ? 0 : String(v).length;
        })
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 60) };
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/**
 * Export d'un bilan PSAD complet.
 *
 * En mode CSV (défaut), génère plusieurs fichiers .csv groupés dans un .zip.
 * En mode XLSX, garde l'export multi-feuilles dans un seul .xlsx.
 *
 * @param {object} data { patients, materiels, interventions, maintenances, stock, achats }
 * @param {object} meta { collectiviteNom, etabNom, format }
 */
export async function exportBilan(data, meta = {}) {
  const format = meta.format || "csv";

  // Définitions des feuilles (mêmes pour CSV et XLSX)
  const sheets = [
    {
      name: "Patients",
      rows: data.patients || [],
      cols: {
        "Nom": (r) => r.nom,
        "Prénom": (r) => r.prenom,
        "Date naissance": (r) => r.date_naissance,
        "Chambre": (r) => r.chambre,
        "Service": (r) => r.services?.nom,
        "État": (r) => r.etat,
        "Médecin": (r) => r.medecin_traitant,
        "Dossier": (r) => r.numero_dossier,
        "Créé le": (r) => r.created_at?.slice(0, 10),
      },
    },
    {
      name: "Materiels",
      rows: data.materiels || [],
      cols: {
        "Libellé": (r) => r.libelle,
        "N° série": (r) => r.num_serie,
        "N° parc": (r) => r.num_parc,
        "N° lot": (r) => r.num_lot,
        "Article": (r) => r.articles?.libelle,
        "État": (r) => r.etat,
        "Dépôt": (r) => r.depots?.nom,
        "Patient affecté": (r) => r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}` : "",
      },
    },
    {
      name: "DI",
      rows: data.interventions || [],
      cols: {
        "N°": (r) => r.numero,
        "Type": (r) => r.type,
        "Statut": (r) => r.statut,
        "Urgence": (r) => r.urgence,
        "Matériel": (r) => r.materiels?.libelle,
        "Patient": (r) => r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}` : "",
        "Créée le": (r) => r.created_at?.slice(0, 10),
        "Échéance": (r) => r.due_date,
        "Description": (r) => r.description,
      },
    },
    {
      name: "Maintenances",
      rows: data.maintenances || [],
      cols: {
        "Matériel": (r) => r.materiels?.libelle,
        "Type": (r) => r.type,
        "Date prévue": (r) => r.date_prevue,
        "Date réalisée": (r) => r.date_realisee,
        "Statut": (r) => r.statut,
        "Intervenant": (r) => r.intervenant,
        "Récurrence (jours)": (r) => r.recurrence_jours,
      },
    },
    {
      name: "Stock",
      rows: data.stock || [],
      cols: {
        "Article": (r) => r.articles?.libelle,
        "Référence": (r) => r.articles?.reference,
        "Dépôt": (r) => r.depots?.nom,
        "Quantité": (r) => r.quantite,
        "Seuil alerte": (r) => r.seuil_alerte,
      },
    },
  ];

  // Achats : feuille optionnelle
  if (data.achats && data.achats.length > 0) {
    sheets.push({
      name: "Achats",
      rows: data.achats,
      cols: {
        "Numéro": (r) => r.numero,
        "Fournisseur": (r) => r.fournisseur,
        "Motif": (r) => r.motif,
        "Statut": (r) => r.statut,
        "Budget estimé (€)": (r) => r.budget_estime,
        "Budget réel (€)": (r) => r.budget_reel,
        "Date souhaitée": (r) => r.date_souhaitee,
        "Date réception": (r) => r.date_reception,
      },
    });
  }

  if (format === "xlsx") {
    return exportBilanXLSX(sheets, meta, data);
  }
  return exportBilanCSV(sheets, meta);
}

function exportBilanCSV(sheets, meta) {
  // Génère 1 fichier CSV par feuille, avec préfixe daté
  const dateStr = new Date().toISOString().slice(0, 10);
  const sep = ";";

  // Index header avec méta
  const indexLines = [
    ["AVEHO — BILAN COLLECTIVITÉ"],
    [""],
    ["Collectivité", meta.collectiviteNom || ""],
    ["Établissement", meta.etabNom || "Tous"],
    ["Édité le", new Date().toLocaleString("fr-FR")],
    [""],
    ["Feuille", "Nombre de lignes"],
    ...sheets.map((s) => [s.name, s.rows.length]),
  ];
  downloadText(rowsToCSV(indexLines, sep), `bilan-aveho-${dateStr}-INDEX.csv`);

  // Une feuille = un fichier .csv
  for (const sheet of sheets) {
    const headers = Object.keys(sheet.cols);
    const data = sheet.rows.map((r) => headers.map((h) => sheet.cols[h](r) ?? ""));
    const csv = rowsToCSV([headers, ...data], sep);
    downloadText(csv, `bilan-aveho-${dateStr}-${sheet.name}.csv`);
  }
}

async function exportBilanXLSX(sheets, meta, data) {
  const XLSX = await loadXLSX();
  if (!XLSX) {
    alert("Impossible de charger Excel. Fallback en CSV.");
    return exportBilanCSV(sheets, meta);
  }
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headers = Object.keys(sheet.cols);
    const rows = sheet.rows.length === 0
      ? [["Aucune donnée"]]
      : [headers, ...sheet.rows.map((r) => headers.map((h) => sheet.cols[h](r) ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  // Feuille méta
  const wsMeta = XLSX.utils.aoa_to_sheet([
    ["AVEHO — BILAN COLLECTIVITÉ"],
    [""],
    ["Collectivité", meta.collectiviteNom || ""],
    ["Établissement", meta.etabNom || "Tous"],
    ["Édité le", new Date().toLocaleString("fr-FR")],
    [""],
    ["Patients", (data.patients || []).length],
    ["Matériels", (data.materiels || []).length],
    ["DI", (data.interventions || []).length],
    ["Maintenances", (data.maintenances || []).length],
    ["Articles en stock", (data.stock || []).length],
    ["Achats", (data.achats || []).length],
  ]);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Informations");

  const fileName = `bilan-aveho-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// =============================================================
// Helpers d'utilité publics
// =============================================================

/** Export "rapide" — juste les rows sans config particulière → CSV. */
export async function exportQuickCSV(rows, filename = "export") {
  return exportRows(rows, { filename, format: "csv" });
}
