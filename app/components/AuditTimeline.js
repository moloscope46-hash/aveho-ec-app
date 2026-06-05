"use client";
// =============================================================
//  AuditTimeline — Composant timeline partagé (0.58.30)
//
//  Réutilisé par /historique (0.58.25) et /audit (0.58.30).
//  Affiche une liste d'événements groupés par jour avec pastilles
//  d'action, badges entité, et avatar utilisateur hashé.
//
//  Props :
//   - rows : array d'événements (audit_log)
//   - onClickRow : optionnel, callback au clic d'une ligne
//   - showDetailJson : si true, ajoute un bouton "Voir détail" qui
//     appelle onClickRow (pour /audit qui ouvre la modal JSON)
//   - emptyMessage : message si rows vide
// =============================================================
import { Badge } from "../ui";

// Libellés des actions
const ACTION_LBL = {
  creer: "Création", modifier: "Modification", supprimer: "Suppression",
  valider: "Validation", refuser: "Refus", recevoir: "Réception",
  inviter: "Invitation", connexion: "Connexion", cloturer: "Clôture",
  signer: "Signature", envoyer: "Envoi", archiver: "Archivage",
  soumettre: "Soumission",
};

const ACTION_COLOR = {
  creer: "#5aa05a", modifier: "#185FA5", supprimer: "#C9867F",
  valider: "#5aa05a", refuser: "#c0392b", recevoir: "#185FA5",
  inviter: "#7a6fb0", connexion: "#7CC8C8", cloturer: "#5aa05a",
  signer: "#185FA5", envoyer: "#EF9F27", archiver: "#8a98a8",
  soumettre: "#EF9F27",
};

const ACTION_ICON = {
  creer: "ti-plus", modifier: "ti-edit", supprimer: "ti-trash",
  valider: "ti-circle-check", refuser: "ti-circle-x",
  recevoir: "ti-package", inviter: "ti-user-plus",
  connexion: "ti-login", cloturer: "ti-lock-check",
  signer: "ti-signature", envoyer: "ti-send",
  archiver: "ti-archive", soumettre: "ti-arrow-up",
};

function fmtDay(key) {
  const d = new Date(key);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dCmp = new Date(d); dCmp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - dCmp) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function emailToInitials(email) {
  if (!email) return "?";
  const part = email.split("@")[0];
  const parts = part.split(/[.\-_]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return part.slice(0, 2).toUpperCase();
}

function avatarColor(email) {
  if (!email) return "#8a98a8";
  const palette = ["#185FA5", "#7CC8C8", "#7a6fb0", "#C9867F", "#5aa05a", "#EF9F27"];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export default function AuditTimeline({ rows = [], onClickRow, showDetailJson = false, emptyMessage = "Aucune action enregistrée." }) {
  // Groupage par jour
  const groupedByDay = {};
  rows.forEach((r) => {
    const day = new Date(r.created_at).toISOString().slice(0, 10);
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(r);
  });
  const days = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));

  if (!rows.length) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#8a98a8", fontSize: 13 }}>
        <i className="ti ti-history" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 10 }} />
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {days.map((day) => (
        <div key={day} style={{ position: "relative" }}>
          {/* Header jour */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg, #142131 0%, #243044 100%)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 99,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: ".3px",
            boxShadow: "0 4px 12px rgba(20,33,49,.20)",
            marginBottom: 14,
            textTransform: "capitalize",
          }}>
            <i className="ti ti-calendar" />
            {fmtDay(day)}
            <span style={{
              background: "rgba(124,200,200,.2)",
              color: "#7CC8C8",
              padding: "2px 9px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 800,
              marginLeft: 4,
            }}>
              {groupedByDay[day].length} action{groupedByDay[day].length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Timeline items du jour */}
          <div style={{
            position: "relative",
            paddingLeft: 32,
            borderLeft: "2px solid #e3e9ee",
            marginLeft: 14,
          }}>
            {groupedByDay[day].map((r, idx) => {
              const actionColor = ACTION_COLOR[r.action] || "#8a98a8";
              const actionIcon = ACTION_ICON[r.action] || "ti-circle";
              const isDelete = r.action === "supprimer";
              return (
                <div key={r.id || `${day}-${idx}`} style={{
                  position: "relative",
                  paddingBottom: 18,
                  animation: `av-fade-in 0.4s ${idx * 0.04}s var(--av-ease-out) backwards`,
                }}>
                  {/* Pastille icône */}
                  <div style={{
                    position: "absolute",
                    left: -49,
                    top: 2,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${actionColor}, ${actionColor}cc)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    boxShadow: `0 0 0 3px #fff, 0 4px 12px ${actionColor}55, 0 0 16px ${actionColor}33`,
                    flexShrink: 0,
                  }}>
                    <i className={`ti ${actionIcon}`} />
                  </div>

                  {/* Card event */}
                  <div
                    onClick={onClickRow ? () => onClickRow(r) : undefined}
                    style={{
                      background: isDelete
                        ? "linear-gradient(135deg, #fef2f0 0%, #fff 100%)"
                        : "#fff",
                      border: `1px solid ${isDelete ? "#f0d5d2" : "#e3e9ee"}`,
                      borderLeft: `3px solid ${actionColor}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      boxShadow: "0 2px 8px rgba(20,33,49,.05)",
                      transition: "transform 150ms, box-shadow 200ms",
                      cursor: onClickRow ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(2px)";
                      e.currentTarget.style.boxShadow = `0 6px 16px rgba(20,33,49,.08), 0 0 12px ${actionColor}22`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(20,33,49,.05)";
                    }}
                  >
                    {/* Ligne 1 : Action + Entité + Heure */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{
                        color: actionColor,
                        fontWeight: 700,
                        fontSize: 13.5,
                      }}>
                        {ACTION_LBL[r.action] || r.action}
                      </span>
                      <span style={{ color: "#cfd8e0", fontSize: 12 }}>·</span>
                      <Badge kind={r.entite}>{r.entite}</Badge>
                      <span style={{
                        marginLeft: "auto",
                        fontSize: 11.5,
                        color: "#8a98a8",
                        fontVariantNumeric: "tabular-nums",
                        background: "#f4f7fa",
                        padding: "2px 9px",
                        borderRadius: 99,
                        border: "1px solid #e3e9ee",
                      }}>
                        {fmtTime(r.created_at)}
                      </span>
                    </div>

                    {/* Ligne 2 : Détails */}
                    {r.details && Object.keys(r.details).length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12.5, color: "#6c7a89" }}>
                        {r.details.numero && <b style={{ color: "#142131" }}>{r.details.numero}</b>}
                        {r.details.numero && " · "}
                        {Object.entries(r.details).filter(([k]) => k !== "numero").slice(0, 4).map(([k, v]) => (
                          <span key={k}>
                            <span style={{ color: "#8a98a8" }}>{k}:</span>{" "}
                            {typeof v === "object" ? JSON.stringify(v).slice(0, 30) : String(v).slice(0, 40)}{" · "}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Ligne 3 : Avatar utilisateur + bouton détail JSON si demandé */}
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: avatarColor(r.user_email),
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: ".5px",
                      }}>
                        {emailToInitials(r.user_email)}
                      </div>
                      <span style={{ fontSize: 12, color: "#142131", fontWeight: 500 }}>
                        {r.user_email || "—"}
                      </span>
                      {showDetailJson && onClickRow && (
                        <span style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          color: "#185FA5",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          <i className="ti ti-code" />
                          Voir détail JSON
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
