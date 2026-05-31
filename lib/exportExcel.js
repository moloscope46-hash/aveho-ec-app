"use client";
// =============================================================
//  exportExcel (Alpha 0.15)
//  Export Excel multi-feuille via SheetJS chargé dynamiquement
//  depuis CDN (n'alourdit pas le bundle quand non utilisé).
//  Usage : import { exportBilan } from "./exportExcel";
// =============================================================

// Charge SheetJS depuis CDN au premier appel
let _xlsxPromise = null;
async function loadXLSX() {
  if (typeof window === "undefined") return null;
  if (window.XLSX) return window.XLSX;
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Impossible de charger SheetJS"));
    document.head.appendChild(script);
  });
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
