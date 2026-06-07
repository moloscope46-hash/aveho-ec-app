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
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const TABS = [
  { id: "dashboard", icon: "ti-dashboard",        lbl: "Tableau de bord", col: "#5a8f8f" },
  { id: "catalogue", icon: "ti-package",          lbl: "Catalogue",        col: "#185FA5" },
  { id: "di",        icon: "ti-truck-loading",    lbl: "DI reçues",        col: "#EF9F27" },
  { id: "fournisseurs", icon: "ti-truck-delivery", lbl: "Partenaires",     col: "#7a6fb0" },
];

export default function MagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const viewMode = useViewMode();
  const cart = useCart();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [articles, setArticles] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ articles: 0, di_pendantes: 0, partenaires: 0 });

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    const [artsCat, dis, parts] = await Promise.all([
      // Catalogue magasin = articles avec est_catalogue_magasin=true OU sans rattachement
      tryFetch(supabase.from("articles").select("id, libelle, code, prix_vente_ht, type_article, photo_url, est_catalogue_magasin").limit(500)),
      tryFetch(supabase.from("v_magasin_di").select("*").limit(100)),
      tryFetch(supabase.from("etablissements_partenaires").select("*").eq("est_fournisseur", true).order("nom")),
    ]);

    setArticles(artsCat);
    setDemandes(dis);
    setPartenaires(parts);
    setStats({
      articles: artsCat.length,
      di_pendantes: dis.filter(d => ["en_attente", "nouvelle", "draft", null].includes(d.statut)).length,
      partenaires: parts.length,
    });
    setLoading(false);
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              <StatCard color="#185FA5" icon="ti-package" lbl="Articles catalogue" value={stats.articles} onClick={() => setActiveTab("catalogue")} />
              <StatCard color="#EF9F27" icon="ti-truck-loading" lbl="DI à traiter" value={stats.di_pendantes} onClick={() => setActiveTab("di")} />
              <StatCard color="#7a6fb0" icon="ti-truck-delivery" lbl="Partenaires" value={stats.partenaires} onClick={() => setActiveTab("fournisseurs")} />
              <StatCard color="#5aa05a" icon="ti-trending-up" lbl="DI traitées (30j)" value={demandes.filter(d => ["validee", "livree", "cloturee"].includes(d.statut)).length} />
            </div>

            {/* 0.59.8 : Alertes stock bas */}
            <AlertesStockBas supabase={supabase} structureId={auth.structureId} />
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
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
            <h3 style={{ margin: "0 0 12px", color: "#EF9F27" }}>DI reçues ({demandes.length})</h3>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            ) : demandes.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-inbox" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucune DI reçue.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {demandes.slice(0, 50).map(d => (
                  <div key={d.id} onClick={() => router.push(`/demandes-internes/${d.id}`)} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `3px solid ${d.statut === "validee" ? "#5aa05a" : d.statut === "refusee" ? "#e35d5b" : "#EF9F27"}`,
                    borderRadius: 8, padding: 10, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <i className="ti ti-truck-loading" style={{ color: "#EF9F27", fontSize: 20 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{d.numero || `DI-${d.id?.substring(0, 8)}`}</div>
                      <div style={{ fontSize: 11, color: "#8a98a8" }}>
                        {new Date(d.created_at).toLocaleString("fr-FR")} · {d.nb_lignes || 0} lignes · {d.qte_totale || 0} unités
                      </div>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 6, background: "#fafbfc", border: "1px solid #cfd8e0", fontSize: 11, fontWeight: 600, color: "#5a6878" }}>{d.statut || "nouvelle"}</span>
                  </div>
                ))}
              </div>
            )}
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
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
