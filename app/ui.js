"use client";
import { statutClass } from "../lib/format";

// Badge de statut de commande
export function Statut({ value }) {
  return <span className={`statut ${statutClass(value)}`}>{value}</span>;
}

// Carte blanche standard
export function Panel({ children, style }) {
  return <div className="panel" style={style}>{children}</div>;
}

// En-tête de page (eyebrow + titre + sous-titre), réutilisé partout
export function PageHead({ eyebrow, title, accent, sub, small }) {
  return (
    <>
      {eyebrow && <span className="eyebrow"><i className="ti ti-building-hospital" /> {eyebrow}</span>}
      <div className={`h1${small ? " small" : ""}`}>
        {title} {accent && <span className="accent">{accent}</span>}
      </div>
      {sub && <div className="sub" style={{ marginBottom: 20 }}>{sub}</div>}
    </>
  );
}

// État de chargement / vide standardisé
export function StateMsg({ children }) {
  return <div style={{ padding: 36, textAlign: "center", color: "#8a98a8" }}>{children}</div>;
}
