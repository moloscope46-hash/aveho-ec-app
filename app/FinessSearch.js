"use client";
// =============================================================
//  FinessSearch.js
//  Alpha 0.55.0 — Autocomplete recherche FINESS (data.gouv.fr / ARS)
//
//  Permet de chercher un établissement de santé par nom OU n° FINESS
//  et de le sélectionner pour préremplir un formulaire.
//
//  Usage :
//    <FinessSearch
//      onSelect={(etab) => setForm({...form, ...etab})}
//      placeholder="Hôpital Cochin, Paris…"
//    />
// =============================================================
import { useState, useEffect, useRef } from "react";
import { FINESS_CATEGORIES_GROUPS } from "../lib/finessCategories";
import { fetchWithAuth } from "../lib/fetchWithAuth";  // 0.57.18 : fix bug auth (était fetch direct)

export default function FinessSearch({ onSelect, placeholder = "Chercher par nom, ville ou n° FINESS…", style, defaultCategories = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 0.55.5 : filtres par catégories métier
  const [selectedCategories, setSelectedCategories] = useState(defaultCategories);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

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
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    triggerSearch(val);
  }

  function triggerSearch(val) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Si filtres actifs et query courte, on peut quand même chercher
    const minLen = selectedCategories.length > 0 ? 0 : 3;
    if (val.trim().length < minLen) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Si l'utilisateur tape un FINESS (9 chiffres), on fait la recherche exacte
        const isFinessNumber = /^\d{9}$/.test(val.trim());
        let url;
        if (isFinessNumber) {
          url = `/api/finess?finess=${encodeURIComponent(val.trim())}`;
        } else {
          const params = new URLSearchParams();
          if (val.trim()) params.set("q", val.trim());
          if (selectedCategories.length > 0) params.set("categories", selectedCategories.join(","));
          params.set("limit", "12");
          url = `/api/finess?${params.toString()}`;
        }
        
        const res = await fetchWithAuth(url);  // 0.57.18 : auth Bearer obligatoire (même bug que SireneSearch fixé en 0.57.16)
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || "Erreur recherche FINESS");
          setResults([]);
        } else {
          setResults(data.results || []);
          setOpen((data.results || []).length > 0);
        }
      } catch (e) {
        setError(e.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  // Retrigger quand catégories changent
  function toggleCategory(key) {
    const next = selectedCategories.includes(key)
      ? selectedCategories.filter(c => c !== key)
      : [...selectedCategories, key];
    setSelectedCategories(next);
    // Re-trigger avec la query actuelle
    setTimeout(() => triggerSearch(query), 50);
  }

  function pick(r) {
    setQuery(r.raison_sociale);
    setOpen(false);
    setResults([]);
    if (onSelect) {
      onSelect({
        nom: r.raison_sociale,
        type: mapCategorie(r.categorie),
        finess: r.finess,
        siret: r.siret,
        adresse: r.adresse,
        code_postal: r.code_postal,
        ville: r.ville,
        telephone: r.telephone,
        latitude: r.latitude,
        longitude: r.longitude,
        capacite: r.capacite,
      });
    }
  }

  // Mapping catégorie FINESS → type interne Aveho
  function mapCategorie(libelle) {
    if (!libelle) return "Autre";
    const lib = libelle.toLowerCase();
    if (lib.includes("ehpad")) return "EHPAD";
    if (lib.includes("hôpital") || lib.includes("hopital") || lib.includes("centre hospitalier")) return "Hôpital";
    if (lib.includes("clinique")) return "Clinique";
    if (lib.includes("foyer")) return "Foyer";
    if (lib.includes("usld")) return "USLD";
    if (lib.includes("mas") || lib.includes("maison d'accueil")) return "MAS";
    if (lib.includes("fam")) return "FAM";
    if (lib.includes("ime")) return "IME";
    if (lib.includes("résidence autonomie") || lib.includes("residence autonomie")) return "Résidence autonomie";
    if (lib.includes("ehpa")) return "EHPA";
    return "Autre";
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <i className="ti ti-search" style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "#8a98a8", fontSize: 16,
        }} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "9px 14px 9px 36px",
            border: "1px solid #e3e9ee", borderRadius: 8,
            fontFamily: "inherit", fontSize: 13.5,
            ...style,
          }}
        />
        {loading && (
          <i className="ti ti-loader-2" style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            color: "#185FA5", animation: "spin 1s linear infinite",
          }} />
        )}
      </div>

      {/* 0.55.5 : Filtres par catégorie métier */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: selectedCategories.length > 0 ? "#185FA5" : "#fff",
            color: selectedCategories.length > 0 ? "#fff" : "#185FA5",
            border: "1px solid #185FA5",
            padding: "4px 10px",
            borderRadius: 12,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <i className="ti ti-filter" /> 
          Filtres catégories
          {selectedCategories.length > 0 && (
            <span style={{ background: "rgba(255,255,255,.3)", padding: "0px 6px", borderRadius: 8, fontSize: 10 }}>
              {selectedCategories.length}
            </span>
          )}
        </button>
        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={() => { setSelectedCategories([]); setTimeout(() => triggerSearch(query), 50); }}
            style={{
              background: "transparent",
              color: "#c0392b",
              border: "none",
              padding: "4px 6px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline",
            }}
          >
            Tout effacer
          </button>
        )}
        <span style={{ fontSize: 10.5, color: "#8a98a8", marginLeft: "auto" }}>
          <i className="ti ti-map-2" /> France + DOM-TOM
        </span>
      </div>

      {showFilters && (
        <div style={{
          marginTop: 8,
          padding: "10px 12px",
          background: "#f4f7fa",
          border: "1px solid #e3e9ee",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}>
          {Object.entries(FINESS_CATEGORIES_GROUPS).map(([key, grp]) => {
            const active = selectedCategories.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                style={{
                  background: active ? grp.color : "#fff",
                  color: active ? "#fff" : grp.color,
                  border: `1.5px solid ${grp.color}`,
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
                title={grp.codes.map(c => c.label).join(", ")}
              >
                <i className={`ti ${grp.icon}`} /> {grp.label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: 6, padding: "8px 12px", 
          background: "#fef0ee", border: "1px solid #f0c4be",
          borderRadius: 6, fontSize: 12, color: "#7a1f15",
        }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: "#fff",
          border: "1px solid #e3e9ee",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(20,33,49,.15)",
          zIndex: 150,
          maxHeight: 380,
          overflowY: "auto",
        }}>
          <div style={{ padding: "6px 12px", fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, background: "#f9fafb", borderBottom: "1px solid #f0f0f0" }}>
            {results.length} résultat{results.length > 1 ? "s" : ""} dans la base FINESS officielle
          </div>
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(r)}
              style={{
                display: "block", width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderBottom: i < results.length - 1 ? "1px solid #f0f0f0" : "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f4f7fa"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <i className="ti ti-building-hospital" style={{ color: "#185FA5", fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "#142131", fontWeight: 600, lineHeight: 1.3 }}>
                    {r.raison_sociale}
                  </div>
                  <div style={{ marginTop: 3, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.categorie && (
                      <span style={{ 
                        display: "inline-block",
                        background: "#eef5fc", color: "#185FA5",
                        fontSize: 10.5, fontWeight: 600,
                        padding: "1px 8px", borderRadius: 8,
                      }}>
                        {r.categorie_courte || r.categorie}
                      </span>
                    )}
                    {r.statut_juridique_niv1 && (
                      <span style={{ 
                        display: "inline-block",
                        background: r.statut_juridique_niv1.toLowerCase().includes("public") ? "#eef9ef" : "#fff8ec",
                        color: r.statut_juridique_niv1.toLowerCase().includes("public") ? "#2e6f33" : "#7a4f15",
                        fontSize: 10.5, fontWeight: 600,
                        padding: "1px 8px", borderRadius: 8,
                      }}>
                        {r.statut_juridique_niv1.toLowerCase().includes("public") ? "🏛 Public" : "🏢 Privé"}
                      </span>
                    )}
                    {r.categorie_domaine && (
                      <span style={{ 
                        display: "inline-block",
                        background: "#f4f0f8", color: "#5e4a8c",
                        fontSize: 10.5, fontWeight: 600,
                        padding: "1px 8px", borderRadius: 8,
                      }}>
                        {r.categorie_domaine}
                      </span>
                    )}
                    {r.capacite && (
                      <span style={{ 
                        display: "inline-block",
                        background: "#fef0ee", color: "#7a1f15",
                        fontSize: 10.5, fontWeight: 600,
                        padding: "1px 8px", borderRadius: 8,
                      }} title="Capacité d'accueil">
                        🛏 {r.capacite} lits
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 4, lineHeight: 1.4 }}>
                    {r.adresse && <>{r.adresse}, </>}
                    {r.code_postal} {r.ville}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 10.5, color: "#8a98a8", flexWrap: "wrap" }}>
                    <span>📋 FINESS : <code style={{ fontFamily: "Consolas, monospace", color: "#5a8f8f" }}>{r.finess}</code></span>
                    {r.telephone && <span>📞 {r.telephone}</span>}
                    {r.tutelle && <span>🏛️ {r.tutelle}</span>}
                  </div>
                </div>
                {r.latitude && r.longitude && (
                  <div style={{ flexShrink: 0, marginTop: 2 }} title="Géolocalisation disponible">
                    <i className="ti ti-map-pin-check" style={{ color: "#5aa05a", fontSize: 16 }} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
