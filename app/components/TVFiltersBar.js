"use client";
// =============================================================
//  TVFiltersBar — Barre de filtres avancés Mode TV
//  Stub minimal pour éviter le crash de l'import
// =============================================================
import { useState, useEffect } from "react";

const STORAGE_KEY = "av-tv-filters";

export function getTVFilters(pageKey = "default") {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[pageKey] || {};
  } catch { return {}; }
}

export default function TVFiltersBar({ pageKey = "default", onChange }) {
  const [filters, setFilters] = useState({});
  
  useEffect(() => {
    setFilters(getTVFilters(pageKey));
  }, [pageKey]);
  
  function update(k, v) {
    const newF = { ...filters, [k]: v };
    setFilters(newF);
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      all[pageKey] = newF;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
    onChange?.(newF);
  }
  
  return (
    <div style={{
      display: "flex", gap: 8, padding: "8px 12px",
      background: "rgba(255,255,255,.04)", borderRadius: 10,
      border: "1px solid rgba(255,255,255,.08)",
      fontFamily: "Quicksand, sans-serif", color: "#fff",
    }}>
      <input
        placeholder="Filtre rapide..."
        value={filters.search || ""}
        onChange={(e) => update("search", e.target.value)}
        style={{
          flex: 1, padding: "6px 10px", borderRadius: 8,
          background: "rgba(255,255,255,.08)", color: "#fff",
          border: "1px solid rgba(255,255,255,.12)",
          fontFamily: "inherit", fontSize: 12,
        }}
      />
    </div>
  );
}
