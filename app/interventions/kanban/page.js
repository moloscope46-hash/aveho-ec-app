"use client";
// Page Kanban DI — Vue tableau de bord opérationnel des demandes
// d'intervention par statut. Drag & drop entre colonnes pour
// changer le statut. Complète la liste tabulaire existante.
//
// Alpha 0.17.0 : drag tactile via Pointer Events (souris + tactile)
// Remplace l'ancien HTML5 DnD qui ne fonctionnait pas sur mobile.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../../ui";
import { PageHero, toast, Avatar } from "../../components/ui-premium";
import { fmtDate } from "../../../lib/format";
import DIPreview from "../../DIPreview";

const COLONNES = [
  { statut: "Nouvelle", couleur: "#e35d5b", icon: "ti-circle-dashed" },
  { statut: "En cours", couleur: "#EF9F27", icon: "ti-progress" },
  { statut: "Résolue", couleur: "#5aa05a", icon: "ti-circle-check" },
  { statut: "Annulée", couleur: "#8a98a8", icon: "ti-x" },
];

const COULEUR_URGENCE = { "Faible": "#5aa05a", "Normal": "#185FA5", "Haute": "#EF9F27", "Critique": "#e35d5b" };

export default function KanbanDIPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // Alpha 0.17.1 : tri par échéance ou par date de création
  const [triBy, setTriBy] = useState("created"); // "created" | "due"
  // État drag (PointerEvents universel souris+tactile)
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [ghostPos, setGhostPos] = useState(null); // {x, y} pour positionner le ghost
  // 0.58.7 : ID de la carte qui vient d'être droppée (pour animation flash)
  const [droppedId, setDroppedId] = useState(null);
  const dragRef = useRef({ startX: 0, startY: 0, started: false, offsetX: 0, offsetY: 0, cardW: 0, cardH: 0 });

  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    let q = supabase.from("interventions")
      .select("*, materiels(id,libelle,num_serie,num_parc,num_lot), patients(id,nom,prenom,chambre,date_naissance,numero_dossier)")
      .order("created_at", { ascending: false });
    if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  // ---- Drag via Pointer Events (souris + tactile unifié) ----
  function onPointerDown(e, id) {
    if (!auth.can("ecrire")) return;
    // N'intercepter que le bouton principal pour la souris
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardW: rect.width,
      cardH: rect.height,
    };
    setDragId(id);
    // Empêche la sélection de texte / scroll natif sur touch après seuil
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragId) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    // Seuil de détection drag (évite déclenchement sur simple tap)
    if (!dragRef.current.started && dx < 6 && dy < 6) return;
    dragRef.current.started = true;
    // Bloque le scroll natif sur touch pendant le drag
    if (e.pointerType === "touch") e.preventDefault?.();
    // Position du ghost (ancrée à la zone cliquée)
    setGhostPos({
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY,
    });
    // Détection de la colonne survolée via elementFromPoint
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const colEl = el?.closest?.("[data-kanban-col]");
    setOverCol(colEl?.getAttribute("data-kanban-col") || null);
  }

  async function onPointerUp() {
    if (!dragId) return;
    const id = dragId;
    const newStatut = overCol;
    const wasStarted = dragRef.current.started;
    setDragId(null);
    setGhostPos(null);
    setOverCol(null);
    if (!wasStarted) return; // simple clic, pas un drag
    if (!newStatut) return; // drop hors d'une colonne
    const di = rows.find((r) => r.id === id);
    if (!di || di.statut === newStatut) return;
    // Optimistic UI
    const prev = rows;
    setRows(rows.map((r) => r.id === id ? { ...r, statut: newStatut } : r));
    // 0.58.7 : flash animation sur la carte qui vient d'arriver
    setDroppedId(id);
    setTimeout(() => setDroppedId(null), 700);
    const { error } = await supabase.from("interventions")
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setRows(prev);
      // 0.58.7 : toast.error remplace alert()
      toast.error("Échec du changement de statut : " + (error.message || "erreur inconnue"));
    } else {
      // 0.58.7 : feedback positif
      toast.success(`Statut mis à jour → ${newStatut}`);
    }
  }

  // Annuler le drag si on quitte la fenêtre
  useEffect(() => {
    if (!dragId) return;
    function onCancel() { setDragId(null); setGhostPos(null); setOverCol(null); }
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    return () => {
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
    };
  }, [dragId]);

  if (!auth.ready) return null;

  // Récup carte en cours de drag pour ghost
  const dragCard = dragId ? rows.find((r) => r.id === dragId) : null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        {/* 0.58.4 : PageHero premium remplace PageHead minimaliste */}
        <PageHero
          icon="ti-layout-kanban"
          eyebrow="VUE OPÉRATIONNELLE"
          title="Kanban des interventions"
          subtitle="Glisse une carte d'une colonne à l'autre pour changer son statut"
          variant="terra"
          particles
          particlesCount={20}
          breadcrumbs={[
            { label: "Accueil", href: "/accueil" },
            { label: "Interventions", href: "/interventions" },
            { label: "Kanban" },
          ]}
          actions={
            <>
              <Btn variant="ghost" icon="ti-list" size="sm" onClick={() => router.push("/interventions")}>Vue liste</Btn>
              <Btn variant="ghost" icon="ti-calendar" size="sm" onClick={() => router.push("/calendrier")}>Vue calendrier</Btn>
            </>
          }
        />

        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {/* 0.58.4 : Btn "Vue liste" + "Vue calendrier" déplacés dans le PageHero ci-dessus */}
          {/* Alpha 0.17.1 : toggle de tri */}
          <span style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#6c7a89" }}>
            <span style={{ fontWeight: 600 }}>Trier :</span>
            <button onClick={() => setTriBy("created")} style={{ border: "none", padding: "5px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", background: triBy === "created" ? "#7CC8C8" : "#f1f3f5", color: triBy === "created" ? "#fff" : "#6c7a89", fontFamily: "inherit" }}>
              Création
            </button>
            <button onClick={() => setTriBy("due")} style={{ border: "none", padding: "5px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", background: triBy === "due" ? "#7CC8C8" : "#f1f3f5", color: triBy === "due" ? "#fff" : "#6c7a89", fontFamily: "inherit" }}>
              Échéance
            </button>
          </span>
        </div>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, minHeight: 400, touchAction: dragId ? "none" : "auto" }}
            className={`kanban-grid${dragId ? " kb-drag-active" : ""}`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {COLONNES.map((col) => {
              let items = rows.filter((r) => r.statut === col.statut);
              // Alpha 0.17.1 : tri par due_date asc (nulls last) ou par created_at desc
              if (triBy === "due") {
                items = [...items].sort((a, b) => {
                  if (!a.due_date && !b.due_date) return 0;
                  if (!a.due_date) return 1;
                  if (!b.due_date) return -1;
                  return a.due_date.localeCompare(b.due_date);
                });
              }
              const isOver = overCol === col.statut;
              return (
                <div key={col.statut}
                  data-kanban-col={col.statut}
                  className={`kb-col${isOver ? " kb-col-over" : ""}`}
                  style={{
                    background: "#f4f7fa",
                    border: `2px solid #e3e9ee`,
                    borderRadius: 12, padding: 12, transition: "background .2s, border .2s",
                  }}>
                  {/* En-tête colonne */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${col.couleur}33` }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: col.couleur, textTransform: "uppercase", letterSpacing: ".5px" }}>
                      <i className={`ti ${col.icon}`} /> {col.statut}
                    </span>
                    <span style={{ background: col.couleur, color: "#fff", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{items.length}</span>
                  </div>
                  {/* Cartes */}
                  {items.length === 0 ? (
                    <p style={{ color: "#cfd5db", fontSize: 12, textAlign: "center", padding: "20px 8px", fontStyle: "italic" }}>Aucune DI</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((r) => {
                        const target = r.materiels?.libelle || (r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}` : "");
                        const urgColor = COULEUR_URGENCE[r.urgence] || "#185FA5";
                        const isDragging = dragId === r.id;
                        return (
                          <div key={r.id}
                            data-kanban-card={r.id}
                            className={`kb-card${isDragging ? " kb-card-dragging" : ""}${droppedId === r.id ? " kb-card-dropped" : ""}`}
                            onPointerDown={(e) => onPointerDown(e, r.id)}
                            onClick={() => { if (!dragRef.current.started) router.push("/interventions"); }}
                            style={{
                              background: "#fff", padding: 10, borderRadius: 8,
                              cursor: auth.can("ecrire") ? "grab" : "pointer",
                              boxShadow: "0 1px 3px rgba(0,0,0,.06)", borderLeft: `3px solid ${urgColor}`,
                              touchAction: "none",
                              userSelect: "none",
                            }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#142131" }}>
                                {/* Alpha 0.41.0 : preview au hover dans kanban */}
                                <DIPreview di={r} patient={r.patients} materiel={r.materiels}>
                                  {r.numero}
                                </DIPreview>
                              </span>
                              {r.urgence && <span style={{ fontSize: 9, fontWeight: 700, color: urgColor, textTransform: "uppercase" }}>{r.urgence}</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "#2a3a48", marginBottom: 4 }}>{r.type || "—"}</div>
                            {target && <div style={{ fontSize: 11, color: "#6c7a89" }}>{target}</div>}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                              <div style={{ fontSize: 10, color: "#8a98a8" }}>{fmtDate(r.created_at)}</div>
                              {r.due_date && (() => {
                                const due = new Date(r.due_date);
                                const overdue = due < new Date() && r.statut !== "Résolue" && r.statut !== "Annulée";
                                return (
                                  <div style={{ fontSize: 10, fontWeight: 600, color: overdue ? "#c0392b" : "#185FA5", display: "flex", alignItems: "center", gap: 3 }}>
                                    <i className="ti ti-calendar-event" />
                                    {fmtDate(r.due_date)}
                                  </div>
                                );
                              })()}
                            </div>
                            {/* 0.58.8 : Avatar de l'assigné en bas de carte */}
                            {r.assignee_email && (
                              <div style={{
                                marginTop: 8,
                                paddingTop: 7,
                                borderTop: "1px dashed #eef2f5",
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                fontSize: 11,
                                color: "#6c7a89",
                              }}>
                                <Avatar name={r.assignee_email} size={22} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                  {r.assignee_email}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Ghost — carte qui suit le pointeur pendant le drag (PREMIUM 0.58.7) */}
        {dragId && dragCard && ghostPos && (
          <div
            className="kb-ghost-premium"
            style={{
              position: "fixed",
              left: ghostPos.x, top: ghostPos.y,
              width: dragRef.current.cardW,
              background: "#fff", padding: 10, borderRadius: 8,
              borderLeft: `4px solid ${COULEUR_URGENCE[dragCard.urgence] || "#185FA5"}`,
              pointerEvents: "none",
              zIndex: 1000,
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#142131" }}>{dragCard.numero}</span>
              {dragCard.urgence && <span style={{ fontSize: 9, fontWeight: 700, color: COULEUR_URGENCE[dragCard.urgence] || "#185FA5", textTransform: "uppercase" }}>{dragCard.urgence}</span>}
            </div>
            <div style={{ fontSize: 12, color: "#2a3a48", marginBottom: 4 }}>{dragCard.type || "—"}</div>
            {(dragCard.materiels?.libelle || dragCard.patients?.nom) && (
              <div style={{ fontSize: 11, color: "#6c7a89" }}>{dragCard.materiels?.libelle || `${dragCard.patients.nom} ${dragCard.patients.prenom || ""}`}</div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        @media (max-width: 900px) {
          .kanban-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 560px) {
          .kanban-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
