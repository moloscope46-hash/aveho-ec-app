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
import { logger } from "../../lib/logger";

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

// 0.55.38 : couleurs + emojis professions RPPS
const PROFESSION_COLORS = {
  "Médecin": "#185FA5",
  "Infirmier": "#5aa05a",
  "Kinésithérapeute": "#EF9F27",
  "Pharmacien": "#c0392b",
  "Sage-femme": "#7a6fb0",
  "Dentiste": "#7CC8C8",
  "Pédicure": "#2a5a5a",
  "Orthophoniste": "#5a4a90",
};
const PROFESSION_EMOJIS = {
  "Médecin": "🩺",
  "Infirmier": "💉",
  "Kinésithérapeute": "🤸",
  "Pharmacien": "💊",
  "Sage-femme": "🤰",
  "Dentiste": "🦷",
  "Pédicure": "🦶",
  "Orthophoniste": "🗣",
};

// 0.55.38 : catégories SIRENE pour recherche carte
const SIRENE_OVERLAY_CATS = {
  "pharmacie":          { lbl: "Pharmacies",         color: "#c0392b", emoji: "💊" },
  "matériel médical":   { lbl: "Matériel médical",   color: "#185FA5", emoji: "🦽" },
  "orthopédie":         { lbl: "Orthopédie",         color: "#5aa05a", emoji: "🦴" },
  "audioprothésiste":   { lbl: "Audioprothésistes",  color: "#7a6fb0", emoji: "👂" },
  "opticien":           { lbl: "Opticiens",          color: "#EF9F27", emoji: "👓" },
};

// 0.55.41 : helper temps relatif
function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return `il y a ${Math.floor(diff / 86_400_000)} j`;
}

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
  const finessOverlayLayerRef = useRef(null);  // 0.55.9 : marqueurs FINESS éphémères
  const rppsOverlayLayerRef = useRef(null);    // 0.55.38 : marqueurs RPPS
  const sireneOverlayLayerRef = useRef(null);  // 0.55.38 : marqueurs SIRENE
  const camionsStateRef = useRef([]); // état mouvement
  const animRef = useRef(null);
  const [selectedCamion, setSelectedCamion] = useState(null);
  const [filtreType, setFiltreType] = useState({ livraison: true, sav: true, transit: true });
  // 0.55.9 : overlay FINESS
  const [finessFilters, setFinessFilters] = useState([]);
  const [finessLoading, setFinessLoading] = useState(false);
  const [finessCount, setFinessCount] = useState(0);
  // 0.55.38 : overlays RPPS et SIRENE
  const [rppsFilters, setRppsFilters] = useState([]);    // ex: ["Médecin", "Infirmier"]
  const [rppsLoading, setRppsLoading] = useState(false);
  const [rppsCount, setRppsCount] = useState(0);
  const [sireneFilters, setSireneFilters] = useState([]); // ex: ["pharmacie", "matmed"]
  const [sireneLoading, setSireneLoading] = useState(false);
  const [sireneCount, setSireneCount] = useState(0);
  // 0.55.41 : indicateur fraîcheur géoloc
  const [geolocLoading, setGeolocLoading] = useState(false);
  const [lastGeolocAt, setLastGeolocAt] = useState(null);
  const [geolocAccuracy, setGeolocAccuracy] = useState(null);
  const fetchDebounceRef = useRef(null);

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
        finessOverlayLayerRef.current = L.layerGroup().addTo(map);  // 0.55.9
        rppsOverlayLayerRef.current = L.layerGroup().addTo(map);    // 0.55.38
        sireneOverlayLayerRef.current = L.layerGroup().addTo(map);  // 0.55.38
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

  // ============================================================
  // 0.55.9 — Overlay FINESS (ressources santé proches)
  // ============================================================
  // Catégories disponibles dans l'overlay carte
  // Chaque catégorie = {key, lbl, color, icon, emoji}
  const FINESS_OVERLAY_CATS = {
    pharmacie:     { lbl: "Pharmacies",          color: "#c0392b", emoji: "💊" },
    maison_sante:  { lbl: "Maisons de santé",    color: "#5aa05a", emoji: "🏠" },
    centre_sante:  { lbl: "Centres de santé",    color: "#185FA5", emoji: "⚕️" },
    ehpad:         { lbl: "EHPAD",               color: "#7a6fb0", emoji: "🏘" },
    hopitaux:      { lbl: "Hôpitaux/Cliniques",  color: "#142131", emoji: "🏥" },
    ssr_psy:       { lbl: "SSR / Psy",           color: "#e35d5b", emoji: "💓" },
    handicap:      { lbl: "Handicap (MAS/FAM)",  color: "#EF9F27", emoji: "♿" },
    pharma_lpp:    { lbl: "Pharma & LPP",        color: "#7CC8C8", emoji: "⚕" },
  };

  // Fetch FINESS dans la bbox actuelle de la carte + selon catégories choisies
  async function fetchFinessInBbox() {
    if (!mapInstanceRef.current || finessFilters.length === 0) {
      setFinessCount(0);
      if (finessOverlayLayerRef.current) finessOverlayLayerRef.current.clearLayers();
      return;
    }
    const bounds = mapInstanceRef.current.getBounds();
    const latDelta = bounds.getNorth() - bounds.getSouth();
    const lngDelta = bounds.getEast() - bounds.getWest();
    
    // 0.55.10 : garde-fou bbox trop large (tabular-api limite 200 résultats, ça déborde vite)
    // Au-delà de ~5° de delta dans une direction, on demande à l'user de zoomer.
    if (latDelta > 5 || lngDelta > 6) {
      if (finessOverlayLayerRef.current) finessOverlayLayerRef.current.clearLayers();
      setFinessCount(-1);  // -1 = signal "zone trop large"
      return;
    }
    
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    const cats = finessFilters.join(",");
    setFinessLoading(true);
    try {
      const res = await fetch(`/api/finess?bbox=${encodeURIComponent(bbox)}&categories=${encodeURIComponent(cats)}&limit=200`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        drawFinessOverlay(data.results);
        setFinessCount(data.results.length);
      } else {
        logger.warn("[Carte] FINESS API error:", data.error || res.status);
        setFinessCount(0);
      }
    } catch (e) {
      console.error("[Carte] fetchFiness error:", e);
      setFinessCount(0);
    } finally {
      setFinessLoading(false);
    }
  }

  function drawFinessOverlay(items) {
    if (!window.L || !finessOverlayLayerRef.current) return;
    const L = window.L;
    finessOverlayLayerRef.current.clearLayers();

    items.forEach(r => {
      if (!r.latitude || !r.longitude) return;
      // Determiner la catégorie d'affichage via le groupe
      const grp = (r.categorie_groupe || guessGroup(r));
      const cat = FINESS_OVERLAY_CATS[grp] || { color: "#8a98a8", emoji: "📍", lbl: "Autre" };

      const icon = L.divIcon({
        className: "finess-overlay-marker",
        html: `<div style="
          width:28px; height:28px;
          background:${cat.color}; border:2px solid #fff; border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,.3);
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-size:13px;
        ">${cat.emoji}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([Number(r.latitude), Number(r.longitude)], { icon })
        .addTo(finessOverlayLayerRef.current);
      const popupHtml = `
        <div style="min-width:200px;font-family:'Segoe UI',sans-serif">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="background:${cat.color};color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px">${cat.lbl}</span>
          </div>
          <div style="font-weight:700;font-size:14px;color:#142131;margin-bottom:4px">${r.raison_sociale || r.nom || "—"}</div>
          ${r.categorie ? `<div style="font-size:11px;color:#6c7a89;margin-bottom:6px">${r.categorie}</div>` : ""}
          <div style="font-size:12px;color:#2a3a48;line-height:1.5">
            ${r.adresse ? `📍 ${r.adresse}<br/>` : ""}
            ${r.code_postal || r.ville ? `${r.code_postal || ""} ${r.ville || ""}<br/>` : ""}
            ${r.telephone ? `📞 ${r.telephone}<br/>` : ""}
            ${r.finess ? `<code style="font-size:10px;color:#5a8f8f">FINESS ${r.finess}</code>` : ""}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    });
  }

  // Devine le groupe d'une catégorie FINESS à partir du code (fallback si pas explicite)
  function guessGroup(r) {
    const code = String(r.categorie_code || "");
    if (code === "620") return "pharmacie";
    if (code === "603") return "maison_sante";
    if (code === "124") return "centre_sante";
    if (["500","501","202"].includes(code)) return "ehpad";
    if (["355","365","366","356","362","411"].includes(code)) return "hopitaux";
    if (["292","660","344"].includes(code)) return "ssr_psy";
    if (["255","437","183","186","182","188","190","402","246","395","446","249","381"].includes(code)) return "handicap";
    if (["619","3201","3299"].includes(code)) return "pharma_lpp";
    return null;
  }

  // Toggle d'une catégorie + refresh
  function toggleFinessCat(key) {
    setFinessFilters(prev => prev.includes(key)
      ? prev.filter(k => k !== key)
      : [...prev, key]);
  }

  // Refetch quand les filtres changent ou que la map bouge (debounced)
  useEffect(() => {
    if (!leafletReady) return;
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(fetchFinessInBbox, 600);
    return () => fetchDebounceRef.current && clearTimeout(fetchDebounceRef.current);
  }, [finessFilters, leafletReady]);

  // 0.55.38 : fetch RPPS dans bbox
  // 0.55.41 : géocodage des adresses via BAN INSEE
  // 0.55.45 : ville depuis centre carte + limite haute + debug
  async function fetchRppsInBbox() {
    if (!mapInstanceRef.current || rppsFilters.length === 0) {
      setRppsCount(0);
      if (rppsOverlayLayerRef.current) rppsOverlayLayerRef.current.clearLayers();
      return;
    }
    setRppsLoading(true);
    try {
      const bounds = mapInstanceRef.current.getBounds();
      const center = bounds.getCenter();
      // 0.55.45 : essayer de trouver le nom de la ville au centre via reverse géocodage BAN
      const villeAuCentre = await reverseLookupCity(center.lat, center.lng);
      const allResults = [];
      for (const prof of rppsFilters) {
        const params = new URLSearchParams({ profession: prof, limit: "100" });
        // 0.55.45 : si on a la ville au centre, l'utiliser comme critère
        if (villeAuCentre) params.set("ville", villeAuCentre);
        const res = await fetch(`/api/rpps?${params}`);
        if (!res.ok) {
          console.warn("[Carte RPPS]", prof, "HTTP", res.status);
          continue;
        }
        const data = await res.json();
        if (data.ok && Array.isArray(data.results)) {
          console.log("[Carte RPPS]", prof, "→", data.results.length, "résultats");
          allResults.push(...data.results.filter(p => p.adresse || p.commune || p.cp));
        } else if (!data.ok) {
          console.warn("[Carte RPPS]", prof, "API error:", data.error);
        }
      }
      // Géocoder via BAN les adresses sans coords
      const geocoded = await geocodeBatch(allResults);
      const inBbox = geocoded.filter(p =>
        p.latitude && p.longitude &&
        p.latitude >= bounds.getSouth() && p.latitude <= bounds.getNorth() &&
        p.longitude >= bounds.getWest() && p.longitude <= bounds.getEast()
      );
      console.log("[Carte RPPS] résultats finaux", inBbox.length, "/ total fetchés", allResults.length);
      drawRppsOverlay(inBbox);
      setRppsCount(inBbox.length);
    } catch (e) {
      console.error("[Carte] fetchRpps error:", e);
      setRppsCount(0);
    } finally {
      setRppsLoading(false);
    }
  }

  // 0.55.45 : reverse géocodage BAN pour trouver le nom de ville au centre de la carte
  async function reverseLookupCity(lat, lng) {
    try {
      const cacheKey = `aveho:reverse:${lat.toFixed(2)}|${lng.toFixed(2)}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
      const url = `https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lng}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const ville = data?.features?.[0]?.properties?.city || null;
      if (ville) try { localStorage.setItem(cacheKey, ville); } catch {}
      return ville;
    } catch {
      return null;
    }
  }

  // 0.55.41 : géocoder un batch d'adresses via BAN INSEE (cache par adresse)
  async function geocodeBatch(items) {
    if (!items?.length) return [];
    const out = [];
    for (const item of items) {
      // Si déjà des coords, ne pas géocoder
      if (item.latitude && item.longitude) {
        out.push(item);
        continue;
      }
      const queryParts = [item.adresse, item.cp, item.commune].filter(Boolean);
      const query = queryParts.join(" ").trim();
      if (!query || query.length < 4) {
        out.push(item);
        continue;
      }
      // Cache local
      const cacheKey = "aveho:geocode:" + query;
      let coords = null;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) coords = JSON.parse(raw);
      } catch {}
      if (!coords) {
        try {
          const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const feat = data?.features?.[0];
            if (feat?.geometry?.coordinates) {
              coords = {
                lat: feat.geometry.coordinates[1],
                lng: feat.geometry.coordinates[0],
              };
              try { localStorage.setItem(cacheKey, JSON.stringify(coords)); } catch {}
            }
          }
        } catch {}
      }
      if (coords) {
        out.push({ ...item, latitude: coords.lat, longitude: coords.lng });
      } else {
        out.push(item);
      }
    }
    return out;
  }

  function drawRppsOverlay(items) {
    if (!window.L || !rppsOverlayLayerRef.current) return;
    const L = window.L;
    rppsOverlayLayerRef.current.clearLayers();

    items.forEach(r => {
      // Géocode approximatif depuis le CP via Photon ou fallback
      // Pour MVP : on skip ceux sans coords. Le proxy /api/rpps devrait remonter lat/lng.
      // Si pas de coord directe, on essaie via centre du CP (à faire en V2).
      if (!r.latitude || !r.longitude) return;
      const profColor = PROFESSION_COLORS[r.profession] || "#185FA5";
      const profEmoji = PROFESSION_EMOJIS[r.profession] || "👨‍⚕";

      const icon = L.divIcon({
        className: "rpps-overlay-marker",
        html: `<div style="width:24px;height:24px;background:${profColor};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px">${profEmoji}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker([Number(r.latitude), Number(r.longitude)], { icon }).addTo(rppsOverlayLayerRef.current);
      const popupHtml = `
        <div style="min-width:200px;font-family:'Segoe UI',sans-serif">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="background:${profColor};color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px">${r.profession || "RPPS"}</span>
          </div>
          <div style="font-weight:700;font-size:14px;color:#142131;margin-bottom:4px">${r.civilite || ""} ${r.prenom || ""} ${r.nom || ""}</div>
          ${r.specialite ? `<div style="font-size:11px;color:#6c7a89;margin-bottom:6px">${r.specialite}</div>` : ""}
          <div style="font-size:12px;color:#2a3a48;line-height:1.5">
            ${r.adresse ? `📍 ${r.adresse}<br/>` : ""}
            ${r.cp || ""} ${r.commune || ""}<br/>
            ${r.telephone ? `📞 ${r.telephone}<br/>` : ""}
            ${r.rpps ? `<span style="font-family:Consolas,monospace;font-size:10px;color:#a0aeb9">RPPS ${r.rpps}</span>` : ""}
          </div>
        </div>`;
      marker.bindPopup(popupHtml);
    });
  }

  useEffect(() => {
    if (!leafletReady) return;
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(fetchRppsInBbox, 600);
    return () => fetchDebounceRef.current && clearTimeout(fetchDebounceRef.current);
  }, [rppsFilters, leafletReady]);

  // 0.55.38 : fetch SIRENE dans bbox
  // 0.55.41 : utilise les coords directes SIRENE si dispo, sinon géocode BAN
  async function fetchSireneInBbox() {
    if (!mapInstanceRef.current || sireneFilters.length === 0) {
      setSireneCount(0);
      if (sireneOverlayLayerRef.current) sireneOverlayLayerRef.current.clearLayers();
      return;
    }
    const bounds = mapInstanceRef.current.getBounds();
    setSireneLoading(true);
    try {
      const center = bounds.getCenter();
      const allResults = [];
      for (const cat of sireneFilters) {
        // 0.55.41 : recherche centrée sur la zone visible (lat/long)
        const params = new URLSearchParams({
          q: cat,
          limit: "25",
          lat: center.lat.toFixed(4),
          lng: center.lng.toFixed(4),
        });
        const res = await fetch(`/api/sirene?${params}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data.results)) {
          allResults.push(...data.results.map(s => ({ ...s, _cat: cat })));
        }
      }
      // Géocoder ceux qui n'ont pas de coords directes
      const geocoded = await geocodeBatch(allResults.map(s => ({
        ...s,
        adresse: s.adresse,
        cp: s.code_postal || s.cp,
        commune: s.ville || s.commune,
      })));
      const inBbox = geocoded.filter(s =>
        s.latitude && s.longitude &&
        s.latitude >= bounds.getSouth() && s.latitude <= bounds.getNorth() &&
        s.longitude >= bounds.getWest() && s.longitude <= bounds.getEast()
      );
      drawSireneOverlay(inBbox);
      setSireneCount(inBbox.length);
    } catch (e) {
      console.error("[Carte] fetchSirene error:", e);
      setSireneCount(0);
    } finally {
      setSireneLoading(false);
    }
  }

  function drawSireneOverlay(items) {
    if (!window.L || !sireneOverlayLayerRef.current) return;
    const L = window.L;
    sireneOverlayLayerRef.current.clearLayers();

    items.forEach(r => {
      if (!r.latitude || !r.longitude) return;
      const icon = L.divIcon({
        className: "sirene-overlay-marker",
        html: `<div style="width:22px;height:22px;background:#7a6fb0;border:2px solid #fff;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px">🏢</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker([Number(r.latitude), Number(r.longitude)], { icon }).addTo(sireneOverlayLayerRef.current);
      const popupHtml = `
        <div style="min-width:200px;font-family:'Segoe UI',sans-serif">
          <div style="background:#7a6fb0;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:6px;display:inline-block;margin-bottom:4px">SIRENE</div>
          <div style="font-weight:700;font-size:14px;color:#142131;margin-bottom:4px">${r.nom_complet || r.nom_raison_sociale || "—"}</div>
          ${r.libelle_activite ? `<div style="font-size:11px;color:#6c7a89;margin-bottom:6px">${r.libelle_activite}</div>` : ""}
          <div style="font-size:12px;color:#2a3a48;line-height:1.5">
            ${r.adresse ? `📍 ${r.adresse}<br/>` : ""}
            ${r.code_postal || ""} ${r.ville || ""}<br/>
            ${r.siret ? `<span style="font-family:Consolas,monospace;font-size:10px;color:#a0aeb9">SIRET ${r.siret}</span>` : ""}
          </div>
        </div>`;
      marker.bindPopup(popupHtml);
    });
  }

  useEffect(() => {
    if (!leafletReady) return;
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(fetchSireneInBbox, 600);
    return () => fetchDebounceRef.current && clearTimeout(fetchDebounceRef.current);
  }, [sireneFilters, leafletReady]);

  // Écoute les déplacements de carte pour refresh auto (debounced)
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const handler = () => {
      if (finessFilters.length === 0 && rppsFilters.length === 0 && sireneFilters.length === 0) return;
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        fetchFinessInBbox();
        fetchRppsInBbox();
        fetchSireneInBbox();
      }, 800);
    };
    map.on("moveend", handler);
    return () => map.off("moveend", handler);
  }, [leafletReady, finessFilters, rppsFilters, sireneFilters]);

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

  // 0.55.41 : centrer + RAFRAICHIR la position en live (plus de cache stale)
  function centerOnMe(forceFresh = true) {
    if (!mapInstanceRef.current) return;
    if (!navigator.geolocation) {
      alert("Géolocalisation non disponible sur cet appareil");
      return;
    }
    setGeolocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const data = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          t: Date.now(),
        };
        try {
          localStorage.setItem("aveho_geoloc_choice", "accepted");
          localStorage.setItem("aveho_geoloc_last_pos", JSON.stringify(data));
        } catch {}
        window._avehoUserPosition = { lat: data.lat, lng: data.lng, accuracy: data.accuracy };
        setLastGeolocAt(data.t);
        setGeolocAccuracy(data.accuracy);
        drawUserPosition();
        mapInstanceRef.current.flyTo([data.lat, data.lng], 14, { duration: 1 });
        setGeolocLoading(false);
      },
      (err) => {
        setGeolocLoading(false);
        if (err.code === 1) {
          alert("Permission refusée. Active la géolocalisation dans les paramètres de ton navigateur :\n\n• Chrome : icône cadenas → Géolocalisation → Autoriser\n• Edge : icône cadenas → Permissions du site\n• Mobile : Paramètres → Apps → Navigateur → Autorisations");
        } else if (err.code === 3) {
          alert("Délai dépassé. Sur PC Windows, vérifie que la géolocalisation est activée dans Paramètres → Confidentialité → Localisation.");
        } else {
          alert("Impossible de récupérer ta position : " + err.message);
        }
      },
      {
        enableHighAccuracy: true,   // 0.55.41 : précision max (GPS si dispo)
        timeout: 15000,              // 15s pour laisser le GPS faire son fix
        maximumAge: forceFresh ? 0 : 60000,  // 0 = jamais de cache
      }
    );
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
                  {/* 0.55.41 : bouton centrer + indicateur fraîcheur */}
                  <button
                    onClick={() => centerOnMe(true)}
                    disabled={geolocLoading}
                    title="Recentrer sur ma position actuelle (force le rafraîchissement)"
                    style={{
                      background: geolocLoading ? "#8a98a8" : "#fff",
                      color: geolocLoading ? "#fff" : "#185FA5",
                      border: "1px solid #185FA5",
                      padding: "4px 12px",
                      borderRadius: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: geolocLoading ? "wait" : "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {geolocLoading ? (
                      <><i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Localisation…</>
                    ) : (
                      <><i className="ti ti-current-location" /> Ma position</>
                    )}
                  </button>
                  {lastGeolocAt && !geolocLoading && (
                    <span style={{
                      fontSize: 10.5,
                      color: geolocAccuracy && geolocAccuracy > 1000 ? "#c0392b" : "#5aa05a",
                      fontWeight: 600,
                      marginLeft: -4,
                    }}>
                      {geolocAccuracy ? `±${Math.round(geolocAccuracy)}m` : ""} · maj {formatRelativeTime(lastGeolocAt)}
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            {/* 0.55.9 — Overlay FINESS : ressources santé proches */}
            <Panel style={{ marginBottom: 14, padding: "12px 16px", background: "linear-gradient(135deg, #fffaf0 0%, #fff 100%)", borderColor: "#f0d59f" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#142131", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-stethoscope" style={{ color: "#185FA5" }} />
                  Ressources santé proches (FINESS)
                </div>
                {finessLoading && (
                  <span style={{ fontSize: 11, color: "#6c7a89" }}>
                    <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} /> Recherche…
                  </span>
                )}
                {!finessLoading && finessCount > 0 && (
                  <span style={{ fontSize: 11, color: "#2e6f33", background: "#dff5e0", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                    <i className="ti ti-circle-check" /> {finessCount} résultat{finessCount > 1 ? "s" : ""} affiché{finessCount > 1 ? "s" : ""}
                  </span>
                )}
                {!finessLoading && finessCount === -1 && (
                  <span style={{ fontSize: 11, color: "#7a4f15", background: "#fff3da", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                    <i className="ti ti-zoom-in" /> Zoome plus (zone trop large)
                  </span>
                )}
                {finessFilters.length > 0 && (
                  <button
                    onClick={() => setFinessFilters([])}
                    style={{ background: "transparent", border: "none", color: "#c0392b", padding: "2px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", marginLeft: "auto" }}
                  >
                    Masquer tout
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(FINESS_OVERLAY_CATS).map(([key, cat]) => {
                  const active = finessFilters.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleFinessCat(key)}
                      style={{
                        background: active ? cat.color : "#fff",
                        color: active ? "#fff" : cat.color,
                        border: `1.5px solid ${cat.color}`,
                        padding: "4px 10px",
                        borderRadius: 14,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{cat.emoji}</span> {cat.lbl}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "#7a4f15" }}>
                <i className="ti ti-info-circle" /> Les résultats sont rechargés automatiquement quand tu déplaces ou zoomes la carte. Source : <b>FINESS officiel</b> (data.gouv.fr / Atlasanté).
              </div>
            </Panel>

            {/* 0.55.38 — Filtres RPPS sur la carte */}
            <Panel style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <i className="ti ti-stethoscope" style={{ fontSize: 18, color: "#185FA5" }} />
                <b style={{ fontSize: 13, color: "#142131" }}>Professionnels de santé (RPPS)</b>
                {rppsLoading && <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite", color: "#185FA5" }} />}
                {!rppsLoading && rppsCount > 0 && (
                  <span style={{ background: "#dbe7f5", color: "#185FA5", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                    {rppsCount} résultat{rppsCount > 1 ? "s" : ""}
                  </span>
                )}
                {rppsFilters.length > 0 && (
                  <button
                    onClick={() => setRppsFilters([])}
                    style={{ background: "transparent", border: "none", color: "#c0392b", padding: "2px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", marginLeft: "auto" }}
                  >
                    Masquer tout
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(PROFESSION_COLORS).map(([prof, color]) => {
                  const emoji = PROFESSION_EMOJIS[prof] || "👨‍⚕";
                  const active = rppsFilters.includes(prof);
                  return (
                    <button
                      key={prof}
                      onClick={() => setRppsFilters(active ? rppsFilters.filter(p => p !== prof) : [...rppsFilters, prof])}
                      style={{
                        background: active ? color : "#fff",
                        color: active ? "#fff" : color,
                        border: `1.5px solid ${color}`,
                        padding: "4px 10px", borderRadius: 14,
                        fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                      }}
                    >
                      <span>{emoji}</span> {prof}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "#185FA5" }}>
                <i className="ti ti-info-circle" /> Source : <b>API FHIR ANS officielle</b> · 1,7M praticiens. Adresses géocodées via BAN INSEE.
              </div>
              {rppsFilters.length > 0 && rppsCount === 0 && !rppsLoading && (
                <div style={{ marginTop: 6, padding: "8px 10px", background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 6, fontSize: 11, color: "#7a4f15" }}>
                  <i className="ti ti-info-circle" /> Aucun praticien trouvé dans la zone visible. Zoome plus large ou déplace la carte vers une grande ville.
                </div>
              )}
            </Panel>

            {/* 0.55.38 — Filtres SIRENE entreprises */}
            <Panel style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <i className="ti ti-building-store" style={{ fontSize: 18, color: "#7a6fb0" }} />
                <b style={{ fontSize: 13, color: "#142131" }}>Entreprises SIRENE</b>
                {sireneLoading && <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite", color: "#7a6fb0" }} />}
                {!sireneLoading && sireneCount > 0 && (
                  <span style={{ background: "#f3effa", color: "#7a6fb0", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                    {sireneCount} résultat{sireneCount > 1 ? "s" : ""}
                  </span>
                )}
                {sireneFilters.length > 0 && (
                  <button
                    onClick={() => setSireneFilters([])}
                    style={{ background: "transparent", border: "none", color: "#c0392b", padding: "2px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", marginLeft: "auto" }}
                  >
                    Masquer tout
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(SIRENE_OVERLAY_CATS).map(([key, cat]) => {
                  const active = sireneFilters.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setSireneFilters(active ? sireneFilters.filter(p => p !== key) : [...sireneFilters, key])}
                      style={{
                        background: active ? cat.color : "#fff",
                        color: active ? "#fff" : cat.color,
                        border: `1.5px solid ${cat.color}`,
                        padding: "4px 10px", borderRadius: 14,
                        fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                      }}
                    >
                      <span>{cat.emoji}</span> {cat.lbl}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "#5a4a90" }}>
                <i className="ti ti-info-circle" /> Source : <b>API SIRENE</b> (recherche-entreprises.api.gouv.fr). Recherche géographique sur la zone visible.
              </div>
              {sireneFilters.length > 0 && sireneCount === 0 && !sireneLoading && (
                <div style={{ marginTop: 6, padding: "8px 10px", background: "#fff8ec", border: "1px solid #f0d59f", borderRadius: 6, fontSize: 11, color: "#7a4f15" }}>
                  <i className="ti ti-info-circle" /> Aucune entreprise trouvée dans la zone visible. Zoome plus large ou déplace la carte.
                </div>
              )}
            </Panel>

            {/* Conteneur carte */}
            <Panel style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              {!leafletReady && (
                <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "rgba(244,247,250,.95)" }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 32, color: "#185FA5", animation: "spin 1.2s linear infinite" }} />
                  <span style={{ fontSize: 13, color: "#6c7a89" }}>Chargement de la carte…</span>
                </div>
              )}
              <div
                ref={mapRef}
                className="carte-leaflet-container"
                style={{
                  width: "100%",
                  height: 600,
                  background: "#e3e9ee",
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
