// =============================================================
//  uxUtils — Helpers UI/UX (0.61.3)
// =============================================================
"use client";

// Haptic feedback (Vibration API)
export function haptic(pattern = 10) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

// Haptic patterns prédéfinis
export const HAPTIC = {
  light: 10,
  medium: 30,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 30, 50, 30, 50],
  scan: [15, 20, 15],
};

// Toggle dark mode
export function toggleDarkMode() {
  if (typeof window === "undefined") return;
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("av-theme", next);
  return next;
}

// Init dark mode au chargement (à appeler dans layout)
export function initDarkMode() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("av-theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

// Pull-to-refresh hook
import { useEffect, useState, useRef } from "react";

export function usePullToRefresh(onRefresh, threshold = 80) {
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const startY = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleTouchStart(e) {
      if (window.scrollY === 0) startY.current = e.touches[0].clientY;
      else startY.current = 0;
    }

    function handleTouchMove(e) {
      if (startY.current === 0) return;
      const y = e.touches[0].clientY;
      const d = y - startY.current;
      if (d > 0 && window.scrollY === 0) {
        setDistance(Math.min(d, threshold * 1.5));
        setPulling(true);
      }
    }

    async function handleTouchEnd() {
      if (pulling && distance >= threshold) {
        haptic(HAPTIC.medium);
        await onRefresh?.();
      }
      setPulling(false);
      setDistance(0);
      startY.current = 0;
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pulling, distance, threshold, onRefresh]);

  return { pulling, distance, threshold };
}
