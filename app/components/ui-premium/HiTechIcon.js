"use client";
// =============================================================
//  HiTechIcon — Icône futuriste avec gradient, glow et halo
//  Usage : <HiTechIcon name="ti-users" size={32} color="#7a6fb0" variant="glow" />
//  Variants : "glow" (default), "duotone", "neon", "laser", "ring"
// =============================================================
import React from "react";

export default function HiTechIcon({
  name = "ti-circle",
  size = 24,
  color = "#7CC8C8",
  variant = "glow",
  spin = false,
  pulse = false,
  className = "",
  style = {},
  onClick,
}) {
  const isInteractive = !!onClick;

  // Variantes visuelles
  const variantStyles = {
    glow: {
      color,
      filter: `drop-shadow(0 0 ${size / 4}px ${color}) drop-shadow(0 0 ${size / 2}px ${color}80)`,
    },
    duotone: {
      color,
      background: `linear-gradient(135deg, ${color} 0%, ${color}40 100%)`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      filter: `drop-shadow(0 1px 2px ${color}60)`,
    },
    neon: {
      color: "#fff",
      filter: `drop-shadow(0 0 ${size / 6}px ${color}) drop-shadow(0 0 ${size / 3}px ${color}) drop-shadow(0 0 ${size / 2}px ${color})`,
      textShadow: `0 0 ${size / 6}px ${color}, 0 0 ${size / 3}px ${color}`,
    },
    laser: {
      color,
      filter: `drop-shadow(0 0 ${size / 4}px ${color})`,
      position: "relative",
    },
    ring: {
      color,
      filter: `drop-shadow(0 0 4px ${color})`,
    },
  };

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: size,
    transition: "all 200ms cubic-bezier(.2,.8,.2,1)",
    cursor: isInteractive ? "pointer" : "inherit",
    ...variantStyles[variant],
    ...style,
  };

  // Wrapper pour les variants qui ont besoin de pseudo-éléments
  if (variant === "ring") {
    return (
      <span
        className={`av-hitech-ring ${className}`}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: "50%",
          background: `${color}15`,
          border: `1.5px solid ${color}50`,
          boxShadow: `0 0 ${size / 2}px ${color}40, inset 0 0 ${size / 3}px ${color}20`,
          ...style,
        }}
        onClick={onClick}
      >
        <i
          className={`ti ${name} ${spin ? "av-spinning" : ""} ${pulse ? "av-icon-pulse-glow" : ""}`}
          style={{ color, fontSize: size, filter: `drop-shadow(0 0 ${size / 4}px ${color})` }}
        />
        {/* Ring rotation effect */}
        <span style={{
          position: "absolute",
          inset: -2,
          borderRadius: "50%",
          border: `1px solid transparent`,
          borderTopColor: color,
          borderRightColor: color,
          opacity: 0.6,
          animation: "av-rotate 4s linear infinite",
          pointerEvents: "none",
        }} />
      </span>
    );
  }

  if (variant === "laser") {
    return (
      <span
        className={`av-hitech-laser ${className}`}
        style={{
          position: "relative",
          display: "inline-flex",
          ...style,
        }}
        onClick={onClick}
      >
        <i
          className={`ti ${name} ${spin ? "av-spinning" : ""} ${pulse ? "av-icon-pulse-glow" : ""}`}
          style={{ ...baseStyle, position: "relative", zIndex: 1 }}
        />
        {/* Rayon laser horizontal */}
        <span style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          opacity: 0.3,
          filter: "blur(4px)",
          animation: "av-laser-sweep 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      </span>
    );
  }

  // Variantes simples
  return (
    <i
      className={`ti ${name} ${spin ? "av-spinning" : ""} ${pulse ? "av-icon-pulse-glow" : ""} ${className}`}
      style={baseStyle}
      onClick={onClick}
    />
  );
}

// Composant container avec icône glow (pour remplacer les EntityIcon)
export function HiTechIconBox({
  name,
  size = 44,
  color = "#7CC8C8",
  shape = "rounded",  // rounded | circle | square
  variant = "gradient",  // gradient | flat | glow
  pulse = false,
  className = "",
  style = {},
}) {
  const radii = {
    rounded: size / 4,
    circle: "50%",
    square: 0,
  };

  const backgrounds = {
    gradient: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
    flat: `${color}25`,
    glow: `radial-gradient(circle, ${color}50 0%, ${color}25 70%)`,
  };

  return (
    <span
      className={`av-hitech-box ${className}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radii[shape],
        background: backgrounds[variant],
        border: variant === "flat" ? `1px solid ${color}40` : "1px solid rgba(255,255,255,.15)",
        color: variant === "flat" ? color : "#fff",
        fontSize: size * 0.5,
        boxShadow: variant === "gradient"
          ? `0 6px 16px ${color}50, inset 0 0 0 1px rgba(255,255,255,.15), inset 0 -2px 6px rgba(0,0,0,.10)`
          : variant === "glow"
          ? `0 0 ${size / 2}px ${color}, inset 0 0 ${size / 3}px ${color}50`
          : `0 2px 8px ${color}30`,
        transition: "all 250ms cubic-bezier(.2,.8,.2,1)",
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Halo lumineux derrière */}
      {variant === "gradient" && (
        <span style={{
          position: "absolute",
          inset: -4,
          borderRadius: radii[shape] === "50%" ? "50%" : radii[shape] + 4,
          background: `radial-gradient(circle, ${color}60 0%, transparent 70%)`,
          filter: "blur(10px)",
          opacity: 0.6,
          zIndex: -1,
          animation: pulse ? "av-pulse-halo 2.5s ease-in-out infinite" : "none",
        }} />
      )}
      <i className={`ti ${name}`} style={{
        filter: variant === "gradient"
          ? "drop-shadow(0 1px 2px rgba(0,0,0,.25))"
          : `drop-shadow(0 0 4px ${color})`,
      }} />
    </span>
  );
}
