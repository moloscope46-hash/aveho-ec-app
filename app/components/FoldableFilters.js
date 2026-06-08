"use client";
// =============================================================
//  components/FoldableFilters.js (0.62.118)
//
//  Bloc de filtres repliable/dépliable avec :
//  - SearchInput intégré toujours visible
//  - Filtres avancés repliés par défaut
//  - Badge compteur de filtres actifs
//  - Bouton "Réinitialiser tout"
// =============================================================

import { useState, useEffect } from "react";

export default function FoldableFilters({
  children,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Rechercher…",
  activeFiltersCount = 0,
  onResetAll,
  defaultOpen = false,
  storageKey = null,
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    if (storageKey) {
      const saved = localStorage.getItem(`av:filters:${storageKey}`);
      if (saved !== null) return saved === "1";
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      try { localStorage.setItem(`av:filters:${storageKey}`, open ? "1" : "0"); } catch {}
    }
  }, [open, storageKey]);

  return (
    <div className="av-foldable-filters" style={{
      background: "#fff",
      border: "1px solid #e3e9ee",
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(20, 33, 49, .04)",
    }}>
      {/* Barre principale : search + toggle + actions */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: open ? "linear-gradient(180deg, #fafbfc, #fff)" : "#fff",
        borderBottom: open ? "1px solid #e3e9ee" : "none",
      }}>
        {/* SearchInput */}
        {onSearchChange && (
          <div style={{
            flex: 1,
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
          }}>
            <i className="ti ti-search" style={{
              position: "absolute", left: 12,
              color: "#8a98a8", fontSize: 16,
              pointerEvents: "none",
            }} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                border: "1.5px solid #e3e9ee",
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "inherit",
                background: "#fff",
                outline: "none",
                transition: "all 200ms",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#7CC8C8";
                e.target.style.boxShadow = "0 0 0 3px rgba(124, 200, 200, .15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e3e9ee";
                e.target.style.boxShadow = "none";
              }}
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange("")}
                aria-label="Effacer la recherche"
                style={{
                  position: "absolute", right: 8,
                  background: "rgba(20, 33, 49, .08)",
                  border: "none",
                  width: 22, height: 22,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#5a6878",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        )}

        {/* Toggle filtres */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: open ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "rgba(124, 200, 200, .12)",
            color: open ? "#fff" : "#185FA5",
            border: "none",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow: open ? "0 4px 12px rgba(24, 95, 165, .25)" : "none",
          }}
        >
          <i className={`ti ${open ? "ti-filter-off" : "ti-filter"}`} />
          <span className="filter-label-text">Filtres</span>
          {activeFiltersCount > 0 && (
            <span style={{
              background: open ? "rgba(255,255,255,.25)" : "#185FA5",
              color: "#fff",
              borderRadius: 10,
              padding: "1px 7px",
              fontSize: 11,
              fontWeight: 700,
              minWidth: 18,
              textAlign: "center",
            }}>
              {activeFiltersCount}
            </span>
          )}
          <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12 }} />
        </button>

        {/* Reset */}
        {activeFiltersCount > 0 && onResetAll && (
          <button
            onClick={onResetAll}
            title="Réinitialiser tous les filtres"
            aria-label="Réinitialiser"
            style={{
              background: "rgba(227, 93, 91, .10)",
              color: "#c0392b",
              border: "1.5px solid rgba(227, 93, 91, .25)",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 200ms",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-refresh" />
          </button>
        )}
      </div>

      {/* Bloc filtres dépliable */}
      {open && (
        <div style={{
          padding: "12px 14px",
          background: "#fafbfc",
          animation: "av-foldable-down 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          {children}
        </div>
      )}

      <style jsx global>{`
        @keyframes av-foldable-down {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 600px; }
        }
        @media (max-width: 540px) {
          .av-foldable-filters .filter-label-text { display: none; }
        }
      `}</style>
    </div>
  );
}
