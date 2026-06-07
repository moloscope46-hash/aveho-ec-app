// =============================================================
//  gpsHelpers — Tracking GPS chauffeur + OSRM routing (0.61.8)
// =============================================================
"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "./supabase";

// =============================================================
// 1. Tracking GPS chauffeur — envoie position toutes les 30s en DB
// =============================================================
export function useGpsTracking({ tourneeId, enabled = false, intervalMs = 30000 }) {
  const supabase = createClient();
  const [position, setPosition] = useState(null);
  const [error, setError] = useState("");
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled || !tourneeId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Géolocalisation non supportée");
      return;
    }

    setWatching(true);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const newPos = { lat: latitude, lng: longitude, accuracy, speed, heading, timestamp: Date.now() };
        setPosition(newPos);

        // 0.61.9 : Enregistre chaque position dans tournees_gps_track (historique)
        if (Date.now() - lastSentRef.current >= intervalMs) {
          lastSentRef.current = Date.now();
          try {
            await supabase.from("tournees_gps_track").insert({
              tournee_id: tourneeId,
              latitude, longitude,
              accuracy_m: accuracy,
              speed_kmh: speed ? speed * 3.6 : null,
              heading_deg: heading,
            });
            // Met aussi à jour la dernière position connue sur tournees
            await supabase.from("tournees").update({
              point_depart_lat: latitude,
              point_depart_lng: longitude,
              updated_at: new Date().toISOString(),
            }).eq("id", tourneeId);
          } catch (e) { console.warn("[gps update]", e); }
        }
      },
      (err) => {
        setError(`Erreur GPS : ${err.message}`);
        setWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setWatching(false);
    };
  }, [enabled, tourneeId, intervalMs]);

  return { position, error, watching };
}

// =============================================================
// 2. OSRM routing — calcule l'itinéraire optimisé entre N points
//    Utilise l'API publique OSRM (gratuit, max 5000 req/jour/IP)
// =============================================================
export async function calculerItineraire(points) {
  if (!points || points.length < 2) return null;
  // Format OSRM : lng1,lat1;lng2,lat2;...
  const coords = points.map(p => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`OSRM ${r.status}`);
    const data = await r.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      geometry: route.geometry,           // GeoJSON LineString
      distance_m: route.distance,         // mètres
      duree_s: route.duration,            // secondes
      distance_km: (route.distance / 1000).toFixed(2),
      duree_min: Math.round(route.duration / 60),
    };
  } catch (e) {
    console.warn("[OSRM]", e);
    return null;
  }
}

// =============================================================
// 3. OSRM Trip — optimise l'ordre des étapes (TSP)
//    Première et dernière étape = point de départ
// =============================================================
export async function optimiserTournee(points) {
  if (!points || points.length < 3) return null;
  const coords = points.map(p => `${p.lng},${p.lat}`).join(";");
  // source=first&destination=last : depart et fin fixes, optimise le reste
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&destination=last&overview=full&geometries=geojson&roundtrip=false`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`OSRM trip ${r.status}`);
    const data = await r.json();
    if (data.code !== "Ok" || !data.trips?.length) return null;
    const trip = data.trips[0];
    return {
      geometry: trip.geometry,
      distance_m: trip.distance,
      duree_s: trip.duration,
      distance_km: (trip.distance / 1000).toFixed(2),
      duree_min: Math.round(trip.duration / 60),
      // waypoints contient l'index optimisé
      ordre: (data.waypoints || []).map(w => w.waypoint_index),
    };
  } catch (e) {
    console.warn("[OSRM trip]", e);
    return null;
  }
}
