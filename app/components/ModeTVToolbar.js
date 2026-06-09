"use client";
// =============================================================
//  ModeTVToolbar — Toolbar standard pour TOUTES les pages /presentation/*
//  Retour + Plein écran + Screen Share natif + Cast (Google/Apple/SmartView) + Refresh
// =============================================================
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModeTVToolbar({ onRefresh, color = "#7CC8C8", title = "Mode TV" }) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }

  async function shareScreen() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const win = window.open("", "_blank", "width=1280,height=720");
      if (win) {
        win.document.title = "Aveho - Partage écran";
        win.document.body.style.cssText = "margin:0;background:#000;display:flex;align-items:center;justify-content:center";
        const v = win.document.createElement("video");
        v.srcObject = stream;
        v.autoplay = true;
        v.style.cssText = "max-width:100%;max-height:100vh";
        win.document.body.appendChild(v);
      }
      stream.getVideoTracks()[0].onended = () => { if (win) win.close(); };
    } catch (e) {
      alert("Partage écran refusé ou non supporté");
    }
  }

  function castInstructions(type) {
    const msg = {
      google: "Google Cast (Chromecast / Google TV) :\n\nChrome : Menu (⋮) → Diffuser → Sélectionne ton appareil Cast",
      apple: "AirPlay (Apple TV / iPad / iPhone) :\n\nMac : Centre de contrôle → Recopie écran\niPhone/iPad : Glisser depuis haut-droit → Recopie écran → Apple TV",
      samsung: "Samsung Smart View / Miracast :\n\nAndroid : Paramètres rapides → Smart View\nWindows : Win+K → Connecter à un écran sans fil",
    };
    alert(msg[type] || "");
  }

  const btnStyle = {
    width: 38, height: 38, borderRadius: 9,
    background: "rgba(255,255,255,.06)", color: "#fff",
    border: "1px solid rgba(255,255,255,.10)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
    transition: "all 150ms",
  };

  return (
    <div style={{
      position: "fixed", top: 14, right: 14, zIndex: 9000,
      display: "flex", gap: 6, alignItems: "center",
      padding: "8px 10px",
      background: "rgba(20,33,49,.85)", backdropFilter: "blur(12px)",
      borderRadius: 14, border: "1px solid rgba(255,255,255,.08)",
      boxShadow: "0 12px 32px rgba(0,0,0,.4)",
    }}>
      <button onClick={() => router.push("/presentation")} title="Hub Mode TV" style={btnStyle}>
        <i className="ti ti-home" />
      </button>
      <button onClick={() => router.back()} title="Retour" style={btnStyle}>
        <i className="ti ti-arrow-left" />
      </button>
      <span style={{ width: 1, height: 24, background: "rgba(255,255,255,.10)", margin: "0 4px" }} />
      <button onClick={toggleFullscreen} title={isFullscreen ? "Quitter plein écran" : "Plein écran"} style={{ ...btnStyle, color: isFullscreen ? "#5aa05a" : "#fff" }}>
        <i className={`ti ${isFullscreen ? "ti-arrows-minimize" : "ti-arrows-maximize"}`} />
      </button>
      <button onClick={shareScreen} title="Partage écran natif (Web Screen Capture)" style={btnStyle}>
        <i className="ti ti-screen-share" />
      </button>
      <span style={{ width: 1, height: 24, background: "rgba(255,255,255,.10)", margin: "0 4px" }} />
      {/* Cast Google */}
      <button onClick={() => castInstructions("google")} title="Google Cast / Chromecast" style={{ ...btnStyle, color: "#1A73E8" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
      {/* Cast Apple */}
      <button onClick={() => castInstructions("apple")} title="Apple AirPlay" style={{ ...btnStyle, color: "#aaa" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
      {/* Cast Samsung Smart View */}
      <button onClick={() => castInstructions("samsung")} title="Samsung Smart View" style={{ ...btnStyle, color: "#1428A0" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.11-.9-2-2-2zm0 14H3V5h18v12zm-5-6l-7 4V7z"/>
        </svg>
      </button>
      <span style={{ width: 1, height: 24, background: "rgba(255,255,255,.10)", margin: "0 4px" }} />
      {/* Refresh */}
      <button onClick={onRefresh} title="Rafraîchir" style={{ ...btnStyle, color }}>
        <i className="ti ti-refresh" />
      </button>
    </div>
  );
}
