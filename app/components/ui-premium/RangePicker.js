"use client";
// =============================================================
//  RangePicker — Sélecteur de plage de dates (0.58.13)
//
//  Trigger button qui ouvre un panneau avec :
//   - 5 presets cliquables (7j / 30j / 3 mois / 6 mois / année)
//   - 2 inputs date custom (du / au)
//   - Boutons "Appliquer" et "Effacer"
//
//  Usage :
//    const [range, setRange] = useState({ from: '', to: '' });
//    <RangePicker
//      value={range}              // { from, to }
//      onChange={setRange}
//      presets="default"          // 'default' | tableau custom
//    />
// =============================================================

import { useState, useRef, useEffect } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function shiftDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function shiftMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function formatDateFR(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const DEFAULT_PRESETS = [
  { id: "7d",   label: "7 derniers jours",  range: () => ({ from: shiftDays(-7),   to: todayISO() }) },
  { id: "30d",  label: "30 derniers jours", range: () => ({ from: shiftDays(-30),  to: todayISO() }) },
  { id: "3m",   label: "3 derniers mois",   range: () => ({ from: shiftMonths(-3), to: todayISO() }) },
  { id: "6m",   label: "6 derniers mois",   range: () => ({ from: shiftMonths(-6), to: todayISO() }) },
  { id: "1y",   label: "Cette année",       range: () => ({ from: `${new Date().getFullYear()}-01-01`, to: todayISO() }) },
];

export default function RangePicker({
  value = { from: "", to: "" },
  onChange,
  presets = DEFAULT_PRESETS,
  disabled = false,
  size = "md",
  fullWidth = false,
  placeholder = "Choisir une plage…",
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.from || "");
  const [draftTo, setDraftTo] = useState(value.to || "");
  const rootRef = useRef(null);

  const sizes = {
    sm: { padH: 10, padV: 6,  fontSize: 12,  iconSize: 14 },
    md: { padH: 14, padV: 10, fontSize: 13.5, iconSize: 16 },
    lg: { padH: 18, padV: 13, fontSize: 14.5, iconSize: 18 },
  };
  const sz = sizes[size] || sizes.md;

  // Sync draft avec value à l'ouverture
  useEffect(() => {
    if (open) {
      setDraftFrom(value.from || "");
      setDraftTo(value.to || "");
    }
  }, [open, value.from, value.to]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function applyPreset(p) {
    const r = p.range();
    setDraftFrom(r.from);
    setDraftTo(r.to);
    onChange?.(r);
    setOpen(false);
  }
  function applyCustom() {
    onChange?.({ from: draftFrom, to: draftTo });
    setOpen(false);
  }
  function clearAll() {
    setDraftFrom("");
    setDraftTo("");
    onChange?.({ from: "", to: "" });
    setOpen(false);
  }

  const hasValue = !!(value.from || value.to);
  const display = hasValue
    ? `${formatDateFR(value.from) || "—"} → ${formatDateFR(value.to) || "—"}`
    : "";

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        minWidth: 280,
      }}
    >
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: `${sz.padV}px ${sz.padH}px`,
          background: "var(--av-g0, #fff)",
          border: open ? "1.5px solid #7CC8C8" : "1.5px solid var(--av-g200, #e3e9ee)",
          borderRadius: 10,
          fontSize: sz.fontSize,
          fontWeight: 500,
          fontFamily: "inherit",
          color: hasValue ? "var(--av-navy, #142131)" : "var(--av-g500, #8a98a8)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 150ms, box-shadow 200ms",
          boxShadow: open ? "0 0 0 3px rgba(124,200,200,.20)" : "none",
          outline: "none",
          textAlign: "left",
          minHeight: sz.padV * 2 + sz.fontSize + 8,
        }}
      >
        <i className="ti ti-calendar-stats" style={{
          fontSize: sz.iconSize,
          color: hasValue ? "#185FA5" : "#8a98a8",
          flexShrink: 0,
        }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hasValue ? display : placeholder}
        </span>
        {hasValue && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
            role="button"
            tabIndex={-1}
            aria-label="Effacer la plage"
            style={{
              width: 22, height: 22,
              borderRadius: 6,
              background: "var(--av-g100, #f4f7fa)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#8a98a8",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </span>
        )}
        <i className="ti ti-chevron-down" style={{
          fontSize: 14,
          color: "var(--av-g500, #8a98a8)",
          transition: "transform 200ms",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          flexShrink: 0,
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Sélection de plage"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            background: "var(--av-g0, #fff)",
            border: "1px solid var(--av-g200, #e3e9ee)",
            borderRadius: 12,
            boxShadow: "0 20px 40px rgba(20,33,49,.18), 0 8px 16px rgba(20,33,49,.10)",
            zIndex: 100,
            overflow: "hidden",
            animation: "av-select-pop 200ms cubic-bezier(.2,.8,.2,1)",
            display: "flex",
            minWidth: 460,
          }}
        >
          {/* Colonne presets */}
          <div style={{
            padding: 8,
            background: "var(--av-g100, #f4f7fa)",
            borderRight: "1px solid var(--av-g200, #e3e9ee)",
            minWidth: 180,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".5px",
              color: "#6c7a89",
              textTransform: "uppercase",
              padding: "8px 10px 6px",
            }}>
              Presets
            </div>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontFamily: "inherit",
                  color: "var(--av-navy, #142131)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 100ms",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(124,200,200,.14)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <i className="ti ti-clock-bolt" style={{ fontSize: 13, color: "#7CC8C8" }} />
                {p.label}
              </button>
            ))}
          </div>

          {/* Colonne custom */}
          <div style={{ padding: 16, minWidth: 280 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".5px",
              color: "#6c7a89",
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              Plage personnalisée
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6c7a89",
                  marginBottom: 4,
                }}>Du</label>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  max={draftTo || undefined}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--av-g200, #e3e9ee)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6c7a89",
                  marginBottom: 4,
                }}>Au</label>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  min={draftFrom || undefined}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--av-g200, #e3e9ee)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={clearAll}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--av-g200, #e3e9ee)",
                  background: "var(--av-g0, #fff)",
                  color: "var(--av-g700, #4a5868)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!draftFrom && !draftTo}
                style={{
                  padding: "7px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: (draftFrom || draftTo)
                    ? "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)"
                    : "var(--av-g200, #e3e9ee)",
                  color: (draftFrom || draftTo) ? "#fff" : "var(--av-g500, #8a98a8)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: (draftFrom || draftTo) ? "pointer" : "not-allowed",
                  boxShadow: (draftFrom || draftTo) ? "0 2px 6px rgba(124,200,200,.30)" : "none",
                }}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
