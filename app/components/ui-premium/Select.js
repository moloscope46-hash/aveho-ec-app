"use client";
// =============================================================
//  Select — Dropdown premium custom (0.58.10)
//
//  Remplace <select> natif par un dropdown avec :
//   - Animation slide-down + fade
//   - Icons + descriptions optionnelles
//   - Recherche live (si searchable)
//   - Keyboard navigation (↑/↓/Enter/Esc)
//   - Click outside pour fermer
//
//  Usage :
//    const [statut, setStatut] = useState("Nouvelle");
//    <Select
//      value={statut}
//      onChange={setStatut}
//      options={[
//        { value: "Nouvelle", label: "Nouvelle", icon: "ti-plus" },
//        { value: "En cours", label: "En cours", icon: "ti-clock", desc: "DI prise en charge" },
//        { value: "Résolue", label: "Résolue", icon: "ti-check" },
//      ]}
//      placeholder="Choisir un statut…"
//    />
// =============================================================

import { useState, useRef, useEffect } from "react";
import { useDropdownPosition, dropdownPositionStyle } from "./useDropdownPosition";

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Sélectionner…",
  searchable = false,
  disabled = false,
  size = "md",         // sm | md | lg
  variant = "default", // default | ghost | filled
  fullWidth = false,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  // 0.58.16 : auto-flip up si pas assez de place en bas
  const flipUp = useDropdownPosition(rootRef, open, { maxHeight: 320 });

  const selected = options.find((o) => o.value === value);
  const sizes = {
    sm: { padH: 10, padV: 6, fontSize: 12, iconSize: 14 },
    md: { padH: 14, padV: 9, fontSize: 13.5, iconSize: 16 },
    lg: { padH: 18, padV: 12, fontSize: 14.5, iconSize: 18 },
  };
  const sz = sizes[size] || sizes.md;

  // Filtrage si searchable
  const filtered = searchable && searchQ
    ? options.filter((o) =>
        (o.label || "").toLowerCase().includes(searchQ.toLowerCase()) ||
        (o.desc || "").toLowerCase().includes(searchQ.toLowerCase())
      )
    : options;

  // Click outside
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setSearchQ("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Focus search à l'ouverture
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setHighlightIdx(filtered.findIndex((o) => o.value === value));
  }, [open]);

  // Keyboard nav
  function onKey(e) {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); setSearchQ(""); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlightIdx];
      if (opt) {
        onChange?.(opt.value);
        setOpen(false);
        setSearchQ("");
      }
    }
  }

  // Style du trigger selon variant
  const triggerBg = variant === "filled" ? "var(--av-g100, #f4f7fa)"
                  : variant === "ghost" ? "transparent"
                  : "var(--av-g0, #fff)";
  const triggerBorder = variant === "ghost"
    ? "1.5px solid transparent"
    : "1.5px solid var(--av-g200, #e3e9ee)";

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        minWidth: 180,
      }}
      onKeyDown={onKey}
    >
      {/* Trigger button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || (selected ? selected.label : placeholder)}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: `${sz.padV}px ${sz.padH}px`,
          background: triggerBg,
          border: open
            ? "1.5px solid #7CC8C8"
            : triggerBorder,
          borderRadius: 10,
          fontSize: sz.fontSize,
          fontWeight: 500,
          fontFamily: "inherit",
          color: selected ? "var(--av-navy, #142131)" : "var(--av-g500, #8a98a8)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 150ms, box-shadow 200ms",
          boxShadow: open
            ? "0 0 0 3px rgba(124,200,200,.20)"
            : "none",
          outline: "none",
          textAlign: "left",
          minHeight: sz.padV * 2 + sz.fontSize + 6,
        }}
        onMouseEnter={(e) => {
          if (!open && !disabled) e.currentTarget.style.borderColor = "#cfd8e0";
        }}
        onMouseLeave={(e) => {
          if (!open && !disabled) e.currentTarget.style.borderColor = "#e3e9ee";
        }}
      >
        {selected?.icon && (
          <i className={`ti ${selected.icon}`} style={{
            fontSize: sz.iconSize,
            color: selected.iconColor || "#185FA5",
            flexShrink: 0,
          }} />
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <i className="ti ti-chevron-down" style={{
          fontSize: 14,
          color: "var(--av-g500, #8a98a8)",
          transition: "transform 200ms",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          flexShrink: 0,
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            ...dropdownPositionStyle(flipUp),
            left: 0,
            right: 0,
            background: "var(--av-g0, #fff)",
            border: "1px solid var(--av-g200, #e3e9ee)",
            borderRadius: 12,
            boxShadow: "0 20px 40px rgba(20,33,49,.18), 0 8px 16px rgba(20,33,49,.10)",
            zIndex: 100,
            overflow: "hidden",
            animation: "av-select-pop 200ms cubic-bezier(.2,.8,.2,1)",
            maxHeight: 320,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search bar */}
          {searchable && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--av-g100, #f4f7fa)" }}>
              <div style={{ position: "relative" }}>
                <i className="ti ti-search" style={{
                  position: "absolute",
                  left: 10, top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--av-g500, #8a98a8)",
                  fontSize: 14,
                }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Rechercher…"
                  style={{
                    width: "100%",
                    padding: "7px 12px 7px 32px",
                    background: "var(--av-g100, #f4f7fa)",
                    border: "1px solid var(--av-g200, #e3e9ee)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div style={{ overflowY: "auto", flex: 1, padding: 4 }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: "20px 16px",
                textAlign: "center",
                fontSize: 12,
                color: "var(--av-g500, #8a98a8)",
                fontStyle: "italic",
              }}>
                Aucun résultat
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isHighlight = i === highlightIdx;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightIdx(i)}
                    onClick={() => {
                      onChange?.(opt.value);
                      setOpen(false);
                      setSearchQ("");
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: isHighlight
                        ? "linear-gradient(90deg, rgba(124,200,200,.14) 0%, transparent 100%)"
                        : "transparent",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontFamily: "inherit",
                      color: "var(--av-navy, #142131)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 100ms",
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  >
                    {opt.icon && (
                      <i className={`ti ${opt.icon}`} style={{
                        fontSize: 16,
                        color: opt.iconColor || (isSelected ? "#7CC8C8" : "#185FA5"),
                        flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {opt.label}
                      </div>
                      {opt.desc && (
                        <div style={{
                          fontSize: 11.5,
                          color: "var(--av-g500, #8a98a8)",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 400,
                        }}>
                          {opt.desc}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <i className="ti ti-check" style={{
                        fontSize: 15,
                        color: "#7CC8C8",
                        flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
