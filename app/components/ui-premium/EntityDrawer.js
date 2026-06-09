"use client";
// =============================================================
//  EntityDrawer — Drawer right ULTRA PREMIUM pour fiches entités
//  Patient, article, matériel, dépôt, intervention, commande...
//
//  Features :
//  - Slide from right avec animation cubic-bezier
//  - Mesh gradient background animé
//  - Header avec icône halo + titre + actions
//  - Sections dépliables (accordion)
//  - Tabs en haut pour navigation rapide
//  - Footer sticky avec actions
//  - Responsive : full screen sur mobile
//  - ESC pour fermer + lock scroll body
//  - Backdrop blur layered
// =============================================================
import React, { useEffect, useState } from "react";

export default function EntityDrawer({
  open,
  onClose,
  color = "#185FA5",
  icon = "ti-circle",
  title,
  subtitle,
  badge,
  badgeColor,
  avatarText,
  avatarUrl,
  tabs,            // [{ key, label, icon, count }]
  activeTab,
  onTabChange,
  children,
  actions,         // footer buttons
  headerActions,   // header right buttons
  width = 480,
  size = "md",     // sm md lg xl full
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 380, md: 480, lg: 640, xl: 820, full: "100vw" };
  const drawerWidth = widths[size] || width;

  return (
    <>
      {/* Backdrop layered blur */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(8, 16, 28, 0.50)",
          backdropFilter: "blur(10px) saturate(140%)",
          WebkitBackdropFilter: "blur(10px) saturate(140%)",
          zIndex: 9990,
          animation: "av-entity-backdrop 240ms cubic-bezier(.2,.8,.2,1)",
        }}
      />

      {/* Drawer */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className="av-entity-drawer"
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: drawerWidth,
          maxWidth: "100vw",
          zIndex: 9991,
          display: "flex", flexDirection: "column",
          background: `
            radial-gradient(1000px 600px at 100% 0%, ${color}25 0%, transparent 60%),
            radial-gradient(800px 500px at 0% 100%, ${color}15 0%, transparent 55%),
            linear-gradient(180deg, #0c1726 0%, #142131 100%)
          `,
          borderLeft: `1px solid ${color}40`,
          boxShadow: `-20px 0 60px rgba(0,0,0,.55), -1px 0 0 ${color}50`,
          animation: "av-entity-slide 380ms cubic-bezier(.2,.8,.2,1)",
          fontFamily: "Quicksand, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Light beam top accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 1, background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          boxShadow: `0 0 16px ${color}`,
          pointerEvents: "none", zIndex: 5,
        }} />

        {/* HEADER */}
        <header style={{
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${color}30`,
          position: "relative",
          flexShrink: 0,
        }}>
          {/* Glow accent dans le coin */}
          <div style={{
            position: "absolute",
            top: -60, right: -60,
            width: 200, height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            filter: "blur(30px)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative", zIndex: 1 }}>
            {/* Avatar / Icon */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {/* Halo */}
              <div style={{
                position: "absolute", inset: -6,
                background: `radial-gradient(circle, ${color}80 0%, transparent 70%)`,
                borderRadius: "50%",
                filter: "blur(10px)",
                animation: "av-entity-halo 2.5s ease-in-out infinite",
              }} />
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{
                  width: 56, height: 56, borderRadius: 14,
                  position: "relative", zIndex: 1,
                  objectFit: "cover",
                  border: `2px solid ${color}80`,
                  boxShadow: `0 8px 20px ${color}50`,
                }} />
              ) : avatarText ? (
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 800,
                  position: "relative", zIndex: 1,
                  boxShadow: `0 8px 20px ${color}50, inset 0 0 0 1px rgba(255,255,255,.15)`,
                  letterSpacing: "-0.02em",
                }}>{avatarText}</div>
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26,
                  position: "relative", zIndex: 1,
                  boxShadow: `0 8px 20px ${color}50, inset 0 0 0 1px rgba(255,255,255,.15)`,
                }}><i className={`ti ${icon}`} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.3))" }} /></div>
              )}
            </div>

            {/* Titre + subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{
                  margin: 0, fontSize: 19, fontWeight: 800,
                  color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2,
                  textShadow: `0 2px 8px ${color}40`,
                }}>{title}</h2>
                {badge && (
                  <span style={{
                    background: `${badgeColor || color}30`,
                    color: badgeColor || color,
                    border: `1px solid ${badgeColor || color}60`,
                    padding: "3px 8px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}>{badge}</span>
                )}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 4, lineHeight: 1.4 }}>
                  {subtitle}
                </div>
              )}
            </div>

            {/* Header actions + close */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {headerActions}
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onClose}
                aria-label="Fermer"
                className="av-entity-close"
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17,
                  transition: "all 150ms",
                }}
              ><i className="ti ti-x" /></button>
            </div>
          </div>

          {/* TABS */}
          {tabs && tabs.length > 0 && (
            <div style={{
              display: "flex",
              gap: 4,
              marginTop: 14,
              borderBottom: "1px solid rgba(255,255,255,.06)",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}>
              {tabs.map(t => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => onTabChange?.(t.key)}
                    style={{
                      padding: "8px 14px",
                      background: "transparent",
                      border: "none",
                      borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,.55)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "Quicksand, sans-serif",
                      transition: "all 200ms",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      letterSpacing: 0.2,
                      filter: isActive ? `drop-shadow(0 0 6px ${color})` : "none",
                    }}
                  >
                    {t.icon && <i className={`ti ${t.icon}`} />}
                    {t.label}
                    {t.count != null && (
                      <span style={{
                        background: isActive ? `${color}30` : "rgba(255,255,255,.08)",
                        color: isActive ? color : "rgba(255,255,255,.7)",
                        padding: "1px 6px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 800,
                      }}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* CONTENT scrollable */}
        <div
          className="av-entity-body"
          style={{
            flex: 1, overflowY: "auto", padding: 18,
            scrollBehavior: "smooth",
          }}
        >{children}</div>

        {/* FOOTER */}
        {actions && (
          <footer style={{
            padding: "12px 16px",
            background: "rgba(0,0,0,.35)",
            borderTop: `1px solid ${color}25`,
            backdropFilter: "blur(8px)",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}>{actions}</footer>
        )}
      </aside>

      <style jsx global>{`
        @keyframes av-entity-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes av-entity-slide {
          from { transform: translateX(100%); opacity: .6; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes av-entity-halo {
          0%, 100% { opacity: .4; transform: scale(.95); }
          50%      { opacity: .9; transform: scale(1.15); }
        }
        .av-entity-close:hover {
          background: rgba(255,255,255,.18) !important;
          transform: scale(1.05);
        }
        .av-entity-body::-webkit-scrollbar { width: 6px; }
        .av-entity-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 4px; }
        @media (max-width: 768px) {
          .av-entity-drawer { width: 100vw !important; }
        }
      `}</style>
    </>
  );
}

// =============================================================
// SECTION dépliable (accordion)
// =============================================================
export function EntitySection({ title, icon, color = "#185FA5", children, defaultOpen = true, badge, action }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      marginBottom: 14,
      background: "rgba(255,255,255,.03)",
      border: "1px solid rgba(255,255,255,.06)",
      borderRadius: 12,
      overflow: "hidden",
      transition: "border-color 200ms",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "Quicksand, sans-serif",
          fontWeight: 700,
          fontSize: 13,
          textAlign: "left",
        }}
      >
        {icon && (
          <i className={`ti ${icon}`} style={{
            color, fontSize: 16,
            filter: `drop-shadow(0 0 4px ${color}80)`,
          }} />
        )}
        <span style={{ flex: 1, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 11 }}>{title}</span>
        {badge != null && (
          <span style={{
            background: `${color}25`, color, border: `1px solid ${color}50`,
            padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 800,
          }}>{badge}</span>
        )}
        {action}
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{
          color: "rgba(255,255,255,.4)",
          transition: "transform 250ms",
        }} />
      </button>
      {open && (
        <div style={{
          padding: "0 14px 14px",
          animation: "av-section-expand 250ms cubic-bezier(.2,.8,.2,1)",
        }}>
          {children}
        </div>
      )}
      <style jsx global>{`
        @keyframes av-section-expand {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 2000px; }
        }
      `}</style>
    </div>
  );
}

// =============================================================
// Champ d'info clé-valeur
// =============================================================
export function InfoField({ label, value, icon, color, copy, href, onClick, fullWidth }) {
  const handleClick = () => {
    if (copy && value) {
      navigator.clipboard?.writeText(typeof value === "string" ? value : String(value));
    }
    onClick?.();
  };

  return (
    <div style={{
      gridColumn: fullWidth ? "1 / -1" : undefined,
      padding: "8px 0",
      borderBottom: "1px solid rgba(255,255,255,.04)",
      cursor: (copy || href || onClick) ? "pointer" : "default",
    }} onClick={handleClick}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: "rgba(255,255,255,.45)",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 4,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {icon && <i className={`ti ${icon}`} style={{ color: color || "rgba(255,255,255,.55)", fontSize: 12 }} />}
        {label}
      </div>
      <div style={{
        color: "#fff", fontSize: 13, fontWeight: 600,
        wordBreak: "break-word",
      }}>
        {value != null && value !== "" ? value : <span style={{ color: "rgba(255,255,255,.3)" }}>—</span>}
      </div>
    </div>
  );
}

// =============================================================
// Grille de champs (2 colonnes)
// =============================================================
export function InfoGrid({ children, cols = 2 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: "0 16px",
    }}>{children}</div>
  );
}

// =============================================================
// Mini KPI tile pour les drawers
// =============================================================
export function MiniKpi({ icon, color, value, label, trend }) {
  return (
    <div style={{
      padding: 12,
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`,
      borderRadius: 10,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${color} 0%, ${color}80 100%)`,
        opacity: 0.7,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{
          color, fontSize: 14,
          filter: `drop-shadow(0 0 4px ${color})`,
        }} />
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: "rgba(255,255,255,.5)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}>{label}</span>
      </div>
      <div style={{
        color: "#fff", fontSize: 20, fontWeight: 800,
        lineHeight: 1, letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      {trend && (
        <div style={{
          fontSize: 10, fontWeight: 700, marginTop: 3,
          color: trend.includes("+") ? "#5aa05a" : "#D45E5E",
        }}>{trend}</div>
      )}
    </div>
  );
}

// =============================================================
// Timeline d'événements
// =============================================================
export function Timeline({ items }) {
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{
        position: "absolute", left: 8, top: 8, bottom: 8,
        width: 1, background: "rgba(255,255,255,.10)",
      }} />
      {items.map((it, i) => (
        <div key={i} style={{ position: "relative", marginBottom: 14 }}>
          <div style={{
            position: "absolute", left: -19, top: 3,
            width: 12, height: 12, borderRadius: "50%",
            background: it.color || "#185FA5",
            boxShadow: `0 0 10px ${it.color || "#185FA5"}, 0 0 0 2px rgba(20,33,49,.95)`,
          }} />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 2 }}>
            {it.date}
          </div>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{it.title}</div>
          {it.description && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 2 }}>{it.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}
