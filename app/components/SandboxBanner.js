"use client";
// =============================================================
//  components/SandboxBanner.js + lib/useSandboxMode (0.65.0)
//
//  Mode "Test / Bac à sable" MVP :
//   - Toggle dans TopBar (admin uniquement)
//   - Bandeau rouge clignotant en haut de toutes les pages
//   - LocalStorage key "av-sandbox-mode" = "on" | "off"
//   - Indicateur visuel fort pour démos / formations
//
//  Note : la vraie isolation des données (schéma séparé) sera v2.
//  Ce mode marque visuellement quand l'admin est en train de tester.
// =============================================================

import { useEffect, useState } from "react";

const STORAGE_KEY = "av-sandbox-mode";

export function useSandboxMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(STORAGE_KEY) === "on");
    } catch {}
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setOn(e.newValue === "on");
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("av-sandbox-toggle", () => setOn(localStorage.getItem(STORAGE_KEY) === "on"));
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle() {
    const next = !on;
    try {
      if (next) localStorage.setItem(STORAGE_KEY, "on");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setOn(next);
    window.dispatchEvent(new CustomEvent("av-sandbox-toggle"));
  }

  return { on, toggle };
}

export function SandboxBanner() {
  const { on } = useSandboxMode();
  if (!on) return null;
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 99999,
      background: "linear-gradient(90deg, #e35d5b, #c0392b, #e35d5b)",
      backgroundSize: "200% 100%",
      color: "#fff",
      textAlign: "center",
      padding: "5px 16px",
      fontWeight: 800,
      fontSize: 11.5,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      animation: "av-sandbox-shift 3s ease-in-out infinite, av-sandbox-pulse 1.5s ease-in-out infinite",
      pointerEvents: "none",
      fontFamily: "Quicksand, sans-serif",
      boxShadow: "0 2px 12px rgba(227,93,91,.5)",
    }}>
      🧪 MODE TEST / SANDBOX ACTIVÉ — les modifications réalisées impactent les vraies données mais sont signalées 🧪
      <style jsx global>{`
        @keyframes av-sandbox-shift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        @keyframes av-sandbox-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.85; }
        }
        body.av-sandbox-mode {
          /* décale tout vers le bas pour ne pas être caché par la bannière */
          padding-top: 24px !important;
        }
      `}</style>
    </div>
  );
}

export function SandboxToggle() {
  const { on, toggle } = useSandboxMode();
  return (
    <button
      onClick={toggle}
      title={on ? "Désactiver le mode Test (Sandbox)" : "Activer le mode Test (Sandbox) — bandeau rouge visible pour les démos/formations"}
      style={{
        padding: "4px 9px",
        background: on ? "linear-gradient(135deg, #e35d5b, #c0392b)" : "rgba(255,255,255,.05)",
        color: on ? "#fff" : "#5a6878",
        border: on ? "none" : "1px solid #cfd8e0",
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 0.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        textTransform: "uppercase",
        animation: on ? "av-sandbox-toggle-pulse 1.5s ease-in-out infinite" : "none",
      }}>
      <i className={`ti ${on ? "ti-flask" : "ti-flask-off"}`} />
      {on ? "Test ON" : "Mode Test"}
      <style jsx global>{`
        @keyframes av-sandbox-toggle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(227,93,91,.5); }
          50%      { box-shadow: 0 0 0 6px rgba(227,93,91,0); }
        }
      `}</style>
    </button>
  );
}
