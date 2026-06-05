"use client";
// =============================================================
//  EmptyState — Composant pour les états vides (0.58.0)
//
//  Remplace les "Aucune donnée" tristes par de beaux états vides
//  avec illustration SVG, message clair et call-to-action.
//
//  Usage :
//    <EmptyState
//      icon="ti-tools"
//      variant="teal"
//      title="Aucune intervention"
//      message="Tu n'as pas encore d'intervention en cours."
//      actionLabel="Créer une intervention"
//      onAction={() => router.push("/interventions/new")}
//    />
//
//  0.58.23 : prop `illustration` qui remplace l'icône simple par une
//  illustration SVG animée. 6 illustrations dispo :
//    inbox · search · folder · clipboard · chart · users
// =============================================================

const VARIANTS = {
  teal:   { color: "var(--av-teal)",   bg: "rgba(124, 200, 200, 0.10)", glow: "rgba(124, 200, 200, 0.30)" },
  blue:   { color: "var(--av-blue)",   bg: "rgba(24, 95, 165, 0.08)",   glow: "rgba(24, 95, 165, 0.25)" },
  terra:  { color: "var(--av-terra)",  bg: "rgba(201, 134, 127, 0.10)", glow: "rgba(201, 134, 127, 0.30)" },
  amber:  { color: "var(--av-amber)",  bg: "rgba(239, 159, 39, 0.10)",  glow: "rgba(239, 159, 39, 0.30)" },
  gray:   { color: "var(--av-g500)",   bg: "var(--av-g100)",            glow: "rgba(108, 122, 137, 0.18)" },
  success:{ color: "var(--av-green)",  bg: "rgba(90, 160, 90, 0.08)",   glow: "rgba(90, 160, 90, 0.30)" },
  violet: { color: "#7a6fb0",          bg: "rgba(122, 111, 176, 0.10)", glow: "rgba(122, 111, 176, 0.30)" },
};

// 0.58.23 : 6 illustrations SVG animées
// Chacune retourne du JSX avec animations CSS
const ILLUSTRATIONS = {
  inbox: (color) => (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <defs>
        <linearGradient id="grad-inbox" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Boîte de fond */}
      <path d="M20 50 L20 90 Q20 100 30 100 L90 100 Q100 100 100 90 L100 50 L75 50 L70 60 L50 60 L45 50 Z"
        fill="url(#grad-inbox)" stroke={color} strokeWidth="2" opacity="0.95" />
      {/* Papiers volants */}
      <rect x="35" y="20" width="22" height="28" rx="2" fill={color} opacity="0.7"
        style={{ animation: "av-float-doc 3s ease-in-out infinite", transformOrigin: "46px 34px" }} />
      <rect x="62" y="15" width="22" height="28" rx="2" fill={color} opacity="0.55"
        style={{ animation: "av-float-doc 3s ease-in-out infinite -1.5s", transformOrigin: "73px 29px" }} />
      <line x1="40" y1="28" x2="52" y2="28" stroke="#fff" strokeWidth="2" opacity="0.8" />
      <line x1="40" y1="34" x2="48" y2="34" stroke="#fff" strokeWidth="2" opacity="0.6" />
      <line x1="67" y1="23" x2="79" y2="23" stroke="#fff" strokeWidth="2" opacity="0.8" />
    </svg>
  ),
  search: (color) => (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <defs>
        <radialGradient id="grad-search">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#grad-search)" />
      <circle cx="50" cy="50" r="22" fill="none" stroke={color} strokeWidth="4" opacity="0.85" />
      <line x1="68" y1="68" x2="92" y2="92" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      {/* Particules autour */}
      <circle cx="38" cy="38" r="2" fill={color} opacity="0.6" style={{ animation: "av-pulse-soft 2s ease-in-out infinite" }} />
      <circle cx="62" cy="42" r="2" fill={color} opacity="0.5" style={{ animation: "av-pulse-soft 2s ease-in-out -0.7s infinite" }} />
      <circle cx="50" cy="62" r="2" fill={color} opacity="0.7" style={{ animation: "av-pulse-soft 2s ease-in-out -1.4s infinite" }} />
    </svg>
  ),
  folder: (color) => (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <defs>
        <linearGradient id="grad-folder" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d="M15 35 L15 88 Q15 95 22 95 L98 95 Q105 95 105 88 L105 45 Q105 38 98 38 L55 38 L48 30 L22 30 Q15 30 15 35 Z"
        fill="url(#grad-folder)" stroke={color} strokeWidth="2" />
      <rect x="15" y="42" width="90" height="2" fill="#fff" opacity="0.3" />
      <circle cx="60" cy="68" r="3" fill="#fff" opacity="0.5" style={{ animation: "av-pulse-soft 2.5s ease-in-out infinite" }} />
      <circle cx="50" cy="68" r="3" fill="#fff" opacity="0.5" style={{ animation: "av-pulse-soft 2.5s ease-in-out -0.8s infinite" }} />
      <circle cx="70" cy="68" r="3" fill="#fff" opacity="0.5" style={{ animation: "av-pulse-soft 2.5s ease-in-out -1.6s infinite" }} />
    </svg>
  ),
  clipboard: (color) => (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <defs>
        <linearGradient id="grad-clip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="30" y="20" width="60" height="85" rx="6" fill="url(#grad-clip)" stroke={color} strokeWidth="2" />
      <rect x="46" y="14" width="28" height="12" rx="3" fill={color} />
      <rect x="50" y="17" width="20" height="6" rx="1" fill="#fff" opacity="0.4" />
      <rect x="40" y="40" width="40" height="3" rx="1.5" fill="#fff" opacity="0.45"
        style={{ animation: "av-skel-pulse 2s ease-in-out infinite" }} />
      <rect x="40" y="48" width="32" height="3" rx="1.5" fill="#fff" opacity="0.35"
        style={{ animation: "av-skel-pulse 2s ease-in-out -0.5s infinite" }} />
      <rect x="40" y="56" width="36" height="3" rx="1.5" fill="#fff" opacity="0.40"
        style={{ animation: "av-skel-pulse 2s ease-in-out -1s infinite" }} />
      <circle cx="44" cy="78" r="3" fill="#fff" opacity="0.6" />
      <line x1="50" y1="78" x2="76" y2="78" stroke="#fff" strokeWidth="2" opacity="0.4" />
      <circle cx="44" cy="90" r="3" fill="#fff" opacity="0.45" />
      <line x1="50" y1="90" x2="70" y2="90" stroke="#fff" strokeWidth="2" opacity="0.3" />
    </svg>
  ),
  chart: (color) => (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <line x1="20" y1="100" x2="100" y2="100" stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1="20" y1="100" x2="20" y2="20" stroke={color} strokeWidth="2" opacity="0.7" />
      <rect x="32" y="60" width="14" height="40" rx="3" fill={color} opacity="0.85"
        style={{ animation: "av-bar-rise 2s ease-out infinite", transformOrigin: "39px 100px" }} />
      <rect x="52" y="40" width="14" height="60" rx="3" fill={color} opacity="0.75"
        style={{ animation: "av-bar-rise 2s ease-out -0.3s infinite", transformOrigin: "59px 100px" }} />
      <rect x="72" y="50" width="14" height="50" rx="3" fill={color} opacity="0.65"
        style={{ animation: "av-bar-rise 2s ease-out -0.6s infinite", transformOrigin: "79px 100px" }} />
      <circle cx="39" cy="55" r="3" fill={color} />
      <circle cx="59" cy="35" r="3" fill={color} />
      <circle cx="79" cy="45" r="3" fill={color} />
      <polyline points="39,55 59,35 79,45" stroke={color} strokeWidth="2.5" fill="none" opacity="0.85" />
    </svg>
  ),
  users: (color) => (
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      {/* Avatar central */}
      <circle cx="60" cy="44" r="14" fill={color} opacity="0.85" />
      <path d="M40 92 Q40 70 60 70 Q80 70 80 92 Z" fill={color} opacity="0.85" />
      {/* Avatars latéraux */}
      <circle cx="32" cy="50" r="10" fill={color} opacity="0.55"
        style={{ animation: "av-float-y 3s ease-in-out infinite", transformOrigin: "32px 50px" }} />
      <path d="M18 88 Q18 72 32 72 Q46 72 46 88 Z" fill={color} opacity="0.55" />
      <circle cx="88" cy="50" r="10" fill={color} opacity="0.55"
        style={{ animation: "av-float-y 3s ease-in-out -1.5s infinite", transformOrigin: "88px 50px" }} />
      <path d="M74 88 Q74 72 88 72 Q102 72 102 88 Z" fill={color} opacity="0.55" />
    </svg>
  ),
};

export default function EmptyState({
  icon = "ti-mood-empty",
  variant = "gray",
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact = false,
  // 0.58.23 : nouvelle prop illustration (SVG animée à la place de l'icône)
  illustration,
}) {
  const cfg = VARIANTS[variant] || VARIANTS.gray;
  // Résolve la couleur du variant pour passer aux SVG
  const colorMap = {
    teal: "#7CC8C8", blue: "#185FA5", terra: "#C9867F",
    amber: "#EF9F27", gray: "#6c7a89", success: "#5aa05a", violet: "#7a6fb0",
  };
  const svgColor = colorMap[variant] || "#6c7a89";
  const IllustrationFn = illustration ? ILLUSTRATIONS[illustration] : null;

  return (
    <div style={{
      padding: compact ? "32px 24px" : "48px 32px",
      textAlign: "center",
      animation: "av-fade-in-up 0.5s var(--av-ease-out)",
      background: "var(--av-g0)",
      border: "1px dashed var(--av-g300)",
      borderRadius: "var(--av-r-lg)",
    }}>
      {/* 0.58.23 : si prop illustration, on affiche la SVG animée à la place de l'icône halo */}
      {IllustrationFn ? (
        <div style={{
          margin: "0 auto 20px",
          width: compact ? 90 : 120,
          height: compact ? 90 : 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: `drop-shadow(0 6px 20px ${cfg.glow})`,
        }}>
          {IllustrationFn(svgColor)}
        </div>
      ) : (
        /* Icon avec halo (compat legacy) */
        <div style={{
          position: "relative",
          width: compact ? 64 : 80,
          height: compact ? 64 : 80,
          margin: "0 auto 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {/* Halo pulse */}
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: cfg.bg,
            animation: "av-pulse-soft 3s ease-in-out infinite",
          }} />
          <div style={{
            position: "relative",
            width: compact ? 48 : 60,
            height: compact ? 48 : 60,
            borderRadius: "50%",
            background: cfg.bg,
            border: `2px dashed ${cfg.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <i className={`ti ${icon}`} style={{
              fontSize: compact ? 24 : 30,
              color: cfg.color,
            }} />
          </div>
        </div>
      )}

      {title && (
        <h3 style={{
          fontSize: compact ? 15 : 17,
          fontWeight: 700,
          color: "var(--av-navy)",
          margin: "0 0 6px",
        }}>
          {title}
        </h3>
      )}

      {message && (
        <p style={{
          fontSize: compact ? 12.5 : 13.5,
          color: "var(--av-g600)",
          margin: "0 auto 18px",
          maxWidth: 360,
          lineHeight: 1.5,
        }}>
          {message}
        </p>
      )}

      {(actionLabel || secondaryLabel) && (
        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {actionLabel && (
            <button
              onClick={onAction}
              style={{
                padding: compact ? "8px 16px" : "10px 20px",
                background: cfg.color,
                color: "#fff",
                border: "none",
                borderRadius: "var(--av-r-md)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "transform 150ms var(--av-ease-out), box-shadow 150ms",
                boxShadow: `0 4px 12px ${cfg.bg}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = `0 6px 16px ${cfg.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 4px 12px ${cfg.bg}`;
              }}
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              onClick={onSecondary}
              style={{
                padding: compact ? "8px 16px" : "10px 20px",
                background: "transparent",
                color: "var(--av-g700)",
                border: "1px solid var(--av-g300)",
                borderRadius: "var(--av-r-md)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--av-g100)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
