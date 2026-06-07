"use client";
// =============================================================
//  components/TopBarEtabSelect.js (0.62.111)
//
//  Sélecteur d'établissement qui :
//  - Desktop : se comporte comme un select natif stylé
//  - Mobile (<768px) : ouvre un bottom-sheet custom
//    avec liste tappable des options
//
//  Remplace le <select> natif HTML qui s'ouvrait en haut
//  de l'écran sur mobile (dropdown OS non maîtrisable)
// =============================================================

import { useState, useEffect, useRef } from "react";

export default function TopBarEtabSelect({ etablissements, etabId, etabNom, onChange }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Click outside pour fermer en desktop
  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  if (!etablissements || etablissements.length === 0) return null;

  const currentLabel = etabId
    ? (etablissements.find(e => e.id === etabId)?.nom || etabNom || "")
    : "🌐 Tous les établissements";

  return (
    <div ref={ref} className="etab-switch" style={{ position: "relative" }}>
      {/* Bouton principal (replace le select natif) */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          font: "inherit",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <i className="ti ti-building-hospital" />
        <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {currentLabel}
        </span>
        <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 12, opacity: 0.7 }} />
      </button>

      {open && (
        <>
          {/* Backdrop mobile */}
          {isMobile && (
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(20,33,49,.55)",
                backdropFilter: "blur(6px)",
                zIndex: 10000,
                animation: "av-fade-in 200ms ease-out",
              }}
            />
          )}

          {/* Dropdown / Bottom-sheet */}
          <div
            role="listbox"
            className="tb-dropdown"
            style={isMobile ? {
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#fff",
              color: "#142131",
              borderRadius: "20px 20px 0 0",
              padding: 16,
              maxHeight: "75vh",
              overflowY: "auto",
              boxShadow: "0 -8px 32px rgba(20,33,49,.30)",
              zIndex: 10001,
              animation: "av-bottom-sheet-up 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              fontFamily: "Quicksand, sans-serif",
            } : {
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 240,
              maxHeight: 400,
              overflowY: "auto",
              background: "#fff",
              color: "#142131",
              borderRadius: 10,
              border: "1px solid #e3e9ee",
              boxShadow: "0 12px 32px rgba(20,33,49,.18)",
              padding: 6,
              zIndex: 1000,
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            {/* Handle iOS-style mobile */}
            {isMobile && (
              <div style={{
                width: 40, height: 4,
                background: "rgba(20,33,49,.25)",
                borderRadius: 2,
                margin: "0 auto 12px",
              }} />
            )}

            {isMobile && (
              <h3 style={{
                margin: "0 0 12px",
                fontSize: 16, fontWeight: 700,
                color: "#142131",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <i className="ti ti-building-hospital" style={{ color: "#185FA5" }} />
                Choisir un établissement
              </h3>
            )}

            {/* Option "Tous les établissements" si multi-étab */}
            {etablissements.length > 1 && (
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                role="option"
                aria-selected={!etabId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: isMobile ? "12px 10px" : "8px 10px",
                  border: !etabId ? "2px solid #7CC8C8" : "1px solid transparent",
                  background: !etabId ? "rgba(124,200,200,.12)" : "transparent",
                  color: !etabId ? "#1c5454" : "#142131",
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: isMobile ? 14 : 13,
                  fontWeight: !etabId ? 700 : 500,
                  textAlign: "left",
                  transition: "all 150ms",
                }}
              >
                <span style={{ fontSize: 18 }}>🌐</span>
                <span style={{ flex: 1 }}>Tous les établissements</span>
                {!etabId && <i className="ti ti-check" style={{ color: "#7CC8C8" }} />}
              </button>
            )}

            {/* Liste des établissements */}
            {etablissements.map((et) => {
              const active = etabId === et.id;
              return (
                <button
                  key={et.id}
                  onClick={() => { onChange(et.id); setOpen(false); }}
                  role="option"
                  aria-selected={active}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: isMobile ? "12px 10px" : "8px 10px",
                    border: active ? "2px solid #185FA5" : "1px solid transparent",
                    background: active ? "rgba(24,95,165,.10)" : "transparent",
                    color: active ? "#185FA5" : "#142131",
                    borderRadius: 8,
                    marginBottom: 4,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: isMobile ? 14 : 13,
                    fontWeight: active ? 700 : 500,
                    textAlign: "left",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(124,200,200,.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <i className="ti ti-building-hospital" style={{ color: active ? "#185FA5" : "#7a6fb0", fontSize: 16 }} />
                  <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ fontWeight: active ? 700 : 600 }}>{et.nom}</div>
                    {et.ville && (
                      <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 1 }}>{et.ville}</div>
                    )}
                  </div>
                  {active && <i className="ti ti-check" style={{ color: "#185FA5" }} />}
                </button>
              );
            })}

            {/* Bouton fermer mobile */}
            {isMobile && (
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: 8,
                  background: "linear-gradient(135deg, #185FA5, #7CC8C8)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
