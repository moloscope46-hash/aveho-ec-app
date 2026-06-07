"use client";
// =============================================================
//  SignatureCanvas — Canvas pour signature dessinée (0.61.1)
//  Souris + tactile, export en base64 PNG ou clear
// =============================================================
import { useRef, useEffect, useState } from "react";

export function SignatureCanvas({ onChange, width = 400, height = 150 }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#142131";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getCoords(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const isTouch = e.touches && e.touches[0];
    const x = ((isTouch ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = ((isTouch ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;
    return { x, y };
  }

  function start(e) {
    e.preventDefault();
    setDrawing(true);
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  }

  function stop() {
    if (!drawing) return;
    setDrawing(false);
    // Notifie le parent de la nouvelle signature (base64 PNG)
    if (onChange && hasContent) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    if (onChange) onChange(null);
  }

  return (
    <div>
      <div style={{ position: "relative", border: "2px dashed #cfd8e0", borderRadius: 8, background: "#fff", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={width} height={height}
          style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair", touchAction: "none" }}
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
        {!hasContent && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "#8a98a8", fontSize: 13, fontStyle: "italic" }}>
            ✍ Signez ici avec la souris ou le doigt
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
        <span style={{ color: "#8a98a8" }}>
          {hasContent ? "✓ Signature capturée" : "Vide"}
        </span>
        <button onClick={clear} style={{ background: "transparent", border: "none", color: "#e35d5b", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
          🗑 Effacer
        </button>
      </div>
    </div>
  );
}
