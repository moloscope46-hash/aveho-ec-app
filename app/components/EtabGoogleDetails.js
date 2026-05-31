"use client";
// =============================================================
//  app/components/EtabGoogleDetails.js (Alpha 0.55.38)
//
//  Affiche les détails Google Places d'un établissement :
//  horaires d'ouverture, note + nb d'avis, téléphone, site web,
//  bouton "Voir sur Google Maps" + lien vers les avis.
//
//  S'utilise dans un Panel ou un Modal.
// =============================================================

import { useEffect, useState } from "react";

export default function EtabGoogleDetails({ nom, ville, adresse, compact = false }) {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nom) { setLoading(false); return; }
    const adresseComplete = [adresse, ville].filter(Boolean).join(", ");
    const params = new URLSearchParams({ nom });
    if (adresseComplete) params.set("adresse", adresseComplete);
    fetch(`/api/place?${params}`)
      .then(r => r.json())
      .then(d => {
        setPlace(d.place);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [nom, ville, adresse]);

  if (loading) {
    return (
      <div style={{ padding: 10, color: "#8a98a8", fontSize: 12 }}>
        <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Chargement des infos Google…
      </div>
    );
  }

  if (!place) {
    return (
      <div style={{ padding: 10, color: "#8a98a8", fontSize: 11.5, background: "#f4f7fa", borderRadius: 6 }}>
        <i className="ti ti-info-circle" /> Aucune info Google trouvée pour cet établissement.
      </div>
    );
  }

  return (
    <div>
      {/* Note + nombre d'avis */}
      {place.rating > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <RatingStars value={place.rating} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{place.rating.toFixed(1)}</span>
          {place.userRatingsTotal > 0 && (
            <span style={{ fontSize: 12, color: "#6c7a89" }}>
              ({place.userRatingsTotal} avis)
            </span>
          )}
          {place.googleMapsUrl && (
            <a
              href={place.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "#185FA5",
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <i className="ti ti-external-link" /> Voir les avis Google
            </a>
          )}
        </div>
      )}

      {/* Statut ouvert/fermé */}
      {place.openNow !== null && place.openNow !== undefined && (
        <div style={{
          display: "inline-block",
          background: place.openNow ? "#dff5e0" : "#fce5e0",
          color: place.openNow ? "#2e6f33" : "#7a1f15",
          padding: "3px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 10,
        }}>
          {place.openNow ? "🟢 Ouvert maintenant" : "🔴 Fermé maintenant"}
        </div>
      )}

      {/* Horaires */}
      {place.openingHours?.length > 0 && (
        <div style={{ marginBottom: compact ? 6 : 12 }}>
          <div style={{ fontSize: 11, color: "#6c7a89", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
            <i className="ti ti-clock" /> Horaires
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12, color: "#2a3a48", lineHeight: 1.7 }}>
            {place.openingHours.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {/* Contacts */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {place.phone && (
          <a href={`tel:${place.phone.replace(/[\s.]/g, "")}`} style={contactLinkStyle("#185FA5")}>
            <i className="ti ti-phone" /> {place.phone}
          </a>
        )}
        {place.website && (
          <a href={place.website} target="_blank" rel="noopener noreferrer" style={contactLinkStyle("#5aa05a")}>
            <i className="ti ti-world" /> Site web
          </a>
        )}
        {place.googleMapsUrl && (
          <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={contactLinkStyle("#EF9F27")}>
            <i className="ti ti-brand-google-maps" /> Google Maps
          </a>
        )}
      </div>
    </div>
  );
}

function RatingStars({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ color: "#EF9F27", fontSize: 16, letterSpacing: 1 }}>
      {"★".repeat(full)}
      {half ? "⯨" : ""}
      <span style={{ color: "#d3d9e0" }}>{"★".repeat(empty)}</span>
    </span>
  );
}

const contactLinkStyle = (color) => ({
  background: `${color}15`,
  color,
  border: `1px solid ${color}40`,
  padding: "5px 10px",
  borderRadius: 6,
  fontSize: 11.5,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});
