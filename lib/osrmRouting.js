"use client";
// =============================================================
//  OSRM Routing (gratuit, open-source) — calcul d'itinéraire RÉEL
//  Remplace Haversine (distance à vol d'oiseau) sur /tournees-globales
//  API publique : router.project-osrm.org (rate-limited mais OK pour dev)
//  Pour prod : déployer un OSRM Docker local
// =============================================================

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const FALLBACK_KM_PER_DEGREE = 111;

/**
 * Calcule un itinéraire entre 2 points (ou plus)
 * @param {Array<{lat, lng}>} waypoints
 * @returns {Promise<{distance_km, duree_min, geometry: [[lat,lng]...]}>}
 */
export async function calculateRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;
  
  try {
    const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(";");
    const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
    
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error("OSRM error " + r.status);
    
    const data = await r.json();
    if (!data.routes?.[0]) throw new Error("No route");
    
    const route = data.routes[0];
    return {
      distance_km: route.distance / 1000,
      duree_min: route.duration / 60,
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      source: "osrm",
    };
  } catch (e) {
    // Fallback : Haversine
    return haversineRoute(waypoints);
  }
}

/**
 * Optimise l'ordre des waypoints (TSP-like simple via OSRM trip)
 */
export async function optimizeRoute(start, stops, end = null) {
  const all = end ? [start, ...stops, end] : [start, ...stops];
  if (all.length < 2) return null;
  
  try {
    const coords = all.map(p => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first${end ? "&destination=last" : ""}&overview=full&geometries=geojson`;
    
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error("OSRM trip error");
    
    const data = await r.json();
    if (!data.trips?.[0]) throw new Error("No trip");
    
    return {
      distance_km: data.trips[0].distance / 1000,
      duree_min: data.trips[0].duration / 60,
      geometry: data.trips[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      waypoint_order: data.waypoints.sort((a, b) => a.waypoint_index - b.waypoint_index).map(w => w.waypoint_index),
      source: "osrm-trip",
    };
  } catch (e) {
    return null;
  }
}

/**
 * Fallback Haversine (à vol d'oiseau) si OSRM indispo
 */
function haversineRoute(waypoints) {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversine(waypoints[i - 1], waypoints[i]);
  }
  return {
    distance_km: total,
    duree_min: total * 1.5, // ~ 40 km/h moyenne mixte
    geometry: waypoints.map(p => [p.lat, p.lng]),
    source: "haversine-fallback",
  };
}

function haversine(p1, p2) {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
