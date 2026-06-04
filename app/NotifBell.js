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
import { Drawer } from "./components/ui-premium";

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

  // Charge mes notifications (les miennes + celles "à tous" dans ma collectivité)
  async function load() {
    if (!structureId) return;
    const { data } = await supabase.from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data || []);
  }
  useEffect(() => { if (structureId) load(); }, [structureId]);

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

  return (
    <div className="notif-wrap" ref={ref}>
      <button 
        className="notif-btn" 
        onClick={() => setOpen(!open)} 
        aria-label="Notifications" 
        title="Notifications"
        style={hasNew ? { animation: "aveho-bell-shake .8s ease-in-out 3" } : null}
      >
        <i className="ti ti-bell" style={hasNew ? { color: "#EF9F27" } : null} />
        {nonLues > 0 && <span className="notif-badge">{nonLues > 9 ? "9+" : nonLues}</span>}
      </button>
      <style>{`
        @keyframes aveho-bell-shake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(4deg); }
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
