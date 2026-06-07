"use client";
// =============================================================
//  Composant Cloche de notifications (Alpha 0.3)
//  Affiche une icône cloche dans la TopBar avec badge du nombre non lues.
//  Au clic, ouvre un panneau déroulant avec la liste des notifications.
//  Permet de marquer comme lue, supprimer, ou cliquer pour aller au lien.
// =============================================================
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";
import { relativeTime } from "../lib/format";
// 0.58.13 : Drawer pour panel notifications côté droit
// 0.58.15 : Tooltip pour la cloche avec compteur dynamique
import { Drawer, Tooltip } from "./components/ui-premium";
// 0.61.4 : cantonnement notifs si user magasin
import { useViewMode } from "../lib/useViewMode";
import { useMagasinContext } from "../lib/useMagasinContext";

const TYPES = {
  systeme:    { ic: "ti-info-circle",     color: "#185FA5" },
  transfert:  { ic: "ti-truck-delivery",  color: "#185FA5" },
  di:         { ic: "ti-tools",           color: "#e35d5b" },
  intervention:{ic: "ti-tools",           color: "#e35d5b" },
  invitation: { ic: "ti-mail",            color: "#7a6fb0" },
  commande:   { ic: "ti-shopping-bag",    color: "#2a5a5a" },
  stock:      { ic: "ti-package",         color: "#EF9F27" },
};

export default function NotifBell({ structureId, userId }) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // 0.61.4 : cantonnement notifs si user magasin
  const viewMode = useViewMode();
  const magasinCtx = useMagasinContext();

  // Charge mes notifications (filtrées par magasin si user magasin)
  async function load() {
    if (!structureId) return;
    let q = supabase.from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    // Si user magasin → ne montrer que les notifs liées au magasin (URL contient magasin_id, ou notifs dont user_id = moi)
    if (viewMode.ready && viewMode.isMagasin && userId) {
      q = q.eq("user_id", userId);
    }
    const { data } = await q;
    setItems(data || []);
  }
  useEffect(() => { if (structureId) load(); }, [structureId, viewMode.ready, viewMode.isMagasin]);

  // Rafraîchit toutes les 60s (polling simple, suffisant pour l'alpha)
  useEffect(() => {
    if (!structureId) return;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [structureId]);

  // Alpha 0.43.0 : Realtime Supabase — subscribe aux INSERT pour pop instantané
  const [hasNew, setHasNew] = useState(false); // anime la cloche
  useEffect(() => {
    if (!structureId) return;
    const channel = supabase
      .channel(`notif:${structureId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `structure_id=eq.${structureId}`,
        },
        (payload) => {
          // Ajoute la notification en tête de liste (déduplication par id)
          setItems((prev) => {
            if (prev.some((n) => n.id === payload.new.id)) return prev;
            return [payload.new, ...prev].slice(0, 30);
          });
          // Trigger animation cloche
          setHasNew(true);
          setTimeout(() => setHasNew(false), 3000);
          // Toast natif si dispo + autorisé
          try {
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
              new Notification("Aveho EC", {
                body: payload.new.titre || payload.new.message || "Nouvelle notification",
                icon: "/icon-192.png",
                tag: payload.new.id, // évite doublons
              });
            }
          } catch (e) {
            // silencieux
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [structureId]);

  // Ferme le panneau si on clique en dehors
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const nonLues = items.filter((n) => !n.lue).length;

  // Marquer une notification comme lue + naviguer si elle a un lien
  async function clickNotif(n) {
    if (!n.lue) {
      await supabase.from("notifications").update({ lue: true }).eq("id", n.id);
      setItems(items.map((x) => x.id === n.id ? { ...x, lue: true } : x));
    }
    if (n.lien) { setOpen(false); router.push(n.lien); }
  }

  // Tout marquer comme lu
  async function readAll() {
    const ids = items.filter((n) => !n.lue).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ lue: true }).in("id", ids);
    setItems(items.map((n) => ({ ...n, lue: true })));
  }

  // Supprimer une notification (si elle m'appartient)
  async function del(e, n) {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", n.id);
    setItems(items.filter((x) => x.id !== n.id));
  }

  // Alpha 0.18.0 : helper relativeTime déplacé dans lib/format.js
  // (anciennement fonction relDate locale dupliquée)
  // 0.58.27 : preview hover sur la cloche (3 dernières notifs)
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTimerRef = useRef(null);
  const handlePreviewEnter = () => {
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setPreviewOpen(true), 350);
  };
  const handlePreviewLeave = () => {
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setPreviewOpen(false), 200);
  };
  const lastThree = items.slice(0, 3);

  return (
    <div className="notif-wrap" ref={ref} style={{ position: "relative" }}>
      <div
        onMouseEnter={handlePreviewEnter}
        onMouseLeave={handlePreviewLeave}
      >
        <button
          className="notif-btn"
          onClick={() => { setOpen(!open); setPreviewOpen(false); }}
          aria-label="Notifications"
          style={hasNew ? { animation: "aveho-bell-shake .8s ease-in-out 3" } : null}
        >
          <i className="ti ti-bell" style={hasNew ? { color: "#EF9F27" } : null} />
          {nonLues > 0 && <span className="notif-badge">{nonLues > 9 ? "9+" : nonLues}</span>}
        </button>
      </div>

      {/* 0.58.27 : Preview hover des 3 dernières notifs */}
      {previewOpen && !open && (
        <div
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewLeave}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 9999,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            background: "linear-gradient(180deg, rgba(20,33,49,0.98) 0%, rgba(13,24,34,0.98) 100%)",
            backdropFilter: "blur(30px) saturate(180%)",
            border: "1px solid rgba(124,200,200,0.25)",
            borderRadius: 14,
            boxShadow: "0 24px 60px rgba(0,0,0,0.50), 0 0 60px rgba(124,200,200,0.15), 0 0 0 1px rgba(255,255,255,0.04) inset",
            color: "#fff",
            fontFamily: "var(--font-quicksand), 'Quicksand', sans-serif",
            animation: "av-notif-preview-in 220ms cubic-bezier(.2,.8,.2,1)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(124,200,200,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg, rgba(124,200,200,0.10), rgba(24,95,165,0.06))",
          }}>
            <i className="ti ti-bell" style={{ color: "#7CC8C8", fontSize: 16 }} />
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Notifications</span>
            {nonLues > 0 && (
              <span style={{
                background: "linear-gradient(135deg, #EF9F27, #d6831d)",
                color: "#fff",
                padding: "2px 9px",
                borderRadius: 99,
                fontSize: 10.5,
                fontWeight: 800,
                marginLeft: "auto",
              }}>
                {nonLues} non lue{nonLues > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Items */}
          {lastThree.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "rgba(191,230,230,0.6)", fontSize: 12.5 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 24, color: "#5aa05a", display: "block", marginBottom: 6 }} />
              Tout est à jour !
            </div>
          ) : (
            <div style={{ padding: "6px 0" }}>
              {lastThree.map((it, idx) => {
                const type = TYPES[it.type] || TYPES.systeme;
                return (
                  <div
                    key={it.id}
                    onClick={() => { setOpen(true); setPreviewOpen(false); }}
                    style={{
                      padding: "10px 16px",
                      paddingRight: 40,  // 0.58.28 : espace pour le bouton mark-as-read
                      cursor: "pointer",
                      borderBottom: idx < lastThree.length - 1 ? "1px solid rgba(124,200,200,0.10)" : "none",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      transition: "background 120ms",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Dot non lu — 0.58.28 fix : champ DB = `lue` pas `lu` */}
                    {!it.lue && (
                      <span style={{
                        position: "absolute",
                        left: 6,
                        top: "calc(50% - 3px)",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: type.color,
                        boxShadow: `0 0 8px ${type.color}99`,
                      }} />
                    )}
                    {/* Icône */}
                    <span style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `linear-gradient(135deg, ${type.color}, ${type.color}cc)`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 13,
                      boxShadow: `0 4px 10px ${type.color}33`,
                    }}>
                      <i className={`ti ${type.ic}`} />
                    </span>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5,
                        fontWeight: it.lue ? 500 : 700,
                        color: it.lue ? "rgba(220,230,235,0.8)" : "#fff",
                        marginBottom: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {it.titre}
                      </div>
                      {it.message && (
                        <div style={{
                          fontSize: 11.5,
                          color: "rgba(191,230,230,0.6)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {it.message}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: "rgba(191,230,230,0.45)", marginTop: 2 }}>
                        {relativeTime(it.created_at)}
                      </div>
                    </div>
                    {/* 0.58.28 : Bouton "marquer comme lu" inline (visible si non lu) */}
                    {!it.lue && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await supabase.from("notifications").update({ lue: true }).eq("id", it.id);
                            setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, lue: true } : x));
                          } catch {}
                        }}
                        aria-label="Marquer comme lue"
                        title="Marquer comme lue"
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "rgba(124, 200, 200, 0.15)",
                          color: "#7CC8C8",
                          border: "1px solid rgba(124, 200, 200, 0.25)",
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: 11,
                          transition: "background 120ms, transform 150ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(124, 200, 200, 0.30)";
                          e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(124, 200, 200, 0.15)";
                          e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                        }}
                      >
                        <i className="ti ti-check" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer "Voir tout" */}
          {items.length > 0 && (
            <div
              onClick={() => { setOpen(true); setPreviewOpen(false); }}
              style={{
                padding: "10px 16px",
                borderTop: "1px solid rgba(124,200,200,0.15)",
                background: "rgba(124,200,200,0.06)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "#7CC8C8",
                textAlign: "center",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,200,200,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,200,200,0.06)"; }}
            >
              Voir toutes les notifications ({items.length}) <i className="ti ti-arrow-right" style={{ marginLeft: 4 }} />
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes aveho-bell-shake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(4deg); }
        }
        @keyframes av-notif-preview-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {/* 0.58.13 : Refonte panel notifications avec Drawer côté droit */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        subtitle={nonLues > 0 ? `${nonLues} non lue${nonLues > 1 ? "s" : ""}` : "Tout est à jour"}
        icon="ti-bell"
        color="#142131"
        side="right"
        size="sm"
        footer={nonLues > 0 ? (
          <button
            onClick={readAll}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid var(--av-g200, #e3e9ee)",
              background: "var(--av-g0, #fff)",
              color: "var(--av-g700, #4a5868)",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="ti ti-checks" />
            Tout marquer comme lu
          </button>
        ) : null}
      >
        {items.length === 0 ? (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--av-g500, #8a98a8)",
            fontSize: 13.5,
          }}>
            <i className="ti ti-bell-off" style={{ fontSize: 36, opacity: 0.5, display: "block", marginBottom: 12 }} />
            Aucune notification
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((n) => {
              const t = TYPES[n.type] || TYPES.systeme;
              return (
                <div
                  key={n.id}
                  className={`notif-item${n.lue ? "" : " unread"}`}
                  onClick={() => clickNotif(n)}
                  title={new Date(n.created_at).toLocaleString("fr-FR")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickNotif(n); } }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: n.lue ? "transparent" : "linear-gradient(90deg, rgba(124,200,200,.08) 0%, transparent 100%)",
                    border: n.lue ? "1px solid var(--av-g200, #e3e9ee)" : "1px solid rgba(124,200,200,.30)",
                    cursor: "pointer",
                    transition: "all 200ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 10px rgba(20,33,49,.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: t.color + "22",
                      color: t.color,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <i className={`ti ${t.ic}`} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: n.lue ? 500 : 700,
                      fontSize: 13.5,
                      color: "var(--av-navy, #142131)",
                      marginBottom: 3,
                    }}>
                      {n.titre}
                    </div>
                    {n.message && (
                      <div style={{
                        fontSize: 12.5,
                        color: "var(--av-g700, #4a5868)",
                        lineHeight: 1.4,
                        marginBottom: 4,
                      }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11,
                      color: "var(--av-g500, #8a98a8)",
                      fontWeight: 500,
                    }}>
                      {relativeTime(n.created_at)}
                    </div>
                  </div>
                  {n.user_id === userId && (
                    <button
                      onClick={(e) => del(e, n)}
                      title="Supprimer cette notification"
                      aria-label="Supprimer cette notification"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                        color: "#8a98a8",
                        flexShrink: 0,
                        borderRadius: 6,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fee";
                        e.currentTarget.style.color = "#c0392b";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#8a98a8";
                      }}
                    >
                      <i className="ti ti-x" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
