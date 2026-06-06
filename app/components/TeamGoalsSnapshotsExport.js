"use client";
// =============================================================
//  app/components/TeamGoalsSnapshotsExport.js (0.58.67)
//
//  Bouton "Export CSV" qui télécharge tous les snapshots serveur
//  de l'user courant depuis user_goals_snapshots (max 90 jours,
//  rétention du CRON).
//
//  Format CSV : date;avg_pct;nb_atteints;nb_total;taux_atteinte
//  Optionnel : ajout d'une colonne team_nom + team_avg_pct si team_stats présent
// =============================================================

import { useState } from "react";
import { createClient } from "../../lib/supabase";
import { toast } from "./ui-premium";

export default function TeamGoalsSnapshotsExport() {
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Connexion requise");
        return;
      }
      const { data, error } = await supabase
        .from("user_goals_snapshots")
        .select("snapshot_date, avg_pct, nb_atteints, nb_total, taux_atteinte, team_stats")
        .eq("user_id", user.id)
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Aucun snapshot serveur disponible (le CRON quotidien n'a pas encore tourné, reviens demain)");
        return;
      }
      // Construire CSV : ligne d'en-tête + lignes globales + détails par équipe
      // Format compatible Excel France : séparateur point-virgule + BOM UTF-8
      const rows = [];
      // Ligne 1 = en-tête vue globale
      rows.push("Date;Moyenne (%);Atteints;Total;Taux atteinte (%);Equipes (détail)");
      data.forEach(snap => {
        const teamDetail = Array.isArray(snap.team_stats)
          ? snap.team_stats.map(t => `${t.team_nom || "?"}: ${t.avgPct}% (${t.achieved}/${t.nb})`).join(" | ")
          : "";
        rows.push([
          snap.snapshot_date,
          (snap.avg_pct ?? "").toString().replace(".", ","),  // format FR
          snap.nb_atteints ?? 0,
          snap.nb_total ?? 0,
          (snap.taux_atteinte ?? "").toString().replace(".", ","),
          teamDetail.replace(/;/g, ","),
        ].join(";"));
      });
      // Section 2 = détails par équipe (long format) si demandé via deuxième tableau
      rows.push("");
      rows.push("=== Détail par équipe ===");
      rows.push("Date;Equipe;Moyenne (%);Atteints;Total;Taux atteinte (%)");
      data.forEach(snap => {
        if (!Array.isArray(snap.team_stats)) return;
        snap.team_stats.forEach(t => {
          rows.push([
            snap.snapshot_date,
            (t.team_nom || "Sans équipe").replace(/;/g, ","),
            (t.avgPct ?? "").toString().replace(".", ","),
            t.achieved ?? 0,
            t.nb ?? 0,
            (t.tauxAtteinte ?? "").toString().replace(".", ","),
          ].join(";"));
        });
      });
      const csv = "\uFEFF" + rows.join("\n");  // BOM UTF-8 pour Excel
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `objectifs-snapshots-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${data.length} snapshot${data.length > 1 ? "s" : ""} exporté${data.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error(e.message || "Erreur lors de l'export CSV");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={exportCsv}
      disabled={busy}
      title="Télécharger l'historique complet des snapshots serveur en CSV (compatible Excel)"
      style={{
        background: "linear-gradient(135deg, rgba(124,200,200,.15), #fff)",
        border: "1.5px solid #7CC8C8",
        color: "#1c5454",
        padding: "5px 11px",
        borderRadius: 7,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: busy ? "wait" : "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        opacity: busy ? 0.7 : 1,
      }}
    >
      <i className={`ti ${busy ? "ti-loader-2" : "ti-file-download"}`} style={{ animation: busy ? "spin 1s linear infinite" : "none" }} />
      {busy ? "Export…" : "Export CSV"}
    </button>
  );
}
