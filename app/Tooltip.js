"use client";
// =============================================================
//  Tooltip — Petite bulle d'info au survol / au tap
//  Alpha 0.16.0 : pour les fiches détaillées (patient, matériel...)
//
//  Usage :
//    <Tooltip content="Infos détaillées en bulle">
//      <span>Survole-moi</span>
//    </Tooltip>
//
//  Sur mobile : tap pour ouvrir, tap ailleurs pour fermer.
//  Sur desktop : ouvre au hover, ferme au mouseleave.
// =============================================================
import { useEffect, useRef, useState } from "react";

export default function Tooltip({ children, content, side = "top" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <span
      ref={ref}
      className="tt-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
    >
      {children}
      {open && content && (
        <span className={`tt-bubble tt-${side}`} onClick={(e) => e.stopPropagation()}>
          {content}
        </span>
      )}
    </span>
  );
}
