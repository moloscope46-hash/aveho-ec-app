"use client";
// =============================================================
//  app/components/GalaxyBackground.js (0.58.60)
//
//  Animation décorative de galaxies + planètes + étoiles filantes
//  pour la page d'accueil. S'utilise en complément (PAS en remplacement)
//  de ParticlesBackground.
//
//  Pure CSS keyframes (zéro JS animation frame) pour rester perf.
// =============================================================

import { useMemo } from "react";

export default function GalaxyBackground({ density = "normal", showShootingStars = true }) {
  // Génère un set d'étoiles statiques scintillantes
  const stars = useMemo(() => {
    const n = density === "dense" ? 80 : density === "light" ? 30 : 50;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 0.5 + Math.random() * 1.8,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.7,
    }));
  }, [density]);

  // Galaxies / nébuleuses : 3 grosses taches floues qui se baladent doucement
  const galaxies = useMemo(() => [
    { id: 1, top: 15, left: 20, color: "rgba(122, 111, 176, 0.18)", size: 320, duration: 28 },
    { id: 2, top: 60, left: 75, color: "rgba(124, 200, 200, 0.16)", size: 380, duration: 35 },
    { id: 3, top: 80, left: 25, color: "rgba(239, 159, 39, 0.12)", size: 260, duration: 32 },
  ], []);

  // Planètes : petits cercles avec anneau (style Saturne), 2-3 sur la page
  const planets = useMemo(() => [
    { id: 1, top: 18, left: 82, size: 24, color1: "#7CC8C8", color2: "#185FA5", ringColor: "rgba(124,200,200,.35)", duration: 60, hasRing: true },
    { id: 2, top: 70, left: 15, size: 18, color1: "#EF9F27", color2: "#c97a2a", ringColor: null, duration: 80, hasRing: false },
    { id: 3, top: 35, left: 50, size: 14, color1: "#7a6fb0", color2: "#5a4a90", ringColor: "rgba(122,111,176,.30)", duration: 100, hasRing: true },
  ], []);

  // Étoiles filantes : 3 trajectoires aléatoires en boucle
  const shootingStars = useMemo(() => showShootingStars ? [
    { id: 1, startTop: 10, startLeft: -5, delay: 0, duration: 4 },
    { id: 2, startTop: 35, startLeft: -10, delay: 7, duration: 5 },
    { id: 3, startTop: 60, startLeft: -8, delay: 13, duration: 4.5 },
  ] : [], [showShootingStars]);

  // 0.58.71 : Météorites enflammées qui traversent à différentes hauteurs/angles
  const meteorites = useMemo(() => showShootingStars ? [
    { id: 1, startTop: 5,  angle: 18, delay: 3,  duration: 6 },
    { id: 2, startTop: 22, angle: 22, delay: 11, duration: 7 },
    { id: 3, startTop: 45, angle: 16, delay: 19, duration: 6.5 },
    { id: 4, startTop: 70, angle: 25, delay: 27, duration: 7.5 },
  ] : [], [showShootingStars]);

  // 0.58.71 : Anneau d'astéroïdes (positions sur un cercle, statique sauf rotation conteneur)
  const asteroids = useMemo(() => {
    const n = 14;
    const palette = ["#a89070", "#c9a880", "#8a7860", "#b89878", "#7a6850"];
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      angle: (i / n) * Math.PI * 2,
      size: 2 + Math.random() * 4,
      color: palette[i % palette.length],
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Galaxies / nébuleuses floues */}
      {galaxies.map(g => (
        <div
          key={`gal-${g.id}`}
          style={{
            position: "absolute",
            top: `${g.top}%`,
            left: `${g.left}%`,
            width: g.size,
            height: g.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${g.color} 0%, transparent 70%)`,
            filter: "blur(40px)",
            animation: `av-galaxy-drift-${g.id} ${g.duration}s ease-in-out infinite`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Étoiles scintillantes */}
      {stars.map(s => (
        <div
          key={`star-${s.id}`}
          style={{
            position: "absolute",
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,0.8)`,
            opacity: s.opacity,
            animation: `av-star-twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Planètes avec anneau (Saturne style) */}
      {planets.map(p => (
        <div
          key={`planet-${p.id}`}
          style={{
            position: "absolute",
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            transform: "translate(-50%, -50%)",
            animation: `av-planet-orbit-${p.id} ${p.duration}s linear infinite`,
          }}
        >
          {/* Corps de la planète */}
          <div style={{
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${p.color1}, ${p.color2})`,
            boxShadow: `0 0 ${p.size}px ${p.color1}80, inset -2px -2px 4px rgba(0,0,0,0.3)`,
            position: "relative",
          }}>
            {p.hasRing && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: p.size * 2.4,
                height: p.size * 0.6,
                border: `2px solid ${p.ringColor}`,
                borderRadius: "50%",
                transform: "translate(-50%, -50%) rotate(-20deg)",
                boxShadow: `0 0 4px ${p.ringColor}`,
              }} />
            )}
          </div>
        </div>
      ))}

      {/* Étoiles filantes */}
      {shootingStars.map(ss => (
        <div
          key={`ss-${ss.id}`}
          style={{
            position: "absolute",
            top: `${ss.startTop}%`,
            left: `${ss.startLeft}%`,
            width: 80,
            height: 2,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(124,200,200,0.7), transparent)",
            borderRadius: 1,
            transform: "rotate(15deg)",
            animation: `av-shooting-star ${ss.duration}s ease-in infinite`,
            animationDelay: `${ss.delay}s`,
            opacity: 0,
          }}
        />
      ))}

      {/* 0.58.71 : Météorites enflammées (plus grosses + traînée orange) */}
      {showShootingStars && meteorites.map(mt => (
        <div
          key={`meteor-${mt.id}`}
          style={{
            position: "absolute",
            top: `${mt.startTop}%`,
            left: `-10%`,
            width: 140,
            height: 4,
            background: "linear-gradient(90deg, transparent, rgba(255,165,80,0.9) 30%, rgba(255,69,0,0.95) 60%, rgba(255,220,180,0.9) 90%, transparent)",
            borderRadius: 2,
            filter: "blur(0.5px)",
            transform: `rotate(${mt.angle}deg)`,
            animation: `av-meteor-fall ${mt.duration}s linear infinite`,
            animationDelay: `${mt.delay}s`,
            boxShadow: "0 0 18px 2px rgba(255,140,40,0.5)",
            opacity: 0,
          }}
        >
          {/* Tête de météorite (boule de feu) */}
          <div style={{
            position: "absolute", right: -2, top: -3,
            width: 10, height: 10, borderRadius: "50%",
            background: "radial-gradient(circle, #fff, #ffb04d 40%, #ff4500 80%, transparent)",
            boxShadow: "0 0 18px 5px rgba(255,140,40,0.7)",
          }} />
        </div>
      ))}

      {/* 0.58.71 : Anneau d'astéroïdes (rotation très lente, déco subtile) */}
      <div style={{
        position: "absolute",
        top: "55%", left: "20%",
        width: 360, height: 360,
        border: "1px dashed rgba(255,200,150,0.10)",
        borderRadius: "50%",
        transform: "translate(-50%, -50%) rotate(-15deg)",
        animation: "av-asteroid-ring 120s linear infinite",
        pointerEvents: "none",
      }}>
        {asteroids.map(a => (
          <div key={`ast-${a.id}`} style={{
            position: "absolute",
            top: `${50 + 50 * Math.sin(a.angle)}%`,
            left: `${50 + 50 * Math.cos(a.angle)}%`,
            width: a.size, height: a.size,
            background: a.color,
            borderRadius: "50%",
            boxShadow: `0 0 ${a.size * 2}px ${a.color}50`,
            transform: "translate(-50%, -50%)",
            opacity: 0.55,
          }} />
        ))}
      </div>

      <style jsx global>{`
        @keyframes av-star-twinkle {
          0%, 100% { opacity: var(--star-opacity, 0.5); transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes av-galaxy-drift-1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          33% { transform: translate(-45%, -55%) scale(1.08); }
          66% { transform: translate(-55%, -48%) scale(0.95); }
        }
        @keyframes av-galaxy-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-58%, -45%) scale(1.10); }
        }
        @keyframes av-galaxy-drift-3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          40% { transform: translate(-44%, -56%) scale(1.05); }
          80% { transform: translate(-52%, -44%) scale(0.92); }
        }
        @keyframes av-planet-orbit-1 {
          from { transform: translate(-50%, -50%) translate(0, 0); }
          25% { transform: translate(-50%, -50%) translate(15px, -8px); }
          50% { transform: translate(-50%, -50%) translate(0, -15px); }
          75% { transform: translate(-50%, -50%) translate(-15px, -8px); }
          to { transform: translate(-50%, -50%) translate(0, 0); }
        }
        @keyframes av-planet-orbit-2 {
          from { transform: translate(-50%, -50%) translate(0, 0); }
          50% { transform: translate(-50%, -50%) translate(-12px, 8px); }
          to { transform: translate(-50%, -50%) translate(0, 0); }
        }
        @keyframes av-planet-orbit-3 {
          from { transform: translate(-50%, -50%) translate(0, 0); }
          33% { transform: translate(-50%, -50%) translate(10px, 6px); }
          66% { transform: translate(-50%, -50%) translate(-10px, -6px); }
          to { transform: translate(-50%, -50%) translate(0, 0); }
        }
        @keyframes av-shooting-star {
          0% { opacity: 0; transform: rotate(15deg) translateX(0); }
          5% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; transform: rotate(15deg) translateX(110vw); }
        }
        @keyframes av-meteor-fall {
          0% { opacity: 0; transform: rotate(var(--mt-angle, 20deg)) translateX(0); }
          8% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--mt-angle, 20deg)) translateX(130vw); }
        }
        @keyframes av-asteroid-ring {
          from { transform: translate(-50%, -50%) rotate(-15deg); }
          to { transform: translate(-50%, -50%) rotate(345deg); }
        }
      `}</style>
    </div>
  );
}
