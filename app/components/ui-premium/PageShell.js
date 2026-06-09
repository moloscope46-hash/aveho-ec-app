"use client";
// =============================================================
//  PageShell + ModernCard + ModernModal + ModalBtn + HiTechIconBox
//  0.65.50 — Composants UI premium réutilisables
// =============================================================
import { useEffect } from "react";

export function PageShell({ color = "#7CC8C8", icon = "ti-square", title, subtitle, badge, actions, children }) {
  return (
    <div style={{
      minHeight: "calc(100vh - 60px)",
      padding: "20px 28px 60px",
      background: "linear-gradient(180deg, #0e1a2a 0%, #142131 100%)",
      fontFamily: "Quicksand, sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, boxShadow: `0 6px 16px ${color}50`,
        }}>
          <i className={`ti ${icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</h1>
          {subtitle && <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {badge && (
          <span style={{
            background: `${color}25`, color, border: `1px solid ${color}50`,
            padding: "5px 12px", borderRadius: 10, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5,
          }}>{badge}</span>
        )}
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ModernCard({ color = "#7CC8C8", variant = "default", icon, title, padding = 16, hoverable, children, onClick, style }) {
  const isAccent = variant === "accent";
  return (
    <div onClick={onClick} style={{
      background: isAccent
        ? `linear-gradient(135deg, ${color}15, ${color}05)`
        : "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
      border: `1px solid ${isAccent ? color + "30" : "rgba(255,255,255,.08)"}`,
      borderRadius: 14,
      padding: typeof padding === "number" ? padding : 16,
      cursor: onClick || hoverable ? "pointer" : "default",
      transition: "all 200ms",
      ...style,
    }}
    onMouseEnter={(e) => { if (hoverable || onClick) e.currentTarget.style.transform = "translateY(-1px)"; }}
    onMouseLeave={(e) => { if (hoverable || onClick) e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {(icon || title) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: children ? 10 : 0 }}>
          {icon && (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}25`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              <i className={`ti ${icon}`} />
            </div>
          )}
          {title && <h3 style={{ margin: 0, color: "#fff", fontSize: 14, fontWeight: 800 }}>{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
}

export function ModernModal({ open, onClose, color = "#7CC8C8", icon = "ti-info-circle", title, subtitle, size = "md", actions, children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 440, md: 640, lg: 820, xl: 1100 };
  const maxW = widths[size] || widths.md;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9990,
      background: "rgba(12,22,34,.65)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: 24, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: maxW,
        fontFamily: "Quicksand, sans-serif",
        boxShadow: "0 25px 80px rgba(0,0,0,.5)",
        animation: "av-modal-in 220ms cubic-bezier(.2,.8,.2,1)",
        margin: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e3e9ee", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 10px ${color}50` }}>
            <i className={`ti ${icon}`} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: "#142131", fontSize: 17, fontWeight: 800 }}>{title}</h2>
            {subtitle && <div style={{ color: "#5a6878", fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#5a6878", fontSize: 22, cursor: "pointer", padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: 24 }}>{children}</div>
        {/* Actions */}
        {actions && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #e3e9ee", display: "flex", gap: 8, justifyContent: "flex-end", background: "#f7f9fb", borderRadius: "0 0 16px 16px" }}>
            {actions}
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes av-modal-in {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .av-modal-input, .av-modal-input input, .av-modal-input select, .av-modal-input textarea { font-family: Quicksand, sans-serif; }
      `}</style>
    </div>
  );
}

export function ModalBtn({ variant = "secondary", color = "#7CC8C8", icon, onClick, disabled, children }) {
  const isPrimary = variant === "primary";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "10px 18px", borderRadius: 10,
      background: isPrimary ? `linear-gradient(135deg, ${color}, ${color}cc)` : "#fff",
      color: isPrimary ? "#fff" : "#142131",
      border: isPrimary ? "none" : "1px solid #d3dce5",
      fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      boxShadow: isPrimary ? `0 4px 12px ${color}50` : "none",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      {icon && <i className={`ti ${icon}`} />}
      {children}
    </button>
  );
}

export function HiTechIconBox({ name = "ti-square", color = "#7CC8C8", variant = "default", size = 40, pulse }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 4,
      background: variant === "gradient"
        ? `linear-gradient(135deg, ${color}, ${color}cc)`
        : `${color}25`,
      color: variant === "gradient" ? "#fff" : color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.45,
      boxShadow: variant === "gradient" ? `0 4px 12px ${color}50` : "none",
      animation: pulse ? "av-hi-pulse 1.5s ease-in-out infinite" : "none",
      flexShrink: 0,
    }}>
      <i className={`ti ${name}`} />
      <style jsx global>{`
        @keyframes av-hi-pulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor, 0 4px 12px ${color}50; }
          50% { box-shadow: 0 0 0 6px transparent, 0 4px 12px ${color}50; }
        }
      `}</style>
    </div>
  );
}
