"use client";
// =============================================================
//  SireneSearch.js
//  Alpha 0.55.4 — Autocomplete recherche SIRENE (entreprises)
//
//  Différent de FinessSearch : cherche des entreprises (à but commercial)
//  plutôt que des établissements de santé.
//  Utile pour importer fournisseurs, prestataires, sociétés tierces.
// =============================================================
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { fetchWithAuth } from "../lib/fetchWithAuth";  // 0.57.16 : auth Bearer obligatoire

// 0.55.5 : catégories médicales prédéfinies pour SIRENE
const SIRENE_CATEGORIES = {
  sante: { label: "Toute la santé humaine", icon: "ti-stethoscope", color: "#185FA5" },
  pharma: { label: "Pharmacies", icon: "ti-medical-cross", color: "#c0392b" },
  materiel_medical_orthopedie: { label: "Matériel médical & ortho", icon: "ti-wheelchair", color: "#EF9F27" },
  audio_optique: { label: "Audio / Optique", icon: "ti-ear", color: "#7CC8C8" },
  transport_sanitaire: { label: "Ambulances / Transport sanitaire", icon: "ti-ambulance", color: "#e35d5b" },
  laboratoires: { label: "Laboratoires d'analyses", icon: "ti-microscope", color: "#5e4a8c" },
  fab_pharma: { label: "Fabrication pharmaceutique", icon: "ti-flask", color: "#7a6fb0" },
};

export default function SireneSearch({ onSelect, placeholder = "Chercher par nom, SIRET ou SIREN…", style }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 0.55.5 : un seul filtre catégorie à la fois (l'API SIRENE accepte 1 seul value)
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  // 0.58.31 : input wrapper ref pour calculer la position du dropdown porté en body
  const inputBoxRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ left: 0, top: 0, width: 0 });

  useEffect(() => { setMounted(true); }, []);

  // 0.58.31 : recalcule la position du dropdown quand il s'ouvre + au scroll/resize
  useEffect(() => {
    if (!open || !inputBoxRef.current) return;
    function updatePosition() {
      const rect = inputBoxRef.current.getBoundingClientRect();
      setDropdownPos({
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width,
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, results.length]);

  useEffect(() => {
    function onClickOut(e) {
      // 0.58.31 : ignore les clics sur le dropdown porté en body
      if (e.target?.closest?.("[data-sirene-dropdown]")) return;
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
    const minLen = selectedCategory ? 0 : 3;
    if (val.trim().length < minLen) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const trimmed = val.trim().replace(/\s+/g, "");
        let url;
        if (/^\d{14}$/.test(trimmed)) {
          url = `/api/sirene?siret=${encodeURIComponent(trimmed)}`;
        } else if (/^\d{9}$/.test(trimmed)) {
          url = `/api/sirene?siren=${encodeURIComponent(trimmed)}`;
        } else {
          const params = new URLSearchParams();
          if (val.trim()) params.set("q", val.trim());
          if (selectedCategory) params.set("categorie", selectedCategory);
          params.set("limit", "12");
          url = `/api/sirene?${params.toString()}`;
        }
        
        const res = await fetchWithAuth(url);  // 0.57.16
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || "Erreur recherche SIRENE");
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

  function pickCategory(key) {
    const next = selectedCategory === key ? "" : key;
    setSelectedCategory(next);
    setTimeout(() => triggerSearch(query), 50);
  }

  function pick(r) {
    setQuery(r.nom_complet);
    setOpen(false);
    setResults([]);
    if (onSelect) {
      onSelect({
        nom: r.nom_complet || r.nom_raison_sociale,
        type: mapType(r.libelle_activite, r.activite_section),
        siret: r.siret,
        siren: r.siren,
        adresse: r.adresse,
        code_postal: r.code_postal,
        ville: r.ville,
        latitude: r.latitude,
        longitude: r.longitude,
      });
    }
  }

  // Mapping libellé d'activité INSEE → type d'établissement Aveho
  function mapType(libelle, section) {
    if (!libelle) return "Autre";
    const lib = libelle.toLowerCase();
    // Santé
    if (section === "Q" || lib.includes("santé") || lib.includes("hospitalier")) {
      if (lib.includes("hospitalier")) return "Hôpital";
      if (lib.includes("hébergement")) return "EHPAD";
      return "Autre";
    }
    return "Autre";
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div ref={inputBoxRef} style={{ position: "relative" }}>
        <i className="ti ti-building-store" style={{
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
            color: "#EF9F27", animation: "spin 1s linear infinite",
          }} />
        )}
      </div>

      {/* 0.55.5 : Filtres médicaux SIRENE */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: selectedCategory ? "#EF9F27" : "#fff",
            color: selectedCategory ? "#fff" : "#EF9F27",
            border: "1px solid #EF9F27",
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
          Filtre médical
          {selectedCategory && (
            <span style={{ background: "rgba(255,255,255,.3)", padding: "0 6px", borderRadius: 8, fontSize: 10 }}>1</span>
          )}
        </button>
        {selectedCategory && (
          <span style={{ fontSize: 11, color: "#7a4f15", background: "#fff8ec", padding: "3px 10px", borderRadius: 10, fontWeight: 600 }}>
            <i className={`ti ${SIRENE_CATEGORIES[selectedCategory].icon}`} /> {SIRENE_CATEGORIES[selectedCategory].label}
            <button
              onClick={() => { setSelectedCategory(""); setTimeout(() => triggerSearch(query), 50); }}
              style={{ background: "transparent", border: "none", color: "#7a4f15", cursor: "pointer", marginLeft: 6, padding: 0 }}
            >×</button>
          </span>
        )}
        <span style={{ fontSize: 10.5, color: "#8a98a8", marginLeft: "auto" }}>
          <i className="ti ti-map-2" /> France + DOM-TOM
        </span>
      </div>

      {showFilters && (
        <div style={{
          marginTop: 8,
          padding: "10px 12px",
          background: "#fff8ec",
          border: "1px solid #f0d59f",
          borderRadius: 8,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}>
          {Object.entries(SIRENE_CATEGORIES).map(([key, cat]) => {
            const active = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickCategory(key)}
                style={{
                  background: active ? cat.color : "#fff",
                  color: active ? "#fff" : cat.color,
                  border: `1.5px solid ${cat.color}`,
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
              >
                <i className={`ti ${cat.icon}`} /> {cat.label}
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

      {open && results.length > 0 && mounted && createPortal((
        <div data-sirene-dropdown style={{
          position: "fixed",
          left: dropdownPos.left,
          top: dropdownPos.top,
          width: dropdownPos.width,
          background: "#fff",
          border: "1px solid #e3e9ee",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(20,33,49,.15)",
          zIndex: 99999,
          maxHeight: 380,
          overflowY: "auto",
        }}>
          <div style={{ padding: "6px 12px", fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, background: "#fffaf2", borderBottom: "1px solid #f0f0f0" }}>
            {results.length} résultat{results.length > 1 ? "s" : ""} dans la base SIRENE (Annuaire des Entreprises)
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
                opacity: r.actif ? 1 : 0.55,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fff8ec"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <i className="ti ti-building-store" style={{ color: "#EF9F27", fontSize: 20 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "#142131", fontWeight: 600, lineHeight: 1.3 }}>
                    {r.nom_complet}
                    {r.sigle && <span style={{ marginLeft: 6, color: "#8a98a8", fontWeight: 500 }}>({r.sigle})</span>}
                  </div>
                  <div style={{ marginTop: 3, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {r.libelle_activite && (
                      <span style={{ 
                        background: "#fff3da", color: "#7a4f15",
                        fontSize: 10.5, fontWeight: 600,
                        padding: "1px 8px", borderRadius: 8,
                      }}>
                        {r.libelle_activite.length > 40 ? r.libelle_activite.slice(0, 38) + "…" : r.libelle_activite}
                      </span>
                    )}
                    {!r.actif && (
                      <span style={{ 
                        background: "#fef0ee", color: "#7a1f15",
                        fontSize: 10.5, fontWeight: 700,
                        padding: "1px 8px", borderRadius: 8,
                      }}>
                        ⚠ Fermé
                      </span>
                    )}
                    {r.nombre_etablissements > 1 && (
                      <span style={{ 
                        background: "#f4f0f8", color: "#5e4a8c",
                        fontSize: 10.5, fontWeight: 600,
                        padding: "1px 8px", borderRadius: 8,
                      }}>
                        {r.nombre_etablissements} établissements
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#6c7a89", marginTop: 4, lineHeight: 1.4 }}>
                    {r.adresse && <>{r.adresse.replace(/\s+/g, ' ')}</>}
                    {!r.adresse && r.ville && <>{r.code_postal} {r.ville}</>}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 10.5, color: "#8a98a8", flexWrap: "wrap" }}>
                    <span>📋 SIRET : <code style={{ fontFamily: "Consolas, monospace", color: "#5a8f8f" }}>{r.siret}</code></span>
                    <span>SIREN : <code style={{ fontFamily: "Consolas, monospace", color: "#5a8f8f" }}>{r.siren}</code></span>
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
      ), document.body)}

      <style jsx>{`
        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
