"use client";
// =============================================================
//  /magasin/depots — Gestion dépôts côté magasin (0.60.7)
//  Liste des dépôts des établissements ayant des droits avec ce magasin
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function DepotsMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [depots, setDepots] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [stocks, setStocks] = useState({});  // depot_id → nb articles en stock
  const [loading, setLoading] = useState(true);
  const [filterEtab, setFilterEtab] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId || magasinCtx.loading) return;
    reload();
  }, [auth.ready, auth.structureId, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    // 1. EC ayant droits avec ce magasin
    let etabsAutorisesIds = null;
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      const droits = await tryFetch(supabase.from("etablissements_magasins_droits")
        .select("etablissement_id, droit_commande, droit_sav, droit_transfert")
        .eq("magasin_id", magasinCtx.magasinId));
      etabsAutorisesIds = droits
        .filter(d => d.droit_commande || d.droit_sav || d.droit_transfert)
        .map(d => d.etablissement_id);
    }

    const [etabsAll, batsAll, servAll, depotsAll, stockMvts] = await Promise.all([
      tryFetch(supabase.from("etablissements").select("id, nom, ville, finess").order("nom")),
      tryFetch(supabase.from("batiments").select("id, nom, etablissement_id").order("nom")),
      tryFetch(supabase.from("services").select("id, nom, batiment_id").order("nom")),
      tryFetch(supabase.from("depots").select("*").order("nom")),
      tryFetch(supabase.from("stock_mouvements").select("article_id, quantite, type").limit(2000)),
    ]);

    // Filtrer les étabs autorisés
    const etabsFiltered = etabsAutorisesIds !== null
      ? etabsAll.filter(e => etabsAutorisesIds.includes(e.id))
      : etabsAll;
    const etabsIdsSet = new Set(etabsFiltered.map(e => e.id));

    // Filtrer les bâtiments dans les étabs autorisés
    const batsFiltered = batsAll.filter(b => etabsIdsSet.has(b.etablissement_id));
    const batsIdsSet = new Set(batsFiltered.map(b => b.id));

    // Filtrer les services dans les bâtiments autorisés
    const servFiltered = servAll.filter(s => batsIdsSet.has(s.batiment_id));

    // Filtrer les dépôts liés aux étabs autorisés (via etablissement_id direct)
    const depotsFiltered = depotsAll.filter(d => etabsIdsSet.has(d.etablissement_id));

    // Calculer le stock par dépôt (simple : nb articles avec mouvements)
    const stocksByDepot = {};
    depotsFiltered.forEach(d => { stocksByDepot[d.id] = 0; });

    setEtabs(etabsFiltered);
    setBatiments(batsFiltered);
    setServices(servFiltered);
    setDepots(depotsFiltered);
    setStocks(stocksByDepot);
    setLoading(false);
  }

  const filtered = depots.filter(d => {
    if (filterEtab && d.etablissement_id !== filterEtab) return false;
    if (search && !(d.nom || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function genererInventaire(depot) {
    router.push(`/magasin/inventaires?depot=${depot.id}`);
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <PageHead icon="ti-building-warehouse" title="Dépôts clients" subtitle={`Dépôts des établissements ayant des droits avec ${magasinCtx.magasin?.nom || "ce magasin"} (${depots.length})`} />

          {/* Filtres */}
          <Panel>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Rechercher un dépôt..."
                style={{ flex: 1, minWidth: 220, padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }} />
              <select value={filterEtab} onChange={(e) => setFilterEtab(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, minWidth: 200 }}>
                <option value="">Tous les établissements ({etabs.length})</option>
                {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <Btn variant="ghost" icon="ti-refresh" onClick={reload}>Actualiser</Btn>
            </div>
          </Panel>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, marginTop: 12, justifyContent: "start" }}>
            <StatTile color="#5a8f8f" icon="ti-building-warehouse" lbl="Dépôts visibles" val={depots.length} />
            <StatTile color="#185FA5" icon="ti-building-hospital" lbl="Établissements clients" val={etabs.length} />
            <StatTile color="#7a6fb0" icon="ti-building" lbl="Bâtiments" val={batiments.length} />
            <StatTile color="#7CC8C8" icon="ti-stairs" lbl="Services" val={services.length} />
          </div>

          {/* Liste dépôts */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>📦 Dépôts ({filtered.length})</h3>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-building-warehouse" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
                {depots.length === 0 ? (
                  <>
                    Aucun dépôt visible.<br/>
                    <span style={{ fontSize: 12 }}>
                      {magasinCtx.isUserMagasin
                        ? "Vérifie tes droits dans /magasin/droits ou demande à l'EC de t'en autoriser."
                        : "Aucun dépôt configuré dans tes établissements."}
                    </span>
                  </>
                ) : "Aucun dépôt ne correspond aux filtres."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,320px))", gap: 12, justifyContent: "start" }}>
                {filtered.map(d => {
                  const etab = etabs.find(e => e.id === d.etablissement_id);
                  return (
                    <div key={d.id} style={{
                      background: "#fff", border: "1px solid #e3e9ee", borderLeft: "4px solid #5a8f8f",
                      borderRadius: 10, padding: 14,
                    }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                        <div style={{ width: 40, height: 40, background: "rgba(94,143,143,.22)", color: "#5a8f8f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                          <i className="ti ti-building-warehouse" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>{d.nom}</div>
                          {d.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{d.code}</div>}
                        </div>
                      </div>
                      {etab && (
                        <div style={{ padding: 6, background: "rgba(24,95,165,.08)", borderRadius: 6, fontSize: 11, color: "#185FA5", marginBottom: 6 }}>
                          <i className="ti ti-building-hospital" /> {etab.nom}{etab.ville && ` · ${etab.ville}`}
                        </div>
                      )}
                      {d.adresse && (
                        <div style={{ fontSize: 11, color: "#5a6878", marginBottom: 6 }}>
                          📍 {d.adresse}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <Btn variant="ghost" icon="ti-clipboard-list" onClick={() => genererInventaire(d)} style={{ flex: 1, fontSize: 11 }}>
                          Générer inventaire
                        </Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatTile({ color, icon, lbl, val }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 12,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      <div>
        <div style={{ fontSize: 10, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
