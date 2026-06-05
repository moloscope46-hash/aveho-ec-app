"use client";
// =============================================================
//  PresentationModeBoot — initialise les modes globaux + shortcuts (0.58.23)
//
//  À mettre dans le layout. Effet :
//   - Re-applique les modes au reload si activés (read localStorage)
//   - Écoute Ctrl+Shift+P pour toggle mode présentation
//   - 0.58.25 : écoute Ctrl+Shift+F pour toggle mode focus zen
// =============================================================

import { useEffect } from "react";
import { initPresentationMode, togglePresentationMode } from "../lib/presentationMode";
import { initFocusMode, toggleFocusMode } from "../lib/focusMode";

export default function PresentationModeBoot() {
  useEffect(() => {
    initPresentationMode();
    initFocusMode();
    function onKey(e) {
      const cmd = e.ctrlKey || e.metaKey;
      // Ctrl+Shift+P : mode présentation
      if (cmd && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        const next = togglePresentationMode();
        try {
          import("./components/ui-premium/Toast").then(({ toast }) => {
            if (next) {
              toast.info("🎥 Mode présentation activé", "Zoom + animations slow. Raccourci : Ctrl+Shift+P");
            } else {
              toast.info("Mode présentation désactivé", "Retour à l'affichage normal");
            }
          });
        } catch {}
        return;
      }
      // 0.58.25 : Ctrl+Shift+F : mode focus zen
      if (cmd && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        const next = toggleFocusMode();
        try {
          import("./components/ui-premium/Toast").then(({ toast }) => {
            if (next) {
              toast.success("🧘 Mode focus activé", "Topbar et notifs masqués pour saisie zen. Ctrl+Shift+F pour quitter.");
            } else {
              toast.info("Mode focus désactivé", "Affichage normal restauré");
            }
          });
        } catch {}
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
