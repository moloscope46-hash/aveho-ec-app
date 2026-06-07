"use client";
// =============================================================
//  components/PremiumKpi.js — KpiCard premium réutilisable (0.62.45)
//  Avec count-up animation, hover effects, gradient, trend
// =============================================================
import { useEffect, useState, useRef } from "react";

// ===== Hook : compteur animé (count-up) =====
export function useCountUp(target, duration = 800) {
  const [current, setCurrent] = useState(0);
  const startRef = useRef(null);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
    startRef.current = null;
    let raf;
    const start = current;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Easing ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (target - start) * eased;
      setCurrent(value);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setCurrent(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return Math.round(current);
}

// ===== KpiCard : carte stat premium =====
export function KpiCard({
  icon = "ti-chart-bar",
  label,
  value,
  unit,
  color = "#185FA5",
  colorDark,
  trend,                     // {value: 12.5, direction: 'up'|'down'|'neutral', label: 'vs 7j'}
  onClick,
  format = "number",         // 'number' | 'currency' | 'percent'
  loading = false,
  description,
  size = "md",               // 'sm' | 'md' | 'lg'
}) {
  const numericValue = Number(value) || 0;
  const animated = useCountUp(numericValue, 700);

  function fmt(v) {
    if (format === "currency") return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
    if (format === "percent") return v.toFixed(1) + " %";
    return new Intl.NumberFormat("fr-FR").format(v);
  }

  const valueSize = size === "lg" ? 38 : size === "sm" ? 22 : 30;
  const iconSize = size === "lg" ? 52 : size === "sm" ? 36 : 44;

  const trendColor = trend?.direction === "up" ? "#5aa05a" : trend?.direction === "down" ? "#e35d5b" : "#8a98a8";

  return (
    <div
      className="av-kpi-card av-fade-in"
      data-clickable={!!onClick}
      onClick={onClick}
      style={{
        "--av-kpi-color": color,
        "--av-kpi-color-dark": colorDark || color,
        "--av-kpi-shadow": `${color}30`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div className="av-kpi-icon-box" style={{ width: iconSize, height: iconSize, fontSize: iconSize * 0.5 }}>
          <i className={`ti ${icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div className="av-skel" style={{ height: valueSize, width: 80, marginBottom: 4 }} />
          ) : (
            <div className="av-kpi-value" style={{ fontSize: valueSize }}>
              {fmt(animated)}
              {unit && <span style={{ fontSize: valueSize * 0.55, marginLeft: 4, fontWeight: 600, color: "#8a98a8" }}>{unit}</span>}
            </div>
          )}
          <div className="av-kpi-label">{label}</div>
          {description && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 4 }}>{description}</div>}
        </div>
        {trend && (
          <div className={`av-kpi-trend ${trend.direction || "neutral"}`} title={trend.label || ""}>
            <i className={`ti ti-arrow-${trend.direction === "up" ? "up-right" : trend.direction === "down" ? "down-right" : "right"}`} />
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Grid responsive pour KpiCards =====
export function KpiGrid({ children, minWidth = 220, gap = 14 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      gap,
    }}>
      {children}
    </div>
  );
}

// ===== Skeleton premium réutilisable =====
export function Skeleton({ width = "100%", height = 16, radius = 6, style }) {
  return <div className="av-skel" style={{ width, height, borderRadius: radius, ...style }} />;
}

// ===== Empty state premium =====
export function EmptyState({ icon = "ti-inbox", title = "Aucune donnée", desc, action }) {
  return (
    <div className="av-empty">
      <i className={`ti ${icon} icon`} />
      <div className="title">{title}</div>
      {desc && <div className="desc">{desc}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

// ===== Floating card (effet lévitation) =====
export function FloatingCard({ children, color, onClick, style }) {
  return (
    <div
      className="av-card-float av-fade-in"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        padding: 18,
        borderLeft: color ? `4px solid ${color}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ===== Section header premium =====
export function SectionHead({ icon, title, subtitle, actions }) {
  return (
    <div className="av-section-head">
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "linear-gradient(135deg, #185FA5, #0d4a8c)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          boxShadow: "0 4px 8px rgba(24,95,165,.25)",
        }}>
          <i className={`ti ${icon}`} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>{title}</h3>
        {subtitle && <div style={{ fontSize: 12, color: "#5a6878", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

// ===== Pill premium =====
export function Pill({ children, color = "#185FA5", icon, dot }) {
  return (
    <span className="av-pill" style={{ background: `${color}1A`, color }}>
      {dot && <span style={{ width: 6, height: 6, background: color, borderRadius: "50%" }} />}
      {icon && <i className={`ti ${icon}`} />}
      {children}
    </span>
  );
}
