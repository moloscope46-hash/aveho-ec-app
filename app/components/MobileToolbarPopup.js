"use client";
// =============================================================
//  MobileToolbarPopup — Popup CENTRE pour menus toolbar mobile
//  0.65.81 : centré au milieu (avant : slide-in droite)
// =============================================================
import { useEffect } from "react";

export default function MobileToolbarPopup({ open, onClose, title, color = "#185FA5", icon = "ti-shopping-cart", children, width = 420 }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: "rgba(10,20,30,.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",  // CENTRE
      padding: 16, animation: "av-mtp-fade 180ms ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: width, maxHeight: "88vh",
        background: "#fff", borderRadius: 20,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,.35)",
        animation: "av-mtp-pop 220ms cubic-bezier(.2,.7,.3,1)",
        fontFamily: "Quicksand, sans-serif",
      }}>
        <div style={{
          padding: "16px 18px",
          borderBottom: "1px solid #e8edf2",
          background: `linear-gradient(135deg, ${color}15, transparent)`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 12px ${color}40` }}>
            <i className={`ti ${icon}`} />
          </div>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#142131" }}>{title}</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: "#f0f4f8", border: "none", cursor: "pointer", fontSize: 18, color: "#5a6878" }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {children}
        </div>
      </div>
      <style jsx global>{`
        @keyframes av-mtp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes av-mtp-pop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
