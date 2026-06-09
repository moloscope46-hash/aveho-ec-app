"use client";
// =============================================================
//  ModernCard — Carte glassmorphism premium
//  Variantes : default | accent | gradient | flat
// =============================================================
import React from "react";

export default function ModernCard({
  children,
  color = "#185FA5",
  variant = "default",
  hoverable = true,
  padding = 20,
  className = "",
  style = {},
  onClick,
  badge,
  icon,
  title,
  subtitle,
}) {
  const isClickable = !!onClick;

  const baseStyle = {
    position: "relative",
    borderRadius: 14,
    padding,
    transition: "all 250ms cubic-bezier(.2,.8,.2,1)",
    cursor: isClickable ? "pointer" : "default",
    fontFamily: "Quicksand, sans-serif",
    overflow: "hidden",
    ...style,
  };

  const variants = {
    default: {
      background: "rgba(255,255,255,.06)",
      backdropFilter: "blur(14px) saturate(140%)",
      WebkitBackdropFilter: "blur(14px) saturate(140%)",
      border: "1px solid rgba(255,255,255,.10)",
      boxShadow: "0 4px 16px rgba(0,0,0,.20), 0 0 0 1px rgba(255,255,255,.05) inset",
    },
    accent: {
      background: `linear-gradient(135deg, ${color}1f 0%, rgba(255,255,255,.06) 60%)`,
      backdropFilter: "blur(14px) saturate(140%)",
      WebkitBackdropFilter: "blur(14px) saturate(140%)",
      border: `1px solid ${color}50`,
      boxShadow: `0 4px 16px ${color}30, 0 0 0 1px ${color}20 inset`,
    },
    gradient: {
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      border: "1px solid rgba(255,255,255,.20)",
      boxShadow: `0 8px 24px ${color}50, 0 0 0 1px rgba(255,255,255,.15) inset`,
      color: "#fff",
    },
    flat: {
      background: "#fff",
      border: "1px solid #e3e9ee",
      boxShadow: "0 1px 3px rgba(20,33,49,.05)",
      color: "#142131",
    },
  };

  const handleMouseEnter = (e) => {
    if (hoverable && isClickable) {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = variant === "gradient"
        ? `0 12px 32px ${color}70, 0 0 0 1px rgba(255,255,255,.2) inset`
        : variant === "accent"
        ? `0 8px 24px ${color}50, 0 0 0 1px ${color}40 inset`
        : "0 8px 24px rgba(0,0,0,.30), 0 0 0 1px rgba(255,255,255,.10) inset";
    }
  };

  const handleMouseLeave = (e) => {
    if (hoverable && isClickable) {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = variants[variant].boxShadow;
    }
  };

  return (
    <div
      className={`av-modern-card av-fade-in ${className}`}
      style={{ ...baseStyle, ...variants[variant] }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Barre de couleur en haut si accent */}
      {variant === "accent" && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
        }} />
      )}

      {/* Header optionnel */}
      {(icon || title) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          {icon && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: variant === "gradient" ? "rgba(255,255,255,.20)" : `${color}25`,
              color: variant === "gradient" ? "#fff" : color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}><i className={`ti ${icon}`} /></div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div style={{
              fontSize: 14, fontWeight: 800,
              color: variant === "gradient" ? "#fff" : variant === "flat" ? "#142131" : "rgba(255,255,255,.95)",
            }}>{title}</div>}
            {subtitle && <div style={{
              fontSize: 11, fontWeight: 500, marginTop: 2,
              color: variant === "gradient" ? "rgba(255,255,255,.80)" : variant === "flat" ? "#5a6878" : "rgba(255,255,255,.60)",
            }}>{subtitle}</div>}
          </div>
          {badge && (
            <span style={{
              background: variant === "gradient" ? "rgba(255,255,255,.20)" : `${color}25`,
              color: variant === "gradient" ? "#fff" : color,
              border: variant === "gradient" ? "1px solid rgba(255,255,255,.30)" : `1px solid ${color}40`,
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}>{badge}</span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
