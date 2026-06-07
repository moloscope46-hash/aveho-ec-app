"use client";
// =============================================================
//  BottomSheet — Modal qui slide depuis le bas (0.61.3)
//  Touch-friendly, swipe to dismiss, backdrop
// =============================================================
import { useEffect, useState, useRef } from "react";

export function BottomSheet({ open, onClose, title, children, footer }) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function close() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose?.(); }, 250);
  }

  function handleTouchStart(e) {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }

  function handleTouchMove(e) {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && sheetRef.current) {
      currentY.current = dy;
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }

  function handleTouchEnd() {
    if (!sheetRef.current) return;
    if (currentY.current > 80) {
      close();
    } else {
      sheetRef.current.style.transform = "translateY(0)";
    }
    currentY.current = 0;
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes bsSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bsSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes bsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bsFadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div onClick={close} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        animation: closing ? "bsFadeOut 250ms ease-out forwards" : "bsFadeIn 250ms ease-out",
      }} />
      <div ref={sheetRef} style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1001,
        background: "#fff", borderRadius: "20px 20px 0 0",
        maxHeight: "90vh", overflowY: "auto",
        animation: closing ? "bsSlideDown 250ms ease-out forwards" : "bsSlideUp 300ms ease-out",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.20)",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
        transition: "transform 200ms ease-out",
      }}>
        {/* Handle drag */}
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          style={{ padding: "10px 0", textAlign: "center", cursor: "grab", touchAction: "none" }}>
          <div style={{ width: 40, height: 4, background: "#cfd8e0", borderRadius: 2, margin: "0 auto" }} />
        </div>
        {title && (
          <div style={{ padding: "0 20px 12px", borderBottom: "1px solid #f0f3f6" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#142131" }}>{title}</h3>
          </div>
        )}
        <div style={{ padding: 20 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f3f6", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
