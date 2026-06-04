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
// =============================================================

const VARIANTS = {
  teal:   { color: "var(--av-teal)",   bg: "rgba(124, 200, 200, 0.10)" },
  blue:   { color: "var(--av-blue)",   bg: "rgba(24, 95, 165, 0.08)" },
  terra:  { color: "var(--av-terra)",  bg: "rgba(201, 134, 127, 0.10)" },
  amber:  { color: "var(--av-amber)",  bg: "rgba(239, 159, 39, 0.10)" },
  gray:   { color: "var(--av-g500)",   bg: "var(--av-g100)" },
  success:{ color: "var(--av-green)",  bg: "rgba(90, 160, 90, 0.08)" },
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
}) {
  const cfg = VARIANTS[variant] || VARIANTS.gray;

  return (
    <div style={{
      padding: compact ? "32px 24px" : "48px 32px",
      textAlign: "center",
      animation: "av-fade-in-up 0.5s var(--av-ease-out)",
      background: "var(--av-g0)",
      border: "1px dashed var(--av-g300)",
      borderRadius: "var(--av-r-lg)",
    }}>
      {/* Icon avec halo */}
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
