"use client";
// =============================================================
//  useGlobalFilters — Hook filtres globaux avec persistance localStorage
// =============================================================
import { useEffect, useState } from "react";

const DEFAULT_FILTERS = {
  quickSearch: "",
  statut: "",
  urgence: "",
  period: "all",
};

const STORAGE_KEY = "av-global-filters";

export function useGlobalFilters() {
  const [filters, setFilters] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_FILTERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
    } catch (e) { return DEFAULT_FILTERS; }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onChange(e) {
      const f = e.detail || DEFAULT_FILTERS;
      setFilters(f);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch (e) {}
    }
    window.addEventListener("av-global-filters-change", onChange);
    return () => window.removeEventListener("av-global-filters-change", onChange);
  }, []);

  return filters;
}

export function hasActiveFilters(filters) {
  if (!filters) return false;
  return !!(filters.quickSearch || filters.statut || filters.urgence || (filters.period && filters.period !== "all"));
}

export function applyGlobalFilters(items, filters, opts = {}) {
  const {
    searchFields = ["nom", "prenom", "libelle", "numero", "code"],
    statutField = "statut",
    urgenceField = "urgence",
    dateField = "created_at",
  } = opts;

  if (!items || !filters) return items || [];

  return items.filter(item => {
    if (filters.quickSearch) {
      const s = filters.quickSearch.toLowerCase().trim();
      const found = searchFields.some(f => (item[f] || "").toString().toLowerCase().includes(s));
      if (!found) return false;
    }
    if (filters.statut && item[statutField]) {
      const itemStatut = String(item[statutField]).toLowerCase();
      if (!itemStatut.includes(filters.statut.toLowerCase())) return false;
    }
    if (filters.urgence && item[urgenceField]) {
      const itemUrg = String(item[urgenceField]).toLowerCase();
      if (!itemUrg.includes(filters.urgence.toLowerCase())) return false;
    }
    if (filters.period && filters.period !== "all" && item[dateField]) {
      const date = new Date(item[dateField]);
      const diffDays = (new Date() - date) / 86400000;
      if (filters.period === "today" && diffDays > 1) return false;
      if (filters.period === "week" && diffDays > 7) return false;
      if (filters.period === "month" && diffDays > 30) return false;
      if (filters.period === "quarter" && diffDays > 90) return false;
    }
    return true;
  });
}

// Indicateur visuel sticky : badge en haut de page quand des filtres sont actifs
export function GlobalFiltersIndicator({ filters }) {
  if (!filters || !hasActiveFilters(filters)) return null;
  
  const chips = [];
  if (filters.quickSearch) chips.push({ ic: "ti-search", l: `"${filters.quickSearch}"` });
  if (filters.statut)      chips.push({ ic: "ti-circle-check", l: filters.statut });
  if (filters.urgence)     chips.push({ ic: "ti-alert-triangle", l: filters.urgence });
  if (filters.period && filters.period !== "all") chips.push({ ic: "ti-calendar", l: filters.period });

  function clearAll() {
    window.dispatchEvent(new CustomEvent("av-global-filters-change", { detail: { quickSearch: "", statut: "", urgence: "", period: "all" } }));
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 100,
      padding: "8px 14px",
      background: "linear-gradient(135deg, rgba(124,200,200,.20), rgba(124,200,200,.05))",
      borderBottom: "1px solid #7CC8C840",
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "Quicksand, sans-serif",
      backdropFilter: "blur(8px)",
    }}>
      <i className="ti ti-filter-check" style={{ color: "#7CC8C8", fontSize: 14, filter: "drop-shadow(0 0 4px #7CC8C8)" }} />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,.85)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Filtres actifs
      </span>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
        {chips.map((c, i) => (
          <span key={i} style={{
            background: "#7CC8C825", color: "#7CC8C8",
            border: "1px solid #7CC8C840",
            padding: "2px 8px", borderRadius: 8,
            fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <i className={`ti ${c.ic}`} /> {c.l}
          </span>
        ))}
      </div>
      <button onClick={clearAll} style={{
        background: "rgba(255,255,255,.08)", color: "#fff",
        border: "1px solid rgba(255,255,255,.15)",
        padding: "4px 10px", borderRadius: 8,
        fontSize: 10, fontWeight: 700, cursor: "pointer",
        fontFamily: "Quicksand",
      }}>
        <i className="ti ti-x" /> Effacer
      </button>
    </div>
  );
}
