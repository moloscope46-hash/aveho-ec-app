"use client";
// =============================================================
//  Page Statistiques DI — Dashboard interventions
//  Alpha 0.43.0 (0.57.34 : force-dynamic pour éviter SSG fail)
//
//  Affiche :
//   - KPIs globaux (total, ce mois vs précédent, % urgent, % résolu)
//   - Trend chart 12 mois
//   - Heatmap création (dow × heure, 90j)
//   - Top types
//   - Top demandeurs
//   - Split par urgence
// =============================================================

// 0.57.34 : Force le rendu dynamique (pas de SSG au build)
// Évite "Error: @supabase/ssr: Your project's URL and API key are required"
// car la page utilise createClient() au top-level
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";
import { StackedBarChart, Heatmap, Gauge, TrendBadge, DonutChart} from "../Charts";
export default function StatistiquesInterventions() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [global, setGlobal] = useState(null);
  const [parType, setParType] = useState([]);
  const [parUrgence, setParUrgence] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [topDemandeurs, setTopDemandeurs] = useState([]);
  const [parMois, setParMois] = useState([]);
  const [loading, setLoading] = useState(true);

  const peutVoir = auth.role?.nom === "Administrateur" || auth.can?.("gerer_roles") || auth.can?.("manage_collectivite");

  async function load() {
    if (!auth.structureId || !peutVoir) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [gResp, tResp, uResp, hResp, dResp, mResp] = await Promise.all([
      supabase.from("v_stats_di_global").select("*").eq("structure_id", auth.structureId).maybeSingle(),
      supabase.from("v_stats_di_par_type").select("*").eq("structure_id", auth.structureId).order("nb_total", { ascending: false }).limit(10),
      supabase.from("v_stats_di_par_urgence").select("*").eq("structure_id", auth.structureId),
      supabase.from("v_stats_di_heatmap").select("*").eq("structure_id", auth.structureId),
      supabase.from("v_stats_di_top_demandeurs").select("*").eq("structure_id", auth.structureId).order("nb_di", { ascending: false }).limit(10),
      supabase.from("v_stats_di_par_mois").select("*").eq("structure_id", auth.structureId).order("mois_debut"),
    ]);
    setGlobal(gResp.data);
    setParType(tResp.data || []);
    setParUrgence(uResp.data || []);
    setHeatmap(hResp.data || []);
    setTopDemandeurs(dResp.data || []);
    setParMois(mResp.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, auth.structureId]);

  if (!peutVoir) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-shield-x" /> Cette page est réservée aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  // Tendance ce mois vs précédent
  const tendance = global && global.nb_mois_dernier > 0
    ? Math.round(((global.nb_ce_mois - global.nb_mois_dernier) / global.nb_mois_dernier) * 100)
    : null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="STATISTIQUES"
          icon="ti-tools"
          title="Statistiques"
          accent="interventions"
          sub="Vue d'ensemble de l'activité des demandes d'intervention"
        />

        {loading ? (
          <Panel><StateMsg>Chargement des statistiques…</StateMsg></Panel>
        ) : !global ? (
          <Panel><StateMsg>Pas encore de DI sur cette structure.</StateMsg></Panel>
        ) : (
          <>
            {/* KPIs */}
            <KpiRow tiles={[
              { label: "Total DI", value: global.total, icon: "ti-tools", color: "#185FA5" },
              { label: "Ce mois", value: global.nb_ce_mois, icon: "ti-calendar-month", color: "#5aa05a" },
              { label: "Ouvertes", value: global.nb_ouvertes, icon: "ti-folder-open", color: "#EF9F27" },
              { label: "% Urgent", value: global.pct_urgent + "%", icon: "ti-alert-triangle", color: "#c0392b" },
            ]} />

            {/* Tendance mois courant vs précédent */}
            {global.nb_mois_dernier > 0 && (
              <Panel style={{ marginBottom: 18, borderLeft: "4px solid #185FA5" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>
                    <i className="ti ti-trending-up" style={{ color: "#185FA5", marginRight: 6 }} />
                    Tendance — Ce mois ({global.nb_ce_mois}) vs mois précédent ({global.nb_mois_dernier})
                  </h3>
                  <TrendBadge value={tendance} />
                </div>
              </Panel>
            )}

            {/* Évolution 12 mois */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-chart-bar" style={{ color: "#185FA5", marginRight: 6 }} />
                Évolution sur 12 mois
              </h3>
              {parMois.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Pas encore de données mensuelles.</p>
              ) : (
                <StackedBarChart
                  data={parMois.map((m) => ({
                    label: m.mois_label?.slice(0, 3) || "",
                    nb_resolu: m.nb_resolu,
                    nb_autres: Math.max((m.nb_total || 0) - (m.nb_resolu || 0), 0),
                  }))}
                  series={[
                    { key: "nb_resolu", label: "Résolues", color: "#5aa05a" },
                    { key: "nb_autres", label: "Autres", color: "#EF9F27" },
                  ]}
                  height={220}
                />
              )}
            </Panel>

            {/* Heatmap création */}
            <Panel style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#142131" }}>
                <i className="ti ti-grid-pattern" style={{ color: "#EF9F27", marginRight: 6 }} />
                Heatmap création DI (90 derniers jours)
              </h3>
              {heatmap.length === 0 ? (
                <p style={{ color: "#8a98a8", fontSize: 13 }}>Pas encore assez de données pour la heatmap.</p>
              ) : (
                <>
                  <Heatmap data={heatmap.map(h => ({ jour_semaine: h.jour_semaine, heure: h.heure, nb_actions: h.nb_creations }))} color="#EF9F27" />
                  <p style={{ fontSize: 11.5, color: "#8a98a8", marginTop: 10, marginBottom: 0 }}>
                    <i className="ti ti-info-circle" /> Identifier les pics d'activité pour planifier la couverture support.
                  </p>
                </>
              )}
            </Panel>

            {/* Donut % résolu + Bar top types */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, marginBottom: 18 }}>
              <Panel>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-check-circle" style={{ color: "#5aa05a", marginRight: 6 }} />
                  Taux de résolution
                </h3>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Gauge value={global.pct_resolu} max={100} color="#5aa05a" />
                  <p style={{ fontSize: 12.5, color: "#6c7a89", margin: 0, textAlign: "center" }}>
                    <b>{global.nb_resolu}</b> sur <b>{global.total}</b> DI résolues / clôturées
                  </p>
                </div>
              </Panel>
              <Panel>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-pie-chart" style={{ color: "#7a6fb0", marginRight: 6 }} />
                  Répartition par urgence
                </h3>
                {parUrgence.length === 0 ? (
                  <p style={{ color: "#8a98a8", fontSize: 13 }}>—</p>
                ) : (
                  <DonutChart
                    data={parUrgence.map(u => ({
                      label: u.urgence,
                      value: u.nb_total,
                      color: u.urgence === "Urgent" ? "#c0392b" : u.urgence === "Normal" ? "#185FA5" : "#7a6fb0",
                    }))}
                  />
                )}
              </Panel>
            </div>

            {/* Top types */}
            {parType.length > 0 && (
              <Panel style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-tag" style={{ color: "#7a6fb0", marginRight: 6 }} />
                  Top types ({parType.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {parType.map((t, i) => {
                    const max = parType[0]?.nb_total || 1;
                    const pct = (t.nb_total / max) * 100;
                    return (
                      <div key={i} style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, color: "#142131" }}>{t.type}</span>
                          <span style={{ fontSize: 12, color: "#6c7a89" }}>
                            <b style={{ color: "#142131", fontSize: 14 }}>{t.nb_total}</b>
                            {t.nb_urgent > 0 && (
                              <span style={{ marginLeft: 8, color: "#c0392b" }}>
                                <i className="ti ti-alert-triangle" /> {t.nb_urgent}
                              </span>
                            )}
                            {t.nb_30j > 0 && (
                              <span style={{ marginLeft: 8, color: "#5aa05a" }}>
                                +{t.nb_30j} (30j)
                              </span>
                            )}
                          </span>
                        </div>
                        <div style={{ height: 6, background: "#f4f7fa", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #185FA5, #7a6fb0)", transition: "width .3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {/* Top demandeurs */}
            {topDemandeurs.length > 0 && (
              <Panel style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
                  <i className="ti ti-user-circle" style={{ color: "#185FA5", marginRight: 6 }} />
                  Top demandeurs ({topDemandeurs.length})
                </h3>
                <table style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Utilisateur</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Urgents</th>
                      <th style={{ textAlign: "right" }}>30 derniers jours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDemandeurs.map((d, i) => (
                      <tr key={d.user_id}>
                        <td>
                          {i < 3 && <span style={{ marginRight: 6, fontSize: 16 }}>{["🥇", "🥈", "🥉"][i]}</span>}
                          {d.user_email || d.user_id?.slice(0, 8)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#142131" }}>{d.nb_di}</td>
                        <td style={{ textAlign: "right", color: d.nb_urgent > 0 ? "#c0392b" : "#8a98a8" }}>{d.nb_urgent || "—"}</td>
                        <td style={{ textAlign: "right", color: d.nb_30j > 0 ? "#5aa05a" : "#8a98a8" }}>{d.nb_30j || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
