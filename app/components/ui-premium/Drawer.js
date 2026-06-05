"use client";
// =============================================================
//  Drawer — Panneau latéral coulissant (0.58.12)
//
//  Alternative au Modal pour les longs formulaires ou les vues
//  de détails. Glisse depuis la droite (ou la gauche) avec un
//  backdrop semi-transparent. Largeur configurable.
//
//  Usage :
//    const [open, setOpen] = useState(false);
//    <Drawer
//      open={open}
//      onClose={() => setOpen(false)}
//      title="Modifier le patient"
//      subtitle="Patient #1234 — M. Dupont"
//      side="right"        // "right" | "left" (défaut "right")
//      width={480}         // ou size="md" → 480
//      footer={<><button>Annuler</button><button>Enregistrer</button></>}
//    >
//      <form>...</form>
//    </Drawer>
// =============================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  color,                // couleur du header (défaut navy)
  side = "right",       // "right" | "left"
  size = "md",          // "sm" 360 | "md" 480 | "lg" 640 | "xl" 800
  width,                // override exact en px (prioritaire sur size)
  footer,
  children,
  closeOnBackdrop = true,
  ariaLabel,
  // 0.58.22 : Skeleton automatique pendant le chargement
  loading = false,
}) {
  const dialogRef = useRef(null);
  // 0.58.19 : guard hydratation pour Portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    setTimeout(() => {
      const first = dialogRef.current?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      first?.focus?.();
    }, 100);

    function onKey(ev) {
      if (ev.key === "Escape") { ev.preventDefault(); onClose?.(); return; }
      if (ev.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);

    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const widths = { sm: 360, md: 480, lg: 640, xl: 800 };
  const finalWidth = width || widths[size] || widths.md;
  const isRight = side === "right";

  // 0.58.19 : Portal vers document.body — évite que les containing blocks
  // d'ancêtres (PageTransition, transforms, etc.) cassent le position: fixed.
  return createPortal((
    <div
      onClick={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,24,34,.55)",
        backdropFilter: "blur(6px) saturate(140%)",
        WebkitBackdropFilter: "blur(6px) saturate(140%)",
        zIndex: 85,
        animation: "av-drawer-bg-in 220ms cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || "Panneau latéral"}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [isRight ? "right" : "left"]: 0,
          // 0.58.19 : largeur adaptative — full-width sur mobile, finalWidth sinon
          // Si viewport ≤ 600px, le drawer occupe 100% (95% pour laisser tap-zone backdrop)
          width: `min(${finalWidth}px, 100%)`,
          maxWidth: "100vw",
          background: "var(--av-g0, #fff)",
          display: "flex",
          flexDirection: "column",
          boxShadow: isRight
            ? "-30px 0 60px rgba(20,33,49,.30), -12px 0 24px rgba(20,33,49,.18)"
            : "30px 0 60px rgba(20,33,49,.30), 12px 0 24px rgba(20,33,49,.18)",
          animation: `av-drawer-slide-${isRight ? "right" : "left"} 320ms cubic-bezier(.2,.8,.2,1)`,
        }}
        className="av-drawer-panel"
      >
        {/* Header */}
        <div style={{
          flexShrink: 0,
          padding: "18px 22px",
          background: color || "#142131",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Brillance subtile sur bord haut */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)",
            pointerEvents: "none",
          }} />
          {/* Decorative radial */}
          <div style={{
            position: "absolute",
            top: -40,
            [isRight ? "left" : "right"]: -40,
            width: 140,
            height: 140,
            background: "radial-gradient(circle, rgba(255,255,255,.18) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }} />

          <span style={{
            position: "relative",
            zIndex: 1,
            width: 38, height: 38,
            borderRadius: 11,
            background: "rgba(255,255,255,.20)",
            border: "1px solid rgba(255,255,255,.18)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
            boxShadow: "inset 0 -2px 4px rgba(0,0,0,.12)",
            flexShrink: 0,
          }}>
            <i className={`ti ${icon || "ti-layout-sidebar"}`} aria-hidden="true" />
          </span>

          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{
                fontSize: 12,
                fontWeight: 500,
                opacity: 0.85,
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {subtitle}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer le panneau"
            style={{
              position: "relative",
              zIndex: 1,
              background: "rgba(255,255,255,.14)",
              border: "1px solid rgba(255,255,255,.10)",
              color: "#fff",
              width: 34, height: 34,
              borderRadius: 10,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              transition: "all 200ms",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.28)";
              e.currentTarget.style.transform = "rotate(90deg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.14)";
              e.currentTarget.style.transform = "rotate(0)";
            }}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {/* Body scrollable */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "22px 24px",
        }}>
          {loading ? <DrawerSkeleton /> : children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            flexShrink: 0,
            padding: "14px 22px 18px",
            borderTop: "1px solid #eef1f4",
            background: "linear-gradient(180deg, #fafbfc 0%, #f4f7fa 100%)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}

// =============================================================
//  0.58.22 : DrawerSkeleton - shimmer pendant chargement
// =============================================================
function DrawerSkeleton() {
  return (
    <div className="av-drawer-skel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header skel : titre + sous-titre */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--av-g200, #e3e9ee)" }}>
        <div className="av-skel-line" style={{ width: "55%", height: 22 }} />
        <div className="av-skel-line" style={{ width: "75%", height: 14 }} />
      </div>

      {/* 2 sections avec label + 2 lignes */}
      {[0, 1].map((i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="av-skel-line" style={{ width: 100, height: 11 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="av-skel-line" style={{ width: "100%", height: 16 }} />
            <div className="av-skel-line" style={{ width: "78%", height: 16 }} />
          </div>
        </div>
      ))}

      {/* Block grid (mini cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            background: "var(--av-g50, #f4f7fa)",
            borderRadius: 10,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
            <div className="av-skel-line" style={{ width: "60%", height: 10 }} />
            <div className="av-skel-line" style={{ width: "80%", height: 18 }} />
          </div>
        ))}
      </div>

      {/* Long paragraph */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
        <div className="av-skel-line" style={{ width: "100%", height: 12 }} />
        <div className="av-skel-line" style={{ width: "92%", height: 12 }} />
        <div className="av-skel-line" style={{ width: "85%", height: 12 }} />
        <div className="av-skel-line" style={{ width: "68%", height: 12 }} />
      </div>
    </div>
  );
}

