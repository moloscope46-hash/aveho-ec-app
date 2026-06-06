"use client";
// =============================================================
//  app/components/TeamGoalsSparkline.js (0.58.63)
//
//  Mini-graphique d'évolution des stats équipe sur 7 jours.
//  Stocke un snapshot quotidien de stats.avgPct en localStorage
//  et trace une sparkline SVG.
//
//  Storage : av-team-goals-history-7d = [{ d: "YYYY-MM-DD", avgPct, nbAtteints, total }, ...]
//  Max 7 entrées (rotation glissante).
// =============================================================

import { useEffect, useState, useMemo } from "react";

const HISTORY_KEY = "av-team-goals-history-7d";
const MAX_DAYS = 7;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function pushSnapshot(stats, totalGoals) {
  if (typeof window === "undefined") return;
  try {
    const today = todayISO();
    const history = getHistory();
    // Si déjà un snapshot aujourd'hui → on remplace (dernière valeur du jour)
    const filtered = history.filter(h => h.d !== today);
    filtered.push({
      d: today,
      avgPct: Math.round(stats.avgPct),
      nbAtteints: stats.nbAtteints,
      total: totalGoals,
    });
    // Garde max 7 jours (les plus récents)
    const trimmed = filtered.slice(-MAX_DAYS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export default function TeamGoalsSparkline({ stats, totalGoals }) {
  const [history, setHistory] = useState([]);

  // Snapshot quotidien
  useEffect(() => {
    if (!stats || totalGoals === 0) return;
    pushSnapshot(stats, totalGoals);
    setHistory(getHistory());
  }, [stats?.avgPct, stats?.nbAtteints, totalGoals]);

  const points = useMemo(() => {
    if (history.length < 2) return null;
    const w = 220, h = 60, padX = 4, padY = 6;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const xs = history.map((_, i) => padX + (i / (history.length - 1)) * innerW);
    const ys = history.map(h => padY + innerH - (h.avgPct / 100) * innerH);
    const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    return { polyline, xs, ys, w, h, history };
  }, [history]);

  if (!points) {
    // Pas assez de données — message explicatif
    return (
      <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(122,111,176,.08)", borderRadius: 8, fontSize: 11, color: "#7a6fb0", textAlign: "center" }}>
        <i className="ti ti-chart-line" /> Évolution sur 7 jours — revenez demain pour voir la courbe se former{history.length > 0 && ` (${history.length}/7 jours)`}
      </div>
    );
  }

  const lastVal = points.history[points.history.length - 1].avgPct;
  const firstVal = points.history[0].avgPct;
  const trend = lastVal - firstVal;
  const trendColor = trend > 0 ? "#5aa05a" : trend < 0 ? "#e35d5b" : "#8a98a8";

  return (
    <div style={{
      marginTop: 10,
      padding: "10px 12px",
      background: "linear-gradient(135deg, rgba(122,111,176,.08), rgba(124,200,200,.08))",
      border: "1px solid rgba(122,111,176,.20)",
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#7a6fb0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <i className="ti ti-chart-line" /> Évolution sur {points.history.length} jour{points.history.length > 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: trendColor, display: "flex", alignItems: "center", gap: 3 }}>
          <i className={`ti ti-trending-${trend > 0 ? "up" : trend < 0 ? "down" : "right"}`} />
          {trend > 0 ? "+" : ""}{trend} pts
        </span>
      </div>
      <svg viewBox={`0 0 ${points.w} ${points.h}`} style={{ width: "100%", height: 60, display: "block" }}>
        {/* Gradient pour l'aire sous la courbe */}
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a6fb0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7a6fb0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Ligne de référence à 50% */}
        <line x1="4" y1={6 + (points.h - 12) * 0.5} x2={points.w - 4} y2={6 + (points.h - 12) * 0.5}
              stroke="rgba(122,111,176,.20)" strokeWidth="1" strokeDasharray="3,3" />
        {/* Aire sous la courbe */}
        <polygon
          points={`${points.xs[0]},${points.h - 6} ${points.polyline} ${points.xs[points.xs.length - 1]},${points.h - 6}`}
          fill="url(#sparkline-gradient)"
        />
        {/* Courbe */}
        <polyline points={points.polyline} fill="none" stroke="#7a6fb0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points */}
        {points.xs.map((x, i) => (
          <circle key={i} cx={x} cy={points.ys[i]} r="2.5" fill="#fff" stroke="#7a6fb0" strokeWidth="2">
            <title>{`${points.history[i].d} — ${points.history[i].avgPct}%`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#8a98a8", marginTop: 2 }}>
        <span>{points.history[0].d.slice(5)}</span>
        <span>{points.history[points.history.length - 1].d.slice(5)} · {lastVal}%</span>
      </div>
    </div>
  );
}
