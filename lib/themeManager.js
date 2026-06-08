"use client";
// =============================================================
//  lib/themeManager.js (0.62.128)
//
//  Système de thèmes personnalisables par structure.
//  Sauvegarde en localStorage + en base structures.theme_json
//  Applique les variables CSS au runtime via injection.
// =============================================================

import { createClient } from "./supabase";

// Palette par défaut Aveho (charte officielle)
export const DEFAULT_THEME = {
  primary: "#185FA5",       // NAVY clair
  primaryDark: "#142131",   // NAVY foncé
  accent: "#7CC8C8",        // TEAL
  warning: "#EF9F27",       // AMBER
  danger: "#C9867F",        // TERRA
  success: "#5aa05a",
  info: "#7a6fb0",          // VIOLET
  bg: "#fafbfc",
  bgDark: "#142131",
  text: "#142131",
  textMuted: "#5a6878",
  border: "#e3e9ee",
  card: "#ffffff",
};

// Thèmes prédéfinis (presets)
export const THEME_PRESETS = [
  { k: "aveho", l: "Aveho (défaut)", desc: "Charte officielle Aveho", t: DEFAULT_THEME },
  { k: "dark", l: "Sombre", desc: "Mode sombre élégant",
    t: { ...DEFAULT_THEME, primary: "#7CC8C8", primaryDark: "#0a141e", bg: "#1a2531", bgDark: "#0a141e", text: "#e8eef4", textMuted: "#8a98a8", border: "#2a3a4a", card: "#1f2c3a" }
  },
  { k: "ocean", l: "Océan", desc: "Bleus profonds marins",
    t: { ...DEFAULT_THEME, primary: "#0077B6", primaryDark: "#03045E", accent: "#00B4D8", warning: "#FFB703" }
  },
  { k: "forest", l: "Forêt", desc: "Verts naturels",
    t: { ...DEFAULT_THEME, primary: "#2D6A4F", primaryDark: "#1B4332", accent: "#52B788", warning: "#F4A261", danger: "#E76F51" }
  },
  { k: "sunset", l: "Coucher de soleil", desc: "Tons chauds orangés",
    t: { ...DEFAULT_THEME, primary: "#E76F51", primaryDark: "#264653", accent: "#F4A261", warning: "#E9C46A" }
  },
  { k: "rose", l: "Rose corail", desc: "Doux et féminin",
    t: { ...DEFAULT_THEME, primary: "#D04A6B", primaryDark: "#3D1E2F", accent: "#F5C7CC", warning: "#F4A261" }
  },
  { k: "monochrome", l: "Monochrome", desc: "Sobre noir-blanc-gris",
    t: { ...DEFAULT_THEME, primary: "#2c2c2c", primaryDark: "#000", accent: "#888", warning: "#666", danger: "#999", info: "#555" }
  },
];

const STORAGE_KEY = "aveho_theme";
const STRUCTURE_THEME_KEY = "aveho_theme_struct";

// Appliquer un thème : injecte les variables CSS au :root
export function applyTheme(theme) {
  if (typeof document === "undefined" || !theme) return;
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, val]) => {
    const cssVar = `--aveho-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, val);
  });
  // Compatibilité : aussi les anciennes vars
  root.style.setProperty("--navy", theme.primaryDark);
  root.style.setProperty("--navy-light", theme.primary);
  root.style.setProperty("--teal", theme.accent);
  root.style.setProperty("--amber", theme.warning);
  root.style.setProperty("--coral", theme.danger);
}

export function loadTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_THEME, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_THEME;
}

export function saveTheme(theme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {}
  applyTheme(theme);
}

export async function saveThemeToStructure(structureId, theme) {
  try {
    const supabase = createClient();
    await supabase.from("structures").update({ theme_json: theme }).eq("id", structureId);
  } catch {}
}

export async function loadThemeFromStructure(structureId) {
  if (!structureId) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("structures")
      .select("theme_json")
      .eq("id", structureId)
      .maybeSingle();
    if (error) return null;
    return data?.theme_json || null;
  } catch {
    return null;
  }
}

export function resetTheme() {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  applyTheme(DEFAULT_THEME);
}
