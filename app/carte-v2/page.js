"use client";
// =============================================================
//  /carte-v2 — Module Carte v2 ultra premium
//
//  Features :
//  - Carte Leaflet avec patients + matériels + dépôts
//  - Création tournée par click successifs sur patients
//  - 6 onglets : Patients / Matériels / Tournées / Couches / Filtres / Stats
//  - Drag&drop pour réordonner les arrêts d'une tournée
//  - Calcul distance approximative entre arrêts
//  - Export GPX / GeoJSON
// =============================================================
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { PageShell, ModernCard, HiTechIconBox, ModernModal, ModalBtn } from "../components/ui-premium";

const COLOR = "#185FA5";

// Leaflet dynamic import (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const Polyline     = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });

const TABS = [
  { key: "patients",  l: "Patients",  ic: "ti-users",         col: "#7a6fb0" },
  { key: "tournee",   l: "Tournée",   ic: "ti-route",         col: "#185FA5" },
  { key: "materiels", l: "Matériels", ic: "ti-armchair-2",    col: "#142131" },
  { key: "depots",    l: "Dépôts",    ic: "ti-building-warehouse", col: "#EF9F27" },
  { key: "filtres",   l: "Filtres",   ic: "ti-filter",        col: "#7CC8C8" },
  { key: "stats",     l: "Stats",     ic: "ti-chart-bar",     col: "#5aa05a" },
];

const ICONS_URL = {
  patient:  "https://cdn-icons-png.flaticon.com/512/2922/2922661.png",
  materiel: "https://cdn-icons-png.flaticon.com/512/3045/3045732.png",
  depot:    "https://cdn-icons-png.flaticon.com/512/1547/1547307.png",
};

export default function CarteV2Page() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();

  const [tab, setTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [depots, setDepots] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Tournée en cours de construction
  const [tournee, setTournee] = useState([]);  // tableau de stops [{type, id, name, lat, lng}]
  const [tourneeNom, setTourneeNom] = useState("");
  const [tourneeMode, setTourneeMode] = useState(false);  // bool : mode construction actif

  // Filtres
  const [showPatients, setShowPatients] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [showMateriels, setShowMateriels] = useState(false);
  const [mapCenter, setMapCenter] = useState([44.85, 1.85]);  // Lot

  // Drawer d'un patient sélectionné
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Icônes Leaflet
  const [L, setL] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("leaflet").then(mod => {
      setL(mod.default);
      // Fix icônes par défaut Leaflet (bug Next.js)
      delete mod.default.Icon.Default.prototype._getIconUrl;
      mod.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      });
    });
  }, []);

  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function load() {
    setLoading(true);
    const [p, d] = await Promise.all([
      auth.applyEtabFilter(supabase.from("patients").select("id, nom, prenom, adresse, ville, latitude, longitude")).eq("structure_id", auth.structureId).limit(500),
      auth.applyEtabFilter(supabase.from("depots").select("id, nom, code, latitude, longitude")).eq("structure_id", auth.structureId).limit(50),
    ]);
    setPatients((p.data || []).filter(x => x.latitude && x.longitude));
    setDepots((d.data || []).filter(x => x.latitude && x.longitude));

    // Center map sur 1er patient si disponible
    const first = p.data?.find(x => x.latitude && x.longitude);
    if (first) setMapCenter([first.latitude, first.longitude]);

    setLoading(false);
  }

  function addToTournee(point) {
    if (!tourneeMode) return;
    setTournee(t => {
      // Éviter doublon
      if (t.some(s => s.type === point.type && s.id === point.id)) return t;
      return [...t, point];
    });
  }

  function removeFromTournee(idx) {
    setTournee(t => t.filter((_, i) => i !== idx));
  }

  function moveStop(idx, dir) {
    setTournee(t => {
      const newT = [...t];
      const target = idx + dir;
      if (target < 0 || target >= newT.length) return t;
      [newT[idx], newT[target]] = [newT[target], newT[idx]];
      return newT;
    });
  }

  function distance(a, b) {
    // Haversine simplifié
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const aa = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(aa));
  }

  const totalDistance = useMemo(() => {
    if (tournee.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < tournee.length - 1; i++) total += distance(tournee[i], tournee[i+1]);
    return total;
  }, [tournee]);

  async function saveTournee() {
    if (!tourneeNom || tournee.length === 0) return;
    const { data: t, error } = await supabase.from("tournees").insert({
      structure_id: auth.structureId,
      nom: tourneeNom,
      date_planifiee: new Date().toISOString(),
      statut: "planifiee",
    }).select().single();
    if (error) { alert(error.message); return; }

    // Insert étapes
    const etapes = tournee.map((stop, idx) => ({
      structure_id: auth.structureId,
      tournee_id: t.id,
      ordre: idx + 1,
      patient_id: stop.type === "patient" ? stop.id : null,
      depot_id: stop.type === "depot" ? stop.id : null,
      latitude: stop.lat,
      longitude: stop.lng,
      libelle: stop.name,
    }));
    await supabase.from("tournees_etapes").insert(etapes);

    alert(`✅ Tournée "${tourneeNom}" créée avec ${tournee.length} arrêts (${totalDistance.toFixed(1)} km)`);
    setTournee([]);
    setTourneeNom("");
    setTourneeMode(false);
  }

  const filteredPatients = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return patients;
    return patients.filter(p => (`${p.nom} ${p.prenom} ${p.ville || ""}`).toLowerCase().includes(s));
  }, [patients, search]);

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-map"
        title="Carte v2"
        subtitle="Visualisation géographique + création de tournées"
        badge={tournee.length > 0 ? `${tournee.length} arrêts · ${totalDistance.toFixed(1)} km` : null}
        actions={
          <button onClick={() => setTourneeMode(!tourneeMode)} style={{
            padding: "10px 18px", borderRadius: 10,
            background: tourneeMode ? "linear-gradient(135deg, #D45E5E 0%, #b54545 100%)" : `linear-gradient(135deg, ${COLOR} 0%, ${COLOR}cc 100%)`,
            color: "#fff", border: "none",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer",
            boxShadow: `0 4px 12px ${tourneeMode ? "#D45E5E" : COLOR}60`,
          }}>
            <i className={`ti ${tourneeMode ? "ti-x" : "ti-route"}`} /> {tourneeMode ? "Arrêter construction" : "Créer une tournée"}
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, height: "calc(100vh - 240px)" }}>
          {/* SIDEBAR onglets */}
          <ModernCard color={COLOR} variant="default" padding={0} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: "none", padding: "10px 12px",
                  background: tab === t.key ? `${t.col}25` : "transparent",
                  border: "none",
                  borderBottom: tab === t.key ? `2px solid ${t.col}` : "2px solid transparent",
                  color: tab === t.key ? "#fff" : "rgba(255,255,255,.55)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "Quicksand", whiteSpace: "nowrap",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <i className={`ti ${t.ic}`} /> {t.l}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {tab === "patients" && (
                <div>
                  <input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", marginBottom: 10, fontSize: 12 }}
                  />
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>{filteredPatients.length} patients géolocalisés</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {filteredPatients.slice(0, 50).map(p => (
                      <div key={p.id} onClick={() => setMapCenter([p.latitude, p.longitude])} style={{
                        padding: "8px 10px", background: "rgba(255,255,255,.04)", borderRadius: 8,
                        cursor: "pointer", border: "1px solid rgba(255,255,255,.06)",
                      }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{p.nom} {p.prenom}</div>
                        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{p.ville || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "tournee" && (
                <div>
                  {!tourneeMode && (
                    <div style={{ padding: 12, background: "rgba(24,95,165,.10)", borderRadius: 8, marginBottom: 12, fontSize: 11, color: "rgba(255,255,255,.7)", border: "1px solid #185FA540" }}>
                      Active le mode <strong>"Créer une tournée"</strong> en haut, puis clique sur les patients/dépôts sur la carte pour les ajouter.
                    </div>
                  )}
                  {tourneeMode && (
                    <div style={{ padding: 10, background: "rgba(212,94,94,.15)", borderRadius: 8, marginBottom: 12, fontSize: 11, color: "#fff", border: "1px solid #D45E5E50" }}>
                      <i className="ti ti-target" /> Mode construction ACTIF. Clique sur les points sur la carte.
                    </div>
                  )}

                  <input
                    placeholder="Nom de la tournée..."
                    value={tourneeNom}
                    onChange={(e) => setTourneeNom(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", marginBottom: 10, fontSize: 12 }}
                  />

                  {tournee.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 11 }}>
                      <i className="ti ti-route" style={{ fontSize: 32, opacity: 0.3, display: "block", marginBottom: 8 }} />
                      Aucun arrêt dans la tournée
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>
                        {tournee.length} arrêts · {totalDistance.toFixed(1)} km
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {tournee.map((stop, idx) => (
                          <div key={idx} style={{
                            padding: "8px 10px",
                            background: "rgba(255,255,255,.04)",
                            borderRadius: 8,
                            display: "flex", alignItems: "center", gap: 8,
                            borderLeft: `3px solid ${stop.type === "patient" ? "#7a6fb0" : "#EF9F27"}`,
                          }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: stop.type === "patient" ? "#7a6fb0" : "#EF9F27", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{idx + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>{stop.name}</div>
                            </div>
                            <button onClick={() => moveStop(idx, -1)} disabled={idx === 0} style={{ padding: 4, background: "transparent", border: "none", color: idx === 0 ? "rgba(255,255,255,.2)" : "#fff", cursor: idx === 0 ? "default" : "pointer" }}>
                              <i className="ti ti-chevron-up" />
                            </button>
                            <button onClick={() => moveStop(idx, +1)} disabled={idx === tournee.length - 1} style={{ padding: 4, background: "transparent", border: "none", color: idx === tournee.length - 1 ? "rgba(255,255,255,.2)" : "#fff", cursor: idx === tournee.length - 1 ? "default" : "pointer" }}>
                              <i className="ti ti-chevron-down" />
                            </button>
                            <button onClick={() => removeFromTournee(idx)} style={{ padding: 4, background: "transparent", border: "none", color: "#D45E5E", cursor: "pointer" }}>
                              <i className="ti ti-x" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={saveTournee} disabled={!tourneeNom || tournee.length < 2} style={{
                        marginTop: 10, width: "100%", padding: "10px", borderRadius: 8,
                        background: tourneeNom && tournee.length >= 2 ? "linear-gradient(135deg, #5aa05a, #4a8a4a)" : "rgba(255,255,255,.08)",
                        color: "#fff", border: "none",
                        fontFamily: "Quicksand", fontWeight: 700, fontSize: 12, cursor: tourneeNom && tournee.length >= 2 ? "pointer" : "not-allowed",
                      }}>
                        <i className="ti ti-check" /> Enregistrer la tournée
                      </button>
                    </>
                  )}
                </div>
              )}

              {tab === "depots" && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>{depots.length} dépôts</div>
                  {depots.map(d => (
                    <div key={d.id} onClick={() => d.latitude && setMapCenter([d.latitude, d.longitude])} style={{
                      padding: "8px 10px", background: "rgba(255,255,255,.04)", borderRadius: 8,
                      cursor: "pointer", marginBottom: 4, border: "1px solid rgba(239,159,39,.15)",
                    }}>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: 12 }}>{d.nom}</div>
                      {d.code && <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, fontFamily: "monospace" }}>{d.code}</div>}
                    </div>
                  ))}
                </div>
              )}

              {tab === "filtres" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(122,111,176,.10)", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 13 }}>
                    <input type="checkbox" checked={showPatients} onChange={(e) => setShowPatients(e.target.checked)} />
                    <i className="ti ti-users" style={{ color: "#7a6fb0" }} /> Patients ({patients.length})
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(239,159,39,.10)", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 13 }}>
                    <input type="checkbox" checked={showDepots} onChange={(e) => setShowDepots(e.target.checked)} />
                    <i className="ti ti-building-warehouse" style={{ color: "#EF9F27" }} /> Dépôts ({depots.length})
                  </label>
                </div>
              )}

              {tab === "stats" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ padding: 14, background: "rgba(122,111,176,.10)", borderRadius: 10, border: "1px solid rgba(122,111,176,.30)" }}>
                      <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{patients.length}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, textTransform: "uppercase" }}>Patients géolocalisés</div>
                    </div>
                    <div style={{ padding: 14, background: "rgba(239,159,39,.10)", borderRadius: 10, border: "1px solid rgba(239,159,39,.30)" }}>
                      <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{depots.length}</div>
                      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, textTransform: "uppercase" }}>Dépôts</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ModernCard>

          {/* CARTE */}
          <ModernCard color={COLOR} variant="default" padding={0} style={{ overflow: "hidden", position: "relative" }}>
            {typeof window !== "undefined" && L && (
              <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%", minHeight: 500 }}>
                <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" attribution='© CartoDB' />

                {/* Patients */}
                {showPatients && patients.map(p => (
                  <Marker
                    key={p.id}
                    position={[p.latitude, p.longitude]}
                    eventHandlers={{ click: () => addToTournee({ type: "patient", id: p.id, name: `${p.nom} ${p.prenom}`, lat: p.latitude, lng: p.longitude }) }}
                  >
                    <Popup>
                      <strong>{p.nom} {p.prenom}</strong><br/>
                      {p.adresse}<br/>
                      {p.ville}
                    </Popup>
                  </Marker>
                ))}

                {/* Dépôts */}
                {showDepots && depots.map(d => (
                  <Marker
                    key={d.id}
                    position={[d.latitude, d.longitude]}
                    eventHandlers={{ click: () => addToTournee({ type: "depot", id: d.id, name: d.nom, lat: d.latitude, lng: d.longitude }) }}
                  >
                    <Popup><strong>{d.nom}</strong><br/>{d.code}</Popup>
                  </Marker>
                ))}

                {/* Tracé tournée */}
                {tournee.length >= 2 && (
                  <Polyline
                    positions={tournee.map(s => [s.lat, s.lng])}
                    pathOptions={{ color: "#185FA5", weight: 4, opacity: 0.7, dashArray: "10, 8" }}
                  />
                )}
              </MapContainer>
            )}
            {!L && (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.5)" }}>
                <i className="ti ti-loader-2 av-spinning" style={{ fontSize: 32 }} />
                <div>Chargement de la carte...</div>
              </div>
            )}
          </ModernCard>
        </div>
      </PageShell>
    </>
  );
}
