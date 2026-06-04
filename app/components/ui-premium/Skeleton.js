"use client";
// =============================================================
//  Skeleton — Loader animé shimmer (0.58.0)
//
//  Remplace les "Chargement..." par des placeholders animés
//  pour une UX premium pendant les fetch.
//
//  Variantes :
//    <Skeleton w="100%" h={20} />            // ligne texte
//    <Skeleton variant="circle" size={40} /> // avatar / icon
//    <Skeleton variant="card" />              // card complète
//    <SkeletonText lines={3} />               // bloc de texte multi-ligne
// =============================================================

export default function Skeleton({
  w = "100%",
  h = 16,
  radius = "6px",
  variant = "default",
  size,
  style = {},
}) {
  let finalStyle = {
    width: w,
    height: h,
    borderRadius: radius,
    // 0.58.17 : shimmer plus visible avec teint teal pour effet hitech
    background: "linear-gradient(90deg, var(--av-g100) 0%, var(--av-g200) 30%, rgba(124,200,200,.18) 50%, var(--av-g200) 70%, var(--av-g100) 100%)",
    backgroundSize: "1000px 100%",
    animation: "av-shimmer 1.8s ease-in-out infinite",
    display: "inline-block",
    ...style,
  };

  if (variant === "circle") {
    finalStyle = {
      ...finalStyle,
      width: size || 40,
      height: size || 40,
      borderRadius: "50%",
    };
  }

  if (variant === "card") {
    return (
      <div style={{
        background: "var(--av-g0)",
        border: "1px solid var(--av-g200)",
        borderRadius: "var(--av-r-lg)",
        padding: 20,
        minHeight: 130,
        ...style,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Skeleton variant="circle" size={42} />
          <div style={{ flex: 1 }}>
            <Skeleton w="60%" h={14} />
          </div>
        </div>
        <Skeleton w="40%" h={28} style={{ marginBottom: 8 }} />
        <Skeleton w="80%" h={12} />
      </div>
    );
  }

  return <div style={finalStyle} />;
}

export function SkeletonText({ lines = 3, lastLineWidth = "60%" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          w={i === lines - 1 ? lastLineWidth : "100%"}
          h={14}
        />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 4 }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} w={`${100 / cols}%`} h={14} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, cols = 4 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${100 / cols}%, 1fr))`,
      gap: 16,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}

// =============================================================
//  0.58.11 : nouveaux variants Skeleton
// =============================================================

/**
 * SkeletonCard — Card autonome avec icon + titre + valeur + sparkline
 * (mimique d'un KpiCard ou d'une card métrique)
 */
export function SkeletonCard({ height = 130, showSparkline = false }) {
  return (
    <div style={{
      background: "var(--av-g0)",
      border: "1px solid var(--av-g200)",
      borderRadius: "var(--av-r-lg)",
      padding: 18,
      minHeight: height,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Skeleton variant="circle" size={32} />
        <Skeleton w="55%" h={11} />
      </div>
      {/* Valeur principale */}
      <Skeleton w="45%" h={28} />
      {/* Détail */}
      <Skeleton w="70%" h={11} />
      {/* Sparkline éventuel */}
      {showSparkline && (
        <Skeleton w="100%" h={32} style={{ marginTop: "auto" }} />
      )}
    </div>
  );
}

/**
 * SkeletonAvatar — Avatar circulaire + nom + sous-titre optionnel
 * Idéal pour les listes d'utilisateurs / contacts.
 */
export function SkeletonAvatar({ size = 32, showName = true, showSub = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Skeleton variant="circle" size={size} />
      {showName && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <Skeleton w="55%" h={12} />
          {showSub && <Skeleton w="35%" h={10} />}
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonKpi — Rangée de N cards KPI alignées (mimique de KpiRow)
 */
export function SkeletonKpi({ count = 4 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${count}, 1fr)`,
      gap: 12,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={100} />
      ))}
    </div>
  );
}
