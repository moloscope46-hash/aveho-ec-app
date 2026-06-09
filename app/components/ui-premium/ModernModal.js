"use client";
// =============================================================
//  ModernModal — Modale premium glassmorphism
//  Animation scale + fade, backdrop blur, header coloré
// =============================================================
import React, { useEffect } from "react";

export default function ModernModal({
  open,
  onClose,
  color = "#185FA5",
  icon = "ti-circle",
  title,
  subtitle,
  children,
  actions,
  size = "md",  // sm | md | lg | xl
  closeOnBackdrop = true,
}) {
  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 420,
    md: 560,
    lg: 760,
    xl: 960,
  };

  return (
    <div
      onClick={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(12, 22, 34, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "av-modal-backdrop-in 200ms ease-out",
        fontFamily: "Quicksand, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(255,255,255,.98)",
          borderRadius: 18,
          width: "100%",
          maxWidth: sizes[size],
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: `0 25px 80px rgba(0,0,0,.5), 0 0 0 1px ${color}40`,
          animation: "av-modal-pop-in 280ms cubic-bezier(.2,.8,.2,1)",
          overflow: "hidden",
        }}
      >
        {/* HEADER avec gradient color */}
        <header style={{
          padding: "18px 22px",
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Effet lumineux subtil */}
          <div style={{
            position: "absolute",
            top: -40, right: -40,
            width: 120, height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,.2) 0%, transparent 70%)",
          }} />

          <div style={{
            width: 44, height: 44,
            borderRadius: 12,
            background: "rgba(255,255,255,.20)",
            border: "1px solid rgba(255,255,255,.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}><i className={`ti ${icon}`} /></div>

          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <h2 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              textShadow: "0 1px 2px rgba(0,0,0,.2)",
            }}>{title}</h2>
            {subtitle && <div style={{
              fontSize: 12,
              color: "rgba(255,255,255,.85)",
              marginTop: 2,
              fontWeight: 500,
            }}>{subtitle}</div>}
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32, height: 32,
              borderRadius: 10,
              background: "rgba(255,255,255,.18)",
              border: "1px solid rgba(255,255,255,.25)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.30)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
          ><i className="ti ti-x" /></button>
        </header>

        {/* BODY */}
        <div style={{
          padding: 22,
          overflowY: "auto",
          flex: 1,
          color: "#142131",
        }}>{children}</div>

        {/* FOOTER avec actions */}
        {actions && (
          <footer style={{
            padding: "14px 22px",
            background: "#f4f7fa",
            borderTop: "1px solid #e3e9ee",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
          }}>{actions}</footer>
        )}
      </div>

      <style jsx global>{`
        @keyframes av-modal-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes av-modal-pop-in {
          from { opacity: 0; transform: scale(.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Bouton modal réutilisable
export function ModalBtn({ children, variant = "primary", color = "#185FA5", onClick, disabled, icon, type = "button" }) {
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      color: "#fff",
      border: `1px solid ${color}`,
      boxShadow: `0 4px 12px ${color}40`,
    },
    secondary: {
      background: "#fff",
      color: "#142131",
      border: "1px solid #d3dce5",
      boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    },
    danger: {
      background: "linear-gradient(135deg, #D45E5E 0%, #b54545 100%)",
      color: "#fff",
      border: "1px solid #D45E5E",
      boxShadow: "0 4px 12px rgba(212,94,94,.4)",
    },
    ghost: {
      background: "transparent",
      color: "#142131",
      border: "1px solid transparent",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 18px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "Quicksand, sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 150ms",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...variants[variant],
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.transform = "translateY(0)")}
    >
      {icon && <i className={`ti ${icon}`} />}
      {children}
    </button>
  );
}
