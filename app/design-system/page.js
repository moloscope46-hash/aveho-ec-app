"use client";
// =============================================================
//  /design-system — Showcase de la refonte visuelle 0.65.30
//  Démontre tous les composants premium unifiés
// =============================================================
import { useState } from "react";
import { PageShell, ModernCard, ModernModal, ModalBtn } from "../components/ui-premium";

const COLORS = {
  patient:      { c: "#7a6fb0", ic: "ti-users",                 lbl: "Patients" },
  materiel:     { c: "#142131", ic: "ti-armchair-2",             lbl: "Matériels" },
  article:      { c: "#5a8f8f", ic: "ti-package",               lbl: "Articles" },
  depot:        { c: "#EF9F27", ic: "ti-building-warehouse",    lbl: "Dépôts" },
  di:           { c: "#e35d5b", ic: "ti-tools",                 lbl: "DI / Interventions" },
  commande:     { c: "#2a5a5a", ic: "ti-shopping-bag",          lbl: "Commandes" },
  magasin:      { c: "#185FA5", ic: "ti-building-store",        lbl: "Magasin" },
  etablissement:{ c: "#C9867F", ic: "ti-building-hospital",     lbl: "Établissements" },
  service:      { c: "#5aa05a", ic: "ti-stethoscope",           lbl: "Services" },
  chambre:      { c: "#5e4a8c", ic: "ti-door",                  lbl: "Chambres" },
};

export default function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalColor, setModalColor] = useState("#7a6fb0");
  const [modalIcon, setModalIcon] = useState("ti-users");
  const [modalTitle, setModalTitle] = useState("Démo Modal");

  return (
    <PageShell
      color="#7CC8C8"
      icon="ti-palette"
      title="Design System Aveho"
      subtitle="Refonte visuelle 0.65.30 — composants unifiés à appliquer à toutes les pages"
      badge="v1"
      actions={
        <button onClick={() => window.history.back()} style={{
          padding: "8px 14px", borderRadius: 10,
          background: "rgba(255,255,255,.08)", color: "#fff",
          border: "1px solid rgba(255,255,255,.15)",
          fontFamily: "Quicksand, sans-serif", fontWeight: 700,
          cursor: "pointer", fontSize: 12,
        }}><i className="ti ti-arrow-left" /> Retour</button>
      }
    >
      {/* SECTION : Couleurs par entité */}
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
        ?? Couleurs par entité
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {Object.entries(COLORS).map(([key, { c, ic, lbl }]) => (
          <ModernCard key={key} color={c} variant="accent" padding={14} icon={ic} title={lbl} subtitle={c} />
        ))}
      </div>

      {/* SECTION : Variantes de cartes */}
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>?? Variantes de cartes</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginBottom: 32 }}>
        <ModernCard color="#7a6fb0" variant="default" icon="ti-info-circle" title="Default" subtitle="Glassmorphism léger">
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: 0 }}>
            Fond translucide, bordure subtile. Utilisable partout pour info générale.
          </p>
        </ModernCard>
        <ModernCard color="#7a6fb0" variant="accent" icon="ti-flame" title="Accent" subtitle="Avec barre de couleur" badge="HOT">
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: 0 }}>
            Barre lumineuse en haut + accent de couleur. Pour les éléments mis en avant.
          </p>
        </ModernCard>
        <ModernCard color="#EF9F27" variant="gradient" icon="ti-bolt" title="Gradient" subtitle="Plein impact">
          <p style={{ color: "rgba(255,255,255,.90)", fontSize: 13, margin: 0 }}>
            Carte solide avec gradient + glow. Pour les CTA et stats importantes.
          </p>
        </ModernCard>
        <ModernCard color="#7a6fb0" variant="flat" icon="ti-list" title="Flat" subtitle="Mode clair">
          <p style={{ color: "#5a6878", fontSize: 13, margin: 0 }}>
            Carte blanche standard. Pour tableaux et formulaires denses.
          </p>
        </ModernCard>
      </div>

      {/* SECTION : Modal showcase */}
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "0 0 14px" }}>?? Modales unifiées</h2>
      <ModernCard color="#5e4a8c" variant="default" padding={20}>
        <p style={{ color: "rgba(255,255,255,.85)", fontSize: 13, margin: "0 0 14px" }}>
          Une modale unifiée par couleur de page. Header coloré + animation pop, body scrollable, footer sticky.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(COLORS).slice(0, 5).map(([key, { c, ic, lbl }]) => (
            <button
              key={key}
              onClick={() => { setModalColor(c); setModalIcon(ic); setModalTitle(`Modal ${lbl}`); setModalOpen(true); }}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: `linear-gradient(135deg, ${c} 0%, ${c}dd 100%)`,
                color: "#fff",
                border: "none",
                fontFamily: "Quicksand, sans-serif",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: `0 4px 12px ${c}40`,
              }}
            >Ouvrir {lbl}</button>
          ))}
        </div>
      </ModernCard>

      {/* SECTION : Tableau patients style */}
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "32px 0 14px" }}>?? Exemple : Liste façon Patients</h2>
      <ModernCard color="#7a6fb0" variant="default" padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.10)", display: "flex", alignItems: "center", gap: 10 }}>
          <i className="ti ti-search" style={{ color: "rgba(255,255,255,.5)" }} />
          <input placeholder="Rechercher un patient…" style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#fff", fontFamily: "Quicksand, sans-serif", fontSize: 14,
          }} />
          <button style={{
            background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.15)",
            color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer",
          }}><i className="ti ti-filter" /> Filtres</button>
        </div>
        {[
          { nom: "LACROIX", prenom: "Marc", chambre: "EHPAD A 12", etat: "actif", couleur: "#5aa05a" },
          { nom: "JACQUET", prenom: "Sylvie", chambre: "EHPAD A 14", etat: "actif", couleur: "#5aa05a" },
          { nom: "ROUSSEAU", prenom: "Jean", chambre: "Domicile", etat: "HAD", couleur: "#EF9F27" },
          { nom: "MARTIN", prenom: "Claire", chambre: "Clinique pneumo 03", etat: "actif", couleur: "#5aa05a" },
          { nom: "DURAND", prenom: "Pierre", chambre: "—", etat: "Sorti", couleur: "#888" },
        ].map((p, i) => (
          <div key={i} style={{
            padding: "12px 18px",
            display: "flex", alignItems: "center", gap: 14,
            borderBottom: i < 4 ? "1px solid rgba(255,255,255,.06)" : "none",
            transition: "background 150ms",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.04)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #7a6fb0 0%, #7a6fb0dd 100%)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800,
            }}>{p.prenom[0]}{p.nom[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{p.nom} {p.prenom}</div>
              <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12, marginTop: 2 }}>
                <i className="ti ti-door" /> {p.chambre}
              </div>
            </div>
            <span style={{
              background: `${p.couleur}25`,
              color: p.couleur,
              border: `1px solid ${p.couleur}50`,
              padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 0.3,
            }}>{p.etat}</span>
          </div>
        ))}
      </ModernCard>

      {/* MODAL DEMO */}
      <ModernModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        color={modalColor}
        icon={modalIcon}
        title={modalTitle}
        subtitle="Exemple de modal unifiée pour toutes les pages"
        actions={
          <>
            <ModalBtn variant="secondary" onClick={() => setModalOpen(false)}>Annuler</ModalBtn>
            <ModalBtn variant="primary" color={modalColor} icon="ti-check" onClick={() => setModalOpen(false)}>Confirmer</ModalBtn>
          </>
        }
      >
        <p style={{ margin: "0 0 14px", lineHeight: 1.6 }}>
          Cette modale utilise <strong>la couleur de la page parente</strong>. Header gradient, icône lumineuse, animation pop d'entrée.
        </p>
        <div style={{
          background: "#f4f7fa",
          padding: 14,
          borderRadius: 10,
          fontSize: 13,
          color: "#5a6878",
          border: `1px solid ${modalColor}30`,
        }}>
          <strong style={{ color: modalColor }}>Bonus :</strong> ESC ferme la modal, clic backdrop ferme aussi, scrollable si contenu long.
        </div>
      </ModernModal>

      {/* SECTION : Guide d'application */}
      <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: "32px 0 14px" }}>?? Comment appliquer ?</h2>
      <ModernCard color="#7CC8C8" variant="accent" padding={20}>
        <pre style={{
          background: "rgba(0,0,0,.30)",
          color: "#7CC8C8",
          padding: 14,
          borderRadius: 8,
          fontSize: 12,
          overflowX: "auto",
          margin: 0,
          fontFamily: "monospace",
          lineHeight: 1.6,
        }}>{`import { PageShell, ModernCard, ModernModal, ModalBtn } from
  "../components/ui-premium";

<PageShell color="#7a6fb0" icon="ti-users" title="Patients"
           subtitle="Liste de l'établissement" badge="80">
  <ModernCard color="#7a6fb0" variant="accent" icon="ti-list"
              title="Tous les patients">
    ...contenu...
  </ModernCard>
</PageShell>`}</pre>
      </ModernCard>
    </PageShell>
  );
}
