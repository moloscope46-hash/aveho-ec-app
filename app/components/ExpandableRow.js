"use client";
// =============================================================
//  ExpandableRow / ExpandableList — Composants réutilisables
//  Pour afficher des listes dépliables, sans scroll horizontal
//  Couleur paramétrable selon la page
//  0.65.63 — Pattern : utilisé Articles, Patients, Matériels, etc.
// =============================================================
import { useState } from "react";

/**
 * ExpandableRow : une ligne dépliable
 * 
 * Props :
 *  - color: couleur d'accent de la page (#185FA5 pour articles, #7a6fb0 pour patients...)
 *  - icon: icône principale Tabler (ti-package, ti-user...)
 *  - title: titre principal (gros)
 *  - subtitle: sous-titre (petit)
 *  - badges: array d'objets {label, color, icon} pour pills à droite
 *  - kpis: array d'objets {label, value, color} pour mini KPIs sur la ligne
 *  - actions: <ReactNode> pour les boutons d'action (modifier/supprimer)
 *  - children: contenu dépliable (détails)
 *  - defaultOpen: ouvert par défaut
 *  - onClick: si fourni, click sur la ligne (au lieu de toggle)
 */
export function ExpandableRow({
  color = "#185FA5",
  icon = "ti-circle",
  title,
  subtitle,
  badges = [],
  kpis = [],
  actions,
  children,
  defaultOpen = false,
  onClick,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = !!children;

  function handleHeaderClick(e) {
    // Si action sur un bouton/select, ne pas toggler
    if (e.target.closest("button, a, select, input")) return;
    if (onClick) onClick(); else if (hasContent) setOpen(!open);
  }

  return (
    <div style={{
      background: open ? `linear-gradient(180deg, ${color}10, ${color}05)` : "rgba(255,255,255,.03)",
      border: `1px solid ${open ? color + "40" : "rgba(255,255,255,.08)"}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "all 200ms ease",
      fontFamily: "Quicksand, sans-serif",
    }}>
      {/* HEADER cliquable */}
      <div onClick={handleHeaderClick} style={{
        padding: "12px 14px",
        cursor: hasContent || onClick ? "pointer" : "default",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 12,
        alignItems: "center",
      }}>
        {/* Chevron / icone */}
        {hasContent && !onClick ? (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}25`, color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
            transform: open ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 200ms",
            flexShrink: 0,
          }}>
            <i className="ti ti-chevron-right" />
          </div>
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: `0 2px 6px ${color}40`,
            flexShrink: 0,
          }}>
            <i className={`ti ${icon}`} />
          </div>
        )}

        {/* Title + subtitle */}
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </div>
          )}
          {/* KPIs en ligne sous le titre */}
          {kpis.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
              {kpis.map((k, i) => (
                <span key={i} style={{ fontSize: 11, color: "rgba(255,255,255,.6)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <span style={{ color: k.color || color, fontWeight: 700 }}>{k.value}</span>
                  <span style={{ color: "rgba(255,255,255,.4)" }}>{k.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Badges à droite */}
        {badges.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 220 }}>
            {badges.map((b, i) => (
              <span key={i} style={{
                background: `${b.color || color}25`,
                color: b.color || color,
                border: `1px solid ${b.color || color}50`,
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                display: "inline-flex", alignItems: "center", gap: 3,
                whiteSpace: "nowrap",
              }}>
                {b.icon && <i className={`ti ${b.icon}`} />}
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions && <div style={{ display: "flex", gap: 4 }}>{actions}</div>}
      </div>

      {/* CONTENT déplié */}
      {open && hasContent && (
        <div style={{
          padding: "0 14px 14px 14px",
          borderTop: `1px solid ${color}25`,
          paddingTop: 14,
          marginTop: 0,
          animation: "av-expand 200ms ease",
        }}>
          {children}
        </div>
      )}

      <style jsx global>{`
        @keyframes av-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * ExpandableList : container pour plusieurs ExpandableRow
 * gère le gap entre les items
 */
export function ExpandableList({ children, gap = 8, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {children}
    </div>
  );
}

/**
 * DetailGrid : utilitaire pour afficher les détails dans le déplié
 * Grid responsive 2/3 cols avec label/value
 */
export function DetailGrid({ items, columns = 3, color = "#185FA5" }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
      gap: 10,
    }}>
      {items.filter(i => i).map((i, idx) => (
        <div key={idx} style={{
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 8,
          padding: "8px 10px",
        }}>
          <div style={{ color: "rgba(255,255,255,.45)", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
            {i.icon && <i className={`ti ${i.icon}`} style={{ color: i.color || color }} />}
            {i.label}
          </div>
          <div style={{ color: i.value ? "#fff" : "rgba(255,255,255,.3)", fontSize: 12, fontWeight: 600 }}>
            {i.value || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DetailAction : bouton dans le déplié
 */
export function DetailAction({ icon, label, color = "#185FA5", onClick, variant = "default" }) {
  const styles = {
    default: { background: `${color}20`, color, border: `1px solid ${color}40` },
    primary: { background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", border: "none" },
    danger:  { background: "rgba(212,94,94,.15)", color: "#D45E5E", border: "1px solid rgba(212,94,94,.30)" },
  };
  return (
    <button onClick={onClick} style={{
      ...styles[variant],
      padding: "6px 12px",
      borderRadius: 8,
      fontSize: 12, fontWeight: 700,
      fontFamily: "Quicksand", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      {icon && <i className={`ti ${icon}`} />}
      {label}
    </button>
  );
}
