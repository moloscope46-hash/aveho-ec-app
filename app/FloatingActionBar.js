"use client";
// =============================================================
//  app/FloatingActionBar.js (Alpha 0.56.16)
//
//  Barre d'actions flottante en bas de l'écran (mobile + desktop).
//  3 bulles : Scan/OCR (popup 3 options), Mon étab (raccourci direct),
//  Commande (popup 2 options).
//
//  Design : glassmorphism, animations fluides, accessible.
// =============================================================

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function FloatingActionBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(null); // null | "scan" | "commande"
  const [mounted, setMounted] = useState(false);

  // 0.56.17 : éviter les hydration mismatch SSR/CSR — on attend le mount
  // côté client avant de rendre la barre (sinon erreurs React #418/#423)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pages où la barre est masquée
  const HIDDEN_PATHS = ["/login", "/inscription", "/presentation"];
  const isHidden = HIDDEN_PATHS.some(p => pathname?.startsWith(p));

  // Fermer le menu au changement de page
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  // ESC pour fermer
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    if (openMenu) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [openMenu]);

  if (isHidden || !mounted) return null;

  function navigate(url) {
    setOpenMenu(null);
    router.push(url);
  }

  return (
    <>
      {/* Backdrop pour les popups */}
      {openMenu && (
        <div
          onClick={() => setOpenMenu(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 998,
            background: "rgba(20,33,49,.55)",
            backdropFilter: "blur(3px)",
            animation: "fab-fade-in 0.18s ease-out",
          }}
        />
      )}

      {/* Popup Scan/OCR */}
      {openMenu === "scan" && (
        <PopupMenu
          title="Scanner / OCR"
          color="#5a4a90"
          icon="ti-scan"
          onClose={() => setOpenMenu(null)}
          actions={[
            {
              icon: "ti-file-scan",
              color: "#5aa05a",
              label: "Créer un patient",
              sub: "Depuis un bulletin de situation",
              onClick: () => navigate("/scan/bulletin-situation"),
            },
            {
              icon: "ti-prescription",
              color: "#5a4a90",
              label: "Lire ordonnance",
              sub: "OCR + parsing prescriptions",
              onClick: () => navigate("/scan/prescription"),
            },
            {
              icon: "ti-barcode",
              color: "#185FA5",
              label: "Scanner code-barre",
              sub: "Matériel, médicament, BL",
              onClick: () => navigate("/scan/codebarre"),
            },
            {
              icon: "ti-qrcode",
              color: "#7a6fb0",
              label: "Scanner QR code",
              sub: "Carte Vitale, étiquettes",
              onClick: () => navigate("/scan/qr"),
            },
          ]}
        />
      )}

      {/* Popup Commande */}
      {openMenu === "commande" && (
        <PopupMenu
          title="Commande & Achats"
          color="#EF9F27"
          icon="ti-shopping-cart"
          onClose={() => setOpenMenu(null)}
          actions={[
            {
              icon: "ti-shopping-cart",
              color: "#e35d5b",
              label: "Voir mon panier",
              sub: "Articles en attente de validation",
              onClick: () => navigate("/panier"),
            },
            {
              icon: "ti-truck-delivery",
              color: "#5a8f8f",
              label: "Mes commandes",
              sub: "Historique et suivi de livraison",
              onClick: () => navigate("/commandes"),
            },
            {
              icon: "ti-cash",
              color: "#EF9F27",
              label: "Achats",
              sub: "Demandes & validations",
              onClick: () => navigate("/achats"),
            },
          ]}
        />
      )}

      {/* La barre elle-même */}
      <div
        className="fab-bar"
        role="navigation"
        aria-label="Actions rapides"
      >
        <FabBubble
          icon="ti-scan"
          label="Scan"
          color="#5a4a90"
          gradient="linear-gradient(135deg, #7a6fb0, #5a4a90)"
          onClick={() => setOpenMenu(openMenu === "scan" ? null : "scan")}
          active={openMenu === "scan"}
        />
        <FabBubble
          icon="ti-building-hospital"
          label="Mon étab"
          color="#185FA5"
          gradient="linear-gradient(135deg, #2a7ed1, #185FA5)"
          onClick={() => navigate("/etablissement/fiche")}
        />
        <FabBubble
          icon="ti-shopping-cart"
          label="Commande"
          color="#EF9F27"
          gradient="linear-gradient(135deg, #f5b144, #EF9F27)"
          onClick={() => setOpenMenu(openMenu === "commande" ? null : "commande")}
          active={openMenu === "commande"}
        />
      </div>
    </>
  );
}

// =============================================================
//  Bulle individuelle (cliquable, gradient, label)
// =============================================================
function FabBubble({ icon, label, color, gradient, onClick, active }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        width: 64,
        height: 64,
        padding: 0,
        border: "none",
        borderRadius: "50%",
        background: gradient,
        color: "#fff",
        cursor: "pointer",
        fontFamily: "inherit",
        boxShadow: active
          ? `0 0 0 4px ${color}33, 0 6px 18px ${color}66`
          : `0 6px 14px ${color}55, 0 2px 4px rgba(0,0,0,.1)`,
        transform: active ? "translateY(-3px) scale(1.05)" : "none",
        transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        position: "relative",
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(0.92)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = active ? "translateY(-3px) scale(1.05)" : "";
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 22 }} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
        {label}
      </span>
    </button>
  );
}

// =============================================================
//  Popup central avec les sous-actions
// =============================================================
function PopupMenu({ title, color, icon, actions, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        transform: "translateX(-50%)",
        zIndex: 999,
        width: "min(420px, calc(100vw - 32px))",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(20,33,49,.35), 0 2px 8px rgba(0,0,0,.1)",
        animation: "fab-popup-slide 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
        overflow: "hidden",
      }}
      role="dialog"
      aria-label={title}
    >
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 22 }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>{title}</h3>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            background: "rgba(255,255,255,.2)",
            border: "none",
            color: "#fff",
            width: 28, height: 28,
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Actions */}
      <div style={{ padding: 8 }}>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "12px 14px",
              margin: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              borderRadius: 10,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f7fa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width: 40, height: 40,
              borderRadius: 10,
              background: `${a.color}22`,
              color: a.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 20 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#142131" }}>{a.label}</div>
              {a.sub && (
                <div style={{ fontSize: 11, color: "#6c7a89", marginTop: 1 }}>{a.sub}</div>
              )}
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 16, color: "#a0aeb9" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
