"use client";
// =============================================================
//  EntityPreview — Aperçu rapide générique au hover
//  Alpha 0.39.0
//
//  Wrapper générique réutilisable pour afficher un popover de preview
//  au hover d'un élément. Sert de base pour PatientPreview (0.38),
//  DIPreview (0.39) et AchatPreview (0.39).
//
//  Comportement (commun à toutes les entités) :
//   - Hover desktop (>500ms) → popover apparaît
//   - Clic court → navigation vers la fiche
//   - Sur mobile (touch) → tap = navigation directe (pas de hover)
//   - Positionnement intelligent (bord d'écran)
//
//  Props :
//   - entity : objet de l'entité (patient, DI, achat, etc.)
//   - href : URL de navigation au clic
//   - renderPopover : fonction qui rend le contenu (header + body + footer)
//   - onHover : callback optionnel déclenché à l'ouverture (utile pour fetch async lazy)
//   - disabled : si true, comportement = wrapper transparent
//   - width : largeur du popover (320 par défaut)
//   - children : élément trigger (le nom, le numéro, etc.)
// =============================================================
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const HOVER_DELAY = 500;
const HIDE_DELAY = 150;

export default function EntityPreview({ entity, href, renderPopover, onHover, disabled = false, width = 320, maxHeight = 400, children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const enterTimer = useRef(null);
  const leaveTimer = useRef(null);
  const triggerRef = useRef(null);

  function clearTimers() {
    if (enterTimer.current) { clearTimeout(enterTimer.current); enterTimer.current = null; }
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  }

  function isTouchDevice() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)")?.matches;
  }

  function onMouseEnter() {
    if (disabled || isTouchDevice()) return;
    clearTimers();
    enterTimer.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = rect.left;
        let y = rect.bottom + 6;
        if (x + width > window.innerWidth - 16) {
          x = window.innerWidth - width - 16;
        }
        if (y + maxHeight > window.innerHeight - 16) {
          y = rect.top - maxHeight - 6;
          if (y < 16) y = 16;
        }
        setPosition({ x, y });
      }
      setOpen(true);
      // Alpha 0.39.0 : déclenche le callback de hover (pour fetch async lazy)
      onHover?.();
    }, HOVER_DELAY);
  }

  function onMouseLeave() {
    clearTimers();
    leaveTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY);
  }

  function onClick(e) {
    if (e.target.closest("[data-no-nav]")) return;
    e.preventDefault();
    setOpen(false);
    if (href) router.push(href);
  }

  function navigate() {
    setOpen(false);
    if (href) router.push(href);
  }

  useEffect(() => () => clearTimers(), []);

  if (disabled) return <>{children}</>;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{ cursor: "pointer", display: "inline-block" }}
      >
        {children}
      </span>
      {open && (
        <div
          role="dialog"
          onMouseEnter={() => clearTimers()}
          onMouseLeave={onMouseLeave}
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            width,
            background: "#fff",
            border: "1px solid #e3e9ee",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(20,33,49,.20)",
            zIndex: 9995,
            fontSize: 13,
            lineHeight: 1.4,
            animation: "aveho-popover-fadein .15s ease-out",
            pointerEvents: "auto",
            overflow: "hidden",
          }}
        >
          <style>{`
            @keyframes aveho-popover-fadein {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes aveho-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          {renderPopover({ entity, navigate })}
        </div>
      )}
    </>
  );
}
