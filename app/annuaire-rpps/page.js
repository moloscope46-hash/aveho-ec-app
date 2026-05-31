"use client";
// =============================================================
//  app/annuaire-rpps/page.js (Alpha 0.55.28)
//
//  Page de recherche dans l'annuaire RPPS (Répertoire Partagé
//  des Professionnels de Santé) — complément du référentiel FINESS.
//
//  Utile pour rechercher :
//   - Un médecin/IDE libéral (non couvert par FINESS)
//   - Un prescripteur par numéro RPPS exact
//   - Tous les professionnels d'un secteur géographique
// =============================================================

import { useState } from "react";
import RppsSearch from "../components/RppsSearch";
import Modal from "../components/Modal";

export default function AnnuaireRppsPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="bg-dark" style={{ minHeight: "100vh", padding: "0 0 60px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 18px" }}>
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 26, color: "#fff", margin: "0 0 4px", fontWeight: 700 }}>
            <i className="ti ti-stethoscope" style={{ color: "#7CC8C8", marginRight: 8 }} />
            Annuaire RPPS
          </h1>
          <p style={{ color: "#a0aeb9", fontSize: 13.5, margin: 0 }}>
            Recherche de professionnels de santé (médecins, IDE, kinés…) libéraux et hospitaliers.
            Complète le référentiel FINESS qui ne couvre que les établissements.
          </p>
        </div>

        {/* Recherche dans un panneau */}
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 6px 20px rgba(0,0,0,.18)",
        }}>
          <RppsSearch
            onSelect={(p) => setSelected(p)}
            maxResults={30}
          />
        </div>

        {/* Aide */}
        <div style={{
          marginTop: 16,
          background: "#1d2c40",
          color: "#cfd8e3",
          padding: "12px 14px",
          borderRadius: 8,
          fontSize: 11.5,
          lineHeight: 1.5,
        }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 13, color: "#7CC8C8" }}>
            <i className="ti ti-info-circle" /> À propos du RPPS
          </h3>
          <p style={{ margin: "0 0 4px" }}>
            Le <b>RPPS</b> (Répertoire Partagé des Professionnels de Santé) est l'annuaire officiel de
            l'Agence du Numérique en Santé (ANS). Il référence ~1,7 million de professionnels de santé en France.
          </p>
          <p style={{ margin: 0 }}>
            Source officielle : <a href="https://annuaire.sante.fr/" target="_blank" rel="noopener" style={{ color: "#7CC8C8" }}>annuaire.sante.fr</a>.
            Mise à jour mensuelle via l'API gouv.fr.
          </p>
        </div>
      </div>

      {/* Modale détails du praticien sélectionné */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.civilite || ""} ${selected.prenom || ""} ${selected.nom || ""}`.trim() : ""}
        subtitle={selected?.profession}
        icon="ti-user-circle"
        color="#185FA5"
        maxWidth={560}
      >
        {selected && (
          <div>
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <DetailRow label="Profession" value={selected.profession} />
              {selected.specialite && <DetailRow label="Spécialité" value={selected.specialite} />}
              {selected.mode_exercice && <DetailRow label="Mode d'exercice" value={selected.mode_exercice} />}
              <DetailRow label="N° RPPS" value={selected.rpps} mono />
              {selected.adeli && <DetailRow label="N° ADELI" value={selected.adeli} mono />}
            </div>

            <h3 style={{ fontSize: 13, color: "#185FA5", margin: "16px 0 8px", letterSpacing: 1, textTransform: "uppercase" }}>
              Coordonnées
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {selected.adresse && <DetailRow label="Adresse" value={selected.adresse} />}
              {(selected.cp || selected.commune) && (
                <DetailRow label="Commune" value={`${selected.cp || ""} ${selected.commune || ""}`} />
              )}
              {selected.telephone && (
                <DetailRow label="Téléphone" value={
                  <a href={`tel:${selected.telephone.replace(/\s/g, "")}`} style={{ color: "#185FA5", fontWeight: 600 }}>
                    {selected.telephone}
                  </a>
                } />
              )}
              {selected.email && (
                <DetailRow label="Email" value={
                  <a href={`mailto:${selected.email}`} style={{ color: "#185FA5", fontWeight: 600 }}>
                    {selected.email}
                  </a>
                } />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "#6c7a89", fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: 13,
        color: "#142131",
        fontFamily: mono ? "Consolas, Menlo, monospace" : "inherit",
        textAlign: "right",
      }}>{value || "—"}</span>
    </div>
  );
}
