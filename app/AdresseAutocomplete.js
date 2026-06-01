"use client";
// =============================================================
//  app/AdresseAutocomplete.js (Alpha 0.55.55)
//
//  Autocomplete d'adresse via l'API BAN (Base Adresse Nationale)
//  api-adresse.data.gouv.fr — gratuite, illimitée, sans clé.
//
//  Quand l'utilisateur sélectionne une adresse :
//    onSelect({
//      adresse: "12 Rue du Lac",      // numero + voie
//      code_postal: "75011",
//      ville: "Paris",
//      code_insee: "75111",            // commune INSEE (5 chiffres)
//      latitude: 48.8566,
//      longitude: 2.3522,
//      label: "12 Rue du Lac 75011 Paris",
//      context: "75, Paris, Île-de-France",
//      type: "housenumber" | "street" | "locality" | "municipality"
//    })
//
//  Props :
//    - value : texte affiché dans l'input
//    - onChange(v) : appelé à chaque frappe (pour piloter l'input)
//    - onSelect(adresse) : appelé quand l'user choisit une suggestion
//    - placeholder, autoFocus, compact, style
//    - cp : optionnel, restreint la recherche à ce code postal
// =============================================================

import { useEffect, useRef, useState } from "react";

const BAN_BASE = "https://api-adresse.data.gouv.fr/search/";

export default function AdresseAutocomplete({
  value = "",
  onChange,
  onSelect,
  placeholder = "Adresse (saisir au moins 3 caractères)…",
  autoFocus = false,
  compact = false,
  cp = "",
  style,
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync prop → state
  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    function onClickOut(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleChange(e) {
    const v = e.target.value;
    setQuery(v);
    onChange?.(v);
    triggerSearch(v);
  }

  function triggerSearch(val) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: val.trim(),
          limit: "8",
          autocomplete: "1",
        });
        if (cp && /^\d{5}$/.test(cp)) {
          params.set("postcode", cp);
        }
        const res = await fetch(`${BAN_BASE}?${params.toString()}`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        setResults(data.features || []);
        setOpen(true);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function pick(feature) {
    const p = feature.properties;
    const [lng, lat] = feature.geometry?.coordinates || [null, null];
    const adresse = {
      adresse: [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "",
      code_postal: p.postcode || "",
      ville: p.city || "",
      code_insee: p.citycode || "",          // 5 chiffres INSEE de la commune
      latitude: lat,
      longitude: lng,
      label: p.label || "",
      context: p.context || "",
      type: p.type || "",
    };
    setQuery(adresse.label);
    onChange?.(adresse.label);
    setOpen(false);
    onSelect?.(adresse);
  }

  function typeColor(t) {
    if (t === "housenumber") return { bg: "#dff5e0", fg: "#2e6f33" };
    if (t === "street") return { bg: "#dbe7f5", fg: "#185FA5" };
    if (t === "locality") return { bg: "#f3effa", fg: "#5a4a90" };
    if (t === "municipality") return { bg: "#fff8ec", fg: "#7a4f15" };
    return { bg: "#f4f7fa", fg: "#6c7a89" };
  }
  function typeLabel(t) {
    if (t === "housenumber") return "Numéro";
    if (t === "street") return "Rue";
    if (t === "locality") return "Lieu-dit";
    if (t === "municipality") return "Commune";
    return t;
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...(style || {}) }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: compact ? "6px 30px 6px 30px" : "8px 30px 8px 32px",
            border: "1px solid #d3d9e0",
            borderRadius: 6,
            fontSize: compact ? 12 : 13,
            fontFamily: "inherit",
            background: "#fff",
          }}
        />
        <i className="ti ti-map-pin" style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          color: "#5aa05a", fontSize: 14, pointerEvents: "none",
        }} />
        {loading && (
          <i className="ti ti-loader-2" style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            color: "#5aa05a", animation: "spin 1s linear infinite",
          }} />
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #d3d9e0",
          borderRadius: 8, boxShadow: "0 6px 18px rgba(20,33,49,0.15)",
          maxHeight: 320, overflowY: "auto", zIndex: 1000,
        }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: 14, color: "#8a98a8", fontSize: 12.5, textAlign: "center" }}>
              Aucune adresse trouvée. Continue à taper ou vérifie l'orthographe.
            </div>
          )}
          {results.map((feat, i) => {
            const p = feat.properties;
            const c = typeColor(p.type);
            return (
              <div
                key={`${p.id}-${i}`}
                onClick={() => pick(feat)}
                style={{
                  padding: "8px 12px", cursor: "pointer",
                  borderBottom: "1px solid #f4f7fa",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f4f7fa"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#142131" }}>
                    {p.label}
                  </span>
                  <span style={{
                    background: c.bg, color: c.fg,
                    fontSize: 9.5, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 6,
                    textTransform: "uppercase", letterSpacing: 0.3,
                  }}>
                    {typeLabel(p.type)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2, display: "flex", gap: 8 }}>
                  {p.context && <span>{p.context}</span>}
                  {p.citycode && (
                    <code style={{ fontFamily: "Consolas,monospace", color: "#a0aeb9" }}>
                      INSEE {p.citycode}
                    </code>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ padding: "6px 12px", fontSize: 10, color: "#a0aeb9", borderTop: "1px solid #f4f7fa", textAlign: "center", background: "#f9fafb" }}>
            <i className="ti ti-database" /> Source : Base Adresse Nationale (BAN) — data.gouv.fr
          </div>
        </div>
      )}
    </div>
  );
}
