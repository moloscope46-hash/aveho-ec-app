"use client";
// =============================================================
//  DepotArticlesModal — Popup articles disponibles d'un dépôt (0.58.87)
//  - Liste articles + matériels associés + état
//  - Recherche texte + recherche vocale (Web Speech API)
//  - Bouton "Ajouter au panier" sur chaque ligne
// =============================================================
import { useEffect, useState, useRef } from "react";
import { createClient } from "../../lib/supabase";

const CART_KEY = "aveho_ec_cart";

const ETAT_COLORS = {
  "Disponible": "#5aa05a",
  "En location": "#185FA5",
  "Affecté": "#185FA5",
  "Maintenance": "#EF9F27",
  "En désinfection": "#7CC8C8",
  "Retour fournisseur": "#7a6fb0",
  "Rebut": "#e35d5b",
};

export default function DepotArticlesModal({ depot, onClose }) {
  const supabase = createClient();
  const [articles, setArticles] = useState([]); // [{ id, libelle, code, photo_url, prix_vente_ht, materiels: [...] }]
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Init Web Speech API
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceSupported(false); return; }
    setVoiceSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSearch(transcript);
      setVoiceListening(false);
    };
    recognition.onerror = () => setVoiceListening(false);
    recognition.onend = () => setVoiceListening(false);
    recognitionRef.current = recognition;
    return () => {
      try { recognition.abort(); } catch {}
    };
  }, []);

  // Chargement articles + matériels du dépôt
  useEffect(() => {
    if (!depot?.id) return;
    let mounted = true;
    (async () => {
      try {
        // 1) Matériels présents dans le dépôt
        const { data: mats } = await supabase
          .from("materiels")
          .select("id, libelle, num_serie, num_parc, num_lot, etat, article_id, patient_id")
          .eq("depot_id", depot.id)
          .limit(500);

        const materielsList = mats || [];
        const articleIds = [...new Set(materielsList.map(m => m.article_id).filter(Boolean))];

        // 2) Articles correspondants
        let articlesList = [];
        if (articleIds.length > 0) {
          const { data: arts } = await supabase
            .from("articles")
            .select("id, libelle, code, photo_url, prix_vente_ht, type_article, stock_min, stock_max")
            .in("id", articleIds);
          articlesList = arts || [];
        }

        if (!mounted) return;

        // 3) Regrouper matériels par article
        const grouped = articlesList.map(a => ({
          ...a,
          materiels: materielsList.filter(m => m.article_id === a.id),
        }));

        // 4) Trier : disponibles d'abord, puis par libellé
        grouped.sort((a, b) => {
          const aDispo = a.materiels.filter(m => m.etat === "Disponible").length;
          const bDispo = b.materiels.filter(m => m.etat === "Disponible").length;
          if (aDispo !== bDispo) return bDispo - aDispo;
          return (a.libelle || "").localeCompare(b.libelle || "");
        });

        setArticles(grouped);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [depot?.id]);

  function startVoice() {
    if (!recognitionRef.current) return;
    try {
      setVoiceListening(true);
      recognitionRef.current.start();
    } catch (e) { setVoiceListening(false); }
  }

  function stopVoice() {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch {}
    setVoiceListening(false);
  }

  function addToCart(article) {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const items = raw ? JSON.parse(raw) : [];
      const existing = items.find(i => i.id === article.id);
      if (existing) {
        existing.qte = (existing.qte || 1) + 1;
      } else {
        items.push({
          id: article.id,
          libelle: article.libelle,
          code: article.code,
          photo_url: article.photo_url,
          prix_vente_ht: article.prix_vente_ht,
          qte: 1,
          depot_id: depot.id,
          depot_nom: depot.nom,
        });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("av-cart-change"));
      // Feedback visuel
      if (typeof window !== "undefined" && window.av_toast) {
        window.av_toast(`Ajouté : ${article.libelle}`);
      }
    } catch (e) { alert("Erreur ajout panier"); }
  }

  const searchLow = search.trim().toLowerCase();
  const filtered = searchLow
    ? articles.filter(a => {
        const matchArt = (a.libelle || "").toLowerCase().includes(searchLow) ||
                          (a.code || "").toLowerCase().includes(searchLow);
        const matchMat = a.materiels.some(m =>
          (m.libelle || "").toLowerCase().includes(searchLow) ||
          (m.num_serie || "").toLowerCase().includes(searchLow) ||
          (m.num_parc || "").toLowerCase().includes(searchLow) ||
          (m.num_lot || "").toLowerCase().includes(searchLow)
        );
        return matchArt || matchMat;
      })
    : articles;

  const totalDispo = articles.reduce((s, a) => s + a.materiels.filter(m => m.etat === "Disponible").length, 0);
  const totalMats = articles.reduce((s, a) => s + a.materiels.length, 0);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,10,20,.62)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "Quicksand, sans-serif",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", color: "#142131",
        borderRadius: 18, maxWidth: 800, width: "100%",
        maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,.5)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px",
          background: `linear-gradient(135deg, ${depot.couleur || "#7CC8C8"}22, ${depot.couleur || "#7CC8C8"}08)`,
          borderBottom: `1px solid ${depot.couleur || "#7CC8C8"}33`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 46, height: 46, background: `${depot.couleur || "#7CC8C8"}22`,
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${depot.couleur || "#7CC8C8"}44`,
          }}>
            <i className={`ti ${depot.icone || "ti-building-warehouse"}`} style={{ color: depot.couleur || "#7CC8C8", fontSize: 24 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
              <i className="ti ti-package" /> Articles du dépôt
            </div>
            <h2 style={{ margin: "2px 0 0", fontSize: 18 }}>{depot.nom}</h2>
            <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 2 }}>
              {totalMats} matériels · <span style={{ color: "#5aa05a", fontWeight: 600 }}>{totalDispo} disponibles</span> · {articles.length} références
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{
            background: "rgba(20,33,49,.08)", color: "#142131",
            border: "1px solid #cfd8e0", width: 36, height: 36,
            borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Search bar */}
        <div style={{
          padding: "14px 20px",
          borderBottom: "1px solid #e3e9ee",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <div style={{ position: "relative", flex: 1 }}>
            <i className="ti ti-search" style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#8a98a8", fontSize: 16,
            }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article, n° série, n° parc..."
              style={{
                width: "100%", padding: "10px 12px 10px 36px",
                background: "#fafbfc", border: "1px solid #cfd8e0",
                borderRadius: 10, fontSize: 13.5, fontFamily: "inherit",
                color: "#142131",
              }}
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Effacer" style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer", color: "#8a98a8", padding: 4,
              }}>
                <i className="ti ti-x" style={{ fontSize: 14 }} />
              </button>
            )}
          </div>
          {voiceSupported && (
            <button
              onClick={voiceListening ? stopVoice : startVoice}
              aria-label="Recherche vocale"
              title={voiceListening ? "Écoute en cours... clique pour arrêter" : "Recherche vocale"}
              style={{
                width: 42, height: 42, borderRadius: 10,
                background: voiceListening ? "linear-gradient(135deg, #e35d5b, #c0494a)" : "linear-gradient(135deg, #7CC8C8, #5db5b5)",
                color: voiceListening ? "#fff" : "#142131",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, transition: "all .2s",
                animation: voiceListening ? "av-mic-pulse 1s ease-in-out infinite" : "none",
                boxShadow: voiceListening ? "0 0 0 6px rgba(227,93,91,.18)" : "0 4px 12px rgba(124,200,200,.30)",
              }}
            >
              <i className={`ti ${voiceListening ? "ti-microphone-off" : "ti-microphone"}`} />
            </button>
          )}
          <style jsx global>{`
            @keyframes av-mic-pulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 0 6px rgba(227,93,91,.18); }
              50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(227,93,91,.10); }
            }
          `}</style>
        </div>

        {voiceListening && (
          <div style={{ padding: "8px 20px", background: "rgba(227,93,91,.06)", color: "#e35d5b", fontSize: 12, textAlign: "center", fontWeight: 600 }}>
            <i className="ti ti-microphone" /> Parle maintenant... (français)
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 20px" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>
              <i className="ti ti-package-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "#142131" }}>
                {search ? `Aucun résultat pour "${search}"` : "Aucun article dans ce dépôt"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(a => {
                const nbDispo = a.materiels.filter(m => m.etat === "Disponible").length;
                const nbTotal = a.materiels.length;
                return (
                  <div key={a.id} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `3px solid ${nbDispo > 0 ? "#5aa05a" : "#e3e9ee"}`,
                    borderRadius: 10, padding: "12px 14px",
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {/* Photo / icon */}
                      <div style={{
                        width: 52, height: 52, flexShrink: 0,
                        background: "#f7fafa", border: "1px solid #e3e9ee", borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {a.photo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={a.photo_url} alt={a.libelle} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
                        ) : (
                          <i className="ti ti-package" style={{ color: "#7CC8C8", fontSize: 24 }} />
                        )}
                      </div>
                      {/* Infos */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{a.libelle || "Article"}</div>
                          {a.code && <span style={{ fontFamily: "Consolas, monospace", fontSize: 10.5, color: "#8a98a8" }}>{a.code}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span><b style={{ color: nbDispo > 0 ? "#5aa05a" : "#e35d5b" }}>{nbDispo}</b> dispo sur <b>{nbTotal}</b></span>
                          {a.prix_vente_ht && <span style={{ color: "#5aa05a", fontWeight: 600 }}>{parseFloat(a.prix_vente_ht).toFixed(2)} € HT</span>}
                          {a.stock_min != null && nbTotal <= a.stock_min && (
                            <span style={{ color: "#e35d5b", fontWeight: 600 }}>⚠ Stock min atteint</span>
                          )}
                        </div>
                      </div>
                      {/* Action */}
                      <button onClick={() => addToCart(a)}
                        disabled={nbDispo === 0}
                        style={{
                          background: nbDispo > 0 ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "rgba(20,33,49,.06)",
                          color: nbDispo > 0 ? "#fff" : "#8a98a8",
                          border: "none", padding: "8px 14px", borderRadius: 8,
                          fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: nbDispo > 0 ? "pointer" : "not-allowed",
                          whiteSpace: "nowrap",
                          boxShadow: nbDispo > 0 ? "0 2px 6px rgba(90,160,90,.30)" : "none",
                        }}>
                        <i className="ti ti-shopping-cart-plus" /> Ajouter
                      </button>
                    </div>

                    {/* Matériels associés */}
                    {a.materiels.length > 0 && (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{
                          cursor: "pointer", color: "#185FA5", fontSize: 11.5, fontWeight: 600,
                          padding: "5px 8px", background: "rgba(24,95,165,.06)", borderRadius: 6,
                          listStyle: "none", userSelect: "none",
                        }}>
                          <i className="ti ti-chevron-right" /> Voir les {a.materiels.length} matériel{a.materiels.length > 1 ? "s" : ""} associé{a.materiels.length > 1 ? "s" : ""}
                        </summary>
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                          {a.materiels.map(m => {
                            const col = ETAT_COLORS[m.etat] || "#8a98a8";
                            return (
                              <div key={m.id} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "5px 8px", fontSize: 11.5,
                                background: "#fafbfc", borderRadius: 6,
                                borderLeft: `3px solid ${col}`,
                              }}>
                                {m.num_serie && <span style={{ fontFamily: "Consolas, monospace", color: "#5a6878" }}>SN:{m.num_serie}</span>}
                                {m.num_parc && <span style={{ fontFamily: "Consolas, monospace", color: "#5a6878" }}>Parc:{m.num_parc}</span>}
                                {m.num_lot && <span style={{ fontFamily: "Consolas, monospace", color: "#5a6878" }}>Lot:{m.num_lot}</span>}
                                <span style={{ flex: 1 }} />
                                <span style={{
                                  background: `${col}22`, color: col,
                                  padding: "1px 6px", borderRadius: 4,
                                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                                }}>{m.etat || "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #e3e9ee",
          background: "#fafbfc",
          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#5a6878",
        }}>
          <span>{filtered.length} résultat{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</span>
          {!voiceSupported && <span style={{ fontStyle: "italic", color: "#8a98a8" }}>🎤 Recherche vocale non supportée par ce navigateur</span>}
          <button onClick={onClose} style={{
            background: "transparent", color: "#185FA5",
            border: "1px solid #cfd8e0", padding: "6px 14px", borderRadius: 8,
            fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
