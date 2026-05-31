"use client";
// =============================================================
//  FocusMode — Mode focus (Esc Esc pour fermer tout)
//  Alpha 0.52.0 (BG)
//
//  Détecte un double-Esc rapproché (< 500ms) qui :
//   1. Ferme toutes les modales, dropdowns, overlays
//   2. Affiche un mini-flash visuel "Mode focus activé"
//   3. Scroll vers le haut de la page
//
//  Comportement isolé : ne ferme PAS les input/textarea où l'user
//  pourrait être en train de taper.
// =============================================================
import { useEffect, useState } from "react";

export default function FocusMode() {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastEsc = 0;

    function onKeyDown(e) {
      // Ignorer si on est dans un champ texte
      const target = e.target;
      const isTextInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if (e.key === "Escape") {
        const now = Date.now();
        const isDoubleEsc = now - lastEsc < 500 && lastEsc > 0;
        lastEsc = now;
        
        if (isDoubleEsc && !isTextInput) {
          // Mode focus : tout fermer
          e.preventDefault();
          
          // Fermer modales / overlays connus
          const modals = document.querySelectorAll(".modal-bg, [role='dialog']");
          modals.forEach(m => {
            // Si le modal a un bouton close, le cliquer
            const closeBtn = m.querySelector("[aria-label*='Fermer'], [aria-label*='close']");
            if (closeBtn) closeBtn.click();
          });
          
          // Fermer dropdown menus connus (data attribute ou classes habituelles)
          document.querySelectorAll(".um-backdrop, .menu-overlay.open").forEach(b => {
            if (b.click) b.click();
          });
          
          // Blur l'élément actif
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
          
          // Scroll en haut
          window.scrollTo({ top: 0, behavior: "smooth" });
          
          // Flash visuel
          setFlash(true);
          setTimeout(() => setFlash(false), 1200);
          
          lastEsc = 0;  // Reset pour éviter triple-Esc
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!flash) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        background: "linear-gradient(135deg, #5aa05a 0%, #2e6f33 100%)",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 24,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(20,33,49,.25)",
        zIndex: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        animation: "focus-fade .25s ease-out",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes focus-fade {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <i className="ti ti-zoom-cancel" aria-hidden="true" />
      Mode focus — tout fermé
    </div>
  );
}
