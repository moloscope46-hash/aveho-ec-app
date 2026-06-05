"use client";
// =============================================================
//  KeyboardHints — Overlay des raccourcis clavier disponibles (0.58.28)
//
//  S'affiche en bas-gauche pendant les modes "présentation" et "focus".
//  Aide les utilisateurs (et le présentateur en démo) à se rappeler
//  les raccourcis disponibles.
//
//  À mettre dans le layout (rendu conditionnel).
// =============================================================

import { useEffect, useState } from "react";
import { isPresentationMode } from "../lib/presentationMode";
import { isFocusMode } from "../lib/focusMode";

const HINTS = [
  { keys: ["Ctrl", "K"], label: "Recherche", icon: "ti-search" },
  { keys: ["Ctrl", "Shift", "P"], label: "Mode présentation", icon: "ti-presentation" },
  { keys: ["Ctrl", "Shift", "F"], label: "Mode focus zen", icon: "ti-target" },
  { keys: ["Esc"], label: "Fermer", icon: "ti-x" },
];

export default function KeyboardHints() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function check() {
      setVisible(isPresentationMode() || isFocusMode());
    }
    check();
    window.addEventListener("av-presentation-mode-change", check);
    window.addEventListener("av-focus-mode-change", check);
    return () => {
      window.removeEventListener("av-presentation-mode-change", check);
      window.removeEventListener("av-focus-mode-change", check);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 14,
        left: 14,
        zIndex: 99996,
        background: "rgba(20, 33, 49, 0.88)",
        backdropFilter: "blur(12px) saturate(180%)",
        border: "1px solid rgba(124, 200, 200, 0.20)",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        gap: 14,
        alignItems: "center",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.30), 0 0 24px rgba(124, 200, 200, 0.12)",
        fontFamily: "var(--font-quicksand), 'Quicksand', sans-serif",
        opacity: 0.7,
        transition: "opacity 200ms",
        pointerEvents: "auto",
        animation: "av-hints-in 400ms cubic-bezier(.2,.8,.2,1)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
    >
      {HINTS.map((h, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {h.keys.map((k, i) => (
              <kbd
                key={i}
                style={{
                  background: "rgba(124, 200, 200, 0.15)",
                  color: "#7CC8C8",
                  padding: "2px 7px",
                  borderRadius: 5,
                  fontFamily: "Consolas, monospace",
                  fontSize: 10.5,
                  fontWeight: 700,
                  border: "1px solid rgba(124, 200, 200, 0.30)",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.25)",
                  letterSpacing: 0.3,
                }}
              >
                {k}
              </kbd>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "rgba(220, 230, 235, 0.75)", fontWeight: 500 }}>
            {h.label}
          </span>
          {idx < HINTS.length - 1 && (
            <span style={{ color: "rgba(124, 200, 200, 0.18)", marginLeft: 6 }}>·</span>
          )}
        </div>
      ))}
      <style>{`
        @keyframes av-hints-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 0.7; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
