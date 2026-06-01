"use client";
// =============================================================
//  app/QrScanner.js (Alpha 0.56.2)
//
//  Composant scanner QR/barcode réutilisable basé sur html5-qrcode.
//  Caméra arrière par défaut sur mobile, fallback upload image.
//
//  Props :
//    - onResult({ text, format }) : appelé à chaque scan réussi
//    - onError(message) : appelé si erreur caméra / décodage
//    - active (bool) : démarre/arrête le scanner
//    - formats (array) : restriction des types ('qr', 'all', etc.) — défaut all
//    - autoStop (bool) : arrête après le 1er scan (défaut true)
// =============================================================

import { useEffect, useRef, useState } from "react";

const SCANNER_ID = "qr-reader-region";

export default function QrScanner({ onResult, onError, active = true, autoStop = true, formats = "all" }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | starting | scanning | stopped | error
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Charge la librairie html5-qrcode
  useEffect(() => {
    let cancelled = false;
    let scanner = null;

    async function init() {
      if (!active) return;
      setStatus("starting");
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;

        // Liste des caméras
        const cams = await mod.Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cams || cams.length === 0) {
          throw new Error("Aucune caméra détectée");
        }
        setCameras(cams);

        // Préférer la caméra arrière sur mobile
        const back = cams.find(c => /back|arrière|rear|environment/i.test(c.label));
        const camId = back?.id || cams[0].id;
        setSelectedCamera(camId);

        scanner = new mod.Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: (vw, vh) => {
            const s = Math.floor(Math.min(vw, vh) * 0.7);
            return { width: s, height: s };
          },
          aspectRatio: 1.0,
        };

        await scanner.start(
          camId,
          config,
          (decodedText, decodedResult) => {
            if (cancelled) return;
            onResult?.({
              text: decodedText,
              format: decodedResult?.result?.format?.formatName || "?",
              source: "camera",
            });
            if (autoStop) {
              // 0.56.11 : vérifier l'état avant stop pour éviter les races
              try {
                const state = scanner.getState?.();
                if (state === 2 || state === 3) {
                  scanner.stop().catch(() => {});
                }
              } catch (_) {}
              setStatus("stopped");
            }
          },
          () => { /* failure silent — c'est normal entre 2 décodages */ }
        );
        if (!cancelled) setStatus("scanning");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          onError?.(e.message || "Erreur démarrage scanner");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      // 0.56.11 : cleanup robuste — vérifier l'état avant stop/clear pour éviter
      // les erreurs "Cannot clear while scan is ongoing" et "removeChild" qui
      // surviennent quand React démonte avant que html5-qrcode ait fini.
      if (scanner) {
        try {
          // STATE_SCANNING = 2, STATE_PAUSED = 3 (html5-qrcode constants)
          const state = scanner.getState?.();
          if (state === 2 || state === 3) {
            // Encore en train de scanner → stop d'abord puis clear
            scanner.stop()
              .then(() => scanner.clear().catch(() => {}))
              .catch(() => {
                // stop a échoué — tenter clear quand même (utile au remount)
                try { scanner.clear(); } catch (_) {}
              });
          } else {
            // Déjà stoppé → clear direct (idempotent)
            scanner.clear().catch(() => {});
          }
        } catch (_) {
          // getState peut throw si l'instance est en mauvais état — on ignore
        }
      }
    };
  }, [active]);

  // Bascule de caméra
  async function switchCamera(camId) {
    if (!scannerRef.current) return;
    try {
      // 0.56.11 : check state avant stop
      const state = scannerRef.current.getState?.();
      if (state === 2 || state === 3) {
        await scannerRef.current.stop();
      }
      setSelectedCamera(camId);
      await scannerRef.current.start(camId, { fps: 10, qrbox: 250 }, (text, res) => {
        onResult?.({ text, format: res?.result?.format?.formatName || "?", source: "camera" });
        if (autoStop) {
          const st = scannerRef.current?.getState?.();
          if (st === 2 || st === 3) scannerRef.current.stop().catch(() => {});
        }
      }, () => {});
      setStatus("scanning");
    } catch (e) {
      setStatus("error");
      onError?.(e.message);
    }
  }

  // Fallback : décodage depuis fichier image (utile sur desktop ou si la caméra ne marche pas)
  async function scanFromFile(file) {
    if (!file) return;
    try {
      const mod = await import("html5-qrcode");
      const tmp = new mod.Html5Qrcode("qr-reader-file-temp", { verbose: false });
      const text = await tmp.scanFile(file, false);
      onResult?.({ text, format: "image", source: "file" });
    } catch (e) {
      onError?.("Pas de QR/code détecté dans l'image : " + (e.message || e));
    }
  }

  return (
    <div ref={containerRef}>
      <div id={SCANNER_ID} style={{
        width: "100%", maxWidth: 480, margin: "0 auto",
        borderRadius: 12, overflow: "hidden",
        background: "#142131",
        minHeight: 280,
        position: "relative",
      }}>
        {(status === "starting" || status === "idle") && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#cfe4f5", fontSize: 13, gap: 8 }}>
            <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Démarrage caméra…
          </div>
        )}
        {status === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fde0db", fontSize: 13, gap: 8, padding: 20, textAlign: "center" }}>
            <i className="ti ti-camera-off" style={{ fontSize: 32 }} />
            Caméra inaccessible.<br />Utilise le scan par image ci-dessous.
          </div>
        )}
      </div>
      <div id="qr-reader-file-temp" style={{ display: "none" }} />

      {/* Toolbar */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
        {cameras.length > 1 && (
          <select
            value={selectedCamera || ""}
            onChange={(e) => switchCamera(e.target.value)}
            style={{ padding: "6px 8px", border: "1px solid #d3d9e0", borderRadius: 6, fontSize: 12, fontFamily: "inherit" }}
          >
            {cameras.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}

        <label style={{
          background: "#7a6fb0", color: "#fff", border: "none",
          padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-photo" /> Scanner depuis image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => scanFromFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {status === "scanning" && (
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11.5, color: "#5aa05a", fontWeight: 600 }}>
          <i className="ti ti-broadcast" style={{ marginRight: 4 }} /> Scanner actif — pointe vers un QR ou code-barre
        </div>
      )}
    </div>
  );
}
