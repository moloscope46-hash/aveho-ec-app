"use client";
// =============================================================
//  Page Articles (refonte massive 0.58.67)
//  Référentiel catalogue PSAD/FBM avec :
//   - Code-barres (génération EAN13 + scan GS1)
//   - Tarifs HT/TTC + TVA paramétrable
//   - Logistique (conditionnement, poids, dimensions)
//   - Tracabilité lot/série/péremption
//   - Rattachements (fournisseur, étab partenaire, pharmacie)
//   - Hover survol : voir les matériels rattachés (live count)
// =============================================================

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { safeSaveArticle } from "../../lib/articles";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from "../ui";
import { EmptyState, SkeletonRow, toast } from "../components/ui-premium";
import { fmtEur } from "../../lib/format";
import { generateEan13, isValidEan13, detectBarcodeType, generateEan13Svg } from "../../lib/barcode";
import { safeInsert, safeUpdate, safeDelete } from "../../lib/safeWrite";

const FAMILLES = ["Consommables", "Matériel médical", "Hygiène", "Pansements", "Perfusion", "Respiratoire", "Nutrition", "Cicatrisation", "Mobilité", "Autre"];
const UNITES = ["unité", "boîte", "kg", "g", "L", "ml", "m", "cm", "paire", "lot"];
const CLASSES_DM = ["", "I", "IIa", "IIb", "III"];
const TYPES_BARCODE = ["EAN13", "EAN8", "CODE128", "GS1-128", "DATAMATRIX"];

export default function Articles() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [items, setItems] = useState([]);
  const [tvaTaux, setTvaTaux] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [partenaires, setPartenaires] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  // 0.58.67 : count de matériels rattachés par article (pour hover)
  const [materielsByArticle, setMaterielsByArticle] = useState({});
  // Hover : article qui a le hover actif pour afficher la liste des matériels
  const [hoveredArticle, setHoveredArticle] = useState(null);
  const [hoveredMateriels, setHoveredMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFamille, setFilterFamille] = useState("");
  const [filterDm, setFilterDm] = useState(false);
  const [filterTracabilite, setFilterTracabilite] = useState("");  // "" | "lot" | "serie"
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Onglets dans le modal d'édition
  const [activeTab, setActiveTab] = useState("general");

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    try {
      const [{ data: arts }, { data: tva }, { data: pharms }, { data: parts }, { data: mats }] = await Promise.all([
        supabase.from("articles").select("*").eq("structure_id", auth.structureId).eq("archive", false).order("libelle"),
        supabase.from("tva_taux").select("*").eq("structure_id", auth.structureId).eq("actif", true).order("taux", { ascending: false }),
        supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId).eq("archive", false).order("nom"),
        supabase.from("etablissements_partenaires").select("id, nom").eq("structure_id", auth.structureId).order("nom"),
        // 0.58.67 : count de matériels par article_id
        supabase.from("materiels").select("article_id"),
      ]);
      setItems(arts || []);
      setTvaTaux(tva || []);
      setPharmacies(pharms || []);
      setPartenaires(parts || []);
      // Agréger les counts
      const counts = {};
      (mats || []).forEach(m => {
        if (m.article_id) counts[m.article_id] = (counts[m.article_id] || 0) + 1;
      });
      setMaterielsByArticle(counts);
    } catch (e) {
      console.error("[articles] load:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  // Pour le hover : charger les matériels d'un article
  async function loadMaterielsForArticle(articleId) {
    try {
      const { data } = await supabase
        .from("materiels")
        .select("id, libelle, num_serie, num_lot, etat, patient_id")
        .eq("article_id", articleId)
        .limit(10);
      setHoveredMateriels(data || []);
    } catch { setHoveredMateriels([]); }
  }

  function newArticle() {
    const defaultTva = tvaTaux.find(t => t.est_defaut) || tvaTaux[0];
    setForm({
      reference: "",
      libelle: "",
      famille: "",
      unite: "unité",
      conditionnement: 1,
      tva_taux_id: defaultTva?.id || null,
      tva_pct: defaultTva?.taux || 20,
      devise: "EUR",
      stock_min: 0,
      actif: true,
      dispositif_medical: false,
      sterile: false,
      usage_unique: false,
      gere_lot: false,
      gere_serie: false,
      gere_peremption: false,
    });
    setModal({});
    setActiveTab("general");
    setErr("");
  }

  function editArticle(a) {
    setForm({ ...a });
    setModal(a);
    setActiveTab("general");
    setErr("");
  }

  function genBarcode() {
    const code = generateEan13("200");
    setForm({ ...form, code_barre: code, code_barre_type: "EAN13" });
    toast.success(`Code-barres EAN13 généré : ${code}`);
  }

  function computeTtc(ht, taux) {
    if (!ht || !taux) return null;
    return Math.round(parseFloat(ht) * (1 + parseFloat(taux) / 100) * 10000) / 10000;
  }

  function recomputeMarge(prix_achat, prix_vente) {
    if (!prix_achat || !prix_vente || parseFloat(prix_achat) === 0) return null;
    return Math.round(((parseFloat(prix_vente) - parseFloat(prix_achat)) / parseFloat(prix_achat)) * 10000) / 100;
  }

  async function saveArticle() {
    if (!form.libelle?.trim()) { setErr("Libellé obligatoire."); return; }
    setBusy(true);
    try {
      const tvaSel = tvaTaux.find(t => t.id === form.tva_taux_id);
      const tvaPct = form.tva_pct !== undefined && form.tva_pct !== null && form.tva_pct !== "" ? parseFloat(form.tva_pct) : (tvaSel?.taux || 0);
      const prixHt = form.prix_vente_ht ? parseFloat(form.prix_vente_ht) : null;
      const ttc = prixHt ? computeTtc(prixHt, tvaPct) : null;
      const marge = recomputeMarge(form.prix_achat_ht, prixHt);

      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId,
        reference: form.reference || null,
        libelle: form.libelle.trim(),
        famille: form.famille || null,
        description: form.description || null,
        notes_internes: form.notes_internes || null,
        // Code-barres
        code_barre: form.code_barre || null,
        code_barre_type: form.code_barre_type || (form.code_barre ? detectBarcodeType(form.code_barre) : null),
        code_barres_alt: form.code_barres_alt || null,
        code_lpp: form.code_lpp || null,
        code_acl: form.code_acl || null,
        code_ucd: form.code_ucd || null,
        // Logistique
        unite: form.unite || "unité",
        conditionnement: form.conditionnement ? parseInt(form.conditionnement, 10) : 1,
        conditionnement_libelle: form.conditionnement_libelle || null,
        poids_g: form.poids_g ? parseFloat(form.poids_g) : null,
        volume_ml: form.volume_ml ? parseFloat(form.volume_ml) : null,
        longueur_cm: form.longueur_cm ? parseFloat(form.longueur_cm) : null,
        largeur_cm: form.largeur_cm ? parseFloat(form.largeur_cm) : null,
        hauteur_cm: form.hauteur_cm ? parseFloat(form.hauteur_cm) : null,
        quantite_palette: form.quantite_palette ? parseInt(form.quantite_palette, 10) : null,
        quantite_carton: form.quantite_carton ? parseInt(form.quantite_carton, 10) : null,
        // Stock
        stock_min: form.stock_min ? parseInt(form.stock_min, 10) : 0,
        stock_max: form.stock_max ? parseInt(form.stock_max, 10) : null,
        delai_appro_jours: form.delai_appro_jours ? parseInt(form.delai_appro_jours, 10) : null,
        // Tarifs
        prix_achat_ht: form.prix_achat_ht ? parseFloat(form.prix_achat_ht) : null,
        prix_vente_ht: prixHt,
        prix_vente_ttc: ttc,
        tva_taux_id: form.tva_taux_id || null,
        tva_pct: tvaPct,
        marge_pct: marge,
        devise: form.devise || "EUR",
        // Tracabilité
        gere_lot: !!form.gere_lot,
        gere_serie: !!form.gere_serie,
        gere_peremption: !!form.gere_peremption,
        duree_vie_jours: form.duree_vie_jours ? parseInt(form.duree_vie_jours, 10) : null,
        // Rattachements
        fournisseur_principal_id: form.fournisseur_principal_id || null,
        etablissement_partenaire_id: form.etablissement_partenaire_id || null,
        pharmacie_id: form.pharmacie_id || null,
        fabricant: form.fabricant || null,
        marque: form.marque || null,
        modele: form.modele || null,
        // Classifications
        classe_dm: form.classe_dm || null,
        sterile: !!form.sterile,
        usage_unique: !!form.usage_unique,
        dispositif_medical: !!form.dispositif_medical,
        // Compta override
        compte_vente_override: form.compte_vente_override || null,
        compte_achat_override: form.compte_achat_override || null,
        code_analytique_override: form.code_analytique_override || null,
        // Statut
        actif: form.actif !== false,
        image_url: form.image_url || null,
      };
      const userId = auth.user?.id;
      // 0.58.72 : utilisation du helper safeSaveArticle qui sonde les colonnes
      // et strip automatiquement celles qui sont absentes (évite les 400)
      const { error, caps, stripped } = await safeSaveArticle(supabase, payload, { id: modal?.id, userId });
      if (error) throw error;
      if (stripped && typeof console !== "undefined") {
        console.warn("[articles] Certaines colonnes ont été ignorées (SQL pending) :", caps);
      }
      toast.success(modal?.id ? `Article "${form.libelle}" mis à jour` : `Article "${form.libelle}" créé`);
      setModal(null);
      await loadAll();
    } catch (e) {
      setErr(e.message || "Erreur lors de la sauvegarde");
    } finally {
      setBusy(false);
    }
  }

  async function deleteArticle(id) {
    if (!confirm("Supprimer définitivement cet article ?")) return;
    try {
      const { error } = await safeDelete(supabase, "articles", { id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success("Article supprimé");
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const filtered = useMemo(() => {
    return items.filter(a => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = `${a.libelle || ""} ${a.reference || ""} ${a.code_barre || ""} ${a.code_lpp || ""} ${a.famille || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (filterFamille && a.famille !== filterFamille) return false;
      if (filterDm && !a.dispositif_medical) return false;
      if (filterTracabilite === "lot" && !a.gere_lot) return false;
      if (filterTracabilite === "serie" && !a.gere_serie) return false;
      return true;
    });
  }, [items, search, filterFamille, filterDm, filterTracabilite]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Articles" sub={`Référentiel catalogue · ${items.length} article${items.length > 1 ? "s" : ""}`} />

        {/* Filtres */}
        <Panel style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="Rechercher (libellé, réf, code-barres, LPP)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 220px", padding: "7px 10px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 13 }}
            />
            <select value={filterFamille} onChange={(e) => setFilterFamille(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
              <option value="">Toutes familles</option>
              {FAMILLES.map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={filterTracabilite} onChange={(e) => setFilterTracabilite(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
              <option value="">Toute tracabilité</option>
              <option value="lot">Géré par lot</option>
              <option value="serie">Géré par série</option>
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={filterDm} onChange={(e) => setFilterDm(e.target.checked)} />
              DM uniquement
            </label>
            <button onClick={newArticle} style={{
              background: "linear-gradient(135deg, #185FA5, #134e87)",
              color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <i className="ti ti-plus" /> Nouvel article
            </button>
            <button onClick={() => router.push("/scan/article")} title="Scanner un code-barres pour une entrée stock" style={{
              background: "linear-gradient(135deg, #7CC8C8, #5da8a8)",
              color: "#fff", border: "none", padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <i className="ti ti-scan" /> Scan
            </button>
            <button onClick={() => router.push("/articles/etiquettes")} title="Imprimer des étiquettes prix" style={{
              background: "linear-gradient(135deg, #EF9F27, #d28818)",
              color: "#fff", border: "none", padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <i className="ti ti-printer" /> Étiquettes
            </button>
          </div>
        </Panel>

        {/* Liste */}
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 12 }}><SkeletonRow count={6} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration="package"
              variant="teal"
              title={items.length === 0 ? "Aucun article" : "Aucun article ne correspond aux filtres"}
              message={items.length === 0 ? "Crée ton premier article pour démarrer ton catalogue." : "Essaie d'ajuster les filtres."}
              actionLabel={items.length === 0 ? "Créer le premier article" : null}
              onAction={items.length === 0 ? newArticle : null}
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, #f5f8fc, #fff)", borderBottom: "2px solid #e3e9ee" }}>
                  <th style={{ padding: "10px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Réf.</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Libellé</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Famille</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Code-barres</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Cond.</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>PA HT</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>PV HT</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>TVA</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Marge</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }} title="Tracabilité">🔍</th>
                  <th style={{ padding: "10px 8px", textAlign: "center", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }} title="Matériels rattachés">📦</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", color: "#5a6878", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const matCount = materielsByArticle[a.id] || 0;
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f0f3f6", transition: "background 100ms" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fafbfc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding: "8px", fontFamily: "Consolas, monospace", fontSize: 11.5, color: "#185FA5" }}>{a.reference || "—"}</td>
                      <td style={{ padding: "8px" }}>
                        <a onClick={() => router.push(`/article/${a.id}`)} style={{ cursor: "pointer", color: "#142131", fontWeight: 600, textDecoration: "none" }} title="Ouvrir la fiche détaillée">{a.libelle}</a>
                        {a.dispositif_medical && <span style={{ marginLeft: 5, fontSize: 9, background: "#fde4e1", color: "#c0392b", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>DM{a.classe_dm ? ` ${a.classe_dm}` : ""}</span>}
                        {a.sterile && <span style={{ marginLeft: 4, fontSize: 9, background: "#dbe7f5", color: "#185FA5", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }} title="Stérile">✦</span>}
                        {a.usage_unique && <span style={{ marginLeft: 4, fontSize: 9, background: "#fff8ec", color: "#7a4f15", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }} title="Usage unique">UU</span>}
                      </td>
                      <td style={{ padding: "8px", color: "#5a6878" }}>{a.famille || "—"}</td>
                      <td style={{ padding: "8px", fontFamily: "Consolas, monospace", fontSize: 11 }}>
                        {a.code_barre ? (
                          <span title={`Type : ${a.code_barre_type || "?"}`}>{a.code_barre}</span>
                        ) : <span style={{ color: "#cfd8e0" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px", color: "#5a6878", fontSize: 11.5 }}>
                        {a.conditionnement_libelle || (a.conditionnement && a.conditionnement > 1 ? `${a.conditionnement} ${a.unite}` : a.unite)}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#5a6878", fontFamily: "Consolas, monospace" }}>{a.prix_achat_ht ? fmtEur(a.prix_achat_ht) : "—"}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#142131", fontWeight: 600, fontFamily: "Consolas, monospace" }}>{a.prix_vente_ht ? fmtEur(a.prix_vente_ht) : "—"}</td>
                      <td style={{ padding: "8px", textAlign: "center", fontSize: 11, color: "#7a6fb0", fontWeight: 600 }}>{a.tva_pct ? `${a.tva_pct}%` : "—"}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontFamily: "Consolas, monospace", color: a.marge_pct >= 30 ? "#5aa05a" : a.marge_pct >= 10 ? "#EF9F27" : "#e35d5b", fontWeight: 600 }}>
                        {a.marge_pct ? `${a.marge_pct}%` : "—"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        {a.gere_lot && <span title="Lot tracé" style={{ marginRight: 2, fontSize: 12 }}>🏷</span>}
                        {a.gere_serie && <span title="Série tracée" style={{ marginRight: 2, fontSize: 12 }}>🔢</span>}
                        {a.gere_peremption && <span title="Péremption tracée" style={{ fontSize: 12 }}>⏱</span>}
                      </td>
                      {/* 0.58.67 : count matériels rattachés + hover overlay */}
                      <td style={{ padding: "8px", textAlign: "center", position: "relative" }}>
                        {matCount > 0 ? (
                          <span
                            onMouseEnter={() => { setHoveredArticle(a.id); loadMaterielsForArticle(a.id); }}
                            onMouseLeave={() => { setHoveredArticle(null); setHoveredMateriels([]); }}
                            style={{
                              cursor: "help",
                              background: "linear-gradient(135deg, #7CC8C8, #5da8a8)",
                              color: "#fff", padding: "2px 8px", borderRadius: 10,
                              fontSize: 11, fontWeight: 700,
                              display: "inline-flex", alignItems: "center", gap: 3,
                            }}
                          >
                            <i className="ti ti-package" /> {matCount}
                          </span>
                        ) : <span style={{ color: "#cfd8e0" }}>—</span>}
                        {hoveredArticle === a.id && hoveredMateriels.length > 0 && (
                          <div style={{
                            position: "absolute",
                            top: "100%", right: 0,
                            background: "#142131",
                            color: "#fff",
                            padding: "10px 12px",
                            borderRadius: 8,
                            minWidth: 280,
                            zIndex: 100,
                            boxShadow: "0 10px 30px rgba(0,0,0,.30)",
                            fontSize: 11.5,
                            textAlign: "left",
                            marginTop: 4,
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                              <i className="ti ti-package" /> Matériels rattachés ({matCount})
                            </div>
                            {hoveredMateriels.map(m => (
                              <div key={m.id} style={{ padding: "4px 0", borderBottom: "1px solid #2a3850", display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <span>{m.libelle || "Sans libellé"}</span>
                                <span style={{ color: "#7CC8C8", fontFamily: "Consolas, monospace", fontSize: 10.5 }}>
                                  {m.num_serie ? `S/N ${m.num_serie}` : m.num_lot ? `Lot ${m.num_lot}` : ""}
                                </span>
                              </div>
                            ))}
                            {matCount > hoveredMateriels.length && (
                              <div style={{ marginTop: 6, fontSize: 10, color: "#7CC8C8", textAlign: "center" }}>
                                + {matCount - hoveredMateriels.length} autre{matCount - hoveredMateriels.length > 1 ? "s" : ""}…
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right" }}>
                        <IconButton icon="ti-pencil" color="#185FA5" ariaLabel="Éditer" onClick={() => editArticle(a)} />
                        <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => deleteArticle(a.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </Panel>

        {/* Modal d'édition */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal?.id ? `Éditer ${modal.libelle}` : "Nouvel article"}
            footer={<>
              <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
              <Btn variant="primary" onClick={saveArticle} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Btn>
            </>}
          >
            {err && <div className="err">{err}</div>}

            {/* Onglets */}
            <div style={{ display: "flex", borderBottom: "2px solid #e3e9ee", marginBottom: 16, overflowX: "auto" }}>
              {[
                { key: "general", lbl: "Général", icon: "ti-info-circle" },
                { key: "barcode", lbl: "Codes-barres", icon: "ti-barcode" },
                { key: "logistique", lbl: "Logistique", icon: "ti-package" },
                { key: "tarifs", lbl: "Tarifs & TVA", icon: "ti-coin-euro" },
                { key: "tracabilite", lbl: "Tracabilité", icon: "ti-search" },
                { key: "rattachement", lbl: "Rattachements", icon: "ti-link" },
                { key: "compta", lbl: "Compta", icon: "ti-calculator" },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: activeTab === tab.key ? "linear-gradient(135deg, rgba(124,200,200,.20), transparent)" : "transparent",
                    color: activeTab === tab.key ? "#185FA5" : "#5a6878",
                    border: "none", borderBottom: `3px solid ${activeTab === tab.key ? "#185FA5" : "transparent"}`,
                    padding: "8px 14px", fontSize: 12.5, fontWeight: activeTab === tab.key ? 700 : 500,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <i className={`ti ${tab.icon}`} /> {tab.lbl}
                </button>
              ))}
            </div>

            {/* Tab : Général */}
            {activeTab === "general" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                  <div className="fld"><label>Référence</label>
                    <input value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="REF-001" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                  <div className="fld"><label>Libellé *</label>
                    <input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Nom de l'article" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Famille</label>
                    <select value={form.famille || ""} onChange={(e) => setForm({ ...form, famille: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {FAMILLES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="fld"><label>Classe DM</label>
                    <select value={form.classe_dm || ""} onChange={(e) => setForm({ ...form, classe_dm: e.target.value, dispositif_medical: !!e.target.value })}>
                      <option value="">— Non DM —</option>
                      {CLASSES_DM.filter(Boolean).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fld"><label>Description</label>
                  <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description visible par le client" />
                </div>
                <div className="fld"><label>Notes internes</label>
                  <textarea value={form.notes_internes || ""} onChange={(e) => setForm({ ...form, notes_internes: e.target.value })} rows={2} placeholder="Notes internes (non visibles client)" />
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} /> Actif
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form.dispositif_medical} onChange={(e) => setForm({ ...form, dispositif_medical: e.target.checked })} /> Dispositif médical
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form.sterile} onChange={(e) => setForm({ ...form, sterile: e.target.checked })} /> Stérile
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form.usage_unique} onChange={(e) => setForm({ ...form, usage_unique: e.target.checked })} /> Usage unique
                  </label>
                </div>
              </>
            )}

            {/* Tab : Codes-barres */}
            {activeTab === "barcode" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Code-barres principal</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={form.code_barre || ""} onChange={(e) => setForm({ ...form, code_barre: e.target.value, code_barre_type: detectBarcodeType(e.target.value) })} placeholder="EAN13 / GS1-128 / CODE128" style={{ fontFamily: "Consolas, monospace", flex: 1 }} />
                      <button onClick={genBarcode} type="button" title="Générer un EAN13 (préfixe interne 200)" style={{
                        background: "linear-gradient(135deg, #185FA5, #134e87)", color: "#fff", border: "none",
                        padding: "0 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <i className="ti ti-sparkles" /> Générer
                      </button>
                    </div>
                  </div>
                  <div className="fld"><label>Type</label>
                    <select value={form.code_barre_type || ""} onChange={(e) => setForm({ ...form, code_barre_type: e.target.value })}>
                      <option value="">— Auto-détection —</option>
                      {TYPES_BARCODE.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {/* Aperçu SVG */}
                {form.code_barre && form.code_barre_type === "EAN13" && isValidEan13(form.code_barre) && (
                  <div style={{ padding: 8, background: "#fff", border: "1px solid #e3e9ee", borderRadius: 8, marginTop: 4, marginBottom: 12 }}
                       dangerouslySetInnerHTML={{ __html: generateEan13Svg(form.code_barre) }} />
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Code LPP / LPPR</label>
                    <input value={form.code_lpp || ""} onChange={(e) => setForm({ ...form, code_lpp: e.target.value })} placeholder="1234567" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                  <div className="fld"><label>Code ACL (pharmacie)</label>
                    <input value={form.code_acl || ""} onChange={(e) => setForm({ ...form, code_acl: e.target.value })} placeholder="ACL" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                  <div className="fld"><label>Code UCD (hôpital)</label>
                    <input value={form.code_ucd || ""} onChange={(e) => setForm({ ...form, code_ucd: e.target.value })} placeholder="UCD" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                </div>
              </>
            )}

            {/* Tab : Logistique */}
            {activeTab === "logistique" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 }}>
                  <div className="fld"><label>Unité</label>
                    <select value={form.unite || "unité"} onChange={(e) => setForm({ ...form, unite: e.target.value })}>
                      {UNITES.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="fld"><label>Conditionnement</label>
                    <input type="number" value={form.conditionnement || ""} onChange={(e) => setForm({ ...form, conditionnement: e.target.value })} placeholder="12" min="1" />
                  </div>
                  <div className="fld"><label>Libellé conditionnement</label>
                    <input value={form.conditionnement_libelle || ""} onChange={(e) => setForm({ ...form, conditionnement_libelle: e.target.value })} placeholder="Ex : Boîte de 12 sachets" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Poids (g)</label>
                    <input type="number" step="0.01" value={form.poids_g || ""} onChange={(e) => setForm({ ...form, poids_g: e.target.value })} />
                  </div>
                  <div className="fld"><label>Volume (ml)</label>
                    <input type="number" step="0.01" value={form.volume_ml || ""} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} />
                  </div>
                  <div className="fld"><label>L (cm)</label>
                    <input type="number" step="0.1" value={form.longueur_cm || ""} onChange={(e) => setForm({ ...form, longueur_cm: e.target.value })} />
                  </div>
                  <div className="fld"><label>l (cm)</label>
                    <input type="number" step="0.1" value={form.largeur_cm || ""} onChange={(e) => setForm({ ...form, largeur_cm: e.target.value })} />
                  </div>
                  <div className="fld"><label>H (cm)</label>
                    <input type="number" step="0.1" value={form.hauteur_cm || ""} onChange={(e) => setForm({ ...form, hauteur_cm: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Qté/Carton</label>
                    <input type="number" value={form.quantite_carton || ""} onChange={(e) => setForm({ ...form, quantite_carton: e.target.value })} />
                  </div>
                  <div className="fld"><label>Qté/Palette</label>
                    <input type="number" value={form.quantite_palette || ""} onChange={(e) => setForm({ ...form, quantite_palette: e.target.value })} />
                  </div>
                  <div className="fld"><label>Stock min</label>
                    <input type="number" value={form.stock_min || ""} onChange={(e) => setForm({ ...form, stock_min: e.target.value })} placeholder="0" />
                  </div>
                  <div className="fld"><label>Stock max</label>
                    <input type="number" value={form.stock_max || ""} onChange={(e) => setForm({ ...form, stock_max: e.target.value })} />
                  </div>
                </div>
                <div className="fld" style={{ maxWidth: 200 }}>
                  <label>Délai d'appro (jours)</label>
                  <input type="number" value={form.delai_appro_jours || ""} onChange={(e) => setForm({ ...form, delai_appro_jours: e.target.value })} placeholder="7" />
                </div>
              </>
            )}

            {/* Tab : Tarifs & TVA */}
            {activeTab === "tarifs" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Prix d'achat HT</label>
                    <input type="number" step="0.0001" value={form.prix_achat_ht || ""} onChange={(e) => setForm({ ...form, prix_achat_ht: e.target.value })} placeholder="0.00" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                  <div className="fld"><label>Prix de vente HT</label>
                    <input type="number" step="0.0001" value={form.prix_vente_ht || ""} onChange={(e) => setForm({ ...form, prix_vente_ht: e.target.value })} placeholder="0.00" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                  <div className="fld"><label>Devise</label>
                    <select value={form.devise || "EUR"} onChange={(e) => setForm({ ...form, devise: e.target.value })}>
                      <option value="EUR">EUR €</option>
                      <option value="USD">USD $</option>
                      <option value="CHF">CHF</option>
                      <option value="GBP">GBP £</option>
                    </select>
                  </div>
                </div>
                <div className="fld"><label>TVA</label>
                  <select value={form.tva_taux_id || ""} onChange={(e) => {
                    const t = tvaTaux.find(x => x.id === e.target.value);
                    setForm({ ...form, tva_taux_id: e.target.value || null, tva_pct: t?.taux || form.tva_pct });
                  }}>
                    <option value="">— Aucune (saisie manuelle) —</option>
                    {tvaTaux.map(t => (
                      <option key={t.id} value={t.id}>{t.libelle} ({t.taux}%)</option>
                    ))}
                  </select>
                  {tvaTaux.length === 0 && (
                    <small style={{ color: "#8a98a8", fontSize: 11 }}>
                      <i className="ti ti-info-circle" /> Aucun taux configuré. Ajoute-en dans <b>Paramètres &gt; Comptabilité &gt; TVA</b>.
                    </small>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Taux TVA manuel (%)</label>
                    <input type="number" step="0.01" value={form.tva_pct || ""} onChange={(e) => setForm({ ...form, tva_pct: e.target.value })} placeholder="20.00" />
                  </div>
                  {form.prix_vente_ht && form.tva_pct && (
                    <div className="fld">
                      <label>Prix vente TTC (calculé)</label>
                      <div style={{ padding: "9px 10px", background: "linear-gradient(135deg, rgba(124,200,200,.15), #fff)", border: "1px solid #7CC8C8", borderRadius: 6, fontSize: 14, fontWeight: 700, color: "#185FA5", fontFamily: "Consolas, monospace" }}>
                        {fmtEur(computeTtc(form.prix_vente_ht, form.tva_pct))}
                      </div>
                    </div>
                  )}
                </div>
                {form.prix_achat_ht && form.prix_vente_ht && (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "linear-gradient(135deg, rgba(122,111,176,.10), #fff)", border: "1px solid #7a6fb0", borderRadius: 8 }}>
                    <span style={{ color: "#7a6fb0", fontWeight: 700, fontSize: 12 }}>
                      <i className="ti ti-trending-up" /> Marge calculée :
                    </span>
                    <b style={{ marginLeft: 8, fontSize: 14, color: recomputeMarge(form.prix_achat_ht, form.prix_vente_ht) >= 30 ? "#5aa05a" : recomputeMarge(form.prix_achat_ht, form.prix_vente_ht) >= 10 ? "#EF9F27" : "#e35d5b" }}>
                      {recomputeMarge(form.prix_achat_ht, form.prix_vente_ht)}%
                    </b>
                    <span style={{ marginLeft: 12, color: "#5a6878", fontSize: 11.5 }}>
                      (gain unitaire : {fmtEur(parseFloat(form.prix_vente_ht) - parseFloat(form.prix_achat_ht))})
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Tab : Tracabilité */}
            {activeTab === "tracabilite" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: form.gere_lot ? "rgba(124,200,200,.10)" : "#fafbfc", border: `1px solid ${form.gere_lot ? "#7CC8C8" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form.gere_lot} onChange={(e) => setForm({ ...form, gere_lot: e.target.checked })} />
                    <div>
                      <b style={{ fontSize: 13 }}>🏷 Géré par lot</b>
                      <div style={{ fontSize: 11, color: "#5a6878" }}>Saisie obligatoire du numéro de lot à chaque mouvement (entrée/sortie/distribution)</div>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: form.gere_serie ? "rgba(122,111,176,.10)" : "#fafbfc", border: `1px solid ${form.gere_serie ? "#7a6fb0" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form.gere_serie} onChange={(e) => setForm({ ...form, gere_serie: e.target.checked })} />
                    <div>
                      <b style={{ fontSize: 13 }}>🔢 Géré par numéro de série</b>
                      <div style={{ fontSize: 11, color: "#5a6878" }}>Chaque exemplaire a un n° de série unique (recommandé pour le matériel médical)</div>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: form.gere_peremption ? "rgba(239,159,39,.10)" : "#fafbfc", border: `1px solid ${form.gere_peremption ? "#EF9F27" : "#e3e9ee"}`, borderRadius: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!form.gere_peremption} onChange={(e) => setForm({ ...form, gere_peremption: e.target.checked })} />
                    <div>
                      <b style={{ fontSize: 13 }}>⏱ Géré par date de péremption</b>
                      <div style={{ fontSize: 11, color: "#5a6878" }}>Saisie de la date limite de consommation à chaque entrée</div>
                    </div>
                  </label>
                </div>
                {form.gere_peremption && (
                  <div className="fld" style={{ marginTop: 10, maxWidth: 200 }}>
                    <label>Durée de vie standard (jours)</label>
                    <input type="number" value={form.duree_vie_jours || ""} onChange={(e) => setForm({ ...form, duree_vie_jours: e.target.value })} placeholder="730" />
                  </div>
                )}
              </>
            )}

            {/* Tab : Rattachements */}
            {activeTab === "rattachement" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Marque</label>
                    <input value={form.marque || ""} onChange={(e) => setForm({ ...form, marque: e.target.value })} />
                  </div>
                  <div className="fld"><label>Modèle</label>
                    <input value={form.modele || ""} onChange={(e) => setForm({ ...form, modele: e.target.value })} />
                  </div>
                  <div className="fld"><label>Fabricant</label>
                    <input value={form.fabricant || ""} onChange={(e) => setForm({ ...form, fabricant: e.target.value })} />
                  </div>
                </div>
                <div className="fld"><label><i className="ti ti-building" /> Établissement partenaire</label>
                  <select value={form.etablissement_partenaire_id || ""} onChange={(e) => setForm({ ...form, etablissement_partenaire_id: e.target.value || null })}>
                    <option value="">— Aucun —</option>
                    {partenaires.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div className="fld"><label><i className="ti ti-prescription" style={{ color: "#7a6fb0" }} /> Pharmacie de référence</label>
                  <select value={form.pharmacie_id || ""} onChange={(e) => setForm({ ...form, pharmacie_id: e.target.value || null })}>
                    <option value="">— Aucune —</option>
                    {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                {modal?.id && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "linear-gradient(135deg, rgba(124,200,200,.10), #fff)", border: "1px solid #7CC8C8", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: "#185FA5", fontWeight: 700 }}>
                      <i className="ti ti-package" /> Matériels rattachés :
                    </span>
                    <b style={{ marginLeft: 8, fontSize: 14, color: "#185FA5" }}>
                      {materielsByArticle[modal.id] || 0}
                    </b>
                    {materielsByArticle[modal.id] > 0 && (
                      <a href={`/materiels?article_id=${modal.id}`} style={{ marginLeft: 12, fontSize: 11.5, color: "#185FA5" }}>
                        Voir la liste →
                      </a>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tab : Compta */}
            {activeTab === "compta" && (
              <>
                <p style={{ fontSize: 12, color: "#5a6878", margin: "0 0 10px" }}>
                  <i className="ti ti-info-circle" /> Override les comptes comptables hérités de la TVA. Vide = on utilise les comptes du taux TVA sélectionné.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="fld"><label>Compte vente (override)</label>
                    <input value={form.compte_vente_override || ""} onChange={(e) => setForm({ ...form, compte_vente_override: e.target.value })} placeholder="707100" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                  <div className="fld"><label>Compte achat (override)</label>
                    <input value={form.compte_achat_override || ""} onChange={(e) => setForm({ ...form, compte_achat_override: e.target.value })} placeholder="607100" style={{ fontFamily: "Consolas, monospace" }} />
                  </div>
                </div>
                <div className="fld" style={{ maxWidth: 240 }}>
                  <label>Code analytique (override)</label>
                  <input value={form.code_analytique_override || ""} onChange={(e) => setForm({ ...form, code_analytique_override: e.target.value })} placeholder="PSAD" style={{ fontFamily: "Consolas, monospace" }} />
                </div>
                {form.tva_taux_id && (() => {
                  const t = tvaTaux.find(x => x.id === form.tva_taux_id);
                  if (!t) return null;
                  return (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: "#fafbfc", border: "1px solid #e3e9ee", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        <i className="ti ti-percentage" /> Hérité du taux TVA "{t.libelle}"
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5, fontFamily: "Consolas, monospace" }}>
                        <div>Compte vente : <b>{t.compte_vente || "—"}</b></div>
                        <div>Compte achat : <b>{t.compte_achat || "—"}</b></div>
                        <div>TVA collectée : <b>{t.compte_tva_collectee || "—"}</b></div>
                        <div>TVA déductible : <b>{t.compte_tva_deductible || "—"}</b></div>
                        <div>Code analytique : <b>{t.code_analytique || "—"}</b></div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}
