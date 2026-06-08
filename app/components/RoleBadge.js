"use client";
// =============================================================
//  components/RoleBadge.js (0.62.122)
//
//  Affiche le rôle de l'utilisateur avec son icône + couleur
//  personnalisable depuis la page Utilisateurs (0.62.121).
//
//  Usage :
//    <RoleBadge auth={auth} />                  // pill compact
//    <RoleBadge auth={auth} variant="full" />   // avec nom + descr
//    <RoleBadge role={someRole} size="lg" />    // pour rôles autres
// =============================================================

import { useState } from "react";

export default function RoleBadge({
  auth,
  role: roleProp,
  variant = "compact",   // compact | full | minimal | icon
  size = "md",            // sm | md | lg
  showTooltip = true,
  onClick,
  className = "",
  style = {},
}) {
  const role = roleProp || auth?.role;
  if (!role || !role.nom) return null;

  const icone = role.icone || "ti-user-circle";
  const couleur = role.couleur || "#185FA5";
  const nom = role.nom;
  const description = role.description || "";

  const sizes = {
    sm: { iconSize: 12, fontSize: 10.5, padding: "2px 6px", iconPx: 14 },
    md: { iconSize: 14, fontSize: 11.5, padding: "3px 10px", iconPx: 18 },
    lg: { iconSize: 18, fontSize: 13, padding: "5px 14px", iconPx: 22 },
  };
  const sz = sizes[size] || sizes.md;

  // VARIANT ICON : juste l'icône dans un rond gradient
  if (variant === "icon") {
    return (
      <span
        title={showTooltip ? nom : undefined}
        onClick={onClick}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: sz.iconPx + 8,
          height: sz.iconPx + 8,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`,
          color: "#fff",
          fontSize: sz.iconPx,
          boxShadow: `0 2px 6px ${couleur}55`,
          cursor: onClick ? "pointer" : "default",
          transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          flexShrink: 0,
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08) rotate(-3deg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) rotate(0)"; }}
      >
        <i className={`ti ${icone}`} />
      </span>
    );
  }

  // VARIANT MINIMAL : juste icône + texte petit
  if (variant === "minimal") {
    return (
      <span
        title={showTooltip ? description || nom : undefined}
        onClick={onClick}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: couleur,
          fontSize: sz.fontSize,
          fontWeight: 600,
          cursor: onClick ? "pointer" : "default",
          ...style,
        }}
      >
        <i className={`ti ${icone}`} />
        {nom}
      </span>
    );
  }

  // VARIANT FULL : icône large + nom + description
  if (variant === "full") {
    return (
      <div
        onClick={onClick}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          background: `linear-gradient(135deg, ${couleur}12, transparent)`,
          border: `1px solid ${couleur}33`,
          borderLeft: `4px solid ${couleur}`,
          borderRadius: 10,
          cursor: onClick ? "pointer" : "default",
          transition: "all 200ms",
          ...style,
        }}
      >
        <i className={`ti ${icone}`} style={{
          fontSize: 24,
          color: couleur,
          background: `${couleur}15`,
          borderRadius: 8,
          padding: 6,
          flexShrink: 0,
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>{nom}</div>
          {description && (
            <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
              {description}
            </div>
          )}
        </div>
      </div>
    );
  }

  // VARIANT COMPACT (default) : pill avec icône + nom
  return (
    <span
      title={showTooltip ? description || nom : undefined}
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: sz.padding,
        background: `linear-gradient(135deg, ${couleur}22, ${couleur}11)`,
        color: couleur,
        border: `1px solid ${couleur}44`,
        borderRadius: 12,
        fontSize: sz.fontSize,
        fontWeight: 700,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
        transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = `0 4px 12px ${couleur}33`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <i className={`ti ${icone}`} style={{ fontSize: sz.iconSize }} />
      {nom}
    </span>
  );
}
