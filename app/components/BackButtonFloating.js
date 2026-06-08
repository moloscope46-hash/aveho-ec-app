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
        /* 0.65.16 : Cédric veut Page Précédente EN BAS À GAUCHE */
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: 16,
        zIndex: 95,
        height: 42,
        borderRadius: 21,
        padding: "0 16px 0 12px",
        background: hover
          ? "linear-gradient(135deg, #7CC8C8, #5db5b5)"
          : "linear-gradient(135deg, rgba(20, 33, 49, .92), rgba(28, 84, 84, .92))",
        backdropFilter: "blur(14px) saturate(180%)",
        WebkitBackdropFilter: "blur(14px) saturate(180%)",
        color: "#fff",
        border: hover ? "1.5px solid #7CC8C8" : "1.5px solid rgba(124, 200, 200, .35)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: hover ? "scale(1.05) translateX(-3px)" : "scale(1)",
        boxShadow: hover
          ? "0 10px 28px rgba(124, 200, 200, .55), 0 0 0 6px rgba(124, 200, 200, .15), 0 2px 6px rgba(0,0,0,.2)"
          : "0 6px 18px rgba(20, 33, 49, .35), 0 1px 3px rgba(0,0,0,.2), 0 0 0 1px rgba(124, 200, 200, .08) inset",
        fontFamily: "inherit",
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
        maxWidth: "calc(100vw - 32px)",
        overflow: "hidden",
      }}>
      <span style={{
        width: 26, height: 26, borderRadius: "50%",
        background: hover ? "rgba(255,255,255,.25)" : "rgba(124, 200, 200, .25)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0,
        transition: "all 220ms",
      }}>
        <i className="ti ti-arrow-left" />
      </span>
      <span style={{
        fontSize: 12.5,
        fontWeight: 700,
        textOverflow: "ellipsis",
        overflow: "hidden",
        maxWidth: 200,
        letterSpacing: 0.4,
      }}>
        {target.lbl || "Retour"}
      </span>

      <style jsx global>{`
        @keyframes av-back-tooltip-in {
          from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @media (max-width: 720px) {
          .av-back-floating {
            top: auto !important;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
            left: 8px !important;
            height: 36px !important;
            padding: 0 12px 0 8px !important;
            font-size: 11.5px !important;
            /* 0.65.17 : largeur réduite sur mobile pour ne pas couvrir les autres boutons (max 45% écran) */
            max-width: 45vw !important;
          }
          .av-back-floating > span:last-child {
            max-width: 100px !important;
            font-size: 11px !important;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>
    </button>
  );
}
