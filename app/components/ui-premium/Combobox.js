"use client";
// =============================================================
//  Combobox — Multi-select avec tags (0.58.11)
//
//  Sélection multiple d'options affichées sous forme de tags
//  cliquables. Inspiré du Select mais avec values = array.
//
//  Usage :
//    const [tags, setTags] = useState(["urgent", "perfusion"]);
//    <Combobox
//      values={tags}
//      onChange={setTags}
//      options={[
//        { value: "urgent", label: "Urgent", icon: "ti-alert-triangle" },
//        { value: "perfusion", label: "Perfusion" },
//        { value: "vph", label: "VPH" },
//      ]}
//      placeholder="Sélectionner des tags…"
//      searchable
//    />
// =============================================================

import { useState, useRef, useEffect } from "react";
import { useDropdownPosition, dropdownPositionStyle } from "./useDropdownPosition";

export default function Combobox({
  values = [],
  onChange,
  options = [],
  placeholder = "Sélectionner…",
  searchable = true,
  disabled = false,
  size = "md",
  maxTags = null,         // null = illimité
  fullWidth = true,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  // 0.58.16 : auto-flip up si pas assez de place en bas
  const flipUp = useDropdownPosition(rootRef, open, { maxHeight: 320 });

  const sizes = {
    sm: { padH: 8,  padV: 4, fontSize: 12 },
    md: { padH: 10, padV: 6, fontSize: 13 },
    lg: { padH: 14, padV: 9, fontSize: 14 },
  };
  const sz = sizes[size] || sizes.md;

  // Options non encore sélectionnées (filtrées si search)
  const available = options.filter((o) => !values.includes(o.value));
  const filtered = searchable && searchQ
    ? available.filter((o) =>
        (o.label || "").toLowerCase().includes(searchQ.toLowerCase()) ||
        (o.desc || "").toLowerCase().includes(searchQ.toLowerCase())
      )
    : available;

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

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  function addValue(v) {
    if (maxTags && values.length >= maxTags) return;
    onChange?.([...values, v]);
    setSearchQ("");
    if (maxTags && values.length + 1 >= maxTags) {
      setOpen(false);
    }
  }

  function removeValue(v, e) {
    e?.stopPropagation();
    onChange?.(values.filter((x) => x !== v));
  }

  // Map des options pour récupérer label/icon
  const optMap = Object.fromEntries(options.map((o) => [o.value, o]));

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        minWidth: 200,
      }}
    >
      {/* Trigger / tags container */}
      <div
        onClick={() => !disabled && setOpen(true)}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder}
        tabIndex={disabled ? -1 : 0}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 5,
          padding: `${sz.padV}px ${sz.padH}px`,
          minHeight: 36,
          background: "var(--av-g0, #fff)",
          border: open ? "1.5px solid #7CC8C8" : "1.5px solid var(--av-g200, #e3e9ee)",
          borderRadius: 10,
          fontSize: sz.fontSize,
          color: "var(--av-navy, #142131)",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 150ms, box-shadow 200ms",
          boxShadow: open ? "0 0 0 3px rgba(124,200,200,.20)" : "none",
          outline: "none",
        }}
      >
        {/* Tags */}
        {values.map((v) => {
          const opt = optMap[v] || { label: v };
          return (
            <span
              key={v}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 4px 3px 9px",
                background: "linear-gradient(135deg, rgba(124,200,200,.15) 0%, rgba(124,200,200,.08) 100%)",
                border: "1px solid rgba(124,200,200,.35)",
                borderRadius: 99,
                fontSize: sz.fontSize - 1,
                fontWeight: 500,
                color: "var(--av-navy, #142131)",
                animation: "av-tag-pop 200ms cubic-bezier(.2,.8,.2,1)",
              }}
            >
              {opt.icon && (
                <i className={`ti ${opt.icon}`} style={{
                  fontSize: sz.fontSize,
                  color: opt.iconColor || "#5db5b5",
                }} />
              )}
              {opt.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeValue(v, e)}
                  aria-label={`Retirer ${opt.label}`}
                  style={{
                    width: 18, height: 18,
                    borderRadius: 99,
                    background: "rgba(255,255,255,.7)",
                    border: "none",
                    color: "#6c7a89",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 2,
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ffe5e5";
                    e.currentTarget.style.color = "#c0392b";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,.7)";
                    e.currentTarget.style.color = "#6c7a89";
                  }}
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              )}
            </span>
          );
        })}

        {/* Input fantôme ou placeholder */}
        {values.length === 0 && (
          <span style={{
            color: "var(--av-g500, #8a98a8)",
            padding: "3px 4px",
          }}>
            {placeholder}
          </span>
        )}

        {/* Chevron */}
        <i className="ti ti-chevron-down" style={{
          marginLeft: "auto",
          fontSize: 14,
          color: "var(--av-g500, #8a98a8)",
          transition: "transform 200ms",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          flexShrink: 0,
        }} />
      </div>

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
          {/* Search */}
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

          {/* Compteur restant si maxTags */}
          {maxTags && (
            <div style={{
              padding: "6px 14px",
              fontSize: 11,
              color: "var(--av-g500, #8a98a8)",
              background: "var(--av-g100, #f4f7fa)",
              fontWeight: 500,
            }}>
              {values.length}/{maxTags} sélectionnés
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
                {available.length === 0 ? "Toutes les options sont sélectionnées" : "Aucun résultat"}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => addValue(opt.value)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "inherit",
                    color: "var(--av-navy, #142131)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(90deg, rgba(124,200,200,.14) 0%, transparent 100%)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {opt.icon && (
                    <i className={`ti ${opt.icon}`} style={{
                      fontSize: 16,
                      color: opt.iconColor || "#185FA5",
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
                  <i className="ti ti-plus" style={{
                    fontSize: 14,
                    color: "#7CC8C8",
                    flexShrink: 0,
                  }} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
