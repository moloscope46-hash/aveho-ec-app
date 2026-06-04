"use client";
// =============================================================
//  useDropdownPosition — Hook pour auto-flip up des dropdowns (0.58.16)
//
//  Détecte si le trigger est dans la moitié basse du viewport.
//  Si oui, le dropdown s'ouvre vers le HAUT (bottom: calc(100% + 6px))
//  au lieu du bas (top: calc(100% + 6px)).
//
//  Évite que les dropdowns soient coupés ou masqués par le bord
//  inférieur du viewport, surtout dans les modales et formulaires
//  en bas de page.
//
//  Usage :
//    const triggerRef = useRef(null);
//    const flipUp = useDropdownPosition(triggerRef, open, { maxHeight: 320 });
//
//    <div ref={triggerRef}>
//      <button>Trigger</button>
//      {open && (
//        <div style={{
//          position: "absolute",
//          ...(flipUp
//            ? { bottom: "calc(100% + 6px)" }
//            : { top: "calc(100% + 6px)" }),
//        }}>
//          ...
//        </div>
//      )}
//    </div>
// =============================================================

import { useState, useEffect } from "react";

export function useDropdownPosition(triggerRef, open, options = {}) {
  const { maxHeight = 320, margin = 16 } = options;
  const [flipUp, setFlipUp] = useState(false);

  useEffect(() => {
    if (!open || !triggerRef?.current) return;

    function computeFlip() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vh = window.innerHeight;
      // Espace disponible sous le trigger
      const spaceBelow = vh - rect.bottom - margin;
      // Espace disponible au-dessus du trigger
      const spaceAbove = rect.top - margin;
      // On flip vers le haut si :
      //   1. l'espace en-dessous est insuffisant (< maxHeight)
      //   2. ET l'espace au-dessus est plus grand que celui en-dessous
      const shouldFlip = spaceBelow < maxHeight && spaceAbove > spaceBelow;
      setFlipUp(shouldFlip);
    }

    computeFlip();

    // Recalculer en cas de scroll ou resize pendant que le dropdown est ouvert
    const opts = { passive: true };
    window.addEventListener("scroll", computeFlip, opts);
    window.addEventListener("resize", computeFlip, opts);

    return () => {
      window.removeEventListener("scroll", computeFlip, opts);
      window.removeEventListener("resize", computeFlip, opts);
    };
  }, [open, triggerRef, maxHeight, margin]);

  return flipUp;
}

/**
 * Helper : retourne le style à appliquer au dropdown selon flipUp.
 * Permet de garder un code uniforme dans tous les composants.
 */
export function dropdownPositionStyle(flipUp) {
  return flipUp
    ? { bottom: "calc(100% + 6px)", top: "auto" }
    : { top: "calc(100% + 6px)", bottom: "auto" };
}
