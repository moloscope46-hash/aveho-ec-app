"use client";
// =============================================================
//  GPSProviderModal.js
//  Alpha 0.55.4 — Modal de choix du fournisseur GPS par défaut
//
//  Apparaît au clic sur le bouton GPS d'une ligne d'établissement
//  si l'user n'a pas encore choisi. Sinon ouvre direct l'itinéraire.
// =============================================================
import { useState } from "react";
import { GPS_PROVIDERS, getGPSProvider, setGPSProvider} from "../lib/gpsProvider";
export default function GPSProviderModal({ open, onClose, lat, lng, label, mode = "nav", configOnly = false }) {
  const [current, setCurrent] = useState(() => getGPSProvider().id);

  if (!open) return null;

  function pickAndGo(providerId) {
    setGPSProvider(providerId);
    setCurrent(providerId);
    if (configOnly) {
      // Juste enregistrer le choix, ne pas ouvrir
      onClose();
      return;
    }
    const p = GPS_PROVIDERS[providerId];
    const url = mode === "pin" ? p.urlPin(lat, lng) : p.urlNav(lat, lng, label);
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  function setDefault(providerId) {
    setGPSProvider(providerId);
    setCurrent(providerId);
  }

  return (
    <div 
      style={{
        position: "fixed", inset: 0,
        background: "rgba(20,33,49,.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 200,
        padding: 16,
        animation: "fadeIn .2s ease",
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(20,33,49,.30)",
          maxWidth: 480,
          width: "100%",
          padding: 24,
          animation: "slideUp .25s cubic-bezier(.4,0,.2,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            background: "linear-gradient(135deg, #185FA5, #1c5454)",
            width: 44, height: 44, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="ti ti-navigation" style={{ fontSize: 22, color: "#fff" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#142131" }}>
              {configOnly ? "Choisir l'appli GPS par défaut" : "Ouvrir l'itinéraire"}
            </h2>
            {!configOnly && label && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6c7a89" }}>
                Vers : <b>{label}</b>
              </p>
            )}
            {configOnly && (
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6c7a89" }}>
                Pour les itinéraires depuis l'annuaire et la carte
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              color: "#8a98a8", cursor: "pointer",
              padding: 4, fontSize: 20,
            }}
            aria-label="Fermer"
          >
            <i className="ti ti-x" />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 12px", lineHeight: 1.5 }}>
          Choisis ton appli GPS préférée. Ton choix sera mémorisé pour les prochains itinéraires.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          {Object.values(GPS_PROVIDERS).map(p => {
            const isCurrent = current === p.id;
            return (
              <div 
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  background: isCurrent ? "#eef5fc" : "#fff",
                  border: `2px solid ${isCurrent ? p.color : "#e3e9ee"}`,
                  borderRadius: 10,
                  transition: "all .15s",
                }}
              >
                <div style={{
                  background: p.color, color: "#fff",
                  width: 36, height: 36, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <i className={`ti ${p.icon}`} style={{ fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#142131", display: "flex", alignItems: "center", gap: 6 }}>
                    {p.name}
                    {isCurrent && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, letterSpacing: ".4px",
                        background: p.color, color: "#fff",
                        padding: "1px 6px", borderRadius: 6,
                      }}>
                        DÉFAUT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 1 }}>
                    {p.description}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {!isCurrent && (
                    <button
                      onClick={() => setDefault(p.id)}
                      title="Définir comme défaut"
                      style={{
                        background: "transparent", border: "1px solid #e3e9ee",
                        color: "#6c7a89", padding: "5px 8px",
                        borderRadius: 6, cursor: "pointer",
                        fontFamily: "inherit", fontSize: 11, fontWeight: 600,
                      }}
                    >
                      <i className="ti ti-pin" />
                    </button>
                  )}
                  <button
                    onClick={() => pickAndGo(p.id)}
                    style={{
                      background: p.color,
                      color: "#fff", border: "none",
                      padding: "6px 12px", borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    {configOnly ? "Choisir" : <>Ouvrir <i className="ti ti-external-link" /></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!configOnly && (
          <div style={{ marginTop: 14, padding: "8px 12px", background: "#f4f7fa", borderRadius: 8, fontSize: 11, color: "#6c7a89", lineHeight: 1.5 }}>
            <i className="ti ti-info-circle" /> Coordonnées : <code style={{ fontFamily: "Consolas, monospace", color: "#2a5a5a" }}>{lat?.toFixed(5)}, {lng?.toFixed(5)}</code>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
