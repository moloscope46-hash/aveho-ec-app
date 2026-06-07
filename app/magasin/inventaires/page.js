"use client";
// =============================================================
//  /magasin/inventaires — Génération inventaires (0.60.7)
//  Liste articles + stock par dépôt + saisie comptage + export
// =============================================================
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function InventairesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDepotId = searchParams?.get("depot") || "";
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [depots, setDepots] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState(initialDepotId);
  const [comptages, setComptages] = useState({});  // article_id → { quantite_comptee, ecart }
  const [stocksTheoriques, setStocksTheoriques] = useState({});  // article_id → quantité théorique
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId || magasinCtx.loading) return;
    reload();
  }, [auth.ready, auth.structureId, magasinCtx.loading, magasinCtx.magasinId]);

  useEffect(() => {
    if (selectedDepot) loadInventaire();
  }, [selectedDepot]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    // EC autorisés
    let etabsAutorisesIds = null;
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      const droits = await tryFetch(supabase.from("etablissements_magasins_droits")
        .select("etablissement_id, droit_commande, droit_sav, droit_transfert")
        .eq("magasin_id", magasinCtx.magasinId));
      etabsAutorisesIds = droits
        .filter(d => d.droit_commande || d.droit_sav || d.droit_transfert)
        .map(d => d.etablissement_id);
    }

    const [etabsAll, depotsAll] = await Promise.all([
      tryFetch(supabase.from("etablissements").select("id, nom").order("nom")),
      tryFetch(supabase.from("depots").select("*").order("nom")),
    ]);
    const etabsFiltered = etabsAutorisesIds !== null
      ? etabsAll.filter(e => etabsAutorisesIds.includes(e.id))
      : etabsAll;
    const etabsIdsSet = new Set(etabsFiltered.map(e => e.id));
    const depotsFiltered = depotsAll.filter(d => etabsIdsSet.has(d.etablissement_id));

    setEtabs(etabsFiltered);
    setDepots(depotsFiltered);
    setLoading(false);
  }

  async function loadInventaire() {
    if (!selectedDepot) return;
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    // Charger les articles + mouvements pour ce dépôt
    const [arts, mvts] = await Promise.all([
      tryFetch(supabase.from("articles").select("id, libelle, code, reference, unite").order("libelle").limit(500)),
      tryFetch(supabase.from("stock_mouvements").select("article_id, quantite, type").limit(5000)),
    ]);

    // Calculer le stock théorique par article (somme entrées - sorties)
    const stocks = {};
    arts.forEach(a => { stocks[a.id] = 0; });
    mvts.forEach(m => {
      if (!stocks.hasOwnProperty(m.article_id)) return;
      const qte = parseFloat(m.quantite || 0);
      if (m.type === "sortie" || m.type === "retour") stocks[m.article_id] -= qte;
      else stocks[m.article_id] += qte;
    });

    setArticles(arts);
    setStocksTheoriques(stocks);
    setComptages({});
  }

  function updateComptage(articleId, valeur) {
    const val = valeur === "" ? null : parseFloat(valeur);
    const theo = stocksTheoriques[articleId] || 0;
    const ecart = val !== null ? val - theo : null;
    setComptages({ ...comptages, [articleId]: { quantite_comptee: val, ecart } });
  }

  async function genererRapport() {
    if (Object.keys(comptages).length === 0) { alert("Saisis au moins un comptage"); return; }
    const depot = depots.find(d => d.id === selectedDepot);
    const etab = depot ? etabs.find(e => e.id === depot.etablissement_id) : null;
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const numero = `INV-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${selectedDepot.substring(0,4)}`;

    const lignesHTML = articles
      .filter(a => comptages[a.id])
      .map(a => {
        const c = comptages[a.id];
        const theo = stocksTheoriques[a.id] || 0;
        const ecartColor = c.ecart === 0 ? "#5aa05a" : c.ecart > 0 ? "#185FA5" : "#e35d5b";
        return `<tr style="border-bottom:1px solid #e3e9ee">
          <td style="padding:8px">${a.libelle}${a.code ? `<br><span style="font-family:Consolas,monospace;font-size:10px;color:#8a98a8">${a.code}</span>` : ""}</td>
          <td style="padding:8px;text-align:center;font-family:Consolas,monospace">${theo}</td>
          <td style="padding:8px;text-align:center;font-family:Consolas,monospace;font-weight:700">${c.quantite_comptee}</td>
          <td style="padding:8px;text-align:center;font-family:Consolas,monospace;font-weight:700;color:${ecartColor}">${c.ecart > 0 ? "+" : ""}${c.ecart}</td>
          <td style="padding:8px;font-size:11">${a.unite || "unité"}</td>
        </tr>`;
      }).join("");

    const w = window.open("", "_blank", "width=900,height=1200");
    if (!w) { alert("Bloque les popups"); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Inventaire ${numero}</title>
<style>
  body{font-family:'Quicksand',sans-serif;color:#142131;padding:30px;font-size:13px}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #142131;padding-bottom:14px;margin-bottom:20px}
  .logo{font-size:32px;font-weight:600;letter-spacing:2px}
  .logo span{color:#7CC8C8}
  h1{font-size:20px;color:#5a8f8f;margin-bottom:4px}
  .num{background:#5a8f8f;color:#fff;padding:3px 10px;border-radius:4px;font-family:Consolas,monospace;font-size:13px;display:inline-block}
  .meta{background:#fafbfc;padding:14px;border-radius:8px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  th{background:#5a8f8f;color:#fff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
  .stat{background:#fafbfc;border-left:3px solid;padding:8px;text-align:center;border-radius:6px}
  .stat .val{font-size:18px;font-weight:700;font-family:Consolas,monospace}
  .stat .lbl{font-size:10px;color:#5a6878;text-transform:uppercase;letter-spacing:1px}
  @media print{body{padding:15mm}}
</style></head><body>
<div class="header">
  <div><div class="logo">a<span>v</span>eho</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5a6878">Rapport d'inventaire</div></div>
  <div style="text-align:right"><h1>INVENTAIRE</h1><div class="num">${numero}</div><div style="font-size:11px;color:#5a6878;margin-top:4">Émis le ${dateStr}</div></div>
</div>
<div class="meta">
  <div><b>📦 Dépôt</b><br>${depot?.nom || "—"}</div>
  <div><b>🏥 Établissement</b><br>${etab?.nom || "—"}</div>
</div>
<div class="stats">
  <div class="stat" style="border-color:#5aa05a"><div class="val" style="color:#5aa05a">${Object.values(comptages).filter(c => c.ecart === 0).length}</div><div class="lbl">Exact</div></div>
  <div class="stat" style="border-color:#185FA5"><div class="val" style="color:#185FA5">${Object.values(comptages).filter(c => c.ecart > 0).length}</div><div class="lbl">Sur-stock</div></div>
  <div class="stat" style="border-color:#e35d5b"><div class="val" style="color:#e35d5b">${Object.values(comptages).filter(c => c.ecart < 0).length}</div><div class="lbl">Manquants</div></div>
  <div class="stat" style="border-color:#5a8f8f"><div class="val" style="color:#5a8f8f">${Object.keys(comptages).length}</div><div class="lbl">Total comptés</div></div>
</div>
<table>
  <thead><tr><th>Article</th><th style="text-align:center">Théorique</th><th style="text-align:center">Compté</th><th style="text-align:center">Écart</th><th>Unité</th></tr></thead>
  <tbody>${lignesHTML}</tbody>
</table>
<div style="margin-top:30;display:grid;grid-template-columns:1fr 1fr;gap:30">
  <div style="border:1px solid #cfd8e0;border-radius:8;padding:10;min-height:80"><b style="font-size:11;color:#5a6878;text-transform:uppercase">✍ Inventoriste</b><br><span style="font-size:11">${auth.user?.email || ""}</span><br><span style="font-size:10;color:#8a98a8">${dateStr}</span></div>
  <div style="border:1px solid #cfd8e0;border-radius:8;padding:10;min-height:80"><b style="font-size:11;color:#5a6878;text-transform:uppercase">✍ Validation</b></div>
</div>
<div style="margin-top:30;text-align:center"><button onclick="window.print()" style="background:#5a8f8f;color:#fff;border:none;padding:12 28;border-radius:8;font-size:14;font-weight:700;cursor:pointer;font-family:Quicksand">🖨 Imprimer / PDF</button></div>
<script>setTimeout(()=>window.print(),500)</script>
</body></html>`);
    w.document.close();
  }

  const filtered = articles.filter(a => !search || (a.libelle || "").toLowerCase().includes(search.toLowerCase()) || (a.code || "").toLowerCase().includes(search.toLowerCase()));
  const depot = depots.find(d => d.id === selectedDepot);
  const nbComptes = Object.keys(comptages).length;

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <PageHead icon="ti-clipboard-list" title="Génération d'inventaires" subtitle="Compte le stock physique par dépôt et compare avec le stock théorique" />

          <Panel>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>1. Choisir le dépôt à inventorier</h3>
            <select value={selectedDepot} onChange={(e) => setSelectedDepot(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
              <option value="">— Sélectionner un dépôt —</option>
              {depots.map(d => {
                const etab = etabs.find(e => e.id === d.etablissement_id);
                return <option key={d.id} value={d.id}>{d.nom}{etab ? ` (${etab.nom})` : ""}</option>;
              })}
            </select>
            {depots.length === 0 && !loading && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#d48820" }}>
                ⚠ Aucun dépôt accessible. Demande des droits dans /magasin/droits.
              </div>
            )}
          </Panel>

          {selectedDepot && (
            <>
              <Panel style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ margin: 0, color: "#185FA5" }}>2. Saisie comptage — {depot?.nom}</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ padding: "4px 10px", background: "rgba(94,143,143,.10)", borderRadius: 4, fontSize: 12, color: "#5a8f8f", fontWeight: 700 }}>{nbComptes} comptés</span>
                    <Btn variant="primary" icon="ti-file-text" onClick={genererRapport} disabled={nbComptes === 0}>
                      🖨 Rapport PDF
                    </Btn>
                  </div>
                </div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Rechercher article..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, marginBottom: 10 }} />
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#fafbfc" }}>
                        <th style={th}>Article</th>
                        <th style={{ ...th, textAlign: "center", width: 90 }}>Théorique</th>
                        <th style={{ ...th, textAlign: "center", width: 110 }}>Compté</th>
                        <th style={{ ...th, textAlign: "center", width: 80 }}>Écart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 100).map(a => {
                        const c = comptages[a.id];
                        const theo = stocksTheoriques[a.id] || 0;
                        const ecart = c?.ecart;
                        return (
                          <tr key={a.id} style={{ borderTop: "1px solid #f0f3f6" }}>
                            <td style={{ padding: 6 }}>
                              <div style={{ fontWeight: 600 }}>{a.libelle}</div>
                              {a.code && <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas,monospace" }}>{a.code}</div>}
                            </td>
                            <td style={{ padding: 6, textAlign: "center", fontFamily: "Consolas,monospace", color: "#5a6878" }}>{theo}</td>
                            <td style={{ padding: 6, textAlign: "center" }}>
                              <input type="number" step="any" value={c?.quantite_comptee ?? ""} onChange={(e) => updateComptage(a.id, e.target.value)}
                                style={{ width: 90, padding: "5px 8px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "Consolas,monospace", fontSize: 12.5, textAlign: "center" }} />
                            </td>
                            <td style={{ padding: 6, textAlign: "center" }}>
                              {ecart !== undefined && ecart !== null && (
                                <span style={{ padding: "2px 8px", borderRadius: 4, background: ecart === 0 ? "rgba(94,160,90,.15)" : ecart > 0 ? "rgba(24,95,165,.15)" : "rgba(227,93,91,.15)", color: ecart === 0 ? "#5aa05a" : ecart > 0 ? "#185FA5" : "#c0392b", fontWeight: 700, fontFamily: "Consolas,monospace", fontSize: 12.5 }}>
                                  {ecart > 0 ? "+" : ""}{ecart}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length > 100 && <div style={{ padding: 10, textAlign: "center", color: "#8a98a8", fontSize: 11 }}>{filtered.length - 100} articles non affichés. Affine ta recherche.</div>}
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: 8, fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 };
