"use client";
// =============================================================
//  AchatPreview — Aperçu rapide achat au survol
//  Alpha 0.39.0
// =============================================================
import EntityPreview from "./EntityPreview";
import { statutColor } from "./PatientPreview";
import { fmtDate } from "../lib/format";

export default function AchatPreview({ achat, patient = null, children, disabled = false }) {
  return (
    <EntityPreview
      entity={achat}
      href={`/achats?id=${achat.id}`}
      disabled={disabled}
      width={320}
      maxHeight={340}
      renderPopover={({ navigate }) => (
        <AchatPopoverContent achat={achat} patient={patient} navigate={navigate} />
      )}
    >
      {children}
    </EntityPreview>
  );
}

function AchatPopoverContent({ achat, patient, navigate }) {
  const colors = statutColor(achat.statut);
  const montant = achat.montant_total || achat.montant || 0;

  return (
    <>
      {/* Header gradient amber */}
      <div style={{
        background: "linear-gradient(135deg, #142131 0%, #7a4f15 100%)",
        color: "#fff",
        padding: "12px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(239, 159, 39, .22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="ti ti-shopping-cart" style={{ fontSize: 18, color: "#EF9F27" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {achat.numero || "Achat sans numéro"}
            </div>
            <div style={{ fontSize: 11, color: "#f5d99c", marginTop: 1 }}>
              {achat.fournisseur || "Fournisseur non précisé"}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        {/* Statut */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <i className="ti ti-flag" style={{ color: colors.fg, fontSize: 16, width: 20 }} />
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10,
            textTransform: "uppercase", letterSpacing: ".3px",
            background: colors.bg, color: colors.fg,
          }}>{achat.statut || "—"}</span>
        </div>

        {/* Montant */}
        {montant > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-currency-euro" style={{ color: "#EF9F27", fontSize: 16, width: 20 }} />
            <div style={{ color: "#142131", fontSize: 14, fontWeight: 700 }}>
              {montant.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </div>
          </div>
        )}

        {/* Motif */}
        {achat.motif && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-message-2" style={{ color: "#7a6fb0", fontSize: 16, width: 20, marginTop: 2 }} />
            <div style={{ color: "#2a3a48", fontSize: 12, lineHeight: 1.4, maxHeight: 50, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {achat.motif}
            </div>
          </div>
        )}

        {/* Patient (si lié) */}
        {patient && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-user" style={{ color: "#185FA5", fontSize: 16, width: 20 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#142131", fontSize: 12.5 }}>
                {patient.nom} {patient.prenom || ""}
              </div>
            </div>
          </div>
        )}

        {/* Demandeur */}
        {achat.demandeur_nom && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-user-circle" style={{ color: "#5aa05a", fontSize: 16, width: 20 }} />
            <div style={{ color: "#2a3a48", fontSize: 12 }}>
              Demandé par <b>{achat.demandeur_nom}</b>
            </div>
          </div>
        )}

        {/* Date */}
        {achat.created_at && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee", fontSize: 11, color: "#6c7a89" }}>
            Créé le {fmtDate(achat.created_at)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", background: "#f4f7fa", borderTop: "1px solid #e3e9ee" }}>
        <button onClick={navigate} style={{ width: "100%", background: "#185FA5", color: "#fff", border: "none", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          Ouvrir l'achat <i className="ti ti-arrow-right" />
        </button>
      </div>
    </>
  );
}
