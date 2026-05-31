"use client";
// =============================================================
//  /statut — Statut système des services backend
//  Alpha 0.51.0
//  Alpha 0.52.0 : + section "Métriques 7 derniers jours" (BD)
//
//  Ping périodique de /api/health + check Realtime côté client.
//  Affichage style "status page" : badge par service + historique
//  (les 10 derniers checks en mémoire).
// =============================================================
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import { createClient } from "../../lib/supabase";
import TopBar from "../TopBar";
import { PageHead, Panel, StateMsg, Btn } from "../ui";

const POLL_INTERVAL = 30 * 1000;  // 30s
const HISTORY_SIZE = 12;

export default function StatutSystemePage() {
  const auth = useAuth();
  const cart = useCart();
  const supabase = createClient();
  const [data, setData] = useState(null);
  const [realtime, setRealtime] = useState({ status: "checking", latency_ms: null });
  const [history, setHistory] = useState([]);
  // Alpha 0.52.0 (BD) : métriques 7 derniers jours
  const [metrics7d, setMetrics7d] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  async function check() {
    setLoading(true);
    try {
      const t0 = Date.now();
      const r = await fetch("/api/health", { cache: "no-store" });
      const d = await r.json();
      setData(d);
      setLastCheck(new Date());
      // Conserver historique
      setHistory(h => {
        const next = [{ ts: Date.now(), overall: d.overall }, ...h];
        return next.slice(0, HISTORY_SIZE);
      });
    } catch (e) {
      setData({ overall: "down", services: [], error: e?.message });
    }
    setLoading(false);
  }

  // Check Realtime côté client (WebSocket)
  async function checkRealtime() {
    const t0 = Date.now();
    try {
      const channel = supabase.channel("health-probe-" + Date.now());
      const result = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ status: "down", error: "Timeout 5s" }), 5000);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);
            resolve({ status: "operational", latency_ms: Date.now() - t0 });
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timeout);
            resolve({ status: "down", error: status });
          }
        });
      });
      setRealtime(result);
      // Cleanup
      supabase.removeChannel(channel);
    } catch (e) {
      setRealtime({ status: "down", error: e?.message });
    }
  }

  useEffect(() => {
    check();
    checkRealtime();
    // Alpha 0.52.0 (BD) : charger métriques 7j
    loadMetrics7d();
    const id = setInterval(() => {
      check();
      checkRealtime();
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [auth?.structureId]);

  // Alpha 0.52.0 (BD) : métriques 7 derniers jours via audit_log + app_logs
  async function loadMetrics7d() {
    if (!auth?.structureId) return;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    try {
      const [actions, errors, conn] = await Promise.all([
        supabase.from("audit_log")
          .select("id", { count: "exact", head: true })
          .eq("structure_id", auth.structureId)
          .gte("created_at", since),
        supabase.from("app_logs")
          .select("id", { count: "exact", head: true })
          .eq("structure_id", auth.structureId)
          .gte("created_at", since)
          .eq("level", "error"),
        supabase.from("audit_log")
          .select("id", { count: "exact", head: true })
          .eq("structure_id", auth.structureId)
          .gte("created_at", since)
          .eq("action", "connexion"),
      ]);
      setMetrics7d({
        nb_actions: actions.count || 0,
        nb_errors: errors.count || 0,
        nb_connexions: conn.count || 0,
      });
    } catch (e) {
      // Si app_logs n'existe pas encore (patch 0.52 non appliqué), on ignore
      setMetrics7d(null);
    }
  }

  function statusColor(s) {
    return s === "operational" ? "#5aa05a" : s === "degraded" ? "#EF9F27" : "#c0392b";
  }
  function statusLabel(s) {
    return s === "operational" ? "Opérationnel" : s === "degraded" ? "Dégradé" : s === "checking" ? "Vérification…" : "Hors service";
  }
  function statusIcon(s) {
    return s === "operational" ? "ti-circle-check" : s === "degraded" ? "ti-alert-triangle" : s === "checking" ? "ti-loader" : "ti-circle-x";
  }

  const allServices = [
    ...(data?.services || []),
    { name: "Supabase Realtime (WS)", status: realtime.status, latency_ms: realtime.latency_ms, error: realtime.error || null },
  ];
  const overall = allServices.some(s => s.status === "down") ? "down" 
    : allServices.some(s => s.status === "degraded") ? "degraded" 
    : allServices.every(s => s.status === "operational") ? "operational" 
    : "checking";

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION"
          icon="ti-activity-heartbeat"
          title="Statut système"
          accent="services"
          sub="Ping en temps réel des services backend (refresh toutes les 30s)"
        />

        {/* Bandeau état global */}
        <Panel style={{
          marginBottom: 16,
          background: overall === "operational" ? "linear-gradient(135deg, #eef9ef 0%, #fff 100%)" 
            : overall === "degraded" ? "linear-gradient(135deg, #fff8ec 0%, #fff 100%)"
            : overall === "down" ? "linear-gradient(135deg, #fef0ee 0%, #fff 100%)"
            : "linear-gradient(135deg, #f4f7fa 0%, #fff 100%)",
          borderColor: statusColor(overall),
          borderLeftWidth: 5,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: statusColor(overall) + "22",
              color: statusColor(overall),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }} aria-hidden="true">
              <i className={`ti ${statusIcon(overall)}`} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "#142131" }}>
                {overall === "operational" && "Tous les services fonctionnent normalement"}
                {overall === "degraded" && "Performance dégradée"}
                {overall === "down" && "Incident en cours"}
                {overall === "checking" && "Vérification en cours…"}
              </h2>
              {lastCheck && (
                <div style={{ fontSize: 12, color: "#8a98a8", marginTop: 4 }}>
                  Dernier check : {lastCheck.toLocaleTimeString("fr-FR")}
                </div>
              )}
            </div>
            <Btn variant="ghost" icon="ti-refresh" onClick={() => { check(); checkRealtime(); }} disabled={loading}>
              {loading ? "…" : "Rafraîchir"}
            </Btn>
          </div>
        </Panel>

        {/* Détail par service */}
        <Panel style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#142131" }}>
            <i className="ti ti-stack" style={{ color: "#185FA5", marginRight: 6 }} />
            Services ({allServices.length})
          </h3>
          {allServices.length === 0 ? (
            <StateMsg>Chargement…</StateMsg>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {allServices.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px",
                  background: "#fff", border: `1px solid #e3e9ee`,
                  borderLeft: `4px solid ${statusColor(s.status)}`,
                  borderRadius: 8,
                }}>
                  <i className={`ti ${statusIcon(s.status)}`} style={{ color: statusColor(s.status), fontSize: 22 }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#142131" }}>{s.name}</div>
                    {s.error && (
                      <div style={{ fontSize: 11.5, color: "#c0392b", marginTop: 2 }}>
                        <i className="ti ti-alert-circle" /> {s.error}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: 11, fontWeight: 700, 
                      color: statusColor(s.status),
                      textTransform: "uppercase", letterSpacing: ".5px",
                    }}>
                      {statusLabel(s.status)}
                    </span>
                    {s.latency_ms != null && (
                      <div style={{ fontSize: 11, color: "#8a98a8" }}>{s.latency_ms} ms</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Alpha 0.52.0 (BD) : métriques 7 derniers jours */}
        {metrics7d && (
          <Panel style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
              <i className="ti ti-chart-line" style={{ color: "#185FA5", marginRight: 6 }} />
              Métriques 7 derniers jours
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div style={{ background: "#eef5fc", border: "1px solid #bfd6f0", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                  <i className="ti ti-history" /> Actions tracées
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#142131" }}>{metrics7d.nb_actions.toLocaleString("fr-FR")}</div>
                <div style={{ fontSize: 10.5, color: "#6c7a89" }}>audit_log</div>
              </div>
              <div style={{ background: metrics7d.nb_errors > 0 ? "#fef0ee" : "#eef9ef", border: `1px solid ${metrics7d.nb_errors > 0 ? "#f0c4be" : "#bfe2bf"}`, borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: metrics7d.nb_errors > 0 ? "#7a1f15" : "#2e6f33", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                  <i className={`ti ${metrics7d.nb_errors > 0 ? "ti-alert-circle" : "ti-circle-check"}`} /> Erreurs front
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#142131" }}>{metrics7d.nb_errors.toLocaleString("fr-FR")}</div>
                <div style={{ fontSize: 10.5, color: "#6c7a89" }}>app_logs (level: error)</div>
              </div>
              <div style={{ background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7a4f15", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                  <i className="ti ti-login" /> Connexions
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#142131" }}>{metrics7d.nb_connexions.toLocaleString("fr-FR")}</div>
                <div style={{ fontSize: 10.5, color: "#6c7a89" }}>action: connexion</div>
              </div>
            </div>
          </Panel>
        )}

        {/* Historique des checks */}
        {history.length > 0 && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
              <i className="ti ti-timeline" style={{ color: "#7a6fb0", marginRight: 6 }} />
              Historique récent ({history.length} derniers checks)
            </h3>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {history.map((h, i) => (
                <div 
                  key={i}
                  title={`${new Date(h.ts).toLocaleTimeString("fr-FR")} — ${statusLabel(h.overall)}`}
                  style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: statusColor(h.overall),
                    cursor: "help",
                  }}
                  aria-label={`Check à ${new Date(h.ts).toLocaleTimeString("fr-FR")} : ${statusLabel(h.overall)}`}
                />
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#8a98a8", marginTop: 10, marginBottom: 0 }}>
              Le check le plus récent est à gauche. Chaque carré représente un cycle de 30 secondes.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
