"use client";
// =============================================================
//  CenteredModal — Modal CENTRÉ au milieu de l'écran
//  Plus besoin de scroller pour le trouver
// =============================================================
import { useEffect } from "react";

export default function CenteredModal({ open, onClose, title, icon, color = "#185FA5", width = 600, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9500,
      background: "rgba(20,33,49,.55)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      animation: "av-cm-fade 180ms ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 20,
        width: "100%", maxWidth: width, maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(0,0,0,.3)",
        animation: "av-cm-scale 220ms cubic-bezier(.2,.7,.3,1)",
        fontFamily: "Quicksand, sans-serif",
        overflow: "hidden",
      }}>
        {(title || icon) && (
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e8edf2",
            background: `linear-gradient(135deg, ${color}10, transparent)`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            {icon && (
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <i className={`ti ${icon}`} />
              </div>
            )}
            <div style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#142131" }}>{title}</div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: "#f0f4f8", border: "none", cursor: "pointer", fontSize: 18, color: "#5a6878" }}>
              <i className="ti ti-x" />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: "1px solid #e8edf2", background: "#fafbfc", display: "flex", gap: 10, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
      <style jsx global>{`
        @keyframes av-cm-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes av-cm-scale { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
