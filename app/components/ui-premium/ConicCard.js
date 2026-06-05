"use client";
// =============================================================
//  ConicCard — Card premium avec scan-line conic permanent (0.58.20)
//
//  Variante visuelle de KpiCard, avec une bordure conic-gradient
//  qui tourne en continu en arrière-plan (effet "scanner" hitech).
//
//  Différences avec KpiCard :
//   - Border-radius légèrement plus marqué
//   - Conic-gradient toujours visible (pas seulement au hover)
//   - Effet glassmorphism subtil
//   - Animation continue (4s/8s/12s selon speed)
//
//  Usage :
//    <ConicCard
//      icon="ti-tools"
//      label="Interventions ouvertes"
//      value={142}
//      sub="↑ +12% vs mois dernier"
//      variant="teal"        // teal | blue | violet | terra | amber | aurora
//      speed="normal"        // slow (12s) | normal (4s) | fast (2s)
//      onClick={() => router.push('/interventions')}
//    />
//
//  Variants couleur :
//    - teal/blue/violet/terra/amber : scan single-color
//    - aurora : scan multi-couleur (rotation des 4 couleurs Aveho)
// =============================================================

import { useState, useEffect, useRef } from "react";

/**
 * 0.58.28 : Hook count-up animation (extrait pour réutilisation)
 * Anime de 0 vers la valeur cible avec easeOutCubic.
 */
function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (typeof target !== "number" || target === 0) {
      setVal(target || 0);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setVal(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return val;
}

const VARIANTS = {
  teal:   { accent: "#7CC8C8", glow: "rgba(124,200,200,.40)", bg: "rgba(124,200,200,.06)" },
  blue:   { accent: "#185FA5", glow: "rgba(24,95,165,.40)",   bg: "rgba(24,95,165,.06)" },
  violet: { accent: "#7a6fb0", glow: "rgba(122,111,176,.40)", bg: "rgba(122,111,176,.06)" },
  terra:  { accent: "#C9867F", glow: "rgba(201,134,127,.40)", bg: "rgba(201,134,127,.06)" },
  amber:  { accent: "#EF9F27", glow: "rgba(239,159,39,.40)",  bg: "rgba(239,159,39,.06)" },
  aurora: { accent: "#7CC8C8", glow: "rgba(124,200,200,.40)", bg: "rgba(124,200,200,.05)", aurora: true },
};

const SPEEDS = { slow: "12s", normal: "4s", fast: "2s" };

export default function ConicCard({
  icon,
  label,
  value,
  sub,
  variant = "teal",
  speed = "normal",
  onClick,
  size = "md",        // sm | md | lg
  fullHeight = true,
}) {
  const v = VARIANTS[variant] || VARIANTS.teal;
  const dur = SPEEDS[speed] || SPEEDS.normal;
  const [hovered, setHovered] = useState(false);
  // 0.58.28 : animation count-up (hook au top level, safe React)
  const animatedValue = useCountUp(typeof value === "number" ? value : 0);
  const displayValue = typeof value === "number" ? animatedValue : value;

  const sz = {
    sm: { padding: 14, iconSize: 32, valueFont: 22, labelFont: 11, subFont: 11 },
    md: { padding: 18, iconSize: 38, valueFont: 28, labelFont: 11.5, subFont: 11.5 },
    lg: { padding: 22, iconSize: 44, valueFont: 36, labelFont: 12, subFont: 12 },
  }[size] || { padding: 18, iconSize: 38, valueFont: 28, labelFont: 11.5, subFont: 11.5 };

  // Conic-gradient selon variant
  const conicBg = v.aurora
    ? `conic-gradient(from 0deg, ${v.accent} 0deg, #185FA5 90deg, #7a6fb0 180deg, #C9867F 270deg, ${v.accent} 360deg)`
    : `conic-gradient(from 0deg, transparent 0deg, ${v.accent} 50deg, transparent 100deg, transparent 360deg)`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: "var(--av-g0, #fff)",
        border: "1px solid var(--av-g200, #e3e9ee)",
        borderRadius: 16,
        padding: sz.padding,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 350ms var(--av-ease-out), box-shadow 350ms var(--av-ease-out)",
        boxShadow: hovered
          ? `0 0 0 4px ${v.glow}, 0 12px 32px rgba(20,33,49,.18), 0 0 40px ${v.glow}`
          : "var(--av-shadow-sm, 0 2px 8px rgba(20,33,49,.06))",
        overflow: "hidden",
        height: fullHeight ? "100%" : "auto",
        minHeight: 130,
        isolation: "isolate",
        transform: hovered && onClick ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      {/* Conic scan border en permanence */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: "inherit",
          padding: "2px",
          background: conicBg,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: `av-scan-rotate ${dur} linear infinite`,
          pointerEvents: "none",
          opacity: hovered ? 1 : 0.85,
          zIndex: 0,
        }}
      />

      {/* Background tinté subtil de la couleur accent */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 100% 0%, ${v.bg} 0%, transparent 60%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Decorative glow blob arrière */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          background: `radial-gradient(circle, ${v.accent}33 0%, transparent 70%)`,
          borderRadius: "50%",
          filter: "blur(16px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Icon + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {icon && (
            <div style={{
              width: sz.iconSize,
              height: sz.iconSize,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${v.accent} 0%, ${v.accent}cc 100%)`,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 12px ${v.glow}, inset 0 1px 0 rgba(255,255,255,.30)`,
              flexShrink: 0,
              position: "relative",
            }}>
              <i className={`ti ${icon}`} style={{ fontSize: sz.iconSize * 0.5, textShadow: `0 0 8px ${v.glow}` }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: sz.labelFont,
              color: "var(--av-g600, #6c7a89)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              lineHeight: 1.3,
            }}>
              {label}
            </div>
          </div>
        </div>

        {/* Value — 0.58.28 : animation count-up de 0 vers value */}
        <div style={{
          fontSize: sz.valueFont,
          fontWeight: 700,
          color: "var(--av-navy, #142131)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: sub ? 6 : 0,
          fontVariantNumeric: "tabular-nums",
        }}>
          {typeof value === "number" ? displayValue : value}
        </div>

        {/* Sub */}
        {sub && (
          <div style={{
            fontSize: sz.subFont,
            color: "var(--av-g600, #6c7a89)",
            fontWeight: 500,
            marginTop: "auto",
          }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
