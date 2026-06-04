"use client";
// =============================================================
//  Tabs — Navigation par onglets premium (0.58.3)
//
//  3 styles : pills (par défaut), underline, segmented.
//
//  Usage :
//    const [active, setActive] = useState("general");
//    <Tabs
//      active={active}
//      onChange={setActive}
//      style="pills"
//      tabs={[
//        { id: "general", label: "Général", icon: "ti-info-circle" },
//        { id: "stats", label: "Statistiques", icon: "ti-chart-bar", count: 12 },
//        { id: "rgpd", label: "RGPD", icon: "ti-shield-check" },
//      ]}
//    />
// =============================================================

import { useRef, useEffect, useState } from "react";

export default function Tabs({
  active,
  onChange,
  tabs = [],
  style: variant = "pills",
  size = "md",
}) {
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  // Calcul de la position de l'indicator (pour variant underline + segmented)
  useEffect(() => {
    if (variant === "pills") return;
    if (!containerRef.current) return;

    const activeBtn = containerRef.current.querySelector(`[data-tab-id="${active}"]`);
    if (!activeBtn) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    setIndicatorStyle({
      width: btnRect.width,
      left: btnRect.left - containerRect.left,
      opacity: 1,
    });
  }, [active, variant, tabs]);

  const sizes = {
    sm: { padH: 12, padV: 6, fontSize: 12, gap: 5, iconSize: 13 },
    md: { padH: 16, padV: 9, fontSize: 13, gap: 6, iconSize: 14 },
    lg: { padH: 20, padV: 12, fontSize: 14, gap: 7, iconSize: 16 },
  };
  const sz = sizes[size] || sizes.md;

  // === STYLE PILLS (par défaut) ===
  if (variant === "pills") {
    return (
      <div
        ref={containerRef}
        role="tablist"
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          background: "var(--av-g100)",
          borderRadius: "var(--av-r-full)",
          border: "1px solid var(--av-g200)",
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              data-tab-id={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: sz.gap,
                padding: `${sz.padV}px ${sz.padH}px`,
                background: isActive ? "var(--av-g0)" : "transparent",
                color: isActive ? "var(--av-navy)" : "var(--av-g600)",
                border: "none",
                borderRadius: "var(--av-r-full)",
                fontWeight: isActive ? 600 : 500,
                fontSize: sz.fontSize,
                cursor: "pointer",
                transition: "background 200ms var(--av-ease-out), color 200ms",
                boxShadow: isActive ? "var(--av-shadow-sm)" : "none",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--av-navy)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--av-g600)";
              }}
            >
              {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: sz.iconSize }} />}
              {t.label}
              {t.count !== undefined && t.count !== null && (
                <span style={{
                  marginLeft: 4,
                  padding: "1px 7px",
                  background: isActive ? "var(--av-teal)" : "var(--av-g200)",
                  color: isActive ? "#fff" : "var(--av-g700)",
                  borderRadius: "var(--av-r-full)",
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 16,
                  textAlign: "center",
                  transition: "background 200ms",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // === STYLE UNDERLINE ===
  if (variant === "underline") {
    return (
      <div
        ref={containerRef}
        role="tablist"
        style={{
          position: "relative",
          display: "inline-flex",
          gap: 4,
          borderBottom: "1px solid var(--av-g200)",
          paddingBottom: 1,
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              data-tab-id={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(t.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: sz.gap,
                padding: `${sz.padV + 2}px ${sz.padH}px`,
                background: "transparent",
                color: isActive ? "var(--av-blue)" : "var(--av-g600)",
                border: "none",
                fontWeight: isActive ? 600 : 500,
                fontSize: sz.fontSize,
                cursor: "pointer",
                transition: "color 200ms var(--av-ease-out)",
                whiteSpace: "nowrap",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--av-navy)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--av-g600)";
              }}
            >
              {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: sz.iconSize }} />}
              {t.label}
              {t.count !== undefined && t.count !== null && (
                <span style={{
                  padding: "1px 6px",
                  background: "var(--av-g100)",
                  color: "var(--av-g700)",
                  borderRadius: "var(--av-r-full)",
                  fontSize: 10.5,
                  fontWeight: 700,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Indicator animé sous l'onglet actif */}
        <div style={{
          position: "absolute",
          bottom: -1,
          height: 2.5,
          background: "linear-gradient(90deg, #185FA5, #7CC8C8)",
          borderRadius: "var(--av-r-full)",
          transition: "left 280ms var(--av-ease-out), width 280ms var(--av-ease-out)",
          ...indicatorStyle,
        }} />
      </div>
    );
  }

  // === STYLE SEGMENTED ===
  return (
    <div
      ref={containerRef}
      role="tablist"
      style={{
        position: "relative",
        display: "inline-flex",
        background: "var(--av-g100)",
        borderRadius: "var(--av-r-md)",
        border: "1px solid var(--av-g200)",
        padding: 3,
      }}
    >
      {/* Indicator background */}
      <div style={{
        position: "absolute",
        top: 3,
        bottom: 3,
        background: "var(--av-g0)",
        borderRadius: "calc(var(--av-r-md) - 3px)",
        boxShadow: "var(--av-shadow-sm)",
        transition: "left 280ms var(--av-ease-out), width 280ms var(--av-ease-out)",
        ...indicatorStyle,
      }} />

      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            data-tab-id={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(t.id)}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: sz.gap,
              padding: `${sz.padV}px ${sz.padH}px`,
              background: "transparent",
              color: isActive ? "var(--av-navy)" : "var(--av-g600)",
              border: "none",
              fontWeight: isActive ? 600 : 500,
              fontSize: sz.fontSize,
              cursor: "pointer",
              transition: "color 200ms",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
          >
            {t.icon && <i className={`ti ${t.icon}`} style={{ fontSize: sz.iconSize }} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
//  TabPanel — Wrapper qui anime le contenu au changement de tab
//  (0.58.11)
//
//  Usage :
//    <TabPanel active={activeTab} id="general">
//      {activeTab === "general" && <div>Contenu général</div>}
//    </TabPanel>
//
//  Joue une animation slide horizontal 280ms à chaque changement.
//  Le sens du slide est calculé automatiquement (vers la droite si
//  on va vers un tab "plus loin" dans la liste).
// =============================================================
export function TabPanel({ active, id, children }) {
  // L'animation utilise la key={active} pour forcer un re-mount visuel
  // → CSS keyframe av-tab-slide-in déclenché à chaque changement
  return (
    <div
      key={active}
      role="tabpanel"
      aria-labelledby={`tab-${id || active}`}
      style={{
        animation: "av-tab-slide-in 280ms cubic-bezier(.2, .8, .2, 1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
