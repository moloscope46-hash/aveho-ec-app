"use client";
// =============================================================
//  DIPreview — Aperçu rapide DI au survol
//  Alpha 0.39.0
//
//  Utilisation :
//    <DIPreview di={d} patient={p}>
//      <span>DI-2026-042</span>
//    </DIPreview>
// =============================================================
import EntityPreview from "./EntityPreview";
import { statutColor } from "./PatientPreview";
import { fmtDate } from "../lib/format";

export default function DIPreview({ di, patient = null, materiel = null, children, disabled = false }) {
  return (
    <EntityPreview
      entity={di}
      href={`/interventions?id=${di.id}`}
      disabled={disabled}
      width={320}
      maxHeight={380}
      renderPopover={({ navigate }) => (
        <DIPopoverContent di={di} patient={patient} materiel={materiel} navigate={navigate} />
      )}
    >
      {children}
    </EntityPreview>
  );
}

function DIPopoverContent({ di, patient, materiel, navigate }) {
  const isUrgent = di.urgence === "Urgent";
  const colors = statutColor(di.statut);

  return (
    <>
      {/* Header — rouge si Urgent, sinon navy */}
      <div style={{
        background: isUrgent
          ? "linear-gradient(135deg, #8c2a23 0%, #c0392b 100%)"
          : "linear-gradient(135deg, #142131 0%, #1e4a91 100%)",
        color: "#fff",
        padding: "12px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(255,255,255,.16)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="ti ti-tools" style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {di.numero || "DI sans numéro"}
            </div>
            <div style={{ fontSize: 11, color: isUrgent ? "#fdd" : "#bfe6e6", marginTop: 1 }}>
              {di.type || "Type non précisé"}
              {isUrgent && <> · <b style={{ textTransform: "uppercase", letterSpacing: ".5px" }}>Urgent</b></>}
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
          }}>{di.statut || "—"}</span>
        </div>

        {/* Patient */}
        {patient && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-user" style={{ color: "#185FA5", fontSize: 16, width: 20 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#142131", fontSize: 12.5 }}>
                {patient.nom} {patient.prenom || ""}
              </div>
              {patient.chambre && (
                <div style={{ color: "#6c7a89", fontSize: 11 }}>Chambre {patient.chambre}</div>
              )}
            </div>
          </div>
        )}

        {/* Matériel */}
        {materiel && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-armchair-2" style={{ color: "#7CC8C8", fontSize: 16, width: 20 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#142131", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {materiel.libelle || "Matériel"}
              </div>
              {(materiel.num_serie || materiel.num_parc) && (
                <div style={{ color: "#6c7a89", fontSize: 11 }}>
                  {materiel.num_parc && `Parc ${materiel.num_parc}`}
                  {materiel.num_parc && materiel.num_serie && " · "}
                  {materiel.num_serie && `S/N ${materiel.num_serie}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Demandeur / Description */}
        {di.demandeur_nom && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-user-circle" style={{ color: "#7a6fb0", fontSize: 16, width: 20 }} />
            <div style={{ color: "#2a3a48", fontSize: 12 }}>
              Demandé par <b>{di.demandeur_nom}</b>
            </div>
          </div>
        )}

        {/* Description courte */}
        {di.description && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee" }}>
            <div style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 4 }}>
              Description
            </div>
            <div style={{ color: "#2a3a48", fontSize: 12, lineHeight: 1.4, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              {di.description}
            </div>
          </div>
        )}

        {/* Dates */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6c7a89" }}>
          {di.created_at && <span>Créée {fmtDate(di.created_at)}</span>}
          {di.cloturee_le && <span>Clôturée {fmtDate(di.cloturee_le)}</span>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", background: "#f4f7fa", borderTop: "1px solid #e3e9ee" }}>
        <button onClick={navigate} style={{ width: "100%", background: "#185FA5", color: "#fff", border: "none", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          Ouvrir la DI <i className="ti ti-arrow-right" />
        </button>
      </div>
    </>
  );
}
