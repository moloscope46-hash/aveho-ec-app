"use client";
// =============================================================
//  app/audit/notifs/page.js (0.62.132)
//
//  Historique des notifications auto déclenchées par
//  useRealtimeNotifs (DI urgentes, workflow, signalements critiques).
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { EmptyState, toast } from "../../components/ui-premium";

const TYPE_META = {
  di_urgente: { l: "DI urgente", ic: "ti-tools", col: "#e35d5b" },
  workflow: { l: "Workflow", ic: "ti-stack-2", col: "#7a6fb0" },
  signalement_critique: { l: "Signalement critique", ic: "ti-alert-circle", col: "#EF9F27" },
};

const LEVEL_META = {
  info: { l: "Info", col: "#185FA5" },
  warning: { l: "Avertissement", col: "#EF9F27" },
  urgent: { l: "Urgent", col: "#e35d5b" },
  error: { l: "Erreur", col: "#c0392b" },
};

export default function AuditNotifsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    if (!auth?.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifs_log")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error) setNotifs(data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [auth?.structureId]);

  async function ackAll() {
    if (notifs.filter(n => !n.acknowledged).length === 0) return;
    if (!confirm("Marquer toutes les notifications comme prises en compte ?")) return;
    await supabase.from("notifs_log").update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("structure_id", auth.structureId)
      .eq("acknowledged", false);
    toast.success("Toutes les notifications acquittées");
    await load();
  }

  // Stats
  const stats = {
    total: notifs.length,
    diUrgentes: notifs.filter(n => n.type === "di_urgente").length,
    workflows: notifs.filter(n => n.type === "workflow").length,
    signalements: notifs.filter(n => n.type === "signalement_critique").length,
    unack: notifs.filter(n => !n.acknowledged).length,
  };

  const filtered = notifs.filter(n => {
    if (typeFilter && n.type !== typeFilter) return false;
    if (levelFilter && n.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (n.titre || "").toLowerCase().includes(q) || (n.message || "").toLowerCase().includes(q);
    }
    return true;
  });

  if (!auth?.user) return <div className="bg-dark"><div style={{ padding: 40, color: "#fff" }}>Authentification…</div></div>;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          icon="ti-bell-ringing"
          title="Historique des notifications auto"
          accent="amber"
          eyebrow="AUDIT"
          sub="Trace des notifications déclenchées automatiquement par le système (DI urgentes, workflow, signalements)"
        />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
          <StatCard label="Total" value={stats.total} ic="ti-bell" col="#185FA5" />
          <StatCard label="DI urgentes" value={stats.diUrgentes} ic="ti-tools" col="#e35d5b" />
          <StatCard label="Workflows" value={stats.workflows} ic="ti-stack-2" col="#7a6fb0" />
          <StatCard label="Signalements" value={stats.signalements} ic="ti-alert-circle" col="#EF9F27" />
          <StatCard label="Non acquittés" value={stats.unack} ic="ti-exclamation-mark" col="#e35d5b" highlight />
        </div>

        {/* Toolbar */}
        <Panel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Recherche titre / message..."
              style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
              <option value="">Tous types</option>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
              style={{ padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
              <option value="">Tous niveaux</option>
              {Object.entries(LEVEL_META).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            {stats.unack > 0 && (
              <Btn variant="primary" icon="ti-checks" onClick={ackAll}>Acquitter tout</Btn>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="ti-bell-off"
              title="Aucune notification"
              message={search ? "Aucun résultat pour cette recherche" : "Pas encore de notifications automatiques."}
            />
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {filtered.map(n => {
                const typeM = TYPE_META[n.type] || { l: n.type, ic: "ti-info-circle", col: "#5a6878" };
                const levelM = LEVEL_META[n.level] || { l: n.level, col: "#5a6878" };
                return (
                  <div key={n.id} style={{
                    padding: "10px 14px",
                    background: n.acknowledged ? "#fff" : "linear-gradient(135deg, rgba(239, 159, 39, .08), #fff)",
                    border: n.acknowledged ? "1px solid #e3e9ee" : "1px solid rgba(239, 159, 39, .35)",
                    borderLeft: `4px solid ${typeM.col}`,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    <i className={`ti ${typeM.ic}`} style={{ fontSize: 20, color: typeM.col, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{n.titre}</div>
                      {n.message && <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 1 }}>{n.message}</div>}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 10, color: "#8a98a8" }}>
                        <span>{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                        <span style={{ background: typeM.col + "22", color: typeM.col, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                          {typeM.l}
                        </span>
                        <span style={{ background: levelM.col + "22", color: levelM.col, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                          {levelM.l}
                        </span>
                        {!n.acknowledged && (
                          <span style={{ background: "#e35d5b22", color: "#c0392b", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                            Non acquitté
                          </span>
                        )}
                      </div>
                    </div>
                    {n.link && (
                      <a href={n.link} style={{
                        padding: "6px 10px", background: "rgba(24, 95, 165, .12)", color: "#185FA5",
                        borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: "none",
                      }}>
                        Voir <i className="ti ti-external-link" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value, ic, col, highlight }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: highlight && value > 0 ? `linear-gradient(135deg, ${col}25, ${col}10)` : "#fff",
      border: `1px solid ${highlight && value > 0 ? col + "55" : "#e3e9ee"}`,
      borderRadius: 12,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`ti ${ic}`} style={{ fontSize: 24, color: col }} />
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: col, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
