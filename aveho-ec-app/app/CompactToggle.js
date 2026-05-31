"use client";
// =============================================================
//  CompactToggle.js
//  Alpha 0.53.0 (BJ) — Mode "compact" pour les tables
//  
//  Toggle persistant dans localStorage (par-clé ou global).
//  Quand activé, ajoute la classe "is-compact" au body qui réduit 
//  le padding des cells et la font-size globalement.
// =============================================================
import { useEffect, useState } from "react";

const LS_KEY = "aveho_compact_tables";

export function useCompactMode() {
  const [compact, setCompactState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      setCompactState(stored === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (compact) document.body.classList.add("is-compact");
    else document.body.classList.remove("is-compact");
  }, [compact]);

  function setCompact(v) {
    setCompactState(v);
    try { localStorage.setItem(LS_KEY, v ? "1" : "0"); } catch {}
  }

  return [compact, setCompact];
}

export default function CompactToggle() {
  const [compact, setCompact] = useCompactMode();

  return (
    <button
      onClick={() => setCompact(!compact)}
      title={compact ? "Désactiver le mode compact" : "Activer le mode compact (cellules plus serrées)"}
      style={{
        background: compact ? "#185FA5" : "#fff",
        color: compact ? "#fff" : "#185FA5",
        border: `1px solid ${compact ? "#185FA5" : "#bfd6f0"}`,
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <i className={`ti ${compact ? "ti-rows-1" : "ti-rows-3"}`} />
      {compact ? "Compact" : "Confort"}
    </button>
  );
}
