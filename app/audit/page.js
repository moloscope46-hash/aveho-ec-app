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
import { toast } from "../components/ui-premium";
// 0.58.49 : migration UI premium pour audit
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { Heatmap } from "../Charts";
import { logger } from "../../lib/logger";
// 0.58.30 : vue timeline (réutilise composant partagé extrait de /historique)
import AuditTimeline from "../components/AuditTimeline";
import { NeonButton } from "../components/ui-premium";

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
  // 0.58.30 : toggle Tableau / Timeline (timeline par défaut pour les nouvelles installs)
  const [viewMode, setViewMode] = useState("timeline");

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
      try {
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
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Audit] load failed:", e);
      }
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
      toast.error("Erreur export CSV : " + e.message);
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

        {/* 0.62.127 : Verrous d'édition actifs (anti-collision) */}
        <LocksPanel />

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
          <Panel>
            <SkeletonRow count={6} />
          </Panel>
        ) : rows.length === 0 ? (
          <Panel>
            <EmptyState
              icon="ti-search-off"
              title="Aucune entrée d'audit"
              description="Aucune entrée ne correspond aux filtres sélectionnés. Élargissez la période ou retirez certains filtres pour voir plus de résultats."
            />
          </Panel>
        ) : (
          <Panel>
            {/* 0.58.30 : toggle Tableau / Timeline */}
            <div style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6c7a89",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginRight: 6,
              }}>
                <i className="ti ti-eye" /> Affichage :
              </span>
              <NeonButton
                variant={viewMode === "timeline" ? "teal" : "blue"}
                icon="ti-timeline-event"
                size="sm"
                onClick={() => setViewMode("timeline")}
                aria-pressed={viewMode === "timeline"}
                style={viewMode === "timeline" ? {} : { opacity: 0.65 }}
              >
                Timeline
              </NeonButton>
              <NeonButton
                variant={viewMode === "table" ? "navy" : "blue"}
                icon="ti-table"
                size="sm"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                style={viewMode === "table" ? {} : { opacity: 0.65 }}
              >
                Tableau
              </NeonButton>
              <span style={{ fontSize: 11.5, color: "#8a98a8", marginLeft: "auto" }}>
                {rows.length} entrée{rows.length > 1 ? "s" : ""} sur {total}
              </span>
            </div>

            {/* 0.58.30 : Vue Timeline (réutilise composant partagé) */}
            {viewMode === "timeline" ? (
              <AuditTimeline
                rows={rows}
                onClickRow={(r) => setDetailRow(r)}
                showDetailJson={true}
                emptyMessage="Aucune entrée correspondant aux filtres."
              />
            ) : (
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
            )}{/* /viewMode === "table" */}

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

// 0.62.127 : Panel des verrous d'édition actifs (anti-collision)
function LocksPanel() {
  const supabase = createClient();
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function loadLocks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("edit_locks")
        .select("*")
        .gte("locked_at", new Date(Date.now() - 120 * 1000).toISOString())
        .order("locked_at", { ascending: false });
      if (error) { setLocks([]); return; }
      setLocks(data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadLocks();
    const it = setInterval(loadLocks, 15 * 1000);
    return () => clearInterval(it);
  }, []);

  async function forceRelease(lock) {
    if (!confirm(`Libérer le verrou de ${lock.user_nom || "cet utilisateur"} sur ${lock.resource_type} ?`)) return;
    setBusy(lock.id);
    try {
      await supabase.from("edit_locks").delete().eq("id", lock.id);
      await loadLocks();
    } finally { setBusy(null); }
  }

  async function releaseAll() {
    if (!confirm(`Libérer TOUS les ${locks.length} verrous actifs ?`)) return;
    setBusy("all");
    try {
      const ids = locks.map(l => l.id);
      for (const id of ids) {
        await supabase.from("edit_locks").delete().eq("id", id);
      }
      await loadLocks();
    } finally { setBusy(null); }
  }

  return (
    <Panel style={{ marginBottom: 14, padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <i className="ti ti-lock" style={{ fontSize: 20, color: "#EF9F27" }} />
        <h3 style={{ margin: 0, fontSize: 15, color: "#142131" }}>
          Verrous d'édition actifs
          <span style={{
            marginLeft: 8,
            background: locks.length > 0 ? "#EF9F27" : "#cfd8e0",
            color: "#fff",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
          }}>{locks.length}</span>
        </h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={loadLocks} disabled={loading}
            style={{ padding: "6px 10px", background: "transparent", border: "1px solid #cfd8e0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "#5a6878" }}>
            <i className={`ti ti-${loading ? "loader-2" : "refresh"}`} style={{ animation: loading ? "av-spinner-spin 0.85s linear infinite" : "none" }} /> Rafraîchir
          </button>
          {locks.length > 0 && (
            <button onClick={releaseAll} disabled={busy === "all"}
              style={{ padding: "6px 10px", background: "linear-gradient(135deg, #e35d5b, #c0392b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 700 }}>
              <i className="ti ti-trash" /> Tout libérer
            </button>
          )}
        </div>
      </div>
      {loading && locks.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: "#8a98a8", fontSize: 13 }}>Chargement…</div>
      ) : locks.length === 0 ? (
        <div style={{ padding: 18, textAlign: "center", color: "#8a98a8", fontSize: 13, background: "#fafbfc", borderRadius: 10, border: "1px dashed #e3e9ee" }}>
          <i className="ti ti-circle-check" style={{ fontSize: 24, color: "#5aa05a", display: "block", marginBottom: 4 }} />
          Aucun verrou actif. Tous les utilisateurs sont libres d'éditer.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
          {locks.map(lock => {
            const since = new Date(lock.locked_at);
            const minAgo = Math.round((Date.now() - since.getTime()) / 60000);
            return (
              <div key={lock.id} style={{
                background: "#fff",
                border: "1px solid #e3e9ee",
                borderLeft: "4px solid #EF9F27",
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <i className="ti ti-pencil" style={{ color: "#EF9F27", fontSize: 18, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#142131", textTransform: "capitalize" }}>
                    {lock.resource_type}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a6878" }}>
                    <i className="ti ti-user" style={{ marginRight: 3 }} />
                    {lock.user_nom || lock.user_id?.substring(0, 8)}
                  </div>
                  <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 2 }}>
                    Depuis {minAgo} min · ID <code style={{ fontFamily: "Consolas, monospace" }}>{lock.resource_id?.substring(0, 8)}…</code>
                  </div>
                </div>
                <button onClick={() => forceRelease(lock)} disabled={busy === lock.id}
                  title="Libérer ce verrou"
                  style={{ background: "rgba(227, 93, 91, .12)", color: "#c0392b", border: "1px solid rgba(227, 93, 91, .25)", padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", flexShrink: 0 }}>
                  <i className="ti ti-lock-open" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
