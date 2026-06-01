"use client";
// =============================================================
//  exportExcel
//  Alpha 0.15 — Export Excel multi-feuille via SheetJS
//  Alpha 0.55.11 — Migration de CDN vers npm (réflexe 19 :
//                  Edge/Brave bloquent jsdelivr via Tracking Prevention)
//  Usage : import { exportBilan, exportRows } from "./exportExcel";
// =============================================================

import { logger } from "./logger";

// Charge SheetJS via npm (dynamic import) au premier appel
let _xlsxPromise = null;
async function loadXLSX() {
  if (typeof window === "undefined") return null;
  if (window.XLSX) return window.XLSX;
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = (async () => {
    try {
      const XLSX = await import("xlsx");
      window.XLSX = XLSX;
      return XLSX;
    } catch (e) {
      logger.error("Impossible de charger xlsx via npm :", e);
      return null;
    }
  })();
  return _xlsxPromise;
}

// Helper interne : crée une feuille à partir d'un tableau d'objets
function arrayToSheet(XLSX, rows, columnsMap) {
  if (!rows || rows.length === 0) return XLSX.utils.aoa_to_sheet([["Aucune donnée"]]);
  // columnsMap : { libelle: r => r.libelle, etat: r => r.etat, ... }
  const headers = Object.keys(columnsMap);
  const data = rows.map((r) => headers.map((h) => columnsMap[h](r) ?? ""));
  return XLSX.utils.aoa_to_sheet([headers, ...data]);
}

// 0.55.11 : Export générique d'un tableau de lignes (utilisé partout dans l'app)
/**
 * Export simple d'un tableau de données en .xlsx
 * @param {Array<Object>} rows - lignes à exporter
 * @param {Object} options
 *   - filename (string, sans extension) : nom du fichier
 *   - sheetName (string) : nom de la feuille Excel (défaut "Données")
 *   - columns ({ "Header": "field" | r => value })
 *   - autoWidth (bool) : ajuste largeur colonnes (défaut true)
 */
export async function exportRows(rows, options = {}) {
  const XLSX = await loadXLSX();
  if (!XLSX) {
    alert("Impossible de charger Excel. Vérifie ta connexion.");
    return;
  }
  const filename = (options.filename || "export") + ".xlsx";
  const sheetName = (options.sheetName || "Données").slice(0, 31);  // limite Excel

  let columnsMap = options.columns;
  // Si pas de columns explicite, on prend les clés de la 1ère ligne
  if (!columnsMap && rows.length > 0) {
    columnsMap = {};
    Object.keys(rows[0]).forEach((k) => {
      columnsMap[k] = (r) => r[k];
    });
  }
  // Si valeurs sont des strings (nom de champ), convertir en getter
  const normalizedMap = {};
  Object.entries(columnsMap || {}).forEach(([header, accessor]) => {
    normalizedMap[header] = typeof accessor === "function" ? accessor : (r) => r[accessor];
  });

  const ws = arrayToSheet(XLSX, rows, normalizedMap);

  // Auto-width
  if (options.autoWidth !== false && rows.length > 0) {
    const headers = Object.keys(normalizedMap);
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
 * Export d'un bilan PSAD complet en XLSX multi-feuille.
 * @param {object} data { patients, materiels, interventions, maintenances, stock, achats }
 * @param {object} meta { collectiviteNom, etabNom }
 */
export async function exportBilan(data, meta = {}) {
  const XLSX = await loadXLSX();
  if (!XLSX) return;
  const wb = XLSX.utils.book_new();

  // 1) Feuille Patients
  const wsPat = arrayToSheet(XLSX, data.patients || [], {
    "Nom": (r) => r.nom,
    "Prénom": (r) => r.prenom,
    "Date naissance": (r) => r.date_naissance,
    "Chambre": (r) => r.chambre,
    "Service": (r) => r.services?.nom,
    "État": (r) => r.etat,
    "Médecin": (r) => r.medecin_traitant,
    "Dossier": (r) => r.numero_dossier,
    "Créé le": (r) => r.created_at?.slice(0, 10),
  });
  XLSX.utils.book_append_sheet(wb, wsPat, "Patients");

  // 2) Feuille Matériels
  const wsMat = arrayToSheet(XLSX, data.materiels || [], {
    "Libellé": (r) => r.libelle,
    "N° série": (r) => r.num_serie,
    "N° parc": (r) => r.num_parc,
    "N° lot": (r) => r.num_lot,
    "Article": (r) => r.articles?.libelle,
    "État": (r) => r.etat,
    "Dépôt": (r) => r.depots?.nom,
    "Patient affecté": (r) => r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}` : "",
  });
  XLSX.utils.book_append_sheet(wb, wsMat, "Matériels");

  // 3) Feuille DI
  const wsDi = arrayToSheet(XLSX, data.interventions || [], {
    "N°": (r) => r.numero,
    "Type": (r) => r.type,
    "Statut": (r) => r.statut,
    "Urgence": (r) => r.urgence,
    "Matériel": (r) => r.materiels?.libelle,
    "Patient": (r) => r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}` : "",
    "Créée le": (r) => r.created_at?.slice(0, 10),
    "Échéance": (r) => r.due_date,
    "Description": (r) => r.description,
  });
  XLSX.utils.book_append_sheet(wb, wsDi, "Demandes d'intervention");

  // 4) Feuille Maintenances
  const wsMnt = arrayToSheet(XLSX, data.maintenances || [], {
    "Matériel": (r) => r.materiels?.libelle,
    "Type": (r) => r.type,
    "Date prévue": (r) => r.date_prevue,
    "Date réalisée": (r) => r.date_realisee,
    "Statut": (r) => r.statut,
    "Intervenant": (r) => r.intervenant,
    "Récurrence (jours)": (r) => r.recurrence_jours,
  });
  XLSX.utils.book_append_sheet(wb, wsMnt, "Maintenances");

  // 5) Feuille Stock
  const wsStock = arrayToSheet(XLSX, data.stock || [], {
    "Article": (r) => r.articles?.libelle,
    "Référence": (r) => r.articles?.reference,
    "Dépôt": (r) => r.depots?.nom,
    "Quantité": (r) => r.quantite,
    "Seuil alerte": (r) => r.seuil_alerte,
  });
  XLSX.utils.book_append_sheet(wb, wsStock, "Stock");

  // 6) Feuille Achats
  if (data.achats && data.achats.length > 0) {
    const wsAch = arrayToSheet(XLSX, data.achats, {
      "Numéro": (r) => r.numero,
      "Fournisseur": (r) => r.fournisseur,
      "Motif": (r) => r.motif,
      "Statut": (r) => r.statut,
      "Budget estimé (€)": (r) => r.budget_estime,
      "Budget réel (€)": (r) => r.budget_reel,
      "Date souhaitée": (r) => r.date_souhaitee,
      "Date réception": (r) => r.date_reception,
    });
    XLSX.utils.book_append_sheet(wb, wsAch, "Achats");
  }

  // Méta sur une feuille
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

  // Téléchargement
  const fileName = `bilan-aveho-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
