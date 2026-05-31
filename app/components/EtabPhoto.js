"use client";
// =============================================================
//  app/components/EtabPhoto.js (Alpha 0.55.36)
//
//  Récupère une photo d'établissement via l'API Wikipedia
//  (gratuite, sans clé, CORS OK avec origin=*).
//  Cache localStorage 7 jours pour éviter les appels répétés.
//
//  Si aucune photo trouvée → fallback gradient avec icône.
//
//  Usage :
//    <EtabPhoto
//      nom="Hôpital Saint-Joseph"
//      ville="Paris"
//      type="Hôpital"               // pour le fallback icône
//      height={140}                  // hauteur
//      variant="card"                // 'card' | 'banner' | 'avatar'
//    />
// =============================================================

import { useEffect, useState, useRef } from "react";

const CACHE_KEY_PREFIX = "aveho:etab-photo:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

// Mémoire en RAM pendant la session (évite re-fetch même si pas en localStorage)
const inFlightCache = new Map();

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
    return obj.url; // peut être "" pour "pas trouvé, ne pas redemander"
  } catch { return null; }
}

function setCached(key, url) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ t: Date.now(), url }));
  } catch {}
}

async function fetchWikiPhoto(query) {
  if (!query) return "";
  // Mémoire RAM
  if (inFlightCache.has(query)) return inFlightCache.get(query);

  const promise = (async () => {
    try {
      // API Wikipedia FR : generator=search + prop=pageimages → 1 seul appel
      const url = `https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return "";
      const data = await res.json();
      const pages = data?.query?.pages;
      if (!pages) return "";
      const firstPage = Object.values(pages)[0];
      return firstPage?.thumbnail?.source || "";
    } catch {
      return "";
    }
  })();
  inFlightCache.set(query, promise);
  return promise;
}

export default function EtabPhoto({
  nom,
  ville,
  type,
  height = 140,
  variant = "card",
  borderRadius,
  className = "",
  style = {},
}) {
  const [photoUrl, setPhotoUrl] = useState(null); // null = loading, "" = no photo, "..." = url
  const [photoError, setPhotoError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!nom) {
      setPhotoUrl("");
      return;
    }
    const cacheKey = `${nom}|${ville || ""}`;
    // 1) localStorage cache
    const cached = getCached(cacheKey);
    if (cached !== null) {
      setPhotoUrl(cached);
      return;
    }
    // 2) Fetch
    setPhotoUrl(null); // loading
    setPhotoError(false);
    const query = ville ? `${nom} ${ville}` : nom;
    fetchWikiPhoto(query).then((url) => {
      if (!mountedRef.current) return;
      setCached(cacheKey, url);
      setPhotoUrl(url);
    });
  }, [nom, ville]);

  const fallback = getFallback(type);
  const hasPhoto = !!photoUrl && !photoError;

  const radius = borderRadius != null ? borderRadius : (variant === "avatar" ? "50%" : 10);

  // Skeleton pendant chargement
  if (photoUrl === null) {
    return (
      <div
        className={className}
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
        <style>{`
          @keyframes skeleton {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // Photo trouvée
  if (hasPhoto) {
    return (
      <div
        className={className}
        style={{
          height,
          width: variant === "avatar" ? height : "100%",
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: radius,
          position: "relative",
          overflow: "hidden",
          ...style,
        }}
      >
        {/* Watermark Wikipedia discret */}
        <div style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          fontSize: 8.5,
          color: "rgba(255,255,255,0.85)",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          fontWeight: 600,
          letterSpacing: 0.3,
          pointerEvents: "none",
        }}>
          📷 Wikipedia
        </div>
        {/* Image cachée pour détecter l'erreur de chargement */}
        <img
          src={photoUrl}
          alt=""
          onError={() => setPhotoError(true)}
          style={{ display: "none" }}
        />
      </div>
    );
  }

  // Fallback gradient + icône
  return (
    <div
      className={className}
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
      }}
    >
      <i className={`ti ${fallback.ic}`} style={{ fontSize: Math.min(height * 0.5, 60), opacity: 0.85 }} />
    </div>
  );
}
