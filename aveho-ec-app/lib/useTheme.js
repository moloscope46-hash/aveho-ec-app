"use client";
// =============================================================
//  useTheme (Alpha 0.7 / enrichi 0.13)
//  Gère le thème clair / foncé / auto. Stocke en localStorage et
//  applique l'attribut data-theme sur <html>.
//  Mode "auto" : utilise prefers-color-scheme du navigateur ET/OU
//  l'heure de la journée pour basculer automatiquement.
// =============================================================
import { useEffect, useState } from "react";

const KEY = "aveho_theme";          // "light" | "dark" | "auto"
const KEY_AUTO = "aveho_theme_auto_mode"; // "os" | "horaire"

// Calcule le thème effectif selon le mode auto choisi
function themeFromAuto(autoMode) {
  if (autoMode === "horaire") {
    // Nuit entre 19h et 7h
    const h = new Date().getHours();
    return (h >= 19 || h < 7) ? "dark" : "light";
  }
  // Par défaut : on suit le navigateur (prefers-color-scheme)
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState("light");      // valeur effective ("light"|"dark")
  const [mode, setModeState] = useState("light");   // préférence utilisateur ("light"|"dark"|"auto")
  const [autoMode, setAutoMode] = useState("os");   // si mode=auto : "os" ou "horaire"

  function apply(effectif) {
    setTheme(effectif);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", effectif);
    }
  }

  // Charger au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) || "light";
      const savedAuto = localStorage.getItem(KEY_AUTO) || "os";
      setModeState(saved);
      setAutoMode(savedAuto);
      if (saved === "auto") {
        apply(themeFromAuto(savedAuto));
      } else if (saved === "dark" || saved === "light") {
        apply(saved);
      }
    } catch (_) {}
  }, []);

  // Si mode=auto, re-vérifier toutes les minutes (pour horaire) et écouter le navigateur (pour OS)
  useEffect(() => {
    if (mode !== "auto") return;
    apply(themeFromAuto(autoMode));
    // Horaire : check toutes les minutes
    let interval;
    if (autoMode === "horaire") {
      interval = setInterval(() => apply(themeFromAuto("horaire")), 60_000);
    }
    // OS : écoute du media query
    let mq, listener;
    if (autoMode === "os" && typeof window !== "undefined" && window.matchMedia) {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
      listener = (e) => apply(e.matches ? "dark" : "light");
      mq.addEventListener?.("change", listener);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (mq && listener) mq.removeEventListener?.("change", listener);
    };
  }, [mode, autoMode]);

  // Bascule rapide (light <-> dark)
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setModeState(next);
    try { localStorage.setItem(KEY, next); } catch (_) {}
    apply(next);
  }

  function setMode(m) {
    if (m !== "dark" && m !== "light" && m !== "auto") return;
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch (_) {}
    if (m === "auto") apply(themeFromAuto(autoMode));
    else apply(m);
  }

  function setAuto(am) {
    if (am !== "os" && am !== "horaire") return;
    setAutoMode(am);
    try { localStorage.setItem(KEY_AUTO, am); } catch (_) {}
    if (mode === "auto") apply(themeFromAuto(am));
  }

  return { theme, mode, autoMode, toggle, setMode, setAuto };
}
