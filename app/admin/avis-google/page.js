"use client";
import AdminGuard from "../../components/AdminGuard"; // 0.57.34 anti-régression admin
// =============================================================
//  app/admin/avis-google/page.js (Alpha 0.56.6)
//
//  Pilotage des avis Google par établissement.
//  Stats + liste filtrable + déclenchement manuel de la sync +
//  logs des runs cron.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg } from "../../ui";
// 0.58.50 : migration UI premium
import { EmptyState, SkeletonRow } from "../../components/ui-premium";
import { fetchWithAuth } from "../../../lib/fetchWithAuth";  // 0.57.16 : auth Bearer obligatoire

function AvisGooglePageInner() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [stats, setStats] = useState(null);
  const [etabs, setEtabs] = useState([]);
  const [avis, setAvis] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [filterRating, setFilterRating] = useState("all"); // all | 5 | 4 | 3 | 2 | 1 | low (1-2)
  const [filterEtab, setFilterEtab] = useState("");

  useEffect(() => {
    if (!auth.ready) return;
    loadAll();
  }, [auth.ready]);

  async function loadAll() {
    setLoading(true);
    const [{ data: statsData }, { data: etabsData }, { data: avisData }, { data: logsData }] = await Promise.all([
      supabase.rpc("avis_google_stats"),
      supabase.from("etablissements")
        .select("id, nom, google_place_id, google_rating, google_ratings_count, google_last_sync_at, google_sync_status")
        .order("nom").limit(200),
      supabase.from("etablissements_avis_google")
        .select("*, etablissements(nom)")
        .order("publish_time", { ascending: false, nullsLast: true })
        .limit(100),
      supabase.from("google_sync_logs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(10),
    ]);
    setStats((statsData && statsData[0]) || null);
    setEtabs(etabsData || []);
    setAvis(avisData || []);
    setLogs(logsData || []);
    setLoading(false);
  }

  async function triggerSync(etabId = null) {
    setSyncing(true);
    setSyncMsg(null);
    const token = (await supabase.auth.getSession()).data?.session?.access_token;
    try {
      const res = await fetchWithAuth("/api/google-reviews/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ etablissement_id: etabId }),
      });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg({
          type: "success",
          text: `Sync terminée — ${data.etablissements_ok}/${data.etablissements_total} OK · ${data.nouveaux_avis} nouvel(s) avis · ${data.duration_ms}ms`,
        });
        await loadAll();
      } else {
        // 0.56.14 : afficher le hint si dispo (diagnostic enrichi)
        setSyncMsg({
          type: "error",
          text: data.error || "Erreur sync",
          hint: data.hint,
        });
      }
    } catch (e) {
      setSyncMsg({ type: "error", text: e.message });
    } finally {
      setSyncing(false);
    }
  }

  const filteredAvis = avis.filter(a => {
    if (filterEtab && a.etablissement_id !== filterEtab) return false;
    if (filterRating === "all") return true;
    if (filterRating === "low") return a.rating <= 2;
    return a.rating === parseInt(filterRating);
  });

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN · GOOGLE REVIEWS"
          icon="ti-star"
          title="Avis Google"
          accent="(sync auto toutes les 6h)"
          sub="Les avis Google Places sont synchronisés automatiquement toutes les 6h pour tous les établissements ayant un google_place_id"
        />

        {/* Stats */}
        {stats && (
          <Panel style={{ marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
              <i className="ti ti-chart-bar" /> Statistiques globales
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <Kpi label="Étabs avec Place ID" value={Number(stats.total_etablissements_avec_place_id).toLocaleString()} color="#185FA5" icon="ti-building-hospital" />
              <Kpi label="Avis total" value={Number(stats.total_avis).toLocaleString()} color="#7a6fb0" icon="ti-message-circle" />
              <Kpi label="Rating moyen" value={stats.rating_moyen ? `${stats.rating_moyen} ★` : "—"} color="#EF9F27" icon="ti-star" />
              <Kpi label="5 étoiles" value={Number(stats.avis_5_etoiles).toLocaleString()} color="#5aa05a" icon="ti-star-filled" />
              <Kpi label="1-2 étoiles" value={Number((stats.avis_1_etoile || 0) + (stats.avis_2_etoiles || 0)).toLocaleString()} color="#c0392b" icon="ti-alert-circle" />
              <Kpi label="Dernière sync" value={stats.derniere_sync ? new Date(stats.derniere_sync).toLocaleString() : "—"} color="#6c7a89" icon="ti-clock" />
            </div>
          </Panel>
        )}

        {/* Action sync globale */}
        <Panel style={{ marginBottom: 12, background: "linear-gradient(135deg, #eef9ef, #fff)", borderColor: "#bfe2bf" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>
                <i className="ti ti-refresh" style={{ color: "#5aa05a" }} /> Sync manuelle
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6c7a89" }}>
                Lance la sync de tous les établissements maintenant (sans attendre le cron 6h)
              </p>
            </div>
            <button
              onClick={() => triggerSync()}
              disabled={syncing}
              style={{
                background: syncing ? "#a0aeb9" : "#5aa05a", color: "#fff", border: "none",
                padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: syncing ? "wait" : "pointer", fontFamily: "inherit",
              }}
            >
              {syncing ? <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> : <i className="ti ti-refresh" />}
              {syncing ? " Sync en cours…" : " Lancer la sync"}
            </button>
          </div>
          {syncMsg && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 6,
              background: syncMsg.type === "success" ? "#dff5e0" : "#fce5e0",
              color: syncMsg.type === "success" ? "#2e6f33" : "#7a2d23",
              fontSize: 12,
            }}>
              <div><i className={`ti ${syncMsg.type === "success" ? "ti-check" : "ti-alert-circle"}`} /> {syncMsg.text}</div>
              {syncMsg.hint && (
                <div style={{ marginTop: 6, padding: 8, background: "rgba(255,255,255,.6)", borderRadius: 4, fontSize: 11, fontStyle: "italic" }}>
                  <i className="ti ti-bulb" /> {syncMsg.hint}
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* Établissements et leur statut Google */}
        <Panel style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>
            <i className="ti ti-building-hospital" /> Établissements ({etabs.length})
          </h3>
          {loading && <p style={{ fontSize: 12, color: "#6c7a89" }}>Chargement…</p>}
          {!loading && etabs.length === 0 && <p style={{ fontSize: 12, color: "#a0aeb9", fontStyle: "italic" }}>Aucun établissement</p>}
          {!loading && etabs.map(e => {
            const hasPlaceId = !!e.google_place_id;
            const statusColor =
              !hasPlaceId ? "#a0aeb9"
              : e.google_sync_status === "ok" ? "#5aa05a"
              : e.google_sync_status === "rate_limited" ? "#EF9F27"
              : e.google_sync_status === "api_error" ? "#c0392b"
              : "#6c7a89";
            return (
              <div key={e.id} style={{ padding: "10px 0", borderBottom: "1px solid #f4f7fa", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <b style={{ fontSize: 13 }}>{e.nom}</b>
                  <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {hasPlaceId ? (
                      <code style={{ fontFamily: "Consolas, monospace", color: "#185FA5" }}>{e.google_place_id.slice(0, 30)}…</code>
                    ) : (
                      <span style={{ color: "#a0aeb9", fontStyle: "italic" }}>Pas de Place ID</span>
                    )}
                    {e.google_rating && (
                      <span style={{ background: "#fff8ec", color: "#7a4f15", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        ★ {e.google_rating} ({e.google_ratings_count || 0})
                      </span>
                    )}
                    {hasPlaceId && (
                      <span style={{ background: `${statusColor}22`, color: statusColor, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        {e.google_sync_status || "jamais sync"}
                      </span>
                    )}
                    {e.google_last_sync_at && (
                      <span>· Dernière sync : {new Date(e.google_last_sync_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                {hasPlaceId && (
                  <button
                    onClick={() => triggerSync(e.id)}
                    disabled={syncing}
                    style={{
                      background: "#185FA5", color: "#fff", border: "none",
                      padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      cursor: syncing ? "wait" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    <i className="ti ti-refresh" /> Sync
                  </button>
                )}
              </div>
            );
          })}
        </Panel>

        {/* Filtres avis */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 14, flex: 1 }}>
              <i className="ti ti-message-circle" /> Avis ({filteredAvis.length})
            </h3>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, background: "#fff" }}>
              <option value="all">Toutes notes</option>
              <option value="5">5 étoiles</option>
              <option value="4">4 étoiles</option>
              <option value="3">3 étoiles</option>
              <option value="2">2 étoiles</option>
              <option value="1">1 étoile</option>
              <option value="low">⚠ Critiques (1-2)</option>
            </select>
            <select value={filterEtab} onChange={(e) => setFilterEtab(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, background: "#fff" }}>
              <option value="">Tous les établissements</option>
              {etabs.filter(e => e.google_place_id).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
        </Panel>

        {/* Liste des avis */}
        {loading && <Panel><SkeletonRow count={4} /></Panel>}
        {!loading && filteredAvis.length === 0 && (
          <Panel>
            <EmptyState
              icon="ti-star-off"
              title="Aucun avis"
              description="Aucun avis Google ne correspond aux filtres sélectionnés. Ajustez les critères pour voir plus de résultats."
            />
          </Panel>
        )}
        {!loading && filteredAvis.length > 0 && (
          <Panel>
            {filteredAvis.map(a => (
              <div key={a.id} style={{
                padding: "12px 0", borderBottom: "1px solid #f4f7fa",
                borderLeft: a.rating <= 2 ? "3px solid #c0392b" : a.rating >= 4 ? "3px solid #5aa05a" : "none",
                paddingLeft: a.rating <= 2 || a.rating >= 4 ? 10 : 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  {a.author_profile_photo_url && (
                    <img src={a.author_profile_photo_url} alt={a.author_name} style={{ width: 30, height: 30, borderRadius: "50%" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <b style={{ fontSize: 13 }}>{a.author_name}</b>
                      <Stars rating={a.rating} />
                      {a.language && a.language !== "fr" && (
                        <span style={{ background: "#dbe7f5", color: "#185FA5", padding: "1px 5px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{a.language}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#6c7a89" }}>
                      {a.etablissements?.nom && <span><i className="ti ti-building-hospital" /> {a.etablissements.nom}</span>}
                      {a.relative_time_description && <span> · {a.relative_time_description}</span>}
                      {a.publish_time && <span> · {new Date(a.publish_time).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {a.author_url && (
                    <a href={a.author_url} target="_blank" rel="noopener noreferrer" style={{ color: "#185FA5", fontSize: 11, textDecoration: "none" }}>
                      Voir profil <i className="ti ti-external-link" />
                    </a>
                  )}
                </div>
                {a.text_content && (
                  <p style={{ margin: "6px 0", fontSize: 12.5, color: "#2a3a48", lineHeight: 1.5, fontStyle: "italic" }}>
                    « {a.text_content} »
                  </p>
                )}
                {a.reply_text && (
                  <div style={{ marginTop: 6, padding: 8, background: "#dbe7f5", borderRadius: 6, fontSize: 12 }}>
                    <b style={{ fontSize: 11, color: "#185FA5" }}><i className="ti ti-message-reply" /> Réponse de l'établissement</b>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#2a3a48" }}>{a.reply_text}</p>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        )}

        {/* Historique des runs */}
        {logs.length > 0 && (
          <Panel style={{ marginTop: 14 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13 }}>
              <i className="ti ti-history" /> Historique des syncs (10 derniers)
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "#f4f7fa", color: "#6c7a89", fontSize: 10, textTransform: "uppercase" }}>
                  <th style={{ textAlign: "left", padding: 6 }}>Date</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Source</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Étabs</th>
                  <th style={{ textAlign: "right", padding: 6 }}>OK</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Erreurs</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Nouveaux avis</th>
                  <th style={{ textAlign: "right", padding: 6 }}>Durée</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #f4f7fa" }}>
                    <td style={{ padding: 6, color: "#6c7a89" }}>{new Date(l.run_at).toLocaleString()}</td>
                    <td style={{ padding: 6 }}>
                      <span style={{
                        background: l.trigger_source === "cron" ? "#f3effa" : "#dff5e0",
                        color: l.trigger_source === "cron" ? "#5a4a90" : "#2e6f33",
                        padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                      }}>{l.trigger_source}</span>
                    </td>
                    <td style={{ padding: 6, textAlign: "right", fontFamily: "Consolas, monospace" }}>{l.etablissements_total}</td>
                    <td style={{ padding: 6, textAlign: "right", fontFamily: "Consolas, monospace", color: "#5aa05a" }}>{l.etablissements_ok}</td>
                    <td style={{ padding: 6, textAlign: "right", fontFamily: "Consolas, monospace", color: l.etablissements_errors > 0 ? "#c0392b" : "#a0aeb9" }}>{l.etablissements_errors}</td>
                    <td style={{ padding: 6, textAlign: "right", fontFamily: "Consolas, monospace", color: "#185FA5" }}>{l.nouveaux_avis || 0}</td>
                    <td style={{ padding: 6, textAlign: "right", fontFamily: "Consolas, monospace", color: "#6c7a89" }}>{l.duration_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        {/* Pédagogie */}
        <Panel style={{ marginTop: 14, background: "#fff8ec", borderColor: "#f0d59f" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#7a4f15" }}>
            <i className="ti ti-info-circle" /> Comment ça marche
          </h3>
          <ul style={{ fontSize: 12, color: "#7a4f15", margin: 0, paddingLeft: 18, lineHeight: 1.65 }}>
            <li>L'Edge Function <code>sync-google-reviews</code> interroge l'API Google Places Details pour chaque établissement ayant un <code>google_place_id</code></li>
            <li>Google retourne <b>maximum 5 avis</b> par établissement (limite API) — les plus récents et pertinents</li>
            <li>Le rating moyen + nombre total d'avis sont mis à jour sur l'établissement</li>
            <li>Les avis sont upsertés (déduplication par auteur+date) — pas de doublons</li>
            <li>Le cron Supabase <code>pg_cron</code> déclenche cette sync <b>toutes les 6h</b> (minuit, 6h, 12h, 18h)</li>
            <li>Le rate limit Google est respecté (200ms entre 2 appels + arrêt si <code>OVER_QUERY_LIMIT</code>)</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, color, icon }) {
  return (
    <div style={{ background: "#f4f7fa", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6c7a89", fontWeight: 600, textTransform: "uppercase" }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 11 }} /> {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Stars({ rating }) {
  return (
    <span style={{ color: "#EF9F27", fontSize: 13, letterSpacing: -1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={i < rating ? "ti ti-star-filled" : "ti ti-star"} style={{ marginRight: 1 }} />
      ))}
      <span style={{ marginLeft: 4, color: "#6c7a89", fontSize: 11 }}>({rating}/5)</span>
    </span>
  );
}

// 0.57.34 : wrapper AdminGuard pour restreindre l'accès aux admins
export default function AvisGooglePage() {
  return (
    <AdminGuard>
      <AvisGooglePageInner />
    </AdminGuard>
  );
}
