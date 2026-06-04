"use client";
// =============================================================
//  BulkToolbar — Action bar contextuelle pour multi-sélection (0.58.13)
//
//  Apparaît en bas d'écran (sticky/fixed) quand `count > 0`.
//  Slide-up animation à l'apparition.
//
//  Usage :
//    const [selected, setSelected] = useState(new Set());
//    <BulkToolbar
//      count={selected.size}
//      onClear={() => setSelected(new Set())}
//      actions={[
//        { id: "assign", label: "Assigner", icon: "ti-user-check", onClick: bulkAssign },
//        { id: "export", label: "Exporter", icon: "ti-download", onClick: bulkExport },
//        { id: "delete", label: "Supprimer", icon: "ti-trash", onClick: bulkDelete, variant: "danger" },
//      ]}
//    />
//
//  Positions : 'bottom' (défaut, fixed bottom) | 'top' (en haut)
// =============================================================

import { useEffect, useState } from "react";

export default function BulkToolbar({
  count = 0,
  onClear,
  actions = [],
  position = "bottom",
  itemName = "élément",
  itemNamePlural,         // pluriel custom, sinon `${itemName}s`
  ariaLabel,
}) {
  // Mémorisation du dernier count > 0 pour éviter le flash "0" pendant l'animation de sortie
  const [displayCount, setDisplayCount] = useState(count);
  useEffect(() => {
    if (count > 0) setDisplayCount(count);
  }, [count]);

  if (count <= 0) return null;

  const plural = displayCount > 1
    ? (itemNamePlural || `${itemName}s`)
    : itemName;

  return (
    <div
      role="region"
      aria-label={ariaLabel || `Actions sur ${displayCount} ${plural} sélectionné${displayCount > 1 ? "s" : ""}`}
      style={{
        position: "fixed",
        [position === "top" ? "top" : "bottom"]: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 70,
        background: "linear-gradient(135deg, #142131 0%, #243044 100%)",
        color: "#fff",
        padding: "10px 12px 10px 16px",
        borderRadius: 99,
        boxShadow: "0 20px 50px rgba(20,33,49,.50), 0 8px 20px rgba(20,33,49,.30), 0 0 0 1px rgba(255,255,255,.06) inset",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        animation: `av-bulk-toolbar-in 350ms cubic-bezier(.2,.8,.2,1)`,
        maxWidth: "calc(100vw - 40px)",
        flexWrap: "wrap",
      }}
    >
      {/* Compteur + label */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "0 14px 0 6px",
      }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 30,
          height: 30,
          borderRadius: 99,
          background: "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)",
          color: "#142131",
          fontSize: 13,
          fontWeight: 800,
          padding: "0 9px",
          boxShadow: "0 2px 8px rgba(124,200,200,.40)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: ".5px",
        }}>
          {displayCount}
        </span>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-.01em",
        }}>
          {plural} sélectionné{displayCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Séparateur */}
      <div style={{
        width: 1,
        height: 24,
        background: "rgba(255,255,255,.15)",
      }} />

      {/* Actions */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
        {actions.map((a) => {
          const isDanger = a.variant === "danger";
          return (
            <button
              key={a.id || a.label}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              title={a.tooltip || a.label}
              style={{
                background: "transparent",
                border: "none",
                color: isDanger ? "#f5b6b0" : "#fff",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 600,
                padding: "8px 12px",
                borderRadius: 99,
                cursor: a.disabled ? "not-allowed" : "pointer",
                opacity: a.disabled ? 0.4 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 200ms",
              }}
              onMouseEnter={(e) => {
                if (!a.disabled) {
                  e.currentTarget.style.background = isDanger
                    ? "rgba(201,134,127,.20)"
                    : "rgba(255,255,255,.10)";
                  e.currentTarget.style.color = isDanger ? "#ffd5d0" : "#fff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDanger ? "#f5b6b0" : "#fff";
              }}
            >
              {a.icon && <i className={`ti ${a.icon}`} style={{ fontSize: 15 }} />}
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Séparateur + close */}
      <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.15)" }} />
      <button
        type="button"
        onClick={onClear}
        aria-label="Désélectionner tout"
        title="Désélectionner tout"
        style={{
          background: "rgba(255,255,255,.10)",
          border: "1px solid rgba(255,255,255,.10)",
          color: "#fff",
          width: 32, height: 32,
          borderRadius: 99,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          marginLeft: 2,
          transition: "all 200ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,.20)";
          e.currentTarget.style.transform = "rotate(90deg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,.10)";
          e.currentTarget.style.transform = "rotate(0)";
        }}
      >
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  );
}
