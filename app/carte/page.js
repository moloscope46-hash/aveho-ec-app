"use client";
// =============================================================
//  /carte — Carte géolocalisée des établissements + camions demo
//  Alpha 0.54.0 (AX)
//
//  Stack : Leaflet 1.9.4 chargé via CDN (pas de poids dans le bundle Next).
//  Pas de SSR — initialisation côté client uniquement.
// =============================================================
import { useEffect, useState, useRef } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { getStoredPosition, getGeolocChoice } from "../GeolocPrompt";

// 12 camions de démonstration — trajets simulés sur la France métropolitaine
// Chaque camion a un trajet départ → destination + une vitesse, et boucle.
const CAMIONS_DEMO = [
  { id: "C-001", type: "livraison", plaque: "AV-001-EC", chauffeur: "Pierre L.", magasin: "Aveho Paris 12e",
    depart: [48.8534, 2.3488], arrivee: [48.8638, 2.3434], etabDest: "Hôpital Cochin", contenu: "3 lits médicalisés + 2 fauteuils roulants" },
  { id: "C-002", type: "sav", plaque: "AV-002-EC", chauffeur: "Marie D.", magasin: "Aveho Lyon",
    depart: [45.7640, 4.8357], arrivee: [45.7484, 4.8467], etabDest: "EHPAD Les Tilleuls", contenu: "Intervention SAV — lève-personne en panne" },
  { id: "C-003", type: "livraison", plaque: "AV-003-EC", chauffeur: "Karim B.", magasin: "Aveho Marseille",
    depart: [43.2965, 5.3698], arrivee: [43.3047, 5.4014], etabDest: "Clinique Saint-Roch", contenu: "1 lit + matelas anti-escarres" },
  { id: "C-004", type: "transit", plaque: "AV-004-EC", chauffeur: "Sophie M.", magasin: "Aveho Toulouse",
    depart: [43.6047, 1.4442], arrivee: [43.6109, 1.4520], etabDest: "EHPAD La Colline", contenu: "Transfert inter-établissements — 2 fauteuils" },
  { id: "C-005", type: "livraison", plaque: "AV-005-EC", chauffeur: "Lucas P.", magasin: "Aveho Lille",
    depart: [50.6292, 3.0573], arrivee: [50.6500, 3.0750], etabDest: "Hôpital Roger Salengro", contenu: "5 chaises percées + 1 déambulateur" },
  { id: "C-006", type: "sav", plaque: "AV-006-EC", chauffeur: "Léa V.", magasin: "Aveho Bordeaux",
    depart: [44.8378, -0.5792], arrivee: [44.8500, -0.6000], etabDest: "MAS Le Vert Bocage", contenu: "SAV — révision annuelle parc fauteuils" },
  { id: "C-007", type: "livraison", plaque: "AV-007-EC", chauffeur: "Thomas R.", magasin: "Aveho Nantes",
    depart: [47.2184, -1.5536], arrivee: [47.2400, -1.5800], etabDest: "USLD Saint-Jacques", contenu: "Matelas + protections + traversins" },
  { id: "C-008", type: "transit", plaque: "AV-008-EC", chauffeur: "Yasmine F.", magasin: "Aveho Strasbourg",
    depart: [48.5734, 7.7521], arrivee: [48.5800, 7.7700], etabDest: "Clinique Sainte-Anne", contenu: "Transfert urgent — déambulateur de prêt" },
  { id: "C-009", type: "livraison", plaque: "AV-009-EC", chauffeur: "Mathieu G.", magasin: "Aveho Nice",
    depart: [43.7102, 7.2620], arrivee: [43.7050, 7.2700], etabDest: "EHPAD Les Mimosas", contenu: "2 lits électriques + télécommandes" },
  { id: "C-010", type: "sav", plaque: "AV-010-EC", chauffeur: "Clara N.", magasin: "Aveho Rennes",
    depart: [48.1173, -1.6778], arrivee: [48.1200, -1.6900], etabDest: "Foyer Le Hameau", contenu: "Réparation soulève-malade" },
  { id: "C-011", type: "livraison", plaque: "AV-011-EC", chauffeur: "Hugo T.", magasin: "Aveho Reims",
    depart: [49.2583, 4.0317], arrivee: [49.2600, 4.0500], etabDest: "Hôpital Robert Debré", contenu: "Verticalisateur + accessoires" },
  { id: "C-012", type: "transit", plaque: "AV-012-EC", chauffeur: "Emma S.", magasin: "Aveho Tours",
    depart: [47.3941, 0.6848], arrivee: [47.3900, 0.7000], etabDest: "Résidence Bel Horizon", contenu: "Inter-magasin — réassort stock" },
];

const TYPE_META = {
  livraison: { label: "Livraison", color: "#5aa05a", icon: "📦" },
  sav: { label: "SAV", color: "#EF9F27", icon: "🔧" },
  transit: { label: "Inter-étab", color: "#7a6fb0", icon: "🔄" },
};

export default function CartePage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [etabs, setEtabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const etabsLayerRef = useRef(null);
  const camionsLayerRef = useRef(null);
  const userPosLayerRef = useRef(null);  // Alpha 0.55.0 : marqueur "Ma position"
  const camionsStateRef = useRef([]); // état mouvement
  const animRef = useRef(null);
  const [selectedCamion, setSelectedCamion] = useState(null);
  const [filtreType, setFiltreType] = useState({ livraison: true, sav: true, transit: true });

  // 0.55.8 : Init Leaflet + carte en un seul useEffect patient
  // Le problème en prod était une race condition : `setLeafletReady(true)` déclenchait
  // un 2e effect mais mapRef.current pouvait être null (DOM pas encore commit).
  // Solution : tout dans un seul effect, avec attente active de mapRef.current.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    (async () => {
      try {
        // 1. Charger Leaflet (CSS + JS) si pas déjà fait
        if (!window.L) {
          await import("leaflet/dist/leaflet.css");
          const L = (await import("leaflet")).default;
          // Fix webpack : Leaflet cherche ses images par URL relative, ça casse avec bundlers
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
          window.L = L;
        }
        if (cancelled) return;

        // 2. Attendre patiemment que React ait commit la div (max 50 tentatives × 60ms = 3s)
        let tries = 0;
        while (!mapRef.current && tries < 50) {
          await new Promise(r => setTimeout(r, 60));
          tries++;
        }
        if (cancelled) return;
        if (!mapRef.current) {
          console.error("[Carte] mapRef.current toujours null après 3s, abandon");
          return;
        }
        if (mapInstanceRef.current) return;  // déjà initialisé (HMR ou re-render)

        // 3. Créer la carte
        const L = window.L;
        const map = L.map(mapRef.current, {
          center: [46.7, 2.4],  // centre France
          zoom: 6,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        etabsLayerRef.current = L.layerGroup().addTo(map);
        camionsLayerRef.current = L.layerGroup().addTo(map);
        userPosLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        // 4. Marqueur position user si dispo
        drawUserPosition();

        // 5. Marquer prêt → déclenche le rendu des étabs/camions
        setLeafletReady(true);
      } catch (e) {
        console.error("[Carte] Erreur init Leaflet :", e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Charger les établissements géolocalisés
  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    const { data } = await supabase
      .from("etablissements")
      .select("id, nom, type, adresse, code_postal, ville, telephone, email, capacite, latitude, longitude, est_partenaire")
      .eq("structure_id", auth.structureId);
    setEtabs(data || []);
    setLoading(false);
  }

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId]);

  // 0.55.8 : 2e effect — animation des camions (la map est créée dans le 1er useEffect)
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current || !camionsLayerRef.current) return;

    // Initialiser état mouvements camions (progress 0..1 entre depart et arrivee)
    camionsStateRef.current = CAMIONS_DEMO.map(c => ({
      ...c,
      progress: Math.random(),  // démarre à un point aléatoire du trajet
      vitesse: 0.0015 + Math.random() * 0.002,  // vitesse aléatoire
      direction: 1,  // 1 = aller, -1 = retour
    }));

    // Lancer animation
    function step() {
      camionsStateRef.current = camionsStateRef.current.map(c => {
        let p = c.progress + c.vitesse * c.direction;
        let dir = c.direction;
        if (p >= 1) { p = 1; dir = -1; }
        if (p <= 0) { p = 0; dir = 1; }
        return { ...c, progress: p, direction: dir };
      });
      drawCamions();
      animRef.current = requestAnimationFrame(step);
    }
    step();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      // Note : on ne détruit pas la map ici (elle est gérée par le 1er useEffect)
    };
  }, [leafletReady]);

  // Dessiner / mettre à jour les marqueurs établissements
  useEffect(() => {
    if (!leafletReady || !etabsLayerRef.current) return;
    const L = window.L;
    etabsLayerRef.current.clearLayers();

    const geolocalises = etabs.filter(e => e.latitude && e.longitude);
    geolocalises.forEach(e => {
      // 0.55.3 : marqueur différencié selon est_partenaire
      const isPartner = e.est_partenaire;
      const bgGradient = isPartner 
        ? "linear-gradient(135deg, #7CC8C8, #5a8f8f)"
        : "linear-gradient(135deg, #185FA5, #1c5454)";
      const emoji = isPartner ? "🏢" : "🏥";
      
      const icon = L.divIcon({
        className: "etab-marker",
        html: `<div style="
          width: 38px; height: 38px; 
          background: ${bgGradient};
          border: 3px solid #fff; border-radius: 50%;
          box-shadow: 0 2px 8px rgba(20,33,49,.35);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 18px;
        ">${emoji}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker([Number(e.latitude), Number(e.longitude)], { icon }).addTo(etabsLayerRef.current);
      const popupHtml = `
        <div style="min-width: 220px; font-family: 'Segoe UI', sans-serif;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <div style="font-weight: 700; font-size: 15px; color: #142131;">${e.nom}</div>
            ${isPartner 
              ? `<span style="background:#e6f7f7;color:#1c5454;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:8px;text-transform:uppercase;letter-spacing:.3px">Partenaire</span>` 
              : `<span style="background:#eef5fc;color:#185FA5;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:8px;text-transform:uppercase;letter-spacing:.3px">Géré</span>`}
          </div>
          ${e.type ? `<div style="font-size: 11px; color: #6c7a89; background: #eef5fc; display: inline-block; padding: 2px 8px; border-radius: 8px; margin-bottom: 6px;">${e.type}</div>` : ""}
          <div style="font-size: 12px; color: #2a3a48; line-height: 1.5; margin-top: 4px;">
            ${e.adresse ? `📍 ${e.adresse}<br/>` : ""}
            ${e.code_postal || e.ville ? `${e.code_postal || ""} ${e.ville || ""}<br/>` : ""}
            ${e.telephone ? `📞 ${e.telephone}<br/>` : ""}
            ${e.email ? `✉️ ${e.email}<br/>` : ""}
            ${e.capacite ? `🛏️ Capacité : ${e.capacite} lits` : ""}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });

    // Auto-fit bounds si plusieurs étabs
    if (geolocalises.length > 0) {
      const bounds = L.latLngBounds(geolocalises.map(e => [Number(e.latitude), Number(e.longitude)]));
      // Inclure aussi les camions visibles dans les bounds
      CAMIONS_DEMO.forEach(c => { 
        if (filtreType[c.type]) {
          bounds.extend(c.depart); 
          bounds.extend(c.arrivee); 
        }
      });
      // Alpha 0.55.0 : inclure la position user si dispo
      const userPos = (typeof window !== "undefined" && window._avehoUserPosition) || getStoredPosition();
      if (userPos) bounds.extend([userPos.lat, userPos.lng]);
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
      }
    }
  }, [leafletReady, etabs, filtreType]);

  // Alpha 0.55.0 : afficher marqueur "Ma position" sur la carte
  function drawUserPosition() {
    if (!window.L || !userPosLayerRef.current) return;
    const L = window.L;
    userPosLayerRef.current.clearLayers();

    const pos = window._avehoUserPosition || getStoredPosition();
    if (!pos) return;

    // Marqueur pulsant bleu
    const icon = L.divIcon({
      className: "user-pos-marker",
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="
            position: absolute; inset: 0;
            background: #185FA5;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 12px rgba(24,95,165,.50);
            z-index: 2;
          "></div>
          <div style="
            position: absolute; inset: -10px;
            background: rgba(24,95,165,.18);
            border: 2px solid rgba(24,95,165,.40);
            border-radius: 50%;
            animation: userPulse 2s ease-out infinite;
            z-index: 1;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 1000 })
      .addTo(userPosLayerRef.current);
    marker.bindPopup(`
      <div style="min-width: 180px; font-family: 'Segoe UI', sans-serif;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <div style="background: #185FA5; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">📍</div>
          <div style="font-weight: 700; font-size: 14px; color: #142131;">Ma position</div>
        </div>
        <div style="font-size: 11.5px; color: #6c7a89; line-height: 1.5;">
          Lat : <code>${pos.lat.toFixed(5)}</code><br/>
          Lng : <code>${pos.lng.toFixed(5)}</code>
        </div>
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e3e9ee; font-size: 10px; color: #8a98a8;">
          Position partagée uniquement avec votre navigateur
        </div>
      </div>
    `);
  }

  // Fonction qui redessine les camions à chaque frame
  function drawCamions() {
    if (!leafletReady || !camionsLayerRef.current || !window.L) return;
    const L = window.L;
    camionsLayerRef.current.clearLayers();

    camionsStateRef.current.forEach(c => {
      if (!filtreType[c.type]) return;
      const lat = c.depart[0] + (c.arrivee[0] - c.depart[0]) * c.progress;
      const lng = c.depart[1] + (c.arrivee[1] - c.depart[1]) * c.progress;
      const meta = TYPE_META[c.type];
      
      const icon = L.divIcon({
        className: "camion-marker",
        html: `<div style="
          width: 32px; height: 32px; 
          background: ${meta.color};
          border: 2px solid #fff; border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          transform: rotate(${c.direction > 0 ? "0" : "180"}deg);
          transition: transform 0.3s;
        ">🚚</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(camionsLayerRef.current);
      
      const popupHtml = `
        <div style="min-width: 260px; font-family: 'Segoe UI', sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="background: ${meta.color}; color: #fff; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">${meta.icon}</div>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: #142131;">${c.plaque}</div>
              <div style="font-size: 11px; color: ${meta.color}; font-weight: 600;">${meta.label.toUpperCase()}</div>
            </div>
          </div>
          <div style="font-size: 12px; color: #2a3a48; line-height: 1.6;">
            <div><b>👤 Chauffeur :</b> ${c.chauffeur}</div>
            <div><b>🏪 Magasin :</b> ${c.magasin}</div>
            <div><b>🎯 Destination :</b> ${c.etabDest}</div>
            <div style="margin-top: 6px; padding: 6px 10px; background: #f4f7fa; border-radius: 6px; font-size: 11.5px;">
              <b>📋 Contenu :</b> ${c.contenu}
            </div>
            <div style="margin-top: 6px; font-size: 10.5px; color: #8a98a8; font-style: italic;">
              Progression : ${Math.round(c.progress * 100)}% · ${c.direction > 0 ? "→ Aller" : "← Retour"}
            </div>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e3e9ee; font-size: 10px; color: #c0392b; font-weight: 600;">
            ⚠️ Données de démonstration — positions simulées
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }

  function toggleType(t) {
    setFiltreType(prev => ({ ...prev, [t]: !prev[t] }));
  }

  // Alpha 0.55.0 : centrer la carte sur la position user
  function centerOnMe() {
    if (!mapInstanceRef.current) return;
    const pos = (typeof window !== "undefined" && window._avehoUserPosition) || getStoredPosition();
    if (pos) {
      mapInstanceRef.current.flyTo([pos.lat, pos.lng], 13, { duration: 1 });
      // Réactiver le marqueur au cas où il n'y soit pas encore
      drawUserPosition();
    } else {
      // Demander la position en live si pas dispo
      if (!navigator.geolocation) {
        alert("Géolocalisation non disponible sur cet appareil");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const data = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
          try { 
            localStorage.setItem("aveho_geoloc_choice", "accepted");
            localStorage.setItem("aveho_geoloc_last_pos", JSON.stringify(data)); 
          } catch {}
          window._avehoUserPosition = { lat: data.lat, lng: data.lng };
          drawUserPosition();
          mapInstanceRef.current.flyTo([data.lat, data.lng], 13, { duration: 1 });
        },
        (err) => {
          alert(err.code === 1 
            ? "Permission refusée — active la géoloc dans les paramètres de ton navigateur" 
            : "Impossible de récupérer ta position : " + err.message
          );
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }
  }

  const geolocalises = etabs.filter(e => e.latitude && e.longitude);
  const nonGeolocalises = etabs.filter(e => !e.latitude || !e.longitude);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="VUE GÉOGRAPHIQUE"
          icon="ti-map"
          title="Carte"
          accent="logistique"
          sub="Établissements géolocalisés et flotte de camions Aveho en temps réel"
        />

        {loading ? (
          <Panel><StateMsg>Chargement des établissements…</StateMsg></Panel>
        ) : (
          <>
            {/* Stats + filtres */}
            <Panel style={{ marginBottom: 14, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 13 }}>
                  <span><i className="ti ti-home" style={{ color: "#185FA5", marginRight: 4 }} /> <b>{geolocalises.filter(e=>!e.est_partenaire).length}</b> mes étabs</span>
                  <span><i className="ti ti-route" style={{ color: "#7CC8C8", marginRight: 4 }} /> <b>{geolocalises.filter(e=>e.est_partenaire).length}</b> partenaires</span>
                  {nonGeolocalises.length > 0 && (
                    <span style={{ color: "#8a98a8" }}>
                      <i className="ti ti-alert-triangle" style={{ color: "#EF9F27", marginRight: 4 }} /> 
                      {nonGeolocalises.length} sans coordonnées
                    </span>
                  )}
                  <span><i className="ti ti-truck" style={{ color: "#5aa05a", marginRight: 4 }} /> <b>{CAMIONS_DEMO.length}</b> camions (démo)</span>
                </div>
                <div className="chip-row">
                  {Object.entries(TYPE_META).map(([key, m]) => (
                    <button
                      key={key}
                      onClick={() => toggleType(key)}
                      style={{
                        background: filtreType[key] ? m.color : "#fff",
                        color: filtreType[key] ? "#fff" : m.color,
                        border: `1px solid ${m.color}`,
                        padding: "4px 12px",
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>{m.icon}</span> {m.label}
                    </button>
                  ))}
                  {/* Alpha 0.55.0 : bouton centrer ma position */}
                  <button
                    onClick={centerOnMe}
                    title="Centrer la carte sur ma position"
                    style={{
                      background: "#fff",
                      color: "#185FA5",
                      border: "1px solid #185FA5",
                      padding: "4px 12px",
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <i className="ti ti-current-location" /> Ma position
                  </button>
                </div>
              </div>
            </Panel>

            {/* Conteneur carte */}
            <Panel style={{ padding: 0, overflow: "hidden" }}>
              {!leafletReady && (
                <div style={{ height: 600, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#f4f7fa" }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 32, color: "#185FA5", animation: "spin 1.2s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "#6c7a89" }}>Chargement de la carte…</span>
                </div>
              )}
              <div
                ref={mapRef}
                className="carte-leaflet-container"
                style={{
                  width: "100%",
                  background: "#e3e9ee",
                  display: leafletReady ? "block" : "none",
                }}
              />
              {geolocalises.length === 0 && leafletReady && (
                <div style={{ padding: 16, textAlign: "center", background: "#fff8ec", borderTop: "1px solid #f0d59f", fontSize: 13, color: "#7a4f15" }}>
                  <i className="ti ti-info-circle" /> Aucun établissement géolocalisé pour le moment. 
                  Ouvre la <a href="/etablissement/fiche" style={{ color: "#185FA5", fontWeight: 600 }}>fiche établissement</a> et remplis l'adresse — la position GPS sera trouvée automatiquement.
                </div>
              )}
            </Panel>

            <Panel style={{ marginTop: 14, padding: "12px 16px", background: "#fff8ec", borderColor: "#f0d59f" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#7a4f15" }}>
                <i className="ti ti-info-circle" /> <b>Mode démo :</b> les 12 camions affichés sont des données simulées avec trajets aléatoires (livraisons, SAV, inter-établissements). 
                Quand votre flotte sera équipée de balises GPS, ces marqueurs refléteront la position réelle de vos véhicules en temps réel.
              </p>
            </Panel>
          </>
        )}
      </div>
      <style jsx global>{`
        .leaflet-container { font-family: 'Segoe UI', sans-serif !important; }
        .leaflet-popup-content { margin: 12px 16px !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; box-shadow: 0 8px 24px rgba(20,33,49,.18) !important; }
        .carte-leaflet-container { height: 600px; }
        @media (max-width: 640px) {
          .carte-leaflet-container { height: 420px; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes userPulse {
          0% { transform: scale(.95); opacity: .6; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
