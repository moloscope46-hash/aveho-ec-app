"use client";
// =============================================================
//  components/PageToolbar.js (0.62.59) — Toolbar universelle premium
//
//  Composant pour uniformiser : recherche + filtres + compteur + actions
//  sur toutes les pages listes de l'app.
//
//  Usage simple :
//    <PageToolbar
//      search={search}
//      onSearch={setSearch}
//      placeholder="Chercher un patient..."
//      totalCount={rows.length}
//      filteredCount={filtered.length}
//      filters={[
//        { key:'statut', label:'Statut', value:fStatut, onChange:setFStatut,
//          options:[{v:'actif',l:'Actif',c:'#5aa05a'},{v:'archive',l:'Archivé',c:'#8a98a8'}] },
//      ]}
//      onReset={() => { setSearch(''); setFStatut(''); }}
//      actions={<button onClick={openNew}>+ Nouveau</button>}
//      sticky
//    />
// =============================================================
import { useEffect, useRef, useState } from "react";

export default function PageToolbar({
  // Recherche
  search = "",
  onSearch,
  placeholder = "Rechercher...",
  searchAutoFocus = false,
  // Filtres : tableau de { key, label, value, onChange, options:[{v,l,c?,ic?}], type?='select'|'toggle' }
  filters = [],
  // Compteurs
  totalCount,
  filteredCount,
  // Actions à droite (slot React)
  actions,
  // Reset
  onReset,
  // Sticky en haut
  sticky = false,
  // Class custom
  className = "",
  // Style accent (couleur du compteur, etc.)
  accentColor = "#185FA5",
}) {
  const hasFilters = filters && filters.length > 0;
  const hasActiveFilter = (search && search.length > 0) || filters.some(f => f.value);

  const inputRef = useRef(null);
  useEffect(() => {
    if (searchAutoFocus && inputRef.current) inputRef.current.focus();
  }, [searchAutoFocus]);

  return (
    <div
      className={`av-page-toolbar ${className}`}
      style={{
        background: "#fff",
        border: "1px solid #eef1f4",
        borderRadius: 12,
        padding: "10px 14px",
        marginBottom: 14,
        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10,
        boxShadow: "0 2px 4px rgba(20,33,49,.04)",
        position: sticky ? "sticky" : "static",
        top: sticky ? 70 : undefined,
        zIndex: sticky ? 10 : undefined,
      }}
    >
      {/* Recherche premium */}
      <div style={{
        position: "relative", flex: "1 1 240px", minWidth: 200, maxWidth: 360,
        display: "flex", alignItems: "center",
      }}>
        <i className="ti ti-search" style={{
          position: "absolute", left: 10, color: "#8a98a8", fontSize: 16,
          pointerEvents: "none",
        }} />
        <input
          ref={inputRef}
          type="search"
          value={search || ""}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "8px 32px 8px 34px",
            border: "1px solid #e3e9ee",
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "inherit",
            background: "#fafbfc",
            transition: "all 150ms",
          }}
        />
        {search && (
          <button
            onClick={() => onSearch?.("")}
            title="Effacer la recherche"
            style={{
              position: "absolute", right: 6,
              width: 22, height: 22, borderRadius: "50%",
              background: "#eef1f4", color: "#8a98a8",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12,
            }}
          >
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {/* Filtres */}
      {hasFilters && filters.map(f => {
        if (f.type === "toggle") {
          return (
            <button
              key={f.key}
              onClick={() => f.onChange?.(!f.value)}
              style={{
                padding: "7px 12px",
                background: f.value ? (f.color || accentColor) : "#fafbfc",
                color: f.value ? "#fff" : "#5a6878",
                border: `1px solid ${f.value ? (f.color || accentColor) : "#e3e9ee"}`,
                borderRadius: 8,
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
                transition: "all 150ms",
              }}
            >
              {f.icon && <i className={`ti ${f.icon}`} />}
              {f.label}
            </button>
          );
        }
        // Sélecteur button-group (boutons multi-valeurs avec compteur optionnel)
        if (f.type === "buttongroup") {
          return (
            <div key={f.key} style={{ display: "inline-flex", gap: 4, padding: 3, background: "#f4f7fa", borderRadius: 8 }}>
              {f.options.map(o => (
                <button
                  key={o.v}
                  onClick={() => f.onChange?.(f.value === o.v ? "" : o.v)}
                  style={{
                    padding: "5px 10px",
                    background: f.value === o.v ? "#fff" : "transparent",
                    color: f.value === o.v ? (o.c || accentColor) : "#5a6878",
                    border: "none",
                    borderRadius: 6,
                    fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: f.value === o.v ? "0 1px 3px rgba(20,33,49,.1)" : "none",
                    transition: "all 150ms",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  {o.ic && <i className={`ti ${o.ic}`} style={{ color: o.c }} />}
                  {o.l}
                  {o.count != null && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: f.value === o.v ? (o.c || accentColor) : "rgba(138,152,168,.15)", color: f.value === o.v ? "#fff" : "#8a98a8" }}>{o.count}</span>}
                </button>
              ))}
            </div>
          );
        }
        // Select standard
        return (
          <select
            key={f.key}
            value={f.value || ""}
            onChange={(e) => f.onChange?.(e.target.value)}
            style={{
              padding: "7px 10px",
              border: "1px solid #e3e9ee",
              borderRadius: 8,
              fontSize: 12.5,
              fontFamily: "inherit",
              background: "#fff",
              cursor: "pointer",
              minWidth: 130,
            }}
          >
            <option value="">{f.label}</option>
            {(f.options || []).map(o => (
              <option key={o.v} value={o.v}>{o.l}{o.count != null ? ` (${o.count})` : ""}</option>
            ))}
          </select>
        );
      })}

      {/* Reset si actif */}
      {hasActiveFilter && onReset && (
        <button
          onClick={onReset}
          title="Réinitialiser les filtres"
          style={{
            padding: "6px 10px",
            background: "rgba(227,93,91,.08)",
            color: "#e35d5b",
            border: "1px solid rgba(227,93,91,.2)",
            borderRadius: 8,
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          <i className="ti ti-x" /> Réinitialiser
        </button>
      )}

      {/* Compteur central */}
      {filteredCount != null && (
        <div style={{
          fontSize: 12, color: "#5a6878",
          marginLeft: "auto",
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 10px",
          background: hasActiveFilter ? `${accentColor}12` : "#f4f7fa",
          borderRadius: 8,
          fontWeight: 600,
        }}>
          <i className="ti ti-list" style={{ color: accentColor }} />
          <b style={{ color: accentColor }}>{filteredCount}</b>
          {totalCount != null && totalCount !== filteredCount && (
            <span style={{ color: "#8a98a8" }}>/ {totalCount}</span>
          )}
          <span>{filteredCount > 1 ? "résultats" : "résultat"}</span>
        </div>
      )}

      {/* Actions à droite */}
      {actions && (
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
