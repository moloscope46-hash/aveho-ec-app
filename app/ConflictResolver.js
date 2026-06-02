"use client";
// =============================================================
//  ConflictResolver — Modale de résolution de conflits offline
//  Alpha 0.27.0
//
//  Quand un UPDATE en queue échoue pour cause de conflit (quelqu'un
//  d'autre a modifié entre-temps), cette modale permet à l'utilisateur
//  de comparer les 2 versions et de choisir :
//   - Garder MA version (forcer l'écrasement)
//   - Garder la version actuelle (abandonner ma modif)
//   - Fusionner manuellement (champ par champ)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { removeOp } from "../lib/offlineQueue";
// 0.57.10 : imports retirés (logger non utilisés)

export default function ConflictResolver({ queueItem, onResolved, onClose }) {
  const supabase = createClient();
  const [currentRow, setCurrentRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [merged, setMerged] = useState({});
  const [mode, setMode] = useState("compare"); // 'compare' | 'merge'

  // Charger la version actuelle en base
  useEffect(() => {
    async function fetchCurrent() {
      if (!queueItem?.match?.id || !queueItem?.table) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from(queueItem.table)
        .select("*")
        .eq("id", queueItem.match.id)
        .single();
      setCurrentRow(data || null);
      setLoading(false);
    }
    fetchCurrent();
  }, [queueItem?.match?.id, queueItem?.table]);

  if (!queueItem) return null;

  // Payload modifié (sans la métadonnée __staged_updated_at)
  const myPayload = { ...queueItem.payload };
  delete myPayload.__staged_updated_at;

  // Champs en conflit : ceux que J'AI modifiés ET qui sont différents en base
  const myKeys = Object.keys(myPayload).filter((k) => k !== "updated_at");
  const conflictedFields = myKeys.filter((k) => {
    if (!currentRow) return false;
    const mine = myPayload[k];
    const current = currentRow[k];
    // Compare en string pour gérer null/undefined/typage
    return String(mine ?? "") !== String(current ?? "");
  });

  async function forceMyVersion() {
    setBusy(true);
    try {
      // On retire le __staged_updated_at et on applique sans check
      const cleanPayload = { ...myPayload, updated_at: new Date().toISOString() };
      let q = supabase.from(queueItem.table).update(cleanPayload);
      for (const [k, v] of Object.entries(queueItem.match || {})) {
        q = q.eq(k, v);
      }
      const { error } = await q;
      if (error) throw error;
      await removeOp(queueItem.id);
      if (onResolved) onResolved({ action: "force_mine" });
      if (onClose) onClose();
    } catch (e) {
      alert("Erreur lors de l'écrasement : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function keepCurrentVersion() {
    setBusy(true);
    try {
      // On abandonne ma modif, on retire juste de la queue
      await removeOp(queueItem.id);
      if (onResolved) onResolved({ action: "keep_current" });
      if (onClose) onClose();
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyMerge() {
    setBusy(true);
    try {
      // merged contient le choix de l'utilisateur pour chaque champ
      const finalPayload = { ...merged, updated_at: new Date().toISOString() };
      let q = supabase.from(queueItem.table).update(finalPayload);
      for (const [k, v] of Object.entries(queueItem.match || {})) {
        q = q.eq(k, v);
      }
      const { error } = await q;
      if (error) throw error;
      await removeOp(queueItem.id);
      if (onResolved) onResolved({ action: "merge", payload: finalPayload });
      if (onClose) onClose();
    } catch (e) {
      alert("Erreur lors de la fusion : " + e.message);
    } finally {
      setBusy(false);
    }
  }

  function startMerge() {
    // Initialise merged avec la version actuelle (par défaut on garde la version la + récente)
    const initial = {};
    conflictedFields.forEach((k) => { initial[k] = currentRow?.[k] ?? null; });
    setMerged(initial);
    setMode("merge");
  }

  function pickField(key, value) {
    setMerged({ ...merged, [key]: value });
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && onClose && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 800 }}>
        <div className="modal-head" style={{ background: "linear-gradient(135deg,#EF9F27,#a06a15)", color: "#fff" }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
          <span>Conflit détecté — {queueItem.table}</span>
          <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={onClose} aria-label="Fermer" role="button" tabIndex={0} />
        </div>

        <div className="modal-body" style={{ padding: 20 }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#6c7a89" }}>Chargement de la version actuelle…</p>
          ) : !currentRow ? (
            <div style={{ padding: 16, background: "#fef0ee", border: "1px solid #f0c4be", borderRadius: 8 }}>
              <b style={{ color: "#c0392b" }}>Élément introuvable</b>
              <p style={{ fontSize: 13, margin: "8px 0 0", color: "#7a1f15" }}>
                La ligne que vous avez modifiée a été supprimée par un autre utilisateur. Votre modification ne peut pas être appliquée.
              </p>
            </div>
          ) : conflictedFields.length === 0 ? (
            <div style={{ padding: 16, background: "#eef9ef", border: "1px solid #b4dfb6", borderRadius: 8 }}>
              <b style={{ color: "#2e6f33" }}>Aucun conflit réel détecté</b>
              <p style={{ fontSize: 13, margin: "8px 0 0" }}>
                Vos modifications correspondent déjà à la version actuelle. Vous pouvez retirer cette action de la queue en toute sécurité.
              </p>
            </div>
          ) : mode === "compare" ? (
            <>
              <p style={{ fontSize: 13, color: "#6c7a89", marginBottom: 16 }}>
                Quelqu'un d'autre a modifié cet élément pendant que vous étiez hors-ligne. Voici les <b>{conflictedFields.length} champ{conflictedFields.length > 1 ? "s" : ""}</b> en conflit :
              </p>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f4f7fa" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e3e9ee" }}>Champ</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e3e9ee", color: "#185FA5" }}>
                      <i className="ti ti-user" /> Ma version
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #e3e9ee", color: "#7a4f15" }}>
                      <i className="ti ti-cloud" /> Version actuelle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {conflictedFields.map((k) => (
                    <tr key={k}>
                      <td style={{ padding: "8px 10px", border: "1px solid #e3e9ee", fontWeight: 600 }}>{k}</td>
                      <td style={{ padding: "8px 10px", border: "1px solid #e3e9ee", background: "#eef5fc" }}>
                        <DiffValue mine={myPayload[k]} other={currentRow[k]} side="mine" />
                      </td>
                      <td style={{ padding: "8px 10px", border: "1px solid #e3e9ee", background: "#fef3e2" }}>
                        <DiffValue mine={myPayload[k]} other={currentRow[k]} side="other" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: "#8a98a8", marginTop: 12 }}>
                <i className="ti ti-info-circle" /> Version actuelle modifiée le {currentRow.updated_at ? new Date(currentRow.updated_at).toLocaleString("fr-FR") : "—"}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#6c7a89", marginBottom: 16 }}>
                Pour chaque champ en conflit, choisis la valeur à conserver :
              </p>
              {conflictedFields.map((k) => (
                <div key={k} style={{ marginBottom: 14, padding: 12, border: "1px solid #e3e9ee", borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{k}</div>
                  <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button
                      onClick={() => pickField(k, myPayload[k])}
                      style={{
                        padding: "8px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                        cursor: "pointer", textAlign: "left",
                        background: merged[k] === myPayload[k] ? "#185FA5" : "#eef5fc",
                        color: merged[k] === myPayload[k] ? "#fff" : "#185FA5",
                        border: `1px solid ${merged[k] === myPayload[k] ? "#185FA5" : "#cfe0f5"}`,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: .7, textTransform: "uppercase", letterSpacing: ".5px" }}>
                        <i className="ti ti-user" /> Ma version
                      </div>
                      <div style={{ marginTop: 4 }}>{String(myPayload[k] ?? "—")}</div>
                    </button>
                    <button
                      onClick={() => pickField(k, currentRow[k])}
                      style={{
                        padding: "8px 12px", borderRadius: 6, fontSize: 13, fontFamily: "inherit",
                        cursor: "pointer", textAlign: "left",
                        background: merged[k] === currentRow[k] ? "#a06a15" : "#fef3e2",
                        color: merged[k] === currentRow[k] ? "#fff" : "#7a4f15",
                        border: `1px solid ${merged[k] === currentRow[k] ? "#a06a15" : "#f0d59f"}`,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: .7, textTransform: "uppercase", letterSpacing: ".5px" }}>
                        <i className="ti ti-cloud" /> Version actuelle
                      </div>
                      <div style={{ marginTop: 4 }}>{String(currentRow[k] ?? "—")}</div>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="modal-foot">
          {!currentRow ? (
            <>
              <button className="btn-ghost" onClick={onClose}>Annuler</button>
              <button onClick={keepCurrentVersion} disabled={busy} className="btn-save">
                <i className="ti ti-trash" /> Retirer de la queue
              </button>
            </>
          ) : conflictedFields.length === 0 ? (
            <>
              <button className="btn-ghost" onClick={onClose}>Fermer</button>
              <button onClick={keepCurrentVersion} disabled={busy} className="btn-save">
                <i className="ti ti-check" /> Retirer de la queue
              </button>
            </>
          ) : mode === "compare" ? (
            <>
              <button className="btn-ghost" onClick={onClose}>Annuler</button>
              <button
                onClick={keepCurrentVersion}
                disabled={busy}
                style={{ background: "#fff", color: "#a06a15", border: "1px solid #a06a15", padding: "8px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <i className="ti ti-cloud-check" /> Garder version actuelle
              </button>
              <button
                onClick={startMerge}
                disabled={busy}
                style={{ background: "#fff", color: "#7a6fb0", border: "1px solid #7a6fb0", padding: "8px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <i className="ti ti-git-merge" /> Fusionner manuellement
              </button>
              <button
                onClick={forceMyVersion}
                disabled={busy}
                className="btn-save"
              >
                <i className="ti ti-user-check" /> {busy ? "…" : "Forcer ma version"}
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setMode("compare")}>← Retour</button>
              <button
                onClick={applyMerge}
                disabled={busy || Object.keys(merged).length < conflictedFields.length}
                className="btn-save"
              >
                <i className="ti ti-check" /> {busy ? "Application…" : "Appliquer la fusion"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Alpha 0.47.0 — Affichage diff word-level entre 2 valeurs
function DiffValue({ mine, other, side }) {
  const myStr = mine === null || mine === undefined ? "—" : String(mine);
  const otherStr = other === null || other === undefined ? "—" : String(other);

  // Pour valeurs courtes ou non-string : affichage simple
  if (myStr.length < 20 && otherStr.length < 20) {
    return <code style={{ background: "transparent", padding: 0 }}>{side === "mine" ? myStr : otherStr}</code>;
  }
  // Pour valeurs longues (textareas, descriptions…) : diff word-level
  const myTokens = tokenize(myStr);
  const otherTokens = tokenize(otherStr);
  const diffed = side === "mine"
    ? markDiff(myTokens, otherTokens, "removed")
    : markDiff(otherTokens, myTokens, "added");

  return (
    <div style={{ fontFamily: "Consolas, monospace", fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
      {diffed.map((seg, i) => (
        <span 
          key={i} 
          style={{
            background: seg.changed
              ? (side === "mine" ? "#ffd6d2" : "#cfeacb")
              : "transparent",
            color: seg.changed
              ? (side === "mine" ? "#7a1f15" : "#2e6f33")
              : "#142131",
            padding: seg.changed ? "1px 2px" : 0,
            borderRadius: seg.changed ? 2 : 0,
            textDecoration: seg.changed && side === "mine" ? "line-through" : "none",
          }}
        >
          {seg.text}
        </span>
      ))}
    </div>
  );
}

function tokenize(str) {
  // Split en mots + espaces + ponctuation, en conservant les séparateurs
  return str.split(/(\s+|[.,;:!?])/).filter(Boolean);
}

function markDiff(a, b, kind) {
  // Algorithme simple : marque les tokens de "a" qui ne sont pas dans "b"
  // (pas un vrai diff LCS, mais largement suffisant pour résoudre des conflits)
  const bSet = new Set(b);
  return a.map((t) => ({ text: t, changed: !bSet.has(t) && t.trim().length > 0 }));
}
