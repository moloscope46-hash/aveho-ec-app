"use client";
// =============================================================
//  /magasin — Vue Magasin Aveho (0.59.5)
//  Onglets : Tableau de bord / Catalogue / DI reçues / Partenaires fournisseurs
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useViewMode } from "../../lib/useViewMode";
import { useMagasinContext } from "../../lib/useMagasinContext";
import { MagasinSidebar } from "../components/MagasinSidebar";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const TABS = [
  { id: "dashboard", icon: "ti-dashboard",        lbl: "Tableau de bord", col: "#5a8f8f" },
  { id: "catalogue", icon: "ti-package",          lbl: "Catalogue",        col: "#185FA5" },
  { id: "di",        icon: "ti-truck-loading",    lbl: "DI reçues",        col: "#EF9F27" },
  { id: "sav",       icon: "ti-tool",             lbl: "SAV reçues",       col: "#e35d5b" },
  { id: "transferts", icon: "ti-transfer",        lbl: "Transferts",       col: "#7a6fb0" },
  { id: "bilans",    icon: "ti-clipboard-check",  lbl: "Bilans SAV",       col: "#7CC8C8" },
  { id: "fournisseurs", icon: "ti-truck-delivery", lbl: "Partenaires",     col: "#7a6fb0" },
];

export default function MagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const viewMode = useViewMode();
  const magasinCtx = useMagasinContext();
  const cart = useCart();

  const [activeTab, setActiveTab] = useState("dashboard");

  // 0.60.5 : lire ?tab= dans l'URL pour pré-sélectionner l'onglet (depuis sidebar)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["dashboard", "catalogue", "di", "sav", "bilans", "transferts", "fournisseurs"].includes(tab)) {
      setActiveTab(tab); // 0.62.14 : transferts a maintenant son propre onglet (plus de redirect)
    }
  }, []);
  const [articles, setArticles] = useState([]);
  const [demandes, setDemandes] = useState([]);
  // 0.62.6 : recherche + filtre statut dans tab DI
  const [diSearch, setDiSearch] = useState("");
  const [diStatutFilter, setDiStatutFilter] = useState("");
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ articles: 0, di_pendantes: 0, partenaires: 0, etabs_clients: 0 });
  // 0.60.7 : EC ayant droits avec ce magasin (cantonnement filtres)
  // 0.62.27 : Refresh auto activable
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [etabsAutorises, setEtabsAutorises] = useState([]);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId, magasinCtx.loading, magasinCtx.magasinId]);

  // 0.62.27 : setInterval refresh auto toutes les 30s si activé
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      reload(true);  // silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, auth.structureId, magasinCtx.magasinId]);

  async function reload(silent = false) {
    if (!silent) setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    // 0.60.2 : Si user magasin, filtrer les DI par son magasin_id
    let disQuery = supabase.from("v_magasin_di").select("*").limit(100);
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      disQuery = disQuery.eq("magasin_id", magasinCtx.magasinId);
    }

    // 0.60.7 : Récupère les EC ayant droit avec ce magasin (cantonnement filtres)
    let etabsAutorisesIds = null;
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      const droits = await tryFetch(supabase.from("etablissements_magasins_droits")
        .select("etablissement_id, droit_commande, droit_sav, droit_transfert")
        .eq("magasin_id", magasinCtx.magasinId));
      etabsAutorisesIds = droits
        .filter(d => d.droit_commande || d.droit_sav || d.droit_transfert)
        .map(d => d.etablissement_id);
    }

    const [artsCat, dis, parts, etabsAll] = await Promise.all([
      tryFetch(supabase.from("articles").select("id, libelle, code, prix_vente_ht, type_article, photo_url, est_catalogue_magasin").limit(500)),
      tryFetch(disQuery),
      tryFetch(supabase.from("etablissements_partenaires").select("*").eq("est_fournisseur", true).order("nom")),
      tryFetch(supabase.from("etablissements").select("id, nom, ville").order("nom")),
    ]);

    // Filtrer les établissements autorisés pour le user magasin
    const etabsFiltered = etabsAutorisesIds !== null
      ? etabsAll.filter(e => etabsAutorisesIds.includes(e.id))
      : etabsAll;

    setArticles(artsCat);
    setDemandes(dis);
    setPartenaires(parts);
    setEtabsAutorises(etabsFiltered);
    setStats({
      articles: artsCat.length,
      di_pendantes: dis.filter(d => ["en_attente", "nouvelle", "draft", null].includes(d.statut)).length,
      partenaires: parts.length,
      etabs_clients: etabsFiltered.length,
    });
    if (!silent) setLoading(false);
    setLastRefresh(new Date());
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      {/* 0.60.1 : Layout ERP avec sidebar magasin */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <BackButton />

        {/* Header avec banner switch */}
        <div style={{
          background: "linear-gradient(135deg, rgba(94,143,143,.15), rgba(122,111,176,.10))",
          borderLeft: "4px solid #5a8f8f",
          borderRadius: 12, padding: 16, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <div style={{ width: 48, height: 48, background: "rgba(94,143,143,.25)", color: "#5a8f8f", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
            <i className="ti ti-building-warehouse" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: 0, color: "#142131", fontSize: 22 }}>🏬 Magasin Aveho</h1>
            <div style={{ fontSize: 12.5, color: "#5a6878" }}>Catalogue + DI reçues + partenaires fournisseurs</div>
          </div>
          {/* 0.62.27 : Toggle refresh auto */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <button onClick={() => setAutoRefresh(!autoRefresh)} title="Refresh auto toutes les 30s" style={{
              background: autoRefresh ? "linear-gradient(135deg,#5aa05a,#4a8a4a)" : "transparent",
              color: autoRefresh ? "#fff" : "#5a6878",
              border: autoRefresh ? "none" : "1px solid #cfd8e0",
              padding: "6px 12px", borderRadius: 6,
              fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: autoRefresh ? "#fff" : "#cfd8e0", animation: autoRefresh ? "pulse 1.5s infinite" : "none" }} />
              {autoRefresh ? "Auto-refresh ON (30s)" : "Auto-refresh OFF"}
            </button>
            {lastRefresh && <span style={{ fontSize: 10.5, color: "#8a98a8" }}>MAJ {lastRefresh.toLocaleTimeString("fr-FR")}</span>}
          </div>
          <Btn variant="ghost" icon="ti-arrow-back-up" onClick={() => { viewMode.setMode("ec"); router.push("/collaborateurs"); }}>Retour mode EC</Btn>
        </div>

        {/* Onglets */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "10px 18px", border: "none", borderRadius: 8,
              background: activeTab === t.id ? `${t.col}22` : "transparent",
              borderBottom: activeTab === t.id ? `3px solid ${t.col}` : "3px solid transparent",
              color: activeTab === t.id ? t.col : "#5a6878",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              <i className={`ti ${t.icon}`} /> {t.lbl}
            </button>
          ))}
        </div>

        {/* TABLEAU DE BORD */}
        {activeTab === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 260px))", justifyContent: "start", gap: 12 }}>
              <StatCard color="#185FA5" icon="ti-package" lbl="Articles catalogue" value={stats.articles} onClick={() => setActiveTab("catalogue")} />
              <StatCard color="#EF9F27" icon="ti-truck-loading" lbl="DI à traiter" value={demandes.filter(d => (d.type_demande || "di") === "di" && ["nouvelle", "en_attente", null].includes(d.statut)).length} onClick={() => setActiveTab("di")} />
              <StatCard color="#e35d5b" icon="ti-tool" lbl="SAV à traiter" value={demandes.filter(d => d.type_demande === "sav" && ["nouvelle", "en_attente", null].includes(d.statut)).length} onClick={() => setActiveTab("sav")} />
              <StatCard color="#7a6fb0" icon="ti-truck-delivery" lbl="Partenaires" value={stats.partenaires} onClick={() => setActiveTab("fournisseurs")} />
              <StatCard color="#5aa05a" icon="ti-trending-up" lbl="DI traitées (30j)" value={demandes.filter(d => ["validee", "livree", "cloturee"].includes(d.statut)).length} />
            </div>

            {/* 0.59.8 : Alertes stock bas */}
            <AlertesStockBas supabase={supabase} structureId={auth.structureId} />

            {/* 0.62.7 : Activité récente — 5 dernières DI */}
            <Panel style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0, color: "#5a8f8f" }}>📋 Activité récente</h3>
                <button onClick={() => setActiveTab("di")} style={{ background: "transparent", border: "none", color: "#185FA5", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Voir tout →
                </button>
              </div>
              {demandes.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>Aucune activité récente</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {demandes.slice(0, 5).map(d => {
                    const t = d.source_table === "intervention" ? "intervention" : (d.type_demande || "di");
                    const ic = t === "sav" ? "ti-tool" : t === "intervention" ? "ti-tool" : t === "transfert" ? "ti-transfer" : "ti-truck-loading";
                    const col = t === "sav" ? "#e35d5b" : t === "intervention" ? "#7a6fb0" : t === "transfert" ? "#7a6fb0" : "#EF9F27";
                    const ago = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 60000);
                    const agoLabel = ago < 60 ? `il y a ${ago}min` : ago < 1440 ? `il y a ${Math.floor(ago/60)}h` : `il y a ${Math.floor(ago/1440)}j`;
                    return (
                      <div key={d.id} onClick={() => router.push(d.source_table === "intervention" ? `/interventions?id=${d.id}` : `/demandes-internes/${d.id}`)} style={{
                        padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        borderLeft: `3px solid ${col}`,
                        background: "rgba(0,0,0,.02)",
                      }}>
                        <i className={`ti ${ic}`} style={{ color: col, fontSize: 16 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#142131" }}>{d.numero || d.id?.substring(0, 8)}</div>
                          <div style={{ fontSize: 10.5, color: "#8a98a8" }}>
                            {t === "sav" ? "Demande SAV" : t === "intervention" ? "Intervention" : t === "transfert" ? "Transfert" : "Demande interne"} · {agoLabel}
                          </div>
                        </div>
                        <span style={{ padding: "1px 8px", borderRadius: 4, background: d.statut === "validee" ? "rgba(94,160,90,.15)" : "rgba(239,159,39,.15)", color: d.statut === "validee" ? "#5aa05a" : "#EF9F27", fontSize: 10, fontWeight: 700 }}>
                          {d.statut || "nouvelle"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </>
        )}

        {/* CATALOGUE */}
        {activeTab === "catalogue" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#185FA5" }}>Catalogue magasin ({articles.length})</h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/articles?new=1&magasin=1")}>Ajouter un article</Btn>
            </div>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#5a6878" }}>Chargement...</div>
            ) : articles.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-package-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucun article au catalogue.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,260px))", justifyContent: "start", gap: 10 }}>
                {articles.slice(0, 60).map(a => (
                  <div key={a.id} onClick={() => router.push(`/articles?id=${a.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee", borderLeft: "3px solid #185FA5",
                    borderRadius: 10, padding: 12, cursor: "pointer",
                  }}>
                    <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{a.libelle}</div>
                    {a.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 11, color: "#8a98a8" }}>{a.code}</div>}
                    {a.prix_vente_ht && <div style={{ fontSize: 12, color: "#5aa05a", fontWeight: 700, marginTop: 4 }}>{parseFloat(a.prix_vente_ht).toFixed(2)} € HT</div>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* DI RECUES */}
        {activeTab === "di" && (
          <Panel>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#EF9F27", flexShrink: 0 }}>DI reçues ({demandes.length})</h3>
              <input
                value={diSearch}
                onChange={(e) => setDiSearch(e.target.value)}
                placeholder="🔍 Rechercher numéro, description..."
                style={{ padding: "6px 12px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12, minWidth: 200, flex: 1, maxWidth: 320 }}
              />
              <select value={diStatutFilter} onChange={(e) => setDiStatutFilter(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12 }}>
                <option value="">Tous statuts</option>
                <option value="nouvelle">Nouvelles</option>
                <option value="en_attente">En attente</option>
                <option value="validee">Validées</option>
                <option value="refusee">Refusées</option>
              </select>
              {(diSearch || diStatutFilter) && (
                <button onClick={() => { setDiSearch(""); setDiStatutFilter(""); }} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #cfd8e0", borderRadius: 6, color: "#e35d5b", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                  ✕
                </button>
              )}
            </div>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            ) : (() => {
              const filtered = demandes.filter(d => {
                if (diStatutFilter && d.statut !== diStatutFilter) return false;
                if (diSearch) {
                  const s = diSearch.toLowerCase();
                  const hay = `${d.numero || ""} ${d.commentaire || ""} ${d.panne_description || ""}`.toLowerCase();
                  if (!hay.includes(s)) return false;
                }
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                    <i className="ti ti-inbox" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                    {demandes.length === 0 ? "Aucune DI reçue." : "Aucune DI ne correspond aux filtres."}
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filtered.slice(0, 50).map(d => (
                    <div key={d.id} onClick={() => router.push(d.source_table === "intervention" ? `/interventions?id=${d.id}` : `/demandes-internes/${d.id}`)} style={{
                      background: "#fff", border: "1px solid #e3e9ee",
                      borderLeft: `3px solid ${d.statut === "validee" ? "#5aa05a" : d.statut === "refusee" ? "#e35d5b" : "#EF9F27"}`,
                      borderRadius: 8, padding: 10, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <i className={`ti ${d.source_table === "intervention" ? "ti-tool" : "ti-truck-loading"}`} style={{ color: d.source_table === "intervention" ? "#7a6fb0" : "#EF9F27", fontSize: 20 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>
                          {d.numero || `DI-${d.id?.substring(0, 8)}`}
                          {d.source_table === "intervention" && <span style={{ marginLeft: 6, padding: "1px 6px", background: "rgba(122,111,176,.15)", color: "#7a6fb0", borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Intervention</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#8a98a8" }}>
                          {new Date(d.created_at).toLocaleString("fr-FR")} · {d.nb_lignes || 0} lignes · {d.qte_totale || 0} unités
                        </div>
                      </div>
                      {/* 0.62.6 : Actions rapides selon statut */}
                      {(d.statut === "nouvelle" || d.statut === "en_attente" || !d.statut) && (
                        <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={async () => {
                            const table = d.source_table === "intervention" ? "interventions" : "demandes_internes";
                            await supabase.from(table).update({ statut: "validee" }).eq("id", d.id);
                            reload();
                          }} title="Valider rapidement" style={{
                            background: "rgba(94,160,90,.15)", color: "#5aa05a", border: "1px solid rgba(94,160,90,.3)",
                            padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          }}>✓ Valider</button>
                          <button onClick={async () => {
                            if (!confirm("Refuser cette DI ?")) return;
                            const table = d.source_table === "intervention" ? "interventions" : "demandes_internes";
                            await supabase.from(table).update({ statut: "refusee" }).eq("id", d.id);
                            reload();
                          }} title="Refuser" style={{
                            background: "transparent", color: "#e35d5b", border: "1px solid rgba(227,93,91,.3)",
                            padding: "4px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                          }}>✕</button>
                        </div>
                      )}
                      <span style={{ padding: "2px 8px", borderRadius: 6, background: "#fafbfc", border: "1px solid #cfd8e0", fontSize: 11, fontWeight: 600, color: "#5a6878" }}>{d.statut || "nouvelle"}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Panel>
        )}

        {/* 0.60.0 : SAV reçues */}
        {activeTab === "sav" && (
          <Panel>
            <h3 style={{ margin: "0 0 12px", color: "#e35d5b" }}>SAV reçues ({demandes.filter(d => d.type_demande === "sav").length})</h3>
            {demandes.filter(d => d.type_demande === "sav").length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-tool" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucune demande SAV reçue.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {demandes.filter(d => d.type_demande === "sav").slice(0, 50).map(d => (
                  <div key={d.id} onClick={() => router.push(`/demandes-internes/${d.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `3px solid ${d.statut === "validee" ? "#5aa05a" : d.statut === "refusee" ? "#e35d5b" : "#EF9F27"}`,
                    borderRadius: 8, padding: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <i className="ti ti-tool" style={{ color: "#e35d5b", fontSize: 20 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{d.numero || `SAV-${d.id?.substring(0,8)}`}</div>
                      <div style={{ fontSize: 11, color: "#8a98a8" }}>{new Date(d.created_at).toLocaleString("fr-FR")}</div>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 6, background: "#fafbfc", border: "1px solid #cfd8e0", fontSize: 11, fontWeight: 600, color: "#5a6878" }}>{d.statut || "nouvelle"}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* 0.62.14 : TRANSFERTS magasin → dépôt (étabs rattachés) */}
        {activeTab === "transferts" && (
          <TransfertsMagasinPanel
            supabase={supabase}
            auth={auth}
            magasinCtx={magasinCtx}
            router={router}
          />
        )}

        {/* 0.60.0 : Bilans SAV (lien direct vers la page CRUD) */}
        {activeTab === "bilans" && (
          <Panel>
            <div style={{ textAlign: "center", padding: "30px 20px" }}>
              <i className="ti ti-clipboard-check" style={{ fontSize: 56, color: "#7CC8C8", display: "block", marginBottom: 12 }} />
              <h3 style={{ margin: "0 0 8px", color: "#142131" }}>Gestion des bilans SAV</h3>
              <p style={{ color: "#5a6878", fontSize: 13, marginBottom: 18, maxWidth: 480, margin: "0 auto 18px" }}>
                Crée des templates de bilans avec leurs points de contrôle (généralement 5 points), rattache-les aux articles. Les EC pourront sélectionner ces bilans quand ils demandent un SAV.
              </p>
              <Btn variant="primary" icon="ti-arrow-right" onClick={() => router.push("/magasin/bilans-sav")}>
                Ouvrir la gestion des bilans
              </Btn>
            </div>
          </Panel>
        )}

        {/* PARTENAIRES FOURNISSEURS */}
        {activeTab === "fournisseurs" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#7a6fb0" }}>Partenaires fournisseurs ({partenaires.length})</h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/etablissements-partenaires?new=1&fournisseur=1")}>Ajouter un partenaire</Btn>
            </div>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            ) : partenaires.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-truck-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucun partenaire fournisseur.<br/>
                <span style={{ fontSize: 12 }}>Crée un partenaire avec la case "Est fournisseur Aveho" cochée pour qu'il apparaisse ici.</span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,300px))", justifyContent: "start", gap: 10 }}>
                {partenaires.map(p => (
                  <div key={p.id} onClick={() => router.push(`/etablissements-partenaires/${p.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee", borderLeft: "3px solid #7a6fb0",
                    borderRadius: 10, padding: 12, cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ width: 36, height: 36, background: "rgba(122,111,176,.13)", color: "#7a6fb0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        <i className="ti ti-truck-delivery" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#142131" }}>{p.nom}</div>
                        {p.ville && <div style={{ fontSize: 11, color: "#5a6878" }}>{p.ville}{p.code_postal && ` · ${p.code_postal}`}</div>}
                      </div>
                    </div>
                    {p.telephone && <div style={{ fontSize: 11, color: "#5a6878" }}><i className="ti ti-phone" /> {p.telephone}</div>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ color, icon, lbl, value, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", border: "1px solid #e3e9ee", borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 16, cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
        <div>
          <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

// 0.59.8 : Composant alertes stock bas
function AlertesStockBas({ supabase, structureId }) {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!structureId) return;
    (async () => {
      try {
        // Cherche articles avec stock_actuel <= stock_min (si colonnes existent)
        let r = await supabase
          .from("articles")
          .select("id, libelle, code, stock_actuel, stock_min")
          .eq("est_catalogue_magasin", true)
          .not("stock_min", "is", null)
          .limit(20);
        if (r.error) { setAlertes([]); return; }
        const filtered = (r.data || []).filter(a => (a.stock_actuel || 0) <= (a.stock_min || 0));
        setAlertes(filtered.slice(0, 8));
      } catch {} finally { setLoading(false); }
    })();
  }, [structureId]);

  if (loading) return null;
  if (alertes.length === 0) {
    return (
      <div style={{ marginTop: 14, padding: 16, background: "rgba(90,160,90,.08)", border: "1px solid rgba(90,160,90,.30)", borderLeft: "4px solid #5aa05a", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-shield-check" style={{ color: "#5aa05a", fontSize: 24 }} />
          <div>
            <div style={{ fontWeight: 700, color: "#5aa05a" }}>Stock OK</div>
            <div style={{ fontSize: 12, color: "#5a6878" }}>Aucun article en alerte de stock bas.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, padding: 16, background: "rgba(239,159,39,.08)", border: "1px solid rgba(239,159,39,.30)", borderLeft: "4px solid #EF9F27", borderRadius: 10 }}>
      <div style={{ fontWeight: 700, color: "#d48820", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-alert-triangle" /> {alertes.length} article{alertes.length > 1 ? "s" : ""} en stock bas
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 260px))", justifyContent: "start", gap: 8 }}>
        {alertes.map(a => {
          const pct = a.stock_min > 0 ? ((a.stock_actuel || 0) / a.stock_min) * 100 : 0;
          const couleur = pct === 0 ? "#e35d5b" : pct < 50 ? "#EF9F27" : "#d48820";
          return (
            <div key={a.id} style={{ background: "#fff", border: `1px solid ${couleur}33`, borderLeft: `3px solid ${couleur}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: "#142131" }}>{a.libelle}</div>
              {a.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{a.code}</div>}
              <div style={{ marginTop: 4, color: couleur, fontWeight: 700 }}>
                Stock : {a.stock_actuel || 0} / min {a.stock_min}
              </div>
              <div style={{ height: 4, background: "#f0f3f6", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: couleur, transition: "width 200ms" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// 0.62.14 : TransfertsMagasinPanel
// Liste transferts magasin → dépôt + bouton créer
// Filtre dépôts par rattachements (magasins_rattachements.depot_id)
// =============================================================
function TransfertsMagasinPanel({ supabase, auth, magasinCtx, router }) {
  const [transferts, setTransferts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNew, setModalNew] = useState(false);
  const [depotsAutorises, setDepotsAutorises] = useState([]);
  const [articlesMagasin, setArticlesMagasin] = useState([]);
  const [form, setForm] = useState({ depot_destination_id: "", article_id: "", quantite: 1, motif: "", commentaire: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    // 1. Liste transferts émis par mon magasin
    let q = supabase.from("transferts").select("*").order("created_at", { ascending: false }).limit(50);
    if (magasinCtx.magasinId) q = q.eq("magasin_emetteur_id", magasinCtx.magasinId);
    const t = await tryFetch(q);
    setTransferts(t);
    // 2. Dépôts autorisés via rattachements
    if (magasinCtx.magasinId) {
      const ratt = await tryFetch(supabase.from("magasins_rattachements")
        .select("etablissement_id, depot_id")
        .eq("magasin_id", magasinCtx.magasinId)
        .eq("actif", true));
      // Si rattachement précise un depot_id, on prend celui-là ; sinon, tous les dépôts de l'étab rattaché
      const depotIdsExplicites = ratt.filter(r => r.depot_id).map(r => r.depot_id);
      const etabIds = ratt.filter(r => !r.depot_id && r.etablissement_id).map(r => r.etablissement_id);
      const depots = [];
      if (depotIdsExplicites.length > 0) {
        const r1 = await tryFetch(supabase.from("depots").select("id, nom, etablissement_id, etablissements(nom)").in("id", depotIdsExplicites));
        depots.push(...r1);
      }
      if (etabIds.length > 0) {
        const r2 = await tryFetch(supabase.from("depots").select("id, nom, etablissement_id, etablissements(nom)").in("etablissement_id", etabIds));
        depots.push(...r2);
      }
      // Dédup
      const dedup = Object.values(Object.fromEntries(depots.map(d => [d.id, d])));
      setDepotsAutorises(dedup);
    }
    // 3. Catalogue articles magasin
    const a = await tryFetch(supabase.from("articles").select("id, libelle, code").eq("magasin_id", magasinCtx.magasinId).limit(500));
    setArticlesMagasin(a);
    setLoading(false);
  }

  async function creer() {
    if (!form.depot_destination_id) { alert("Choisis un dépôt destination"); return; }
    if (!form.article_id) { alert("Choisis un article"); return; }
    if (!form.quantite || form.quantite < 1) { alert("Quantité invalide"); return; }
    setSaving(true);
    try {
      const numero = `TRF-${Date.now().toString().slice(-6)}`;
      const r = await supabase.from("transferts").insert({
        numero,
        magasin_emetteur_id: magasinCtx.magasinId,
        depot_destination_id: form.depot_destination_id,
        article_id: form.article_id,
        quantite: parseFloat(form.quantite),
        motif: form.motif || null,
        commentaire: form.commentaire || null,
        statut: "en_attente",
        structure_id: auth.structureId,
        created_by: auth.user?.id,
      });
      if (r.error) throw r.error;
      setModalNew(false);
      setForm({ depot_destination_id: "", article_id: "", quantite: 1, motif: "", commentaire: "" });
      await reload();
    } catch (e) {
      console.error("[transfert create]", e);
      alert("❌ Erreur : " + (e.message || JSON.stringify(e)));
    } finally { setSaving(false); }
  }

  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ margin: 0, color: "#7a6fb0" }}>🔄 Transferts émis ({transferts.length})</h3>
        <Btn variant="primary" icon="ti-plus" onClick={() => setModalNew(true)}>Nouveau transfert</Btn>
      </div>

      {depotsAutorises.length === 0 && (
        <Panel style={{ background: "rgba(239,159,39,.08)", borderLeft: "4px solid #EF9F27", padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#5a6878" }}>
            ⚠ Aucun dépôt rattaché à ton magasin. Va sur <a href="/magasin/rattachements-perimetre" style={{ color: "#185FA5", fontWeight: 700 }}>Périmètre intervention</a> pour rattacher des dépôts ou des établissements.
          </div>
        </Panel>
      )}

      {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
        : transferts.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
          <i className="ti ti-transfer" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
          Aucun transfert émis.<br/>
          <span style={{ fontSize: 11 }}>Click "Nouveau transfert" pour commencer.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {transferts.map(t => {
            const dest = depotsAutorises.find(d => d.id === t.depot_destination_id);
            const art = articlesMagasin.find(a => a.id === t.article_id);
            const statutCol = t.statut === "valide" ? "#5aa05a" : t.statut === "refuse" ? "#e35d5b" : "#EF9F27";
            return (
              <div key={t.id} style={{
                background: "#fff", border: "1px solid #e3e9ee",
                borderLeft: `3px solid ${statutCol}`,
                borderRadius: 8, padding: 10,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <i className="ti ti-transfer" style={{ color: "#7a6fb0", fontSize: 20 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>
                    {t.numero || `TRF-${t.id.substring(0, 8)}`}
                    {dest && <span style={{ marginLeft: 8, fontSize: 11, color: "#5a6878" }}>→ {dest.nom}{dest.etablissements?.nom ? ` (${dest.etablissements.nom})` : ""}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a98a8" }}>
                    {new Date(t.created_at).toLocaleString("fr-FR")}
                    {art && <> · {art.libelle}</>}
                    {t.quantite && <> · {t.quantite} unité(s)</>}
                  </div>
                  {t.motif && <div style={{ fontSize: 10.5, color: "#5a6878", fontStyle: "italic", marginTop: 2 }}>{t.motif}</div>}
                </div>
                <span style={{ padding: "2px 8px", borderRadius: 6, background: `${statutCol}1A`, color: statutCol, border: `1px solid ${statutCol}40`, fontSize: 11, fontWeight: 700 }}>{t.statut || "en_attente"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      {modalNew && (
        <Modal open={modalNew} onClose={() => setModalNew(false)} kind="patient" title="Nouveau transfert magasin → dépôt" actions={
          <>
            <Btn variant="ghost" onClick={() => setModalNew(false)}>Annuler</Btn>
            <Btn variant="primary" onClick={creer} disabled={saving}>{saving ? "Création..." : "Créer le transfert"}</Btn>
          </>
        }>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, color: "#5a6878" }}>
              <b>Dépôt destination *</b>
              <select value={form.depot_destination_id} onChange={(e) => setForm({ ...form, depot_destination_id: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                <option value="">— Choisir dépôt —</option>
                {depotsAutorises.map(d => <option key={d.id} value={d.id}>{d.nom}{d.etablissements?.nom ? ` · ${d.etablissements.nom}` : ""}</option>)}
              </select>
              <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 4 }}>Liste filtrée selon les rattachements actifs de ton magasin</div>
            </label>
            <label style={{ fontSize: 12, color: "#5a6878" }}>
              <b>Article *</b>
              <select value={form.article_id} onChange={(e) => setForm({ ...form, article_id: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                <option value="">— Choisir article —</option>
                {articlesMagasin.map(a => <option key={a.id} value={a.id}>{a.libelle}{a.code ? ` (${a.code})` : ""}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#5a6878" }}>
                <b>Quantité *</b>
                <input type="number" min="1" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>
                <b>Motif</b>
                <input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Réassort, urgence, demande étab..." style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }} />
              </label>
            </div>
            <label style={{ fontSize: 12, color: "#5a6878" }}>
              <b>Commentaire</b>
              <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} placeholder="Précisions logistiques..." style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4, minHeight: 60 }} />
            </label>
          </div>
        </Modal>
      )}
    </Panel>
  );
}
