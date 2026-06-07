"use client";
// =============================================================
//  PwaInstallPrompt — Bannière "Installer l'app" (0.61.2)
//  Détecte beforeinstallprompt + Android/iOS Safari instructions
// =============================================================
import { useEffect, useState } from "react";

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si déjà installée, on skip
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone) return;  // iOS standalone

    // Vérifie si refusée dans les 7 derniers jours
    const dismissed = localStorage.getItem("av-pwa-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Détecte iOS (pas de beforeinstallprompt, instructions manuelles)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIos) {
      setIosMode(true);
      setTimeout(() => setShow(true), 3000);  // affiche après 3s
      return;
    }

    // Chrome/Edge/Android : capture beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setTimeout(() => setShow(true), 5000);  // affiche après 5s
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem("av-pwa-installed", "1");
    }
    setDeferred(null);
    setShow(false);
  }

  function dismiss() {
    localStorage.setItem("av-pwa-dismissed", String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 10000,
      background: "linear-gradient(135deg, #142131, #1c3548)",
      borderRadius: 16, padding: 16,
      boxShadow: "0 12px 40px rgba(0,0,0,0.30), 0 0 0 1px rgba(124,200,200,0.30)",
      maxWidth: 480, margin: "0 auto",
      animation: "slideUp 300ms ease",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "linear-gradient(135deg, #7CC8C8, #5a8f8f)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <i className="ti ti-device-mobile" style={{ color: "#fff", fontSize: 26 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            📲 Installer Aveho sur ton appareil
          </div>
          <div style={{ fontSize: 12, color: "#bfe6e6", lineHeight: 1.5 }}>
            {iosMode ? (
              <>Sur iPhone : tape <i className="ti ti-share-2" style={{verticalAlign: "middle"}}/> puis "Sur l'écran d'accueil".</>
            ) : (
              <>Accès direct depuis ton écran d'accueil, fonctionne hors-ligne.</>
            )}
          </div>
        </div>
        <button onClick={dismiss} style={{
          background: "transparent", border: "none", color: "#a8d8d8",
          fontSize: 20, cursor: "pointer", padding: 4, flexShrink: 0,
        }} title="Plus tard">×</button>
      </div>

      {!iosMode && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={dismiss} style={{
            flex: 1, padding: "10px 16px",
            background: "transparent", color: "#bfe6e6",
            border: "1px solid rgba(255,255,255,0.20)", borderRadius: 8,
            fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Plus tard</button>
          <button onClick={install} style={{
            flex: 1, padding: "10px 16px",
            background: "linear-gradient(135deg, #7CC8C8, #5a8f8f)", color: "#fff",
            border: "none", borderRadius: 8,
            fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124,200,200,0.30)",
          }}>📥 Installer</button>
        </div>
      )}
    </div>
  );
}
