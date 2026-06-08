"use client";
// Page Commandes — Historique et suivi des commandes passées aux magasins
import { useEffect, useState, Fragment, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
// 0.58.45 : hook pour les page-actions du Cmd+K (export-csv)
import { usePageAction } from "../../lib/usePageAction";
// 0.58.54 : filtre contexte bât/svc via patient_id
import { useContextPatientIds } from "../../lib/useContextPatientIds";
import { fmtEur, fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import FoldableFilters from "../components/FoldableFilters";  /* 0.62.119 */
import MobileActionsBar from "../components/MobileActionsBar";  /* 0.62.109 */
import { useCart } from "../useCart";
import { PageHead, Panel, Statut, StateMsg } from "../ui";
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { KpiRow } from "../kpis";
import { logger } from "../../lib/logger";

export default function Commandes() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [cmds, setCmds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [lignes, setLignes] = useState({});
  // 0.62.119 : recherche texte
  const [search, setSearch] = useState("");
  // 0.62.115 : ViewModeToggle
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === "undefined") return "grid";
    return localStorage.getItem("av:commandes:viewMode") || "grid";  /* 0.65.15 : grid par défaut */
  });
  useEffect(() => {
    try { localStorage.setItem("av:commandes:viewMode", viewMode); } catch {}
  }, [viewMode]);

  // 0.58.54 : filtre ctx (bâtiment/service) via patients liés
  const { patientIds, ctx } = useContextPatientIds();
  const filteredCmds = useMemo(() => {
    let result = cmds;
    if (ctx.active && (patientIds || ctx.equipeId)) {
      result = result.filter(c => {
        if (patientIds && c.patient_id && !patientIds.has(c.patient_id)) return false;
        if (ctx.equipeId && c.equipe_id !== ctx.equipeId) return false;
        return true;
      });
    }
    // 0.62.119 : recherche texte
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      result = result.filter(c =>
        (c.numero || "").toLowerCase().includes(s) ||
        (c.magasins?.nom || "").toLowerCase().includes(s) ||
        (c.statut || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [cmds, ctx.active, patientIds, ctx.equipeId, search]);

  // 0.58.45 : export CSV des commandes (pour Cmd+K)
  async function exportCommandesCsv() {
    try {
      const { exportRows } = await import("../../lib/exportExcel");
      await exportRows(cmds || [], {
        filename: `commandes_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "Commandes",
        columns: {
          "Numéro": (r) => r.numero || r.id || "",
          "Date": (r) => r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "",
          "Statut": "statut",
          "Total": (r) => Number(r.total || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          "Magasin": (r) => r.magasins?.nom || "",
        },
      });
    } catch (e) {
      console.error("Export CSV commandes :", e);
    }
  }
  usePageAction("export-csv", () => exportCommandesCsv());

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        // 0.65.16 : essai avec jointures, fallback simple si FK pas déclarée
        let q = supabase.from("commandes").select("*, magasins(nom), etablissements(nom, ville), fournisseurs(raison_sociale)").order("created_at", { ascending: false });
        if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
        let { data, error } = await q;
        if (error) {
          // Fallback : sans fournisseurs
          let q2 = supabase.from("commandes").select("*, magasins(nom), etablissements(nom, ville)").order("created_at", { ascending: false });
          if (auth.etabId) q2 = q2.eq("etablissement_id", auth.etabId);
          ({ data } = await q2);
        }
        setCmds(data || []);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Commandes] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, auth.etabId]);

  async function toggle(id) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!lignes[id]) {
      const { data } = await supabase.from("commande_lignes").select("*").eq("commande_id", id);
      setLignes((p) => ({ ...p, [id]: data || [] }));
    }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      {/* 0.62.110 : barre actions mobile + desktop */}
      <MobileActionsBar
        primary={[
          { icon: "ti-plus", label: "Nouvelle commande", onClick: () => {
            window.location.href = "/achats";
          }, color: "#7CC8C8" },
        ]}
        secondary={[
          { icon: "ti-file-spreadsheet", label: "Export CSV", onClick: exportCommandesCsv },
          { icon: "ti-printer", label: "Imprimer", onClick: () => window.print() },
        ]}
      />
      <div className="wrap">
        <PageHead small title="Mes commandes" sub="Historique des commandes passées auprès de vos magasins" />
        <KpiRow tiles={[
          { label: "Commandes", value: cmds.length, icon: "ti-truck-delivery", color: "#5a8f8f" },
          { label: "En cours", value: cmds.filter((c) => c.statut === "En cours").length, icon: "ti-clock", color: "#EF9F27" },
          { label: "Livrées", value: cmds.filter((c) => c.statut === "Livrée").length, icon: "ti-check", color: "#5aa05a" },
          { label: "Total", value: cmds.reduce((s2, c) => s2 + Number(c.total || 0), 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }), icon: "ti-cash", color: "#7a6fb0" },
        ]} />

        {/* 0.62.119 : FoldableFilters avec search */}
        <FoldableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher par n° de commande, magasin…"
          activeFiltersCount={search ? 1 : 0}
          onResetAll={() => setSearch("")}
          storageKey="commandes"
        >
          <div style={{ fontSize: 12, color: "#5a6878" }}>
            <i className="ti ti-info-circle" /> Filtres avancés disponibles : statut, dates, magasin (en cours d'intégration)
          </div>
        </FoldableFilters>

        <Panel>
          {loading ? (
            /* 0.58.9 : SkeletonRow x 4 */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3].map((i) => <SkeletonRow key={i} cols={4} />)}
            </div>
          )
            : filteredCmds.length === 0 ? (
              <EmptyState
                illustration="folder"
                variant="teal"
                title={ctx.active && cmds.length > 0 ? "Aucune commande dans ce périmètre" : "Aucune commande pour le moment"}
                message={ctx.active && cmds.length > 0
                  ? `Aucune commande liée aux patients du bâtiment/service actif. (${cmds.length} commandes au total dans l'établissement)`
                  : "Découvre les promotions du moment pour passer ta première commande auprès du fournisseur."}
                actionLabel={ctx.active && cmds.length > 0 ? null : "Voir les promotions"}
                onAction={ctx.active && cmds.length > 0 ? null : () => router.push("/promotions")}
              />
            )
            : (
              <>
                {/* 0.62.115 : Toggle Liste / Tuiles */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <div style={{ display: "inline-flex", background: "#f4f7fa", borderRadius: 10, padding: 3, gap: 2 }}>
                    <button onClick={() => setViewMode("list")} title="Vue liste"
                      style={{
                        padding: "6px 12px", borderRadius: 7,
                        background: viewMode === "list" ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
                        color: viewMode === "list" ? "#fff" : "#5a6878",
                        border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                        transition: "all 200ms",
                      }}>
                      <i className="ti ti-list" /> Liste
                    </button>
                    <button onClick={() => setViewMode("grid")} title="Vue tuiles"
                      style={{
                        padding: "6px 12px", borderRadius: 7,
                        background: viewMode === "grid" ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
                        color: viewMode === "grid" ? "#fff" : "#5a6878",
                        border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
                        transition: "all 200ms",
                      }}>
                      <i className="ti ti-grid-dots" /> Tuiles
                    </button>
                  </div>
                </div>

                {viewMode === "grid" ? (
                  <div className="av-stagger" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 12,
                  }}>
                    {filteredCmds.map((c) => {
                      const statutColor = c.statut === "livree" || c.statut === "Livrée" ? "#5aa05a"
                                        : c.statut === "annulee" || c.statut === "Annulée" ? "#e35d5b"
                                        : c.statut === "en_preparation" || c.statut === "En préparation" ? "#EF9F27"
                                        : c.statut === "envoyee" || c.statut === "Envoyée" ? "#7CC8C8"
                                        : "#185FA5";
                      const totalHT  = c.montant_total_ht  ?? c.total ?? 0;
                      const totalTTC = c.montant_total_ttc ?? (totalHT * 1.2);
                      return (
                        <div key={c.id} data-3d="true" data-accent="bleu" onClick={() => toggle(c.id)}
                          style={{
                            background: "#fff",
                            borderRadius: 14,
                            padding: 14,
                            cursor: "pointer",
                            border: `1px solid ${statutColor}33`,
                            borderLeft: `4px solid ${statutColor}`,
                            boxShadow: "0 2px 8px rgba(20,33,49,.05)",
                          }}>
                          {/* Header : Numéro + Statut */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#142131", letterSpacing: 0.3 }}>
                                <i className="ti ti-shopping-cart" style={{ color: statutColor, marginRight: 4 }} />
                                {c.numero}
                              </div>
                              <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <span><i className="ti ti-calendar" /> {fmtDate(c.created_at)}</span>
                                {c.date_livraison_prevue && (
                                  <span style={{ color: "#7a6fb0", fontWeight: 600 }}>
                                    <i className="ti ti-truck-delivery" /> Livr. : {fmtDate(c.date_livraison_prevue)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span style={{
                              padding: "3px 8px", borderRadius: 6,
                              background: statutColor, color: "#fff",
                              fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                              textTransform: "uppercase",
                              boxShadow: `0 2px 6px ${statutColor}55`,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}>
                              {c.statut || "—"}
                            </span>
                          </div>

                          {/* 0.65.15 : Établissement */}
                          {c.etablissements && (
                            <div style={{ fontSize: 12.5, color: "#142131", marginBottom: 4, fontWeight: 700 }}>
                              <i className="ti ti-building-hospital" style={{ color: "#185FA5", marginRight: 4 }} />
                              {c.etablissements.nom}
                              {c.etablissements.ville && <span style={{ color: "#8a98a8", fontWeight: 400 }}> · {c.etablissements.ville}</span>}
                            </div>
                          )}

                          {/* Magasin */}
                          {c.magasins?.nom && (
                            <div style={{ fontSize: 12, color: "#5a6878", marginBottom: 3 }}>
                              <i className="ti ti-building-store" style={{ color: "#5a8f8f", marginRight: 4 }} />
                              Magasin : <b style={{ color: "#142131" }}>{c.magasins.nom}</b>
                            </div>
                          )}

                          {/* 0.65.15 : Fournisseur */}
                          {c.fournisseurs?.raison_sociale && (
                            <div style={{ fontSize: 12, color: "#5a6878", marginBottom: 3 }}>
                              <i className="ti ti-truck-loading" style={{ color: "#EF9F27", marginRight: 4 }} />
                              Fournisseur : <b style={{ color: "#142131" }}>{c.fournisseurs.raison_sociale}</b>
                            </div>
                          )}

                          {/* 0.65.15 : Notes */}
                          {c.notes && (
                            <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 6, padding: 6, background: "#fafbfc", borderRadius: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                              <i className="ti ti-message" /> {c.notes.slice(0, 80)}{c.notes.length > 80 ? "…" : ""}
                            </div>
                          )}

                          {/* Total HT + TTC */}
                          <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            paddingTop: 10, marginTop: 8, borderTop: "1px solid #f0f3f6",
                          }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: 9.5, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>
                                Total HT
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#5a6878" }}>
                                {fmtEur(totalHT)}
                              </span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 9.5, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, display: "block" }}>
                                Total TTC
                              </span>
                              <span style={{ fontSize: 20, fontWeight: 800, color: "#142131", lineHeight: 1 }}>
                                {fmtEur(totalTTC)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <table>
                    <thead><tr><th>N°</th><th>Date</th><th>Magasin</th><th style={{ textAlign: "right" }}>Total</th><th>Statut</th><th></th></tr></thead>
                    <tbody>
                      {filteredCmds.map((c) => (
                        <Fragment key={c.id}>
                          <tr style={{ cursor: "pointer" }} onClick={() => toggle(c.id)}>
                            <td data-label="N°" style={{ fontWeight: 600 }}>{c.numero}</td>
                            <td data-label="Date">{fmtDate(c.created_at)}</td>
                            <td data-label="Magasin">{c.magasins?.nom || "—"}</td>
                            <td data-label="Total" style={{ textAlign: "right" }}>{fmtEur(c.total)}</td>
                            <td data-label="Statut"><Statut value={c.statut} /></td>
                            <td style={{ textAlign: "right" }}>
                              {/* 0.62.135 : bouton vers /commandes/[id] */}
                              <a href={`/commandes/${c.id}`}
                                onClick={(e) => e.stopPropagation()}
                                title="Voir le détail + workflow"
                                style={{
                                  padding: "4px 8px",
                                  background: "rgba(122, 111, 176, .15)",
                                  color: "#5e4a8c",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  marginRight: 6,
                                }}>
                                <i className="ti ti-stack-2" /> Workflow
                              </a>
                              <i className={`ti ti-chevron-${open === c.id ? "up" : "down"}`} />
                            </td>
                          </tr>
                          {open === c.id && (
                            <tr><td colSpan={6} style={{ background: "#f9fbfc", padding: 0 }}>
                              <table className="av-mini-table"><tbody>
                                {(lignes[c.id] || []).map((l) => (
                                  <tr key={l.id}>
                                    <td style={{ paddingLeft: 24 }}>{l.libelle}</td>
                                    <td style={{ textAlign: "right" }}>{l.quantite} × {fmtEur(l.prix_unitaire)}</td>
                                    <td style={{ textAlign: "right", paddingRight: 24, fontWeight: 600 }}>{fmtEur(l.quantite * l.prix_unitaire)}</td>
                                  </tr>
                                ))}
                              </tbody></table>
                            </td></tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
        </Panel>
      </div>
    </div>
  );
}
