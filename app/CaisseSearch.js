"use client";
// =============================================================
//  app/CaisseSearch.js (Alpha 0.55.46)
//
//  Autocomplete pour les caisses d'assurance maladie.
//  Style identique à FinessSearch / SireneSearch / RppsAutocomplete.
//
//  Props :
//    - onSelect(caisse) : callback avec la caisse choisie
//    - defaultDept : filtre par défaut (ex "75")
// =============================================================

import { useState, useEffect, useRef } from "react";

export default function CaisseSearch({
  onSelect,
  placeholder = "Chercher CPAM / MSA / CGSS (par nom, dept ou code)…",
  defaultDept = "",
  style,
}) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState(defaultDept);
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
      setLoading(true);
      try {
        const params = new URLSearchParams();
        // Si query = 9 chiffres → recherche par code
        if (/^\d{9}$/.test(val.trim())) {
          params.set("code", val.trim());
        } else {
          if (val.trim()) params.set("q", val.trim());
        }
        if (dept) params.set("dept", dept);
        params.set("limit", "30");
        const res = await fetch(`/api/caisses?${params}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function pick(r) {
    setQuery(r.nom);
    setOpen(false);
    onSelect?.(r);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...(style || {}) }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={dept}
          onChange={(e) => { setDept(e.target.value); triggerSearch(query); }}
          placeholder="Dpt"
          maxLength={3}
          style={{
            width: 50,
            padding: "8px 6px",
            border: "1px solid #d3d9e0",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: "inherit",
            textAlign: "center",
            background: "#fff",
          }}
        />
        <div style={{ position: "relative", flex: 1 }}>
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
            }}
          />
          <i className="ti ti-shield-check" style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "#185FA5", fontSize: 14, pointerEvents: "none",
          }} />
          {loading && (
            <i className="ti ti-loader-2" style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              color: "#185FA5", animation: "spin 1s linear infinite",
            }} />
          )}
        </div>
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
              Aucune caisse trouvée. Vérifie le n° de département ou le nom.
            </div>
          )}
          {results.map((r) => (
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#142131" }}>{r.nom}</div>
                {r.code_organisme && (
                  <code style={{ fontFamily: "Consolas,monospace", color: "#185FA5", fontSize: 11 }}>
                    {r.code_organisme}
                  </code>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 2 }}>
                {r.type_caisse} · {r.regime}{r.departement ? ` · Dept ${r.departement}` : ""}
                {r.region ? ` · ${r.region}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
