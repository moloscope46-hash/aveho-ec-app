"use client";
// =============================================================
//  components/NotifCenter.js (0.62.128)
//
//  Centre de notifications enrichi avec :
//  - Onglets : Tout / Non lu / Mes équipes / Archivé
//  - Marquer tout lu, archiver, voir détail
//  - Compteur non-lu animé
//  - Click sur notif → navigation contextuelle
// =============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

const TABS = [
  { k: "unread", l: "Non lu", ic: "ti-mail" },
  { k: "all", l: "Tout", ic: "ti-list" },
  { k: "mine", l: "Mes équipes", ic: "ti-users-group" },
  { k: "archived", l: "Archivé", ic: "ti-archive" },
];

export default function NotifCenter({ structureId, userId, onClose }) {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState("unread");
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    if (!structureId || !userId) return;
    setLoading(true);
    try {
      let q = supabase.from("notifications").select("*").eq("structure_id", structureId);
      if (tab === "unread") q = q.eq("lu", false).eq("archive", false);
      else if (tab === "all") q = q.eq("archive", false);
      else if (tab === "mine") q = q.eq("user_id", userId).eq("archive", false);
      else if (tab === "archived") q = q.eq("archive", true);

      const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
      if (!error) setNotifs(data || []);
    } finally { setLoading(false); }
  }, [supabase, structureId, userId, tab]);

  useEffect(() => { load(); }, [load]);

  async function markRead(notif) {
    if (notif.lu) return;
    await supabase.from("notifications").update({ lu: true, read_at: new Date().toISOString() }).eq("id", notif.id);
    setNotifs(ns => ns.map(n => n.id === notif.id ? { ...n, lu: true } : n));
  }

  async function archive(notif) {
    await supabase.from("notifications").update({ archive: true }).eq("id", notif.id);
    setNotifs(ns => ns.filter(n => n.id !== notif.id));
  }

  async function markAllRead() {
    const unread = notifs.filter(n => !n.lu);
    if (unread.length === 0) return;
    if (!confirm(`Marquer ${unread.length} notifications comme lues ?`)) return;
    await supabase.from("notifications").update({ lu: true, read_at: new Date().toISOString() })
      .in("id", unread.map(n => n.id));
    setNotifs(ns => ns.map(n => ({ ...n, lu: true })));
  }

  const filtered = filter ? notifs.filter(n =>
    (n.titre || "").toLowerCase().includes(filter.toLowerCase()) ||
    (n.message || "").toLowerCase().includes(filter.toLowerCase())
  ) : notifs;

  const unreadCount = notifs.filter(n => !n.lu).length;

  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      width: 420,
      maxWidth: "calc(100vw - 20px)",
      maxHeight: "70vh",
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 12px 36px rgba(20, 33, 49, .18)",
      border: "1px solid #e3e9ee",
      zIndex: 200,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      animation: "av-fade-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #fafbfc, #fff)",
        borderBottom: "1px solid #e3e9ee",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <i className="ti ti-bell" style={{ fontSize: 18, color: "#185FA5" }} />
        <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>Notifications</h3>
        {unreadCount > 0 && <span style={{
          background: "#e35d5b",
          color: "#fff",
          padding: "1px 8px",
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 700,
        }}>{unreadCount} non lu{unreadCount > 1 ? "s" : ""}</span>}
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11, background: "rgba(124, 200, 200, .2)", color: "#1c5454", border: "1px solid rgba(124, 200, 200, .4)", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            <i className="ti ti-checks" /> Tout lu
          </button>
        )}
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#8a98a8", cursor: "pointer", padding: 4, fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #e3e9ee",
        background: "#fff",
      }}>
        {TABS.map(t => {
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{
                flex: 1,
                padding: "10px 8px",
                background: active ? "linear-gradient(180deg, rgba(24, 95, 165, .08), transparent)" : "transparent",
                border: "none",
                borderBottom: active ? "2px solid #185FA5" : "2px solid transparent",
                color: active ? "#185FA5" : "#5a6878",
                fontWeight: active ? 700 : 500,
                fontSize: 11.5,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                transition: "all 150ms",
              }}>
              <i className={`ti ${t.ic}`} /> {t.l}
            </button>
          );
        })}
      </div>

      {/* Filter input */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f3f6" }}>
        <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 Filtrer les notifications..."
          style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 8, fontSize: 12, fontFamily: "inherit" }} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "#8a98a8", fontSize: 13 }}>
            <i className="ti ti-loader-2" style={{ animation: "av-spinner-spin 0.85s linear infinite", fontSize: 20 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>
            <i className="ti ti-bell-off" style={{ fontSize: 30, display: "block", marginBottom: 6, color: "#cfd8e0" }} />
            {filter ? "Aucune notification ne correspond" : tab === "unread" ? "Tout est lu !" : tab === "archived" ? "Aucune archive" : "Pas de notification"}
          </div>
        ) : (
          filtered.map(notif => (
            <div key={notif.id}
              onClick={() => {
                markRead(notif);
                if (notif.link) router.push(notif.link);
              }}
              style={{
                padding: "10px 12px",
                margin: "4px 2px",
                background: notif.lu ? "#fff" : "linear-gradient(135deg, #eef6fc, #fff)",
                borderRadius: 10,
                border: notif.lu ? "1px solid #f0f3f6" : "1px solid rgba(24, 95, 165, .25)",
                borderLeft: `4px solid ${notif.lu ? "#cfd8e0" : "#185FA5"}`,
                cursor: "pointer",
                position: "relative",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <i className={`ti ${notif.icone || "ti-info-circle"}`}
                  style={{ color: notif.couleur || "#185FA5", fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: notif.lu ? 500 : 700, fontSize: 12.5, color: "#142131", marginBottom: 1 }}>
                    {notif.titre}
                  </div>
                  {notif.message && (
                    <div style={{ fontSize: 11, color: "#5a6878", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {notif.message}
                    </div>
                  )}
                  <div style={{ fontSize: 9.5, color: "#8a98a8", marginTop: 3 }}>
                    {relativeTime(notif.created_at)}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); archive(notif); }}
                  title="Archiver"
                  style={{ background: "transparent", border: "none", color: "#8a98a8", cursor: "pointer", padding: 2, fontSize: 13, opacity: 0.6 }}>
                  <i className="ti ti-archive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 0.62.130 : Footer prefs son + notification native */}
      <NotifPrefsFooter />
    </div>
  );
}

// 0.62.130 : Footer paramétrage sons + notifications natives
function NotifPrefsFooter() {
  const [prefs, setPrefsState] = useState({ sound: true, native: true });
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    import("../../lib/notifSounds").then(({ getNotifPrefs }) => {
      setPrefsState(getNotifPrefs());
    });
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  async function toggle(key) {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefsState(newPrefs);
    const { setNotifPrefs, requestNotifPermission } = await import("../../lib/notifSounds");
    setNotifPrefs(newPrefs);
    if (key === "native" && newPrefs.native && permission !== "granted") {
      const res = await requestNotifPermission();
      setPermission(res);
    }
  }

  async function testSound() {
    const { playNotifSound } = await import("../../lib/notifSounds");
    playNotifSound("success");
  }

  return (
    <div style={{
      padding: "8px 12px",
      borderTop: "1px solid #e3e9ee",
      background: "#fafbfc",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 10.5,
      color: "#5a6878",
    }}>
      <button onClick={() => toggle("sound")} title={prefs.sound ? "Désactiver les sons" : "Activer les sons"}
        style={{
          padding: "4px 8px",
          background: prefs.sound ? "rgba(124, 200, 200, .15)" : "transparent",
          color: prefs.sound ? "#1c5454" : "#8a98a8",
          border: prefs.sound ? "1px solid rgba(124, 200, 200, .35)" : "1px solid #e3e9ee",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 10.5,
          fontFamily: "inherit",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}>
        <i className={`ti ${prefs.sound ? "ti-volume" : "ti-volume-off"}`} />
        Son
      </button>
      <button onClick={() => toggle("native")} title={prefs.native ? "Désactiver les notifications navigateur" : "Activer"}
        style={{
          padding: "4px 8px",
          background: prefs.native ? "rgba(24, 95, 165, .15)" : "transparent",
          color: prefs.native ? "#185FA5" : "#8a98a8",
          border: prefs.native ? "1px solid rgba(24, 95, 165, .35)" : "1px solid #e3e9ee",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 10.5,
          fontFamily: "inherit",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}>
        <i className={`ti ${prefs.native ? "ti-bell" : "ti-bell-off"}`} />
        Native
        {permission === "denied" && <span title="Permission refusée" style={{ color: "#e35d5b", marginLeft: 2 }}>✕</span>}
      </button>
      <button onClick={testSound} title="Tester le son"
        style={{ padding: "4px 8px", background: "transparent", border: "1px dashed #cfd8e0", borderRadius: 6, cursor: "pointer", fontSize: 10.5, color: "#5a6878", fontFamily: "inherit", marginLeft: "auto" }}>
        <i className="ti ti-music" /> Test
      </button>
    </div>
  );
}

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR");
}
