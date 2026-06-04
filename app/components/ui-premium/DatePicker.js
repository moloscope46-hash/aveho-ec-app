"use client";
// =============================================================
//  DatePicker — Sélecteur de date premium (0.58.11)
//
//  Wrapper sur <input type="date"> natif avec design premium,
//  icon de calendrier, affichage formaté en français, et label
//  intégré qui se déplace au focus (style material).
//
//  Usage :
//    const [date, setDate] = useState("2026-06-04");
//    <DatePicker
//      value={date}
//      onChange={setDate}
//      label="Date de naissance"
//      min="1900-01-01"
//      max="2030-12-31"
//    />
// =============================================================

import { useRef, useState } from "react";

function formatDateFR(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function DatePicker({
  value = "",
  onChange,
  label,
  placeholder = "Sélectionner une date…",
  min,
  max,
  disabled = false,
  size = "md",          // sm | md | lg
  required = false,
  fullWidth = false,
  ariaLabel,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const sizes = {
    sm: { padH: 10, padV: 6, fontSize: 12, iconSize: 14 },
    md: { padH: 14, padV: 10, fontSize: 13.5, iconSize: 16 },
    lg: { padH: 18, padV: 13, fontSize: 14.5, iconSize: 18 },
  };
  const sz = sizes[size] || sizes.md;

  // Ouvre le picker natif au click sur le trigger
  function openPicker() {
    if (disabled) return;
    if (inputRef.current && inputRef.current.showPicker) {
      try { inputRef.current.showPicker(); } catch (e) {
        inputRef.current.click();
      }
    } else {
      inputRef.current?.click();
    }
  }

  function clearDate(e) {
    e.stopPropagation();
    onChange?.("");
    inputRef.current?.focus();
  }

  const display = value ? formatDateFR(value) : "";
  const hasValue = !!value;

  return (
    <div style={{
      position: "relative",
      display: fullWidth ? "block" : "inline-block",
      width: fullWidth ? "100%" : "auto",
      minWidth: 200,
    }}>
      {/* Input natif caché — pour la fonctionnalité date + accessibilité */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel || label || placeholder}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />

      {/* Trigger button visible */}
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        style={{
          width: "100%",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: `${sz.padV}px ${sz.padH}px`,
          background: "var(--av-g0, #fff)",
          border: focused
            ? "1.5px solid #7CC8C8"
            : "1.5px solid var(--av-g200, #e3e9ee)",
          borderRadius: 10,
          fontSize: sz.fontSize,
          fontWeight: 500,
          fontFamily: "inherit",
          color: hasValue ? "var(--av-navy, #142131)" : "var(--av-g500, #8a98a8)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 150ms, box-shadow 200ms",
          boxShadow: focused
            ? "0 0 0 3px rgba(124,200,200,.20)"
            : "none",
          outline: "none",
          textAlign: "left",
          minHeight: sz.padV * 2 + sz.fontSize + 8,
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!focused && !disabled) e.currentTarget.style.borderColor = "#cfd8e0";
        }}
        onMouseLeave={(e) => {
          if (!focused && !disabled) e.currentTarget.style.borderColor = "#e3e9ee";
        }}
      >
        <i className="ti ti-calendar-event" style={{
          fontSize: sz.iconSize,
          color: hasValue ? "#185FA5" : "#8a98a8",
          flexShrink: 0,
        }} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hasValue ? display : placeholder}
        </span>
        {hasValue && !disabled && (
          <span
            onClick={clearDate}
            role="button"
            tabIndex={-1}
            aria-label="Effacer la date"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "var(--av-g100, #f4f7fa)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#8a98a8",
              flexShrink: 0,
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffe5e5";
              e.currentTarget.style.color = "#c0392b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--av-g100, #f4f7fa)";
              e.currentTarget.style.color = "#8a98a8";
            }}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </span>
        )}
      </button>
    </div>
  );
}
