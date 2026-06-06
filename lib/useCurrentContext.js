"use client";
// =============================================================
//  lib/useCurrentContext.js (0.58.39, étendu 0.58.60)
//
//  Hook réutilisable pour partager le contexte bâtiment/service/équipe
//  sélectionné dans le BatimentServiceSwitcher de la TopBar.
// =============================================================

import { useEffect, useState } from "react";

const STORAGE_BAT = "av-current-batiment-id";
const STORAGE_SVC = "av-current-service-id";
const STORAGE_EQUIPE = "av-current-equipe-id";  // 0.58.60

export function useCurrentContext() {
  const [state, setState] = useState({ batimentId: null, serviceId: null, equipeId: null, active: false });

  useEffect(() => {
    let batimentId = null, serviceId = null, equipeId = null;
    try {
      batimentId = localStorage.getItem(STORAGE_BAT) || null;
      serviceId = localStorage.getItem(STORAGE_SVC) || null;
      equipeId = localStorage.getItem(STORAGE_EQUIPE) || null;  // 0.58.60
    } catch {}
    setState((prev) => ({ ...prev, batimentId, serviceId, equipeId }));

    function onCtxChange(e) {
      const detail = e?.detail || {};
      setState((prev) => ({
        ...prev,
        batimentId: detail.batimentId || null,
        serviceId: detail.serviceId || null,
        equipeId: detail.equipeId !== undefined ? (detail.equipeId || null) : prev.equipeId,
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
