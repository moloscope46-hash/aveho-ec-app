"use client";
// =============================================================
//  lib/focusMode.js (Alpha 0.58.25)
//
//  Mode "focus" zen pour saisie concentrée :
//   - Cache la topbar (notifs, profil, etc.)
//   - Cache la sidebar/menu
//   - Cache les badges et alertes secondaires
//   - Réduit l'opacité des éléments non-essentiels
//   - Centre le contenu principal
//
//  Activation :
//   - Toggle via Ctrl+Shift+F (shortcut clavier)
//   - Toggle programmatique via `toggleFocusMode()`
//
//  Persisté dans localStorage `av-focus-mode` (true/false).
// =============================================================

const STORAGE_KEY = "av-focus-mode";

export function isFocusMode() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setFocusMode(on) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "true" : "false");
  } catch {}
  applyMode(on);
}

export function toggleFocusMode() {
  const next = !isFocusMode();
  setFocusMode(next);
  return next;
}

function applyMode(on) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (on) {
    html.classList.add("av-focus-mode");
  } else {
    html.classList.remove("av-focus-mode");
  }
  try {
    window.dispatchEvent(new CustomEvent("av-focus-mode-change", { detail: { on } }));
  } catch {}
}

// Auto-init au chargement
export function initFocusMode() {
  if (typeof window === "undefined") return;
  if (isFocusMode()) {
    applyMode(true);
  }
}
