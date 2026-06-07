"use client";
// =============================================================
//  components/AutoCompleteList.js (0.62.75)
//
//  AutoComplete générique avec liste dropdown cliquable.
//  À utiliser partout où on a un input + suggestions.
//
//  Usage :
//    <AutoCompleteList
//      value={search}
//      onChange={setSearch}
//      onSelect={(item) => setForm({ ...form, foo: item.id })}
//      items={items}
//      renderItem={(item) => <span>{item.nom}</span>}
//      getKey={(item) => item.id}
//      filter={(item, q) => item.nom.toLowerCase().includes(q.toLowerCase())}
//      placeholder="Rechercher..."
//      maxResults={20}
//    />
// =============================================================
import { useState, useEffect, useRef } from "react";

export default function AutoCompleteList({
  value, onChange, onSelect,
  items = [],
  renderItem,
  getKey = (item) => item.id,
  filter,
  placeholder = "🔍 Rechercher...",
  maxResults = 20,
  emptyText = "Aucun résultat",
  accentColor = "#185FA5",
  inputStyle = {},
}) {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Filtrage
  const filtered = items
    .filter(item => {
      if (!value?.trim()) return true;
      if (filter) return filter(item, value);
      const txt = JSON.stringify(item).toLowerCase();
      return txt.includes(value.toLowerCase());
    })
    .slice(0, maxResults);

  function handleSelect(item) {
    onSelect?.(item);
    setOpen(false);
    setHoverIdx(-1);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHoverIdx(idx => Math.min(idx + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx(idx => Math.max(idx - 1, 0));
    } else if (e.key === "Enter" && hoverIdx >= 0 && filtered[hoverIdx]) {
      e.preventDefault();
      handleSelect(filtered[hoverIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        value={value || ""}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #e3e9ee",
          borderRadius: 8,
          fontFamily: "inherit",
          fontSize: 13,
          ...inputStyle,
        }}
      />

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          marginTop: 4,
          background: "#fff",
          border: "1px solid #e3e9ee",
          borderRadius: 10,
          boxShadow: "0 8px 20px rgba(20,33,49,.12), 0 2px 6px rgba(20,33,49,.06)",
          zIndex: 100,
          maxHeight: 320,
          overflowY: "auto",
          animation: "av-autocomplete-fade 200ms ease-out",
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: 14, textAlign: "center",
              color: "#8a98a8", fontSize: 12.5,
            }}>
              <i className="ti ti-search-off" /> {emptyText}
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHoverIdx(idx)}
                style={{
                  display: "block", width: "100%",
                  padding: "9px 12px",
                  background: hoverIdx === idx
                    ? `linear-gradient(135deg, ${accentColor}12, ${accentColor}06)`
                    : "transparent",
                  color: "#142131",
                  border: "none",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #f4f7fa" : "none",
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background 120ms",
                  borderLeft: hoverIdx === idx ? `3px solid ${accentColor}` : "3px solid transparent",
                }}
              >
                {renderItem ? renderItem(item, value) : (
                  <span>{item.nom || item.label || JSON.stringify(item)}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
