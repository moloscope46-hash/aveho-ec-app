"use client";
// =============================================================
//  app/FloatingActionBar.js (0.58.31)
//
//  REFONTE : ancienne barre 3 bulles en pied de page → bouton menu
//  en HAUT-GAUCHE qui se déplie horizontalement vers la droite
//  avec les 3 raccourcis configurables (via /profil).
//
//  - Bouton hamburger fixed top-left (sous TopBar)
//  - Au clic : 3 bulles glissent vers la droite avec animation séquentielle
//  - Chaque bulle = url + label + icon + gradient configurable
//  - Config lue depuis lib/shortcutsConfig (localStorage)
//  - Sync via event "av-shortcuts-config-change"
//  - Esc / clic ailleurs / changement de page = ferme
// =============================================================

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getShortcutsConfig, DEFAULT_SHORTCUTS } from "../lib/shortcutsConfig";

export default function FloatingActionBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);

  useEffect(() => {
    setMounted(true);
    setShortcuts(getShortcutsConfig());
  }, []);

  useEffect(() => {
    function onConfigChange(e) {
      setShortcuts(e?.detail?.shortcuts || getShortcutsConfig());
    }
    window.addEventListener("av-shortcuts-config-change", onConfigChange);
    return () => window.removeEventListener("av-shortcuts-config-change", onConfigChange);
  }, []);

  const HIDDEN_PATHS = ["/login", "/inscription", "/presentation"];
  const isHidden = HIDDEN_PATHS.some((p) => pathname?.startsWith(p));

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    function handleEsc(e) { if (e.key === "Escape") setOpen(false); }
    if (open) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  if (isHidden || !mounted) return null;

  function navigate(url) {
    setOpen(false);
    if (url) router.push(url);
  }

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9990, background: "transparent" }}
          aria-hidden="true"
        />
      )}

      <div
        className="av-shortcuts-bar"
        style={{
          position: "fixed",
          top: "calc(74px + env(safe-area-inset-top, 0px))",
          left: 16,
          zIndex: 9991,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
        role="navigation"
        aria-label="Raccourcis rapides"
      >
        <button
          onClick={() => setOpen(!open)}
          aria-label="Ouvrir les raccourcis"
          aria-expanded={open}
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: open
              ? "linear-gradient(135deg, #142131, #243044)"
              : "linear-gradient(135deg, #2a3a52, #142131)",
            color: "#fff",
            border: "1px solid rgba(124,200,200,.20)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: open
              ? "0 8px 24px rgba(20,33,49,.40), 0 0 24px rgba(124,200,200,.30)"
              : "0 6px 18px rgba(20,33,49,.30)",
            transition: "all 220ms cubic-bezier(.2,.8,.2,1)",
            transform: open ? "scale(1.05)" : "scale(1)",
            fontFamily: "inherit",
            padding: 0,
          }}
          onMouseEnter={(e) => { if (!open) e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.transform = "scale(1)"; }}
        >
          <i className={`ti ${open ? "ti-x" : "ti-menu-2"}`} />
        </button>

        {shortcuts.map((s, idx) => (
          <button
            key={s.id || idx}
            onClick={() => navigate(s.url)}
            aria-label={s.label}
            title={s.label}
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: s.gradient || `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
              color: "#fff",
              border: "1px solid rgba(255,255,255,.18)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: `0 6px 18px ${s.color}55, 0 0 0 1px rgba(255,255,255,.10) inset`,
              fontFamily: "inherit",
              padding: 0,
              opacity: open ? 1 : 0,
              transform: open ? "translateX(0) scale(1)" : "translateX(-20px) scale(0.6)",
              pointerEvents: open ? "auto" : "none",
              transition: `opacity 240ms ${idx * 60}ms ease-out, transform 320ms ${idx * 60}ms cubic-bezier(.34, 1.56, .64, 1)`,
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (open) {
                e.currentTarget.style.transform = "translateX(0) scale(1.10)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}80, 0 0 0 2px rgba(255,255,255,.20) inset`;
              }
            }}
            onMouseLeave={(e) => {
              if (open) {
                e.currentTarget.style.transform = "translateX(0) scale(1)";
                e.currentTarget.style.boxShadow = `0 6px 18px ${s.color}55, 0 0 0 1px rgba(255,255,255,.10) inset`;
              }
            }}
          >
            <i className={`ti ${s.icon}`} />
            <span style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20, 33, 49, 0.92)",
              color: "#fff",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity 150ms",
              boxShadow: "0 2px 8px rgba(0,0,0,.20)",
            }} className="av-shortcut-tooltip">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <style jsx global>{`
        .av-shortcuts-bar button:hover .av-shortcut-tooltip {
          opacity: 1;
        }
        @media (max-width: 768px) {
          .av-shortcuts-bar {
            top: calc(66px + env(safe-area-inset-top, 0px)) !important;
          }
        }
      `}</style>
    </>
  );
}
