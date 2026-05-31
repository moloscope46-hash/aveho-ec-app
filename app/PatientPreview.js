"use client";
// =============================================================
//  PatientPreview — Aperçu rapide patient au survol
//  Alpha 0.38.0 → 0.39.0 (refondu sur EntityPreview + dernière DI lazy)
// =============================================================
import { useState } from "react";
import { createClient } from "../lib/supabase";
import { fmtDate } from "../lib/format";
import EntityPreview from "./EntityPreview";

export default function PatientPreview({ patient, extras = {}, children, disabled = false }) {
  const supabase = createClient();
  const [lastDI, setLastDI] = useState(null);

  async function fetchLastDI() {
    if (lastDI !== null || !patient?.id) return;
    setLastDI("loading");
    try {
      const { data } = await supabase
        .from("interventions")
        .select("id, numero, statut, urgence, created_at")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(1);
      setLastDI(data && data.length > 0 ? data[0] : "none");
    } catch (e) {
      setLastDI("none");
    }
  }

  return (
    <EntityPreview
      entity={patient}
      href={`/patient/${patient.id}`}
      disabled={disabled}
      width={320}
      maxHeight={420}
      onHover={fetchLastDI}
      renderPopover={({ entity, navigate }) => (
        <PatientPopoverContent patient={entity} extras={extras} lastDI={lastDI} navigate={navigate} />
      )}
    >
      {children}
    </EntityPreview>
  );
}

function PatientPopoverContent({ patient, extras, lastDI, navigate }) {
  const { lit, consentStatus, etiquettes = [], nbDI = 0, nbAchats = 0 } = extras;
  const age = patient.date_naissance ? computeAge(patient.date_naissance) : null;

  return (
    <>
      <div style={{ background: "linear-gradient(135deg, #142131 0%, #1e4a91 100%)", color: "#fff", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124, 200, 200, .22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-user" style={{ fontSize: 18, color: "#7CC8C8" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {patient.nom} {patient.prenom || ""}
            </div>
            <div style={{ fontSize: 11, color: "#bfe6e6", marginTop: 1 }}>
              {age != null && <>{age} ans · </>}
              {patient.date_naissance ? `Né(e) le ${fmtDate(patient.date_naissance)}` : "Date de naissance inconnue"}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <i className="ti ti-bed" style={{ color: lit ? "#5aa05a" : "#8a98a8", fontSize: 16, width: 20 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {lit ? (
              <>
                <div style={{ fontWeight: 600, color: "#142131", fontSize: 12.5 }}>{lit.chambrePath}</div>
                <div style={{ color: "#6c7a89", fontSize: 11 }}>Lit {lit.nom}</div>
              </>
            ) : (
              <span style={{ color: "#8a98a8", fontStyle: "italic", fontSize: 12 }}>Sans chambre</span>
            )}
          </div>
        </div>
        {patient.numero_dossier && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-id" style={{ color: "#185FA5", fontSize: 16, width: 20 }} />
            <div style={{ color: "#2a3a48", fontSize: 12 }}>Dossier <b>{patient.numero_dossier}</b></div>
          </div>
        )}
        {patient.date_entree && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ti ti-calendar-event" style={{ color: "#7a6fb0", fontSize: 16, width: 20 }} />
            <div style={{ color: "#2a3a48", fontSize: 12 }}>Entrée le <b>{fmtDate(patient.date_entree)}</b></div>
          </div>
        )}
        {etiquettes.length > 0 && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 4 }}>Étiquettes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {etiquettes.slice(0, 4).map((e) => (
                <span key={e.id} style={{ background: e.couleur + "22", color: e.couleur, border: `1px solid ${e.couleur}44`, padding: "2px 8px", borderRadius: 8, fontSize: 10.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <i className="ti ti-tag" style={{ fontSize: 10 }} /> {e.libelle}
                </span>
              ))}
              {etiquettes.length > 4 && (
                <span style={{ fontSize: 10, color: "#8a98a8", padding: "2px 4px" }}>+{etiquettes.length - 4}</span>
              )}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee" }}>
          {consentStatus?.a_consenti ? (
            <>
              <i className="ti ti-shield-check" style={{ color: "#5aa05a", fontSize: 16, width: 20 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#2e6f33", fontWeight: 600, fontSize: 12 }}>Consentement RGPD signé</div>
                {consentStatus.derniere_signature && (
                  <div style={{ color: "#8a98a8", fontSize: 10.5 }}>le {fmtDate(consentStatus.derniere_signature)}</div>
                )}
              </div>
            </>
          ) : consentStatus?.consentements_refuses > 0 ? (
            <>
              <i className="ti ti-shield-x" style={{ color: "#c0392b", fontSize: 16, width: 20 }} />
              <div style={{ color: "#c0392b", fontWeight: 600, fontSize: 12 }}>Consentement RGPD refusé</div>
            </>
          ) : (
            <>
              <i className="ti ti-shield-off" style={{ color: "#EF9F27", fontSize: 16, width: 20 }} />
              <div style={{ color: "#a06a15", fontWeight: 600, fontSize: 12 }}>Consentement RGPD à recueillir</div>
            </>
          )}
        </div>
        {(nbDI > 0 || nbAchats > 0) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee" }}>
            {nbDI > 0 && (
              <div style={{ flex: 1, background: "#f4f7fa", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#185FA5", lineHeight: 1 }}>{nbDI}</div>
                <div style={{ fontSize: 9.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginTop: 2 }}>DI active{nbDI > 1 ? "s" : ""}</div>
              </div>
            )}
            {nbAchats > 0 && (
              <div style={{ flex: 1, background: "#f4f7fa", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#EF9F27", lineHeight: 1 }}>{nbAchats}</div>
                <div style={{ fontSize: 9.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginTop: 2 }}>Achat{nbAchats > 1 ? "s" : ""}</div>
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee" }}>
          <div style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, marginBottom: 4 }}>Dernière DI</div>
          {lastDI === "loading" ? (
            <div style={{ fontSize: 11.5, color: "#8a98a8" }}>
              <i className="ti ti-loader-2" style={{ animation: "aveho-spin 1s linear infinite" }} /> Chargement…
            </div>
          ) : lastDI === "none" || lastDI === null ? (
            <div style={{ fontSize: 11.5, color: "#8a98a8", fontStyle: "italic" }}>Aucune DI enregistrée</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, color: "#142131" }}>{lastDI.numero}</span>
              {lastDI.urgence === "Urgent" && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "#fef0ee", color: "#c0392b", textTransform: "uppercase", letterSpacing: ".3px" }}>Urgent</span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 8, textTransform: "uppercase", letterSpacing: ".3px", background: statutColor(lastDI.statut).bg, color: statutColor(lastDI.statut).fg }}>{lastDI.statut}</span>
              <span style={{ fontSize: 10.5, color: "#8a98a8", marginLeft: "auto" }}>{fmtDate(lastDI.created_at)}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: "10px 14px", background: "#f4f7fa", borderTop: "1px solid #e3e9ee" }}>
        <button onClick={navigate} style={{ width: "100%", background: "#185FA5", color: "#fff", border: "none", padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          Voir la fiche complète <i className="ti ti-arrow-right" />
        </button>
      </div>
    </>
  );
}

export function computeAge(dateNaissance) {
  if (!dateNaissance) return null;
  try {
    const dob = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  } catch { return null; }
}

export function statutColor(statut) {
  const map = {
    "Nouvelle": { bg: "#eaf7f7", fg: "#1c5454" },
    "En cours": { bg: "#fcefda", fg: "#7a4f15" },
    "Validée": { bg: "#dff5e0", fg: "#2e6f33" },
    "Validé": { bg: "#dff5e0", fg: "#2e6f33" },
    "À valider": { bg: "#fcefda", fg: "#7a4f15" },
    "Clôturée": { bg: "#f0f0f3", fg: "#5a6171" },
    "Urgent": { bg: "#fef0ee", fg: "#c0392b" },
    "Refusée": { bg: "#fef0ee", fg: "#c0392b" },
    "Refusé": { bg: "#fef0ee", fg: "#c0392b" },
    "Reçue": { bg: "#e8e0f0", fg: "#5e4a8c" },
    "Reçu": { bg: "#e8e0f0", fg: "#5e4a8c" },
    "Nouveau": { bg: "#eaf7f7", fg: "#1c5454" },
    "Traité": { bg: "#dff5e0", fg: "#2e6f33" },
  };
  return map[statut] || { bg: "#f4f7fa", fg: "#6c7a89" };
}
