"use client";
// =============================================================
//  /admin-perf — Dashboard performance SQL
//  Alpha 0.46.0
//
//  Admin only. Affiche les requêtes les plus lentes via 
//  pg_stat_statements + permet de reset les stats.
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../ui";
import { toast } from "../components/ui-premium";
import { useConfirm } from "../dialogs";
import { logger } from "../../lib/logger";

export default function AdminPerfPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const { confirm, ConfirmModalElement } = useConfirm();

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [busyReset, setBusyReset] = useState(false);

  const peutVoir = auth.role?.nom === "Administrateur" || auth.can?.("gerer_roles");

  async function load() {
    if (!peutVoir) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_top_slow_queries", { p_limit: limit });
      if (error) throw error;
      setQueries(data || []);
    } catch (e) {
      // pg_stat_statements peut-être pas activé
      logger.warn("Erreur chargement stats :", e?.message);
      setQueries([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, limit, peutVoir]);

  async function resetStats() {
    const ok = await confirm({
      title: "Reset des statistiques ?",
      message: "Toutes les mesures pg_stat_statements seront remises à zéro. Utile après une optim pour mesurer son impact.",
      variant: "danger",
      confirmLabel: "Reset",
      icon: "ti-refresh",
    });
    if (!ok) return;
    setBusyReset(true);
    try {
      await supabase.rpc("reset_query_stats");
      await load();
    } catch (e) {
      toast.error("Erreur reset : " + e.message);
    } finally {
      setBusyReset(false);
    }
  }

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

  function classifySpeed(meanMs) {
    if (meanMs >= 1000) return { lbl: "Très lent", color: "#c0392b" };
    if (meanMs >= 100) return { lbl: "Lent", color: "#EF9F27" };
    if (meanMs >= 10) return { lbl: "Moyen", color: "#185FA5" };
    return { lbl: "Rapide", color: "#5aa05a" };
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION"
          icon="ti-bolt"
          title="Performance"
          accent="SQL"
          sub="Top requêtes lentes — via pg_stat_statements"
        />

        <Panel style={{ marginBottom: 14, padding: "12px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#6c7a89" }}>Afficher les</span>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              style={{ padding: "5px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span style={{ fontSize: 12.5, color: "#6c7a89" }}>requêtes les plus lentes en moyenne</span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Btn variant="ghost" icon="ti-refresh" onClick={load} ariaLabel="Recharger">
                Recharger
              </Btn>
              <Btn variant="danger" icon="ti-trash" onClick={resetStats} disabled={busyReset} ariaLabel="Reset stats">
                {busyReset ? "Reset…" : "Reset stats"}
              </Btn>
            </div>
          </div>
        </Panel>

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : queries.length === 0 ? (
          <Panel>
            <StateMsg>
              <i className="ti ti-info-circle" /> Aucune donnée. L'extension pg_stat_statements n'est peut-être pas encore activée,
              ou le patch 0.46 n'a pas été appliqué.
            </StateMsg>
          </Panel>
        ) : (
          <Panel>
            <div style={{ overflowX: "auto" }}>
              <div className="panel-table"><table style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Vitesse</th>
                    <th>Requête (anonymisée)</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Appels</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Moyenne</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Total</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Lignes/appel</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q, i) => {
                    const speed = classifySpeed(q.mean_exec_time);
                    return (
                      <tr key={i}>
                        <td>
                          <span style={{
                            display: "inline-block",
                            fontSize: 10.5, fontWeight: 700,
                            padding: "2px 8px", borderRadius: 8,
                            background: speed.color + "22", color: speed.color,
                            textTransform: "uppercase", letterSpacing: ".4px",
                          }}>{speed.lbl}</span>
                        </td>
                        <td style={{ fontFamily: "Consolas, monospace", fontSize: 11, color: "#142131", maxWidth: 500 }}>
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={q.query}>
                            {q.query}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "#142131" }}>
                          {q.calls?.toLocaleString("fr-FR") || 0}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: speed.color }}>
                          {q.mean_exec_time?.toFixed(2)} ms
                        </td>
                        <td style={{ textAlign: "right", fontSize: 11.5, color: "#6c7a89" }}>
                          {q.total_exec_time >= 1000
                            ? `${(q.total_exec_time / 1000).toFixed(1)} s`
                            : `${q.total_exec_time?.toFixed(0)} ms`}
                        </td>
                        <td style={{ textAlign: "right", fontSize: 11.5, color: "#6c7a89" }}>
                          {q.calls > 0 ? (q.rows / q.calls).toFixed(1) : "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
            <p style={{ fontSize: 11, color: "#8a98a8", marginTop: 12, marginBottom: 0 }}>
              <i className="ti ti-info-circle" /> Les requêtes lentes (orange/rouge) sont des candidats pour de nouveaux indexes. 
              Vérifie le <code>EXPLAIN ANALYZE</code> dans Supabase SQL Editor pour comprendre où ajouter un index.
            </p>
          </Panel>
        )}

        {ConfirmModalElement}
      </div>
    </div>
  );
}
