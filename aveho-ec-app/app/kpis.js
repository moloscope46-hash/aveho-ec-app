"use client";
// Rangée de KPIs réutilisable sur toutes les pages (anti-doublon).
// tiles: [{ label, value, icon, color }]
export function KpiRow({ tiles }) {
  if (!tiles || !tiles.length) return null;
  return (
    <div className="kpi-grid" style={{ marginTop: 8, marginBottom: 18 }}>
      {tiles.map((t) => (
        <div className="kpi-tile" key={t.label} style={{ cursor: t.onClick ? "pointer" : "default" }} onClick={t.onClick}>
          <span className="kpi-ic" style={{ background: (t.color || "#7CC8C8") + "22", color: t.color || "#7CC8C8" }}><i className={`ti ${t.icon}`} /></span>
          <span className="kpi-val">{t.value}</span>
          <span className="kpi-lbl">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
