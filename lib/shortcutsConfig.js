"use client";
// =============================================================
//  lib/shortcutsConfig.js (0.58.31)
//
//  Configuration des 3 raccourcis "bulles" affichés via le bouton
//  menu en haut-gauche (anciennement FloatingActionBar pied de page).
//
//  Storage : localStorage key "av-shortcuts-config" — array de 3
//  objets { id, label, icon, color, url }.
//  Si l'utilisateur n'a rien configuré → utilise les défauts.
// =============================================================

const STORAGE_KEY = "av-shortcuts-config";

export const DEFAULT_SHORTCUTS = [
  {
    id: "scan",
    label: "Scan",
    icon: "ti-scan",
    color: "#5a4a90",
    gradient: "linear-gradient(135deg, #7a6fb0, #5a4a90)",
    url: "/scan/bulletin-situation",
    openInPopup: false,  // 0.58.56 : si true, ouvre dans une popup plein écran avec bouton retour
  },
  {
    id: "mon-etab",
    label: "Mon étab",
    icon: "ti-building-hospital",
    color: "#185FA5",
    gradient: "linear-gradient(135deg, #2a7ed1, #185FA5)",
    url: "/etablissement/fiche",
    openInPopup: false,
  },
  {
    id: "commande",
    label: "Commande",
    icon: "ti-shopping-cart",
    color: "#EF9F27",
    gradient: "linear-gradient(135deg, #f5b144, #EF9F27)",
    url: "/panier",
    openInPopup: false,
  },
];

// Palette de couleurs proposées pour les raccourcis
export const SHORTCUT_COLORS = [
  { color: "#185FA5", gradient: "linear-gradient(135deg, #2a7ed1, #185FA5)", label: "Bleu Aveho" },
  { color: "#7CC8C8", gradient: "linear-gradient(135deg, #9ed8d8, #7CC8C8)", label: "Teal" },
  { color: "#5a4a90", gradient: "linear-gradient(135deg, #7a6fb0, #5a4a90)", label: "Violet" },
  { color: "#EF9F27", gradient: "linear-gradient(135deg, #f5b144, #EF9F27)", label: "Ambre" },
  { color: "#C9867F", gradient: "linear-gradient(135deg, #d9a09a, #C9867F)", label: "Terra" },
  { color: "#5aa05a", gradient: "linear-gradient(135deg, #76b876, #5aa05a)", label: "Vert" },
  { color: "#c0392b", gradient: "linear-gradient(135deg, #d65749, #c0392b)", label: "Rouge" },
  { color: "#142131", gradient: "linear-gradient(135deg, #243044, #142131)", label: "Navy" },
];

// Icônes proposées (Tabler) pour les raccourcis
export const SHORTCUT_ICONS = [
  "ti-scan", "ti-building-hospital", "ti-shopping-cart",
  "ti-user", "ti-users", "ti-tools", "ti-package",
  "ti-truck-delivery", "ti-cash", "ti-calendar",
  "ti-bell", "ti-mail", "ti-phone", "ti-map-pin",
  "ti-stethoscope", "ti-prescription", "ti-pill",
  "ti-chart-bar", "ti-clipboard-list", "ti-folder",
  "ti-bookmark", "ti-star", "ti-flag", "ti-target",
  "ti-rocket", "ti-bolt", "ti-flame", "ti-sparkles",
];

/**
 * Lit la config des raccourcis depuis localStorage.
 * @returns {Array} 3 shortcuts (defaults si pas configuré ou erreur)
 */
export function getShortcutsConfig() {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT_SHORTCUTS;
    // Vérifie que chaque entrée a au moins { label, icon, color, url }
    return parsed.map((s, i) => ({
      id: s.id || DEFAULT_SHORTCUTS[i].id,
      label: s.label || DEFAULT_SHORTCUTS[i].label,
      icon: s.icon || DEFAULT_SHORTCUTS[i].icon,
      color: s.color || DEFAULT_SHORTCUTS[i].color,
      gradient: s.gradient || gradientFromColor(s.color || DEFAULT_SHORTCUTS[i].color),
      url: s.url || DEFAULT_SHORTCUTS[i].url,
    }));
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

/**
 * Sauvegarde la config + dispatche un event pour synchroniser les composants.
 * @param {Array} shortcuts
 */
export function setShortcutsConfig(shortcuts) {
  if (typeof window === "undefined") return;
  try {
    // Sécurise : toujours 3 entrées
    const safe = shortcuts.slice(0, 3).map((s, i) => ({
      ...DEFAULT_SHORTCUTS[i],
      ...s,
      gradient: s.gradient || gradientFromColor(s.color || DEFAULT_SHORTCUTS[i].color),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    window.dispatchEvent(new CustomEvent("av-shortcuts-config-change", { detail: { shortcuts: safe } }));
  } catch {}
}

export function resetShortcutsConfig() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("av-shortcuts-config-change", { detail: { shortcuts: DEFAULT_SHORTCUTS } }));
  } catch {}
}

// Helper : génère un gradient depuis une couleur de base (par interpolation simple)
function gradientFromColor(color) {
  // Cherche dans la palette pour un gradient pré-calculé
  const found = SHORTCUT_COLORS.find((c) => c.color === color);
  if (found) return found.gradient;
  // Fallback : couleur en plus clair → la couleur
  return `linear-gradient(135deg, ${color}cc, ${color})`;
}
