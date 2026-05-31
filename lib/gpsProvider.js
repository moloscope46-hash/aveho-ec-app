"use client";
// =============================================================
//  gpsProvider.js
//  Alpha 0.55.4 — Gestion du fournisseur GPS par défaut
//
//  Stocke en localStorage le choix de l'utilisateur (Google Maps,
//  Waze, Apple Maps, Plans), et fournit un helper openItinerary()
//  qui ouvre l'URL appropriée pour des coordonnées GPS.
// =============================================================

const LS_KEY = "aveho_gps_provider";

export const GPS_PROVIDERS = {
  google: {
    id: "google",
    name: "Google Maps",
    icon: "ti-brand-google",
    color: "#4285F4",
    description: "Itinéraire dans Google Maps (multiplateforme)",
    urlNav: (lat, lng, label) => 
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${label ? `&destination_place_id=${encodeURIComponent(label)}` : ""}`,
    urlPin: (lat, lng) => 
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  },
  waze: {
    id: "waze",
    name: "Waze",
    icon: "ti-brand-waze",
    color: "#33CCFF",
    description: "Navigation Waze (idéal en voiture, alertes communauté)",
    urlNav: (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    urlPin: (lat, lng) => `https://waze.com/ul?ll=${lat},${lng}`,
  },
  apple: {
    id: "apple",
    name: "Plans (Apple)",
    icon: "ti-brand-apple",
    color: "#000",
    description: "Plans d'Apple — idéal sur iPhone/iPad",
    urlNav: (lat, lng, label) => 
      `https://maps.apple.com/?daddr=${lat},${lng}${label ? `&q=${encodeURIComponent(label)}` : ""}`,
    urlPin: (lat, lng) => 
      `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`,
  },
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    icon: "ti-map",
    color: "#7CC8C8",
    description: "Voir dans OpenStreetMap (sans navigation)",
    urlNav: (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
    urlPin: (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
  },
};

export function getGPSProvider() {
  if (typeof window === "undefined") return GPS_PROVIDERS.google;
  try {
    const id = localStorage.getItem(LS_KEY);
    if (id && GPS_PROVIDERS[id]) return GPS_PROVIDERS[id];
  } catch {}
  // Détection automatique : iOS → Apple, sinon Google
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return GPS_PROVIDERS.apple;
  return GPS_PROVIDERS.google;
}

export function setGPSProvider(id) {
  if (!GPS_PROVIDERS[id]) return;
  try { localStorage.setItem(LS_KEY, id); } catch {}
}

// Ouvre l'itinéraire vers les coordonnées avec le provider courant
export function openItinerary(lat, lng, label) {
  if (!lat || !lng) return;
  const p = getGPSProvider();
  const url = p.urlNav(lat, lng, label);
  window.open(url, "_blank", "noopener,noreferrer");
}

// Ouvre une vue/pin sans navigation (juste afficher le lieu)
export function openPin(lat, lng) {
  if (!lat || !lng) return;
  const p = getGPSProvider();
  const url = p.urlPin(lat, lng);
  window.open(url, "_blank", "noopener,noreferrer");
}
