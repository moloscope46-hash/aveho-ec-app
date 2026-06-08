"use client";
// =============================================================
// ShareButtonFloating - 0.65.17
// Bouton de partage flottant au MILIEU PILE POIL entre BackButton et FAB
// =============================================================
import { useState } from "react";

export default function ShareButtonFloating() {
  const [feedback, setFeedback] = useState(null);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = typeof document !== "undefined" ? document.title : "Aveho EC";
    // Try Web Share API (mobile native)
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
        // fallback to clipboard
      }
    }
    // Fallback : copier dans presse-papier
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Lien copié ! 📋");
      setTimeout(() => setFeedback(null), 2000);
    } catch {
      setFeedback("Impossible de partager");
      setTimeout(() => setFeedback(null), 2000);
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        title="Partager cette page"
        aria-label="Partager cette page"
        className="av-share-floating"
        style={{
          position: "fixed",
          bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 95,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #7CC8C8, #5e4a8c)",
          color: "#fff",
          border: "1.5px solid rgba(255,255,255,.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontFamily: "Quicksand, sans-serif",
          boxShadow: "0 6px 20px rgba(124, 200, 200, .4), 0 2px 6px rgba(0,0,0,.2)",
          backdropFilter: "blur(8px)",
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1.08)";
          e.currentTarget.style.boxShadow = "0 10px 28px rgba(124, 200, 200, .55), 0 2px 6px rgba(0,0,0,.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(124, 200, 200, .4), 0 2px 6px rgba(0,0,0,.2)";
        }}
      >
        <i className="ti ti-share" />
      </button>

      {feedback && (
        <div style={{
          position: "fixed",
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(20, 33, 49, 0.95)",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.3,
          zIndex: 96,
          boxShadow: "0 4px 16px rgba(0,0,0,.3)",
          fontFamily: "Quicksand, sans-serif",
          backdropFilter: "blur(8px)",
          animation: "av-share-toast-in 250ms ease-out",
          whiteSpace: "nowrap",
        }}>
          {feedback}
        </div>
      )}

      <style jsx global>{`
        @keyframes av-share-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}
