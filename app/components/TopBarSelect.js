"use client";
// =============================================================
//  components/TopBarSelect.js (0.62.112)
//
//  Sélecteur générique TopBar avec bottom-sheet mobile.
//  Remplace les <select> natifs qui ouvrent un dropdown OS
//  en haut de l'écran sur mobile.
//
//  Props :
//    options : [{ id, nom, icone?, sublabel? }]
//    value : id sélectionné ("" = aucun)
//    onChange : (id) => void
//    placeholder : texte si aucune sélection
//    icon : icône Tabler du bouton (ex: "ti-building")
//    iconColor : couleur icône
//    label : titre dans le bottom-sheet mobile
//    allLabel : texte de l'option "tous" (vide = pas d'option)
// =============================================================

import { useState, useEffect, useRef } from "react";

export default function TopBarSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Choisir…",
  icon = "ti-list",
  iconColor = "#7CC8C8",
  label = "Choisir",
  allLabel = null,
  maxWidth = 130,
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  if (!options || options.length === 0) return null;

  const selected = options.find(o => o.id === value);
  const currentLabel = value === "" || !selected
    ? (allLabel ? `★ ${allLabel}` : placeholder)
    : selected.nom;

  return (
    <div
      ref={ref}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.10)",
        borderRadius: 8,
        padding: "4px 8px",
        position: "relative",
      }}
    >
      <i className={`ti ${selected?.icone ? `ti-${selected.icone}` : icon}`} style={{ color: iconColor, fontSize: 14 }} />
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          color: "#dde4eb",
          fontSize: 12,
          fontFamily: "inherit",
          cursor: "pointer",
          maxWidth,
          outline: "none",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {currentLabel}
        </span>
        <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }} />
      </button>

      {open && (
        <>
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
            {isMobile && (
              <>
                <div style={{
                  width: 40, height: 4,
                  background: "rgba(20,33,49,.25)",
                  borderRadius: 2,
                  margin: "0 auto 12px",
                }} />
                <h3 style={{
                  margin: "0 0 12px",
                  fontSize: 16, fontWeight: 700,
                  color: "#142131",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <i className={`ti ${icon}`} style={{ color: iconColor }} />
                  {label}
                </h3>
              </>
            )}

            {/* Option "Tous" */}
            {allLabel && (
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                role="option"
                aria-selected={value === ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: isMobile ? "12px 10px" : "8px 10px",
                  border: value === "" ? `2px solid ${iconColor}` : "1px solid transparent",
                  background: value === "" ? `${iconColor}1F` : "transparent",
                  color: value === "" ? "#142131" : "#142131",
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: isMobile ? 14 : 13,
                  fontWeight: value === "" ? 700 : 500,
                  textAlign: "left",
                  transition: "all 150ms",
                }}
              >
                <span style={{ fontSize: 18 }}>★</span>
                <span style={{ flex: 1 }}>{allLabel}</span>
                {value === "" && <i className="ti ti-check" style={{ color: iconColor }} />}
              </button>
            )}

            {options.map((o) => {
              const active = value === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => { onChange(o.id); setOpen(false); }}
                  role="option"
                  aria-selected={active}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: isMobile ? "12px 10px" : "8px 10px",
                    border: active ? `2px solid ${iconColor}` : "1px solid transparent",
                    background: active ? `${iconColor}1F` : "transparent",
                    color: active ? "#142131" : "#142131",
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
                  <i className={`ti ${o.icone ? `ti-${o.icone}` : icon}`} style={{ color: active ? iconColor : "#7a6fb0", fontSize: 16 }} />
                  <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ fontWeight: active ? 700 : 600 }}>{o.nom}</div>
                    {o.sublabel && (
                      <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 1 }}>{o.sublabel}</div>
                    )}
                  </div>
                  {active && <i className="ti ti-check" style={{ color: iconColor }} />}
                </button>
              );
            })}

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
