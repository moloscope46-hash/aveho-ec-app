"use client";
// =============================================================
//  components/AnimationsToggle.js (0.62.73)
//
//  Bouton dans /accueil (et global via class body) qui désactive
//  toutes les animations CSS. Préférence persistée localStorage.
// =============================================================
import { useEffect, useState } from "react";

export function useAnimationsToggle() {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("av-anim-disabled") === "1";
      setDisabled(stored);
      applyAnimState(stored);
    } catch {}
  }, []);

  function applyAnimState(off) {
    if (typeof document === "undefined") return;
    if (off) {
      document.body.classList.add("av-anim-off");
    } else {
      document.body.classList.remove("av-anim-off");
    }
  }

  function toggle() {
    const next = !disabled;
    setDisabled(next);
    try { localStorage.setItem("av-anim-disabled", next ? "1" : "0"); } catch {}
    applyAnimState(next);
  }

  return [disabled, toggle];
}

export default function AnimationsToggle({ compact = false }) {
  const [disabled, toggle] = useAnimationsToggle();

  if (compact) {
    return (
      <button onClick={toggle}
        title={disabled ? "Réactiver les animations" : "Désactiver les animations (réduit la fatigue visuelle, accélère mobile)"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 12px",
          background: disabled ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "rgba(255,255,255,.08)",
          color: disabled ? "#fff" : "#cfd5dd",
          border: `1px solid ${disabled ? "transparent" : "rgba(255,255,255,.15)"}`,
          borderRadius: 8,
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 200ms",
        }}>
        <i className={`ti ti-${disabled ? "player-play" : "player-pause"}`} />
        {disabled ? "Animations OFF" : "Animations ON"}
      </button>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "12px 16px",
      background: "linear-gradient(135deg, rgba(124,200,200,.08), rgba(24,95,165,.06))",
      border: "1px solid #e3e9ee",
      borderRadius: 12,
      cursor: "pointer",
    }}
      onClick={toggle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `linear-gradient(135deg, ${disabled ? "#5aa05a" : "#185FA5"}, ${disabled ? "#4a8a4a" : "#7CC8C8"})`,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          <i className={`ti ti-${disabled ? "player-play" : "sparkles"}`} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>
            Animations : {disabled ? "désactivées" : "activées"}
          </div>
          <div style={{ fontSize: 11, color: "#5a6878" }}>
            {disabled ? "Mode confort visuel — pas de transitions ni d'effets" : "Effets premium (shimmer, lift, slide, fade)"}
          </div>
        </div>
      </div>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: disabled ? "#c0d0d8" : "linear-gradient(135deg, #185FA5, #7CC8C8)",
        position: "relative", transition: "background 220ms",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 2, left: disabled ? 2 : 22,
          width: 20, height: 20, borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,.2)",
          transition: "left 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }} />
      </div>
    </div>
  );
}
