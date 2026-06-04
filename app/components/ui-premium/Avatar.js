"use client";
// =============================================================
//  Avatar — Composant avatar avec dégradé personnalisé (0.58.4)
//
//  Génère un avatar circulaire avec :
//   - Initiales si pas d'image
//   - Dégradé déterministe basé sur le nom (couleurs cohérentes)
//   - Badge de statut optionnel (online/offline/busy)
//   - Halo glow optionnel
//
//  Usage :
//    <Avatar name="Cédric Mignot" size={36} />
//    <Avatar name="Cédric Mignot" size={48} status="online" />
//    <Avatar src="/photo.jpg" name="Fallback" size={40} ring />
// =============================================================

// Palette de gradients déterministes
const GRADIENTS = [
  "linear-gradient(135deg, #7CC8C8 0%, #2a5a5a 100%)",   // teal
  "linear-gradient(135deg, #185FA5 0%, #4a8dd4 100%)",   // blue
  "linear-gradient(135deg, #C9867F 0%, #b06d65 100%)",   // terra
  "linear-gradient(135deg, #EF9F27 0%, #C9867F 100%)",   // amber
  "linear-gradient(135deg, #7a6fb0 0%, #5db5b5 100%)",   // violet
  "linear-gradient(135deg, #5aa05a 0%, #7CC8C8 100%)",   // green
  "linear-gradient(135deg, #c0392b 0%, #C9867F 100%)",   // red
  "linear-gradient(135deg, #142131 0%, #2a5a5a 100%)",   // navy
];

const STATUS_COLORS = {
  online:  "#5aa05a",
  busy:    "#EF9F27",
  away:    "#C9867F",
  offline: "#8a98a8",
};

/**
 * Hash simple pour distribuer un nom sur la palette.
 */
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < (str?.length || 0); i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Extrait les initiales (max 2 lettres).
 */
function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export default function Avatar({
  name,
  src,
  size = 36,
  status,         // online | busy | away | offline
  ring = false,   // halo glow
  shape = "circle", // circle | rounded
  onClick,
}) {
  const initials = getInitials(name);
  const gradient = GRADIENTS[hashCode(name || "") % GRADIENTS.length];
  const borderRadius = shape === "rounded" ? `${size * 0.25}px` : "50%";
  const fontSize = Math.max(11, size * 0.4);

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* Halo glow (ring) */}
      {ring && (
        <div style={{
          position: "absolute",
          inset: -3,
          borderRadius,
          background: gradient,
          opacity: 0.3,
          filter: "blur(6px)",
          pointerEvents: "none",
        }} />
      )}

      {/* Avatar principal */}
      <div style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius,
        background: src ? undefined : gradient,
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.5px",
        textShadow: src ? "none" : "0 1px 2px rgba(0,0,0,0.2)",
        border: ring ? `2px solid rgba(255,255,255,0.9)` : "none",
        boxShadow: ring
          ? "0 4px 12px rgba(20,33,49,0.15)"
          : "0 1px 2px rgba(20,33,49,0.10), inset 0 -2px 4px rgba(0,0,0,0.10)",
        transition: "transform 200ms var(--av-ease-out)",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.transform = "scale(1)";
      }}
      >
        {!src && initials}
      </div>

      {/* Badge statut */}
      {status && STATUS_COLORS[status] && (
        <div style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: Math.max(8, size * 0.28),
          height: Math.max(8, size * 0.28),
          background: STATUS_COLORS[status],
          borderRadius: "50%",
          border: `2px solid var(--av-g0, #fff)`,
          boxShadow: `0 0 0 1px ${STATUS_COLORS[status]}50`,
        }} />
      )}
    </div>
  );
}

/**
 * AvatarGroup — Empile plusieurs avatars (max N visibles + count).
 *
 * <AvatarGroup users={[{name:"A"},{name:"B"},{name:"C"}]} max={3} size={32} />
 */
export function AvatarGroup({ users = [], max = 3, size = 32, ring = false }) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const overlap = size * 0.32;

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {visible.map((u, i) => (
        <div
          key={i}
          style={{
            marginLeft: i > 0 ? -overlap : 0,
            border: "2px solid var(--av-g0, #fff)",
            borderRadius: "50%",
            background: "var(--av-g0, #fff)",
            zIndex: max - i,
          }}
        >
          <Avatar name={u.name} src={u.src} size={size} ring={ring} />
        </div>
      ))}
      {overflow > 0 && (
        <div style={{
          marginLeft: -overlap,
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--av-g200, #e3e9ee)",
          color: "var(--av-g700, #4a5868)",
          border: "2px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(11, size * 0.36),
          fontWeight: 700,
          zIndex: 0,
        }}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
