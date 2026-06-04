"use client";
// =============================================================
//  MetricCard — Card avec progress bar animée (0.58.0)
//
//  Idéal pour : taux d'occupation, % complétion, capacité.
//
//  Usage :
//    <MetricCard
//      label="Taux RGPD"
//      value={87}
//      max={100}
//      suffix="%"
//      variant="success"
//      breakdown={[
//        { label: "Consents OK", value: 87, color: "var(--av-green)" },
//        { label: "En attente", value: 13, color: "var(--av-amber)" },
//      ]}
//    />
// =============================================================

import { useEffect, useState } from "react";

const VARIANTS = {
  teal:    { color: "var(--av-teal)",    light: "rgba(124, 200, 200, 0.15)" },
  blue:    { color: "var(--av-blue)",    light: "rgba(24, 95, 165, 0.10)" },
  terra:   { color: "var(--av-terra)",   light: "rgba(201, 134, 127, 0.12)" },
  amber:   { color: "var(--av-amber)",   light: "rgba(239, 159, 39, 0.12)" },
  success: { color: "var(--av-green)",   light: "rgba(90, 160, 90, 0.10)" },
  danger:  { color: "var(--av-red)",     light: "rgba(192, 57, 43, 0.10)" },
};

export default function MetricCard({
  label,
  value,
  max = 100,
  suffix = "",
  variant = "teal",
  icon,
  description,
  breakdown,         // array de { label, value, color }
  showProgress = true,
}) {
  const cfg = VARIANTS[variant] || VARIANTS.teal;
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Animation du progress
  const [animPercent, setAnimPercent] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimPercent(percent), 100);
    return () => clearTimeout(t);
  }, [percent]);

  return (
    <div style={{
      background: "var(--av-g0)",
      border: "1px solid var(--av-g200)",
      borderRadius: "var(--av-r-lg)",
      padding: 20,
      transition: "box-shadow 250ms var(--av-ease-out)",
      animation: "av-scale-in 0.4s var(--av-ease-out)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && (
            <div style={{
              width: 36, height: 36,
              borderRadius: "var(--av-r-md)",
              background: cfg.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <i className={`ti ${icon}`} style={{ fontSize: 18, color: cfg.color }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: "var(--av-g600)", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600 }}>
              {label}
            </div>
            {description && (
              <div style={{ fontSize: 11.5, color: "var(--av-g500)", marginTop: 2 }}>
                {description}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{
            fontSize: 26,
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}>
            {Math.round(value)}
          </span>
          {suffix && (
            <span style={{ fontSize: 14, color: "var(--av-g600)", marginLeft: 2 }}>{suffix}</span>
          )}
          {max !== 100 && (
            <div style={{ fontSize: 11, color: "var(--av-g500)", lineHeight: 1 }}>
              / {max}{suffix}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div style={{
          height: 8,
          background: "var(--av-g100)",
          borderRadius: "var(--av-r-full)",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            height: "100%",
            width: `${animPercent}%`,
            background: `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}cc 100%)`,
            borderRadius: "var(--av-r-full)",
            transition: "width 1200ms var(--av-ease-out)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Shimmer effect sur le bar */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              backgroundSize: "200px 100%",
              animation: "av-shimmer 2s linear infinite",
            }} />
          </div>
        </div>
      )}

      {/* Breakdown détaillé */}
      {breakdown && breakdown.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {breakdown.map((b, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: b.color || cfg.color,
                }} />
                <span style={{ color: "var(--av-g700)" }}>{b.label}</span>
              </div>
              <span style={{ fontWeight: 600, color: "var(--av-navy)", fontVariantNumeric: "tabular-nums" }}>
                {b.value}{suffix}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
