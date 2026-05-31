"use client";
// =============================================================
//  OnboardingTour — Tour guidé première connexion
//  Alpha 0.46.0
//
//  Mini-tour léger natif (pas de lib externe). Highlight les
//  éléments clés de l'UI à la 1ère connexion via spotlight overlay.
//
//  Persistance : localStorage clé "aveho_onboarding_done"
//  - Skippable à tout moment
//  - Réactivable depuis /profil (bouton "Refaire le tour")
// =============================================================
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/useAuth";

// Alpha 0.49.0 : étapes par rôle
const BASE_STEPS = [
  {
    selector: ".menu-burger, [aria-label='Menu']",
    title: "Bienvenue sur Aveho EC ! 👋",
    content: "Voici le menu principal. Tu peux y accéder à toutes les sections : patients, matériel, commandes, statistiques…",
    placement: "bottom-start",
  },
  {
    selector: ".notif-btn, [aria-label='Notifications']",
    title: "Tes notifications",
    content: "Les nouvelles DI, signalements et alertes apparaissent ici en temps réel. Clique sur la cloche pour voir le détail.",
    placement: "bottom",
  },
  {
    selector: "[href='/accueil'], .logo",
    title: "Ton tableau de bord",
    content: "Reviens ici à tout moment pour voir tes KPIs et raccourcis personnalisés.",
    placement: "bottom",
  },
];

const ADMIN_STEPS = [
  {
    selector: ".version-badge",
    title: "Outils Administrateur",
    content: "En tant qu'admin, tu as accès au dashboard direction, à la performance SQL, aux webhooks et aux logs depuis le menu Administration.",
    placement: "bottom",
  },
];

const FINAL_STEP = {
  selector: "main, .wrap",
  title: "Tour terminé !",
  content: "Tu peux refaire ce tour à tout moment depuis ton profil. Bonne utilisation 🚀",
  placement: "center",
  isLast: true,
};

export default function OnboardingTour({ forceStart = false, onClose }) {
  const auth = useAuth();
  const [stepIdx, setStepIdx] = useState(-1);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);

  // Alpha 0.49.0 : étapes adaptées au rôle
  const isAdmin = auth?.role?.nom === "Administrateur" || auth?.can?.("gerer_roles");
  const TOUR_STEPS = [
    ...BASE_STEPS,
    ...(isAdmin ? ADMIN_STEPS : []),
    FINAL_STEP,
  ];

  useEffect(() => {
    // Vérifier si déjà fait
    if (forceStart) {
      setStepIdx(0);
      return;
    }
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("aveho_onboarding_done");
    if (!done) {
      // Attendre 1.5s que l'UI soit montée
      const t = setTimeout(() => setStepIdx(0), 1500);
      return () => clearTimeout(t);
    }
  }, [forceStart]);

  useEffect(() => {
    if (stepIdx < 0 || stepIdx >= TOUR_STEPS.length) return;
    const step = TOUR_STEPS[stepIdx];
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [stepIdx]);

  function finish() {
    if (typeof window !== "undefined") {
      localStorage.setItem("aveho_onboarding_done", "1");
    }
    setStepIdx(-1);
    onClose?.();
  }

  function next() {
    if (stepIdx >= TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStepIdx(stepIdx + 1);
    }
  }

  function prev() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  if (stepIdx < 0 || stepIdx >= TOUR_STEPS.length) return null;
  const step = TOUR_STEPS[stepIdx];
  const total = TOUR_STEPS.length;

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="tour-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        pointerEvents: "none",
      }}
    >
      {/* Overlay sombre */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(20, 33, 49, 0.75)",
        pointerEvents: "auto",
        cursor: "pointer",
      }} onClick={finish} />

      {/* Spotlight sur la target */}
      {targetRect && (
        <div style={{
          position: "absolute",
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(20, 33, 49, 0)",
          border: "3px solid #7CC8C8",
          pointerEvents: "none",
          animation: "tour-pulse 2s ease-in-out infinite",
        }} />
      )}

      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        style={{
          position: "absolute",
          top: step.placement === "center" || !targetRect ? "50%" : targetRect.top + targetRect.height + 20,
          left: step.placement === "center" || !targetRect ? "50%" : Math.max(20, targetRect.left),
          transform: step.placement === "center" || !targetRect ? "translate(-50%, -50%)" : "none",
          maxWidth: 380,
          minWidth: 280,
          background: "#fff",
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          pointerEvents: "auto",
          color: "#142131",
        }}
      >
        <div style={{ fontSize: 11, color: "#7CC8C8", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
          ÉTAPE {stepIdx + 1} / {total}
        </div>
        <h3 id="tour-title" style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#142131" }}>
          {step.title}
        </h3>
        <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "#2a3a48", lineHeight: 1.5 }}>
          {step.content}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button
            onClick={finish}
            style={{
              background: "transparent", border: "none",
              color: "#8a98a8", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12,
              padding: "8px 0",
            }}
            aria-label="Passer le tour"
          >
            Passer le tour
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {stepIdx > 0 && (
              <button
                onClick={prev}
                style={{
                  background: "#f4f7fa", border: "1px solid #e3e9ee",
                  color: "#142131", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                  padding: "8px 14px", borderRadius: 6,
                }}
                aria-label="Étape précédente"
              >
                <i className="ti ti-chevron-left" aria-hidden="true" /> Précédent
              </button>
            )}
            <button
              onClick={next}
              style={{
                background: "#185FA5", border: "none",
                color: "#fff", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                padding: "8px 16px", borderRadius: 6,
              }}
              aria-label={step.isLast ? "Terminer" : "Étape suivante"}
            >
              {step.isLast ? "Terminer" : <>Suivant <i className="ti ti-chevron-right" aria-hidden="true" /></>}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 9999px rgba(20, 33, 49, 0.75), 0 0 0 4px rgba(124, 200, 200, 0.4); }
          50% { box-shadow: 0 0 0 9999px rgba(20, 33, 49, 0.75), 0 0 0 12px rgba(124, 200, 200, 0); }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper pour relancer le tour depuis /profil
 */
export function resetOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("aveho_onboarding_done");
  }
}
