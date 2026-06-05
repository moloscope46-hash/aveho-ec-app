"use client";
// =============================================================
//  OnboardingTour — Tour produit guidé pour nouveaux utilisateurs (0.58.26)
//
//  Maison (sans Driver.js externe pour éviter +50KB de bundle).
//  Implémente :
//   - Overlay semi-transparent avec spot lumineux sur l'élément ciblé
//   - Popover positionné automatiquement (top/bottom/left/right)
//   - Navigation Suivant / Précédent / Skip
//   - Progress dots
//   - Persistance localStorage (ne se relance pas si déjà vu)
//   - Smooth scroll vers l'élément si hors viewport
//
//  Usage :
//    import OnboardingTour from '@/components/OnboardingTour';
//
//    const steps = [
//      { target: '#topbar-menu', title: 'Le menu principal', content: '...', position: 'bottom' },
//      { target: '.kpi-tile:first-child', title: 'Vos KPIs', content: '...' },
//      { target: '#cmdk-trigger', title: 'Recherche rapide', content: 'Ctrl+K' },
//    ];
//
//    <OnboardingTour
//      steps={steps}
//      storageKey="av-tour-accueil"     // ne se relance pas si déjà vu
//      autoStart={true}
//    />
//
//  Skip global possible via localStorage.setItem('av-tour-' + key, 'done')
// =============================================================

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function OnboardingTour({
  steps = [],
  storageKey = "av-onboarding",
  autoStart = true,
  onComplete,
  onSkip,
}) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const popoverRef = useRef(null);

  // Mount + check si déjà vu
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(storageKey) === "done";
      if (!seen && autoStart) {
        // Petit délai pour laisser la page se rendre
        setTimeout(() => setActive(true), 600);
      }
    } catch {}
  }, [autoStart, storageKey]);

  // Quand step change : trouver l'élément ciblé et calculer son rect
  useEffect(() => {
    if (!active) return;
    const step = steps[stepIndex];
    if (!step) return;

    function updateRect() {
      const el = document.querySelector(step.target);
      if (!el) {
        setTargetRect(null);
        return;
      }
      // Scroll dans le viewport si nécessaire
      const rect = el.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Re-mesurer après le scroll
        setTimeout(updateRect, 400);
        return;
      }
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, stepIndex, steps]);

  function next() {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      complete();
    }
  }

  function prev() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  function complete() {
    setActive(false);
    try { localStorage.setItem(storageKey, "done"); } catch {}
    if (onComplete) onComplete();
  }

  function skip() {
    setActive(false);
    try { localStorage.setItem(storageKey, "done"); } catch {}
    if (onSkip) onSkip();
  }

  if (!mounted || !active || steps.length === 0) return null;
  const step = steps[stepIndex];
  if (!step) return null;

  // Position du popover
  const PADDING = 16;
  const POPOVER_WIDTH = 360;
  const POPOVER_OFFSET = 14;

  let popoverStyle = {
    position: "fixed",
    width: POPOVER_WIDTH,
    maxWidth: "calc(100vw - 32px)",
    zIndex: 100001,
  };

  if (targetRect) {
    const pos = step.position || "bottom";
    if (pos === "bottom") {
      popoverStyle.top = targetRect.top + targetRect.height + POPOVER_OFFSET;
      popoverStyle.left = Math.max(16, Math.min(
        targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2,
        window.innerWidth - POPOVER_WIDTH - 16
      ));
    } else if (pos === "top") {
      popoverStyle.bottom = window.innerHeight - targetRect.top + POPOVER_OFFSET;
      popoverStyle.left = Math.max(16, Math.min(
        targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2,
        window.innerWidth - POPOVER_WIDTH - 16
      ));
    } else if (pos === "right") {
      popoverStyle.top = Math.max(16, targetRect.top + targetRect.height / 2 - 60);
      popoverStyle.left = targetRect.left + targetRect.width + POPOVER_OFFSET;
    } else if (pos === "left") {
      popoverStyle.top = Math.max(16, targetRect.top + targetRect.height / 2 - 60);
      popoverStyle.right = window.innerWidth - targetRect.left + POPOVER_OFFSET;
    }
  } else {
    // Pas de target : popover centré
    popoverStyle.top = "50%";
    popoverStyle.left = "50%";
    popoverStyle.transform = "translate(-50%, -50%)";
  }

  return createPortal(
    <>
      {/* Overlay sombre avec spot lumineux sur la cible */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100000,
          pointerEvents: "auto",
          animation: "av-tour-overlay-in 280ms ease-out",
        }}
        onClick={skip}
      >
        {targetRect ? (
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <mask id="av-tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - PADDING}
                  y={targetRect.top - PADDING}
                  width={targetRect.width + PADDING * 2}
                  height={targetRect.height + PADDING * 2}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(13, 24, 34, 0.78)" mask="url(#av-tour-mask)" />
            {/* Highlight ring autour de la cible */}
            <rect
              x={targetRect.left - PADDING}
              y={targetRect.top - PADDING}
              width={targetRect.width + PADDING * 2}
              height={targetRect.height + PADDING * 2}
              rx="12"
              fill="none"
              stroke="rgba(124, 200, 200, 0.85)"
              strokeWidth="2"
              style={{ filter: "drop-shadow(0 0 12px rgba(124, 200, 200, 0.6))" }}
            />
          </svg>
        ) : (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(13, 24, 34, 0.78)",
          }} />
        )}
      </div>

      {/* Popover */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: "linear-gradient(180deg, rgba(20,33,49,0.97) 0%, rgba(13,24,34,0.97) 100%)",
          backdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(124, 200, 200, 0.25)",
          borderRadius: 16,
          padding: "20px 22px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.50), 0 0 60px rgba(124,200,200,0.18), 0 0 0 1px rgba(255,255,255,0.04) inset",
          color: "#fff",
          fontFamily: "var(--font-quicksand), 'Quicksand', sans-serif",
          animation: "av-tour-popover-in 320ms cubic-bezier(.2,.8,.2,1)",
        }}>
          {/* Eyebrow + step counter */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#7CC8C8",
              textTransform: "uppercase",
            }}>
              <i className="ti ti-route" style={{ marginRight: 4 }} />
              Visite guidée
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(191,230,230,0.7)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {stepIndex + 1} / {steps.length}
            </span>
          </div>

          {/* Title + content */}
          <h3 style={{
            margin: "0 0 8px",
            fontSize: 17,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}>
            {step.title}
          </h3>
          <p style={{
            margin: "0 0 18px",
            fontSize: 13.5,
            color: "rgba(220, 230, 235, 0.85)",
            lineHeight: 1.55,
          }}>
            {step.content}
          </p>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === stepIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 99,
                  background: i === stepIndex ? "#7CC8C8" : "rgba(124,200,200,0.25)",
                  transition: "width 250ms, background 250ms",
                  boxShadow: i === stepIndex ? "0 0 8px rgba(124,200,200,0.5)" : "none",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={skip}
              style={{
                background: "transparent",
                color: "rgba(191,230,230,0.6)",
                border: "none",
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "8px 4px",
                fontWeight: 600,
              }}
            >
              Passer
            </button>
            <div style={{ flex: 1 }} />
            {stepIndex > 0 && (
              <button
                onClick={prev}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#bfe6e6",
                  border: "1px solid rgba(124,200,200,0.25)",
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ← Précédent
              </button>
            )}
            <button
              onClick={next}
              style={{
                background: "linear-gradient(135deg, #7CC8C8 0%, #185FA5 100%)",
                color: "#fff",
                border: "none",
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(24,95,165,0.40), 0 0 16px rgba(124,200,200,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {stepIndex === steps.length - 1 ? "Terminer" : "Suivant"}
              <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
