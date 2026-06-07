"use client";
// =============================================================
//  TourneesMap — Carte des tournées du magasin (0.62.8)
//  Affiche en cours + à faire avec popups détaillés
// =============================================================
import { useEffect, useRef, useState } from "react";
import { createClient } from "../../lib/supabase";

const STATUT_META = {
  en_cours: { col: "#185FA5", lbl: "🚛 EN COURS", ic: "🚚" },
  planifiee: { col: "#EF9F27", lbl: "📅 PLANIFIÉE", ic: "📅" },
  a_faire: { col: "#7a6fb0", lbl: "⏳ À FAIRE", ic: "⏳" },
  terminee: { col: "#5aa05a", lbl: "✓ TERMINÉE", ic: "✓" },
};

export function TourneesMap({ magasinId, height = 380 }) {
  const supabase = createClient();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [tournees, setTournees] = useState([]);
  const [leafletReady, setLeafletReady] = useState(false);

  // Charger Leaflet CDN
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.L) { setLeafletReady(true); return; }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialiser la map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([46.5, 2.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
  }, [leafletReady]);

  // Charger les tournées en cours + à faire
  async function loadTournees() {
    const todayDate = new Date().toISOString().slice(0, 10);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch (e) { console.warn("[TourneesMap]", e); return []; } };
    // 0.62.12 : remplacer or() (qui plante 400 sur date) par in() + filter client
    let q = supabase.from("tournees")
      .select("*, vehicules_magasin(immatriculation, marque, modele)")
      .in("statut", ["en_cours", "planifiee", "a_faire"])
      .order("date_tournee");
    if (magasinId) q = q.eq("magasin_id", magasinId);
    let list = await tryFetch(q);
    // Filtre client : statut en cours OU date_tournee >= today
    list = list.filter(t => t.statut === "en_cours" || (t.date_tournee && t.date_tournee >= todayDate));
    const enrichies = await Promise.all(list.map(async (t) => {
      const [etapes, chauffeur, gps] = await Promise.all([
        tryFetch(supabase.from("tournees_etapes").select("*, etablissements(nom, ville, adresse), demandes_internes(numero, commentaire)").eq("tournee_id", t.id).order("ordre")),
        t.chauffeur_user_id ? tryFetch(supabase.from("membres_structure").select("prenom, nom").eq("user_id", t.chauffeur_user_id).limit(1)) : Promise.resolve([]),
        tryFetch(supabase.from("tournees_gps_track").select("latitude, longitude, recorded_at").eq("tournee_id", t.id).order("recorded_at", { ascending: false }).limit(1)),
      ]);
      return { ...t, _etapes: etapes, _chauffeur: chauffeur[0], _gps: gps[0] };
    }));
    setTournees(enrichies);
  }

  useEffect(() => {
    loadTournees();
    const itv = setInterval(loadTournees, 30000);
    return () => clearInterval(itv);
  }, [magasinId]);

  // Dessiner markers
  useEffect(() => {
    if (!leafletReady || !markersLayerRef.current || !window.L) return;
    const L = window.L;
    markersLayerRef.current.clearLayers();
    const allPoints = [];

    tournees.forEach(t => {
      const meta = STATUT_META[t.statut] || STATUT_META.planifiee;
      const chauffeurNom = t._chauffeur ? `${t._chauffeur.prenom || ""} ${t._chauffeur.nom || ""}`.trim() : "Non assigné";
      const etapes = t._etapes || [];
      const etapesAvecCoords = etapes.filter(e => e.latitude && e.longitude);
      const etapesTerminees = etapes.filter(e => e.statut === "terminee").length;
      const prochaine = etapes.find(e => e.statut === "en_cours") || etapes.find(e => e.statut === "a_faire");

      // Position courante : GPS le plus récent
      const positionCourante = t._gps
        ? [parseFloat(t._gps.latitude), parseFloat(t._gps.longitude)]
        : (etapesAvecCoords[0] ? [parseFloat(etapesAvecCoords[0].latitude), parseFloat(etapesAvecCoords[0].longitude)] : null);

      // Trace polyline entre étapes
      if (etapesAvecCoords.length > 1) {
        const coords = etapesAvecCoords.map(e => [parseFloat(e.latitude), parseFloat(e.longitude)]);
        L.polyline(coords, {
          color: meta.col, weight: 3, opacity: 0.6, dashArray: t.statut === "en_cours" ? null : "8,8",
        }).addTo(markersLayerRef.current);
        coords.forEach(c => allPoints.push(c));
      }

      // Marker véhicule (position GPS)
      if (positionCourante) {
        const isEnCours = t.statut === "en_cours";
        const icon = L.divIcon({
          className: "tournee-camion",
          html: `<div style="
            width: 36px; height: 36px;
            background: ${meta.col};
            border: 3px solid #fff; border-radius: 10px;
            box-shadow: 0 3px 8px rgba(0,0,0,.3);
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; position: relative;
          ">🚚${isEnCours ? '<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#5aa05a;border:2px solid #fff;border-radius:50%;"></span>' : ""}</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18],
        });
        const m = L.marker(positionCourante, { icon }).addTo(markersLayerRef.current);
        const progressPct = etapes.length > 0 ? Math.round((etapesTerminees / etapes.length) * 100) : 0;
        const dureeRest = t.duree_estimee_min ? `${Math.floor(t.duree_estimee_min / 60)}h${(t.duree_estimee_min % 60).toString().padStart(2, "0")}` : null;
        const dernierGps = t._gps ? new Date(t._gps.recorded_at).toLocaleString("fr-FR") : null;

        m.bindPopup(`
          <div style="min-width: 320px; font-family: 'Segoe UI', sans-serif;">
            <div style="display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid #e3e9ee; margin-bottom: 10px;">
              <div style="background: ${meta.col}; color: #fff; width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">${meta.ic}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 14px; color: #142131;">${t.numero || t.nom || `T-${t.id.substring(0, 8)}`}</div>
                <div style="font-size: 11px; color: ${meta.col}; font-weight: 700;">${meta.lbl}</div>
              </div>
            </div>
            <div style="font-size: 12px; line-height: 1.7;">
              <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;color:#2a3a48;">
                <span style="color:#8a98a8;">👤 Chauffeur</span><b>${chauffeurNom}</b>
                <span style="color:#8a98a8;">🚚 Véhicule</span><b>${t.vehicules_magasin?.immatriculation || "—"}${t.vehicules_magasin?.marque ? ` (${t.vehicules_magasin.marque} ${t.vehicules_magasin.modele || ""})` : ""}</b>
                <span style="color:#8a98a8;">📅 Date</span><b>${t.date_tournee || "—"}</b>
                ${t.distance_estimee_km ? `<span style="color:#8a98a8;">📏 Distance</span><b>${t.distance_estimee_km} km</b>` : ""}
                ${dureeRest ? `<span style="color:#8a98a8;">⏱ Durée est.</span><b>${dureeRest}</b>` : ""}
                ${prochaine ? `<span style="color:#8a98a8;">🎯 Prochaine</span><b>${prochaine.etablissements?.nom || prochaine.label || "—"}</b>` : ""}
              </div>
              ${prochaine?.demandes_internes?.commentaire ? `<div style="margin-top: 8px; padding: 8px 10px; background: #f4f7fa; border-radius: 6px; font-size: 11px;"><b>📋 Contenu DI :</b><br/>${prochaine.demandes_internes.commentaire}</div>` : ""}
              <div style="margin-top: 8px;">
                <div style="display:flex;justify-content:space-between;font-size:10.5px;color:#5a6878;margin-bottom:3px;">
                  <span><b>Progression :</b> ${etapesTerminees}/${etapes.length} étapes</span><span>${progressPct}%</span>
                </div>
                <div style="background:#e3e9ee;border-radius:4px;height:6px;overflow:hidden;">
                  <div style="background:${meta.col};height:6px;width:${progressPct}%;"></div>
                </div>
              </div>
              ${dernierGps ? `<div style="margin-top: 6px; font-size: 10px; color: #5aa05a; font-style: italic;">📍 GPS : ${dernierGps}</div>` : ""}
              <div style="margin-top: 10px; text-align: right;">
                <a href="/magasin/tournees/${t.id}" style="color: #185FA5; font-weight: 700; font-size: 11px; text-decoration: none;">Voir détail →</a>
              </div>
            </div>
          </div>
        `);
        m.bindTooltip(`<b>${t.numero || t.nom || "Tournée"}</b> · ${chauffeurNom}`, { direction: "top", offset: [0, -20], opacity: 0.95 });
        allPoints.push(positionCourante);
      }

      // Markers étapes
      etapesAvecCoords.forEach(e => {
        const isDone = e.statut === "terminee";
        const isCurrent = e.statut === "en_cours";
        const col = isDone ? "#5aa05a" : isCurrent ? "#EF9F27" : meta.col;
        const stepIcon = L.divIcon({
          className: "tournee-etape",
          html: `<div style="
            width: 24px; height: 24px; background: ${col}; color: #fff;
            border: 2px solid #fff; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 700;
            box-shadow: 0 2px 4px rgba(0,0,0,.2);
          ">${e.ordre || "•"}</div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        });
        const sm = L.marker([parseFloat(e.latitude), parseFloat(e.longitude)], { icon: stepIcon }).addTo(markersLayerRef.current);
        sm.bindPopup(`
          <div style="min-width: 240px; font-family: 'Segoe UI', sans-serif;">
            <div style="font-weight: 700; color: #142131; margin-bottom: 6px;">${isDone ? "✓" : isCurrent ? "🟡" : "⏳"} Étape ${e.ordre} ${e.etablissements?.nom || e.label || ""}</div>
            ${e.etablissements?.ville ? `<div style="font-size: 11.5px; color: #5a6878;">📍 ${e.etablissements.ville}</div>` : ""}
            ${e.etablissements?.adresse ? `<div style="font-size: 11px; color: #8a98a8;">${e.etablissements.adresse}</div>` : ""}
            ${e.demandes_internes?.numero ? `<div style="font-size: 11px; color: #185FA5; margin-top: 4px;"><b>DI :</b> ${e.demandes_internes.numero}</div>` : ""}
            ${e.notes ? `<div style="font-size: 11px; color: #5a6878; font-style: italic; margin-top: 4px;">${e.notes}</div>` : ""}
            <div style="margin-top: 6px; font-size: 10.5px; color: ${col}; font-weight: 700;">Statut : ${e.statut}</div>
          </div>
        `);
      });
    });

    // Auto-fit bounds
    if (allPoints.length > 0 && mapInstanceRef.current) {
      try {
        const bounds = L.latLngBounds(allPoints);
        if (bounds.isValid()) mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      } catch {}
    }
  }, [tournees, leafletReady]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{ height, width: "100%", borderRadius: 10, border: "1px solid #e3e9ee", background: "#f4f7fa" }} />
      <div style={{
        position: "absolute", top: 10, right: 10,
        background: "rgba(255,255,255,.95)", padding: "8px 12px",
        borderRadius: 8, fontSize: 11, color: "#5a6878",
        boxShadow: "0 2px 6px rgba(0,0,0,.1)", zIndex: 500,
      }}>
        <div><b>{tournees.filter(t => t.statut === "en_cours").length}</b> en cours</div>
        <div><b>{tournees.filter(t => t.statut === "planifiee").length}</b> planifiée(s)</div>
      </div>
      {tournees.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(255,255,255,.95)", padding: "16px 24px",
          borderRadius: 10, fontSize: 13, color: "#5a6878",
          boxShadow: "0 4px 12px rgba(0,0,0,.15)", textAlign: "center",
        }}>
          <i className="ti ti-route" style={{ fontSize: 32, color: "#cfd8e0", display: "block", marginBottom: 8 }} />
          Aucune tournée en cours ou planifiée.<br/>
          <span style={{ fontSize: 11, color: "#8a98a8" }}>Crée une nouvelle tournée avec le bouton ci-dessus.</span>
        </div>
      )}
    </div>
  );
}
