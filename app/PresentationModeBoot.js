"use client";
// =============================================================
//  PresentationModeBoot — initialise le mode présentation + shortcut clavier (0.58.23)
//
//  À mettre dans le layout. Effet :
//   - Re-applique le mode au reload si activé (read localStorage)
//   - Écoute Ctrl+Shift+P pour toggle
// =============================================================

import { useEffect } from "react";
import { initPresentationMode, togglePresentationMode } from "../lib/presentationMode";

export default function PresentationModeBoot() {
  useEffect(() => {
    initPresentationMode();
    function onKey(e) {
      // Ctrl+Shift+P (ou Cmd+Shift+P sur Mac)
      const cmd = e.ctrlKey || e.metaKey;
      if (cmd && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        const next = togglePresentationMode();
        // Toast feedback : on tente de l'afficher si disponible
        try {
          import("./components/ui-premium/Toast").then(({ toast }) => {
            if (next) {
              toast.info("🎥 Mode présentation activé", "Zoom + animations slow. Raccourci : Ctrl+Shift+P");
            } else {
              toast.neutral("Mode présentation désactivé", "Retour à l'affichage normal");
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
