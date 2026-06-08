"use client";
// =============================================================
//  components/AddressAutocomplete.js (0.62.118)
//
//  Champ de saisie d'adresse avec autocomplete via l'API
//  Adresse du gouvernement français (api-adresse.data.gouv.fr).
//  Récupère adresse complète + code postal + ville + coordonnées GPS.
//
//  Usage :
//    <AddressAutocomplete
//      value={form.adresse}
//      onChange={(adresse, full) => setForm({...form, adresse, cp: full.cp, ville: full.ville, lat: full.lat, lng: full.lng})}
//      placeholder="Ex: 1 rue de la Paix Paris"
//    />
// =============================================================

import { useState, useEffect, useRef } from "react";

export default function AddressAutocomplete({
  value = "",
  onChange,
  placeholder = "Adresse postale",
  required = false,
  disabled = false,
  style = {},
  limit = 7,
  cityOnly = false, // pour ne chercher que des villes/codes postaux
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync external value → query
  useEffect(() => {
    if (value !== query) setQuery(value || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced fetch
  useEffect(() => {
    if (!focused) return;
    if (!query || query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const type = cityOnly ? "&type=municipality" : "";
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=${limit}${type}`;
        const res = await fetch(url);
        const data = await res.json();
        setSuggestions(data.features || []);
        setOpen(true);
      } catch (e) {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, focused, limit, cityOnly]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function selectSuggestion(s) {
    const p = s.properties;
    const fullAdresse = p.label || "";
    const detail = {
      adresse: p.name || p.label || "",
      adresseComplete: fullAdresse,
      cp: p.postcode || "",
      ville: p.city || p.name || "",
      insee: p.citycode || "",
      lat: s.geometry?.coordinates?.[1] || null,
      lng: s.geometry?.coordinates?.[0] || null,
      contexte: p.context || "",
      type: p.type || "",
    };
    setQuery(fullAdresse);
    setOpen(false);
    setSuggestions([]);
    onChange && onChange(fullAdresse, detail);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", ...style }}>
      <div style={{ position: "relative" }}>
        <i className="ti ti-map-pin" style={{
          position: "absolute", left: 12, top: "50%",
          transform: "translateY(-50%)",
          color: "#7a6fb0", fontSize: 16,
          pointerEvents: "none",
        }} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange && onChange(e.target.value, null);
          }}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "10px 38px 10px 38px",
            borderRadius: 10,
            border: "1.5px solid #e3e9ee",
            fontSize: 14,
            fontFamily: "inherit",
            background: disabled ? "#f4f7fa" : "#fff",
            outline: "none",
            boxSizing: "border-box",
            transition: "all 200ms",
          }}
        />
        {loading && (
          <i className="ti ti-loader-2" style={{
            position: "absolute", right: 12, top: "50%",
            transform: "translateY(-50%)",
            color: "#7CC8C8", fontSize: 14,
            animation: "av-spinner-spin 0.85s linear infinite",
          }} />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange && onChange("", null);
              setSuggestions([]);
              setOpen(false);
            }}
            aria-label="Effacer"
            style={{
              position: "absolute", right: 8, top: "50%",
              transform: "translateY(-50%)",
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

      {/* Dropdown des suggestions */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: "#fff",
          border: "1px solid #e3e9ee",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(20, 33, 49, .18)",
          zIndex: 1000,
          maxHeight: 320,
          overflowY: "auto",
          animation: "av-list-fade-in 200ms ease-out",
        }}>
          {suggestions.map((s, i) => {
            const p = s.properties;
            return (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                style={{
                  display: "flex",
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "10px 14px",
                  cursor: "pointer",
                  alignItems: "flex-start",
                  gap: 10,
                  fontFamily: "inherit",
                  fontSize: 13,
                  borderBottom: i < suggestions.length - 1 ? "1px solid #f0f3f6" : "none",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124, 200, 200, .08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <i className="ti ti-map-pin" style={{ color: "#7a6fb0", marginTop: 2, fontSize: 14 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#142131", marginBottom: 2 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a98a8" }}>
                    {p.context} {p.citycode && <code style={{ marginLeft: 6, color: "#7a6fb0", fontFamily: "Consolas, monospace" }}>INSEE {p.citycode}</code>}
                  </div>
                </div>
              </button>
            );
          })}
          {/* Footer attribution */}
          <div style={{
            padding: "6px 14px",
            fontSize: 10,
            color: "#8a98a8",
            borderTop: "1px solid #f0f3f6",
            background: "#fafbfc",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>Adresses : api-adresse.data.gouv.fr</span>
            <span style={{ color: "#5aa05a", fontWeight: 600 }}>✓ Données officielles</span>
          </div>
        </div>
      )}
    </div>
  );
}
