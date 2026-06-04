"use client";
// =============================================================
//  Sparkline — Mini graphique SVG ligne pour KPI cards (0.58.0)
//
//  Léger (pas de dépendance recharts), animation au mount,
//  responsive (s'étire en width:100%).
// =============================================================

import { useEffect, useState, useId } from "react";

export default function Sparkline({
  data = [],
  color = "#185FA5",
  height = 32,
  showDot = true,
  animate = true,
}) {
  const [mounted, setMounted] = useState(false);
  const gradId = useId();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length < 2) return null;

  // Normaliser les data en coordonnées SVG
  const width = 100;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;
  const lastPoint = points[points.length - 1];

  // Si "color" est un gradient string, on extrait, sinon couleur unie
  const isGradient = typeof color === "string" && color.startsWith("linear-gradient");
  const stroke = isGradient ? `url(#${gradId}-stroke)` : color;
  const fillId = `${gradId}-fill`;
  const trend = data[data.length - 1] - data[0];
  const trendColor = trend >= 0 ? "var(--av-green)" : "var(--av-red)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height,
        overflow: "visible",
        display: "block",
      }}
    >
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isGradient ? "#7CC8C8" : color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={isGradient ? "#7CC8C8" : color} stopOpacity="0" />
        </linearGradient>
        {isGradient && (
          <linearGradient id={`${gradId}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7CC8C8" />
            <stop offset="100%" stopColor="#2a5a5a" />
          </linearGradient>
        )}
      </defs>

      {/* Zone remplie sous la ligne */}
      <path
        d={areaPath}
        fill={`url(#${fillId})`}
        style={{
          opacity: mounted && animate ? 1 : 0,
          transition: "opacity 600ms var(--av-ease-out) 200ms",
        }}
      />

      {/* Ligne principale */}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: animate ? 200 : 0,
          strokeDashoffset: mounted && animate ? 0 : 200,
          transition: "stroke-dashoffset 1200ms var(--av-ease-out)",
        }}
      />

      {/* Point final */}
      {showDot && (
        <>
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3"
            fill={isGradient ? "#2a5a5a" : color}
            style={{
              opacity: mounted && animate ? 1 : 0,
              transition: "opacity 300ms var(--av-ease-out) 1000ms",
            }}
          />
          {/* Halo pulse autour du dernier point */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3"
            fill={isGradient ? "#2a5a5a" : color}
            opacity="0.4"
            style={{
              animation: mounted && animate ? "av-pulse-ring 1.8s ease-out infinite" : "none",
            }}
          />
        </>
      )}
    </svg>
  );
}
