"use client";
// =============================================================
//  PresentationMode — Mode présentation (0.62.47)
//  TODO en attente depuis 0.58.30 ! Cédric le demandait depuis longtemps.
//
//  Active/désactive un état "présentation" qui masque :
//   - Badges notifications (cloche, compteurs)
//   - Toasts non critiques
//   - Données chiffrées sensibles (montants, RPPS, etc.)
//   - Tooltips
//
//  Toggle : Cmd/Ctrl + Shift + P (ou via menu)
//  Persisté dans localStorage.
// =============================================================
import { useEffect, useState } from "react";

const KEY_STORAGE = "av-presentation-mode";

export function isPresentationMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_STORAGE) === "1";
}

export function setPresentationMode(on) {
  if (typeof window === "undefined") return;
  if (on) {
    localStorage.setItem(KEY_STORAGE, "1");
    document.body.classList.add("av-presentation-mode");
  } else {
    localStorage.removeItem(KEY_STORAGE);
    document.body.classList.remove("av-presentation-mode");
  }
  window.dispatchEvent(new CustomEvent("av-presentation-change", { detail: { active: on } }));
}

export function togglePresentationMode() {
  setPresentationMode(!isPresentationMode());
}

export default function PresentationMode() {
  const [active, setActive] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Init depuis localStorage
    const initial = isPresentationMode();
    setActive(initial);
    if (initial) document.body.classList.add("av-presentation-mode");

    // Listener event custom
    function onChange(e) {
      setActive(!!e.detail?.active);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    }
    window.addEventListener("av-presentation-change", onChange);

    // Raccourci Cmd/Ctrl + Shift + P
    function onKey(e) {
      if (e.key === "P" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        togglePresentationMode();
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("av-presentation-change", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!flash) {
    // Affiche juste un petit indicator persistant en bas si actif
    if (!active) return null;
    return (
      <div style={{
        position: "fixed", bottom: 12, right: 12,
        background: "rgba(20,33,49,.85)", color: "#7CC8C8",
        padding: "5px 12px", borderRadius: 16,
        fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        display: "inline-flex", alignItems: "center", gap: 6,
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 12px rgba(20,33,49,.25)",
        cursor: "pointer",
        zIndex: 9990,
      }} onClick={() => togglePresentationMode()} title="Click pour désactiver (Cmd/Ctrl+Shift+P)">
        <i className="ti ti-presentation" /> Mode présentation
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
      background: active ? "linear-gradient(135deg, #7CC8C8 0%, #5a8f8f 100%)" : "linear-gradient(135deg, #8a98a8 0%, #5a6878 100%)",
      color: "#fff", padding: "10px 22px", borderRadius: 24,
      fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
      boxShadow: "0 10px 24px rgba(20,33,49,.3)",
      zIndex: 9999, display: "inline-flex", alignItems: "center", gap: 10,
      animation: "av-pop-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      pointerEvents: "none",
    }}>
      <i className={`ti ti-${active ? "presentation" : "presentation-off"}`} />
      Mode présentation {active ? "activé" : "désactivé"}
      <span style={{ fontSize: 10, opacity: .8, fontWeight: 500, marginLeft: 4 }}>· Cmd+Shift+P</span>
    </div>
  );
}
