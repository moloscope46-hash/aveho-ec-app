"use client";
// =============================================================
//  components/TVScreenNav.js (0.64.0)
//
//  Navigation entre écrans TV avec grosses flèches gauche/droite.
//  Auto-rotation optionnelle via param URL ?auto=N.
//  Indicateur de progression (dots + nom écran courant).
//
//  Écrans : interventions / planning / dashboard / stats
// =============================================================

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SCREENS = [
  { path: "/presentation/interventions", label: "Demandes d'intervention", icon: "ti-clipboard-list", color: "#EF9F27" },
  { path: "/presentation/planning",      label: "Planning du jour",        icon: "ti-calendar",       color: "#7CC8C8" },
  { path: "/presentation/architecture",  label: "Architecture bâtiments",  icon: "ti-building",       color: "#185FA5" },
  { path: "/presentation/livraisons",    label: "Livraisons prévues",      icon: "ti-truck-delivery", color: "#C9867F" },
  { path: "/presentation/carte-had",     label: "Carte HAD & domicile",    icon: "ti-map-pin",        color: "#5aa05a" },
  { path: "/presentation/had-list",      label: "Liste HAD & anticipation", icon: "ti-home-heart",    color: "#5db5b5" },
  { path: "/presentation/dashboard",     label: "Tableau de bord",         icon: "ti-chart-bar",      color: "#7a6fb0" },
  { path: "/presentation/stats",         label: "Activité temps réel",     icon: "ti-pulse",          color: "#5a8f8f" },
];

export default function TVScreenNav({ currentScreen }) {
  const router = useRouter();
  const params = useSearchParams();
  const autoSec = parseInt(params.get("auto") || "0", 10);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef(null);

  const currentIdx = SCREENS.findIndex(s => s.path === currentScreen);
  const prev = SCREENS[(currentIdx - 1 + SCREENS.length) % SCREENS.length];
  const next = SCREENS[(currentIdx + 1) % SCREENS.length];

  function go(path) {
    // Conserver les autres params (etab, refresh, auto)
    const query = params.toString();
    router.push(query ? `${path}?${query}` : path);
  }

  // Auto-rotation
  useEffect(() => {
    if (!autoSec || autoSec < 5) return;
    setProgress(0);
    const startedAt = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const pct = (elapsed / autoSec) * 100;
      setProgress(Math.min(pct, 100));
      if (pct >= 100) {
        clearInterval(tickRef.current);
        go(next.path);
      }
    }, 100);
    return () => clearInterval(tickRef.current);
  }, [currentScreen, autoSec]);

  // Navigation clavier ← →
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") go(prev.path);
      else if (e.key === "ArrowRight") go(next.path);
      else if (e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key, 10) - 1;
        if (SCREENS[idx]) go(SCREENS[idx].path);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  return (
    <>
      {/* Flèche GAUCHE */}
      <button onClick={() => go(prev.path)}
        title={`← ${prev.label} (←)`}
        style={{
          position: "fixed",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(255,255,255,.08)",
          color: "#fff",
          border: "2px solid rgba(255,255,255,.25)",
          cursor: "pointer",
          fontSize: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
          transition: "all 200ms",
          backdropFilter: "blur(8px)",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(124,200,200,.25)";
          e.currentTarget.style.borderColor = "#7CC8C8";
          e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,.25)";
          e.currentTarget.style.transform = "translateY(-50%) scale(1)";
        }}>
        <i className="ti ti-chevron-left" />
      </button>

      {/* Flèche DROITE */}
      <button onClick={() => go(next.path)}
        title={`${next.label} → (→)`}
        style={{
          position: "fixed",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(255,255,255,.08)",
          color: "#fff",
          border: "2px solid rgba(255,255,255,.25)",
          cursor: "pointer",
          fontSize: 36,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
          transition: "all 200ms",
          backdropFilter: "blur(8px)",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(124,200,200,.25)";
          e.currentTarget.style.borderColor = "#7CC8C8";
          e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,.25)";
          e.currentTarget.style.transform = "translateY(-50%) scale(1)";
        }}>
        <i className="ti ti-chevron-right" />
      </button>

      {/* Footer dots + nom écran */}
      <div style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        background: "rgba(20, 33, 49, .85)",
        backdropFilter: "blur(10px)",
        borderRadius: 100,
        padding: "10px 22px",
        display: "flex", alignItems: "center", gap: 14,
        border: "1px solid rgba(255,255,255,.15)",
        boxShadow: "0 8px 30px rgba(0,0,0,.4)",
      }}>
        {SCREENS.map((s, i) => (
          <button key={s.path} onClick={() => go(s.path)}
            title={s.label}
            style={{
              width: i === currentIdx ? 40 : 14,
              height: 14,
              borderRadius: 7,
              background: i === currentIdx ? s.color : "rgba(255,255,255,.25)",
              border: "none",
              cursor: "pointer",
              transition: "all 300ms",
              padding: 0,
            }}
          />
        ))}
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,.2)" }} />
        <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <i className={`ti ${SCREENS[currentIdx]?.icon}`} style={{ color: SCREENS[currentIdx]?.color, fontSize: 16 }} />
          {SCREENS[currentIdx]?.label}
          <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginLeft: 4 }}>
            {currentIdx + 1}/{SCREENS.length}
          </span>
        </div>
      </div>

      {/* Barre de progression auto-rotation */}
      {autoSec > 0 && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(0,0,0,.3)",
          zIndex: 101,
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${SCREENS[currentIdx]?.color}, #7CC8C8)`,
            transition: "width 100ms linear",
            boxShadow: "0 0 8px rgba(124,200,200,.5)",
          }} />
        </div>
      )}

      {/* 0.65.21 : Bouton SORTIR du mode TV SOUS la barre de tuiles (centré bas) */}
      <button
        onClick={() => router.push("/accueil")}
        style={{
          position: "fixed",
          bottom: 70,  /* Juste au-dessus du footer dots */
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 102,
          background: "rgba(227, 93, 91, .92)",
          color: "#fff",
          border: "1.5px solid rgba(255,255,255,.3)",
          padding: "10px 24px",
          borderRadius: 24,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          cursor: "pointer",
          fontFamily: "Quicksand, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 6px 20px rgba(227, 93, 91, .5), 0 2px 6px rgba(0,0,0,.25)",
          backdropFilter: "blur(8px)",
        }}
        title="Sortir du mode TV"
      >
        <i className="ti ti-x" style={{ fontSize: 16 }} /> Sortir TV
      </button>

      {/* 0.65.21 : Boutons PARTAGE en haut-droite : AirPlay + ChromeCast */}
      <div style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 102,
        display: "flex",
        gap: 8,
      }}>
        {/* AirPlay (iOS/Safari) */}
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.WebKitPlaybackTargetAvailabilityEvent) {
              alert("Recherche d'appareils AirPlay disponibles...\n(Fonctionnalité native iOS/macOS Safari)");
            } else {
              alert("AirPlay n'est disponible que sur Safari (iOS/macOS).\nUtilisez ChromeCast sur Chrome.");
            }
          }}
          title="Diffuser via AirPlay (iOS/Safari)"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(20, 33, 49, .85)",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,.3)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,.3)",
          }}
        >
          <i className="ti ti-airplay" />
        </button>

        {/* ChromeCast (Chrome) */}
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.chrome && window.chrome.cast) {
              alert("Recherche d'appareils ChromeCast disponibles...");
            } else {
              alert("ChromeCast nécessite Google Chrome.\nClick l'icône Cast dans la barre Chrome (en haut-droite du navigateur).");
            }
          }}
          title="Diffuser via ChromeCast (Google Chrome)"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(20, 33, 49, .85)",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,.3)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,.3)",
          }}
        >
          <i className="ti ti-cast" />
        </button>
      </div>

      <style>{`
        @keyframes tv-pulse-dot {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}

export { SCREENS };
