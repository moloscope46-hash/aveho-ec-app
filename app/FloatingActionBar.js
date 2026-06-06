"use client";
// =============================================================
//  app/FloatingActionBar.js (0.58.35)
//
//  0.58.35 : repositionné à DROITE, bouton principal en bulle pleine
//   teal (plus d'icône hamburger). Les 3 raccourcis glissent vers la
//   gauche en s'ouvrant.
//
//  0.58.56 : option openInPopup par raccourci — ouvre l'URL dans
//   un iframe plein écran avec bouton retour, sans naviguer la page.
//
//  0.56.17 historique : guard hydration (mounted state) pour éviter
//  les hydration mismatch React #418/#423 entre SSR/CSR (conservé).
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
  // 0.58.56 : URL ouverte en popup (null = pas de popup)
  const [popupUrl, setPopupUrl] = useState(null);
  const [popupLabel, setPopupLabel] = useState("");

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

  // 0.58.56 : navigate adapté au mode popup
  function navigate(s) {
    setOpen(false);
    if (!s?.url) return;
    if (s.openInPopup) {
      // Mode popup : ouvre une overlay plein écran avec iframe
      setPopupLabel(s.label || "");
      setPopupUrl(s.url);
    } else {
      // Mode classique : navigation normale
      router.push(s.url);
    }
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

      {/* 0.58.35 : container fixed top-RIGHT (était top-left avant) */}
      <div
        className="av-shortcuts-bar"
        style={{
          position: "fixed",
          top: "calc(74px + env(safe-area-inset-top, 0px))",
          right: 16,
          zIndex: 9991,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexDirection: "row-reverse",  // 0.58.35 : inverse l'ordre pour que les bulles glissent vers la gauche
        }}
        role="navigation"
        aria-label="Raccourcis rapides"
      >
        {/* Bouton principal : bulle pleine teal (plus d'icône hamburger) */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fermer les raccourcis" : "Ouvrir les raccourcis"}
          aria-expanded={open}
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",  // 0.58.35 : cercle pur (était 16px arrondi)
            background: open
              ? "linear-gradient(135deg, #142131, #243044)"
              : "linear-gradient(135deg, #7CC8C8, #5da8a8)",  // 0.58.35 : teal Aveho au lieu de navy avec hamburger
            color: "#fff",
            border: "2px solid rgba(255,255,255,.30)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            boxShadow: open
              ? "0 8px 24px rgba(20,33,49,.40), 0 0 20px rgba(124,200,200,.45)"
              : "0 6px 20px rgba(124,200,200,.50), 0 0 0 1px rgba(255,255,255,.10) inset",
            transition: "all 280ms cubic-bezier(.34, 1.56, .64, 1)",
            transform: open ? "rotate(180deg) scale(1.05)" : "rotate(0deg) scale(1)",
            fontFamily: "inherit",
            padding: 0,
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (!open) {
              e.currentTarget.style.transform = "scale(1.10)";
              e.currentTarget.style.boxShadow = "0 8px 28px rgba(124,200,200,.65), 0 0 0 2px rgba(255,255,255,.20) inset";
            }
          }}
          onMouseLeave={(e) => {
            if (!open) {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(124,200,200,.50), 0 0 0 1px rgba(255,255,255,.10) inset";
            }
          }}
        >
          {/* 0.58.35 : pulse halo si fermé pour attirer l'œil */}
          {!open && (
            <span style={{
              position: "absolute",
              inset: -3,
              borderRadius: "50%",
              border: "2px solid rgba(124,200,200,.60)",
              animation: "av-fab-pulse 2s ease-out infinite",
              pointerEvents: "none",
            }} />
          )}
          <i className={`ti ${open ? "ti-x" : "ti-sparkles"}`} />
        </button>

        {shortcuts.map((s, idx) => (
          <button
            key={s.id || idx}
            onClick={() => navigate(s)}
            aria-label={s.label}
            title={s.label}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",  // 0.58.35 : cercles purs (uniformité avec le bouton principal)
              background: s.gradient || `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
              color: "#fff",
              border: "2px solid rgba(255,255,255,.20)",
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
              // 0.58.35 : bulles glissent vers la GAUCHE (translateX +20px → 0)
              transform: open ? "translateX(0) scale(1)" : "translateX(20px) scale(0.6)",
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
            {/* 0.58.35 : tooltip à GAUCHE de la bulle (puisque le menu est à droite de l'écran) */}
            <span style={{
              position: "absolute",
              right: "calc(100% + 8px)",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(20, 33, 49, 0.92)",
              color: "#fff",
              padding: "4px 10px",
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
        @keyframes av-fab-pulse {
          0% { transform: scale(1); opacity: 0.7; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes av-popup-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .av-shortcuts-bar {
            top: calc(66px + env(safe-area-inset-top, 0px)) !important;
          }
        }
      `}</style>

      {/* 0.58.56 : overlay popup plein écran pour les raccourcis avec openInPopup */}
      {popupUrl && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(13, 24, 34, 0.92)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          animation: "av-popup-fade-in 200ms ease-out",
        }}>
          {/* Header avec bouton retour */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "linear-gradient(135deg, #142131, #2a3850)",
            borderBottom: "1px solid rgba(124,200,200,.25)",
            boxShadow: "0 4px 12px rgba(0,0,0,.30)",
          }}>
            <button
              onClick={() => { setPopupUrl(null); setPopupLabel(""); }}
              style={{
                background: "rgba(124,200,200,.15)",
                color: "#7CC8C8",
                border: "1px solid rgba(124,200,200,.35)",
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="ti ti-arrow-left" /> Retour
            </button>
            <div style={{ flex: 1, color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>
              <i className="ti ti-window-maximize" style={{ marginRight: 6, color: "#7CC8C8" }} />
              {popupLabel || "Raccourci"}
            </div>
            <button
              onClick={() => { setPopupUrl(null); setPopupLabel(""); router.push(popupUrl); }}
              style={{
                background: "transparent",
                color: "#bfe6e6",
                border: "1px solid rgba(124,200,200,.20)",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              title="Ouvrir cette page dans le navigateur (mode normal)"
            >
              <i className="ti ti-external-link" /> Ouvrir en plein écran
            </button>
          </div>
          {/* iframe plein écran */}
          <iframe
            src={popupUrl}
            title={popupLabel || "Raccourci"}
            style={{
              flex: 1,
              width: "100%",
              border: "none",
              background: "#fff",
            }}
          />
        </div>
      )}
    </>
  );
}
