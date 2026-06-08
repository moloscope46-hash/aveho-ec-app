"use client";
// =============================================================
//  components/SmartInput.js (0.62.128)
//
//  Input avec auto-complétion intelligente basée sur l'historique
//  de saisie. Sauvegarde locale + DB optionnelle.
//
//  Usage :
//    <SmartInput
//      value={form.libelle}
//      onChange={(v) => setForm({...form, libelle: v})}
//      contextKey="materiel.libelle"     // pour mémoriser séparément
//      placeholder="..."
//    />
// =============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "../../lib/supabase";

const MAX_LOCAL = 50;

function getHistory(contextKey) {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(`smart_input_${contextKey}`);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveHistory(contextKey, value) {
  if (typeof window === "undefined" || !value || value.length < 2) return;
  try {
    const list = getHistory(contextKey);
    const existing = list.find(e => e.v === value);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.last = Date.now();
    } else {
      list.unshift({ v: value, count: 1, last: Date.now() });
    }
    const sorted = list
      .sort((a, b) => (b.count * 10 + (b.last > Date.now() - 86400000 ? 5 : 0)) - (a.count * 10))
      .slice(0, MAX_LOCAL);
    localStorage.setItem(`smart_input_${contextKey}`, JSON.stringify(sorted));
  } catch {}
}

export default function SmartInput({
  value = "",
  onChange,
  contextKey = "default",
  placeholder,
  type = "text",
  style,
  inputStyle,
  className,
  onBlur,
  disabled,
  required,
  ...rest
}) {
  const [internal, setInternal] = useState(value);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  // Sync value externe
  useEffect(() => { setInternal(value); }, [value]);

  // Calcul suggestions à la frappe
  useEffect(() => {
    if (!internal || internal.length < 1) {
      setSuggestions([]);
      return;
    }
    const history = getHistory(contextKey);
    const q = internal.toLowerCase();
    const matches = history
      .filter(h => h.v.toLowerCase().includes(q) && h.v !== internal)
      .slice(0, 5);
    setSuggestions(matches);
  }, [internal, contextKey]);

  const handleSelect = (val) => {
    setInternal(val);
    onChange?.(val);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setInternal(v);
    onChange?.(v);
    setOpen(true);
    setActiveIdx(-1);
  };

  const handleBlur = useCallback((e) => {
    // Délai pour laisser le click sur suggestion fonctionner
    setTimeout(() => {
      setOpen(false);
      saveHistory(contextKey, internal);
    }, 150);
    onBlur?.(e);
  }, [internal, contextKey, onBlur]);

  const handleKey = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx].v);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={className} style={{ position: "relative", ...style }}>
      <input
        ref={inputRef}
        type={type}
        value={internal}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={{
          width: "100%",
          ...inputStyle,
        }}
        {...rest}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: 3,
          background: "#fff",
          border: "1.5px solid #cfd8e0",
          borderRadius: 8,
          boxShadow: "0 6px 20px rgba(20, 33, 49, 0.12)",
          zIndex: 100,
          overflow: "hidden",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          <div style={{
            padding: "4px 10px",
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "#8a98a8",
            background: "#fafbfc",
            letterSpacing: 0.4,
            borderBottom: "1px solid #e3e9ee",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <i className="ti ti-sparkles" /> Suggestions ({suggestions.length})
          </div>
          {suggestions.map((s, i) => (
            <div key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s.v); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 13,
                background: activeIdx === i ? "linear-gradient(135deg, #eef6fc, #fff)" : "transparent",
                borderLeft: activeIdx === i ? "3px solid #185FA5" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 120ms",
              }}>
              <i className="ti ti-history" style={{ color: "#8a98a8", fontSize: 12 }} />
              <span style={{ flex: 1 }}>{s.v}</span>
              {s.count > 1 && (
                <span style={{
                  fontSize: 9,
                  background: "#eef6fc",
                  color: "#185FA5",
                  padding: "1px 6px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}>×{s.count}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
