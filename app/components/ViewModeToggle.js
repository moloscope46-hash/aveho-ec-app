"use client";
// =============================================================
//  components/ViewModeToggle.js (0.62.68)
//
//  Switcher Liste / Tuiles avec persistance localStorage.
//
//  Usage :
//    const [view, setView] = useViewMode("patients-view", "tiles");
//    <ViewModeToggle value={view} onChange={setView} />
//
//    {view === "list" ? <Tableau /> : <Tuiles />}
// =============================================================
import { useState, useEffect } from "react";

export function useViewMode(storageKey, defaultMode = "tiles") {
  const [mode, setMode] = useState(defaultMode);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`av-view-${storageKey}`);
      if (stored === "list" || stored === "tiles") setMode(stored);
    } catch {}
  }, [storageKey]);

  function update(newMode) {
    setMode(newMode);
    try { localStorage.setItem(`av-view-${storageKey}`, newMode); } catch {}
  }

  return [mode, update];
}

export default function ViewModeToggle({ value, onChange, accentColor = "#185FA5" }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "#fafbfc",
      border: "1px solid #e3e9ee",
      borderRadius: 8,
      padding: 3,
      gap: 2,
    }}>
      <button
        type="button"
        onClick={() => onChange("tiles")}
        style={{
          padding: "6px 12px",
          background: value === "tiles" ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` : "transparent",
          color: value === "tiles" ? "#fff" : "#5a6878",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          transition: "all 200ms",
          boxShadow: value === "tiles" ? `0 2px 8px ${accentColor}40` : "none",
        }}
        data-tooltip="Mode tuiles"
      >
        <i className="ti ti-layout-grid" /> Tuiles
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        style={{
          padding: "6px 12px",
          background: value === "list" ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` : "transparent",
          color: value === "list" ? "#fff" : "#5a6878",
          border: "none",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          transition: "all 200ms",
          boxShadow: value === "list" ? `0 2px 8px ${accentColor}40` : "none",
        }}
        data-tooltip="Mode liste compacte"
      >
        <i className="ti ti-list" /> Liste
      </button>
    </div>
  );
}
