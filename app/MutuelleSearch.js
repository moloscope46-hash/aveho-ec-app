"use client";
// =============================================================
//  app/MutuelleSearch.js (Alpha 0.55.46)
//
//  Autocomplete pour les organismes complémentaires santé.
//  Recherche par nom, nom court ou numéro AMC.
// =============================================================

import { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../lib/fetchWithAuth";

export default function MutuelleSearch({
  onSelect,
  placeholder = "Chercher mutuelle, assurance ou n° AMC (8 chiffres)…",
  style,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function onClickOut(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    triggerSearch(val);
  }

  function triggerSearch(val) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (val.trim().length < 2 && !/^\d{2,}$/.test(val.trim())) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (/^\d{8}$/.test(val.trim())) {
          params.set("amc", val.trim());
        } else {
          params.set("q", val.trim());
        }
        params.set("limit", "30");
        const res = await fetchWithAuth(`/api/mutuelles?${params}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function pick(r) {
    setQuery(r.raison_sociale);
    setOpen(false);
    onSelect?.(r);
  }

  function typeBadgeColor(t) {
    if (t === "mutuelle") return { bg: "#dff5e0", fg: "#2e6f33" };
    if (t === "assurance") return { bg: "#dbe7f5", fg: "#185FA5" };
    if (t === "IP") return { bg: "#f3effa", fg: "#5a4a90" };
    return { bg: "#f4f7fa", fg: "#6c7a89" };
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...(style || {}) }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "8px 30px 8px 32px",
            border: "1px solid #d3d9e0",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "inherit",
            boxSizing: "border-box",
            background: "#fff",
          }}
        />
        <i className="ti ti-heart-handshake" style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          color: "#7a6fb0", fontSize: 14, pointerEvents: "none",
        }} />
        {loading && (
          <i className="ti ti-loader-2" style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            color: "#7a6fb0", animation: "spin 1s linear infinite",
          }} />
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #d3d9e0",
          borderRadius: 8, boxShadow: "0 6px 18px rgba(20,33,49,0.15)",
          maxHeight: 360, overflowY: "auto", zIndex: 1000,
        }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: 14, color: "#8a98a8", fontSize: 12.5, textAlign: "center" }}>
              Aucune mutuelle. Tente le n° AMC (8 chiffres) ou le nom partiel.
            </div>
          )}
          {results.map((r) => {
            const c = typeBadgeColor(r.type_organisme);
            return (
              <div
                key={r.id}
                onClick={() => pick(r)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f4f7fa",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f4f7fa"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{r.raison_sociale}</span>
                  <span style={{
                    background: c.bg, color: c.fg,
                    fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 6,
                    textTransform: "uppercase", letterSpacing: 0.3,
                  }}>
                    {r.type_organisme}
                  </span>
                  {r.gere_c2s && (
                    <span style={{
                      background: "#fff8ec", color: "#7a4f15",
                      fontSize: 10, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 6,
                    }}>C2S</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2, display: "flex", gap: 8 }}>
                  {r.categorie && <span>{r.categorie}</span>}
                  {r.numero_amc && (
                    <code style={{ fontFamily: "Consolas,monospace", color: "#a0aeb9" }}>
                      AMC {r.numero_amc}
                    </code>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
