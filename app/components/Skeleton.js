"use client";
// =============================================================
//  Skeleton — Loaders animés réutilisables (0.61.2)
//  Meilleur UX qu'un simple "Chargement..."
// =============================================================

const ANIM = `@keyframes skeletonPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.9; } }`;

export function Skeleton({ width = "100%", height = 14, radius = 6, style = {} }) {
  return (
    <>
      <style>{ANIM}</style>
      <div style={{
        width, height, borderRadius: radius,
        background: "linear-gradient(90deg, #e3e9ee 0%, #f0f3f6 50%, #e3e9ee 100%)",
        backgroundSize: "200% 100%",
        animation: "skeletonPulse 1.5s ease-in-out infinite",
        ...style,
      }} />
    </>
  );
}

export function SkeletonCard({ count = 3 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,320px))", gap: 12, justifyContent: "start" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: "#fff", border: "1px solid #e3e9ee", borderLeft: "4px solid #e3e9ee",
          borderRadius: 10, padding: 14,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <Skeleton width={40} height={40} radius={20} />
            <div style={{ flex: 1 }}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="40%" height={11} style={{ marginTop: 4 }} />
            </div>
          </div>
          <Skeleton width="100%" height={10} />
          <Skeleton width="80%" height={10} style={{ marginTop: 4 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 8, padding: 8, background: "#fafbfc", borderRadius: 6 }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} width="60%" height={11} />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, padding: 10, borderTop: "1px solid #f0f3f6" }}>
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} width={c === 0 ? "80%" : "50%"} height={12} />)}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat({ count = 4 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, justifyContent: "start" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #e3e9ee", borderLeft: "4px solid #e3e9ee", borderRadius: 10, padding: 14 }}>
          <Skeleton width={28} height={28} radius={8} />
          <Skeleton width="60%" height={22} style={{ marginTop: 8 }} />
          <Skeleton width="40%" height={10} style={{ marginTop: 4 }} />
        </div>
      ))}
    </div>
  );
}
