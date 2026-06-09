"use client";
// =============================================================
//  /presentation/tournees — Mode TV TOUTES tournées
//  Utilise v_tournees_jour_complete pour agréger livraison/infirmière/pharmacie
//  Itinéraires OSRM + couleurs par type
// =============================================================
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import RefreshButton from "../../components/RefreshButton";
import CastButton from "../../components/CastButton";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const Polyline     = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });

const TYPE_COLORS = {
  livraison:           { c: "#EF9F27", l: "Livraison",         ic: "📦" },
  livraison_patient:   { c: "#7a6fb0", l: "Patient HAD",       ic: "🏠" },
  livraison_etab:      { c: "#C9867F", l: "Établissement",     ic: "🏥" },
  livraison_pharmacie: { c: "#5aa05a", l: "Pharmacie",         ic: "💊" },
  infirmiere_idel:     { c: "#C9867F", l: "Infirmière IDEL",   ic: "👩‍⚕️" },
  infirmiere_idec:     { c: "#7a6fb0", l: "IDEC Coordinatrice",ic: "👩‍⚕️" },
  visite_domicile:     { c: "#185FA5", l: "Visite domicile",   ic: "🏡" },
  chambres_batiment:   { c: "#7a6fb0", l: "Chambres bâtiment", ic: "🛏" },
  retour_magasin:      { c: "#185FA5", l: "Retour magasin",    ic: "↩" },
  tournee_interne:     { c: "#7CC8C8", l: "Tournée interne",   ic: "🏢" },
  tournee_externe:     { c: "#EF9F27", l: "Tournée externe",   ic: "🌐" },
};

const STATUT_TOURNEE = {
  planifiee:  { c: "#7CC8C8", l: "Planifiée" },
  en_cours:   { c: "#EF9F27", l: "En cours" },
  terminee:   { c: "#5aa05a", l: "Terminée" },
};

export default function ModeTVTourneesPage() {
  const supabase = createClient();
  const auth = useAuth();

  const [tournees, setTournees] = useState([]);
  const [etapes, setEtapes] = useState({});
  const [routes, setRoutes] = useState({});
  const [stats, setStats] = useState({ total: 0, en_cours: 0, terminees: 0, distance: 0 });
  const [L, setL] = useState(null);
  const [mapCenter, setMapCenter] = useState([44.85, 1.85]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (typeof window === "undefined") return;
    import("leaflet").then(mod => {
      setL(mod.default);
      delete mod.default.Icon.Default.prototype._getIconUrl;
      mod.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      });
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (auth.ready) load();
    const t = setInterval(() => { if (auth.ready) load(); }, 60000);
    return () => clearInterval(t);
  }, [auth.ready]);

  async function load() {
    const today = new Date().toISOString().substring(0, 10);
    // 0.65.48 : utilise v_tournees_jour_complete pour AGRÉGER toutes tournées
    const t = await supabase
      .from("v_tournees_jour_complete")
      .select("*")
      .eq("structure_id", auth.structureId)
      .gte("date_planifiee", today + "T00:00:00")
      .lt("date_planifiee", today + "T23:59:59")
      .order("date_planifiee");
    
    setTournees(t.data || []);

    if (t.data?.length > 0) {
      const ids = t.data.map(x => x.id);
      const e = await supabase
        .from("tournees_etapes")
        .select("*")
        .in("tournee_id", ids)
        .order("ordre");
      
      const grouped = {};
      (e.data || []).forEach(et => {
        if (!grouped[et.tournee_id]) grouped[et.tournee_id] = [];
        grouped[et.tournee_id].push(et);
      });
      setEtapes(grouped);

      const first = e.data?.find(x => x.latitude && x.longitude);
      if (first) setMapCenter([first.latitude, first.longitude]);

      setStats({
        total: t.data.length,
        en_cours: t.data.filter(x => x.statut === "en_cours").length,
        terminees: t.data.filter(x => x.statut === "terminee").length,
        distance: t.data.reduce((a, x) => a + (x.distance_km || 0), 0),
      });

      for (const tournee of t.data) {
        const eList = grouped[tournee.id];
        if (eList?.length >= 2) fetchOsrmRoute(tournee.id, eList);
      }
    }
  }

  async function fetchOsrmRoute(tourneeId, etapesList) {
    const coords = etapesList
      .filter(e => e.latitude && e.longitude)
      .map(e => `${e.longitude},${e.latitude}`)
      .join(";");
    if (!coords) return;

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.[0]) {
        const path = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRoutes(r => ({ ...r, [tourneeId]: { path, distance: data.routes[0].distance, duration: data.routes[0].duration } }));
      }
    } catch (e) { console.warn("OSRM", e); }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0c1726 0%, #142131 100%)",
      color: "#fff", fontFamily: "Quicksand, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* TOOLBAR floating - retour + cast + refresh + plein écran */}
      <div style={{
        position: "fixed", top: 16, right: 16,
        display: "flex", gap: 8, zIndex: 8500,
        padding: "8px 10px",
        background: "rgba(20,33,49,.75)", backdropFilter: "blur(10px)",
        borderRadius: 14, border: "1px solid rgba(255,255,255,.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,.3)",
      }}>
        <button onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = "/"; }}
          title="Retour"
          style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className="ti ti-arrow-left" />
        </button>
        <button onClick={() => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else document.exitFullscreen?.();
        }} title="Plein écran"
          style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          <i className="ti ti-arrows-maximize" />
        </button>
        <RefreshButton onRefresh={load} color="#7CC8C8" size="sm" label="" />
        <CastButton size={28} />
      </div>

      {/* HEADER */}
      <header style={{
        padding: "16px 24px",
        background: "linear-gradient(135deg, #185FA530, #185FA510)",
        borderBottom: "1px solid #185FA540",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14,
            background: "linear-gradient(135deg, #185FA5, #0d4585)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(24,95,165,.50)",
          }}>
            <i className="ti ti-route" style={{ fontSize: 32 }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Tournées · Temps réel</h1>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 4 }}>
              <i className="ti ti-clock" /> {time.toLocaleTimeString("fr-FR")} · {time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <TVKpi icon="ti-route" color="#185FA5" value={stats.total} label="Tournées" />
          <TVKpi icon="ti-truck" color="#EF9F27" value={stats.en_cours} label="En cours" pulse={stats.en_cours > 0} />
          <TVKpi icon="ti-check" color="#5aa05a" value={stats.terminees} label="Terminées" />
          <TVKpi icon="ti-map-pin-2" color="#7CC8C8" value={`${stats.distance.toFixed(0)} km`} label="Distance" />
        </div>
      </header>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 1fr" }}>
        {/* SIDEBAR */}
        <aside style={{ overflowY: "auto", padding: 16, background: "rgba(0,0,0,.20)", borderRight: "1px solid rgba(255,255,255,.06)" }}>
          {tournees.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.4)" }}>
              <i className="ti ti-route-off" style={{ fontSize: 48, opacity: 0.3, display: "block", marginBottom: 10 }} />
              Aucune tournée aujourd'hui
            </div>
          ) : tournees.map(t => {
            const cTypeFromDB = t.couleur_type || "#EF9F27";
            const stat = STATUT_TOURNEE[t.statut] || STATUT_TOURNEE.planifiee;
            const typeCfg = TYPE_COLORS[t.type_complet] || { c: cTypeFromDB, l: t.type_complet, ic: "📍" };
            const eList = etapes[t.id] || [];
            const route = routes[t.id];
            return (
              <div key={t.id} style={{
                padding: 12, marginBottom: 10, borderRadius: 12,
                background: `linear-gradient(135deg, ${cTypeFromDB}15, ${cTypeFromDB}05)`,
                border: `1px solid ${cTypeFromDB}40`,
                cursor: "pointer",
              }} onClick={() => { if (eList[0]?.latitude) setMapCenter([eList[0].latitude, eList[0].longitude]); }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${cTypeFromDB}25`, color: cTypeFromDB,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, filter: `drop-shadow(0 0 4px ${cTypeFromDB})`,
                  }}>
                    {typeCfg.ic}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{t.nom || `Tournée ${t.id.substring(0, 6)}`}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
                      {typeCfg.l} · {eList.length} arrêts
                    </div>
                  </div>
                  <span style={{ background: `${stat.c}30`, color: stat.c, padding: "2px 8px", borderRadius: 8, fontSize: 9, fontWeight: 800 }}>{stat.l}</span>
                </div>
                {route && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 6, display: "flex", gap: 12 }}>
                    <span><i className="ti ti-map-pin" /> {(route.distance / 1000).toFixed(1)} km</span>
                    <span><i className="ti ti-clock" /> {Math.round(route.duration / 60)} min</span>
                  </div>
                )}
                {t.chauffeur_nom && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.55)", marginTop: 4 }}>
                    <i className="ti ti-user" /> {t.chauffeur_nom}
                  </div>
                )}
              </div>
            );
          })}

          {/* Légende */}
          <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.5)", textTransform: "uppercase", marginBottom: 8 }}>Légende</div>
            {Object.entries(TYPE_COLORS).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: v.c, boxShadow: `0 0 6px ${v.c}` }} />
                <span>{v.ic} {v.l}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* CARTE */}
        <div style={{ position: "relative" }}>
          {L && (
            <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" attribution='© CartoDB' />
              {Object.entries(etapes).map(([tId, eList]) => eList.map((e, idx) => {
                if (!e.latitude || !e.longitude) return null;
                const tournee = tournees.find(t => t.id === tId);
                const cfg = TYPE_COLORS[tournee?.type_complet] || { c: tournee?.couleur_type || "#EF9F27", l: "—", ic: "📍" };
                return (
                  <Marker key={`${tId}-${e.id}`} position={[e.latitude, e.longitude]}>
                    <Popup>
                      <div style={{ fontWeight: 700 }}>{cfg.ic} {e.libelle || "—"}</div>
                      <div>Arrêt #{idx + 1}</div>
                      <div style={{ fontSize: 11, color: cfg.c, fontWeight: 700 }}>{cfg.l}</div>
                    </Popup>
                  </Marker>
                );
              }))}
              {Object.entries(routes).map(([tId, r]) => {
                const tournee = tournees.find(t => t.id === tId);
                return (
                  <Polyline key={tId} positions={r.path} pathOptions={{ color: tournee?.couleur_type || "#EF9F27", weight: 4, opacity: 0.75 }} />
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function TVKpi({ icon, color, value, label, pulse }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
      border: `1px solid ${color}40`, borderRadius: 12,
      padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 10, minWidth: 140,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
        animation: pulse ? "av-tv-pulse 1.5s ease-in-out infinite" : "none",
      }}>
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
      </div>
      <style jsx global>{`
        @keyframes av-tv-pulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; transform: scale(1); }
          50% { box-shadow: 0 0 0 8px transparent; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
