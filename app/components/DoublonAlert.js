"use client";
// =============================================================
//  app/components/DoublonAlert.js (Alpha 0.55.43)
//
//  Composant réutilisable pour prévenir l'utilisateur qu'un
//  établissement avec les mêmes identifiants existe déjà
//  (par FINESS, SIRET, SIREN, RPPS ou nom).
//
//  - Affiche les fiches existantes avec lien direct
//  - Si user a le droit force_doublon_etab → bouton "Créer quand même"
//    avec champ commentaire obligatoire (≥ 10 caractères)
//  - Si pas le droit → invite à demander à un admin
//
//  Usage :
//    const [doublons, setDoublons] = useState(null);
//    <DoublonAlert
//      doublons={doublons}
//      canForce={auth.can("force_doublon_etab")}
//      onForce={(commentaire) => createEtab({ doublon_force_commentaire: commentaire })}
//      onCancel={() => setDoublons(null)}
//    />
// =============================================================

import { useState } from "react";

export default function DoublonAlert({
  doublons,
  canForce = false,
  onForce,
  onCancel,
  itemLabel = "l'établissement",
}) {
  const [commentaire, setCommentaire] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (!doublons || !doublons.found) return null;

  const matches = doublons.matches || [];
  const nMine = matches.filter(m => m.kind === "mine").length;
  const nPartner = matches.filter(m => m.kind === "partner").length;

  function handleForce() {
    if (!commentaire.trim() || commentaire.trim().length < 10) {
      alert("Le commentaire doit faire au moins 10 caractères pour expliquer la raison du doublon.");
      return;
    }
    onForce?.(commentaire.trim());
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #fff8ec 0%, #fff 100%)",
      border: "2px solid #EF9F27",
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{
          background: "#EF9F27",
          width: 32, height: 32, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#7a4f15", marginBottom: 3 }}>
            ⚠ Doublon détecté : {matches.length} fiche{matches.length > 1 ? "s" : ""} déjà existante{matches.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12, color: "#7a4f15" }}>
            Un autre utilisateur de votre structure a déjà créé {itemLabel} avec ces identifiants :
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        {matches.map((m, i) => (
          <div key={i} style={{
            background: "#fff",
            border: "1px solid #f0d59f",
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              background: m.kind === "mine" ? "#dbe7f5" : "#f3effa",
              color: m.kind === "mine" ? "#185FA5" : "#5a4a90",
              fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 10,
              textTransform: "uppercase", letterSpacing: 0.3,
              flexShrink: 0,
            }}>
              {m.kind === "mine" ? "Mon étab" : "Partenaire"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>
                {m.nom}
                {m.matched_on && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: "#EF9F27", fontWeight: 700, textTransform: "uppercase" }}>
                    Match sur {m.matched_on}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#6c7a89" }}>
                {m.adresse ? `${m.adresse}, ` : ""}{m.cp} {m.ville}
                {m.finess && <span style={{ marginLeft: 6, fontFamily: "Consolas,monospace", color: "#a0aeb9" }}>FINESS {m.finess}</span>}
                {m.siret && <span style={{ marginLeft: 6, fontFamily: "Consolas,monospace", color: "#a0aeb9" }}>SIRET {m.siret}</span>}
                {m.rpps && <span style={{ marginLeft: 6, fontFamily: "Consolas,monospace", color: "#a0aeb9" }}>RPPS {m.rpps}</span>}
              </div>
              {m.doublon_force_commentaire && (
                <div style={{ fontSize: 11, color: "#7a4f15", marginTop: 3, fontStyle: "italic" }}>
                  <i className="ti ti-message" /> Forcé : "{m.doublon_force_commentaire}"
                </div>
              )}
            </div>
            <a
              href={m.kind === "mine" ? `/etablissement/fiche?id=${m.id}` : `/etablissements-partenaires?id=${m.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#185FA5",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Voir la fiche <i className="ti ti-external-link" />
            </a>
          </div>
        ))}
      </div>

      {!confirming ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onCancel}
            style={{
              background: "#fff",
              color: "#6c7a89",
              border: "1px solid #d3d9e0",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <i className="ti ti-x" /> Annuler la création
          </button>
          {canForce ? (
            <button
              onClick={() => setConfirming(true)}
              style={{
                background: "#EF9F27",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-alert-octagon" /> Créer quand même (avec commentaire)
            </button>
          ) : (
            <div style={{
              fontSize: 11.5,
              color: "#7a4f15",
              alignSelf: "center",
              fontStyle: "italic",
              marginLeft: 6,
            }}>
              <i className="ti ti-lock" /> Seul un admin peut forcer la création d'un doublon. Contactez votre référent.
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: "#fce5e0",
          border: "1px solid #f0c4be",
          borderRadius: 8,
          padding: "10px 12px",
          marginTop: 6,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7a1f15", marginBottom: 6 }}>
            <i className="ti ti-message-exclamation" /> Pourquoi créer un doublon ?
          </div>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : Le partenaire existant est une fiche ancienne d'un autre service. Cette nouvelle fiche est pour le service oncologie qui gère ses propres prescripteurs."
            rows={3}
            style={{
              width: "100%",
              border: "1px solid #d3d9e0",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
              minHeight: 64,
            }}
          />
          <div style={{ fontSize: 10.5, color: "#7a1f15", marginTop: 3 }}>
            {commentaire.length} / 500 caractères (minimum 10 requis)
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => { setConfirming(false); setCommentaire(""); }}
              style={{
                background: "#fff",
                color: "#6c7a89",
                border: "1px solid #d3d9e0",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleForce}
              disabled={commentaire.trim().length < 10}
              style={{
                background: commentaire.trim().length >= 10 ? "#c0392b" : "#a0aeb9",
                color: "#fff",
                border: "none",
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: commentaire.trim().length >= 10 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              <i className="ti ti-check" /> Confirmer la création
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
