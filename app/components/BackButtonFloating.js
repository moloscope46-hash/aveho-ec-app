"use client";
// =============================================================
//  components/BackButtonFloating.js (0.65.4)
//
//  Belle flèche de retour FLOTTANTE GLOBALE (à mettre dans layout.js)
//  Apparaît automatiquement sur toutes les pages SAUF :
//   - Pages racines (accueil, login, /, presentation/*)
//   - Pages explicitement masquées via prop hide
//
//  Détecte automatiquement la page parente via le pathname.
//  Tooltip au survol/focus avec le nom de la page d'origine.
// =============================================================

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const PARENT_FROM_PATH = [
  { regex: /^\/patient\/[^/]+/, parent: "/patients", label: "Liste des patients" },
  { regex: /^\/patients\/[^/]+/, parent: "/patients", label: "Liste des patients" },
  { regex: /^\/interventions\/[^/]+/, parent: "/interventions", label: "Demandes d'intervention" },
  { regex: /^\/signalements\/[^/]+/, parent: "/signalements", label: "Signalements" },
  { regex: /^\/achats\/[^/]+/, parent: "/achats", label: "Achats" },
  { regex: /^\/transferts\/[^/]+/, parent: "/transferts", label: "Transferts" },
  { regex: /^\/bilan-sav\/[^/]+/, parent: "/bilans-sav", label: "Bilans SAV" },
  { regex: /^\/bilans-sav\/[^/]+/, parent: "/bilans-sav", label: "Bilans SAV" },
  { regex: /^\/maintenance\/[^/]+/, parent: "/maintenance", label: "Maintenances" },
  { regex: /^\/livraisons-planifiees\/[^/]+/, parent: "/livraisons-planifiees", label: "Livraisons planifiées" },
  { regex: /^\/commandes\/[^/]+/, parent: "/commandes", label: "Commandes" },
  { regex: /^\/commandes-validation\/[^/]+/, parent: "/commandes-validation", label: "Validations commandes" },
  { regex: /^\/materiels\/[^/]+/, parent: "/materiels", label: "Matériels" },
  { regex: /^\/articles\/[^/]+/, parent: "/articles", label: "Catalogue articles" },
  { regex: /^\/etablissements\/[^/]+/, parent: "/etablissements", label: "Établissements" },
  { regex: /^\/etablissements-partenaires\/[^/]+/, parent: "/etablissements-partenaires", label: "Partenaires" },
  { regex: /^\/utilisateurs\/[^/]+/, parent: "/utilisateurs", label: "Utilisateurs" },
  { regex: /^\/depots\/[^/]+/, parent: "/depots", label: "Dépôts" },
  { regex: /^\/inventaire\/[^/]+/, parent: "/inventaire", label: "Inventaires" },
  { regex: /^\/magasin\/tournees\/[^/]+/, parent: "/magasin/tournees", label: "Tournées" },
  { regex: /^\/magasin\/fournisseurs\/[^/]+/, parent: "/magasin/fournisseurs", label: "Fournisseurs" },
  { regex: /^\/magasin\/[^/]+/, parent: "/magasin", label: "Magasin" },
  { regex: /^\/admin\/[^/]+/, parent: "/admin", label: "Administration" },
  { regex: /^\/parametres\/[^/]+/, parent: "/parametres", label: "Paramètres" },
  { regex: /^\/audit\/[^/]+/, parent: "/audit", label: "Audit" },
  { regex: /^\/[^/]+\/[^/]+/, parent: null, label: "Page précédente" },
];

// Pages à 1er niveau où on n'affiche PAS la flèche (déjà sur l'accueil ou équivalent)
const ROOT_PATHS = [
  "/accueil", "/", "/login", "/inscription", "/changelog",
  // Pages 1er niveau qui apparaissent dans le menu burger principal :
  "/patients", "/interventions", "/signalements", "/achats", "/transferts",
  "/bilans-sav", "/maintenance", "/livraisons-planifiees", "/commandes",
  "/commandes-validation", "/materiels", "/articles", "/etablissements",
  "/etablissements-partenaires", "/utilisateurs", "/depots", "/inventaire",
  "/audit", "/magasin", "/profil",
];

export default function BackButtonFloating() {
  const router = useRouter();
  const pathname = usePathname();
  const [hover, setHover] = useState(false);
  const [target, setTarget] = useState({ url: null, lbl: null });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const match = PARENT_FROM_PATH.find(p => p.regex.test(pathname || ""));
    if (match && match.parent) {
      setTarget({ url: match.parent, lbl: match.label });
    } else {
      setTarget({ url: null, lbl: "Page précédente" });
    }
  }, [pathname]);

  if (!mounted) return null;
  // Masquer sur pages racines
  if (ROOT_PATHS.includes(pathname || "")) return null;
  // Masquer sur /presentation/* (les pages TV ont leur propre navigation flèches)
  if (pathname?.startsWith("/presentation/")) return null;

  function handleClick() {
    if (target.url) router.push(target.url);
    else router.back();
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`Retour : ${target.lbl || "page précédente"}`}
      className="av-back-floating"
      style={{
        position: "fixed",
        top: "calc(74px + env(safe-area-inset-top, 0px))",
        left: 16,
        zIndex: 95,
        width: 44, height: 44,
        borderRadius: 12,
        background: hover
          ? "linear-gradient(135deg, #7CC8C8, #5db5b5)"
          : "rgba(20, 33, 49, .85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#fff",
        border: hover ? "1.5px solid #7CC8C8" : "1.5px solid rgba(124, 200, 200, .35)",
        cursor: "pointer",
        fontSize: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: hover ? "scale(1.10) translateX(-3px)" : "scale(1)",
        boxShadow: hover
          ? "0 8px 24px rgba(124, 200, 200, .45), 0 0 0 6px rgba(124, 200, 200, .15)"
          : "0 4px 12px rgba(20, 33, 49, .25)",
        fontFamily: "inherit",
      }}>
      <i className="ti ti-arrow-left" />

      {hover && target.lbl && (
        <span style={{
          position: "absolute",
          left: "calc(100% + 10px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "linear-gradient(135deg, #142131, #1c5454)",
          color: "#fff",
          padding: "7px 14px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
          boxShadow: "0 6px 24px rgba(0,0,0,.4)",
          border: "1px solid rgba(124, 200, 200, .3)",
          animation: "av-back-tooltip-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          pointerEvents: "none",
          letterSpacing: 0.3,
        }}>
          <i className="ti ti-corner-up-left" style={{ marginRight: 5, color: "#7CC8C8" }} />
          {target.lbl}
          <span style={{
            position: "absolute",
            right: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderRight: "7px solid #142131",
          }} />
        </span>
      )}

      <style jsx global>{`
        @keyframes av-back-tooltip-in {
          from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @media (max-width: 720px) {
          .av-back-floating {
            top: 68px !important;
            left: 8px !important;
            width: 40px !important;
            height: 40px !important;
            font-size: 17px !important;
          }
        }
      `}</style>
    </button>
  );
}
