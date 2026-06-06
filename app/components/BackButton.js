"use client";
// =============================================================
//  app/components/BackButton.js (0.58.72)
//
//  Bouton retour réutilisable, à placer en haut des fiches détail.
//  Utilise router.back() par défaut, ou une URL custom via `href`.
// =============================================================

import { useRouter } from "next/navigation";

export default function BackButton({
  href,
  label = "Retour",
  variant = "ghost",  // ghost | filled | inline
  icon = "ti-arrow-left",
  style = {},
}) {
  const router = useRouter();

  const handleClick = () => {
    if (href) router.push(href);
    else router.back();
  };

  const styles = {
    ghost: {
      background: "transparent",
      color: "#185FA5",
      border: "1px solid transparent",
      padding: "6px 12px",
      borderRadius: 6,
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      transition: "all .15s ease",
    },
    filled: {
      background: "linear-gradient(135deg, #185FA5, #142131)",
      color: "#fff",
      border: "none",
      padding: "8px 16px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      boxShadow: "0 3px 10px rgba(24,95,165,.20)",
    },
    inline: {
      background: "transparent",
      color: "#185FA5",
      border: "none",
      padding: "2px 0",
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "inherit",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      textDecoration: "underline",
    },
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{ ...styles[variant], ...style }}
      onMouseEnter={variant === "ghost" ? (e) => { e.currentTarget.style.background = "rgba(24,95,165,.08)"; e.currentTarget.style.borderColor = "rgba(24,95,165,.20)"; } : undefined}
      onMouseLeave={variant === "ghost" ? (e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } : undefined}
    >
      <i className={`ti ${icon}`} /> {label}
    </button>
  );
}
