"use client";
// =============================================================
//  app/components/Modal.js (Alpha 0.55.26)
//
//  Composant Modal réutilisable pour réduire le boilerplate.
//  Encapsule : backdrop, container, header coloré, body
//  scrollable, footer optionnel, Escape pour fermer.
//
//  Usage :
//    <Modal
//      open={!!myModal}
//      onClose={() => setMyModal(null)}
//      title="Mon titre"
//      icon="ti-info-circle"
//      color="#185FA5"
//      maxWidth={680}
//      footer={<button onClick={save}>Enregistrer</button>}
//    >
//      <div>Contenu...</div>
//    </Modal>
// =============================================================

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon = "ti-info-circle",
  color = "#185FA5",
  maxWidth = 680,
  maxHeight = "92vh",
  children,
  footer,
  preventBackdropClose = false,
  zIndex = 9990,
  // Variante bottom-sheet pour mobile
  variant = "centered", // 'centered' | 'bottom-sheet'
}) {
  // 0.58.19 : guard hydratation pour Portal (document.body indispo en SSR)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Escape pour fermer
  useEffect(() => {
    if (!open || preventBackdropClose) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, preventBackdropClose]);

  if (!open || !mounted) return null;

  const isBottomSheet = variant === "bottom-sheet";

  // 0.58.19 : Portal vers document.body pour échapper à tout containing block
  // (PageTransition, transform, will-change, etc.) qui empêcherait le position:fixed
  // de fonctionner correctement sur mobile en bas de page.
  return createPortal((
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventBackdropClose) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,33,49,.7)",
        zIndex,
        display: "flex",
        alignItems: isBottomSheet ? "flex-end" : "center",
        justifyContent: "center",
        padding: isBottomSheet ? 0 : "20px 14px",
        animation: "modalFadeIn 0.2s",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: isBottomSheet ? "16px 16px 0 0" : 14,
          width: "100%",
          maxWidth: isBottomSheet ? "100%" : maxWidth,
          maxHeight: isBottomSheet ? "85vh" : maxHeight,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          overflow: "hidden",
          animation: isBottomSheet ? "modalSlideUp 0.25s ease-out" : "modalIn 0.25s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        {/* Header */}
        {title && (
          <div style={{
            background: `linear-gradient(135deg, #142131 0%, ${color} 100%)`,
            color: "#fff",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}>
            {icon && (
              <i className={`ti ${icon}`} style={{ fontSize: 22, flexShrink: 0, opacity: 0.9 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.85)", marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={{
                background: "transparent",
                color: "#fff",
                border: "none",
                padding: 6,
                cursor: "pointer",
                fontSize: 22,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            background: "#f4f7fa",
            borderTop: "1px solid #e3e9ee",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
            flexWrap: "wrap",
          }}>
            {footer}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  ), document.body);
}
