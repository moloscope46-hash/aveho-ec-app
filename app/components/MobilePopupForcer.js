"use client";
// =============================================================
//  components/MobilePopupForcer.js (0.65.6)
//
//  Helper qui détecte automatiquement les popups dans la topbar
//  et les force en BOTTOM-SHEET sur mobile, peu importe leur
//  composant d'origine ou leurs styles inline.
//
//  Mécanisme :
//   1. MutationObserver sur document.body
//   2. Détecte les nouveaux éléments avec position:absolute/fixed
//      placés dans/sous la .topbar (rect.top < 100px)
//   3. Si viewport ≤ 720px → force position:fixed; bottom:0; etc.
// =============================================================

import { useEffect } from "react";

const MOBILE_BREAKPOINT = 720;

export default function MobilePopupForcer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      // Re-check on resize
      const onResize = () => {
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
          // Force re-mount to attach observer
          window.location.reload();
        }
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    function forceBottomSheet(el) {
      if (!el || el.dataset?.bottomSheetForced) return;
      // Détecter si c'est un popup topbar (top de l'élément < 120px)
      try {
        const rect = el.getBoundingClientRect();
        // Si le popup est placé en haut de l'écran ou dans la topbar
        const isTopAnchored = rect.top < 120 || (el.style?.position === "absolute" && el.style?.top?.includes("calc(100%"));
        // Ou bien si l'élément a une classe explicite déjà ciblée
        const cls = el.className || "";
        const hasTargetClass = typeof cls === "string" && (
          cls.includes("tb-dropdown") ||
          cls.includes("notif-center-popup") ||
          cls.includes("status-popover") ||
          cls.includes("av-popover") ||
          cls.includes("av-dropdown")
        );

        if (!hasTargetClass && !isTopAnchored) return;

        // Force bottom-sheet
        el.style.setProperty("position", "fixed", "important");
        el.style.setProperty("top", "auto", "important");
        el.style.setProperty("bottom", "0", "important");
        el.style.setProperty("left", "0", "important");
        el.style.setProperty("right", "0", "important");
        el.style.setProperty("width", "100vw", "important");
        el.style.setProperty("max-width", "100vw", "important");
        el.style.setProperty("min-width", "0", "important");
        el.style.setProperty("max-height", "80vh", "important");
        el.style.setProperty("border-radius", "18px 18px 0 0", "important");
        el.style.setProperty("z-index", "99998", "important");
        el.style.setProperty("box-shadow", "0 -10px 30px rgba(20,33,49,.4)", "important");
        el.style.setProperty("overflow-y", "auto", "important");
        el.style.setProperty("overflow-x", "hidden", "important");
        el.style.setProperty("transform", "none", "important");
        el.dataset.bottomSheetForced = "1";
      } catch {}
    }

    // Observer DOM pour détecter les nouveaux popups
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return; // not element
          // Vérifier l'élément lui-même
          if (node.style?.position === "absolute" || node.style?.position === "fixed") {
            forceBottomSheet(node);
          }
          // Et tous ses descendants
          try {
            node.querySelectorAll?.('[style*="position: absolute"], [style*="position:absolute"], [style*="position: fixed"], [style*="position:fixed"]').forEach(child => {
              forceBottomSheet(child);
            });
            // Et les éléments avec les classes cibles
            node.querySelectorAll?.('.tb-dropdown, .notif-center-popup, .status-popover, .av-dropdown, .av-popover').forEach(child => {
              forceBottomSheet(child);
            });
          } catch {}
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
