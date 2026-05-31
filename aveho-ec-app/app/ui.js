"use client";
// =============================================================
//  Composants UI partagés Aveho — système de design unifié
//  Tous les écrans utilisent ces blocs pour rester cohérents :
//  - Statut : badge de statut de commande
//  - Panel  : carte blanche standard
//  - PageHead : en-tête de page (eyebrow + titre + accent + sub)
//  - StateMsg : état vide / chargement
//  - Modal  : modale unifiée (header + body + footer)
//  - Btn    : bouton typé (primary / ghost / danger / new)
//  - Badge  : badge typé par entité (patient, matériel, dépôt, DI, etc.)
//  - EntityIcon : icône standard d'une entité (taille + couleur cohérentes)
// =============================================================
import React from "react";
import { statutClass } from "../lib/format";

// Couleurs par type d'entité — utilisées partout (icônes, badges, etc.)
export const ENTITY = {
  patient:     { ic: "ti-user",                color: "#7a6fb0", label: "Patient" },
  materiel:    { ic: "ti-armchair-2",          color: "#142131", label: "Matériel" },
  article:     { ic: "ti-package",             color: "#5a8f8f", label: "Article" },
  depot:       { ic: "ti-building-warehouse",  color: "#EF9F27", label: "Dépôt" },
  zone:        { ic: "ti-map-pin",             color: "#EF9F27", label: "Zone" },
  stock:       { ic: "ti-boxes",               color: "#5aa05a", label: "Stock" },
  transfert:   { ic: "ti-truck-delivery",      color: "#185FA5", label: "Transfert" },
  di:          { ic: "ti-tools",               color: "#e35d5b", label: "DI" },
  intervention:{ ic: "ti-tools",               color: "#e35d5b", label: "Intervention" },
  commande:    { ic: "ti-shopping-bag",        color: "#2a5a5a", label: "Commande" },
  magasin:     { ic: "ti-building-store",      color: "#185FA5", label: "Magasin" },
  utilisateur: { ic: "ti-user-circle",         color: "#7a6fb0", label: "Utilisateur" },
  role:        { ic: "ti-shield",              color: "#5aa05a", label: "Rôle" },
  invitation:  { ic: "ti-mail",                color: "#185FA5", label: "Invitation" },
  etablissement:{ic: "ti-building-hospital",   color: "#2a5a5a", label: "Établissement" },
  collectivite:{ ic: "ti-building-community",  color: "#5a8f8f", label: "Collectivité" },
  batiment:    { ic: "ti-building",            color: "#5a8f8f", label: "Bâtiment" },
  etage:       { ic: "ti-stairs",              color: "#7a6fb0", label: "Étage" },
  service:     { ic: "ti-stethoscope",         color: "#5aa05a", label: "Service" },
  chambre:     { ic: "ti-door",                color: "#EF9F27", label: "Chambre" },
  lit:         { ic: "ti-bed",                 color: "#185FA5", label: "Lit" },
  promotion:   { ic: "ti-discount-2",          color: "#C9867F", label: "Promotion" },
};

// Icône d'entité (taille uniforme, fond pastel)
export function EntityIcon({ kind, size = 36 }) {
  const e = ENTITY[kind] || { ic: "ti-circle", color: "#888" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: size / 4,
      background: e.color + "1f", color: e.color, fontSize: size * 0.55,
    }}><i className={`ti ${e.ic}`} /></span>
  );
}

// Badge typé par entité (utilisé dans les listes pour identifier la nature d'une ligne)
export function Badge({ kind, children, color, ic }) {
  const e = kind ? ENTITY[kind] : null;
  const c = color || (e ? e.color : "#888");
  const i = ic || (e ? e.ic : "ti-circle");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c + "1a", color: c, border: `1px solid ${c}44`,
      padding: "3px 10px", borderRadius: 14, fontSize: 12, fontWeight: 600,
    }}>
      <i className={`ti ${i}`} />
      {children || (e && e.label)}
    </span>
  );
}

// Bouton typé : variant = "primary" (par défaut) | "ghost" | "danger" | "new"
export function Btn({ variant = "primary", icon, children, onClick, disabled, type = "button", style, ariaLabel }) {
  const cls = {
    primary: "btn-save",
    ghost: "btn-ghost",
    danger: "btn-danger",
    new: "btn-new",
  }[variant] || "btn-save";
  // Alpha 0.44.0 — a11y : si bouton icon-only sans aria-label explicite, utiliser children comme texte de fallback
  const accessibleName = ariaLabel || (typeof children === "string" ? null : "Action");
  return (
    <button 
      type={type} 
      className={cls} 
      onClick={onClick} 
      disabled={disabled} 
      style={style}
      aria-label={accessibleName || undefined}
    >
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />} {children}
    </button>
  );
}

// Alpha 0.44.0 — composant bouton icon-only accessible (remplace <i onClick>)
export function IconButton({ icon, onClick, ariaLabel, color = "#6c7a89", title, disabled, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || title || "Action"}
      title={title}
      style={{
        background: "transparent",
        border: "none",
        color,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 4,
        fontSize: 16,
        lineHeight: 1,
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
    </button>
  );
}

// Badge statut de commande
export function Statut({ value }) {
  return <span className={`statut ${statutClass(value)}`}>{value}</span>;
}

// Alpha 0.46.0 : panneau avec section rétractable, accessible
export function CollapsibleSection({ title, icon, iconColor = "#185FA5", defaultOpen = true, children, style }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const titleId = "collap-" + (title || "").replace(/\W+/g, "-").toLowerCase();
  return (
    <div className="panel" style={{ marginBottom: 18, ...style }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={titleId + "-body"}
        style={{
          background: "transparent",
          border: "none",
          width: "100%",
          textAlign: "left",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 17, color: "#142131", fontWeight: 700,
          margin: 0,
        }}
      >
        {icon && <i className={`ti ${icon}`} style={{ color: iconColor }} aria-hidden="true" />}
        <span style={{ flex: 1 }}>{title}</span>
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ color: "#8a98a8", fontSize: 18, transition: "transform .2s" }} aria-hidden="true" />
      </button>
      {open && (
        <div id={titleId + "-body"} style={{ marginTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Carte blanche standard
export function Panel({ children, style }) {
  return <div className="panel" style={style}>{children}</div>;
}

// En-tête de page : eyebrow (étiquette discrète) + titre + accent (mot en couleur) + sous-titre
export function PageHead({ eyebrow, title, accent, sub, small, icon }) {
  return (
    <>
      {eyebrow && <span className="eyebrow"><i className={`ti ${icon || "ti-building-hospital"}`} /> {eyebrow}</span>}
      <div className={`h1${small ? " small" : ""}`}>
        {title} {accent && <span className="accent">{accent}</span>}
      </div>
      {sub && <div className="sub" style={{ marginBottom: 20 }}>{sub}</div>}
    </>
  );
}

// État vide / chargement
export function StateMsg({ children }) {
  return <div style={{ padding: 36, textAlign: "center", color: "#8a98a8" }}>{children}</div>;
}

// =============================================================
//  Modal — composant unifié pour toutes les pop-ups de l'appli
//  Usage : <Modal open={...} onClose={...} title="..." kind="patient"
//                 footer={<><Btn variant="ghost" .../><Btn .../></>}>
//            {children}
//          </Modal>
//  - kind active une icône colorée dans l'en-tête (cf ENTITY)
//  - clique sur fond ou X pour fermer
//  - sur mobile : bottom-sheet automatique (via CSS @media)
// =============================================================
export function Modal({ open, onClose, title, kind, icon, color, footer, children, size = "md" }) {
  // Alpha 0.18.0 : a11y — focus trap + ESC + role=dialog
  const dialogRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    // Capturer le focus à l'ouverture
    const prevFocus = document.activeElement;
    const firstFocusable = dialogRef.current?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus?.();
    function onKey(ev) {
      if (ev.key === "Escape") { ev.preventDefault(); onClose?.(); return; }
      // Focus trap : Tab cycle dans la modale
      if (ev.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Restaurer le focus initial à la fermeture
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const e = kind ? ENTITY[kind] : null;
  const c = color || (e ? e.color : "#142131");
  const i = icon || (e ? e.ic : "ti-circle");
  const widths = { sm: 380, md: 520, lg: 720 };
  const titleId = "modal-title-" + (title || "x").replace(/\W+/g, "-").toLowerCase();
  return (
    <div className="modal-bg" onClick={(ev) => ev.target.classList.contains("modal-bg") && onClose && onClose()}>
      <div
        ref={dialogRef}
        className="modal modal-v2"
        style={{ maxWidth: widths[size] || widths.md }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head-v2" style={{ background: c }}>
          <span className="modal-ic" aria-hidden="true"><i className={`ti ${i}`} /></span>
          <span className="modal-title" id={titleId}>{title}</span>
          <button className="modal-x" onClick={onClose} aria-label="Fermer la fenêtre"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// =============================================================
//  FilterBar — Barre de filtres par pastilles avec compteurs
//  Alpha 0.16.1 — pattern unifié pour Achats, Utilisateurs, Invitations.
//
//  Usage :
//    <FilterBar
//      label="Voir :"
//      value={filtre}
//      onChange={setFiltre}
//      options={[
//        { v: "actifs", l: "Actifs", count: 5 },
//        { v: "archives", l: "Archivés", count: 2 },
//        { v: "tous", l: "Tous", count: 7 },
//      ]}
//      rightSlot={<button>Action à droite</button>}
//    />
// =============================================================
export function FilterBar({ label = "Filtrer :", value, onChange, options, rightSlot, color = "#7CC8C8" }) {
  return (
    <div className="filter-bar">
      {label && <span className="filter-bar-label">{label}</span>}
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`filter-bar-chip${on ? " on" : ""}`}
            style={on ? { background: color } : null}
          >
            {o.icon && <i className={`ti ${o.icon}`} style={{ marginRight: 4 }} />}
            {o.l}
            {typeof o.count === "number" && <span className="filter-bar-cnt">({o.count})</span>}
          </button>
        );
      })}
      {rightSlot && <span style={{ marginLeft: "auto" }}>{rightSlot}</span>}
    </div>
  );
}
