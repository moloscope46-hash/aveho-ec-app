"use client";
// =============================================================
//  /audit — Page audit log avec filtres avancés
//  Alpha 0.42.0
//
//  Page admin dédiée pour consulter l'audit log avec :
//  - Filtres : période, user, action, entité, recherche libre
//  - Drill : clic sur ligne ouvre détail JSON
//  - Export CSV (réutilise la logique de /statistiques-activite)
//  - Pagination : 50 lignes par page
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import CompactToggle from "../CompactToggle";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn } from "../ui";
import { Heatmap } from "../Charts";

const PAGE_SIZE = 50;
const ACTIONS = ["creer", "modifier", "supprimer", "valider", "refuser", "recevoir", "cloturer", "signer", "envoyer"];

// Alpha 0.52.0 (BE) : style des boutons preset
const presetBtn = {
  background: "#fff",
  border: "1px solid #bfd6f0",
  color: "#185FA5",
  padding: "4px 12px",
  borderRadius: 14,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "inherit",
  transition: "all .15s",
};

export default function AuditPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailRow, setDetailRow] = useState(null);

  // Filtres
  const [periode, setPeriode] = useState("30"); // 7 | 30 | 90 | all
  const [filtreUser, setFiltreUser] = useState("");
  const [filtreAction, setFiltreAction] = useState("");
  const [filtreEntite, setFiltreEntite] = useState("");
  const [filtreRecherche, setFiltreRecherche] = useState("");
  // Alpha 0.50.0 : filtres avancés — dates personnalisées
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [showAvances, setShowAvances] = useState(false);
  const [users, setUsers] = useState([]);
  const [entites, setEntites] = useState([]);
  const [csvBusy, setCsvBusy] = useState(false);
  // Alpha 0.43.0 : heatmap audit log
  const [heatmap, setHeatmap] = useState([]);

  // Permissions admin uniquement
  const peutVoir = auth.role?.nom === "Administrateur" || auth.can?.("gerer_roles");

  async function load() {
    if (!auth.structureId || !peutVoir) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fenêtre temporelle
    let sinceISO = null;
    let untilISO = null;
    // Alpha 0.50.0 : si dates personnalisées définies, elles écrasent la période
    if (dateDebut) {
      sinceISO = new Date(dateDebut + "T00:00:00Z").toISOString();
    } else if (periode !== "all") {
      sinceISO = new Date(Date.now() - parseInt(periode) * 86400000).toISOString();
    }
    if (dateFin) {
      // Inclusif jusqu'à 23:59:59 du jour de fin
      untilISO = new Date(dateFin + "T23:59:59Z").toISOString();
    }

    // Query principal
    let q = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("structure_id", auth.structureId)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sinceISO) q = q.gte("created_at", sinceISO);
    if (untilISO) q = q.lte("created_at", untilISO);
    if (filtreUser) q = q.eq("user_id", filtreUser);
    if (filtreAction) q = q.eq("action", filtreAction);
    if (filtreEntite) q = q.eq("entite", filtreEntite);
    if (filtreRecherche) {
      // Alpha 0.51.0 : recherche étendue à details (jsonb cast en text)
      // L'index GIN sur details (créé en 0.51) aide pour les requêtes structurées.
      // Pour le ilike '%texte%' sur le cast text, un seq scan reste nécessaire,
      // mais reste rapide grâce à la limit + filtres précédents.
      q = q.or(
        `user_email.ilike.%${filtreRecherche}%,` +
        `entite_id.ilike.%${filtreRecherche}%,` +
        `details::text.ilike.%${filtreRecherche}%`
      );
    }

    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    // Alpha 0.43.0 : charger heatmap (RPC silencieuse, ignore erreur si vue absente)
    try {
      const jours = periode === "all" ? 90 : parseInt(periode);
      const { data: hData } = await supabase.rpc("get_audit_heatmap", {
        p_structure_id: auth.structureId,
        p_action: filtreAction || null,
        p_entite: filtreEntite || null,
        p_jours: jours,
      });
      setHeatmap(hData || []);
    } catch (e) {
      setHeatmap([]);
    }

    setLoading(false);
  }

  // Charger les listes (users + entités distinctes) une seule fois
  useEffect(() => {
    if (!auth.structureId || !peutVoir) return;
    (async () => {
      // Liste users distincts (depuis stats activité si dispo, sinon depuis audit_log direct)
      const { data: us } = await supabase
        .from("v_stats_activite_par_user")
        .select("user_id, user_email")
        .eq("structure_id", auth.structureId);
      setUsers(us || []);
      // Liste entités distinctes (depuis audit_log) — limite pour pas exploser
      const { data: ents } = await supabase
        .from("audit_log")
        .select("entite")
        .eq("structure_id", auth.structureId)
        .limit(200);
      const uniques = [...new Set((ents || []).map(e => e.entite).filter(Boolean))].sort();
      setEntites(uniques);
    })();
  }, [auth.structureId, peutVoir]);

  useEffect(() => {
    if (auth.ready) load();
  }, [auth.ready, auth.structureId, page, periode, filtreUser, filtreAction, filtreEntite, filtreRecherche, dateDebut, dateFin]);

  // Reset page à 0 quand un filtre change
  useEffect(() => {
    setPage(0);
  }, [periode, filtreUser, filtreAction, filtreEntite, filtreRecherche, dateDebut, dateFin]);

  function resetFiltres() {
    setFiltreUser("");
    setFiltreAction("");
    setFiltreEntite("");
    setFiltreRecherche("");
    // Alpha 0.50.0 : reset aussi dates personnalisées
    setDateDebut("");
    setDateFin("");
    setPeriode("30");
  }
  
  // Alpha 0.52.0 (BE) : presets de filtres
  function applyPreset(preset) {
    // Toujours reset d'abord
    setFiltreUser("");
    setFiltreAction("");
    setFiltreEntite("");
    setFiltreRecherche("");
    setDateDebut("");
    setDateFin("");
    setPeriode("30");
    
    switch (preset) {
      case "mes_actions":
        setFiltreUser(auth.user?.id || "");
        break;
      case "suppressions_24h":
        setFiltreAction("supprimer");
        setPeriode("1");
        break;
      case "connexions_7j":
        setFiltreAction("connexion");
        setPeriode("7");
        break;
      case "modifs_aujourdhui":
        setFiltreAction("modifier");
        setPeriode("1");
        break;
      case "validations_30j":
        setFiltreAction("valider");
        setPeriode("30");
        break;
    }
  }
  
  // Alpha 0.50.0 : détection de filtres avancés actifs (pour badge "ON")
  const hasFiltresAvances = !!(dateDebut || dateFin);

  async function exportCSV() {
    if (!auth.structureId) return;
    setCsvBusy(true);
    try {
      // Refetch sans pagination (limite 5000 pour pas exploser)
      let sinceISO = null;
      if (periode !== "all") {
        sinceISO = new Date(Date.now() - parseInt(periode) * 86400000).toISOString();
      }
      let q = supabase
        .from("audit_log")
        .select("created_at, action, entite, entite_id, user_email, etablissement_id, details")
        .eq("structure_id", auth.structureId)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (sinceISO) q = q.gte("created_at", sinceISO);
      if (filtreUser) q = q.eq("user_id", filtreUser);
      if (filtreAction) q = q.eq("action", filtreAction);
      if (filtreEntite) q = q.eq("entite", filtreEntite);

      const { data } = await q;
      const escapeCSV = (v) => {
        if (v == null) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (s.includes(";") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const headers = ["Date", "Action", "Entité", "ID entité", "Utilisateur", "Établissement", "Détails"];
      const lines = [headers.map(escapeCSV).join(";")];
      (data || []).forEach((r) => {
        lines.push([
          r.created_at ? new Date(r.created_at).toLocaleString("fr-FR") : "",
          r.action || "",
          r.entite || "",
          r.entite_id || "",
          r.user_email || "",
          r.etablissement_id || "",
          r.details ? JSON.stringify(r.details) : "",
        ].map(escapeCSV).join(";"));
      });
      const csv = "\uFEFF" + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-aveho-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erreur export CSV : " + e.message);
    } finally {
      setCsvBusy(false);
    }
  }

  const filtresActifs = !!(filtreUser || filtreAction || filtreEntite || filtreRecherche);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!peutVoir) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel>
            <StateMsg>
              <i className="ti ti-shield-x" /> Cette page est réservée aux administrateurs.
            </StateMsg>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMINISTRATION"
          icon="ti-history"
          title="Audit"
          accent="log"
          sub="Trace complète des actions sur la collectivité"
        />

        {/* Alpha 0.52.0 (BE) : filtres rapides prédéfinis */}
        <Panel style={{ marginBottom: 10, padding: "10px 16px", background: "linear-gradient(135deg, #fff 0%, #eef5fc 100%)" }}>
          <div className="chip-row">
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", marginRight: 4 }}>
              <i className="ti ti-bookmark" /> Filtres rapides
            </span>
            <CompactToggle />
            <button onClick={() => applyPreset("mes_actions")} style={presetBtn}>
              <i className="ti ti-user" /> Mes actions
            </button>
            <button onClick={() => applyPreset("suppressions_24h")} style={presetBtn}>
              <i className="ti ti-trash" /> Suppressions 24h
            </button>
            <button onClick={() => applyPreset("modifs_aujourdhui")} style={presetBtn}>
              <i className="ti ti-edit" /> Modifs 24h
            </button>
            <button onClick={() => applyPreset("connexions_7j")} style={presetBtn}>
              <i className="ti ti-login" /> Connexions 7j
            </button>
            <button onClick={() => applyPreset("validations_30j")} style={presetBtn}>
              <i className="ti ti-check" /> Validations 30j
            </button>
          </div>
        </Panel>

        {/* Filtres */}
        <Panel style={{ marginBottom: 14, padding: "12px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <i className="ti ti-filter" style={{ color: "#185FA5", fontSize: 18 }} />

            <select value={periode} onChange={(e) => setPeriode(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}>
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="all">Tout</option>
            </select>

            <select value={filtreUser} onChange={(e) => setFiltreUser(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, minWidth: 200 }}>
              <option value="">Tous utilisateurs</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>{u.user_email || u.user_id?.slice(0, 8)}</option>
              ))}
            </select>

            <select value={filtreAction} onChange={(e) => setFiltreAction(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}>
              <option value="">Toutes actions</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            {entites.length > 0 && (
              <select value={filtreEntite} onChange={(e) => setFiltreEntite(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5 }}>
                <option value="">Toutes entités</option>
                {entites.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}

            <input
              value={filtreRecherche}
              onChange={(e) => setFiltreRecherche(e.target.value)}
              placeholder="🔍 Recherche email / ID / contenu…"
              title="Cherche dans user_email, entite_id, et le contenu jsonb (details)"
              style={{ padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, minWidth: 220 }}
            />

            {filtresActifs && (
              <Btn variant="ghost" icon="ti-x" onClick={resetFiltres}>Réinitialiser</Btn>
            )}

            {/* Alpha 0.50.0 : toggle filtres avancés */}
            <button
              onClick={() => setShowAvances(!showAvances)}
              style={{
                padding: "6px 12px", borderRadius: 6,
                border: `1px solid ${hasFiltresAvances || showAvances ? "#185FA5" : "#e3e9ee"}`,
                background: hasFiltresAvances ? "#eef5fc" : "#fff",
                color: hasFiltresAvances ? "#185FA5" : "#6c7a89",
                cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
              aria-expanded={showAvances}
            >
              <i className={`ti ${showAvances ? "ti-chevron-up" : "ti-adjustments"}`} /> 
              Avancés {hasFiltresAvances && <span style={{ background: "#185FA5", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>ON</span>}
            </button>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#6c7a89" }}>
                <b>{total}</b> entrée{total > 1 ? "s" : ""}
              </span>
              <button
                onClick={exportCSV}
                disabled={csvBusy || loading}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  border: "1px solid #185FA5", background: "#fff", color: "#185FA5",
                  cursor: csvBusy ? "wait" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <i className="ti ti-file-spreadsheet" /> {csvBusy ? "Export…" : "CSV"}
              </button>
            </div>
          </div>

          {/* Alpha 0.50.0 : panneau filtres avancés (dates) */}
          {showAvances && (
            <div style={{ 
              marginTop: 12, padding: 12, 
              background: "#f4f7fa", borderRadius: 8, 
              border: "1px solid #e3e9ee",
              display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
            }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#6c7a89", marginBottom: 4, fontWeight: 600 }}>
                  Du
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  style={{ padding: "5px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#6c7a89", marginBottom: 4, fontWeight: 600 }}>
                  Au
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  style={{ padding: "5px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit" }}
                />
              </div>
              <p style={{ fontSize: 11, color: "#8a98a8", margin: 0, flex: 1, minWidth: 200 }}>
                <i className="ti ti-info-circle" /> Si les dates personnalisées sont définies, elles écrasent le filtre période.
              </p>
            </div>
          )}
        </Panel>

        {/* Alpha 0.43.0 : heatmap temporel des actions */}
        {!loading && heatmap.length > 0 && (
          <Panel style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#142131" }}>
              <i className="ti ti-grid-pattern" style={{ color: "#5e4a8c", marginRight: 6 }} />
              Heatmap des actions {filtreAction || filtreEntite ? <span style={{ fontSize: 12, color: "#6c7a89", fontWeight: 400 }}>(filtrée)</span> : null}
            </h3>
            <Heatmap data={heatmap} color="#5e4a8c" />
            <p style={{ fontSize: 11, color: "#8a98a8", marginTop: 8, marginBottom: 0 }}>
              <i className="ti ti-info-circle" /> Répartition des {total > 0 ? total : "actions"} sur la période filtrée (jour de semaine × heure).
            </p>
          </Panel>
        )}

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : rows.length === 0 ? (
          <Panel>
            <StateMsg>
              <i className="ti ti-search-off" /> Aucune entrée correspondant aux filtres.
            </StateMsg>
          </Panel>
        ) : (
          <Panel>
            <div style={{ overflowX: "auto" }}>
              <div className="panel-table"><table style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>ID</th>
                    <th>Utilisateur</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} onClick={() => setDetailRow(r)} style={{ cursor: "pointer" }} title="Cliquer pour voir le détail">
                      <td style={{ fontSize: 11.5, color: "#6c7a89", whiteSpace: "nowrap" }}>
                        {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                          background: actionColor(r.action).bg, color: actionColor(r.action).fg,
                          textTransform: "uppercase", letterSpacing: ".3px",
                        }}>
                          {r.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 11.5, color: "#142131", fontWeight: 600 }}>{r.entite}</td>
                      <td style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas,monospace" }}>
                        {r.entite_id ? r.entite_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td style={{ fontSize: 11.5, color: "#142131" }}>{r.user_email || "—"}</td>
                      <td style={{ fontSize: 11, color: "#6c7a89", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.details ? JSON.stringify(r.details).slice(0, 60) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ marginTop: 14, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{ padding: "6px 12px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.5 : 1 }}
                >
                  <i className="ti ti-chevron-left" /> Précédent
                </button>
                <span style={{ fontSize: 12.5, color: "#6c7a89" }}>
                  Page <b>{page + 1}</b> / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ padding: "6px 12px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.5 : 1 }}
                >
                  Suivant <i className="ti ti-chevron-right" />
                </button>
              </div>
            )}
          </Panel>
        )}

        {/* Modale détail */}
        {detailRow && (
          <Modal
            open={true}
            title={`Audit log — ${detailRow.action} ${detailRow.entite}`}
            onClose={() => setDetailRow(null)}
            size="lg"
          >
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 6, fontSize: 13, marginBottom: 14 }}>
              <span style={{ color: "#6c7a89", fontWeight: 600 }}>Date :</span>
              <span>{new Date(detailRow.created_at).toLocaleString("fr-FR")}</span>
              <span style={{ color: "#6c7a89", fontWeight: 600 }}>Utilisateur :</span>
              <span>{detailRow.user_email || detailRow.user_id || "—"}</span>
              <span style={{ color: "#6c7a89", fontWeight: 600 }}>Action :</span>
              <span><b>{detailRow.action}</b></span>
              <span style={{ color: "#6c7a89", fontWeight: 600 }}>Entité :</span>
              <span><b>{detailRow.entite}</b></span>
              <span style={{ color: "#6c7a89", fontWeight: 600 }}>ID entité :</span>
              <span style={{ fontFamily: "Consolas,monospace", fontSize: 11.5 }}>{detailRow.entite_id || "—"}</span>
              {detailRow.etablissement_id && (
                <>
                  <span style={{ color: "#6c7a89", fontWeight: 600 }}>Établissement :</span>
                  <span style={{ fontFamily: "Consolas,monospace", fontSize: 11.5 }}>{detailRow.etablissement_id}</span>
                </>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 6 }}>
                Détails JSON
              </div>
              <pre style={{
                background: "#142131", color: "#e8edf2", padding: "12px 14px",
                borderRadius: 8, fontSize: 11.5, lineHeight: 1.5, maxHeight: 320, overflow: "auto",
              }}>
                {JSON.stringify(detailRow.details || {}, null, 2)}
              </pre>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function actionColor(action) {
  const map = {
    creer: { bg: "#dff5e0", fg: "#2e6f33" },
    modifier: { bg: "#eef5fc", fg: "#185FA5" },
    supprimer: { bg: "#fef0ee", fg: "#c0392b" },
    valider: { bg: "#dff5e0", fg: "#2e6f33" },
    refuser: { bg: "#fef0ee", fg: "#c0392b" },
    recevoir: { bg: "#e8e0f0", fg: "#5e4a8c" },
    cloturer: { bg: "#f0f0f3", fg: "#5a6171" },
    signer: { bg: "#eaf7f7", fg: "#1c5454" },
    envoyer: { bg: "#fcefda", fg: "#7a4f15" },
  };
  return map[action] || { bg: "#f4f7fa", fg: "#6c7a89" };
}
