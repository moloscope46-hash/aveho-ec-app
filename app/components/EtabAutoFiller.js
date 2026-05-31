"use client";
// =============================================================
//  app/components/EtabAutoFiller.js (Alpha 0.55.43)
//
//  Composant réutilisable qui regroupe les 3 recherches officielles
//  (FINESS, SIRENE, RPPS) en un seul bloc compact, à intégrer dans :
//  - Création d'un partenaire
//  - Création d'un établissement (mes étab)
//  - Fiche groupement (ajout d'étab membre)
//  - Toute autre saisie où on veut éviter la double saisie
//
//  Le composant ne gère QUE la recherche + le pré-remplissage.
//  La détection de doublon doit être faite via check_etab_doublon
//  par le parent quand le user valide la création.
//
//  Usage :
//    <EtabAutoFiller
//      show={["finess", "sirene", "rpps"]} // par défaut : tous
//      onFinessSelect={(etab) => setForm(prev => ({...prev, nom: etab.nom, ...}))}
//      onSireneSelect={(s) => setForm(prev => ({...prev, ...}))}
//      onRppsSelect={(p) => setForm(prev => ({...prev, ...}))}
//    />
// =============================================================

import FinessSearch from "../FinessSearch";
import SireneSearch from "../SireneSearch";
import RppsAutocomplete from "../RppsAutocomplete";

export default function EtabAutoFiller({
  show = ["finess", "sirene", "rpps"],
  onFinessSelect,
  onSireneSelect,
  onRppsSelect,
  title = "Remplir automatiquement",
  compact = false,
}) {
  const showFiness = show.includes("finess");
  const showSirene = show.includes("sirene");
  const showRpps = show.includes("rpps");

  return (
    <div style={{
      background: compact ? "transparent" : "linear-gradient(135deg, #f3effa 0%, #fff 100%)",
      border: compact ? "none" : "1px solid #d6c9ec",
      borderRadius: 10,
      padding: compact ? 0 : 12,
    }}>
      {!compact && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#5a4a90",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <i className="ti ti-bolt" /> {title}
        </div>
      )}

      {showFiness && showSirene ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: showRpps ? 8 : 0 }}>
          {showFiness && (
            <FinessLine onSelect={onFinessSelect} />
          )}
          {showSirene && (
            <SireneLine onSelect={onSireneSelect} />
          )}
        </div>
      ) : (
        <>
          {showFiness && <div style={{ marginBottom: 8 }}><FinessLine onSelect={onFinessSelect} /></div>}
          {showSirene && <div style={{ marginBottom: 8 }}><SireneLine onSelect={onSireneSelect} /></div>}
        </>
      )}

      {showRpps && <RppsLine onSelect={onRppsSelect} />}

      {!compact && (
        <div style={{ fontSize: 11, color: "#7a6fb0", marginTop: 6 }}>
          <i className="ti ti-info-circle" /> Sélectionne un résultat pour pré-remplir tous les champs ci-dessous. Les doublons éventuels seront détectés à la création.
        </div>
      )}
    </div>
  );
}

function FinessLine({ onSelect }) {
  return (
    <div>
      <label style={lblStyle}>
        🏥 FINESS (santé)
      </label>
      <FinessSearch
        placeholder="Hôpital, EHPAD, n° FINESS…"
        onSelect={(etab) => {
          onSelect?.({
            source: "finess",
            nom: etab.nom,
            type: etab.type,
            finess: etab.finess,
            siret: etab.siret,
            adresse: etab.adresse,
            cp: etab.code_postal,
            ville: etab.ville,
            telephone: etab.telephone,
          });
        }}
      />
    </div>
  );
}

function SireneLine({ onSelect }) {
  return (
    <div>
      <label style={lblStyle}>
        🏢 SIRENE (entreprises)
      </label>
      <SireneSearch
        placeholder="Société, SIRET, SIREN…"
        onSelect={(s) => {
          onSelect?.({
            source: "sirene",
            nom: s.nom,
            type: s.type,
            siret: s.siret,
            siren: s.siren,
            adresse: s.adresse,
            cp: s.code_postal,
            ville: s.ville,
          });
        }}
      />
    </div>
  );
}

function RppsLine({ onSelect }) {
  return (
    <div>
      <label style={lblStyle}>
        🩺 RPPS (praticiens — libéraux/cabinets)
      </label>
      <RppsAutocomplete
        placeholder="Médecin, IDE, kiné… (recherche en direct)"
        onSelect={(p) => {
          onSelect?.({
            source: "rpps",
            nom: `${p.civilite || ""} ${p.prenom || ""} ${p.nom || ""}`.trim(),
            type: p.profession === "Médecin" ? "Cabinet médical" : (p.profession || "Cabinet"),
            type_relation: "Prescripteur",
            rpps: p.rpps,
            adresse: p.adresse,
            cp: p.cp,
            ville: p.commune,
            telephone: p.telephone,
            email: p.email,
          });
        }}
      />
    </div>
  );
}

const lblStyle = {
  fontSize: 10.5,
  color: "#6c7a89",
  fontWeight: 600,
  display: "block",
  marginBottom: 4,
};
