"use client";
// =============================================================
//  AddressAutocomplete.js
//  Alpha 0.54.0 (AX) — Autocomplete adresse via api-adresse.data.gouv.fr
//
//  API publique gratuite, sans clé, française (BAN).
//  Retourne lat/lng + adresse normalisée + code postal + ville.
//
//  Usage :
//   <AddressAutocomplete 
//     value={form.adresse}
//     onSelect={(addr) => setForm({
//       ...form,
//       adresse: addr.label,
//       code_postal: addr.cp,
//       ville: addr.ville,
//       latitude: addr.lat,
//       longitude: addr.lng,
//     })}
//   />
// =============================================================
import { useState, useEffect, useRef } from "react";
import { logger } from "../lib/logger";

export default function AddressAutocomplete({ value, onSelect, placeholder = "Ex : 12 rue de Rivoli, Paris", style }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Click outside fermeture
  useEffect(() => {
    function onClickOut(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=6`
        );
        const data = await res.json();
        const features = (data.features || []).map(f => ({
          label: f.properties.label,
          cp: f.properties.postcode || "",
          ville: f.properties.city || "",
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          score: f.properties.score,
          contexte: f.properties.context || "",
        }));
        setSuggestions(features);
        setOpen(features.length > 0);
      } catch (e) {
        logger.warn("Autocomplete adresse :", e?.message);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function pick(s) {
    setQuery(s.label);
    setOpen(false);
    setSuggestions([]);
    onSelect && onSelect(s);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 12px",
          border: "1px solid #e3e9ee", borderRadius: 8,
          fontFamily: "inherit", fontSize: 13.5,
          ...style,
        }}
      />
      {loading && (
        <div style={{ position: "absolute", right: 10, top: 9, fontSize: 11, color: "#8a98a8" }}>
          <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 2px)",
          left: 0, right: 0,
          background: "#fff",
          border: "1px solid #e3e9ee",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(20,33,49,.12)",
          zIndex: 60,
          maxHeight: 280,
          overflowY: "auto",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(s)}
              style={{
                display: "block", width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom: i < suggestions.length - 1 ? "1px solid #f0f0f0" : "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f4f7fa"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: 13.5, color: "#142131", fontWeight: 500 }}>
                <i className="ti ti-map-pin" style={{ color: "#185FA5", marginRight: 6 }} />
                {s.label}
              </div>
              <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2, marginLeft: 22 }}>
                {s.contexte}
              </div>
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
