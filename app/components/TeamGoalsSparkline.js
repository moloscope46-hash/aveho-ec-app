"use client";
// =============================================================
//  app/components/TeamGoalsSparkline.js (0.58.63, refondu 0.58.65)
//
//  Graphique d'évolution des stats équipe sur 7 ou 30 jours.
//  0.58.65 : lit les snapshots depuis Supabase (table user_goals_snapshots
//  alimentée par l'Edge Function goals-snapshot-cron). Fallback localStorage
//  si Supabase indispo ou table absente.
//
//  Toggle 7j / 30j en haut à droite du graphique.
// =============================================================

import { useEffect, useState, useMemo } from "react";

const HISTORY_KEY = "av-team-goals-history-7d";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getLocalHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function pushLocalSnapshot(stats, totalGoals) {
  if (typeof window === "undefined") return;
  try {
    const today = todayISO();
    const history = getLocalHistory().filter(h => h.d !== today);
    history.push({
      d: today,
      avgPct: Math.round(stats.avgPct),
      nbAtteints: stats.nbAtteints,
      total: totalGoals,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-90)));  // 0.58.66 : max 90j pour fallback
  } catch {}
}

export default function TeamGoalsSparkline({ stats, totalGoals }) {
  // 0.58.65 : toggle 7j/30j persisté, 0.58.66 : ajout 90j (rétention max CRON)
  const [rangeDays, setRangeDays] = useState(() => {
    if (typeof window === "undefined") return 7;
    try { return parseInt(localStorage.getItem("av-team-goals-range") || "7", 10); } catch { return 7; }
  });
  useEffect(() => {
    try { localStorage.setItem("av-team-goals-range", String(rangeDays)); } catch {}
  }, [rangeDays]);

  const [history, setHistory] = useState([]);
  const [source, setSource] = useState("local");  // "supabase" | "local"

  useEffect(() => {
    if (!stats || totalGoals === 0) return;
    pushLocalSnapshot(stats, totalGoals);

    (async () => {
      try {
        const { createClient } = await import("../../lib/supabase");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHistory(getLocalHistory());
          setSource("local");
          return;
        }
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - rangeDays);
        const cutoffISO = cutoff.toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("user_goals_snapshots")
          .select("snapshot_date, avg_pct, nb_atteints, nb_total")
          .eq("user_id", user.id)
          .gte("snapshot_date", cutoffISO)
          .order("snapshot_date", { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          setHistory(data.map(d => ({
            d: d.snapshot_date,
            avgPct: Math.round(Number(d.avg_pct) || 0),
            nbAtteints: d.nb_atteints,
            total: d.nb_total,
          })));
          setSource("supabase");
        } else {
          setHistory(getLocalHistory());
          setSource("local");
        }
      } catch {
        setHistory(getLocalHistory());
        setSource("local");
      }
    })();
  }, [stats?.avgPct, stats?.nbAtteints, totalGoals, rangeDays]);

  const displayHistory = useMemo(() => {
    if (history.length === 0) return [];
    if (rangeDays === 7) return history.slice(-7);
    if (rangeDays === 30) return history.slice(-30);
    // 0.58.66 : 90j = tout l'historique disponible (max CRON rétention)
    return history.slice(-90);
  }, [history, rangeDays]);

  const points = useMemo(() => {
    if (displayHistory.length < 2) return null;
    // 0.58.66 : dimensions adaptées au range (90j → SVG plus large)
    const w = rangeDays === 90 ? 380 : rangeDays === 30 ? 320 : 220;
    const h = rangeDays === 90 ? 90 : rangeDays === 30 ? 80 : 60;
    const padX = 4, padY = 6;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const xs = displayHistory.map((_, i) => padX + (i / (displayHistory.length - 1)) * innerW);
    const ys = displayHistory.map(h => padY + innerH - (h.avgPct / 100) * innerH);
    const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    return { polyline, xs, ys, w, h, history: displayHistory };
  }, [displayHistory, rangeDays]);

  if (!points) {
    return (
      <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(122,111,176,.08)", borderRadius: 8, fontSize: 11, color: "#7a6fb0", textAlign: "center" }}>
        <i className="ti ti-chart-line" /> Évolution {rangeDays}j —
        {displayHistory.length === 0
          ? " aucune donnée encore, reviens demain"
          : ` ${displayHistory.length}/${rangeDays} jour${displayHistory.length > 1 ? "s" : ""} (CRON serveur quotidien)`}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#7a6fb0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-chart-line" /> Évolution {points.history.length} jour{points.history.length > 1 ? "s" : ""}
          {source === "supabase" && (
            <span title="Snapshot serveur (CRON quotidien)" style={{ fontSize: 9, color: "#5aa05a", background: "rgba(90,160,90,.12)", padding: "1px 6px", borderRadius: 6, fontWeight: 700, marginLeft: 4 }}>
              <i className="ti ti-cloud-check" /> Serveur
            </span>
          )}
          {source === "local" && (
            <span title="Mode local (Supabase indispo ou CRON pas encore exécuté)" style={{ fontSize: 9, color: "#8a98a8", background: "rgba(138,152,168,.12)", padding: "1px 6px", borderRadius: 6, fontWeight: 700, marginLeft: 4 }}>
              <i className="ti ti-device-floppy" /> Local
            </span>
          )}
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "inline-flex", borderRadius: 6, background: "#fff", border: "1px solid #d3d9e0", padding: 2 }}>
            <button
              onClick={() => setRangeDays(7)}
              style={{
                background: rangeDays === 7 ? "linear-gradient(135deg, #7a6fb0, #5a4a90)" : "transparent",
                color: rangeDays === 7 ? "#fff" : "#7a6fb0",
                border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 10.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >7j</button>
            <button
              onClick={() => setRangeDays(30)}
              style={{
                background: rangeDays === 30 ? "linear-gradient(135deg, #7a6fb0, #5a4a90)" : "transparent",
                color: rangeDays === 30 ? "#fff" : "#7a6fb0",
                border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 10.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >30j</button>
            {/* 0.58.66 : bouton 90j (rétention max CRON) */}
            <button
              onClick={() => setRangeDays(90)}
              title="Vue 90 jours (rétention maximale du serveur)"
              style={{
                background: rangeDays === 90 ? "linear-gradient(135deg, #7a6fb0, #5a4a90)" : "transparent",
                color: rangeDays === 90 ? "#fff" : "#7a6fb0",
                border: "none", borderRadius: 4, padding: "3px 9px", fontSize: 10.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >90j</button>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: trendColor, display: "flex", alignItems: "center", gap: 3 }}>
            <i className={`ti ti-trending-${trend > 0 ? "up" : trend < 0 ? "down" : "right"}`} />
            {trend > 0 ? "+" : ""}{trend} pts
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${points.w} ${points.h}`} style={{ width: "100%", height: points.h, display: "block" }}>
        <defs>
          <linearGradient id={`sparkline-gradient-${rangeDays}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a6fb0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7a6fb0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="4" y1={6 + (points.h - 12) * 0.5} x2={points.w - 4} y2={6 + (points.h - 12) * 0.5}
              stroke="rgba(122,111,176,.20)" strokeWidth="1" strokeDasharray="3,3" />
        <polygon
          points={`${points.xs[0]},${points.h - 6} ${points.polyline} ${points.xs[points.xs.length - 1]},${points.h - 6}`}
          fill={`url(#sparkline-gradient-${rangeDays})`}
        />
        <polyline points={points.polyline} fill="none" stroke="#7a6fb0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.xs.map((x, i) => (
          <circle key={i} cx={x} cy={points.ys[i]} r={rangeDays === 90 ? 1.2 : rangeDays === 30 ? 1.8 : 2.5} fill="#fff" stroke="#7a6fb0" strokeWidth={rangeDays === 90 ? 1.5 : 2}>
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
