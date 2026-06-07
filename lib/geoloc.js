// =============================================================
//  geoloc — Auto-géoloc via API data.gouv.fr/api-adresse (0.62.4)
//  Pas de clé API, pas de quota dur, gratuit
// =============================================================

/**
 * Géocode une adresse française via api-adresse.data.gouv.fr
 * @param {string} adresse - "12 rue de la paix, 75002 Paris"
 * @returns {Promise<{lat, lng, label, ville, code_postal, score} | null>}
 */
export async function geocoderAdresse(adresse) {
  if (!adresse || adresse.trim().length < 5) return null;
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`api-adresse ${r.status}`);
    const data = await r.json();
    if (!data.features?.length) return null;
    const f = data.features[0];
    const [lng, lat] = f.geometry.coordinates;
    return {
      lat,
      lng,
      label: f.properties.label,
      ville: f.properties.city || null,
      code_postal: f.properties.postcode || null,
      score: f.properties.score,
      contexte: f.properties.context,
    };
  } catch (e) {
    console.warn("[geocoderAdresse]", e);
    return null;
  }
}

/**
 * Géocodage inverse : coords → adresse
 */
export async function geocoderInverse(lat, lng) {
  if (!lat || !lng) return null;
  try {
    const url = `https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lng}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.features?.length) return null;
    const f = data.features[0];
    return {
      label: f.properties.label,
      ville: f.properties.city,
      code_postal: f.properties.postcode,
    };
  } catch { return null; }
}
