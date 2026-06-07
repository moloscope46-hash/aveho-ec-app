"use client";
// =============================================================
//  MagasinFab — Floating Action Button magasin (0.62.9)
//  Création rapide : article catalogue / mercuriale / tournée
// =============================================================
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useViewMode } from "../../lib/useViewMode";

const ACTIONS = [
  { ic: "ti-package", lbl: "Nouvel article", col: "#185FA5", path: "/magasin/catalogue?new=1" },
  { ic: "ti-file-text", lbl: "Nouvelle mercuriale", col: "#7a6fb0", path: "/magasin/mercuriales?new=1" },
  { ic: "ti-route", lbl: "Nouvelle tournée", col: "#EF9F27", path: "/magasin/tournees/nouvelle" },
  { ic: "ti-shopping-cart-plus", lbl: "Nouvelle offre marketplace", col: "#5a8f8f", path: "/magasin/marketplace?new=1" },
];

export function MagasinFab() {
  const router = useRouter();
  const viewMode = useViewMode();
  const [open, setOpen] = useState(false);

  if (!viewMode.ready || !viewMode.isMagasin) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(20,33,49,.4)",
          zIndex: 9998, animation: "fab-fade-in .15s ease",
        }} />
      )}

      {/* Actions déployées */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 20,
          display: "flex", flexDirection: "column", gap: 10,
          zIndex: 9999, alignItems: "flex-end",
        }}>
          {ACTIONS.map((a, i) => (
            <button key={a.path} onClick={() => { router.push(a.path); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#fff", border: "none", borderRadius: 28,
              padding: "10px 18px 10px 14px", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,.18)",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              color: a.col,
              animation: `fab-slide-in .2s ${i * 0.05}s ease backwards`,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: "50%",
                background: a.col, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}><i className={`ti ${a.ic}`} /></span>
              {a.lbl}
            </button>
          ))}
        </div>
      )}

      {/* Bouton FAB principal */}
      <button onClick={() => setOpen(!open)} style={{
        position: "fixed", bottom: 20, right: 20,
        width: 60, height: 60, borderRadius: "50%",
        background: open ? "#142131" : "linear-gradient(135deg,#5a8f8f,#3a6f6f)",
        color: "#fff", border: "none", cursor: "pointer",
        boxShadow: "0 6px 16px rgba(0,0,0,.25)",
        fontSize: 24, zIndex: 10000,
        transform: open ? "rotate(45deg)" : "none",
        transition: "transform .2s, background .2s",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "inherit",
      }} aria-label={open ? "Fermer menu" : "Création rapide"}>
        <i className="ti ti-plus" />
      </button>

      <style jsx global>{`
        @keyframes fab-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fab-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
