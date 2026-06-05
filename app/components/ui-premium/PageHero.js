"use client";
// =============================================================
//  PageHero — Header de page premium réutilisable (0.58.3)
//
//  Remplace les vieux PageHead minimalistes par un hero moderne
//  avec gradient mesh, icon halo, breadcrumb, actions à droite.
//
//  Usage :
//    <PageHero
//      icon="ti-chart-pie"
//      title="Statistiques"
//      subtitle="Vue d'ensemble de l'activité de la collectivité"
//      breadcrumbs={[
//        { label: "Accueil", href: "/accueil" },
//        { label: "Statistiques" }
//      ]}
//      variant="teal"
//      stats={[
//        { label: "Interventions", value: 124 },
//        { label: "Patients", value: 87 },
//      ]}
//      actions={
//        <>
//          <button>Exporter</button>
//          <button>Filtres</button>
//        </>
//      }
//    />
// =============================================================

import Link from "next/link";
// 0.58.22 : particules optionnelles dans le PageHero
import ParticlesBackground from "./ParticlesBackground";

const VARIANTS = {
  teal:   { grad: "linear-gradient(135deg,#142131 0%,#2a5a5a 70%,#7CC8C8 130%)", accent: "#7CC8C8", particleColor: "rgba(124, 200, 200, 0.55)" },
  blue:   { grad: "linear-gradient(135deg,#142131 0%,#185FA5 100%)", accent: "#7CC8C8", particleColor: "rgba(124, 200, 200, 0.55)" },
  terra:  { grad: "linear-gradient(135deg,#142131 0%,#73424d 60%,#C9867F 110%)", accent: "#C9867F", particleColor: "rgba(201, 134, 127, 0.55)" },
  navy:   { grad: "linear-gradient(135deg,#0d1822 0%,#1d2d42 50%,#243044 100%)", accent: "#7CC8C8", particleColor: "rgba(124, 200, 200, 0.55)" },
  violet: { grad: "linear-gradient(135deg,#142131 0%,#3d2f5e 50%,#7a6fb0 120%)", accent: "#bfb5dd", particleColor: "rgba(122, 111, 176, 0.65)" },
  amber:  { grad: "linear-gradient(135deg,#142131 0%,#4d3818 70%,#EF9F27 130%)", accent: "#ffd479", particleColor: "rgba(239, 159, 39, 0.55)" },
};

export default function PageHero({
  icon,
  title,
  subtitle,
  variant = "teal",
  breadcrumbs,
  stats,
  actions,
  eyebrow,
  compact = false,
  // 0.58.22 : particules canvas optionnelles en background du hero
  particles = false,
  particlesCount = 20,
}) {
  const cfg = VARIANTS[variant] || VARIANTS.teal;

  return (
    <header style={{
      position: "relative",
      background: cfg.grad,
      borderRadius: "var(--av-r-2xl)",
      padding: compact ? "20px 24px" : "26px 28px",
      marginBottom: 24,
      overflow: "hidden",
      boxShadow: "var(--av-shadow-lg)",
      animation: "av-fade-in 0.4s var(--av-ease-out)",
      // 0.58.17 : isolation pour stacking context propre
      isolation: "isolate",
    }}>
      {/* 0.58.17 : Grid SVG cyber subtil en background */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "var(--av-grid-svg-strong)",
        backgroundSize: "40px 40px",
        opacity: 0.45,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* 0.58.22 : Particules canvas optionnelles (couleur dépend du variant) */}
      {particles && (
        <div style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.7,
        }}>
          <ParticlesBackground
            count={particlesCount}
            speed={0.2}
            linkDistance={120}
            color={cfg.particleColor}
            lineColor={cfg.particleColor.replace(/[\d.]+\)$/, "0.15)")}
            showOnMobile={false}
          />
        </div>
      )}

      {/* Mesh decorative animé (background-position shift) */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "var(--av-mesh-aurora), var(--av-mesh-navy)",
        backgroundSize: "200% 200%, 100% 100%",
        opacity: 0.65,
        pointerEvents: "none",
        animation: "av-bg-pos-shift 18s ease-in-out infinite",
        zIndex: 0,
      }} />

      {/* 0.58.17 : Aurora blobs animées qui flottent */}
      <div className="av-aurora-blob" style={{
        top: -80, right: -80,
        width: 240, height: 240,
        background: `radial-gradient(circle, ${cfg.accent}88 0%, transparent 65%)`,
        animationDelay: "0s",
        zIndex: 0,
      }} />
      <div className="av-aurora-blob" style={{
        bottom: -100, left: "20%",
        width: 200, height: 200,
        background: `radial-gradient(circle, ${cfg.accent}55 0%, transparent 70%)`,
        animationDelay: "-6s",
        zIndex: 0,
      }} />

      {/* Decorative shape statique (compat) */}
      <div style={{
        position: "absolute",
        top: -60, right: -60,
        width: 180, height: 180,
        background: `radial-gradient(circle, ${cfg.accent}55 0%, transparent 70%)`,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Fil d'Ariane" style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.65)",
            marginBottom: 10,
          }}>
            {breadcrumbs.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <i className="ti ti-chevron-right" style={{ fontSize: 12, opacity: 0.5 }} />}
                {b.href ? (
                  <Link
                    href={b.href}
                    style={{
                      color: "rgba(255,255,255,0.75)",
                      textDecoration: "none",
                      transition: "color 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = cfg.accent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span style={{ color: "#fff", fontWeight: 500 }}>{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Layout : icon + texte | actions */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 300px" }}>
            {icon && (
              <div style={{
                position: "relative",
                width: compact ? 44 : 56,
                height: compact ? 44 : 56,
                flexShrink: 0,
              }}>
                {/* 0.58.17 : Halo glow multi-layer (effet neon hitech) */}
                <div style={{
                  position: "absolute",
                  inset: -8,
                  background: cfg.accent,
                  borderRadius: "var(--av-r-md)",
                  opacity: 0.30,
                  filter: "blur(16px)",
                  animation: "av-glow-pulse 4s ease-in-out infinite",
                }} />
                <div style={{
                  position: "absolute",
                  inset: -2,
                  background: cfg.accent,
                  borderRadius: "var(--av-r-md)",
                  opacity: 0.55,
                  filter: "blur(4px)",
                }} />
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(135deg, ${cfg.accent}, rgba(255,255,255,0.18))`,
                  borderRadius: "var(--av-r-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1.5px solid ${cfg.accent}aa`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.30), 0 0 0 1px ${cfg.accent}40`,
                }}>
                  <i className={`ti ${icon}`} style={{
                    color: "#fff",
                    fontSize: compact ? 22 : 28,
                    textShadow: `0 0 12px ${cfg.accent}, 0 0 24px ${cfg.accent}66`,
                  }} />
                </div>
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              {eyebrow && (
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "2px",
                  color: cfg.accent,
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}>
                  {eyebrow}
                </div>
              )}
              <h1 style={{
                fontSize: compact ? 20 : 26,
                fontWeight: 700,
                color: "#fff",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}>
                {title}
              </h1>
              {subtitle && (
                <p style={{
                  fontSize: 13.5,
                  color: "rgba(255,255,255,0.75)",
                  margin: "5px 0 0",
                  lineHeight: 1.4,
                }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions à droite */}
          {actions && (
            <div style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}>
              {actions}
            </div>
          )}
        </div>

        {/* Stats inline */}
        {stats && stats.length > 0 && (
          <div style={{
            display: "flex",
            gap: 28,
            marginTop: compact ? 14 : 20,
            paddingTop: compact ? 14 : 18,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            flexWrap: "wrap",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  fontWeight: 600,
                }}>
                  {s.label}
                </span>
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {s.value}
                  {s.suffix && <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginLeft: 3, fontWeight: 500 }}>{s.suffix}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
