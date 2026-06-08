"use client";
// =============================================================
//  components/NotifBellEnhanced.js (0.62.129)
//
//  Wrapper qui combine la cloche TopBar existante avec le
//  nouveau NotifCenter enrichi en panel ouvert.
//
//  Click cloche → ouvre/ferme le NotifCenter (panel 420px avec
//  onglets Non lu / Tout / Mes équipes / Archivé + filtre).
// =============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "../../lib/supabase";
import NotifCenter from "./NotifCenter";

export default function NotifBellEnhanced({ structureId, userId }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef(null);

  // Fetch count non-lu
  const loadCount = useCallback(async () => {
    if (!structureId) return;
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("structure_id", structureId)
        .eq("lu", false)
        .eq("archive", false);
      if (!error) {
        setUnreadCount(prev => {
          // 0.62.130 : si nouvelle notif détectée, son + notification native
          if (count > prev && prev > 0) {
            import("../../lib/notifSounds").then(({ notify }) => {
              notify("Nouvelle notification", `${count - prev} nouvelle${count - prev > 1 ? "s" : ""} notification${count - prev > 1 ? "s" : ""}`, { type: "info" });
            }).catch(() => {});
          }
          return count || 0;
        });
      }
    } catch {
      setUnreadCount(0);
    }
  }, [supabase, structureId]);

  useEffect(() => {
    loadCount();
    // Refresh count toutes les 30s
    const it = setInterval(loadCount, 30 * 1000);
    return () => clearInterval(it);
  }, [loadCount]);

  // Click outside pour fermer
  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Refresh count quand le panel se ferme (peut-être que tout a été marqué lu)
  useEffect(() => {
    if (!open) loadCount();
  }, [open, loadCount]);

  return (
    <div ref={wrapRef} className="notif-bell-enhanced" style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        title="Notifications"
        style={{
          position: "relative",
          background: open ? "rgba(124, 200, 200, .2)" : "transparent",
          border: open ? "1px solid rgba(124, 200, 200, .4)" : "1px solid transparent",
          borderRadius: 10,
          padding: "6px 10px",
          color: "#fff",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 18,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 200ms",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "rgba(255, 255, 255, .08)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <i className={`ti ${unreadCount > 0 ? "ti-bell-ringing" : "ti-bell"}`} style={{
          animation: unreadCount > 0 ? "av-bell-shake 4s ease-in-out infinite" : "none",
        }} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            background: "linear-gradient(135deg, #e35d5b, #c0392b)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 9,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(227, 93, 91, .4)",
            border: "1.5px solid #142131",
            animation: "av-pulse-badge 2s ease-in-out infinite",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotifCenter
          structureId={structureId}
          userId={userId}
          onClose={() => setOpen(false)}
        />
      )}

      <style jsx global>{`
        @keyframes av-bell-shake {
          0%, 90%, 100% { transform: rotate(0); }
          92% { transform: rotate(-8deg); }
          94% { transform: rotate(8deg); }
          96% { transform: rotate(-6deg); }
          98% { transform: rotate(4deg); }
        }
        @keyframes av-pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); box-shadow: 0 2px 10px rgba(227, 93, 91, .6); }
        }
        @keyframes av-fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
