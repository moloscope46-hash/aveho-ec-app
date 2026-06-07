"use client";
// =============================================================
//  ScanBarcode — Scanner code-barres natif (0.61.7)
//  Utilise BarcodeDetector API + fallback redirect /scan
// =============================================================
import { useEffect, useRef, useState } from "react";
import { haptic, HAPTIC } from "../../lib/uxUtils";

export function ScanBarcode({ onScan, onClose, formats = ["ean_13", "ean_8", "code_128", "qr_code"] }) {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const [status, setStatus] = useState("init");
  const [error, setError] = useState("");
  const [lastCode, setLastCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Check BarcodeDetector support
      if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
        setError("Ton navigateur ne supporte pas BarcodeDetector. Utilise Chrome/Edge/Opera sur Android.");
        setStatus("error");
        return;
      }
      try {
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
        const usableFormats = formats.filter(f => supportedFormats.includes(f));
        if (usableFormats.length === 0) {
          setError("Aucun format de code-barres supporté");
          setStatus("error");
          return;
        }
        detectorRef.current = new window.BarcodeDetector({ formats: usableFormats });

        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");
        scanLoop();
      } catch (e) {
        setError(`Erreur caméra : ${e.message}`);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [formats]);

  async function scanLoop() {
    if (!videoRef.current || !detectorRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes.length > 0) {
        const code = codes[0].rawValue;
        if (code && code !== lastCode) {
          setLastCode(code);
          haptic(HAPTIC.scan);
          onScan?.(code);
        }
      }
    } catch {}
    animationRef.current = requestAnimationFrame(scanLoop);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
        padding: "16px env(safe-area-inset-right, 16px) 16px env(safe-area-inset-left, 16px)",
        background: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
          📷 Scanner code-barres
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
        }}>✕ Fermer</button>
      </div>

      {/* Vidéo */}
      <video ref={videoRef} playsInline muted style={{
        width: "100%", height: "100%", objectFit: "cover",
      }} />

      {/* Overlay viseur */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: "80%", maxWidth: 320, aspectRatio: "1.6/1",
          border: "3px solid #7CC8C8",
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
          position: "relative",
        }}>
          {/* Coins */}
          {[
            { top: -3, left: -3, borderTop: "5px solid #7CC8C8", borderLeft: "5px solid #7CC8C8" },
            { top: -3, right: -3, borderTop: "5px solid #7CC8C8", borderRight: "5px solid #7CC8C8" },
            { bottom: -3, left: -3, borderBottom: "5px solid #7CC8C8", borderLeft: "5px solid #7CC8C8" },
            { bottom: -3, right: -3, borderBottom: "5px solid #7CC8C8", borderRight: "5px solid #7CC8C8" },
          ].map((style, i) => (
            <div key={i} style={{ position: "absolute", width: 24, height: 24, ...style }} />
          ))}
          {/* Ligne scan animée */}
          <div style={{
            position: "absolute", top: "50%", left: 0, right: 0,
            height: 2, background: "rgba(124,200,200,0.8)",
            boxShadow: "0 0 8px #7CC8C8",
            animation: "scanLine 2s ease-in-out infinite",
          }} />
          <style>{`@keyframes scanLine {
            0%, 100% { transform: translateY(-60px); }
            50% { transform: translateY(60px); }
          }`}</style>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
        padding: "16px env(safe-area-inset-right, 16px) calc(20px + env(safe-area-inset-bottom, 0px)) env(safe-area-inset-left, 16px)",
        background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent)",
        color: "#fff", textAlign: "center",
      }}>
        {status === "init" && <div>⏳ Initialisation caméra...</div>}
        {status === "scanning" && (
          <>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Place le code-barres dans le cadre</div>
            {lastCode && (
              <div style={{ marginTop: 8, padding: 10, background: "rgba(124,200,200,0.20)", borderRadius: 8, fontFamily: "Consolas,monospace", fontSize: 14, fontWeight: 700 }}>
                ✓ {lastCode}
              </div>
            )}
          </>
        )}
        {status === "error" && (
          <div style={{ padding: 12, background: "rgba(227,93,91,0.20)", borderRadius: 8, color: "#ffcccb" }}>
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}
