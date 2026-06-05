"use client";
// =============================================================
//  lib/presentationMode.js (Alpha 0.58.23)
//
//  Mode "présentation" pour démos clients : applique des classes
//  globales au <html> qui :
//   - Zoom léger 1.05x (texte + composants plus lisibles)
//   - Ralentit toutes les animations 1.5x
//   - Renforce les ombres et glow
//   - Cache certains éléments parasites (badges debug, etc.)
//
//  Usage :
//    import { togglePresentationMode, isPresentationMode } from '@/lib/presentationMode';
//    togglePresentationMode(); // toggle on/off
//
//  Persisté dans localStorage `av-presentation-mode` (true/false).
//  Shortcut clavier global : Ctrl+Shift+P (configurable côté layout)
// =============================================================

const STORAGE_KEY = "av-presentation-mode";
// 0.58.38 : option masquer notifs aussi en mode présentation
//  (comme l'équivalent focus en 0.58.30, pour des démos plus zen)
const HIDE_NOTIFS_KEY = "av-presentation-hide-notifs";

export function isPresentationMode() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

// 0.58.38 : préférence "masquer les notifs aussi" (active uniquement
//  si le mode présentation est ON)
export function isPresentationHideNotifs() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HIDE_NOTIFS_KEY) === "true";
  } catch {
    return false;
  }
}

export function setPresentationHideNotifs(on) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HIDE_NOTIFS_KEY, on ? "true" : "false");
  } catch {}
  applyHideNotifs(on);
  try {
    window.dispatchEvent(new CustomEvent("av-presentation-hide-notifs-change", { detail: { on } }));
  } catch {}
}

function applyHideNotifs(on) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (on) {
    html.classList.add("av-presentation-hide-notifs");
  } else {
    html.classList.remove("av-presentation-hide-notifs");
  }
}

export function setPresentationMode(on) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "true" : "false");
  } catch {}
  applyMode(on);
}

export function togglePresentationMode() {
  const next = !isPresentationMode();
  setPresentationMode(next);
  return next;
}

function applyMode(on) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (on) {
    html.classList.add("av-presentation-mode");
  } else {
    html.classList.remove("av-presentation-mode");
  }
  // Émet un event custom pour que les composants puissent réagir
  try {
    window.dispatchEvent(new CustomEvent("av-presentation-mode-change", { detail: { on } }));
  } catch {}
}

// Auto-init au chargement (read localStorage et applique)
export function initPresentationMode() {
  if (typeof window === "undefined") return;
  if (isPresentationMode()) {
    applyMode(true);
    // 0.58.38 : restore aussi l'option hide-notifs
    if (isPresentationHideNotifs()) applyHideNotifs(true);
  }
}
