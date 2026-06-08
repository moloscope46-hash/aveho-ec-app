"use client";
// =============================================================
//  components/SmartSelect.js (0.62.131)
//
//  Combobox : input texte avec dropdown d'options OU suggestions
//  historique. Combine SmartInput + select natif.
//
//  Usage :
//    <SmartSelect
//      value={form.type}
//      onChange={(v) => setForm({...form, type: v})}
//      options={[{ value: "A", label: "Option A" }, ...]}
//      contextKey="signalement.type"   // pour historique partagé
//      allowCustom={true}              // autoriser saisie libre
//      placeholder="Choisir ou saisir..."
//    />
// =============================================================

import { useState, useEffect, useRef, useCallback } from "react";

const MAX_LOCAL = 50;

function getHistory(contextKey) {
  if (typeof window === "undefined" || !contextKey) return [];
  try {
    const s = localStorage.getItem(`smart_select_${contextKey}`);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveHistory(contextKey, value) {
  if (typeof window === "undefined" || !contextKey || !value || value.length < 2) return;
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
    localStorage.setItem(`smart_select_${contextKey}`, JSON.stringify(sorted));
  } catch {}
}

export default function SmartSelect({
  value = "",
  onChange,
  options = [],
  contextKey,
  allowCustom = true,
  placeholder = "Choisir ou saisir...",
  style,
  inputStyle,
  className,
  disabled,
  required,
  ...rest
}) {
  const [internal, setInternal] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external
  useEffect(() => { setInternal(value || ""); }, [value]);

  // Calcul suggestions combinées (options + historique)
  useEffect(() => {
    const q = (internal || "").toLowerCase();
    const opts = options.map(o => ({
      v: o.value ?? o.label,
      l: o.label ?? o.value,
      isOption: true,
    }));
    const hist = getHistory(contextKey).map(h => ({
      v: h.v,
      l: h.v,
      count: h.count,
      isHistory: true,
    })).filter(h => !opts.find(o => o.v === h.v)); // dédup

    let result = [...opts, ...hist];
    if (q) {
      result = result.filter(item => (item.l || "").toLowerCase().includes(q) || (item.v || "").toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [internal, options, contextKey]);

  const handleSelect = (val) => {
    setInternal(val);
    onChange?.(val);
    saveHistory(contextKey, val);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setOpen(false);
      if (allowCustom && internal) saveHistory(contextKey, internal);
    }, 150);
  }, [contextKey, internal, allowCustom]);

  const handleKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIdx].v);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={className} style={{ position: "relative", ...style }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={internal}
          onChange={(e) => {
            const v = e.target.value;
            setInternal(v);
            if (allowCustom) onChange?.(v);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{ width: "100%", paddingRight: 30, ...inputStyle }}
          {...rest}
        />
        <i className={`ti ti-chevron-${open ? "up" : "down"}`}
          onClick={() => { setOpen(!open); inputRef.current?.focus(); }}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            color: "#8a98a8", cursor: "pointer", fontSize: 16, pointerEvents: "auto",
          }} />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%", left: 0, right: 0,
          marginTop: 3,
          background: "#fff",
          border: "1.5px solid #cfd8e0",
          borderRadius: 8,
          boxShadow: "0 6px 20px rgba(20, 33, 49, 0.12)",
          zIndex: 100,
          maxHeight: 240,
          overflowY: "auto",
        }}>
          {filtered.map((item, i) => (
            <div key={`${item.isHistory ? "h" : "o"}-${item.v}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item.v); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "7px 12px",
                cursor: "pointer",
                fontSize: 13,
                background: activeIdx === i ? "linear-gradient(135deg, #eef6fc, #fff)" : "transparent",
                borderLeft: activeIdx === i ? "3px solid #185FA5" : "3px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 120ms",
              }}>
              <i className={`ti ${item.isHistory ? "ti-history" : "ti-list"}`}
                style={{ color: item.isHistory ? "#8a98a8" : "#7CC8C8", fontSize: 12 }} />
              <span style={{ flex: 1 }}>{item.l}</span>
              {item.count > 1 && (
                <span style={{ fontSize: 9, background: "#eef6fc", color: "#185FA5", padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>×{item.count}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
