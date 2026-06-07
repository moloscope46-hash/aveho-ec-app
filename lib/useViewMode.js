// =============================================================
//  useViewMode — 0.59.5
//  Toggle entre vue "Espace Collectivité" et "Magasin Aveho"
//  Stocké dans localStorage. Plus tard sera basé sur le rôle user.
// =============================================================
"use client";
import { useEffect, useState } from "react";

const KEY = "av-view-mode";
const MODES = ["ec", "magasin"];

export function useViewMode() {
  const [mode, setModeState] = useState("ec"); // default EC
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && MODES.includes(saved)) setModeState(saved);
    } catch {}
    setReady(true);

    function onChange() {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved && MODES.includes(saved)) setModeState(saved);
      } catch {}
    }
    window.addEventListener("av-view-mode-change", onChange);
    return () => window.removeEventListener("av-view-mode-change", onChange);
  }, []);

  function setMode(newMode) {
    if (!MODES.includes(newMode)) return;
    try { localStorage.setItem(KEY, newMode); } catch {}
    setModeState(newMode);
    window.dispatchEvent(new Event("av-view-mode-change"));
  }

  return { mode, setMode, ready, isEC: mode === "ec", isMagasin: mode === "magasin" };
}
