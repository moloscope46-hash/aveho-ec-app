"use client";
// =============================================================
//  /magasin/rattachements — Rattacher articles étab à articles magasin (0.61.6)
//  Interface 2 colonnes : articles étab à gauche, articles magasin à droite
//  Click pour lier, badge si rattaché
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

export default function RattachementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [etabs, setEtabs] = useState([]);
  const [selectedEtabId, setSelectedEtabId] = useState("");
  const [articlesEtab, setArticlesEtab] = useState([]);
  const [articlesMagasin, setArticlesMagasin] = useState([]);
  const [rattachements, setRattachements] = useState([]);  // {article_etablissement_id, article_magasin_id, prix_negocie_ht}
  const [loading, setLoading] = useState(true);
  const [searchEtab, setSearchEtab] = useState("");
  const [searchMag, setSearchMag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  useEffect(() => {
    if (selectedEtabId) loadEtabArticles();
  }, [selectedEtabId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let qm = supabase.from("articles").select("id, libelle, code, prix_public_ht").eq("est_catalogue_magasin", true).order("libelle");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) qm = qm.eq("magasin_id", magasinCtx.magasinId);
    const [e, am] = await Promise.all([
      tryFetch(supabase.from("etablissements").select("id, nom, ville").order("nom")),
      tryFetch(qm),
    ]);
    setEtabs(e);
    setArticlesMagasin(am);
    if (e.length > 0 && !selectedEtabId) setSelectedEtabId(e[0].id);
    setLoading(false);
  }

  async function loadEtabArticles() {
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [ae, rat] = await Promise.all([
      // Articles propres à l'étab (pas est_catalogue_magasin)
      tryFetch(supabase.from("articles").select("id, libelle, code, reference").eq("etablissement_id", selectedEtabId).order("libelle")),
      tryFetch(supabase.from("articles_rattachements").select("*").eq("etablissement_id", selectedEtabId)),
    ]);
    setArticlesEtab(ae);
    setRattachements(rat);
  }

  function getRattachement(articleEtabId) {
    return rattachements.find(r => r.article_etablissement_id === articleEtabId);
  }

  async function lier(articleEtabId, articleMagasinId, prixNegocie = null) {
    const existing = getRattachement(articleEtabId);
    setSaving(true);
    try {
      if (existing) {
        if (existing.article_magasin_id === articleMagasinId) {
          // Click sur le même → délier
          await supabase.from("articles_rattachements").delete().eq("id", existing.id);
        } else {
          // Update vers nouvel article magasin
          await supabase.from("articles_rattachements").update({
            article_magasin_id: articleMagasinId,
            prix_negocie_ht: prixNegocie,
          }).eq("id", existing.id);
        }
      } else {
        await supabase.from("articles_rattachements").insert({
          article_etablissement_id: articleEtabId,
          article_magasin_id: articleMagasinId,
          etablissement_id: selectedEtabId,
          magasin_id: magasinCtx.magasinId || null,
          prix_negocie_ht: prixNegocie,
          created_by: auth.user?.id,
        });
      }
      await loadEtabArticles();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  const etabFiltered = articlesEtab.filter(a => {
    if (!searchEtab) return true;
    const s = searchEtab.toLowerCase();
    return (a.libelle || "").toLowerCase().includes(s) || (a.code || "").toLowerCase().includes(s);
  });

  const magFiltered = articlesMagasin.filter(a => {
    if (!searchMag) return true;
    const s = searchMag.toLowerCase();
    return (a.libelle || "").toLowerCase().includes(s) || (a.code || "").toLowerCase().includes(s);
  });

  const etab = etabs.find(e => e.id === selectedEtabId);

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <PageHead icon="ti-link" title="Rattachements articles étab ↔ magasin" subtitle="Associe les articles d'un établissement à ton catalogue magasin" />

          {/* Choix étab */}
          <Panel>
            <h3 style={{ margin: "0 0 10px", color: "#185FA5" }}>1. Choisis l'établissement</h3>
            <select value={selectedEtabId} onChange={(e) => setSelectedEtabId(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 14 }}>
              <option value="">— Choisir un établissement —</option>
              {etabs.map(e => <option key={e.id} value={e.id}>{e.nom} {e.ville && `(${e.ville})`}</option>)}
            </select>
            {etab && (
              <div style={{ marginTop: 8, padding: 10, background: "rgba(24,95,165,.08)", borderLeft: "3px solid #185FA5", borderRadius: 6, fontSize: 12.5, color: "#5a6878" }}>
                <b>{articlesEtab.length}</b> article(s) côté étab · <b>{rattachements.length}</b> rattaché(s) · <b>{articlesEtab.length - rattachements.length}</b> à rattacher
              </div>
            )}
          </Panel>

          {/* 2 colonnes : étab vs magasin */}
          {selectedEtabId && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              {/* Articles étab */}
              <Panel>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: "#185FA5" }}>📋 Articles de {etab?.nom}</h3>
                  <span style={{ fontSize: 11, color: "#8a98a8" }}>{etabFiltered.length}</span>
                </div>
                <input value={searchEtab} onChange={(e) => setSearchEtab(e.target.value)} placeholder="🔍 Rechercher..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontSize: 12.5, marginBottom: 8 }} />
                <div style={{ maxHeight: 500, overflowY: "auto" }}>
                  {etabFiltered.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>Aucun article pour cet étab</div>
                  ) : (
                    etabFiltered.map(ae => {
                      const rat = getRattachement(ae.id);
                      const ratArt = rat && articlesMagasin.find(am => am.id === rat.article_magasin_id);
                      return (
                        <div key={ae.id} style={{
                          padding: 10, marginBottom: 6,
                          background: rat ? "rgba(94,160,90,.08)" : "#fff",
                          border: `1px solid ${rat ? "#5aa05a" : "#e3e9ee"}`,
                          borderLeft: `4px solid ${rat ? "#5aa05a" : "#185FA5"}`,
                          borderRadius: 8,
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{ae.libelle}</div>
                          {ae.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{ae.code}</div>}
                          {rat && (
                            <div style={{ marginTop: 6, padding: 6, background: "rgba(94,160,90,.10)", borderRadius: 4, fontSize: 11 }}>
                              <span style={{ color: "#5aa05a", fontWeight: 700 }}>✓ Rattaché à :</span>
                              <div style={{ color: "#142131", fontWeight: 600 }}>{ratArt?.libelle || rat.article_magasin_id}</div>
                              {rat.prix_negocie_ht && <div style={{ color: "#7a6fb0", fontFamily: "Consolas,monospace" }}>💰 {parseFloat(rat.prix_negocie_ht).toFixed(2)} € HT négocié</div>}
                              <button onClick={() => lier(ae.id, rat.article_magasin_id)} style={{ marginTop: 4, padding: "2px 8px", background: "transparent", border: "1px solid #e35d5b", color: "#e35d5b", borderRadius: 4, fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}>
                                ✕ Délier
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>

              {/* Articles magasin */}
              <Panel>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: "#5a8f8f" }}>📦 Catalogue magasin</h3>
                  <span style={{ fontSize: 11, color: "#8a98a8" }}>{magFiltered.length}</span>
                </div>
                <input value={searchMag} onChange={(e) => setSearchMag(e.target.value)} placeholder="🔍 Rechercher..." style={{ width: "100%", padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontSize: 12.5, marginBottom: 8 }} />
                <div style={{ maxHeight: 500, overflowY: "auto" }}>
                  {magFiltered.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>
                      Aucun article. <a href="/magasin/catalogue" style={{ color: "#5a8f8f", fontWeight: 700 }}>Créer →</a>
                    </div>
                  ) : (
                    magFiltered.map(am => {
                      const nbRat = rattachements.filter(r => r.article_magasin_id === am.id).length;
                      return (
                        <div key={am.id} style={{
                          padding: 10, marginBottom: 6,
                          background: "#fff",
                          border: "1px solid #e3e9ee",
                          borderLeft: "4px solid #5a8f8f",
                          borderRadius: 8,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{am.libelle}</div>
                              {am.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{am.code}</div>}
                              {am.prix_public_ht && <div style={{ fontSize: 11, color: "#5aa05a", fontWeight: 700, marginTop: 2 }}>💰 {parseFloat(am.prix_public_ht).toFixed(2)} € HT</div>}
                            </div>
                            {nbRat > 0 && <span style={{ padding: "2px 6px", background: "rgba(24,95,165,.10)", color: "#185FA5", borderRadius: 3, fontSize: 10, fontWeight: 700 }}>🔗 {nbRat}</span>}
                          </div>
                          {/* Boutons pour lier articles étab sélectionnés */}
                          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {articlesEtab.slice(0, 3).map(ae => {
                              const rat = getRattachement(ae.id);
                              const isCurrentLink = rat?.article_magasin_id === am.id;
                              return (
                                <button key={ae.id} onClick={() => lier(ae.id, am.id)} disabled={saving} style={{
                                  padding: "3px 8px",
                                  background: isCurrentLink ? "#5aa05a" : "#fff",
                                  color: isCurrentLink ? "#fff" : "#185FA5",
                                  border: `1px solid ${isCurrentLink ? "#5aa05a" : "#185FA5"}`,
                                  borderRadius: 4, fontSize: 10.5, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                                }}>
                                  {isCurrentLink ? "✓ " : "→ "}{ae.libelle?.slice(0, 18)}
                                </button>
                              );
                            })}
                            {articlesEtab.length > 3 && <span style={{ fontSize: 10, color: "#8a98a8", padding: "3px 4px" }}>+{articlesEtab.length - 3}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Panel>
            </div>
          )}

          {/* Aide */}
          <Panel style={{ marginTop: 14, background: "rgba(94,143,143,.08)", borderLeft: "4px solid #5a8f8f" }}>
            <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.6 }}>
              <b>💡 Comment ça marche</b> :
              <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
                <li>À gauche : la liste des articles propres à l'étab choisi.</li>
                <li>À droite : ton catalogue magasin. Pour chaque article magasin, tu vois 3 boutons pour rattacher rapidement des articles de l'étab.</li>
                <li>Click sur "→ Article" → rattache. Vert = rattachement actif.</li>
                <li>Click "✕ Délier" sur la card de gauche pour défaire le lien.</li>
                <li>Quand l'EC passe une commande sur un article rattaché, c'est le prix de la <b>mercuriale active</b> de l'étab qui sera appliqué.</li>
              </ul>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
