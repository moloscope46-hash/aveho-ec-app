"use client";
// =============================================================
//  SignaturePad — Pavé de signature électronique
//  Alpha 0.21.0
//
//  Supporte :
//   - Pointer Events (souris, tactile, stylet) — unifié et moderne
//   - WebHID : détection de signpads externes USB compatibles
//   - Touch optimisé (taille, pression si dispo)
//
//  Usage :
//    const padRef = useRef();
//    <SignaturePad ref={padRef} width={500} height={200} />
//    // Récupérer l'image :
//    const png = padRef.current.toDataURL("image/png");
//    const empty = padRef.current.isEmpty();
//    padRef.current.clear();
// =============================================================
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const SignaturePad = forwardRef(function SignaturePad(
  { width = 500, height = 200, penColor = "#142131", backgroundColor = "#fff", lineWidth = 2.5, onChange },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const isEmptyRef = useRef(true);
  const [hidDevice, setHidDevice] = useState(null);
  const [hidStatus, setHidStatus] = useState("idle"); // idle | available | connected | unsupported

  // Détection WebHID au montage
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.hid) {
      setHidStatus("unsupported");
      return;
    }
    setHidStatus("available");
    // Vérifier si un signpad est déjà autorisé
    navigator.hid.getDevices().then((devs) => {
      const pad = devs.find((d) =>
        // Heuristique : vendors connus signpads (Wacom, Topaz, etc.)
        [0x056a, 0x0403, 0x06a8, 0x162e].includes(d.vendorId)
      );
      if (pad) connectHid(pad);
    });
  }, []);

  async function requestHid() {
    if (!navigator.hid) return;
    try {
      const devs = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x056a }, // Wacom
          { vendorId: 0x0403 }, // FTDI (signpads génériques)
          { vendorId: 0x06a8 }, // Topaz
          { vendorId: 0x162e }, // Scriptel
        ],
      });
      if (devs.length > 0) await connectHid(devs[0]);
    } catch (e) {
      console.warn("WebHID request failed:", e);
    }
  }

  async function connectHid(device) {
    try {
      if (!device.opened) await device.open();
      setHidDevice(device);
      setHidStatus("connected");
      device.addEventListener("inputreport", handleHidInput);
    } catch (e) {
      console.warn("WebHID connect failed:", e);
    }
  }

  function handleHidInput(event) {
    // Beaucoup de signpads exposent x, y, pression dans le report
    // Format type Wacom : [reportId, x_lo, x_hi, y_lo, y_hi, pressure_lo, pressure_hi, buttons]
    // Implémentation générique : on suppose 2 octets X, 2 octets Y au minimum
    const data = event.data;
    if (data.byteLength < 4) return;
    const x = data.getUint16(0, true);
    const y = data.getUint16(2, true);
    // Normaliser sur la taille du canvas (les signpads ont leur propre résolution)
    // On suppose une résolution max de 0xFFFF, ajustable selon device
    const nx = (x / 0xFFFF) * width;
    const ny = (y / 0xFFFF) * height;
    drawFromExternal(nx, ny);
  }

  function drawFromExternal(x, y) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (!lastPointRef.current) {
      lastPointRef.current = { x, y };
      return;
    }
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };
    isEmptyRef.current = false;
    onChange?.();
  }

  // ---------- Canvas init ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = penColor;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctxRef.current = ctx;
  }, [width, height, lineWidth, penColor, backgroundColor]);

  // ---------- Pointer Events ----------
  function pointerPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onPointerDown(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const p = pointerPos(e);
    lastPointRef.current = p;
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    // Petit point au début (pour les tap rapides)
    ctx.arc(p.x, p.y, lineWidth / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    isEmptyRef.current = false;
  }
  function onPointerMove(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const p = pointerPos(e);
    const ctx = ctxRef.current;
    // Largeur de ligne adaptative selon pression (si dispo, stylet)
    if (e.pressure !== undefined && e.pressure > 0 && e.pressure < 1) {
      ctx.lineWidth = lineWidth * (0.5 + e.pressure);
    } else {
      ctx.lineWidth = lineWidth;
    }
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    lastPointRef.current = p;
    onChange?.();
  }
  function onPointerUp(e) {
    drawingRef.current = false;
    canvasRef.current.releasePointerCapture?.(e.pointerId);
  }

  // ---------- Exposed API ----------
  useImperativeHandle(ref, () => ({
    isEmpty: () => isEmptyRef.current,
    clear: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = lineWidth;
      isEmptyRef.current = true;
      lastPointRef.current = null;
      onChange?.();
    },
    toDataURL: (type = "image/png", quality) => {
      // Retourne l'image en base64 dataURL
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL(type, quality);
    },
    toBlob: (type = "image/png") => {
      return new Promise((resolve) => {
        canvasRef.current?.toBlob(resolve, type);
      });
    },
  }), [width, height, lineWidth, penColor, backgroundColor]);

  return (
    <div className="sig-pad-wrap">
      <canvas
        ref={canvasRef}
        className="sig-pad-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ touchAction: "none", userSelect: "none", cursor: "crosshair" }}
        aria-label="Pavé de signature"
        role="img"
      />
      {/* Status WebHID + bouton de connexion si dispo */}
      <div className="sig-pad-status">
        {hidStatus === "unsupported" && (
          <span style={{ color: "#8a98a8", fontSize: 11 }}>
            <i className="ti ti-info-circle" /> Pavés externes non supportés par ce navigateur (Chrome/Edge requis)
          </span>
        )}
        {hidStatus === "available" && (
          <button onClick={requestHid} className="sig-pad-hid-btn" type="button">
            <i className="ti ti-usb" /> Connecter un pavé tactile externe
          </button>
        )}
        {hidStatus === "connected" && hidDevice && (
          <span style={{ color: "#5aa05a", fontSize: 11, fontWeight: 600 }}>
            <i className="ti ti-circle-check-filled" /> Pavé externe connecté : {hidDevice.productName || "inconnu"}
          </span>
        )}
      </div>
    </div>
  );
});

export default SignaturePad;
