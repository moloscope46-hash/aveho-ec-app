"use client";
// =============================================================
//  MobileToolbarPopup — Popup full-screen pour menus toolbar mobile
//  S'ouvre en pleine page (slide-in droite) au lieu de petits dropdowns
//  Utilisé pour panier, notifs, profil, search en mode mobile
// =============================================================
import { useEffect } from "react";

export default function MobileToolbarPopup({ open, onClose, title, color = "#185FA5", icon = "ti-shopping-cart", children }) {
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
      background: "rgba(10,20,30,.55)", backdropFilter: "blur(8px)",
      display: "flex", justifyContent: "flex-end",
      animation: "av-mtp-fade 180ms ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, height: "100vh",
        background: "linear-gradient(180deg, #142131 0%, #0e1a2a 100%)",
        boxShadow: "-12px 0 32px rgba(0,0,0,.4)",
        borderLeft: `1px solid ${color}40`,
        animation: "av-mtp-slide 220ms cubic-bezier(.2,.7,.3,1)",
        display: "flex", flexDirection: "column",
        color: "#fff", fontFamily: "Quicksand, sans-serif",
      }}>
        <div style={{
          padding: "16px 20px",
          background: `linear-gradient(135deg, ${color}20, transparent)`,
          borderBottom: `1px solid ${color}40`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${color}, ${color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            <i className={`ti ${icon}`} />
          </div>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>{children}</div>
      </div>
      <style jsx global>{`
        @keyframes av-mtp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes av-mtp-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
