// =============================================================
//  lib/geocode.js — Géocodage gratuit via API data.gouv.fr (0.62.38)
//  Utilise api-adresse.data.gouv.fr (BAN, France)
// =============================================================

/**
 * Recherche d'adresse et géocodage
 * @param {string} query - Adresse à chercher (ex: "10 rue de Rivoli Paris")
 * @returns {Promise<Array<{label, ville, code_postal, latitude, longitude, score}>>}
 */
export async function geocodeAddress(query, limit = 5) {
  if (!query?.trim()) return [];
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=${limit}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.features || []).map(f => ({
      label: f.properties.label,
      ville: f.properties.city,
      code_postal: f.properties.postcode,
      adresse: f.properties.name,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      score: f.properties.score,
      type: f.properties.type,
    }));
  } catch (e) {
    console.warn("[geocode] failed:", e);
    return [];
  }
}

/**
 * Géocodage inverse : lat/lng → adresse
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const f = data.features?.[0];
    if (!f) return null;
    return {
      label: f.properties.label,
      ville: f.properties.city,
      code_postal: f.properties.postcode,
      adresse: f.properties.name,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    };
  } catch (e) {
    console.warn("[reverse-geocode] failed:", e);
    return null;
  }
}

/**
 * Distance Haversine entre 2 points (en km)
 */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
