"use client";
// =============================================================
//  app/RppsAutocomplete.js (Alpha 0.55.42)
//
//  Autocomplete RPPS style FinessSearch/SireneSearch :
//  - 1 seul input
//  - Liste déroulante au fur et à mesure de la frappe (debounced 350ms)
//  - Photo Google au survol d'un résultat (via /api/place)
//  - Boutons Appeler / Mail / GPS sur chaque résultat
//
//  Usage :
//    <RppsAutocomplete
//      onSelect={(praticien) => setPrescripteur(praticien)}
//      placeholder="Chercher un praticien par nom, RPPS, profession…"
//      defaultProfession=""  // optionnel : pré-filtrer
//    />
// =============================================================

import { useState, useEffect, useRef } from "react";
import ContactActions from "./components/ContactActions";

const PROFESSIONS = [
  { value: "", label: "Toutes" },
  { value: "Médecin", label: "Médecin" },
  { value: "Infirmier", label: "Infirmier(ère)" },
  { value: "Kinésithérapeute", label: "Kiné" },
  { value: "Pharmacien", label: "Pharmacien" },
  { value: "Sage-femme", label: "Sage-femme" },
  { value: "Dentiste", label: "Dentiste" },
  { value: "Pédicure", label: "Pédicure" },
  { value: "Orthophoniste", label: "Orthophoniste" },
];

export default function RppsAutocomplete({
  onSelect,
  placeholder = "Chercher par nom, RPPS ou profession…",
  defaultProfession = "",
  style,
}) {
  const [query, setQuery] = useState("");
  const [profession, setProfession] = useState(defaultProfession);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoverPhoto, setHoverPhoto] = useState({}); // { [id]: photoUrl }
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
    triggerSearch(val);
  }

  function triggerSearch(val) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = val.trim();
    // Min 2 chars sauf si profession active
    if (trimmed.length < 2 && !profession) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const isRppsNumber = /^\d{11}$/.test(trimmed);
        const params = new URLSearchParams();
        if (isRppsNumber) {
          params.set("rpps", trimmed);
        } else if (trimmed.length >= 2) {
          params.set("q", trimmed);
        }
        if (profession) params.set("profession", profession);
        params.set("limit", "10");

        const res = await fetch(`/api/rpps?${params}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data?.error || "Erreur recherche RPPS");
          setResults([]);
          setOpen(true);
        } else {
          setResults(data.results || []);
          setOpen((data.results || []).length > 0 || !!data.error);
        }
      } catch (e) {
        setError(e.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function pick(r) {
    setQuery(`${r.prenom || ""} ${r.nom}`.trim());
    setOpen(false);
    setResults([]);
    if (onSelect) onSelect(r);
  }

  // Récupère la photo Google au survol (mémoïsé)
  async function handleHover(r) {
    setHoveredId(r.rpps || r._fhirId);
    const key = r.rpps || r._fhirId;
    if (!key || hoverPhoto[key] !== undefined) return; // déjà fetch ou en cours

    // Marquer comme en cours pour éviter re-fetch
    setHoverPhoto(prev => ({ ...prev, [key]: null }));
    try {
      const adresseComplete = [r.adresse, r.cp, r.commune].filter(Boolean).join(", ");
      const nom = [r.prenom, r.nom].filter(Boolean).join(" ");
      if (!nom || !adresseComplete) return;
      const params = new URLSearchParams({ nom, adresse: adresseComplete });
      const res = await fetch(`/api/place?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const photoUrl = data?.place?.photoUrl || "";
      setHoverPhoto(prev => ({ ...prev, [key]: photoUrl }));
    } catch (_) {
      // silencieux
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...(style || {}) }}>
      {/* Input + selecteur profession */}
      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
        <select
          value={profession}
          onChange={(e) => { setProfession(e.target.value); triggerSearch(query); }}
          style={{
            background: "#fff",
            border: "1px solid #d3d9e0",
            borderRadius: 6,
            padding: "8px 8px",
            fontSize: 12.5,
            fontFamily: "inherit",
            color: "#142131",
            maxWidth: 110,
            cursor: "pointer",
          }}
          title="Filtrer par profession"
        >
          {PROFESSIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
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
              background: "#fff",
              boxSizing: "border-box",
            }}
          />
          <i className="ti ti-stethoscope" style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "#185FA5", fontSize: 14, pointerEvents: "none",
          }} />
          {loading && (
            <i className="ti ti-loader-2" style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              color: "#185FA5", fontSize: 14, animation: "spin 1s linear infinite",
              pointerEvents: "none",
            }} />
          )}
        </div>
      </div>

      {/* Dropdown résultats */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: "#fff",
          border: "1px solid #d3d9e0",
          borderRadius: 8,
          boxShadow: "0 6px 18px rgba(20,33,49,0.15)",
          maxHeight: 420,
          overflowY: "auto",
          zIndex: 1000,
        }}>
          {error && (
            <div style={{
              padding: "10px 12px",
              background: "#fce5e0",
              color: "#7a1f15",
              fontSize: 12,
              borderBottom: "1px solid #f0c4be",
            }}>
              <i className="ti ti-alert-circle" /> {error}
            </div>
          )}

          {results.length === 0 && !error && !loading && (
            <div style={{ padding: 14, color: "#8a98a8", fontSize: 12.5, textAlign: "center" }}>
              <i className="ti ti-mood-search" /> Aucun résultat.
            </div>
          )}

          {results.map((r, idx) => {
            const id = r.rpps || r._fhirId || idx;
            const isHovered = hoveredId === id;
            const photoUrl = hoverPhoto[id];
            return (
              <div
                key={id}
                onMouseEnter={() => handleHover(r)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: "10px 12px",
                  borderBottom: idx < results.length - 1 ? "1px solid #f4f7fa" : "none",
                  background: isHovered ? "#f4f7fa" : "#fff",
                  transition: "background 0.12s",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {/* Avatar / photo Google si dispo */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: photoUrl
                      ? `url(${photoUrl}) center/cover`
                      : "linear-gradient(135deg, #185FA5, #7CC8C8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    color: "#fff",
                  }}>
                    {!photoUrl && <i className="ti ti-user-circle" style={{ fontSize: 22 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => pick(r)}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#142131" }}>
                        {r.civilite} {r.prenom} {r.nom}
                      </span>
                      {r.profession && (
                        <span style={{
                          background: "#185FA522", color: "#185FA5",
                          fontSize: 10, fontWeight: 700,
                          padding: "1px 6px", borderRadius: 6,
                          textTransform: "uppercase", letterSpacing: 0.3,
                        }}>
                          {r.profession}
                        </span>
                      )}
                    </div>
                    {r.specialite && (
                      <div style={{ fontSize: 11.5, color: "#5a4a90", marginTop: 2 }}>
                        <i className="ti ti-prescription" style={{ fontSize: 10 }} /> {r.specialite}
                      </div>
                    )}
                    {(r.adresse || r.cp || r.commune) && (
                      <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>
                        <i className="ti ti-map-pin" style={{ fontSize: 10 }} />
                        {" "}{r.adresse ? `${r.adresse}, ` : ""}{r.cp} {r.commune}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#a0aeb9", marginTop: 2, fontFamily: "Consolas, monospace" }}>
                      {r.rpps ? `RPPS ${r.rpps}` : ""}{r.adeli ? ` · ADELI ${r.adeli}` : ""}
                    </div>
                  </div>
                </div>
                {/* Actions tel / mail / gps (visibles toujours sur la tuile) */}
                <div style={{ marginTop: 8, paddingLeft: 48 }}>
                  <ContactActions
                    telephone={r.telephone}
                    email={r.email}
                    adresse={r.adresse}
                    cp={r.cp}
                    commune={r.commune}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
