"use client";
// Page Historique — Consulte la trace d'audit (audit_log).
// Filtres par entité, par action, par utilisateur. Lecture seule.
//
// 0.58.25 : VUE TIMELINE PREMIUM (en plus du tableau classique)
//  - Toggle Tableau ⇄ Timeline en haut
//  - Timeline : cards groupées par jour, icônes par action, animations
//  - Avatar email user, badges colorés, mise en valeur des suppressions
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
// 0.57.10 : imports retirés (fmtDate non utilisés)

import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Badge } from "../ui";
import { KpiRow } from "../kpis";
// 0.58.25 : pour le toggle vue timeline
import { NeonButton, EmptyState } from "../components/ui-premium";

// Libellés des actions/entités
const ACTION_LBL = {
  creer: "Création", modifier: "Modification", supprimer: "Suppression",
  valider: "Validation", recevoir: "Réception", inviter: "Invitation",
  connexion: "Connexion",
};
const ACTION_COLOR = {
  creer: "#5aa05a", modifier: "#185FA5", supprimer: "#C9867F",
  valider: "#185FA5", recevoir: "#5aa05a", inviter: "#7a6fb0",
};
// 0.58.25 : icônes Tabler par action pour la timeline
const ACTION_ICON = {
  creer: "ti-plus", modifier: "ti-edit", supprimer: "ti-trash",
  valider: "ti-circle-check", recevoir: "ti-package", inviter: "ti-user-plus",
  connexion: "ti-login",
};

export default function Historique() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fAction, setFAction] = useState("");
  const [fEntite, setFEntite] = useState("");
  const [fPeriode, setFPeriode] = useState("30");      // période en jours, "" = tout
  const [fRecherche, setFRecherche] = useState("");    // Alpha 0.8 : recherche fulltext
  // 0.58.25 : toggle vue Tableau / Timeline (timeline par défaut, plus visuel)
  const [viewMode, setViewMode] = useState("timeline");

  async function load() {
    if (!auth.structureId) return;
    let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (fAction) q = q.eq("action", fAction);
    if (fEntite) q = q.eq("entite", fEntite);
    if (fPeriode) {
      const seuil = new Date(Date.now() - parseInt(fPeriode) * 86400000).toISOString();
      q = q.gte("created_at", seuil);
    }
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, fAction, fEntite, fPeriode]);

  if (!auth.ready) return null;

  // Pour les KPIs : compter les actions des 7 derniers jours
  const j7 = new Date(Date.now() - 7 * 86400000);
  const rows7j = rows.filter((r) => new Date(r.created_at) > j7);
  const utilisateurs7j = new Set(rows7j.map((r) => r.user_email || r.user_id)).size;

  // Liste unique des entités présentes dans l'historique (pour le filtre)
  const entites = Array.from(new Set(rows.map((r) => r.entite))).sort();
  // Alpha 0.8 : filtre recherche fulltext appliqué côté client (cherche dans email, action, entité, et detail JSON)
  const filteredRows = !fRecherche ? rows : rows.filter((r) => {
    const needle = fRecherche.toLowerCase();
    const haystack = [
      r.user_email || "",
      r.action || "",
      r.entite || "",
      r.entite_id || "",
      JSON.stringify(r.details || {}),
    ].join(" ").toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="ADMINISTRATION" icon="ti-history" title="Historique" accent="d'actions" sub="Trace des opérations effectuées dans la collectivité (200 dernières)" />
        <KpiRow tiles={[
          { label: "Total tracé", value: rows.length, icon: "ti-list", color: "#185FA5" },
          { label: "7 derniers jours", value: rows7j.length, icon: "ti-calendar", color: "#5aa05a" },
          { label: "Utilisateurs actifs (7j)", value: utilisateurs7j, icon: "ti-users", color: "#7a6fb0" },
          { label: "Suppressions", value: rows.filter((r) => r.action === "supprimer").length, icon: "ti-trash", color: "#C9867F" },
        ]} />
        <Panel>
          <div className="di-toolbar di-filters" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 220px", minWidth: 200, position: "relative" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8a98a8", fontSize: 14 }} />
              <input type="text" placeholder="Recherche fulltext (email, numéro, détails…)" value={fRecherche} onChange={(e) => setFRecherche(e.target.value)}
                style={{ width: "100%", padding: "8px 10px 8px 32px" }} />
            </div>
            <select value={fPeriode} onChange={(e) => setFPeriode(e.target.value)}>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="">Tout</option>
            </select>
            <select value={fAction} onChange={(e) => setFAction(e.target.value)}>
              <option value="">Toutes les actions</option>
              {Object.entries(ACTION_LBL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={fEntite} onChange={(e) => setFEntite(e.target.value)}>
              <option value="">Toutes les entités</option>
              {entites.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            {(fAction || fEntite || fPeriode !== "30" || fRecherche) && <button className="btn-ghost" onClick={() => { setFAction(""); setFEntite(""); setFPeriode("30"); setFRecherche(""); }}><i className="ti ti-x" /> Réinitialiser</button>}
            {/* 0.58.25 : toggle vue Timeline / Tableau */}
            <div style={{ marginLeft: "auto", display: "inline-flex", background: "#f4f7fa", borderRadius: 10, padding: 3, border: "1px solid #d9dfe5" }}>
              <button
                onClick={() => setViewMode("timeline")}
                style={{
                  background: viewMode === "timeline" ? "#142131" : "transparent",
                  color: viewMode === "timeline" ? "#fff" : "#6c7a89",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 120ms",
                }}
              >
                <i className="ti ti-timeline-event" /> Timeline
              </button>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  background: viewMode === "table" ? "#142131" : "transparent",
                  color: viewMode === "table" ? "#fff" : "#6c7a89",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 120ms",
                }}
              >
                <i className="ti ti-table" /> Tableau
              </button>
            </div>
          </div>
          {loading ? <StateMsg>Chargement…</StateMsg>
            : filteredRows.length === 0 ? (
              <EmptyState illustration="search" variant="gray" title="Aucune action" message="Aucune action enregistrée pour ces filtres." compact />
            )
            : viewMode === "timeline" ? (
              // 0.58.25 : Vue Timeline premium
              <HistoriqueTimeline rows={filteredRows} totalRows={rows.length} />
            )
            : (
              <>
                {filteredRows.length !== rows.length && (
                  <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 10px" }}>
                    <i className="ti ti-info-circle" /> {filteredRows.length} sur {rows.length} ligne(s) — recherche active.
                  </p>
                )}
              <div className="panel-table"><table>
                <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Entité</th><th>Détails</th></tr></thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12, color: "#6c7a89", whiteSpace: "nowrap" }}>
                        {new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ fontSize: 13 }}>{r.user_email || "—"}</td>
                      <td><span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: (ACTION_COLOR[r.action] || "#888") + "1a", color: ACTION_COLOR[r.action] || "#888", border: `1px solid ${ACTION_COLOR[r.action] || "#888"}44`, padding: "3px 10px", borderRadius: 14, fontSize: 12, fontWeight: 600 }}>{ACTION_LBL[r.action] || r.action}</span></td>
                      <td style={{ fontSize: 13 }}><Badge kind={r.entite}>{r.entite}</Badge></td>
                      <td style={{ fontSize: 12, color: "#6c7a89" }}>
                        {r.details ? (
                          <span>
                            {r.details.numero && <b style={{ color: "#142131" }}>{r.details.numero}</b>}
                            {r.details.numero && " · "}
                            {Object.entries(r.details).filter(([k]) => k !== "numero").map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              </>
            )}
        </Panel>
      </div>
    </div>
  );
}

// =============================================================
//  0.58.25 : Composant HistoriqueTimeline (vue chronologique)
//
//  Groupe les events audit_log par jour (clé YYYY-MM-DD).
//  Pour chaque jour : card avec ligne verticale gauche + items.
//  Chaque item : icône colorée par action + détails inline.
// =============================================================
function HistoriqueTimeline({ rows, totalRows }) {
  // Groupe par jour
  const groupedByDay = {};
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = d.toISOString().split("T")[0];
    if (!groupedByDay[key]) groupedByDay[key] = [];
    groupedByDay[key].push(r);
  }
  const days = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));

  function fmtDay(key) {
    const d = new Date(key);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dCmp = new Date(d); dCmp.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - dCmp) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function emailToInitials(email) {
    if (!email) return "?";
    const part = email.split("@")[0];
    const parts = part.split(/[.\-_]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return part.slice(0, 2).toUpperCase();
  }

  // Couleur d'avatar selon hash email (palette Aveho)
  function avatarColor(email) {
    if (!email) return "#8a98a8";
    const palette = ["#185FA5", "#7CC8C8", "#7a6fb0", "#C9867F", "#5aa05a", "#EF9F27"];
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  return (
    <div>
      {rows.length !== totalRows && (
        <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 14px" }}>
          <i className="ti ti-info-circle" /> {rows.length} sur {totalRows} ligne(s) — recherche/filtres actifs.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {days.map((day) => (
          <div key={day} style={{ position: "relative" }}>
            {/* Header jour */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #142131 0%, #243044 100%)",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 99,
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: ".3px",
              boxShadow: "0 4px 12px rgba(20,33,49,.20)",
              marginBottom: 14,
              textTransform: "capitalize",
            }}>
              <i className="ti ti-calendar" />
              {fmtDay(day)}
              <span style={{
                background: "rgba(124,200,200,.2)",
                color: "#7CC8C8",
                padding: "2px 9px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 800,
                marginLeft: 4,
              }}>
                {groupedByDay[day].length} action{groupedByDay[day].length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Timeline items du jour */}
            <div style={{
              position: "relative",
              paddingLeft: 32,
              borderLeft: "2px solid #e3e9ee",
              marginLeft: 14,
            }}>
              {groupedByDay[day].map((r, idx) => {
                const actionColor = ACTION_COLOR[r.action] || "#8a98a8";
                const actionIcon = ACTION_ICON[r.action] || "ti-circle";
                const isDelete = r.action === "supprimer";
                return (
                  <div key={r.id || `${day}-${idx}`} style={{
                    position: "relative",
                    paddingBottom: 18,
                    animation: `av-fade-in 0.4s ${idx * 0.04}s var(--av-ease-out) backwards`,
                  }}>
                    {/* Pastille icône */}
                    <div style={{
                      position: "absolute",
                      left: -49,
                      top: 2,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${actionColor}, ${actionColor}cc)`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      boxShadow: `0 0 0 3px #fff, 0 4px 12px ${actionColor}55, 0 0 16px ${actionColor}33`,
                      flexShrink: 0,
                    }}>
                      <i className={`ti ${actionIcon}`} />
                    </div>

                    {/* Card event */}
                    <div style={{
                      background: isDelete
                        ? "linear-gradient(135deg, #fef2f0 0%, #fff 100%)"
                        : "#fff",
                      border: `1px solid ${isDelete ? "#f0d5d2" : "#e3e9ee"}`,
                      borderLeft: `3px solid ${actionColor}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      boxShadow: "0 2px 8px rgba(20,33,49,.05)",
                      transition: "transform 150ms, box-shadow 200ms",
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(2px)";
                        e.currentTarget.style.boxShadow = `0 6px 16px rgba(20,33,49,.08), 0 0 12px ${actionColor}22`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(20,33,49,.05)";
                      }}
                    >
                      {/* Ligne 1 : Action + Entité + Heure */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{
                          color: actionColor,
                          fontWeight: 700,
                          fontSize: 13.5,
                        }}>
                          {ACTION_LBL[r.action] || r.action}
                        </span>
                        <span style={{ color: "#cfd8e0", fontSize: 12 }}>·</span>
                        <Badge kind={r.entite}>{r.entite}</Badge>
                        <span style={{
                          marginLeft: "auto",
                          fontSize: 11.5,
                          color: "#8a98a8",
                          fontVariantNumeric: "tabular-nums",
                          background: "#f4f7fa",
                          padding: "2px 9px",
                          borderRadius: 99,
                          border: "1px solid #e3e9ee",
                        }}>
                          {fmtTime(r.created_at)}
                        </span>
                      </div>

                      {/* Ligne 2 : Détails */}
                      {r.details && (
                        <div style={{ marginTop: 6, fontSize: 12.5, color: "#6c7a89" }}>
                          {r.details.numero && <b style={{ color: "#142131" }}>{r.details.numero}</b>}
                          {r.details.numero && " · "}
                          {Object.entries(r.details).filter(([k]) => k !== "numero").map(([k, v]) => (
                            <span key={k}>
                              <span style={{ color: "#8a98a8" }}>{k}:</span> {v}{" · "}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ligne 3 : Avatar utilisateur */}
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: avatarColor(r.user_email),
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: ".5px",
                        }}>
                          {emailToInitials(r.user_email)}
                        </div>
                        <span style={{ fontSize: 12, color: "#142131", fontWeight: 500 }}>
                          {r.user_email || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
