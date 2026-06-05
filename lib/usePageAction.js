"use client";
// =============================================================
//  lib/usePageAction.js (0.58.42)
//
//  Hook pour écouter les "page-actions" déclenchées depuis Cmd+K.
//
//  Le composant GlobalSearch émet un CustomEvent "av-page-action"
//  avec detail = { action: "export-csv" | "toggle-ctx-filter" | "open-new" | ... }
//  quand l'utilisateur clique sur une action contextuelle de la palette.
//
//  Usage :
//    usePageAction("export-csv", () => { exportToCSV(items); });
//    usePageAction("toggle-ctx-filter", () => { ctx.toggle(); });
//    usePageAction("open-new", () => { setModal({}); });
// =============================================================

import { useEffect } from "react";

export function usePageAction(actionName, handler) {
  useEffect(() => {
    if (!actionName || !handler) return;
    function onPageAction(e) {
      if (e?.detail?.action === actionName) {
        handler();
      }
    }
    window.addEventListener("av-page-action", onPageAction);
    return () => window.removeEventListener("av-page-action", onPageAction);
  }, [actionName, handler]);
}
