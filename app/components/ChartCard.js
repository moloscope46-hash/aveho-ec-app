"use client";
// =============================================================
//  components/ChartCard.js (0.62.78)
//
//  Composants graphiques premium :
//   - BarChartPremium : barres horizontales animées
//   - DonutChartPremium : donut chart SVG animé
//   - StatCardPremium : KPI premium avec icône gradient + tendance
// =============================================================

export function ChartCard({ title, subtitle, icon, accent = "#185FA5", children, action }) {
  return (
    <div className="av-chart-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
              boxShadow: `0 4px 10px ${accent}40`,
            }}>
              <i className={`ti ${icon}`} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function BarChartPremium({ data, format = (v) => v }) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = d.color || "#185FA5";
        const colorEnd = d.colorEnd || color + "cc";
        return (
          <div key={d.label + i} className="av-bar-chart-row">
            <div className="av-bar-chart-label">
              {d.icon && <i className={`ti ${d.icon}`} style={{ color, marginRight: 4 }} />}
              {d.label}
            </div>
            <div className="av-bar-chart-track">
              <div className="av-bar-chart-fill" style={{
                width: `${pct}%`,
                "--bar-color": color,
                "--bar-color-end": colorEnd,
              }} />
            </div>
            <div className="av-bar-chart-value">{format(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChartPremium({ value, max = 100, label, color = "#185FA5", icon }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <div className="av-donut-chart">
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} stroke="#f4f7fa" />
        <circle cx="70" cy="70" r={radius} stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }}
        />
      </svg>
      <div className="av-donut-center">
        {icon && <i className={`ti ${icon}`} style={{ color, fontSize: 18, marginBottom: 4 }} />}
        <div className="av-donut-value">{value}{max === 100 ? "%" : ""}</div>
        {label && <div className="av-donut-label">{label}</div>}
      </div>
    </div>
  );
}

export function StatCardPremium({ label, value, icon, color = "#185FA5", trend, trendDir }) {
  // trend = +12%, trendDir = "up" | "down" | "neutral"
  const trendColor = trendDir === "up" ? "#5aa05a" : trendDir === "down" ? "#e35d5b" : "#8a98a8";
  const trendIcon = trendDir === "up" ? "ti-trending-up" : trendDir === "down" ? "ti-trending-down" : "ti-minus";

  return (
    <div className="av-kpi-premium" style={{
      "--av-accent": color,
      padding: "14px 16px",
      borderRadius: 14,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "relative", overflow: "hidden",
    }}>
      <div>
        <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#142131", lineHeight: 1.1, marginTop: 2 }}>{value}</div>
        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 4, fontSize: 11, color: trendColor, fontWeight: 700 }}>
            <i className={`ti ${trendIcon}`} /> {trend}
          </div>
        )}
      </div>
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
          boxShadow: `0 6px 14px ${color}40`,
        }}>
          <i className={`ti ${icon}`} />
        </div>
      )}
    </div>
  );
}

// SparklineMini : mini-graphique pour KPI cards
export function SparklineMini({ data, color = "#185FA5", width = 60, height = 20 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polyline
        fill={`${color}20`}
        stroke="none"
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

export default ChartCard;
