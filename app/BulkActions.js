"use client";
// =============================================================
//  BulkActions — Bandeau sticky d'actions sur sélection multiple
//  Alpha 0.49.0 — extrait de /patients (0.46) pour réutilisation
//
//  Usage :
//    const [selectedIds, setSelectedIds] = useState(new Set());
//    <BulkActions
//      selectedIds={selectedIds}
//      setSelectedIds={setSelectedIds}
//      rows={rows}
//      label="article"
//      csvHeaders={["Référence", "Libellé", "Prix"]}
//      csvRow={(r) => [r.reference, r.libelle, r.prix]}
//      filename="articles-export"
//      table="articles"
//      canDelete={auth.can("supprimer")}
//      onDeleted={() => load()}
//    />
// =============================================================
import { createClient } from "../lib/supabase";
import { useState } from "react";

export default function BulkActions({
  selectedIds,
  setSelectedIds,
  rows,
  label = "élément",
  labelPlural,
  csvHeaders = [],
  csvRow = (r) => Object.values(r),
  filename = "export",
  table,
  canDelete = false,
  onDeleted,
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const plural = labelPlural || `${label}s`;
  const labelOutput = selectedIds.size > 1 ? plural : label;

  if (selectedIds.size === 0) return null;

  function exportCsv() {
    setBusy(true);
    try {
      const selected = rows.filter(r => selectedIds.has(r.id));
      const escaped = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csvRows = selected.map(r => csvRow(r).map(escaped).join(";"));
      const csv = "\uFEFF" + csvHeaders.join(";") + "\r\n" + csvRows.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    if (!table) {
      alert("Configuration manquante : prop 'table' requise.");
      return;
    }
    if (!window.confirm(`Supprimer définitivement ${selectedIds.size} ${labelOutput} ?\n\nCette action est irréversible.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .in("id", Array.from(selectedIds));
      if (error) throw error;
      setSelectedIds(new Set());
      onDeleted?.();
    } catch (e) {
      alert("Erreur suppression : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      position: "sticky", top: 8, zIndex: 5,
      background: "linear-gradient(135deg, #185FA5, #2a5a5a)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 8,
      marginBottom: 10,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>
        <i className="ti ti-checks" /> {selectedIds.size} {labelOutput} sélectionné{selectedIds.size > 1 ? "s" : ""}
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={exportCsv}
          disabled={busy}
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
          aria-label="Exporter la sélection en CSV"
        >
          <i className="ti ti-file-spreadsheet" /> Export CSV
        </button>
        {canDelete && (
          <button
            onClick={bulkDelete}
            disabled={busy}
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,139,128,0.6)", color: "#ffd6d2", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            aria-label="Supprimer la sélection"
          >
            <i className="ti ti-trash" /> Supprimer
          </button>
        )}
        <button
          onClick={() => setSelectedIds(new Set())}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, cursor: "pointer" }}
          aria-label="Désélectionner tout"
        >
          <i className="ti ti-x" /> Tout désél.
        </button>
      </div>
    </div>
  );
}

// =============================================================
//  Hook utilitaire pour gérer une sélection bulk
// =============================================================
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState(new Set());

  function toggle(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAll(rows) {
    if (rows.every(r => selectedIds.has(r.id))) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      rows.forEach(r => next.add(r.id));
      setSelectedIds(next);
    }
  }

  function clear() {
    setSelectedIds(new Set());
  }

  return { selectedIds, setSelectedIds, toggle, toggleAll, clear };
}
