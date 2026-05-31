"use client";
// =============================================================
//  useKiosque (Alpha 0.10)
//  Gère le mode kiosque / présentation. Masque la TopBar et zoome
//  les KPIs pour affichage écran (salle de pause, vitrine).
//  Toggle persistant via localStorage. Sortie via Échap ou bouton.
// =============================================================
import { useEffect, useState } from "react";

const KEY = "aveho_kiosque";

export function useKiosque() {
  const [kiosque, setKiosque] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "1") {
        setKiosque(true);
        document.documentElement.setAttribute("data-kiosque", "1");
      }
    } catch (_) {}
    // Échap pour sortir du mode kiosque
    function onKey(e) {
      if (e.key === "Escape") off();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function on() {
    setKiosque(true);
    try { localStorage.setItem(KEY, "1"); } catch (_) {}
    document.documentElement.setAttribute("data-kiosque", "1");
  }
  function off() {
    setKiosque(false);
    try { localStorage.removeItem(KEY); } catch (_) {}
    document.documentElement.removeAttribute("data-kiosque");
  }
  function toggle() { kiosque ? off() : on(); }

  return { kiosque, on, off, toggle };
}
