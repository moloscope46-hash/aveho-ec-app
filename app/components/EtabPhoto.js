"use client";
// =============================================================
//  app/components/EtabPhoto.js (Alpha 0.55.38)
//
//  Wikipedia retiré (les photos ne correspondaient pas à l'adresse).
//  Si NEXT_PUBLIC_GOOGLE_PLACES_KEY est défini :
//    → recherche Google Places "Find Place" par nom + adresse
//    → récupère la photo, horaires, étoiles, avis
//  Sinon : fallback gradient propre selon le type.
//
//  Pour activer Google Places API :
//    1. Aller sur https://console.cloud.google.com/google/maps-apis
//    2. Activer "Places API"
//    3. Créer une clé API et la restreindre par domaine
//    4. Ajouter dans .env.local :
//         NEXT_PUBLIC_GOOGLE_PLACES_KEY=AIzaSy...
//    5. Coût : ~1000 req gratuites/mois, ~$17/1000 ensuite
// =============================================================

import { useEffect, useState, useRef } from "react";
import { fetchWithAuth } from "../../lib/fetchWithAuth";

const CACHE_KEY_PREFIX = "aveho:etab-place:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ICON_BY_TYPE = {
  "Hôpital":       { ic: "ti-building-hospital", grad: "linear-gradient(135deg, #185FA5, #7CC8C8)" },
  "EHPAD":         { ic: "ti-building-community", grad: "linear-gradient(135deg, #7a6fb0, #bfa9e0)" },
  "Clinique":      { ic: "ti-stethoscope", grad: "linear-gradient(135deg, #5aa05a, #a8d590)" },
  "Cabinet":       { ic: "ti-prescription", grad: "linear-gradient(135deg, #EF9F27, #f5c673)" },
  "Pharmacie":     { ic: "ti-pill", grad: "linear-gradient(135deg, #c0392b, #e8857a)" },
  "Fournisseur":   { ic: "ti-truck-delivery", grad: "linear-gradient(135deg, #2a5a5a, #7CC8C8)" },
  "Sous-traitant": { ic: "ti-handshake", grad: "linear-gradient(135deg, #EF9F27, #f5c673)" },
  "Autre":         { ic: "ti-building", grad: "linear-gradient(135deg, #6c7a89, #a0aeb9)" },
};

function getFallback(type) {
  if (!type) return ICON_BY_TYPE["Autre"];
  const lower = type.toLowerCase();
  for (const key of Object.keys(ICON_BY_TYPE)) {
    if (lower.includes(key.toLowerCase().slice(0, 4))) return ICON_BY_TYPE[key];
  }
  return ICON_BY_TYPE["Autre"];
}

function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.t > CACHE_TTL_MS) return null;
    return obj.data;
  } catch { return null; }
}

function setCached(key, data) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ t: Date.now(), data }));
  } catch {}
}

const inFlightCache = new Map();

async function fetchGooglePlace(nom, adresseComplete) {
  if (!nom) return null;
  const key = `${nom}|${adresseComplete || ""}`;
  if (inFlightCache.has(key)) return inFlightCache.get(key);

  const promise = (async () => {
    try {
      // Appel via notre proxy serveur (pour cacher la clé API)
      const params = new URLSearchParams({ nom });
      if (adresseComplete) params.set("adresse", adresseComplete);
      const res = await fetchWithAuth(`/api/place?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.ok) return null;
      return data.place || null;
    } catch {
      return null;
    }
  })();
  inFlightCache.set(key, promise);
  return promise;
}

export default function EtabPhoto({
  nom,
  ville,
  adresse,
  type,
  height = 140,
  variant = "card",
  borderRadius,
  className = "",
  style = {},
  onPlaceLoaded, // (place) => void, pour exposer les détails au parent
}) {
  const [place, setPlace] = useState(null); // null = loading, {} = no data
  const [photoError, setPhotoError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!nom) {
      setPlace({});
      return;
    }
    const adresseComplete = [adresse, ville].filter(Boolean).join(", ");
    const cacheKey = `${nom}|${adresseComplete}`;
    const cached = getCached(cacheKey);
    if (cached !== null) {
      setPlace(cached);
      onPlaceLoaded?.(cached);
      return;
    }
    setPlace(null);
    setPhotoError(false);
    fetchGooglePlace(nom, adresseComplete).then((p) => {
      if (!mountedRef.current) return;
      const final = p || {};
      setCached(cacheKey, final);
      setPlace(final);
      onPlaceLoaded?.(final);
    }).catch(() => {
      // 0.57.5 : fetch a échoué (réseau, 4xx, 5xx) — on affiche le fallback
      if (!mountedRef.current) return;
      setPlace({});
      setPhotoError(true);
    });
  }, [nom, ville, adresse]);

  const fallback = getFallback(type);
  const hasPhoto = !!place?.photoUrl && !photoError;

  const radius = borderRadius != null ? borderRadius : (variant === "avatar" ? "50%" : 10);

  // Skeleton chargement
  if (place === null) {
    return (
      <div className={className}
        style={{
          height,
          width: variant === "avatar" ? height : "100%",
          background: "linear-gradient(90deg, #e3e9ee 0%, #f4f7fa 50%, #e3e9ee 100%)",
          backgroundSize: "200% 100%",
          animation: "skeleton 1.5s ease-in-out infinite",
          borderRadius: radius,
          ...style,
        }}
      >
        <style>{`@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  // Photo Google trouvée
  if (hasPhoto) {
    return (
      <div className={className}
        style={{
          height,
          width: variant === "avatar" ? height : "100%",
          backgroundImage: `url(${place.photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: radius,
          position: "relative",
          overflow: "hidden",
          ...style,
        }}>
        {/* Note Google si dispo */}
        {place.rating > 0 && (
          <div style={{
            position: "absolute", top: 6, left: 6,
            background: "rgba(255,255,255,0.95)",
            padding: "3px 8px",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            color: "#142131",
            display: "flex",
            alignItems: "center",
            gap: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}>
            <span style={{ color: "#EF9F27" }}>★</span> {place.rating.toFixed(1)}
            {place.userRatingsTotal > 0 && (
              <span style={{ color: "#6c7a89", fontWeight: 500, fontSize: 10 }}>
                ({place.userRatingsTotal})
              </span>
            )}
          </div>
        )}
        {/* Watermark Google discret */}
        <div style={{
          position: "absolute", bottom: 4, right: 6,
          fontSize: 8.5, color: "rgba(255,255,255,0.85)",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          fontWeight: 600, letterSpacing: 0.3, pointerEvents: "none",
        }}>
          📍 Google Maps
        </div>
        <img src={place.photoUrl} alt="" onError={() => setPhotoError(true)} style={{ display: "none" }} />
      </div>
    );
  }

  // Fallback gradient + icône
  return (
    <div className={className}
      style={{
        height,
        width: variant === "avatar" ? height : "100%",
        background: fallback.grad,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        ...style,
      }}>
      <i className={`ti ${fallback.ic}`} style={{ fontSize: Math.min(height * 0.5, 60), opacity: 0.85 }} />
    </div>
  );
}
