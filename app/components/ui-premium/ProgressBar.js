"use client";
// =============================================================
//  ProgressBar — Barre de progression linéaire (0.58.14)
//
//  Usage :
//    <ProgressBar value={progress} label="Upload en cours…" showPercent />
//    <ProgressBar value={75} variant="success" size="lg" />
//    <ProgressBar indeterminate label="Traitement…" />
//
//  Props :
//    value         : 0-100 (ignoré si indeterminate)
//    label         : texte au-dessus de la barre
//    showPercent   : affiche le % à droite du label
//    size          : sm (4px) | md (8px) | lg (12px)
//    variant       : default (teal) | success (green) | danger (terra) | navy
//    indeterminate : mode chargement infini (animation sweep)
// =============================================================

export default function ProgressBar({
  value = 0,
  label,
  showPercent = false,
  size = "md",
  variant = "default",
  indeterminate = false,
  ariaLabel,
}) {
  // Clamp 0-100
  const pct = Math.max(0, Math.min(100, value));

  const heights = { sm: 4, md: 8, lg: 12 };
  const h = heights[size] || heights.md;

  const variants = {
    default: { from: "#7CC8C8", to: "#5db5b5", glow: "rgba(124,200,200,.40)" },
    success: { from: "#5aa05a", to: "#3e8540", glow: "rgba(90,160,90,.40)" },
    danger:  { from: "#C9867F", to: "#b06d65", glow: "rgba(201,134,127,.40)" },
    navy:    { from: "#142131", to: "#243044", glow: "rgba(20,33,49,.30)" },
  };
  const v = variants[variant] || variants.default;

  return (
    <div style={{ width: "100%" }}>
      {(label || showPercent) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--av-g700, #4a5868)",
        }}>
          {label && <span>{label}</span>}
          {showPercent && !indeterminate && (
            <span style={{
              color: "var(--av-navy, #142131)",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              fontSize: 12,
            }}>{pct.toFixed(0)}%</span>
          )}
          {indeterminate && (
            <span style={{
              color: "var(--av-g500, #8a98a8)",
              fontWeight: 500,
              fontSize: 11.5,
              fontStyle: "italic",
            }}>en cours…</span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-label={ariaLabel || label || "Progression"}
        aria-valuenow={indeterminate ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={indeterminate ? "en cours" : `${pct.toFixed(0)} pourcent`}
        style={{
          width: "100%",
          height: h,
          background: "var(--av-g100, #f4f7fa)",
          border: "1px solid var(--av-g200, #e3e9ee)",
          borderRadius: 99,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {indeterminate ? (
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "40%",
            background: `linear-gradient(90deg, ${v.from} 0%, ${v.to} 100%)`,
            borderRadius: 99,
            animation: "av-progress-indeterminate 1.4s cubic-bezier(.65, 0, .35, 1) infinite",
            boxShadow: `0 0 12px ${v.glow}`,
          }} />
        ) : (
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${v.from} 0%, ${v.to} 100%)`,
            borderRadius: 99,
            transition: "width 300ms cubic-bezier(.2, .8, .2, 1)",
            boxShadow: pct > 0 ? `0 0 8px ${v.glow}` : "none",
            position: "relative",
          }}>
            {/* Brillance subtile au sommet */}
            {pct > 5 && (
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: "50%",
                background: "linear-gradient(180deg, rgba(255,255,255,.25) 0%, transparent 100%)",
                borderRadius: "99px 99px 0 0",
                pointerEvents: "none",
              }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
