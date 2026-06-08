"use client";
// =============================================================
//  components/TVCastButton.js (0.65.10)
//
//  Bouton de cast pour les pages TV : ouvre un menu avec
//   - 📺 Google Cast (Chromecast)
//   - 🍎 AirPlay (Safari)
//   - 🖥 Multi-écran (Screen Detail API Chrome desktop)
//   - 📱 Picture-in-Picture (PiP)
//   - 🖼 Plein écran natif (Fullscreen API)
//   - 🔗 Copier le lien pour ouvrir sur un autre device
//
//  Détecte automatiquement les APIs disponibles.
// =============================================================

import { useState, useEffect, useRef } from "react";

export default function TVCastButton({ refreshSec = 60 }) {
  const [open, setOpen] = useState(false);
  const [screens, setScreens] = useState([]);
  const [castAvailable, setCastAvailable] = useState(false);
  const [airplayAvailable, setAirplayAvailable] = useState(false);
  const [pipAvailable, setPipAvailable] = useState(false);
  const [multiScreenAvailable, setMultiScreenAvailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    // 1. Google Cast (Chrome desktop + Android Chrome)
    setCastAvailable(typeof window !== "undefined" && !!window.chrome?.cast);

    // 2. AirPlay (Safari macOS/iOS)
    setAirplayAvailable(typeof window !== "undefined" && typeof window.WebKitPlaybackTargetAvailabilityEvent !== "undefined");

    // 3. Picture-in-Picture (Chrome/Edge desktop)
    setPipAvailable(typeof document !== "undefined" && "pictureInPictureEnabled" in document);

    // 4. Multi-screen Window Management API (Chrome 100+)
    setMultiScreenAvailable(typeof window !== "undefined" && typeof window.getScreenDetails === "function");

    // Close au click extérieur
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function showFeedback(text, type = "success") {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  }

  // === Google Cast ===
  async function startCast() {
    setOpen(false);
    if (!window.chrome?.cast) {
      showFeedback("Cast non disponible. Utilise Chrome sur ordinateur.", "error");
      return;
    }
    try {
      // L'API Cast nécessite le SDK officiel. Sur Chrome desktop, on peut utiliser la commande native.
      // L'utilisateur doit avoir un device Chromecast sur le même réseau.
      // Méthode : utiliser le contextMenu native ou ouvrir directement la sélection.
      if (window.chrome.cast.requestSession) {
        window.chrome.cast.requestSession(
          (session) => showFeedback(`Connecté à ${session.receiver.friendlyName}`),
          (err) => showFeedback("Cast annulé ou impossible : " + err.code, "error")
        );
      } else {
        // Fallback : ouvrir le menu Chrome natif
        showFeedback("Click droit dans la page → \"Caster…\" pour choisir une TV", "info");
      }
    } catch (e) {
      showFeedback("Erreur Cast : " + (e.message || "inconnue"), "error");
    }
  }

  // === Multi-écran (Screen Details API) ===
  async function detectScreens() {
    setOpen(false);
    if (!window.getScreenDetails) {
      showFeedback("API multi-écran non disponible (Chrome 100+ requis)", "error");
      return;
    }
    try {
      const screenDetails = await window.getScreenDetails();
      const list = screenDetails.screens.map((s, i) => ({
        idx: i,
        label: s.label || `Écran ${i + 1}`,
        width: s.width,
        height: s.height,
        availLeft: s.availLeft,
        availTop: s.availTop,
        isPrimary: s.isPrimary,
        isInternal: s.isInternal,
        ref: s,
      }));
      setScreens(list);
      showFeedback(`${list.length} écran${list.length > 1 ? "s" : ""} détecté${list.length > 1 ? "s" : ""}`);
    } catch (e) {
      if (e.name === "NotAllowedError") {
        showFeedback("Permission refusée. Click sur l'icône cadenas → autoriser \"Window placement\"", "error");
      } else {
        showFeedback("Erreur : " + (e.message || e.name), "error");
      }
    }
  }

  function openOnScreen(screen) {
    setOpen(false);
    const url = window.location.href;
    const features = `left=${screen.availLeft},top=${screen.availTop},width=${screen.width},height=${screen.height},popup=yes`;
    const newWin = window.open(url, "av-tv-" + screen.idx, features);
    if (newWin) {
      // Tente de mettre en plein écran (nécessite interaction user)
      try {
        setTimeout(() => {
          try { newWin.document.documentElement.requestFullscreen?.(); } catch {}
        }, 1000);
      } catch {}
      showFeedback(`Ouvert sur ${screen.label}`);
    } else {
      showFeedback("Popup bloquée. Autorise les popups pour ce site.", "error");
    }
  }

  // === AirPlay ===
  function startAirPlay() {
    setOpen(false);
    showFeedback("AirPlay : utilise le Control Center iOS / barre de menus Safari pour caster cette page", "info");
  }

  // === Plein écran ===
  function goFullscreen() {
    setOpen(false);
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }

  // === Copier le lien ===
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showFeedback("Impossible de copier", "error");
    }
  }

  // === QR Code pour ouvrir sur smartphone ===
  function showQrCode() {
    setOpen(false);
    // Génère un QR via API publique (qr-server.com)
    const url = encodeURIComponent(window.location.href);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}`;
    window.open(qrUrl, "_blank", "width=400,height=400");
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        title="Caster sur TV / Multi-écran"
        style={{
          padding: "6px 12px",
          background: "linear-gradient(135deg, rgba(124, 200, 200, .25), rgba(24, 95, 165, .15))",
          color: "#7CC8C8",
          border: "1.5px solid rgba(124, 200, 200, .4)",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          transition: "all 200ms",
          boxShadow: "0 2px 8px rgba(124, 200, 200, .2)",
        }}>
        <i className="ti ti-cast" style={{ fontSize: 16 }} />
        Caster
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "rgba(20, 33, 49, 0.97)",
          backdropFilter: "blur(20px) saturate(180%)",
          color: "#fff",
          padding: 12,
          borderRadius: 14,
          minWidth: 280,
          maxWidth: 360,
          border: "1.5px solid rgba(124, 200, 200, .3)",
          boxShadow: "0 20px 60px rgba(0,0,0,.6)",
          zIndex: 999999,  /* 0.65.11 : au-dessus de BackButtonFloating (z=95) et de tout */
          animation: "av-cast-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          fontFamily: "Quicksand, sans-serif",
        }}>
          <div style={{ fontSize: 11, color: "#7CC8C8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, padding: "0 4px" }}>
            <i className="ti ti-cast" /> Caster sur un écran
          </div>

          {/* Plein écran */}
          <button onClick={goFullscreen} style={btnStyle("#7CC8C8")}>
            <i className="ti ti-maximize" />
            <span style={{ flex: 1, textAlign: "left" }}>Plein écran</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>F11</span>
          </button>

          {/* Google Cast */}
          {castAvailable && (
            <button onClick={startCast} style={btnStyle("#185FA5")}>
              <i className="ti ti-device-tv" />
              <span style={{ flex: 1, textAlign: "left" }}>Caster sur Chromecast</span>
              <i className="ti ti-arrow-right" style={{ fontSize: 11, opacity: 0.7 }} />
            </button>
          )}

          {/* AirPlay */}
          {airplayAvailable && (
            <button onClick={startAirPlay} style={btnStyle("#5e4a8c")}>
              <i className="ti ti-broadcast" />
              <span style={{ flex: 1, textAlign: "left" }}>AirPlay (Apple TV)</span>
              <i className="ti ti-arrow-right" style={{ fontSize: 11, opacity: 0.7 }} />
            </button>
          )}

          {/* Multi-écran */}
          {multiScreenAvailable && (
            <>
              <button onClick={detectScreens} style={btnStyle("#EF9F27")}>
                <i className="ti ti-devices" />
                <span style={{ flex: 1, textAlign: "left" }}>Détecter mes écrans</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{screens.length > 0 ? `${screens.length} ✓` : ""}</span>
              </button>
              {screens.length > 0 && (
                <div style={{ paddingLeft: 12, marginTop: 4, marginBottom: 4 }}>
                  {screens.map((s) => (
                    <button key={s.idx} onClick={() => openOnScreen(s)}
                      style={{ ...btnStyle("#5aa05a"), paddingLeft: 8, fontSize: 11 }}>
                      <i className="ti ti-device-desktop" />
                      <span style={{ flex: 1, textAlign: "left" }}>
                        {s.label} ({s.width}×{s.height})
                        {s.isPrimary && <span style={{ fontSize: 9, color: "#EF9F27", marginLeft: 4 }}>· principal</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* QR Code pour ouvrir sur smartphone */}
          <button onClick={showQrCode} style={btnStyle("#C9867F")}>
            <i className="ti ti-qrcode" />
            <span style={{ flex: 1, textAlign: "left" }}>QR Code pour mobile</span>
          </button>

          {/* Copier le lien */}
          <button onClick={copyLink} style={btnStyle(copied ? "#5aa05a" : "#7a6fb0")}>
            <i className={`ti ${copied ? "ti-check" : "ti-link"}`} />
            <span style={{ flex: 1, textAlign: "left" }}>{copied ? "Lien copié !" : "Copier le lien"}</span>
          </button>

          {/* Lien vers paramètres TV */}
          <div style={{ borderTop: "1px solid rgba(124, 200, 200, .15)", marginTop: 8, paddingTop: 8 }}>
            <button onClick={() => { setOpen(false); window.location.href = "/presentation/parametres"; }}
              style={btnStyle("#9bb5b5")}>
              <i className="ti ti-settings" />
              <span style={{ flex: 1, textAlign: "left" }}>Paramètres mode TV</span>
              <i className="ti ti-arrow-right" style={{ fontSize: 11, opacity: 0.7 }} />
            </button>
          </div>

          {/* État des APIs */}
          <div style={{ borderTop: "1px solid rgba(124, 200, 200, .15)", marginTop: 8, paddingTop: 8, fontSize: 9, color: "#9bb5b5", lineHeight: 1.5 }}>
            <div><i className="ti ti-info-circle" /> APIs détectées :</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginTop: 4 }}>
              <span style={{ color: castAvailable ? "#5aa05a" : "#666" }}>{castAvailable ? "✓" : "✗"} Chromecast</span>
              <span style={{ color: airplayAvailable ? "#5aa05a" : "#666" }}>{airplayAvailable ? "✓" : "✗"} AirPlay</span>
              <span style={{ color: multiScreenAvailable ? "#5aa05a" : "#666" }}>{multiScreenAvailable ? "✓" : "✗"} Multi-écran</span>
              <span style={{ color: pipAvailable ? "#5aa05a" : "#666" }}>{pipAvailable ? "✓" : "✗"} Picture-in-Pic</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback */}
      {feedback && (
        <div style={{
          position: "fixed",
          bottom: 20, left: "50%",
          transform: "translateX(-50%)",
          background: feedback.type === "error" ? "linear-gradient(135deg, #e35d5b, #c0392b)"
                    : feedback.type === "info"  ? "linear-gradient(135deg, #185FA5, #134e87)"
                    : "linear-gradient(135deg, #5aa05a, #4a8a4a)",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 10px 30px rgba(0,0,0,.4)",
          zIndex: 999999,
          fontFamily: "Quicksand, sans-serif",
          animation: "av-cast-toast-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <i className={`ti ${feedback.type === "error" ? "ti-alert-circle" : feedback.type === "info" ? "ti-info-circle" : "ti-check"}`} style={{ marginRight: 6 }} />
          {feedback.text}
        </div>
      )}

      <style jsx global>{`
        @keyframes av-cast-pop {
          from { opacity: 0; transform: translateY(-8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes av-cast-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function btnStyle(color) {
  return {
    width: "100%",
    background: "transparent",
    color: "#fff",
    border: "1px solid rgba(124, 200, 200, .15)",
    borderLeft: `3px solid ${color}`,
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    transition: "all 180ms",
    textAlign: "left",
  };
}
