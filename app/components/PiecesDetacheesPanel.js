"use client";
// =============================================================
//  components/PiecesDetacheesPanel.js (0.63.1)
//
//  Gère la liste des pièces détachées utilisées pour un bilan SAV.
//  Stocké en JSONB sur bilans_sav.pieces_detachees.
//  Recalcule cout_pieces_total automatiquement.
//
//  Structure d'une pièce :
//    { designation, ref, quantite, prix_unitaire, fournisseur, num_commande }
// =============================================================

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase";

export default function PiecesDetacheesPanel({
  bilanId,
  initialPieces = [],
  initialDureeMin = 0,
  initialCoutMo = 0,
  readOnly = false,
  onChange,
}) {
  const supabase = createClient();
  const [pieces, setPieces] = useState(initialPieces || []);
  const [duree, setDuree] = useState(initialDureeMin || 0);
  const [coutMo, setCoutMo] = useState(initialCoutMo || 0);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Form pour nouvelle pièce
  const [newPiece, setNewPiece] = useState({
    designation: "",
    ref: "",
    quantite: 1,
    prix_unitaire: 0,
    fournisseur: "",
    num_commande: "",
  });

  // Recalcul totaux
  const coutPiecesTotal = pieces.reduce((s, p) => s + ((p.quantite || 1) * (p.prix_unitaire || 0)), 0);
  const coutTotalHt = coutPiecesTotal + (coutMo || 0);

  async function save(updatedPieces = pieces, updatedDuree = duree, updatedCoutMo = coutMo) {
    if (!bilanId) return;
    setSaving(true);
    try {
      const newCoutPieces = updatedPieces.reduce((s, p) => s + ((p.quantite || 1) * (p.prix_unitaire || 0)), 0);
      const newTotal = newCoutPieces + (updatedCoutMo || 0);
      await supabase.from("bilans_sav").update({
        pieces_detachees: updatedPieces,
        cout_pieces_total: newCoutPieces,
        duree_intervention_min: updatedDuree,
        cout_main_doeuvre: updatedCoutMo,
        cout_total_ht: newTotal,
      }).eq("id", bilanId);
      onChange?.({ pieces: updatedPieces, coutPiecesTotal: newCoutPieces, coutTotalHt: newTotal });
    } catch (e) {
      console.warn("[PiecesDetachees] save error:", e);
    } finally { setSaving(false); }
  }

  function addPiece() {
    if (!newPiece.designation?.trim()) {
      alert("La désignation est requise");
      return;
    }
    const updated = [...pieces, { ...newPiece, id: crypto.randomUUID() }];
    setPieces(updated);
    setNewPiece({ designation: "", ref: "", quantite: 1, prix_unitaire: 0, fournisseur: "", num_commande: "" });
    setShowAdd(false);
    save(updated);
  }

  function removePiece(idx) {
    if (!confirm(`Retirer "${pieces[idx].designation}" ?`)) return;
    const updated = pieces.filter((_, i) => i !== idx);
    setPieces(updated);
    save(updated);
  }

  function updatePiece(idx, patch) {
    const updated = pieces.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setPieces(updated);
    // Save différé via blur
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <i className="ti ti-tool" style={{ color: "#EF9F27", fontSize: 18 }} />
        <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>Pièces détachées utilisées</h3>
        {saving && <span style={{ fontSize: 10, color: "#7CC8C8", marginLeft: "auto" }}><i className="ti ti-loader-2" style={{ animation: "av-spinner-spin 0.85s linear infinite" }} /> Sauvegarde…</span>}
        {!readOnly && !saving && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{
              marginLeft: "auto",
              padding: "5px 12px",
              background: showAdd ? "#cfd8e0" : "linear-gradient(135deg, #EF9F27, #d48720)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
            <i className={`ti ${showAdd ? "ti-x" : "ti-plus"}`} /> {showAdd ? "Annuler" : "Ajouter une pièce"}
          </button>
        )}
      </div>

      {/* Formulaire ajout */}
      {showAdd && !readOnly && (
        <div style={{
          padding: 12,
          background: "linear-gradient(135deg, rgba(239,159,39,.08), #fff)",
          border: "1.5px solid rgba(239,159,39,.3)",
          borderRadius: 10,
          marginBottom: 10,
          display: "grid", gridTemplateColumns: "2fr 1fr 80px 100px", gap: 8,
        }}>
          <div>
            <label style={{ fontSize: 9, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Désignation *</label>
            <input value={newPiece.designation} onChange={(e) => setNewPiece({ ...newPiece, designation: e.target.value })}
              placeholder="Ex: Filtre HEPA O2..." autoFocus
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Référence</label>
            <input value={newPiece.ref} onChange={(e) => setNewPiece({ ...newPiece, ref: e.target.value })}
              placeholder="REF-XXX"
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Qté</label>
            <input type="number" min="1" value={newPiece.quantite} onChange={(e) => setNewPiece({ ...newPiece, quantite: parseFloat(e.target.value) || 1 })}
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>PU HT €</label>
            <input type="number" min="0" step="0.01" value={newPiece.prix_unitaire} onChange={(e) => setNewPiece({ ...newPiece, prix_unitaire: parseFloat(e.target.value) || 0 })}
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Fournisseur</label>
            <input value={newPiece.fournisseur} onChange={(e) => setNewPiece({ ...newPiece, fournisseur: e.target.value })}
              placeholder="Ex: Philips"
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>N° cmd</label>
            <input value={newPiece.num_commande} onChange={(e) => setNewPiece({ ...newPiece, num_commande: e.target.value })}
              placeholder="CMD-2026..."
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit" }} />
          </div>
          <div style={{ gridColumn: "3 / 5", display: "flex", alignItems: "end" }}>
            <button onClick={addPiece}
              style={{ width: "100%", padding: "6px 12px", background: "linear-gradient(135deg, #5aa05a, #3d7a3d)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
              <i className="ti ti-check" /> Valider
            </button>
          </div>
        </div>
      )}

      {/* Liste des pièces */}
      {pieces.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", color: "#8a98a8", fontSize: 11.5, background: "#fafbfc", borderRadius: 8, border: "1.5px dashed #cfd8e0" }}>
          <i className="ti ti-tool-off" style={{ fontSize: 20, display: "block", marginBottom: 4 }} />
          Aucune pièce ajoutée
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e3e9ee" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3 }}>Désignation</th>
                <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#5a6878" }}>Réf</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, color: "#5a6878" }}>Qté</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, color: "#5a6878" }}>PU HT</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, color: "#5a6878" }}>Total</th>
                <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "#5a6878" }}>Fournisseur</th>
                {!readOnly && <th style={{ width: 30 }}></th>}
              </tr>
            </thead>
            <tbody>
              {pieces.map((p, i) => (
                <tr key={p.id || i} style={{ borderBottom: "1px solid #f0f3f6" }}>
                  <td style={{ padding: "6px 8px", color: "#142131", fontWeight: 500 }}>{p.designation}</td>
                  <td style={{ padding: "6px 8px", color: "#5a6878", fontFamily: "monospace", fontSize: 11 }}>{p.ref || "—"}</td>
                  <td style={{ padding: "6px 8px", color: "#5a6878", textAlign: "right" }}>{p.quantite || 1}</td>
                  <td style={{ padding: "6px 8px", color: "#5a6878", textAlign: "right" }}>{(p.prix_unitaire || 0).toFixed(2)} €</td>
                  <td style={{ padding: "6px 8px", color: "#EF9F27", textAlign: "right", fontWeight: 700 }}>
                    {((p.quantite || 1) * (p.prix_unitaire || 0)).toFixed(2)} €
                  </td>
                  <td style={{ padding: "6px 8px", color: "#5a6878" }}>
                    {p.fournisseur || "—"}
                    {p.num_commande && <span style={{ fontSize: 9, color: "#8a98a8", marginLeft: 4 }}>({p.num_commande})</span>}
                  </td>
                  {!readOnly && (
                    <td>
                      <button onClick={() => removePiece(i)}
                        title="Retirer"
                        style={{
                          width: 22, height: 22,
                          background: "rgba(227, 93, 91, .15)",
                          color: "#e35d5b",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 11,
                        }}>
                        <i className="ti ti-x" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Durée + coût MO */}
      {!readOnly && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
              <i className="ti ti-clock" /> Durée intervention (min)
            </label>
            <input type="number" min="0" value={duree}
              onChange={(e) => setDuree(parseFloat(e.target.value) || 0)}
              onBlur={() => save()}
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit", marginTop: 3 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
              <i className="ti ti-currency-euro" /> Coût main d'œuvre HT €
            </label>
            <input type="number" min="0" step="0.01" value={coutMo}
              onChange={(e) => setCoutMo(parseFloat(e.target.value) || 0)}
              onBlur={() => save()}
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #e3e9ee", borderRadius: 5, fontSize: 12, fontFamily: "inherit", marginTop: 3 }} />
          </div>
        </div>
      )}

      {/* Récap totaux */}
      {(pieces.length > 0 || coutMo > 0) && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: "linear-gradient(135deg, rgba(239,159,39,.10), rgba(124,200,200,.05))",
          border: "1px solid rgba(239,159,39,.3)",
          borderRadius: 10,
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9.5, color: "#5a6878", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>Pièces</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#EF9F27" }}>{coutPiecesTotal.toFixed(2)} €</div>
          </div>
          <div style={{ textAlign: "center", borderLeft: "1px solid #e3e9ee", borderRight: "1px solid #e3e9ee" }}>
            <div style={{ fontSize: 9.5, color: "#5a6878", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>Main d'œuvre</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#7CC8C8" }}>{(coutMo || 0).toFixed(2)} €</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9.5, color: "#5a6878", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.3 }}>Total HT</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#185FA5" }}>{coutTotalHt.toFixed(2)} €</div>
          </div>
        </div>
      )}
    </div>
  );
}
