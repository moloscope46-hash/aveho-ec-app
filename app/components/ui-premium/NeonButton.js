"use client";
// =============================================================
//  NeonButton — Bouton ultra premium hitech (0.58.17)
//
//  Bouton avec :
//   - Background gradient
//   - Border conic-gradient rotative (effet "scan")
//   - Glow multi-layer au hover
//   - Ripple effect au click
//   - Shimmer subtil au mount
//
//  Usage :
//    <NeonButton variant="teal" onClick={save}>
//      <i className="ti ti-deviceFloppy" /> Enregistrer
//    </NeonButton>
//
//  Variants : teal | blue | violet | terra | amber | navy
//  Sizes    : sm | md | lg
// =============================================================

import { useState, useRef } from "react";

const VARIANTS = {
  teal:   {
    grad: "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)",
    gradHover: "linear-gradient(135deg, #8fd6d6 0%, #6cc5c5 100%)",
    glow: "0 0 0 4px rgba(124,200,200,.20), 0 8px 24px rgba(124,200,200,.40), 0 0 48px rgba(124,200,200,.25)",
    color: "#7CC8C8",
    textColor: "#fff",
  },
  blue:   {
    grad: "linear-gradient(135deg, #185FA5 0%, #4a8dd4 100%)",
    gradHover: "linear-gradient(135deg, #2270b8 0%, #5c9ee0 100%)",
    glow: "0 0 0 4px rgba(24,95,165,.20), 0 8px 24px rgba(24,95,165,.45), 0 0 48px rgba(24,95,165,.25)",
    color: "#185FA5",
    textColor: "#fff",
  },
  violet: {
    grad: "linear-gradient(135deg, #7a6fb0 0%, #5d52a0 100%)",
    gradHover: "linear-gradient(135deg, #8d82bf 0%, #6e63ad 100%)",
    glow: "0 0 0 4px rgba(122,111,176,.20), 0 8px 24px rgba(122,111,176,.45), 0 0 48px rgba(122,111,176,.25)",
    color: "#7a6fb0",
    textColor: "#fff",
  },
  terra:  {
    grad: "linear-gradient(135deg, #C9867F 0%, #b06d65 100%)",
    gradHover: "linear-gradient(135deg, #d6968e 0%, #bf7d75 100%)",
    glow: "0 0 0 4px rgba(201,134,127,.20), 0 8px 24px rgba(201,134,127,.45), 0 0 48px rgba(201,134,127,.25)",
    color: "#C9867F",
    textColor: "#fff",
  },
  amber:  {
    grad: "linear-gradient(135deg, #EF9F27 0%, #d6831d 100%)",
    gradHover: "linear-gradient(135deg, #f5ad3a 0%, #e69130 100%)",
    glow: "0 0 0 4px rgba(239,159,39,.20), 0 8px 24px rgba(239,159,39,.45), 0 0 48px rgba(239,159,39,.25)",
    color: "#EF9F27",
    textColor: "#fff",
  },
  navy:   {
    grad: "linear-gradient(135deg, #142131 0%, #243044 100%)",
    gradHover: "linear-gradient(135deg, #1e3147 0%, #324259 100%)",
    glow: "0 0 0 4px rgba(20,33,49,.25), 0 8px 24px rgba(20,33,49,.45), 0 0 32px rgba(124,200,200,.30)",
    color: "#7CC8C8",  // accent teal pour la bordure scan
    textColor: "#fff",
  },
  // 0.58.21 : variant aurora multi-couleur Aveho (teal → blue → violet → terra)
  aurora: {
    grad: "linear-gradient(135deg, #7CC8C8 0%, #185FA5 35%, #7a6fb0 70%, #C9867F 100%)",
    gradHover: "linear-gradient(135deg, #8fd6d6 0%, #2270b8 35%, #8d82bf 70%, #d6968e 100%)",
    glow: "0 0 0 4px rgba(124,200,200,.18), 0 12px 32px rgba(24,95,165,.35), 0 0 60px rgba(124,200,200,.30), 0 0 100px rgba(122,111,176,.18)",
    color: "#7CC8C8",
    textColor: "#fff",
  },
};

const SIZES = {
  sm: { padH: 12, padV: 6,  fontSize: 12,   iconSize: 14, radius: 8 },
  md: { padH: 18, padV: 10, fontSize: 13.5, iconSize: 16, radius: 10 },
  lg: { padH: 24, padV: 13, fontSize: 15,   iconSize: 18, radius: 12 },
};

export default function NeonButton({
  children,
  onClick,
  variant = "teal",
  size = "md",
  disabled = false,
  type = "button",
  scan = true,         // afficher le border scan-line
  fullWidth = false,
  // 0.58.21 : prop icon optionnelle pour préfixer le label
  icon,
  ariaLabel,
  style: customStyle,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.teal;
  const sz = SIZES[size] || SIZES.md;
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState([]);
  const rippleIdRef = useRef(0);
  const btnRef = useRef(null);

  function handleClick(e) {
    if (disabled) return;
    // Ripple effect
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;
      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x, y, size }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    }
    onClick?.(e);
  }

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={scan && !disabled ? "av-neon-btn" : ""}
      style={{
        position: "relative",
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : "auto",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: `${sz.padV}px ${sz.padH}px`,
        background: hovered && !disabled ? v.gradHover : v.grad,
        color: v.textColor,
        border: "none",
        borderRadius: sz.radius,
        fontSize: sz.fontSize,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: hovered && !disabled
          ? v.glow
          : `0 2px 6px rgba(20,33,49,.18), 0 1px 0 rgba(255,255,255,.18) inset`,
        transition: "background 200ms var(--av-ease-out), box-shadow 250ms var(--av-ease-out), transform 200ms var(--av-ease-out)",
        transform: hovered && !disabled ? "translateY(-2px)" : "translateY(0)",
        overflow: "hidden",
        outline: "none",
        letterSpacing: ".2px",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        isolation: "isolate",
        ...customStyle,
      }}
      {...rest}
    >
      {/* Shimmer subtle au mount (light sweep gauche → droite) */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "-50%",
          width: "50%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,.30), transparent)",
          animation: "av-shimmer-premium 3.5s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <span style={{
        position: "relative",
        zIndex: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        textShadow: `0 1px 2px rgba(20,33,49,.3)`,
      }}>
        {/* 0.58.21 : icon optionnelle préfixant le label */}
        {icon && (
          <i
            className={`ti ${icon}`}
            style={{
              fontSize: sz.iconSize,
              animation: icon === "ti-loader-2" ? "av-neon-spin 1s linear infinite" : undefined,
            }}
            aria-hidden="true"
          />
        )}
        {children}
      </span>

      {/* Ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
            borderRadius: "50%",
            background: "rgba(255,255,255,.45)",
            transform: "scale(0)",
            animation: "av-ripple 700ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      ))}

      {/* Scan-line border (conic-gradient animé) */}
      {scan && !disabled && (
        <span
          aria-hidden="true"
          className="av-neon-scan"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            padding: "1.5px",
            background: `var(--av-conic-scan)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            opacity: hovered ? 1 : 0,
            transition: "opacity 250ms",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      )}
    </button>
  );
}
