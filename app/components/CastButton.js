"use client";
import { useEffect, useState } from "react";

export default function CastButton({ size = 32, color = "#fff" }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (isFullscreen) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    else { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
  }
  function instructions(type) {
    const msg = {
      google: "Google Cast :\nChrome → Menu (⋮) → Diffuser → Choisis Chromecast/TV",
      airplay: "AirPlay :\nMac/iPhone → Centre de contrôle → Recopie écran → Apple TV",
      smartview: "Samsung Smart View :\nAndroid → Paramètres rapides → Smart View\nWindows → Win+K",
    };
    alert(msg[type] || "");
  }

  const btn = (onClick, title, color, children) => (
    <button onClick={onClick} title={title}
      style={{ width: size + 8, height: size + 8, borderRadius: 10, background: "rgba(255,255,255,.06)",
        border: `1px solid ${color}30`, color, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </button>
  );

  return (
    <div style={{ display: "inline-flex", gap: 6 }}>
      {btn(toggleFullscreen, isFullscreen ? "Quitter plein écran" : "Plein écran",
        isFullscreen ? "#5aa05a" : color,
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          {isFullscreen
            ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>}
        </svg>
      )}
      {btn(() => instructions("google"), "Google Cast / Chromecast", "#1A73E8",
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      )}
      {btn(() => instructions("airplay"), "Apple AirPlay", "#000",
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .89-2 2v12c0 1.1.9 2 2 2h3v-2H3V5h18v12h-3v2h3c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2z"/>
        </svg>
      )}
      {btn(() => instructions("smartview"), "Samsung Smart View", "#1428a0",
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
          <path d="M9 9l3 3 3-3v3.5L12 15l-3-2.5z" opacity="0.7"/>
        </svg>
      )}
    </div>
  );
}
