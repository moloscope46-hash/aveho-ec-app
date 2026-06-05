"use client";
// =============================================================
//  lib/useCurrentContext.js (0.58.39)
//
//  Hook réutilisable pour partager le contexte bâtiment/service
//  sélectionné dans le BatimentServiceSwitcher de la TopBar
//  (introduit en 0.58.35).
//
//  Écoute l'event "av-current-context-change" + lit aussi le
//  localStorage au montage pour les composants démarrant après
//  le dernier dispatch.
//
//  Usage :
//    const { batimentId, serviceId, active, toggle } = useCurrentContext();
//    if (active && batimentId) { ...filter... }
// =============================================================

import { useEffect, useState } from "react";

const STORAGE_BAT = "av-current-batiment-id";
const STORAGE_SVC = "av-current-service-id";

export function useCurrentContext() {
  const [state, setState] = useState({ batimentId: null, serviceId: null, active: false });

  useEffect(() => {
    // 1) Lit localStorage au montage
    let batimentId = null, serviceId = null;
    try {
      batimentId = localStorage.getItem(STORAGE_BAT) || null;
      serviceId = localStorage.getItem(STORAGE_SVC) || null;
    } catch {}
    setState((prev) => ({ ...prev, batimentId, serviceId }));

    // 2) Listen events futurs
    function onCtxChange(e) {
      const detail = e?.detail || {};
      setState((prev) => ({
        ...prev,
        batimentId: detail.batimentId || null,
        serviceId: detail.serviceId || null,
      }));
    }
    window.addEventListener("av-current-context-change", onCtxChange);
    return () => window.removeEventListener("av-current-context-change", onCtxChange);
  }, []);

  function toggle() {
    setState((prev) => ({ ...prev, active: !prev.active }));
  }

  function setActive(active) {
    setState((prev) => ({ ...prev, active }));
  }

  return { ...state, toggle, setActive };
}
