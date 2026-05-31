"use client";
// Page Historique — Consulte la trace d'audit (audit_log).
// Filtres par entité, par action, par utilisateur. Lecture seule.
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Badge } from "../ui";
import { KpiRow } from "../kpis";

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
          </div>
          {loading ? <StateMsg>Chargement…</StateMsg>
            : filteredRows.length === 0 ? <StateMsg>Aucune action enregistrée pour ces filtres.</StateMsg>
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
