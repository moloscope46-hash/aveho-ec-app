"use client";
// =============================================================
//  components/MobileActionsBar.js (0.62.82)
//
//  Toolbar adaptative : en desktop affiche tous les boutons,
//  en mobile garde les 1-2 actions primaires visibles et regroupe
//  le reste dans un popup "..." accessible via bouton kebab.
//
//  Usage :
//    <MobileActionsBar
//      primary={[
//        { icon: "ti-plus",  label: "Nouveau",   onClick, color: "#7CC8C8" },
//      ]}
//      secondary={[
//        { icon: "ti-filter",   label: "Filtres", onClick },
//        { icon: "ti-download", label: "Export PDF", onClick },
//        { icon: "ti-printer",  label: "Imprimer", onClick },
//        { icon: "ti-settings", label: "Colonnes", onClick },
//      ]}
//      filters={<DropdownFiltres />}  // optionnel : JSX des filtres
//    />
// =============================================================

import { useState, useEffect } from "react";

export default function MobileActionsBar({ primary = [], secondary = [], filters, viewMode }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Desktop : tout afficher horizontal
  if (!isMobile) {
    return (
      <div className="di-toolbar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {viewMode}
        {filters}
        {[...primary, ...secondary].map((a, i) => (
          <button key={i} onClick={a.onClick} disabled={a.disabled}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 12px",
              background: a.primary ? `linear-gradient(135deg, ${a.color || "#7CC8C8"}, ${a.colorEnd || "#5a9494"})` : "#fff",
              color: a.primary ? "#fff" : "#142131",
              border: a.primary ? "none" : "1px solid #e3e9ee",
              borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              fontFamily: "inherit", cursor: "pointer",
              opacity: a.disabled ? 0.5 : 1,
            }}>
            <i className={`ti ${a.icon}`} /> {a.label}
          </button>
        ))}
      </div>
    );
  }

  // Mobile : primary visible + bouton kebab
  return (
    <>
      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        padding: "8px 6px",
        flexWrap: "nowrap", overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {viewMode}

        {/* Bouton filtres mobile : icône seule, ouvre dans le popup */}
        {filters && (
          <button onClick={() => setOpen(true)} className="tb-icon" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #f4f7fa, #fff)",
            border: "1px solid #e3e9ee", color: "#185FA5",
            fontSize: 16, flexShrink: 0, cursor: "pointer",
          }} title="Filtres">
            <i className="ti ti-filter" />
          </button>
        )}

        {/* Actions primaires : compactes */}
        {primary.map((a, i) => (
          <button key={i} onClick={a.onClick} disabled={a.disabled}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "0 14px", height: 38,
              background: `linear-gradient(135deg, ${a.color || "#7CC8C8"}, ${a.colorEnd || "#5a9494"})`,
              color: "#fff",
              border: "none",
              borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              fontFamily: "inherit", cursor: "pointer",
              flexShrink: 0,
              boxShadow: `0 3px 8px ${a.color || "#7CC8C8"}40`,
              opacity: a.disabled ? 0.5 : 1,
            }}>
            <i className={`ti ${a.icon}`} style={{ fontSize: 16 }} /> {a.label}
          </button>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Kebab "..." pour les actions secondaires */}
        {secondary.length > 0 && (
          <button onClick={() => setOpen(true)} className="tb-icon" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #142131, #1c5454)",
            color: "#fff",
            border: "none",
            fontSize: 18, flexShrink: 0, cursor: "pointer",
            position: "relative",
          }} title="Plus d'actions">
            <i className="ti ti-dots-vertical" />
            {secondary.length > 3 && (
              <span style={{
                position: "absolute", top: 2, right: 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "#EF9F27", color: "#fff",
                fontSize: 9, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{secondary.length}</span>
            )}
          </button>
        )}
      </div>

      {/* Popup bottom-sheet pour actions secondaires + filtres */}
      {open && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(20,33,49,.6)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end",
            animation: "av-fade-in 200ms ease-out",
          }}>
          <div style={{
            width: "100%",
            maxHeight: "85vh",
            background: "#fff",
            borderRadius: "18px 18px 0 0",
            padding: "8px 16px max(20px, env(safe-area-inset-bottom)) 16px",
            overflowY: "auto",
            animation: "av-modal-slide-up 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: "0 -10px 30px rgba(0,0,0,.25)",
          }}>
            <div style={{ width: 44, height: 4, background: "#c0d0d8", borderRadius: 2, margin: "0 auto 14px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#142131" }}>
                <i className="ti ti-menu-2" style={{ color: "#185FA5", marginRight: 6 }} />
                Actions
              </h3>
              <button onClick={() => setOpen(false)} style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#fafbfc", border: "1px solid #e3e9ee",
                cursor: "pointer", color: "#5a6878",
              }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Filtres si présents */}
            {filters && (
              <div style={{ marginBottom: 16, padding: 12, background: "#fafbfc", borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                  <i className="ti ti-filter" /> Filtres
                </div>
                {filters}
              </div>
            )}

            {/* Actions secondaires en grille */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {secondary.map((a, i) => (
                <button key={i} onClick={() => { a.onClick?.(); setOpen(false); }} disabled={a.disabled}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 10px",
                    background: "linear-gradient(135deg, #fff, #fafbfc)",
                    border: `1px solid ${a.color ? a.color + "40" : "#e3e9ee"}`,
                    borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                    fontFamily: "inherit", cursor: "pointer", color: "#142131",
                    textAlign: "left", minHeight: 56,
                    opacity: a.disabled ? 0.5 : 1,
                  }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `linear-gradient(135deg, ${a.color || "#185FA5"}, ${a.colorEnd || (a.color || "#185FA5") + "cc"})`,
                    color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                    flexShrink: 0,
                  }}>
                    <i className={`ti ${a.icon}`} />
                  </div>
                  <span style={{ flex: 1, lineHeight: 1.2 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
