"use client";
// =============================================================
//  /articles/etiquettes — Génération d'étiquettes prix PDF (0.58.69)
//
//  Sélection multi-articles + paramétrage format + génération
//  d'un PDF imprimable avec EAN13 + libellé + prix TTC sur
//  chaque étiquette. Format standard : 21 étiquettes par A4
//  (3 colonnes × 7 lignes, format L7160 Avery 63.5×38.1mm).
//
//  Pas de lib PDF lourde — on génère du HTML imprimable
//  (window.print) qui rend exactement la même chose qu'un PDF
//  via le moteur du navigateur. Plus simple et plus léger.
// =============================================================

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { EmptyState, SkeletonRow, toast } from "../../components/ui-premium";
import { fmtEur } from "../../../lib/format";
import { generateEan13Svg, isValidEan13 } from "../../../lib/barcode";

const FORMATS = {
  "L7160": { name: "L7160 (Avery 63,5×38,1 mm — 21/page)", cols: 3, rows: 7, w: 63.5, h: 38.1, gap_x: 2.5, gap_y: 0, margin_top: 15.1, margin_left: 7.21 },
  "L7163": { name: "L7163 (Avery 99,1×38,1 mm — 14/page)", cols: 2, rows: 7, w: 99.1, h: 38.1, gap_x: 2.5, gap_y: 0, margin_top: 15.1, margin_left: 4.55 },
  "L7165": { name: "L7165 (Avery 99,1×67,7 mm — 8/page)", cols: 2, rows: 4, w: 99.1, h: 67.7, gap_x: 2.5, gap_y: 0, margin_top: 12.7, margin_left: 4.55 },
  "GRAND": { name: "Grand format (105×74 mm — 8/page)", cols: 2, rows: 4, w: 105, h: 74, gap_x: 0, gap_y: 0, margin_top: 5, margin_left: 0 },
  "PETIT": { name: "Petit format (50×30 mm — 40/page)", cols: 4, rows: 10, w: 50, h: 30, gap_x: 0, gap_y: 0, margin_top: 5, margin_left: 5 },
};

export default function EtiquettesArticlesPage() {
  return (
    <Suspense fallback={null}>
      <EtiquettesArticlesInner />
    </Suspense>
  );
}

function EtiquettesArticlesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetIds = (searchParams?.get("ids") || "").split(",").filter(Boolean);
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [articles, setArticles] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set(presetIds));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFamille, setFilterFamille] = useState("");
  // Paramètres d'impression
  const [format, setFormat] = useState("L7160");
  const [showBarcode, setShowBarcode] = useState(true);
  const [showRef, setShowRef] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [priceMode, setPriceMode] = useState("ttc");  // "ttc" | "ht" | "both"
  const [copies, setCopies] = useState(1);
  const [structureNom, setStructureNom] = useState("");

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    try {
      const { data: arts } = await supabase
        .from("articles")
        .select("id, reference, libelle, famille, code_barre, code_barre_type, prix_vente_ht, prix_vente_ttc, tva_pct, unite, conditionnement_libelle, actif, archive")
        .eq("structure_id", auth.structureId)
        .eq("archive", false)
        .eq("actif", true)
        .order("libelle");
      setArticles(arts || []);
      // Nom structure pour entête étiquette
      try {
        const { data: s } = await supabase.from("structures").select("nom").eq("id", auth.structureId).maybeSingle();
        setStructureNom(s?.nom || "");
      } catch { /* silent */ }
    } catch (e) {
      console.error("[etiquettes] load:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId]);

  const famillesList = useMemo(() => {
    const s = new Set();
    articles.forEach(a => { if (a.famille) s.add(a.famille); });
    return Array.from(s).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${a.libelle || ""} ${a.reference || ""} ${a.code_barre || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterFamille && a.famille !== filterFamille) return false;
      return true;
    });
  }, [articles, search, filterFamille]);

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map(a => a.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  const selectedArticles = articles.filter(a => selectedIds.has(a.id));

  // Génère les étiquettes (copies par article) sous forme d'array plat
  const labels = useMemo(() => {
    const result = [];
    selectedArticles.forEach(a => {
      for (let i = 0; i < copies; i++) {
        result.push(a);
      }
    });
    return result;
  }, [selectedArticles, copies]);

  const fmt = FORMATS[format];
  const labelsPerPage = fmt.cols * fmt.rows;
  const totalPages = Math.ceil(labels.length / labelsPerPage);

  function ttcOf(a) {
    if (a.prix_vente_ttc) return parseFloat(a.prix_vente_ttc);
    if (a.prix_vente_ht && a.tva_pct) return Math.round(parseFloat(a.prix_vente_ht) * (1 + parseFloat(a.tva_pct) / 100) * 100) / 100;
    return null;
  }

  function handlePrint() {
    if (labels.length === 0) {
      toast.error("Sélectionne au moins un article");
      return;
    }
    window.print();
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <div className="no-print">
          <PageHead small title="Étiquettes prix" sub={`Génération PDF imprimable · ${selectedArticles.length} article${selectedArticles.length > 1 ? "s" : ""} sélectionné${selectedArticles.length > 1 ? "s" : ""} (${labels.length} étiquette${labels.length > 1 ? "s" : ""} au total, ${totalPages} page${totalPages > 1 ? "s" : ""})`} />

          {/* Paramètres */}
          <Panel style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>
              <i className="ti ti-settings" /> Paramètres d'impression
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 10, marginBottom: 10 }}>
              <div className="fld">
                <label>Format d'étiquette</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                  {Object.entries(FORMATS).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label>Prix à afficher</label>
                <select value={priceMode} onChange={(e) => setPriceMode(e.target.value)}>
                  <option value="ttc">TTC uniquement</option>
                  <option value="ht">HT uniquement</option>
                  <option value="both">HT + TTC</option>
                </select>
              </div>
              <div className="fld">
                <label>Copies / article</label>
                <input type="number" min="1" max="100" value={copies} onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))} style={{ fontFamily: "Consolas, monospace", fontSize: 16, fontWeight: 700 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                <input type="checkbox" checked={showRef} onChange={(e) => setShowRef(e.target.checked)} /> Afficher la référence
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} /> Afficher le code-barres EAN13
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, cursor: "pointer" }}>
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Afficher le prix
              </label>
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost" icon="ti-x" onClick={() => router.back()}>Annuler</Btn>
              <Btn variant="primary" icon="ti-printer" onClick={handlePrint} disabled={labels.length === 0}>
                Imprimer / PDF ({labels.length} étiq.)
              </Btn>
            </div>
          </Panel>

          {/* Sélection articles */}
          <Panel style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <input type="search" placeholder="Rechercher (libellé/réf)..." value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ flex: "1 1 200px", padding: "7px 10px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
              <select value={filterFamille} onChange={(e) => setFilterFamille(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
                <option value="">Toutes familles</option>
                {famillesList.map(f => <option key={f}>{f}</option>)}
              </select>
              <button onClick={selectAll} style={{ background: "transparent", border: "1px solid #185FA5", color: "#185FA5", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Tout sélectionner ({filtered.length})</button>
              <button onClick={selectNone} style={{ background: "transparent", border: "1px solid #cfd8e0", color: "#5a6878", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Tout désélectionner</button>
            </div>

            {loading ? (
              <SkeletonRow count={5} />
            ) : (
              <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #f0f3f6", borderRadius: 8 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#8a98a8", fontSize: 13 }}>Aucun article ne correspond</div>
                ) : (
                  filtered.map(a => {
                    const checked = selectedIds.has(a.id);
                    const ttc = ttcOf(a);
                    return (
                      <label key={a.id} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                        borderBottom: "1px solid #f0f3f6", cursor: "pointer",
                        background: checked ? "rgba(124,200,200,.08)" : "transparent",
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(a.id)} />
                        <div style={{ flex: 1, fontSize: 12.5 }}>
                          <b>{a.libelle}</b>
                          <div style={{ fontSize: 11, color: "#5a6878" }}>
                            {a.reference && <code style={{ background: "transparent", padding: 0, color: "#185FA5" }}>{a.reference}</code>}
                            {a.code_barre && <span> · <code style={{ background: "transparent", padding: 0 }}>{a.code_barre}</code></span>}
                            {a.famille && <span> · {a.famille}</span>}
                          </div>
                        </div>
                        {ttc && <div style={{ fontFamily: "Consolas, monospace", fontWeight: 700, color: "#185FA5", fontSize: 13 }}>{fmtEur(ttc)}</div>}
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* Aperçu impression */}
        <div className="print-area">
          {labels.length === 0 ? (
            <div className="no-print">
              <EmptyState
                illustration="package"
                title="Aucun article sélectionné"
                message="Coche les articles pour lesquels tu veux imprimer des étiquettes."
              />
            </div>
          ) : (
            <div className="labels-sheet">
              {Array.from({ length: totalPages }).map((_, pageIdx) => {
                const pageLabels = labels.slice(pageIdx * labelsPerPage, (pageIdx + 1) * labelsPerPage);
                return (
                  <div key={pageIdx} className="labels-page">
                    <div className="labels-grid" style={{
                      gridTemplateColumns: `repeat(${fmt.cols}, ${fmt.w}mm)`,
                      gap: `${fmt.gap_y}mm ${fmt.gap_x}mm`,
                      paddingTop: `${fmt.margin_top}mm`,
                      paddingLeft: `${fmt.margin_left}mm`,
                    }}>
                      {pageLabels.map((a, idx) => {
                        const ttc = ttcOf(a);
                        return (
                          <div key={`${a.id}-${pageIdx}-${idx}`} className="label-cell" style={{ width: `${fmt.w}mm`, height: `${fmt.h}mm` }}>
                            <div className="label-header">
                              {structureNom && <div className="label-struct">{structureNom}</div>}
                              {showRef && a.reference && <div className="label-ref">{a.reference}</div>}
                            </div>
                            <div className="label-libelle">{a.libelle}</div>
                            {showPrice && ttc && (
                              <div className="label-prix">
                                {(priceMode === "ttc" || priceMode === "both") && (
                                  <span className="prix-ttc">{fmtEur(ttc)}{priceMode === "both" && <small> TTC</small>}</span>
                                )}
                                {(priceMode === "ht" || priceMode === "both") && a.prix_vente_ht && (
                                  <span className="prix-ht">{fmtEur(a.prix_vente_ht)}{priceMode === "both" && <small> HT</small>}</span>
                                )}
                              </div>
                            )}
                            {showBarcode && a.code_barre && isValidEan13(a.code_barre) && (
                              <div className="label-barcode" dangerouslySetInnerHTML={{ __html: generateEan13Svg(a.code_barre) }} />
                            )}
                            {showBarcode && a.code_barre && !isValidEan13(a.code_barre) && (
                              <div className="label-barcode-text">{a.code_barre}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CSS impression — exactement la taille A4 avec marges précises */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; background: #fff !important; }
          .topbar, .no-print, .av-shortcuts-bar { display: none !important; }
          .bg-dark .wrap { background: transparent !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; max-width: none !important; }
          .labels-sheet { background: transparent !important; }
          .labels-page { background: #fff !important; box-shadow: none !important; page-break-after: always; }
        }
        .labels-sheet { display: flex; flex-direction: column; gap: 20px; padding: 12px 0; background: #f5f8fc; }
        .labels-page {
          width: 210mm; min-height: 297mm; background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,.10);
          margin: 0 auto; position: relative; box-sizing: border-box;
        }
        .labels-grid { display: grid; }
        .label-cell {
          box-sizing: border-box; padding: 3mm; overflow: hidden;
          display: flex; flex-direction: column; justify-content: space-between;
          border: 1px dashed rgba(0,0,0,.10);
        }
        @media print { .label-cell { border: none; } }
        .label-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; }
        .label-struct { font-size: 6pt; color: #5a6878; font-weight: 600; }
        .label-ref { font-size: 6.5pt; font-family: Consolas, monospace; color: #185FA5; font-weight: 700; }
        .label-libelle { font-size: 9pt; font-weight: 700; color: #142131; line-height: 1.1; margin: 1mm 0; word-break: break-word; }
        .label-prix { font-size: 14pt; font-weight: 800; color: #142131; font-family: Consolas, monospace; line-height: 1; display: flex; gap: 4mm; align-items: baseline; }
        .label-prix small { font-size: 7pt; font-weight: 600; color: #5a6878; }
        .prix-ht { font-size: 9pt; color: #5a6878; font-weight: 600; }
        .label-barcode svg { height: 12mm; width: auto; max-width: 100%; }
        .label-barcode-text { font-family: Consolas, monospace; font-size: 8pt; color: #142131; padding: 1mm 0; text-align: center; letter-spacing: 0.5px; }
      `}</style>
    </div>
  );
}
