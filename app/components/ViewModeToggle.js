"use client";
// =============================================================
//  ViewModeToggle — Toggle Liste / Tuiles persisté localStorage
//  Visible sur mobile ET desktop
// =============================================================
import { useEffect, useState } from "react";

export function useViewMode(key, defaultMode = "list") {
  const [mode, setModeState] = useState(defaultMode);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`av-vm-${key}`);
    if (saved === "list" || saved === "tiles") setModeState(saved);
  }, [key]);
  const setMode = (m) => {
    setModeState(m);
    try { localStorage.setItem(`av-vm-${key}`, m); } catch {}
  };
  return [mode, setMode];
}

export default function ViewModeToggle({ mode, onChange, color = "#185FA5", theme = "light" }) {
  const isDark = theme === "dark";
  const bg = isDark ? "rgba(255,255,255,.06)" : "#f0f4f8";
  const border = isDark ? "rgba(255,255,255,.10)" : "#dde3ea";
  const textInactive = isDark ? "rgba(255,255,255,.55)" : "#5a6878";
  
  const btnStyle = (active) => ({
    padding: "6px 12px", borderRadius: 8,
    background: active ? `linear-gradient(135deg, ${color}, ${color}cc)` : "transparent",
    color: active ? "#fff" : textInactive,
    border: "none", cursor: "pointer", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
    display: "inline-flex", alignItems: "center", gap: 5,
    transition: "all 150ms",
  });
  
  return (
    <div style={{
      display: "inline-flex", gap: 2, padding: 3,
      background: bg, border: `1px solid ${border}`, borderRadius: 10,
    }}>
      <button onClick={() => onChange("list")} style={btnStyle(mode === "list")} title="Vue liste">
        <i className="ti ti-list" /> <span style={{ display: "inline" }}>Liste</span>
      </button>
      <button onClick={() => onChange("tiles")} style={btnStyle(mode === "tiles")} title="Vue tuiles">
        <i className="ti ti-grid-dots" /> <span style={{ display: "inline" }}>Tuiles</span>
      </button>
    </div>
  );
}
