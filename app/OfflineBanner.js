"use client";
// =============================================================
//  Composant OfflineBanner (Alpha 0.25.0)
//  Affiche :
//   - Bandeau rouge si offline (avec compteur d'actions en queue)
//   - Bandeau orange si online mais queue non vide (sync en cours)
//   - Rien si online + queue vide
//  Modale détail au clic pour voir les actions en attente.
// =============================================================
import { useEffect, useState } from "react";
import { useOffline } from "../lib/useOffline";
import { useAuth } from "../lib/useAuth";
import ConflictResolver from "./ConflictResolver";

export default function OfflineBanner() {
  const auth = useAuth();
  const userId = auth?.user?.id;
  const { online, queueCount, syncing, lastSync, lastResult, syncNow, getQueueItems, clearAll } = useOffline(userId);
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState([]);
  const [conflictItem, setConflictItem] = useState(null);
  // Alpha 0.49.2 : hydration-safe — ne rien rendre tant qu'on n'est pas côté client
  // (évite mismatch SSR/CSR car navigator.onLine est browser-only)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (showModal) {
      getQueueItems().then(setItems);
    }
  }, [showModal, getQueueItems, queueCount]);

  // Pas encore monté côté client → ne rien afficher (cohérent avec SSR)
  if (!mounted) return null;

  // Rien à afficher si online + queue vide
  if (online && queueCount === 0 && !syncing) return null;

  return (
    <>
      {/* Bandeau */}
      <div
        className={`offline-banner ${online ? (syncing ? "syncing" : "queued") : "offline"}`}
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") setShowModal(true); }}
      >
        {!online && (
          <>
            <i className="ti ti-wifi-off" />
            <span>
              <b>Hors-ligne.</b>{" "}
              {queueCount > 0
                ? `Tes ${queueCount} dernière${queueCount > 1 ? "s" : ""} action${queueCount > 1 ? "s" : ""} ${queueCount > 1 ? "sont" : "est"} en attente — synchronisation auto à la reconnexion.`
                : "Tu peux continuer à travailler, les modifications seront enregistrées localement puis synchronisées."}
            </span>
          </>
        )}
        {online && syncing && (
          <>
            <i className="ti ti-cloud-upload" />
            <span><b>Synchronisation en cours…</b> {queueCount} action{queueCount > 1 ? "s" : ""} restante{queueCount > 1 ? "s" : ""}</span>
          </>
        )}
        {online && !syncing && queueCount > 0 && (
          <>
            <i className="ti ti-alert-circle" />
            <span>
              <b>{queueCount} action{queueCount > 1 ? "s" : ""} non synchronisée{queueCount > 1 ? "s" : ""}.</b>{" "}
              Clic pour voir le détail.
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); syncNow(); }}
              style={{ marginLeft: "auto", background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.4)", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <i className="ti ti-refresh" /> Réessayer
            </button>
          </>
        )}
      </div>

      {/* Modale détail */}
      {showModal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setShowModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 600 }}>
            <div className="modal-head" style={{ background: online ? "linear-gradient(135deg,#EF9F27,#a06a15)" : "linear-gradient(135deg,#c0392b,#7a1f15)", color: "#fff" }}>
              <i className={`ti ${online ? "ti-cloud-upload" : "ti-wifi-off"}`} style={{ marginRight: 6 }} />
              <span>{online ? "Actions en attente de synchronisation" : "Mode hors-ligne"}</span>
              <i className="ti ti-x" style={{ cursor: "pointer", marginLeft: "auto" }} onClick={() => setShowModal(false)} aria-label="Fermer" role="button" tabIndex={0} />
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, marginBottom: 16, color: "#2a3a48" }}>
                {!online && (
                  <p>Tu es actuellement <b>hors-ligne</b>. Tu peux continuer à utiliser Aveho : tes modifications sont enregistrées localement et seront automatiquement synchronisées dès la reconnexion.</p>
                )}
                {online && queueCount > 0 && (
                  <p>{queueCount} action{queueCount > 1 ? "s" : ""} {queueCount > 1 ? "sont" : "est"} en attente de synchronisation. Tu peux forcer un nouvel essai ci-dessous.</p>
                )}
                {lastSync && (
                  <p style={{ fontSize: 12, color: "#6c7a89" }}>
                    Dernière tentative de sync : {new Date(lastSync).toLocaleString("fr-FR")}
                    {lastResult && ` — ${lastResult.succeeded} OK, ${lastResult.failed} échec${lastResult.failed > 1 ? "s" : ""}, ${lastResult.remaining} restant${lastResult.remaining > 1 ? "s" : ""}`}
                  </p>
                )}
              </div>

              {items.length === 0 ? (
                <p style={{ color: "#5aa05a", textAlign: "center", padding: 16 }}>
                  <i className="ti ti-circle-check-filled" /> Aucune action en attente
                </p>
              ) : (
                <table style={{ width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f4f7fa" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>Action</th>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>Table</th>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>Heure</th>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}>Tentatives</th>
                      <th style={{ textAlign: "left", padding: "6px 8px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isConflict = item.last_error && item.last_error.toLowerCase().includes("conflit");
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #eef2f5" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ fontWeight: 600, color: item.op === "insert" ? "#2e6f33" : item.op === "update" ? "#185FA5" : item.op === "delete" ? "#c0392b" : "#7a4f15" }}>
                              {item.op}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px" }}>{item.table || item.rpcName || "—"}</td>
                          <td style={{ padding: "6px 8px", color: "#6c7a89" }}>{new Date(item.created_at).toLocaleTimeString("fr-FR")}</td>
                          <td style={{ padding: "6px 8px" }}>
                            {item.attempts > 0 ? (
                              <span style={{ color: item.attempts >= 5 ? "#c0392b" : "#EF9F27", fontWeight: 600 }}>
                                {item.attempts}{item.attempts >= 5 && " (abandonné)"}
                              </span>
                            ) : "—"}
                            {item.last_error && (
                              <span style={{ display: "block", fontSize: 10, color: isConflict ? "#a06a15" : "#c0392b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.last_error}>
                                {item.last_error}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            {isConflict && item.op === "update" && online && (
                              <button
                                onClick={() => setConflictItem(item)}
                                style={{ background: "#EF9F27", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                title="Résoudre le conflit"
                              >
                                <i className="ti ti-git-merge" /> Résoudre
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Fermer</button>
              {items.length > 0 && online && (
                <button
                  className="btn-save"
                  onClick={async () => { await syncNow(); }}
                  disabled={syncing}
                >
                  <i className="ti ti-refresh" /> {syncing ? "Synchronisation…" : "Réessayer maintenant"}
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm(`Supprimer définitivement les ${items.length} actions en attente ?\n\nLes données concernées seront PERDUES.`)) {
                      await clearAll();
                      setItems([]);
                    }
                  }}
                  style={{ background: "#fff", color: "#c0392b", border: "1px solid #c0392b", padding: "8px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  <i className="ti ti-trash" /> Tout supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale résolution conflit */}
      {conflictItem && (
        <ConflictResolver
          queueItem={conflictItem}
          onClose={() => setConflictItem(null)}
          onResolved={async () => {
            // Refresh la liste après résolution
            setConflictItem(null);
            const fresh = await getQueueItems();
            setItems(fresh);
          }}
        />
      )}
    </>
  );
}
