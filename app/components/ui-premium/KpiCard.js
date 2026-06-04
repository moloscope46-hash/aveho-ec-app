"use client";
// =============================================================
//  KpiCard — La carte de KPI premium d'Aveho EC (0.58.0)
//
//  Card moderne avec :
//   - Gradient background optionnel (variant)
//   - Animated count-up (de 0 à la valeur)
//   - Sparkline optionnelle
//   - Trend indicator (% +/-)
//   - Icon avec halo glow
//   - Hover effects
//
//  Usage :
//    <KpiCard
//      label="Demandes d'intervention"
//      value={42}
//      previous={38}
//      icon="ti-tools"
//      variant="teal"
//      trend={11}
//      sparkline={[12, 15, 8, 22, 30, 28, 35, 42]}
//      onClick={() => router.push("/interventions")}
//    />
// =============================================================

import { useEffect, useState, useRef } from "react";
import Sparkline from "./Sparkline";

const VARIANTS = {
  teal:    { gradient: "var(--av-grad-teal)",    shadow: "var(--av-shadow-teal)",    glow: "0 0 40px rgba(124, 200, 200, 0.45), 0 0 80px rgba(124, 200, 200, 0.25)", color: "#7CC8C8" },
  blue:    { gradient: "var(--av-grad-blue)",    shadow: "var(--av-shadow-blue)",    glow: "0 0 40px rgba(24, 95, 165, 0.45), 0 0 80px rgba(24, 95, 165, 0.25)",  color: "#185FA5" },
  terra:   { gradient: "var(--av-grad-terra)",   shadow: "var(--av-shadow-terra)",   glow: "0 0 40px rgba(201, 134, 127, 0.45), 0 0 80px rgba(201, 134, 127, 0.25)", color: "#C9867F" },
  amber:   { gradient: "var(--av-grad-warning)", shadow: "var(--av-shadow-amber)",   glow: "0 0 40px rgba(239, 159, 39, 0.45), 0 0 80px rgba(239, 159, 39, 0.25)",  color: "#EF9F27" },
  navy:    { gradient: "var(--av-grad-navy)",    shadow: "var(--av-shadow-lg)",      glow: "0 0 40px rgba(20, 33, 49, 0.45), 0 0 80px rgba(20, 33, 49, 0.25)",     color: "#243044" },
  violet:  { gradient: "var(--av-grad-violet)",  shadow: "var(--av-shadow-md)",      glow: "0 0 40px rgba(122, 111, 176, 0.45), 0 0 80px rgba(122, 111, 176, 0.25)", color: "#7a6fb0" },
  success: { gradient: "var(--av-grad-success)", shadow: "var(--av-shadow-teal)",    glow: "0 0 40px rgba(90, 160, 90, 0.45), 0 0 80px rgba(90, 160, 90, 0.25)",   color: "#5aa05a" },
};

/**
 * Hook pour count-up animation.
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
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
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

export default function KpiCard({
  label,
  value,
  previous,
  icon = "ti-chart-bar",
  variant = "teal",
  trend,         // pourcentage manuel, sinon calculé depuis previous
  sparkline,     // array de valeurs pour mini-graph
  suffix,        // ex: "€", "%"
  onClick,
  loading = false,
  size = "md",   // sm | md | lg
}) {
  const cfg = VARIANTS[variant] || VARIANTS.teal;
  const animatedValue = useCountUp(typeof value === "number" ? value : 0);
  const displayValue = typeof value === "number" ? animatedValue : value;

  // Calcul de la tendance
  let trendValue = trend;
  if (trendValue === undefined && typeof previous === "number" && typeof value === "number" && previous !== 0) {
    trendValue = Math.round(((value - previous) / previous) * 100);
  }

  const isPositiveTrend = trendValue > 0;
  const isNegativeTrend = trendValue < 0;

  const SIZES = {
    sm: { padding: "16px", iconSize: 32, iconFont: 16, valueFont: 22, labelFont: 11 },
    md: { padding: "20px 22px", iconSize: 42, iconFont: 20, valueFont: 30, labelFont: 12 },
    lg: { padding: "24px 26px", iconSize: 52, iconFont: 24, valueFont: 38, labelFont: 13 },
  };
  const sz = SIZES[size] || SIZES.md;

  if (loading) {
    return (
      <div style={{
        background: "var(--av-g100)",
        borderRadius: "var(--av-r-lg)",
        padding: sz.padding,
        height: "100%",
        minHeight: 130,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.5) 50%, transparent 100%)",
          backgroundSize: "1000px 100%",
          animation: "av-shimmer 1.5s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        background: "var(--av-g0)",
        border: "1px solid var(--av-g200)",
        borderRadius: "var(--av-r-lg)",
        padding: sz.padding,
        cursor: onClick ? "pointer" : "default",
        // 0.58.17 : transition multi-property avec transform-style preserve-3d
        // 0.58.19 : transformStyle preserve-3d retiré (non nécessaire pour le tilt 2D
        // sur l'élément lui-même, et créait un containing block pour les enfants
        // position: fixed). Le tilt fonctionne pareil avec perspective() inline.
        transition: "transform 350ms var(--av-ease-out), box-shadow 350ms var(--av-ease-out), border-color 200ms",
        boxShadow: "var(--av-shadow-sm)",
        overflow: "hidden",
        height: "100%",
        minHeight: 130,
        animation: "av-scale-in 0.4s var(--av-ease-out)",
        // 0.58.19 : willChange retiré (créait des containing blocks pour les enfants
        // fixed dans les pages avec beaucoup de KpiCards). L'animation reste fluide.
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        // 0.58.17 : tilt 3D subtil au lieu d'un simple translateY
        e.currentTarget.style.transform = "perspective(1000px) rotateX(2deg) rotateY(-2deg) translateY(-4px) scale(1.015)";
        e.currentTarget.style.boxShadow = cfg.shadow + ", " + (cfg.glow || "0 0 40px " + (cfg.color || "rgba(124,200,200,.30)"));
        e.currentTarget.style.borderColor = cfg.color || "transparent";
      }}
      onMouseMove={(e) => {
        if (!onClick) return;
        // 0.58.17 : tilt qui suit la position du curseur (effet parallax)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotY = (x - 0.5) * 8;   // ±4deg max
        const rotX = (0.5 - y) * 6;   // ±3deg max
        e.currentTarget.style.transform =
          `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px) scale(1.015)`;
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        e.currentTarget.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "var(--av-shadow-sm)";
        e.currentTarget.style.borderColor = "var(--av-g200)";
      }}
    >
      {/* Decorative gradient blob en arrière-plan */}
      <div style={{
        position: "absolute",
        top: -40, right: -40,
        width: 140, height: 140,
        background: cfg.gradient,
        opacity: 0.08,
        borderRadius: "50%",
        filter: "blur(20px)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
        {/* HEADER : icon + trend */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{
            width: sz.iconSize,
            height: sz.iconSize,
            borderRadius: "var(--av-r-md)",
            background: cfg.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 12px ${cfg.glow}`,
          }}>
            <i className={`ti ${icon}`} style={{ color: "#fff", fontSize: sz.iconFont }} />
          </div>

          {trendValue !== undefined && trendValue !== null && !isNaN(trendValue) && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "4px 9px",
              borderRadius: "var(--av-r-full)",
              fontSize: 11,
              fontWeight: 700,
              background: isPositiveTrend ? "rgba(90, 160, 90, 0.12)" :
                          isNegativeTrend ? "rgba(192, 57, 43, 0.12)" :
                          "var(--av-g100)",
              color: isPositiveTrend ? "var(--av-green)" :
                     isNegativeTrend ? "var(--av-red)" :
                     "var(--av-g600)",
            }}>
              <i className={`ti ti-${isPositiveTrend ? "trending-up" : isNegativeTrend ? "trending-down" : "minus"}`}
                 style={{ fontSize: 12 }} />
              {Math.abs(trendValue)}%
            </div>
          )}
        </div>

        {/* VALEUR (count-up animé) */}
        <div style={{
          fontSize: sz.valueFont,
          fontWeight: 700,
          color: "var(--av-navy)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
        }}>
          {displayValue}
          {suffix && <span style={{ fontSize: sz.valueFont * 0.6, marginLeft: 4, fontWeight: 500, color: "var(--av-g600)" }}>{suffix}</span>}
        </div>

        {/* LABEL */}
        <div style={{
          fontSize: sz.labelFont,
          color: "var(--av-g600)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontWeight: 600,
        }}>
          {label}
        </div>

        {/* SPARKLINE optionnelle */}
        {sparkline && sparkline.length > 1 && (
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <Sparkline data={sparkline} color={cfg.gradient} height={32} />
          </div>
        )}
      </div>
    </div>
  );
}
