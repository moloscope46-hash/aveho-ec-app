"use client";
// =============================================================
//  app/components/TeamVsTeamChart.js (0.58.67)
//
//  Graphique comparatif "équipes vs équipes" : barres horizontales
//  classées par avgPct desc, avec couleur de l'équipe.
//  Lit `stats.teamStats` déjà calculé par le widget Objectifs.
// =============================================================

import { useMemo, useState, useEffect } from "react";
import { createClient } from "../../lib/supabase";

export default function TeamVsTeamChart({ stats }) {
  const teamStats = stats?.teamStats || [];
  const [teamsMeta, setTeamsMeta] = useState({});  // id -> { couleur, icone }

  // Charge les métadonnées des équipes (couleur, icône) pour un rendu fidèle
  useEffect(() => {
    if (teamStats.length === 0) return;
    (async () => {
      try {
        const supabase = createClient();
        const ids = teamStats.map(t => t.team_id).filter(Boolean);
        if (ids.length === 0) return;
        const { data } = await supabase.from("equipes").select("id, nom, couleur, icone").in("id", ids);
        const map = {};
        (data || []).forEach(e => { map[e.id] = { couleur: e.couleur, icone: e.icone, nom: e.nom }; });
        setTeamsMeta(map);
      } catch { /* silent */ }
    })();
  }, [teamStats.length]);

  const sorted = useMemo(() => {
    return [...teamStats].sort((a, b) => (b.avgPct || 0) - (a.avgPct || 0));
  }, [teamStats]);

  if (sorted.length === 0) {
    return (
      <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(122,111,176,.06)", borderRadius: 10, fontSize: 11.5, color: "#8a98a8", textAlign: "center" }}>
        <i className="ti ti-trophy" /> Aucune équipe à comparer pour le moment.
      </div>
    );
  }

  const maxVal = Math.max(100, ...sorted.map(t => t.avgPct || 0));

  return (
    <div style={{
      marginTop: 12,
      padding: "12px 14px",
      background: "linear-gradient(135deg, rgba(122,111,176,.06), rgba(124,200,200,.06))",
      border: "1px solid rgba(122,111,176,.20)",
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 11, color: "#7a6fb0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
        <i className="ti ti-trophy" /> Équipes vs Équipes — classement
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#8a98a8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
          {sorted.length} équipe{sorted.length > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {sorted.map((t, idx) => {
          const meta = teamsMeta[t.team_id] || {};
          const couleur = meta.couleur || "#7a6fb0";
          const icone = meta.icone || "ti-users-group";
          const pct = t.avgPct || 0;
          const widthPct = (pct / maxVal) * 100;
          const rankColor = idx === 0 ? "#EF9F27" : idx === 1 ? "#a0aeb9" : idx === 2 ? "#C9867F" : "#8a98a8";
          return (
            <div key={t.team_id || idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Rang */}
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: rankColor, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, flexShrink: 0,
              }}>{idx + 1}</span>
              {/* Nom + icône */}
              <div style={{ minWidth: 110, display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#142131", fontWeight: 600 }}>
                <i className={`ti ${icone}`} style={{ color: couleur, fontSize: 14 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.team_nom}>
                  {t.team_nom || "Sans équipe"}
                </span>
              </div>
              {/* Barre */}
              <div style={{ flex: 1, height: 16, background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e3e9ee", position: "relative" }}>
                <div style={{
                  height: "100%", width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${couleur}, ${couleur}cc)`,
                  borderRadius: 8,
                  transition: "width 600ms cubic-bezier(.34, 1.56, .64, 1)",
                  display: "flex", alignItems: "center", justifyContent: "flex-end",
                  paddingRight: 6,
                }}>
                  {widthPct > 25 && (
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>{Math.round(pct)}%</span>
                  )}
                </div>
                {widthPct <= 25 && (
                  <span style={{ position: "absolute", left: `${widthPct + 4}%`, top: 1, color: "#5a6878", fontSize: 10, fontWeight: 700 }}>{Math.round(pct)}%</span>
                )}
              </div>
              {/* Détail atteints/total */}
              <span style={{ fontSize: 11, color: "#5a6878", fontFamily: "Consolas, monospace", whiteSpace: "nowrap" }}>
                {t.achieved || 0}/{t.nb || 0}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, padding: "6px 8px", background: "rgba(255,255,255,.5)", borderRadius: 6, fontSize: 10, color: "#5a6878", textAlign: "center" }}>
        <i className="ti ti-info-circle" /> Trié par moyenne d'avancement décroissante · 🥇 leader · 🥈 2nd · 🥉 3ème
      </div>
    </div>
  );
}
