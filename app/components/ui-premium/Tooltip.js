"use client";
// =============================================================
//  Tooltip — Tooltip premium au hover (0.58.14)
//
//  Wrapper qui ajoute un tooltip stylé au hover/focus sur n'importe
//  quel enfant. Auto-positionne pour éviter les débordements de
//  viewport.
//
//  Usage :
//    <Tooltip content="Supprimer cet item">
//      <button><i className="ti ti-trash" /></button>
//    </Tooltip>
//
//    <Tooltip content="Action complexe à expliquer" position="bottom" delay={600} maxWidth={280}>
//      <span className="info">?</span>
//    </Tooltip>
//
//  Props :
//    content   : JSX/string du contenu
//    position  : top | bottom | left | right (défaut top, auto-ajusté si débord)
//    delay     : ms avant apparition (défaut 400)
//    maxWidth  : px (défaut 240)
//    arrow     : afficher la flèche (défaut true)
//    disabled  : désactive le tooltip
// =============================================================

import { useState, useRef, useEffect, useId } from "react";

export default function Tooltip({
  content,
  children,
  position = "top",
  delay = 400,
  maxWidth = 240,
  arrow = true,
  disabled = false,
  className,
  style,
}) {
  const [visible, setVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const reactId = useId();
  const tooltipId = `av-tooltip-${reactId.replace(/:/g, "-")}`;

  function show() {
    if (disabled || !content) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  // Calcul position après render visible
  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    let pos = position;
    let top = 0, left = 0;

    function computeFor(p) {
      switch (p) {
        case "top":
          return {
            top: trigger.top - tooltip.height - margin,
            left: trigger.left + (trigger.width - tooltip.width) / 2,
          };
        case "bottom":
          return {
            top: trigger.bottom + margin,
            left: trigger.left + (trigger.width - tooltip.width) / 2,
          };
        case "left":
          return {
            top: trigger.top + (trigger.height - tooltip.height) / 2,
            left: trigger.left - tooltip.width - margin,
          };
        case "right":
          return {
            top: trigger.top + (trigger.height - tooltip.height) / 2,
            left: trigger.right + margin,
          };
        default:
          return { top: 0, left: 0 };
      }
    }

    let p = computeFor(pos);

    // Auto-flip si débordement
    const overflowsTop = p.top < margin;
    const overflowsBottom = p.top + tooltip.height > vh - margin;
    const overflowsLeft = p.left < margin;
    const overflowsRight = p.left + tooltip.width > vw - margin;

    if (pos === "top" && overflowsTop) { pos = "bottom"; p = computeFor("bottom"); }
    else if (pos === "bottom" && overflowsBottom) { pos = "top"; p = computeFor("top"); }
    else if (pos === "left" && overflowsLeft) { pos = "right"; p = computeFor("right"); }
    else if (pos === "right" && overflowsRight) { pos = "left"; p = computeFor("left"); }

    // Clamp left/right pour éviter horizontaux
    if (p.left < margin) p.left = margin;
    if (p.left + tooltip.width > vw - margin) p.left = vw - tooltip.width - margin;

    top = p.top;
    left = p.left;
    setActualPosition(pos);
    setCoords({ top, left });
  }, [visible, position, content]);

  // Cleanup timeout
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Arrow CSS selon position effective
  function renderArrow() {
    if (!arrow) return null;
    const arrowSize = 6;
    const arrowColor = "#142131";
    const baseStyle = {
      position: "absolute",
      width: 0,
      height: 0,
    };
    switch (actualPosition) {
      case "top":
        return <div style={{
          ...baseStyle,
          bottom: -arrowSize + 1,
          left: "50%",
          marginLeft: -arrowSize,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid ${arrowColor}`,
        }} />;
      case "bottom":
        return <div style={{
          ...baseStyle,
          top: -arrowSize + 1,
          left: "50%",
          marginLeft: -arrowSize,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid ${arrowColor}`,
        }} />;
      case "left":
        return <div style={{
          ...baseStyle,
          right: -arrowSize + 1,
          top: "50%",
          marginTop: -arrowSize,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid ${arrowColor}`,
        }} />;
      case "right":
        return <div style={{
          ...baseStyle,
          left: -arrowSize + 1,
          top: "50%",
          marginTop: -arrowSize,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid ${arrowColor}`,
        }} />;
      default:
        return null;
    }
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={visible ? tooltipId : undefined}
        className={className}
        style={{ display: "inline-block", ...style }}
      >
        {children}
      </span>
      {visible && content && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            background: "#142131",
            color: "#fff",
            padding: "7px 11px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-quicksand), 'Quicksand', 'Segoe UI', sans-serif",
            lineHeight: 1.45,
            maxWidth,
            boxShadow: "0 10px 25px rgba(20,33,49,.30), 0 4px 8px rgba(20,33,49,.20)",
            pointerEvents: "none",
            animation: "av-tooltip-in 200ms cubic-bezier(.2,.8,.2,1)",
            willChange: "opacity, transform",
          }}
        >
          {content}
          {renderArrow()}
        </div>
      )}
    </>
  );
}
