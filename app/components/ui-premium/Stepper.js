"use client";
// =============================================================
//  Stepper — Wizard multi-étapes avec progression (0.58.13)
//
//  Affiche une barre de progression horizontale avec N étapes
//  (numéro, label, optional sub-label). Étapes complétées en teal,
//  étape active en navy avec glow, étapes à venir en gris.
//
//  Usage :
//    const [step, setStep] = useState(0);
//    <Stepper
//      active={step}
//      onStepClick={setStep}      // optionnel : permet click pour revenir
//      steps={[
//        { label: "Informations", sub: "Identité & coordonnées" },
//        { label: "Adresse",      sub: "Domicile" },
//        { label: "Couverture",   sub: "AMO + AMC" },
//        { label: "Validation",   sub: "Récapitulatif" },
//      ]}
//    />
//
//  + Stepper.Body : conteneur du contenu de l'étape active (avec animation)
//  + Stepper.Footer : actions précédent/suivant standardisées
// =============================================================

import { useEffect, useRef } from "react";

export default function Stepper({
  active = 0,
  steps = [],
  onStepClick,
  variant = "horizontal",  // 'horizontal' | 'vertical' (vertical = futur, pour l'instant horizontal only)
  allowSkipForward = false, // si true, on peut cliquer sur n'importe quelle étape
  size = "md",
}) {
  const sizes = {
    sm: { circle: 28, fontSize: 12,  numberSize: 12 },
    md: { circle: 32, fontSize: 13,  numberSize: 13 },
    lg: { circle: 36, fontSize: 14,  numberSize: 14 },
  };
  const sz = sizes[size] || sizes.md;

  function clickStep(i) {
    if (!onStepClick) return;
    // Par défaut on ne peut que reculer (sauf si allowSkipForward)
    if (i < active || allowSkipForward) {
      onStepClick(i);
    }
  }

  return (
    <div
      role="navigation"
      aria-label="Progression du formulaire"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        width: "100%",
        padding: "8px 4px 14px",
      }}
    >
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active;
        const future = i > active;
        const clickable = !!onStepClick && (i < active || allowSkipForward);

        // Cercle
        const circleBg = done
          ? "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)"
          : current
            ? "linear-gradient(135deg, #142131 0%, #243044 100%)"
            : "var(--av-g100, #f4f7fa)";
        const circleColor = future ? "var(--av-g500, #8a98a8)" : "#fff";
        const circleBorder = future ? "1.5px solid var(--av-g200, #e3e9ee)" : "none";

        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {/* Trait connecteur (pas pour la dernière étape) */}
            {i < steps.length - 1 && (
              <div style={{
                position: "absolute",
                top: sz.circle / 2 - 1,
                left: "50%",
                right: "-50%",
                height: 2,
                background: done
                  ? "linear-gradient(90deg, #7CC8C8 0%, #5db5b5 100%)"
                  : "var(--av-g200, #e3e9ee)",
                zIndex: 0,
                transition: "background 300ms",
              }} />
            )}

            {/* Cercle */}
            <button
              type="button"
              onClick={() => clickStep(i)}
              disabled={!clickable}
              aria-current={current ? "step" : undefined}
              aria-label={`Étape ${i + 1} : ${step.label}`}
              style={{
                width: sz.circle,
                height: sz.circle,
                borderRadius: "50%",
                background: circleBg,
                color: circleColor,
                border: circleBorder,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: sz.numberSize,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: clickable ? "pointer" : "default",
                position: "relative",
                zIndex: 1,
                transition: "all 250ms cubic-bezier(.2,.8,.2,1)",
                boxShadow: current
                  ? "0 0 0 4px rgba(20,33,49,.10), 0 4px 10px rgba(20,33,49,.20)"
                  : done
                    ? "0 2px 6px rgba(124,200,200,.30)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (clickable) {
                  e.currentTarget.style.transform = "scale(1.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {done
                ? <i className="ti ti-check" style={{ fontSize: sz.numberSize + 2 }} />
                : i + 1}
            </button>

            {/* Label */}
            <div style={{
              marginTop: 8,
              textAlign: "center",
              maxWidth: "100%",
            }}>
              <div style={{
                fontSize: sz.fontSize,
                fontWeight: current ? 700 : (done ? 600 : 500),
                color: current
                  ? "var(--av-navy, #142131)"
                  : done
                    ? "#4a5868"
                    : "var(--av-g500, #8a98a8)",
                lineHeight: 1.3,
                transition: "color 250ms",
              }}>
                {step.label}
              </div>
              {step.sub && (
                <div style={{
                  fontSize: sz.fontSize - 2,
                  color: "var(--av-g500, #8a98a8)",
                  marginTop: 2,
                  fontWeight: 400,
                  lineHeight: 1.2,
                  letterSpacing: "-.01em",
                }}>
                  {step.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================
//  Stepper.Body — Contenu de l'étape active avec animation
// =============================================================
export function StepperBody({ active, children }) {
  return (
    <div
      key={active}
      style={{
        animation: "av-tab-slide-in 300ms cubic-bezier(.2,.8,.2,1)",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// =============================================================
//  Stepper.Footer — Actions précédent/suivant standardisées
// =============================================================
export function StepperFooter({
  active,
  total,
  onPrev,
  onNext,
  onSubmit,
  prevLabel = "Précédent",
  nextLabel = "Suivant",
  submitLabel = "Valider",
  nextDisabled = false,
  busy = false,
}) {
  const isFirst = active === 0;
  const isLast = active === total - 1;

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginTop: 20,
      paddingTop: 16,
      borderTop: "1px solid var(--av-g200, #e3e9ee)",
    }}>
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst || busy}
        style={{
          padding: "9px 18px",
          borderRadius: 10,
          border: "1px solid var(--av-g200, #e3e9ee)",
          background: "var(--av-g0, #fff)",
          color: "var(--av-g700, #4a5868)",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          cursor: (isFirst || busy) ? "not-allowed" : "pointer",
          opacity: (isFirst || busy) ? 0.5 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <i className="ti ti-arrow-left" />
        {prevLabel}
      </button>

      {/* Indicateur d'étape au milieu */}
      <div style={{
        fontSize: 12,
        color: "var(--av-g500, #8a98a8)",
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
      }}>
        Étape <b style={{ color: "var(--av-navy, #142131)" }}>{active + 1}</b> sur <b style={{ color: "var(--av-navy, #142131)" }}>{total}</b>
      </div>

      <button
        type="button"
        onClick={isLast ? onSubmit : onNext}
        disabled={nextDisabled || busy}
        style={{
          padding: "9px 20px",
          borderRadius: 10,
          border: "none",
          background: (nextDisabled || busy)
            ? "var(--av-g200, #e3e9ee)"
            : isLast
              ? "linear-gradient(135deg, #5aa05a 0%, #3e8540 100%)"
              : "linear-gradient(135deg, #7CC8C8 0%, #5db5b5 100%)",
          color: (nextDisabled || busy) ? "var(--av-g500, #8a98a8)" : "#fff",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 700,
          cursor: (nextDisabled || busy) ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: !(nextDisabled || busy)
            ? (isLast ? "0 4px 10px rgba(90,160,90,.40)" : "0 4px 10px rgba(124,200,200,.40)")
            : "none",
        }}
      >
        {busy ? "…" : (isLast ? submitLabel : nextLabel)}
        {!isLast && <i className="ti ti-arrow-right" />}
        {isLast && <i className="ti ti-check" />}
      </button>
    </div>
  );
}

// Sub-exports en propriété sur Stepper
Stepper.Body = StepperBody;
Stepper.Footer = StepperFooter;
