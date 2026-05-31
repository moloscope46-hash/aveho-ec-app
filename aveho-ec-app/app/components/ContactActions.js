"use client";
// =============================================================
//  app/components/ContactActions.js (Alpha 0.55.34)
//
//  3 boutons d'action contextuels pour un contact :
//   - Appeler (tel:)
//   - Envoyer un mail (mailto:)
//   - Itinéraire GPS (popup avec choix Google/Apple/Waze/OSM/Copier)
//
//  Usage :
//    <ContactActions
//      telephone="01 23 45 67 89"
//      email="x@y.fr"
//      adresse="12 rue X"
//      cp="75011"
//      commune="Paris"
//      latitude={48.8566}
//      longitude={2.3522}
//      size="sm"          // 'sm' | 'md'
//      variant="ghost"    // 'ghost' | 'solid'
//    />
// =============================================================

import { useState } from "react";
import Modal from "./Modal";

export default function ContactActions({
  telephone,
  email,
  adresse,
  cp,
  commune,
  latitude,
  longitude,
  size = "sm",
  variant = "ghost",
}) {
  const [gpsOpen, setGpsOpen] = useState(false);

  const hasPhone = !!telephone;
  const hasEmail = !!email;
  const hasLocation = !!(adresse || commune || cp || (latitude && longitude));

  if (!hasPhone && !hasEmail && !hasLocation) return null;

  // Format de l'adresse pour les liens GPS
  const fullAddress = [adresse, cp, commune].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(fullAddress);
  const hasCoords = !!(latitude && longitude);
  const coordsParam = hasCoords ? `${latitude},${longitude}` : "";

  function call(e) {
    e.stopPropagation();
    if (telephone) window.location.href = `tel:${telephone.replace(/[\s.]/g, "")}`;
  }

  function mail(e) {
    e.stopPropagation();
    if (email) window.location.href = `mailto:${email}`;
  }

  function openGps(e) {
    e.stopPropagation();
    setGpsOpen(true);
  }

  function gpsAction(url, e) {
    e?.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
    setGpsOpen(false);
  }

  async function copyAddress(e) {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullAddress || coordsParam);
      alert("Adresse copiée !");
    } catch {
      alert("Adresse : " + (fullAddress || coordsParam));
    }
    setGpsOpen(false);
  }

  const btnStyle = (color) => ({
    background: variant === "solid" ? color : `${color}15`,
    color: variant === "solid" ? "#fff" : color,
    border: variant === "solid" ? "none" : `1px solid ${color}40`,
    padding: size === "sm" ? "4px 8px" : "6px 12px",
    borderRadius: 6,
    fontSize: size === "sm" ? 11 : 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  });

  return (
    <>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
        {hasPhone && (
          <button onClick={call} style={btnStyle("#185FA5")} title={`Appeler ${telephone}`}>
            <i className="ti ti-phone" /> Appeler
          </button>
        )}
        {hasEmail && (
          <button onClick={mail} style={btnStyle("#5aa05a")} title={`Mail à ${email}`}>
            <i className="ti ti-mail" /> Mail
          </button>
        )}
        {hasLocation && (
          <button onClick={openGps} style={btnStyle("#EF9F27")} title="Itinéraire GPS">
            <i className="ti ti-map-pin" /> GPS
          </button>
        )}
      </div>

      {/* Modale choix GPS */}
      <Modal
        open={gpsOpen}
        onClose={() => setGpsOpen(false)}
        title="Choisir une application GPS"
        subtitle={fullAddress || `${latitude}, ${longitude}`}
        icon="ti-map-pin"
        color="#EF9F27"
        maxWidth={420}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <GpsOption
            icon="ti-brand-google"
            label="Google Maps"
            color="#4285F4"
            onClick={(e) => gpsAction(
              hasCoords
                ? `https://www.google.com/maps/dir/?api=1&destination=${coordsParam}`
                : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
              e
            )}
          />
          <GpsOption
            icon="ti-brand-apple"
            label="Apple Plans"
            color="#000"
            onClick={(e) => gpsAction(
              hasCoords
                ? `https://maps.apple.com/?daddr=${coordsParam}`
                : `https://maps.apple.com/?daddr=${encoded}`,
              e
            )}
          />
          <GpsOption
            icon="ti-car"
            label="Waze"
            color="#33ccff"
            onClick={(e) => gpsAction(
              hasCoords
                ? `https://waze.com/ul?ll=${coordsParam}&navigate=yes`
                : `https://waze.com/ul?q=${encoded}&navigate=yes`,
              e
            )}
          />
          <GpsOption
            icon="ti-map"
            label="OpenStreetMap"
            color="#7ebd00"
            onClick={(e) => gpsAction(
              hasCoords
                ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`
                : `https://www.openstreetmap.org/search?query=${encoded}`,
              e
            )}
          />
          <div style={{ height: 1, background: "#e3e9ee", margin: "4px 0" }} />
          <GpsOption
            icon="ti-copy"
            label="Copier l'adresse"
            color="#6c7a89"
            onClick={copyAddress}
          />
        </div>
      </Modal>
    </>
  );
}

function GpsOption({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "#fff",
        border: "1px solid #e3e9ee",
        borderRadius: 8,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        fontSize: 13,
        transition: "all 0.15s",
        width: "100%",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e3e9ee"; }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 22, color, width: 24 }} />
      <span style={{ fontWeight: 600, color: "#142131", flex: 1 }}>{label}</span>
      <i className="ti ti-external-link" style={{ fontSize: 14, color: "#8a98a8" }} />
    </button>
  );
}
