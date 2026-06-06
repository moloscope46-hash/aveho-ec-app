"use client";
// =============================================================
//  /article/[id] — Fiche détaillée article (0.58.69)
//  Page dédiée au-delà du modal /articles.
//  Onglets : Vue d'ensemble / Stock & mouvements / Matériels rattachés
//           / Historique / Documents / Étiquettes
// =============================================================

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { selectMaterielsByArticle } from "../../../lib/materiels";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, IconButton } from "../../ui";
import { EmptyState, SkeletonRow, toast } from "../../components/ui-premium";
import { fmtEur } from "../../../lib/format";
import { generateEan13Svg, isValidEan13 } from "../../../lib/barcode";

export default function ArticleDetailPage({ params }) {
  // Next 15 : params est une Promise — on l'unwrap avec React.use
  const resolved = use(params);
  const id = resolved.id;
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [article, setArticle] = useState(null);
  const [tva, setTva] = useState(null);
  const [pharmacie, setPharmacie] = useState(null);
  const [partenaire, setPartenaire] = useState(null);
  const [materiels, setMateriels] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  // 0.58.72 : nouveaux états (fournisseurs multi, tags article)
  const [fournisseurs, setFournisseurs] = useState([]);  // article_fournisseurs
  const [articleTags, setArticleTags] = useState([]);
  const [allTags, setAllTags] = useState([]);            // tags_article disponibles
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [notFound, setNotFound] = useState(false);

  async function loadAll() {
    if (!auth.ready || !id) return;
    setLoading(true);
    try {
      const { data: a, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!a) { setNotFound(true); setLoading(false); return; }
      setArticle(a);

      // Charges parallèles
      const promises = [];
      if (a.tva_taux_id) {
        promises.push(supabase.from("tva_taux").select("*").eq("id", a.tva_taux_id).maybeSingle());
      }
      if (a.pharmacie_id) {
        promises.push(supabase.from("pharmacies").select("id, nom, ville").eq("id", a.pharmacie_id).maybeSingle());
      }
      if (a.etablissement_partenaire_id) {
        promises.push(supabase.from("etablissements_partenaires").select("id, nom").eq("id", a.etablissement_partenaire_id).maybeSingle());
      }
      // Matériels rattachés - 0.58.71 : helper avec fallback article_id absent
      // (évite le 400 si SQL 0.58.67 pas appliqué)
      const matResultPromise = selectMaterielsByArticle(supabase, id,
        "id, libelle, num_serie, num_lot, etat, date_peremption, patient_id, depot_id, created_at"
      );
      promises.push(matResultPromise);

      const results = await Promise.allSettled(promises);
      let idx = 0;
      if (a.tva_taux_id) { setTva(results[idx++].value?.data || null); }
      if (a.pharmacie_id) { setPharmacie(results[idx++].value?.data || null); }
      if (a.etablissement_partenaire_id) { setPartenaire(results[idx++].value?.data || null); }
      // Le helper retourne {data, hasArticleId} ; on extrait .data
      const matRes = results[idx++].value;
      setMateriels(matRes?.data || []);

      // Mouvements stock (table optionnelle — fallback gracieux)
      try {
        const { data: mvts } = await supabase
          .from("stock_mouvements")
          .select("id, type, quantite, lot, num_serie, date_peremption, created_at, notes, user_email")
          .eq("article_id", id)
          .order("created_at", { ascending: false })
          .limit(50);
        setMouvements(mvts || []);
      } catch { /* table absente, silent */ }

      // 0.58.72 : Fournisseurs multi (table optionnelle)
      try {
        const { data: fs } = await supabase
          .from("article_fournisseurs")
          .select("*")
          .eq("article_id", id)
          .order("est_prioritaire", { ascending: false })
          .order("created_at", { ascending: true });
        setFournisseurs(fs || []);
      } catch { /* table absente */ }

      // 0.58.72 : Tags article (table optionnelle)
      try {
        const { data: links } = await supabase
          .from("article_tags").select("tag_id").eq("article_id", id);
        const tagIds = (links || []).map(l => l.tag_id);
        if (tagIds.length > 0) {
          const { data: tgs } = await supabase
            .from("tags_article").select("*").in("id", tagIds);
          setArticleTags(tgs || []);
        }
        // Liste de tous les tags pour ajout/édition
        const { data: all } = await supabase
          .from("tags_article").select("*").eq("actif", true).order("ordre_affichage").order("libelle");
        setAllTags(all || []);
      } catch { /* table absente */ }
    } catch (e) {
      console.error("[article] load:", e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [auth.ready, id]);

  // Calculs stat
  const stats = useMemo(() => {
    if (!article || !materiels) return null;
    const total = materiels.length;
    const dispo = materiels.filter(m => m.etat === "Disponible" || !m.etat).length;
    const utilises = materiels.filter(m => m.patient_id).length;
    const enStock = materiels.filter(m => m.depot_id && !m.patient_id).length;
    // Stock total = somme des entrées - somme des sorties si on a des mvts
    let stockMvts = null;
    if (mouvements.length > 0) {
      stockMvts = mouvements.reduce((s, m) => {
        const q = parseFloat(m.quantite || 0);
        if (m.type === "entree" || m.type === "in") return s + q;
        if (m.type === "sortie" || m.type === "out") return s - q;
        return s;
      }, 0);
    }
    return { total, dispo, utilises, enStock, stockMvts };
  }, [article, materiels, mouvements]);

  if (!auth.ready) return null;

  if (notFound) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <EmptyState
            illustration="package"
            variant="terra"
            title="Article introuvable"
            message="Cet article n'existe pas ou a été supprimé."
            actionLabel="Retour au catalogue"
            onAction={() => router.push("/articles")}
          />
        </div>
      </div>
    );
  }

  if (loading || !article) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><SkeletonRow count={6} /></Panel>
        </div>
      </div>
    );
  }

  const ttc = article.prix_vente_ttc || (article.prix_vente_ht && article.tva_pct ? Math.round(article.prix_vente_ht * (1 + article.tva_pct / 100) * 100) / 100 : null);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.58.72 : Bouton retour */}
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        {/* Header personnalisé avec photo + métadonnées */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5a6878", marginBottom: 6 }}>
            <a onClick={() => router.push("/articles")} style={{ cursor: "pointer", color: "#185FA5", textDecoration: "none" }}>
              <i className="ti ti-arrow-left" /> Articles
            </a>
            <i className="ti ti-chevron-right" style={{ fontSize: 10 }} />
            <span>{article.famille || "Sans famille"}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Image / icône */}
            <div style={{
              width: 96, height: 96, borderRadius: 14,
              background: article.image_url ? `url(${article.image_url}) center/cover` : "linear-gradient(135deg, #185FA5, #134e87)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: "0 6px 20px rgba(20,33,49,.20)",
            }}>
              {!article.image_url && <i className="ti ti-package" style={{ color: "#fff", fontSize: 42 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h1 style={{ margin: "0 0 6px", fontSize: 24, color: "#142131", fontWeight: 700 }}>
                {article.libelle}
                {article.archive && <span style={{ marginLeft: 8, fontSize: 11, background: "#fde4e1", color: "#c0392b", padding: "2px 8px", borderRadius: 4, fontWeight: 700, verticalAlign: "middle" }}>ARCHIVÉ</span>}
                {!article.actif && <span style={{ marginLeft: 8, fontSize: 11, background: "#f0f3f6", color: "#5a6878", padding: "2px 8px", borderRadius: 4, fontWeight: 700, verticalAlign: "middle" }}>INACTIF</span>}
              </h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#5a6878", marginBottom: 8 }}>
                {article.reference && <span><i className="ti ti-hash" /> <code style={{ background: "transparent", padding: 0, color: "#185FA5" }}>{article.reference}</code></span>}
                {article.code_barre && <span><i className="ti ti-barcode" /> <code style={{ background: "transparent", padding: 0 }}>{article.code_barre}</code></span>}
                {article.code_lpp && <span><i className="ti ti-shield-check" /> LPP {article.code_lpp}</span>}
                {article.fabricant && <span><i className="ti ti-building-factory" /> {article.fabricant}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {article.dispositif_medical && <span style={{ fontSize: 10.5, background: "#fde4e1", color: "#c0392b", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>DM{article.classe_dm ? ` ${article.classe_dm}` : ""}</span>}
                {article.sterile && <span style={{ fontSize: 10.5, background: "#dbe7f5", color: "#185FA5", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>STÉRILE</span>}
                {article.usage_unique && <span style={{ fontSize: 10.5, background: "#fff8ec", color: "#7a4f15", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>USAGE UNIQUE</span>}
                {article.gere_lot && <span style={{ fontSize: 10.5, background: "rgba(124,200,200,.18)", color: "#1c5454", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>🏷 LOT</span>}
                {article.gere_serie && <span style={{ fontSize: 10.5, background: "rgba(122,111,176,.18)", color: "#5a4a90", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>🔢 SÉRIE</span>}
                {article.gere_peremption && <span style={{ fontSize: 10.5, background: "rgba(239,159,39,.18)", color: "#7a4f15", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>⏱ PÉREMPTION</span>}
              </div>
            </div>
            {/* Prix vedette */}
            {ttc && (
              <div style={{ background: "linear-gradient(135deg, #142131, #243044)", color: "#fff", borderRadius: 12, padding: "14px 22px", textAlign: "right", minWidth: 140, boxShadow: "0 8px 25px rgba(20,33,49,.30)" }}>
                <div style={{ fontSize: 10.5, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Prix TTC</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Consolas, monospace" }}>{fmtEur(ttc)}</div>
                {article.prix_vente_ht && article.tva_pct && (
                  <div style={{ fontSize: 10.5, color: "#bdd6ec", marginTop: 2 }}>
                    {fmtEur(article.prix_vente_ht)} HT · TVA {article.tva_pct}%
                  </div>
                )}
              </div>
            )}
            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Btn variant="primary" icon="ti-edit" onClick={() => router.push(`/articles?edit=${article.id}`)}>Éditer</Btn>
              <Btn variant="ghost" icon="ti-qrcode" onClick={() => router.push(`/scan/article?article_id=${article.id}`)}>
                Entrée stock
              </Btn>
              <Btn variant="ghost" icon="ti-printer" onClick={() => router.push(`/articles/etiquettes?ids=${article.id}`)}>
                Imprimer étiquette
              </Btn>
            </div>
          </div>
        </div>

        {/* Stats KPI rapides */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, borderLeft: "3px solid #185FA5" }}>
              <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>Matériels au total</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#142131", fontFamily: "Consolas, monospace" }}>{stats.total}</div>
            </div>
            <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, borderLeft: "3px solid #5aa05a" }}>
              <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>Disponibles</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#5aa05a", fontFamily: "Consolas, monospace" }}>{stats.dispo}</div>
            </div>
            <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, borderLeft: "3px solid #7a6fb0" }}>
              <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>Affectés à un patient</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#7a6fb0", fontFamily: "Consolas, monospace" }}>{stats.utilises}</div>
            </div>
            <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, borderLeft: "3px solid #EF9F27" }}>
              <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>En dépôt</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#EF9F27", fontFamily: "Consolas, monospace" }}>{stats.enStock}</div>
            </div>
            {article.stock_min !== null && article.stock_min !== undefined && (
              <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10, borderLeft: `3px solid ${stats.dispo < article.stock_min ? "#e35d5b" : "#5aa05a"}` }}>
                <div style={{ fontSize: 10.5, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>Seuil mini</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stats.dispo < article.stock_min ? "#e35d5b" : "#142131", fontFamily: "Consolas, monospace" }}>{article.stock_min}</div>
                {stats.dispo < article.stock_min && (
                  <div style={{ fontSize: 10, color: "#e35d5b", fontWeight: 700, marginTop: 2 }}>⚠ STOCK BAS</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Onglets — 0.58.72 : ajout Location, Fournisseurs, Tags */}
        <div style={{ display: "flex", borderBottom: "2px solid #e3e9ee", marginBottom: 16, overflowX: "auto" }}>
          {[
            { key: "overview", lbl: "Vue d'ensemble", icon: "ti-eye" },
            { key: "materiels", lbl: `Matériels (${materiels.length})`, icon: "ti-package" },
            { key: "stock", lbl: "Stock & mouvements", icon: "ti-arrows-up-down" },
            { key: "tarifs", lbl: "Tarifs détaillés", icon: "ti-coin-euro" },
            { key: "location", lbl: "Location", icon: "ti-calendar-time" },
            { key: "fournisseurs", lbl: `Fournisseurs (${fournisseurs.length})`, icon: "ti-building-warehouse" },
            { key: "tags", lbl: `Tags (${articleTags.length})`, icon: "ti-tag" },
            { key: "compta", lbl: "Comptabilité", icon: "ti-calculator" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                background: activeTab === t.key ? "linear-gradient(135deg, rgba(124,200,200,.20), transparent)" : "transparent",
                color: activeTab === t.key ? "#185FA5" : "#5a6878",
                border: "none", borderBottom: `3px solid ${activeTab === t.key ? "#185FA5" : "transparent"}`,
                padding: "9px 16px", fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              <i className={`ti ${t.icon}`} /> {t.lbl}
            </button>
          ))}
        </div>

        {/* Tab : Vue d'ensemble */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-info-circle" /> Informations générales
              </h3>
              <Field label="Référence" value={article.reference} mono />
              <Field label="Libellé" value={article.libelle} />
              <Field label="Famille" value={article.famille} />
              <Field label="Marque" value={article.marque} />
              <Field label="Modèle" value={article.modele} />
              <Field label="Fabricant" value={article.fabricant} />
              <Field label="Description" value={article.description} multi />
              {article.notes_internes && (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#fff8ec", borderLeft: "3px solid #EF9F27", borderRadius: 4 }}>
                  <div style={{ fontSize: 10.5, color: "#7a4f15", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}><i className="ti ti-lock" /> Notes internes</div>
                  <div style={{ fontSize: 12, color: "#142131" }}>{article.notes_internes}</div>
                </div>
              )}
            </Panel>

            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-package" /> Logistique
              </h3>
              <Field label="Unité" value={article.unite || "unité"} />
              <Field label="Conditionnement" value={article.conditionnement_libelle || (article.conditionnement > 1 ? `${article.conditionnement} ${article.unite}` : null)} />
              <Field label="Poids" value={article.poids_g ? `${article.poids_g} g` : null} />
              <Field label="Volume" value={article.volume_ml ? `${article.volume_ml} ml` : null} />
              <Field label="Dimensions (L × l × H)" value={(article.longueur_cm || article.largeur_cm || article.hauteur_cm) ? `${article.longueur_cm || "?"} × ${article.largeur_cm || "?"} × ${article.hauteur_cm || "?"} cm` : null} />
              <Field label="Quantité / carton" value={article.quantite_carton} />
              <Field label="Quantité / palette" value={article.quantite_palette} />
              <Field label="Délai d'approvisionnement" value={article.delai_appro_jours ? `${article.delai_appro_jours} jours` : null} />
            </Panel>

            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-barcode" /> Codes-barres & identifiants
              </h3>
              <Field label="Code-barres principal" value={article.code_barre} mono />
              {article.code_barre && isValidEan13(article.code_barre) && (
                <div style={{ padding: 8, background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8, marginTop: 6 }}
                     dangerouslySetInnerHTML={{ __html: generateEan13Svg(article.code_barre) }} />
              )}
              <Field label="Type" value={article.code_barre_type} />
              <Field label="Code LPP / LPPR" value={article.code_lpp} mono />
              <Field label="Code ACL (officine)" value={article.code_acl} mono />
              <Field label="Code UCD (hôpital)" value={article.code_ucd} mono />
            </Panel>

            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="ti ti-link" /> Rattachements
              </h3>
              {pharmacie ? (
                <Field label="Pharmacie de référence" value={`${pharmacie.nom}${pharmacie.ville ? ` · ${pharmacie.ville}` : ""}`} />
              ) : <Field label="Pharmacie" value={null} />}
              {partenaire ? (
                <Field label="Établissement partenaire" value={partenaire.nom} />
              ) : <Field label="Partenaire" value={null} />}
              <Field label="Code fournisseur principal" value={article.fournisseur_principal_id ? "Lié" : null} />
            </Panel>
          </div>
        )}

        {/* Tab : Matériels */}
        {activeTab === "materiels" && (
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            {materiels.length === 0 ? (
              <EmptyState
                illustration="package"
                title="Aucun matériel rattaché"
                message="Cet article n'a aucun matériel physique rattaché. Crée un matériel depuis l'inventaire ou fais une entrée stock."
                actionLabel="Faire une entrée stock"
                onAction={() => router.push(`/scan/article?article_id=${article.id}`)}
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f5f8fc, #fff)", borderBottom: "2px solid #e3e9ee" }}>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Libellé</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>S/N ou Lot</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>État</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Péremption</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Localisation</th>
                      <th style={{ padding: "9px 8px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiels.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f0f3f6" }}>
                        <td style={{ padding: "8px" }}>
                          <a onClick={() => router.push(`/materiel/${m.id}`)} style={{ cursor: "pointer", color: "#185FA5", fontWeight: 600, textDecoration: "none" }}>{m.libelle || "Sans libellé"}</a>
                        </td>
                        <td style={{ padding: "8px", fontFamily: "Consolas, monospace", fontSize: 11 }}>
                          {m.num_serie ? <span><i className="ti ti-hash" style={{ color: "#7a6fb0" }} /> {m.num_serie}</span> : m.num_lot ? <span><i className="ti ti-tag" style={{ color: "#7CC8C8" }} /> {m.num_lot}</span> : <span style={{ color: "#cfd8e0" }}>—</span>}
                        </td>
                        <td style={{ padding: "8px", color: "#5a6878" }}>{m.etat || "—"}</td>
                        <td style={{ padding: "8px", fontSize: 11, color: "#5a6878" }}>
                          {m.date_peremption ? new Date(m.date_peremption).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={{ padding: "8px", fontSize: 11, color: "#5a6878" }}>
                          {m.patient_id ? "👤 Patient" : m.depot_id ? "📦 Dépôt" : "—"}
                        </td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          <IconButton icon="ti-external-link" color="#185FA5" ariaLabel="Voir matériel" onClick={() => router.push(`/materiel/${m.id}`)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* Tab : Stock & mouvements */}
        {activeTab === "stock" && (
          <>
            <Panel style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Mouvements de stock</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#5a6878" }}>
                    {mouvements.length} mouvement{mouvements.length > 1 ? "s" : ""} sur les 50 derniers
                  </p>
                </div>
                <Btn variant="primary" icon="ti-qrcode" onClick={() => router.push(`/scan/article?article_id=${article.id}`)}>Entrée stock (scan)</Btn>
              </div>
            </Panel>

            {mouvements.length === 0 ? (
              <Panel>
                <EmptyState
                  illustration="package"
                  title="Aucun mouvement de stock enregistré"
                  message="Active la traçabilité en scannant des entrées via le module Scan code-barres."
                  actionLabel="Première entrée stock"
                  onAction={() => router.push(`/scan/article?article_id=${article.id}`)}
                />
              </Panel>
            ) : (
              <Panel style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f5f8fc, #fff)", borderBottom: "2px solid #e3e9ee" }}>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                      <th style={{ padding: "9px 8px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Quantité</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Lot / Série</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Péremption</th>
                      <th style={{ padding: "9px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mouvements.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f0f3f6" }}>
                        <td style={{ padding: "8px", fontSize: 11.5, color: "#5a6878" }}>
                          {new Date(m.created_at).toLocaleString("fr-FR")}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: m.type === "entree" || m.type === "in" ? "rgba(90,160,90,.15)" : "rgba(227,93,91,.15)",
                            color: m.type === "entree" || m.type === "in" ? "#5aa05a" : "#e35d5b",
                          }}>
                            <i className={`ti ${m.type === "entree" || m.type === "in" ? "ti-arrow-down" : "ti-arrow-up"}`} /> {m.type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 700, color: m.type === "entree" || m.type === "in" ? "#5aa05a" : "#e35d5b" }}>
                          {m.type === "entree" || m.type === "in" ? "+" : "-"}{m.quantite || 0}
                        </td>
                        <td style={{ padding: "8px", fontFamily: "Consolas, monospace", fontSize: 11, color: "#5a6878" }}>
                          {m.num_serie || m.lot || "—"}
                        </td>
                        <td style={{ padding: "8px", fontSize: 11, color: "#5a6878" }}>
                          {m.date_peremption ? new Date(m.date_peremption).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td style={{ padding: "8px", fontSize: 11, color: "#5a6878" }}>{m.user_email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
          </>
        )}

        {/* Tab : Tarifs */}
        {activeTab === "tarifs" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}>Prix d'achat</h3>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Consolas, monospace", color: "#142131" }}>
                {article.prix_achat_ht ? fmtEur(article.prix_achat_ht) : "—"}
                <span style={{ fontSize: 12, color: "#8a98a8", marginLeft: 6 }}>HT</span>
              </div>
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}>Prix de vente</h3>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Consolas, monospace", color: "#142131" }}>
                {article.prix_vente_ht ? fmtEur(article.prix_vente_ht) : "—"}
                <span style={{ fontSize: 12, color: "#8a98a8", marginLeft: 6 }}>HT</span>
              </div>
              {ttc && (
                <div style={{ marginTop: 4, fontSize: 16, color: "#185FA5", fontFamily: "Consolas, monospace" }}>
                  {fmtEur(ttc)} <span style={{ fontSize: 11, color: "#8a98a8" }}>TTC</span>
                </div>
              )}
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}>Marge calculée</h3>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Consolas, monospace",
                color: article.marge_pct >= 30 ? "#5aa05a" : article.marge_pct >= 10 ? "#EF9F27" : article.marge_pct ? "#e35d5b" : "#cfd8e0" }}>
                {article.marge_pct ? `${article.marge_pct}%` : "—"}
              </div>
              {article.prix_achat_ht && article.prix_vente_ht && (
                <div style={{ marginTop: 4, fontSize: 12, color: "#5a6878" }}>
                  Gain unitaire : <b>{fmtEur(parseFloat(article.prix_vente_ht) - parseFloat(article.prix_achat_ht))}</b>
                </div>
              )}
            </Panel>
            <Panel>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase" }}>TVA appliquée</h3>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Consolas, monospace", color: "#EF9F27" }}>
                {article.tva_pct ? `${article.tva_pct}%` : "—"}
              </div>
              {tva && (
                <div style={{ marginTop: 4, fontSize: 12, color: "#5a6878" }}>
                  <b>{tva.code}</b> — {tva.libelle}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* 0.58.72 — Tab : Location */}
        {activeTab === "location" && (
          <Panel>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#142131" }}>
              <i className="ti ti-calendar-time" /> Tarifs de location
            </h3>
            {article.louable === false ? (
              <div style={{ padding: "16px 18px", background: "rgba(124,200,200,.10)", borderRadius: 8, borderLeft: "3px solid #7CC8C8" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1c5454" }}>
                  Cet article n'est pas marqué comme <b>louable</b>. Pour activer la location, édite l'article et coche la case "Louable" puis renseigne les tarifs ci-dessous.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <LocCard label="Par jour" amount={article.prix_location_jour} period="/jour" color="#5aa05a" icon="ti-sun" defaultUnit={article.facturation_location === "jour"} />
                <LocCard label="Par semaine" amount={article.prix_location_semaine} period="/semaine" color="#185FA5" icon="ti-calendar" defaultUnit={article.facturation_location === "semaine"} />
                <LocCard label="Par mois" amount={article.prix_location_mois} period="/mois" color="#7a6fb0" icon="ti-calendar-month" defaultUnit={article.facturation_location === "mois"} />
                <LocCard label="Par trimestre" amount={article.prix_location_trimestre} period="/trim." color="#EF9F27" icon="ti-calendar-stats" defaultUnit={article.facturation_location === "trimestre"} />
              </div>
            )}
            <p style={{ margin: "14px 0 0", fontSize: 11.5, color: "#8a98a8", lineHeight: 1.5 }}>
              Les locations en cours sont visibles sur la fiche du matériel concerné (onglet "Mouvements"). Pour configurer ces tarifs, édite l'article via le bouton <b>Éditer</b> en haut de la page.
            </p>
          </Panel>
        )}

        {/* 0.58.72 — Tab : Fournisseurs */}
        {activeTab === "fournisseurs" && (
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e3e9ee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>
                <i className="ti ti-building-warehouse" /> Fournisseurs ({fournisseurs.length})
              </h3>
              <Btn variant="primary" icon="ti-plus" onClick={() => router.push(`/articles?edit=${id}&tab=fournisseurs`)}>Ajouter</Btn>
            </div>
            {fournisseurs.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-building-warehouse" style={{ fontSize: 36, opacity: 0.5 }} /><br />
                <div style={{ marginTop: 10, fontSize: 13 }}>Aucun fournisseur enregistré.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Active le SQL 0.58.72 et ajoute des fournisseurs avec prix d'achat différents.</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#fafbfc", borderBottom: "2px solid #e3e9ee" }}>
                    <th style={{ padding: "9px 10px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Fournisseur</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                    <th style={{ padding: "9px 10px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Prix HT</th>
                    <th style={{ padding: "9px 10px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Remise</th>
                    <th style={{ padding: "9px 10px", textAlign: "center", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Délai</th>
                    <th style={{ padding: "9px 10px", textAlign: "center", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Priorité</th>
                  </tr>
                </thead>
                <tbody>
                  {fournisseurs.map(f => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #f0f3f6", background: f.est_prioritaire ? "rgba(255,215,0,.05)" : undefined }}>
                      <td style={{ padding: "9px 10px" }}>
                        <div style={{ fontWeight: 600, color: "#142131" }}>{f.reference_fournisseur || "—"}</div>
                        <div style={{ fontSize: 11, color: "#5a6878" }}>{f.notes}</div>
                      </td>
                      <td style={{ padding: "9px 10px" }}>
                        <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: f.fournisseur_type === "pharmacie" ? "rgba(124,200,200,.18)" : "rgba(122,111,176,.18)", color: f.fournisseur_type === "pharmacie" ? "#1c5454" : "#5a4a90" }}>
                          {f.fournisseur_type}
                        </span>
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "Consolas, monospace", fontWeight: 700, color: "#142131" }}>{f.prix_achat_ht ? fmtEur(f.prix_achat_ht) : "—"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: "#5aa05a", fontWeight: 700 }}>{f.remise_pct ? `-${f.remise_pct}%` : "—"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "center", fontSize: 11.5 }}>{f.delai_livraison_jours ? `${f.delai_livraison_jours}j` : "—"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "center" }}>
                        {f.est_prioritaire ? <span style={{ fontSize: 16 }} title="Fournisseur prioritaire">⭐</span> : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {/* 0.58.72 — Tab : Tags */}
        {activeTab === "tags" && (
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>
                <i className="ti ti-tag" /> Tags ({articleTags.length})
              </h3>
              <Btn variant="ghost" icon="ti-settings" onClick={() => router.push("/parametres/tags-article")}>Gérer les tags</Btn>
            </div>
            {articleTags.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#8a98a8" }}>
                <p style={{ fontSize: 13 }}>Aucun tag associé. Les tags permettent d'appliquer des règles de prix automatiques.</p>
                {allTags.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 11.5, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Tags disponibles :</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                      {allTags.map(t => (
                        <span key={t.id} style={{ padding: "4px 10px", borderRadius: 14, fontSize: 11.5, fontWeight: 600, background: (t.couleur || "#7a6fb0") + "22", color: t.couleur || "#7a6fb0", border: `1px solid ${(t.couleur || "#7a6fb0")}40` }}>
                          <i className={`ti ${t.icone || "ti-tag"}`} style={{ marginRight: 4 }} />{t.libelle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {articleTags.map(t => (
                  <div key={t.id} style={{ padding: "10px 14px", borderRadius: 10, border: `2px solid ${(t.couleur || "#7a6fb0")}40`, background: (t.couleur || "#7a6fb0") + "10" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <i className={`ti ${t.icone || "ti-tag"}`} style={{ color: t.couleur || "#7a6fb0", fontSize: 18 }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: t.couleur || "#7a6fb0" }}>{t.libelle}</span>
                    </div>
                    {t.description && <div style={{ fontSize: 11, color: "#5a6878", marginBottom: 6 }}>{t.description}</div>}
                    {(t.surcharge_prix_vente_pct || t.prix_vente_fixe) && (
                      <div style={{ fontSize: 11, color: "#142131", fontFamily: "Consolas, monospace", padding: "4px 8px", background: "rgba(255,255,255,.6)", borderRadius: 4 }}>
                        {t.prix_vente_fixe ? `Prix fixe vente : ${fmtEur(t.prix_vente_fixe)}` : `Surcharge vente : ${t.surcharge_prix_vente_pct > 0 ? "+" : ""}${t.surcharge_prix_vente_pct}%`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {/* Tab : Compta */}
        {activeTab === "compta" && (
          <Panel>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#142131" }}>
              <i className="ti ti-calculator" /> Configuration comptable de l'article
            </h3>
            {tva ? (
              <>
                <p style={{ fontSize: 12, color: "#5a6878", margin: "0 0 12px" }}>
                  Le taux TVA <b>{tva.libelle}</b> ({tva.taux}%) est appliqué à cet article. Les comptes ci-dessous sont hérités de ce taux, sauf si overridés.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <ComptaField label="Compte vente" inherited={tva.compte_vente} override={article.compte_vente_override} />
                  <ComptaField label="Compte achat" inherited={tva.compte_achat} override={article.compte_achat_override} />
                  <ComptaField label="TVA collectée" inherited={tva.compte_tva_collectee} />
                  <ComptaField label="TVA déductible" inherited={tva.compte_tva_deductible} />
                  <ComptaField label="Code analytique" inherited={tva.code_analytique} override={article.code_analytique_override} />
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "#8a98a8" }}>
                Aucun taux TVA paramétré pour cet article. Edite-le pour en choisir un, ou configure-en un nouveau dans
                {" "}<a onClick={() => router.push("/parametres/compta")} style={{ color: "#185FA5", cursor: "pointer" }}>Paramètres &gt; Comptabilité</a>.
              </p>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono, multi }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "#142131" : "#cfd8e0", fontFamily: mono && value ? "Consolas, monospace" : "inherit", whiteSpace: multi ? "pre-wrap" : "normal" }}>
        {value || "—"}
      </div>
    </div>
  );
}

function ComptaField({ label, inherited, override }) {
  const effective = override || inherited;
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontFamily: "Consolas, monospace", color: effective ? "#142131" : "#cfd8e0", fontWeight: 600 }}>
        {effective || "—"}
        {override && override !== inherited && (
          <span style={{ marginLeft: 6, fontSize: 9.5, background: "#fde4e1", color: "#c0392b", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>OVERRIDE</span>
        )}
      </div>
      {override && inherited && override !== inherited && (
        <div style={{ fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas, monospace" }}>
          (hérité : {inherited})
        </div>
      )}
    </div>
  );
}

// 0.58.72 - Carte tarif location
function LocCard({ label, amount, period, color, icon, defaultUnit }) {
  return (
    <div style={{ padding: "12px 14px", border: `1px solid ${color}30`, borderRadius: 10, borderLeft: `4px solid ${color}`, background: `${color}08`, position: "relative" }}>
      {defaultUnit && (
        <span style={{ position: "absolute", top: 6, right: 8, padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: color, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>défaut</span>
      )}
      <div style={{ fontSize: 11, color, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        <i className={`ti ${icon}`} /> {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: amount ? "#142131" : "#cfd8e0", fontFamily: "Consolas, monospace" }}>
        {amount ? `${parseFloat(amount).toFixed(2)} €` : "—"}
        {amount && <span style={{ fontSize: 11, color: "#5a6878", fontWeight: 500, marginLeft: 4 }}>{period}</span>}
      </div>
    </div>
  );
}
