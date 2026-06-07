"use client";
// =============================================================
//  SwipeableCard — Card avec swipe actions (0.61.8)
//  Swipe gauche = action 1 (rouge / delete), swipe droite = action 2 (vert / archive)
// =============================================================
import { useState, useRef } from "react";
import { haptic, HAPTIC } from "../../lib/uxUtils";

export function SwipeableCard({
  children, onSwipeLeft, onSwipeRight,
  leftLabel = "Supprimer", leftIcon = "ti-trash", leftColor = "#e35d5b",
  rightLabel = "Archiver", rightIcon = "ti-archive", rightColor = "#5aa05a",
  threshold = 80, disabled = false,
}) {
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  function handleStart(e) {
    if (disabled) return;
    startX.current = (e.touches?.[0]?.clientX) ?? e.clientX ?? 0;
    dragging.current = true;
  }
  function handleMove(e) {
    if (!dragging.current || disabled) return;
    const x = (e.touches?.[0]?.clientX) ?? e.clientX ?? 0;
    const delta = x - startX.current;
    // Limite le déplacement
    const limited = Math.max(-150, Math.min(150, delta));
    setDragX(limited);
  }
  function handleEnd() {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(dragX) >= threshold) {
      haptic(HAPTIC.medium);
      setAnimating(true);
      const dir = dragX > 0 ? "right" : "left";
      setDragX(dragX > 0 ? 300 : -300);
      setTimeout(() => {
        if (dir === "right") onSwipeRight?.();
        else onSwipeLeft?.();
        setDragX(0);
        setAnimating(false);
      }, 200);
    } else {
      setAnimating(true);
      setDragX(0);
      setTimeout(() => setAnimating(false), 200);
    }
  }

  const progress = Math.min(1, Math.abs(dragX) / threshold);

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}>
      {/* Background gauche (révélé en swipe droit) */}
      {dragX > 0 && (
        <div style={{
          position: "absolute", inset: 0, background: rightColor, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "0 20px",
          opacity: progress, fontSize: 14, fontWeight: 700,
        }}>
          <i className={`ti ${rightIcon}`} style={{ fontSize: 22, marginRight: 8 }} />
          {rightLabel}
        </div>
      )}
      {/* Background droite (révélé en swipe gauche) */}
      {dragX < 0 && (
        <div style={{
          position: "absolute", inset: 0, background: leftColor, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px",
          opacity: progress, fontSize: 14, fontWeight: 700,
        }}>
          {leftLabel}
          <i className={`ti ${leftIcon}`} style={{ fontSize: 22, marginLeft: 8 }} />
        </div>
      )}
      {/* Contenu draggable */}
      <div
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: animating ? "transform 200ms ease-out" : "none",
          touchAction: "pan-y",
          cursor: dragging.current ? "grabbing" : "grab",
          userSelect: "none",
        }}>
        {children}
      </div>
    </div>
  );
}
