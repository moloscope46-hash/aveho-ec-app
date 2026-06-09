"use client";
// =============================================================
//  ExpandableRow — Ligne dépliable réutilisable (0.65.78)
//  ★ AUTO-ADAPTATIF dark/light theme via prop `theme` ou détection
// =============================================================
import { useState } from "react";

export default function ExpandableRow({
  color = "#185FA5",
  icon = "ti-package",
  title,
  subtitle,
  badges = [],
  kpis = [],
  actions,
  theme = "light",  // NEW: "light" (default) ou "dark"
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isDark = theme === "dark";
  
  // Couleurs adaptatives selon thème
  const colors = isDark ? {
    bgClosed: "rgba(255,255,255,.03)",
    bgOpen: `linear-gradient(180deg, ${color}10, ${color}05)`,
    border: open ? color + "40" : "rgba(255,255,255,.08)",
    textPrimary: "#fff",
    textSecondary: "rgba(255,255,255,.55)",
    textTertiary: "rgba(255,255,255,.4)",
    iconBgLight: `${color}25`,
    detailBorder: "rgba(255,255,255,.06)",
    detailBg: "rgba(255,255,255,.04)",
  } : {
    bgClosed: "#ffffff",
    bgOpen: `linear-gradient(180deg, ${color}08, #ffffff)`,
    border: open ? color + "60" : "#e1e6eb",
    textPrimary: "#142131",
    textSecondary: "#5a6878",
    textTertiary: "#8a96a4",
    iconBgLight: `${color}15`,
    detailBorder: "#e8edf2",
    detailBg: "#fafbfc",
  };

  return (
    <div style={{
      background: open ? colors.bgOpen : colors.bgClosed,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
      transition: "all 200ms",
      fontFamily: "Quicksand, sans-serif",
    }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{
          width: 28, height: 28, borderRadius: 8,
          background: colors.iconBgLight, color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, cursor: "pointer", flexShrink: 0,
          transition: "transform 200ms",
          transform: open ? "rotate(90deg)" : "rotate(0)",
        }}>
          <i className="ti ti-chevron-right" />
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, boxShadow: `0 2px 6px ${color}40`,
          flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: colors.textPrimary, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </div>
          )}
          {kpis.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
              {kpis.filter(k => k).map((k, i) => (
                <span key={i} style={{ fontSize: 11, color: colors.textSecondary, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <span style={{ color: k.color || color, fontWeight: 700 }}>{k.value}</span>
                  <span style={{ color: colors.textTertiary }}>{k.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {badges.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "40%" }}>
            {badges.filter(b => b).map((b, i) => (
              <span key={i} style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: `${b.color || color}25`,
                color: b.color || color,
                border: `1px solid ${b.color || color}50`,
                whiteSpace: "nowrap",
              }}>
                {b.icon && <i className={`ti ${b.icon}`} />} {b.label}
              </span>
            ))}
          </div>
        )}
        {actions && <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
      {open && children && (
        <div style={{
          padding: "14px 16px",
          borderTop: `1px solid ${color}25`,
          background: colors.detailBg,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * DetailGrid — adapté dark/light
 */
export function DetailGrid({ items, columns = 3, color = "#185FA5", theme = "light" }) {
  const isDark = theme === "dark";
  const colors = isDark ? {
    cardBg: "rgba(255,255,255,.04)", cardBorder: "rgba(255,255,255,.06)",
    label: "rgba(255,255,255,.45)", value: "#fff", valueEmpty: "rgba(255,255,255,.3)",
  } : {
    cardBg: "#ffffff", cardBorder: "#e8edf2",
    label: "#8a96a4", value: "#142131", valueEmpty: "#bcc5d0",
  };
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
      gap: 10,
    }}>
      {items.filter(i => i).map((i, idx) => (
        <div key={idx} style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 8,
          padding: "8px 10px",
        }}>
          <div style={{ color: colors.label, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
            {i.icon && <i className={`ti ${i.icon}`} style={{ color: i.color || color }} />}
            {i.label}
          </div>
          <div style={{ color: i.value ? colors.value : colors.valueEmpty, fontSize: 12, fontWeight: 600 }}>
            {i.value || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DetailAction — bouton dans le déplié (inchangé)
 */
export function DetailAction({ icon, label, color = "#185FA5", onClick, variant = "default" }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 8,
      background: variant === "primary" ? `linear-gradient(135deg, ${color}, ${color}cc)` : `${color}15`,
      color: variant === "primary" ? "#fff" : color,
      border: variant === "primary" ? "none" : `1px solid ${color}30`,
      cursor: "pointer", fontFamily: "Quicksand", fontWeight: 700, fontSize: 12,
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      {icon && <i className={`ti ${icon}`} />}
      {label}
    </button>
  );
}

/**
 * ExpandableList — wrapper avec gap
 */
export function ExpandableList({ gap = 8, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {children}
    </div>
  );
}
