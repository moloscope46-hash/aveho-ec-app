"use client";
// =============================================================
//  TimePicker — Sélecteur d'heure premium (0.58.12)
//
//  Trigger button au design premium (cohérent avec DatePicker/Select)
//  + dropdown qui présente des créneaux par tranches de 15/30/60 min.
//  Possibilité de saisie libre via deux <input> HH:MM cachés
//  derrière le bouton.
//
//  Usage :
//    const [time, setTime] = useState("14:30");
//    <TimePicker
//      value={time}
//      onChange={setTime}
//      step={15}             // 15 | 30 | 60 (défaut 30)
//      minTime="08:00"
//      maxTime="19:00"
//    />
// =============================================================

import { useState, useRef, useEffect, useMemo } from "react";

function toMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function toHHMM(min) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function TimePicker({
  value = "",
  onChange,
  step = 30,             // minutes entre chaque créneau (15, 30, 60)
  minTime = "00:00",
  maxTime = "23:59",
  disabled = false,
  size = "md",
  fullWidth = false,
  placeholder = "Choisir une heure…",
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const dropdownRef = useRef(null);

  const sizes = {
    sm: { padH: 10, padV: 6, fontSize: 12, iconSize: 14 },
    md: { padH: 14, padV: 10, fontSize: 13.5, iconSize: 16 },
    lg: { padH: 18, padV: 13, fontSize: 14.5, iconSize: 18 },
  };
  const sz = sizes[size] || sizes.md;

  // Générer les créneaux selon step + minTime/maxTime
  const slots = useMemo(() => {
    const startMin = toMinutes(minTime) ?? 0;
    const endMin = toMinutes(maxTime) ?? (24 * 60 - 1);
    const list = [];
    for (let m = startMin; m <= endMin; m += step) {
      list.push(toHHMM(m));
    }
    return list;
  }, [minTime, maxTime, step]);

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

  // Scroll vers la valeur sélectionnée à l'ouverture
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      const el = dropdownRef.current?.querySelector(`[data-slot="${value}"]`);
      if (el && dropdownRef.current) {
        const offset = el.offsetTop - dropdownRef.current.offsetHeight / 2 + el.offsetHeight / 2;
        dropdownRef.current.scrollTop = Math.max(0, offset);
      }
    }, 30);
  }, [open, value]);

  // Keyboard
  function onKey(e) {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (open && e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  function clearTime(e) {
    e.stopPropagation();
    onChange?.("");
  }

  const hasValue = !!value;

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        minWidth: 170,
      }}
      onKeyDown={onKey}
    >
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
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
          border: open
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
          boxShadow: open
            ? "0 0 0 3px rgba(124,200,200,.20)"
            : "none",
          outline: "none",
          textAlign: "left",
          minHeight: sz.padV * 2 + sz.fontSize + 8,
        }}
        onMouseEnter={(e) => {
          if (!open && !disabled) e.currentTarget.style.borderColor = "#cfd8e0";
        }}
        onMouseLeave={(e) => {
          if (!open && !disabled) e.currentTarget.style.borderColor = "#e3e9ee";
        }}
      >
        <i className="ti ti-clock" style={{
          fontSize: sz.iconSize,
          color: hasValue ? "#185FA5" : "#8a98a8",
          flexShrink: 0,
        }} />
        <span style={{ flex: 1 }}>
          {hasValue ? value : placeholder}
        </span>
        {hasValue && !disabled && (
          <span
            onClick={clearTime}
            role="button"
            tabIndex={-1}
            aria-label="Effacer l'heure"
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
        <i className="ti ti-chevron-down" style={{
          fontSize: 14,
          color: "var(--av-g500, #8a98a8)",
          transition: "transform 200ms",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          flexShrink: 0,
        }} />
      </button>

      {/* Dropdown créneaux */}
      {open && (
        <div
          ref={dropdownRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--av-g0, #fff)",
            border: "1px solid var(--av-g200, #e3e9ee)",
            borderRadius: 12,
            boxShadow: "0 20px 40px rgba(20,33,49,.18), 0 8px 16px rgba(20,33,49,.10)",
            zIndex: 100,
            overflow: "hidden",
            animation: "av-select-pop 200ms cubic-bezier(.2,.8,.2,1)",
            maxHeight: 280,
            overflowY: "auto",
            padding: 4,
          }}
        >
          {slots.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 12, color: "#8a98a8", fontStyle: "italic" }}>
              Aucun créneau disponible
            </div>
          ) : (
            slots.map((slot) => {
              const isSelected = slot === value;
              return (
                <button
                  key={slot}
                  data-slot={slot}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange?.(slot);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    background: isSelected
                      ? "linear-gradient(90deg, rgba(124,200,200,.18) 0%, transparent 100%)"
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
                    fontVariantNumeric: "tabular-nums",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(124,200,200,.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <i className="ti ti-clock" style={{
                    fontSize: 14,
                    color: isSelected ? "#7CC8C8" : "#8a98a8",
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1 }}>{slot}</span>
                  {isSelected && (
                    <i className="ti ti-check" style={{ fontSize: 14, color: "#7CC8C8" }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
