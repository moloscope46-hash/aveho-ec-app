"use client";
// =============================================================
//  MobileDrawer — Drawer glissant à droite façon Amazon
//  0.65.36 : utilisable pour tous les menus icônes topbar mobile
// =============================================================
import React, { useEffect } from "react";

export default function MobileDrawer({
  open,
  onClose,
  title,
  icon,
  color = "#185FA5",
  children,
  width = 340,
  side = "right",  // right | left
  actions,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    // Lock scroll body
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const slideFrom = side === "right" ? "translateX(100%)" : "translateX(-100%)";
  const slideTo = "translateX(0)";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(12, 22, 34, 0.55)",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          zIndex: 9998,
          animation: "av-drawer-backdrop 200ms ease-out",
        }}
      />

      {/* Drawer */}
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: 0, bottom: 0,
          [side]: 0,
          width,
          maxWidth: "90vw",
          background: "linear-gradient(180deg, #0e1a2a 0%, #142131 100%)",
          borderLeft: side === "right" ? `1px solid ${color}40` : "none",
          borderRight: side === "left" ? `1px solid ${color}40` : "none",
          boxShadow: side === "right"
            ? `-12px 0 40px rgba(0,0,0,.45), -1px 0 0 ${color}40`
            : `12px 0 40px rgba(0,0,0,.45), 1px 0 0 ${color}40`,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Quicksand, sans-serif",
          animation: `av-drawer-slide-${side} 320ms cubic-bezier(.2,.8,.2,1)`,
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Header */}
        <header style={{
          padding: "16px 18px",
          background: `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`,
          borderBottom: `1px solid ${color}40`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Glow accent */}
          <div style={{
            position: "absolute",
            top: -30, right: -30,
            width: 100, height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}50 0%, transparent 70%)`,
            filter: "blur(20px)",
            pointerEvents: "none",
          }} />

          {icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
              boxShadow: `0 4px 12px ${color}50`,
              position: "relative", zIndex: 1,
            }}><i className={`ti ${icon}`} style={{ filter: `drop-shadow(0 0 4px ${color})` }} /></div>
          )}

          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <h2 style={{
              margin: 0, fontSize: 16, fontWeight: 800,
              color: "#fff", letterSpacing: "-0.01em",
            }}>{title}</h2>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,.10)",
              border: "1px solid rgba(255,255,255,.15)",
              color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
              position: "relative", zIndex: 1,
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.10)"}
          ><i className="ti ti-x" /></button>
        </header>

        {/* Content scrollable */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          color: "rgba(255,255,255,.92)",
        }}>{children}</div>

        {/* Footer optional */}
        {actions && (
          <footer style={{
            padding: "12px 16px",
            background: "rgba(0,0,0,.30)",
            borderTop: "1px solid rgba(255,255,255,.06)",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}>{actions}</footer>
        )}
      </aside>

      <style jsx global>{`
        @keyframes av-drawer-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes av-drawer-slide-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes av-drawer-slide-left {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// Composant utilitaire pour liste d'items dans le drawer (style Amazon)
export function DrawerListItem({ icon, label, sublabel, onClick, badge, color = "#185FA5", danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 12,
        color: "#fff",
        cursor: "pointer",
        marginBottom: 8,
        textAlign: "left",
        fontFamily: "Quicksand, sans-serif",
        transition: "all 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}15`;
        e.currentTarget.style.borderColor = `${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,.08)";
      }}
    >
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}25`,
          color: danger ? "#D45E5E" : color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
          filter: `drop-shadow(0 0 4px ${danger ? "#D45E5E" : color}50)`,
        }}><i className={`ti ${icon}`} /></div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginTop: 2 }}>{sublabel}</div>}
      </div>
      {badge != null && (
        <span style={{
          background: `${color}30`,
          color: color,
          border: `1px solid ${color}60`,
          padding: "3px 8px",
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 800,
        }}>{badge}</span>
      )}
      <i className="ti ti-chevron-right" style={{ color: "rgba(255,255,255,.4)" }} />
    </button>
  );
}
