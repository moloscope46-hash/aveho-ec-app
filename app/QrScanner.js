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

export default function QrScanner({ onResult, onError, active = true, autoStop = true, formats = "all", requireUserStart = false }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | waiting_start | starting | scanning | stopped | error | denied
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [errorDetail, setErrorDetail] = useState("");
  // 0.58.72 : détection mobile pour suggérer l'activation manuelle (autoplay policy)
  const [userStarted, setUserStarted] = useState(!requireUserStart);

  // Charge la librairie html5-qrcode
  useEffect(() => {
    let cancelled = false;
    let scanner = null;

    async function init() {
      if (!active || !userStarted) {
        if (!userStarted) setStatus("waiting_start");
        return;
      }
      setStatus("starting");
      setErrorDetail("");
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;

        // Liste des caméras (peut throw si permission refusée)
        let cams;
        try {
          cams = await mod.Html5Qrcode.getCameras();
        } catch (permErr) {
          // 0.58.72 : différencier les types d'erreurs caméra pour message clair
          const m = permErr?.message || String(permErr);
          if (/permission|denied|notallow/i.test(m)) {
            setStatus("denied");
            setErrorDetail("Permission caméra refusée. Autorise l'accès dans les réglages du navigateur puis recharge la page.");
            onError?.("Permission caméra refusée");
            return;
          }
          if (/not.*found|nodevices|nocamera/i.test(m)) {
            setStatus("error");
            setErrorDetail("Aucune caméra détectée sur cet appareil. Utilise le scan par image (bouton ci-dessous).");
            return;
          }
          if (/secure|https/i.test(m)) {
            setStatus("error");
            setErrorDetail("La caméra requiert HTTPS. L'app doit être ouverte en HTTPS pour fonctionner.");
            return;
          }
          throw permErr;
        }
        if (cancelled) return;
        if (!cams || cams.length === 0) {
          setStatus("error");
          setErrorDetail("Aucune caméra détectée");
          return;
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
            // 0.58.71 : html5-qrcode exige min 50px pour qrbox dimension
            const s = Math.max(50, Math.floor(Math.min(vw, vh) * 0.7));
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
      // 0.58.71 : cleanup ultra-robuste — wrappe TOUT en try/catch puisque
      // html5-qrcode peut throw "Cannot clear while scan is ongoing", des
      // erreurs de race, et des removeChild DOM si l'élément a déjà bougé.
      if (scanner) {
        try {
          const state = scanner.getState?.();
          if (state === 2 || state === 3) {
            scanner.stop()
              .then(() => {
                try { scanner.clear(); } catch (_) {}
              })
              .catch(() => {
                try { scanner.clear(); } catch (_) {}
              });
          } else {
            try { scanner.clear(); } catch (_) {}
          }
        } catch (_) { /* swallow */ }
      }
      // 0.58.71 : nettoyer manuellement le DOM si html5-qrcode a laissé des nodes
      // (anti-crash removeChild côté React)
      try {
        const el = document.getElementById(SCANNER_ID);
        if (el) {
          while (el.firstChild) {
            try { el.removeChild(el.firstChild); } catch (_) { break; }
          }
        }
      } catch (_) { /* swallow */ }
    };
  }, [active, userStarted]);

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
      {/*
        0.58.71 — FIX removeChild crash :
        html5-qrcode injecte <video> et <canvas> dans #qr-reader-region.
        Sans dangerouslySetInnerHTML, React tient un registre des children
        et essaie de les remove au unmount → mismatch avec ce que html5-qrcode
        a ajouté/retiré → "Failed to execute 'removeChild' on 'Node'".
        Avec dangerouslySetInnerHTML={{ __html: '' }}, React promet de ne
        plus toucher aux children du div → html5-qrcode peut faire ce qu'il
        veut + React démonte juste le div parent sans inspecter dedans.
      */}
      <div
        id={SCANNER_ID}
        style={{
          width: "100%", maxWidth: 480, margin: "0 auto",
          borderRadius: 12, overflow: "hidden",
          background: "#142131",
          minHeight: 280,
          position: "relative",
        }}
        dangerouslySetInnerHTML={{ __html: "" }}
      />

      {/* Overlays status (en sibling, pas children du scanner-region) */}
      {status === "waiting_start" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 20, background: "rgba(20,33,49,.92)", borderRadius: 12, pointerEvents: "auto" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #7CC8C8, #185FA5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 25px rgba(124,200,200,.30)" }}>
            <i className="ti ti-camera" style={{ color: "#fff", fontSize: 38 }} />
          </div>
          <div style={{ textAlign: "center", color: "#cfe4f5" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Caméra prête à activer</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Clique pour démarrer le scanner</div>
          </div>
          <button
            type="button"
            onClick={() => setUserStarted(true)}
            style={{ background: "linear-gradient(135deg, #7CC8C8, #185FA5)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(24,95,165,.30)" }}
          >
            <i className="ti ti-camera" /> Activer la caméra
          </button>
        </div>
      )}
      {(status === "starting" || status === "idle") && userStarted && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: 20, textAlign: "center", color: "#cfe4f5", fontSize: 13, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 120 }}>
          <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Démarrage caméra…
        </div>
      )}
      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, padding: 20, textAlign: "center", color: "#fde0db", fontSize: 13, pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(20,33,49,.92)", borderRadius: 12 }}>
          <i className="ti ti-camera-off" style={{ fontSize: 36, color: "#e35d5b" }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fde0db" }}>Caméra inaccessible</div>
          <div style={{ fontSize: 11.5, opacity: 0.85, maxWidth: 320, lineHeight: 1.5 }}>{errorDetail || "Erreur inconnue. Utilise le scan par image ci-dessous."}</div>
          <button type="button" onClick={() => { setUserStarted(false); setTimeout(() => setUserStarted(true), 100); }} style={{ marginTop: 8, background: "rgba(124,200,200,.20)", color: "#7CC8C8", border: "1px solid #7CC8C8", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <i className="ti ti-refresh" /> Réessayer
          </button>
        </div>
      )}
      {status === "denied" && (
        <div style={{ position: "absolute", inset: 0, padding: 20, textAlign: "center", color: "#fde0db", fontSize: 13, pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(20,33,49,.92)", borderRadius: 12 }}>
          <i className="ti ti-shield-x" style={{ fontSize: 36, color: "#EF9F27" }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fde0db" }}>Permission caméra refusée</div>
          <div style={{ fontSize: 11.5, opacity: 0.85, maxWidth: 340, lineHeight: 1.5 }}>{errorDetail}</div>
          <div style={{ fontSize: 11, color: "#cfe4f5", opacity: 0.7, marginTop: 6 }}>
            🔓 Chrome : icône 🔒 dans la barre d'adresse → Autorisations → Caméra<br />
            🦊 Firefox : icône 🔒 → Permissions → Utiliser la caméra
          </div>
        </div>
      )}

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
