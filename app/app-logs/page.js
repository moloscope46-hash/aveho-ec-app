"use client";
// =============================================================
//  /app-logs — Consultation des logs applicatifs
//  Alpha 0.52.0
//
//  Affichage des entrées app_logs avec filtres par level, source.
//  Réservé aux administrateurs.
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import TopBar from "../TopBar";
import CompactToggle from "../CompactToggle";
import { PageHead, Panel, StateMsg, Btn } from "../ui";
// 0.58.51 : migration UI premium
import { EmptyState, SkeletonRow } from "../components/ui-premium";

const PAGE_SIZE = 50;
const LEVEL_META = {
  debug: { color: "#8a98a8", bg: "#f4f7fa", icon: "ti-bug" },
  info: { color: "#185FA5", bg: "#eef5fc", icon: "ti-info-circle" },
  warn: { color: "#7a4f15", bg: "#fff8ec", icon: "ti-alert-triangle" },
  error: { color: "#7a1f15", bg: "#fef0ee", icon: "ti-alert-octagon" },
};

export default function AppLogsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtreLevel, setFiltreLevel] = useState("");
  const [filtreSource, setFiltreSource] = useState("");
  const [filtreRecherche, setFiltreRecherche] = useState("");
  const [detailRow, setDetailRow] = useState(null);

  const peutVoir = auth?.role?.nom === "Administrateur" || auth?.can?.("gerer_roles");

  async function load() {
    if (!auth.structureId || !peutVoir) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("app_logs")
      .select("*", { count: "exact" })
      .eq("structure_id", auth.structureId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filtreLevel) q = q.eq("level", filtreLevel);
    if (filtreSource) q = q.eq("source", filtreSource);
    if (filtreRecherche) {
      q = q.or(`message.ilike.%${filtreRecherche}%,user_email.ilike.%${filtreRecherche}%`);
    }

    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, auth.structureId, page, filtreLevel, filtreSource, filtreRecherche]);

  useEffect(() => { setPage(0); }, [filtreLevel, filtreSource, filtreRecherche]);

  function fmt(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  if (!peutVoir && auth.ready) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg><i className="ti ti-lock" /> Accès réservé aux administrateurs.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION"
          icon="ti-bug"
          title="Logs"
          accent="applicatifs"
          sub="Erreurs, warnings et événements techniques côté client"
        />

        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filtreLevel} onChange={(e) => setFiltreLevel(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}>
              <option value="">Tous les niveaux</option>
              <option value="error">Erreurs</option>
              <option value="warn">Warnings</option>
              <option value="info">Infos</option>
              <option value="debug">Debug</option>
            </select>
            <select value={filtreSource} onChange={(e) => setFiltreSource(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}>
              <option value="">Toutes sources</option>
              <option value="client">Client</option>
              <option value="sw">Service Worker</option>
              <option value="cron">Cron</option>
            </select>
            <input
              value={filtreRecherche}
              onChange={(e) => setFiltreRecherche(e.target.value)}
              placeholder="🔍 Recherche message / email…"
              style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, minWidth: 220 }}
            />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <CompactToggle />
              <span style={{ fontSize: 12, color: "#6c7a89" }}>
                <b>{total}</b> entrée{total > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </Panel>

        {loading ? (
          <Panel><SkeletonRow count={6} /></Panel>
        ) : rows.length === 0 ? (
          <Panel>
            <EmptyState
              icon={filtreLevel || filtreSource || filtreRecherche ? "ti-search-off" : "ti-check"}
              title={filtreLevel || filtreSource || filtreRecherche ? "Aucun log avec ces filtres" : "Aucun log"}
              description={filtreLevel || filtreSource || filtreRecherche
                ? "Vos filtres sont peut-être trop restrictifs. Essayez de les élargir pour voir plus de résultats."
                : "L'application n'a rien à signaler — c'est bon signe ! 🎉"}
            />
          </Panel>
        ) : (
          <Panel>
            <div className="panel-table"><table style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Niveau</th>
                  <th style={{ width: 150 }}>Date</th>
                  <th>Message</th>
                  <th style={{ width: 180 }}>User</th>
                  <th style={{ width: 80 }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = LEVEL_META[r.level] || LEVEL_META.info;
                  return (
                    <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => setDetailRow(r)}>
                      <td>
                        <span style={{ background: meta.bg, color: meta.color, padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".4px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <i className={`ti ${meta.icon}`} /> {r.level.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: "#6c7a89", fontSize: 11.5 }}>{fmt(r.created_at)}</td>
                      <td><span style={{ fontSize: 12.5 }}>{r.message}</span></td>
                      <td style={{ fontSize: 11.5, color: "#6c7a89" }}>{r.user_email || "—"}</td>
                      <td style={{ fontSize: 11, color: "#8a98a8" }}>{r.source || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 12 }}>
                <Btn variant="ghost" icon="ti-chevron-left" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Préc.</Btn>
                <span style={{ fontSize: 12, color: "#6c7a89" }}>Page {page + 1} / {totalPages}</span>
                <Btn variant="ghost" icon="ti-chevron-right" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Suiv.</Btn>
              </div>
            )}
          </Panel>
        )}

        {/* Modal détail */}
        {detailRow && (
          <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setDetailRow(null)}>
            <div className="modal" style={{ maxWidth: 600 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>
                <i className={`ti ${LEVEL_META[detailRow.level]?.icon || "ti-info-circle"}`} style={{ color: LEVEL_META[detailRow.level]?.color || "#185FA5", marginRight: 6 }} />
                {detailRow.message}
              </h3>
              <div style={{ display: "grid", gap: 8, fontSize: 12.5 }}>
                <div><b style={{ color: "#6c7a89", textTransform: "uppercase", fontSize: 10, letterSpacing: ".5px" }}>Date</b><br/>{fmt(detailRow.created_at)}</div>
                <div><b style={{ color: "#6c7a89", textTransform: "uppercase", fontSize: 10, letterSpacing: ".5px" }}>User</b><br/>{detailRow.user_email || "—"}</div>
                <div><b style={{ color: "#6c7a89", textTransform: "uppercase", fontSize: 10, letterSpacing: ".5px" }}>URL</b><br/><code style={{ fontSize: 11 }}>{detailRow.url || "—"}</code></div>
                <div><b style={{ color: "#6c7a89", textTransform: "uppercase", fontSize: 10, letterSpacing: ".5px" }}>User-Agent</b><br/><code style={{ fontSize: 11, whiteSpace: "normal", wordBreak: "break-all" }}>{detailRow.user_agent || "—"}</code></div>
                {detailRow.context && (
                  <div>
                    <b style={{ color: "#6c7a89", textTransform: "uppercase", fontSize: 10, letterSpacing: ".5px" }}>Context</b>
                    <pre style={{ background: "#142131", color: "#e8edf2", padding: 10, borderRadius: 6, fontSize: 11, overflowX: "auto", marginTop: 4 }}>
                      {JSON.stringify(detailRow.context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <Btn variant="ghost" onClick={() => setDetailRow(null)}>Fermer</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
