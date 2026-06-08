"use client";
// =============================================================
//  /presentation/carte-had (0.65.0)
//  Mode TV : carte plein écran avec
//   - HAD (patients en hospitalisation à domicile)
//   - Livraisons patients à domicile (étapes tournées type=livraison)
//   - Demandes d'intervention (DI) avec état
//   - Filtre par magasin
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";

export default function PresentationCarteHADPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationCarteHAD />
    </Suspense>
  );
}

const COLORS = {
  had:        { col: "#5aa05a", ic: "ti-home-heart",     lbl: "HAD" },
  livraison:  { col: "#EF9F27", ic: "ti-truck-delivery", lbl: "Livraison" },
  intervention: { col: "#e35d5b", ic: "ti-tools",        lbl: "DI" },
};

const DI_ETATS = {
  "Nouvelle":  { col: "#185FA5" },
  "En cours":  { col: "#EF9F27" },
  "Validée":   { col: "#5aa05a" },
  "Clôturée":  { col: "#5a6171" },
};

function PresentationCarteHAD() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "90", 10);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const [counters, setCounters] = useState({ had: 0, livraisons: 0, di: 0 });
  const [recent, setRecent] = useState([]);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));
  const [activeFilters, setActiveFilters] = useState({ had: true, livraison: true, intervention: true });
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  // Chargement Leaflet via CDN
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

  // Init map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([46.5, 2.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    mapInstance.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
  }, [leafletReady]);

  async function load() {
    if (!auth.structureId) return;
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const today = new Date().toISOString().slice(0, 10);

    // 1. Patients HAD avec lat/lng
    let qHAD = supabase.from("patients")
      .select("id, nom, prenom, latitude, longitude, ville, mode_residence, chambre, etablissement_id, batiment_id, service_id, chambre_id")
      .eq("structure_id", auth.structureId)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(200);
    // 0.65.3 : filtres avancés
    if (advFilters.etabId)    qHAD = qHAD.eq("etablissement_id", advFilters.etabId);
    if (advFilters.batId)     qHAD = qHAD.eq("batiment_id", advFilters.batId);
    if (advFilters.svcId)     qHAD = qHAD.eq("service_id", advFilters.svcId);
    if (advFilters.chambreId) qHAD = qHAD.eq("chambre_id", advFilters.chambreId);
    if (advFilters.patientId) qHAD = qHAD.eq("id", advFilters.patientId);
    // Approche défensive : on filtre côté client si "mode_residence" est HAD/domicile
    let allPatients = await tryFetch(qHAD);
    // Recherche libre côté client
    if (advFilters.search?.trim()) {
      const s = advFilters.search.toLowerCase().trim();
      allPatients = allPatients.filter(p =>
        (p.nom || "").toLowerCase().includes(s) ||
        (p.prenom || "").toLowerCase().includes(s) ||
        (p.ville || "").toLowerCase().includes(s) ||
        (p.chambre || "").toLowerCase().includes(s)
      );
    }
    const hadPatients = allPatients.filter(p =>
      !p.mode_residence || /domicile|HAD/i.test(p.mode_residence || "")
    );

    // 2. Étapes livraison du jour vers domicile patients
    let qEtapes = supabase.from("tournees_etapes")
      .select("id, ordre, type_etape, label, ville, latitude, longitude, statut, tournees!inner(date_tournee, magasin_id, statut)")
      .in("type_etape", ["livraison", "had", "domicile"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .eq("tournees.date_tournee", today)
      .limit(150);
    if (magasinId) qEtapes = qEtapes.eq("tournees.magasin_id", magasinId);
    let livraisons = await tryFetch(qEtapes);
    if (advFilters.search?.trim()) {
      const s = advFilters.search.toLowerCase().trim();
      livraisons = livraisons.filter(e =>
        (e.label || "").toLowerCase().includes(s) ||
        (e.ville || "").toLowerCase().includes(s)
      );
    }

    // 3. DI en cours avec géoloc patient
    let qDI = supabase.from("interventions")
      .select("id, numero, type, statut, urgence, created_at, patient_id, etablissement_id, batiment_id, service_id, chambre_id, materiels(libelle), patients!inner(nom, prenom, latitude, longitude, ville, mode_residence)")
      .eq("structure_id", auth.structureId)
      .not("statut", "in", '("Clôturée","Refusée")')
      .not("patients.latitude", "is", null)
      .not("patients.longitude", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    // 0.65.3 : filtres avancés sur DI
    if (advFilters.etabId)    qDI = qDI.eq("etablissement_id", advFilters.etabId);
    if (advFilters.batId)     qDI = qDI.eq("batiment_id", advFilters.batId);
    if (advFilters.svcId)     qDI = qDI.eq("service_id", advFilters.svcId);
    if (advFilters.chambreId) qDI = qDI.eq("chambre_id", advFilters.chambreId);
    if (advFilters.patientId) qDI = qDI.eq("patient_id", advFilters.patientId);
    let dis = await tryFetch(qDI);
    if (advFilters.search?.trim()) {
      const s = advFilters.search.toLowerCase().trim();
      dis = dis.filter(d =>
        (d.numero || "").toLowerCase().includes(s) ||
        (d.type || "").toLowerCase().includes(s) ||
        (d.materiels?.libelle || "").toLowerCase().includes(s) ||
        (d.patients?.nom || "").toLowerCase().includes(s) ||
        (d.patients?.prenom || "").toLowerCase().includes(s) ||
        (d.patients?.ville || "").toLowerCase().includes(s)
      );
    }

    setCounters({
      had: hadPatients.length,
      livraisons: livraisons.length,
      di: dis.length,
    });

    // Dessin des markers
    if (mapInstance.current && window.L && markersLayer.current) {
      const L = window.L;
      markersLayer.current.clearLayers();
      const bounds = [];

      // HAD
      if (activeFilters.had) {
        hadPatients.forEach(p => {
          const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
          if (!lat || !lng) return;
          bounds.push([lat, lng]);
          const m = L.divIcon({
            html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${COLORS.had.col},${COLORS.had.col}cc);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4)"><i class="ti ${COLORS.had.ic}"></i></div>`,
            className: "tv-marker",
            iconSize: [32, 32], iconAnchor: [16, 16],
          });
          const marker = L.marker([lat, lng], { icon: m }).addTo(markersLayer.current);
          marker.bindPopup(`
            <div style="font-family:Quicksand,sans-serif;min-width:200px">
              <div style="background:${COLORS.had.col};color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-weight:700;font-size:13px">
                <i class="ti ${COLORS.had.ic}"></i> Patient HAD
              </div>
              <div style="padding:10px 12px;font-size:12px">
                <div style="font-weight:700;color:#142131;font-size:13px">${p.nom} ${p.prenom || ""}</div>
                ${p.ville ? `<div style="color:#8a98a8;margin-top:3px">📍 ${p.ville}</div>` : ""}
                ${p.mode_residence ? `<div style="color:#5a6878;margin-top:3px;font-size:11px"><b>Mode:</b> ${p.mode_residence}</div>` : ""}
                ${p.chambre ? `<div style="color:#5a6878;margin-top:3px;font-size:11px"><b>Chambre:</b> ${p.chambre}</div>` : ""}
              </div>
            </div>
          `);
        });
      }

      // Livraisons
      if (activeFilters.livraison) {
        livraisons.forEach(e => {
          const lat = parseFloat(e.latitude), lng = parseFloat(e.longitude);
          if (!lat || !lng) return;
          bounds.push([lat, lng]);
          const isLive = e.tournees?.statut === "en_cours" && e.statut !== "terminee";
          const m = L.divIcon({
            html: `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${COLORS.livraison.col},${COLORS.livraison.col}cc);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.4);font-weight:800;font-family:'Consolas, monospace'">${e.ordre || "?"}</div>`,
            className: "tv-marker " + (isLive ? "tv-marker-live" : ""),
            iconSize: [34, 34], iconAnchor: [17, 17],
          });
          const marker = L.marker([lat, lng], { icon: m }).addTo(markersLayer.current);
          marker.bindPopup(`
            <div style="font-family:Quicksand,sans-serif;min-width:220px">
              <div style="background:${COLORS.livraison.col};color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-weight:700;font-size:13px">
                <i class="ti ${COLORS.livraison.ic}"></i> Livraison · Étape #${e.ordre}
              </div>
              <div style="padding:10px 12px;font-size:12px">
                <div style="font-weight:700;color:#142131;font-size:13px">${e.label || "—"}</div>
                ${e.ville ? `<div style="color:#8a98a8;margin-top:3px">📍 ${e.ville}</div>` : ""}
                <div style="color:#5a6878;margin-top:3px;font-size:11px"><b>État:</b> ${e.statut || "à faire"}</div>
              </div>
            </div>
          `);
        });
      }

      // DI
      if (activeFilters.intervention) {
        dis.forEach(d => {
          const lat = parseFloat(d.patients?.latitude), lng = parseFloat(d.patients?.longitude);
          if (!lat || !lng) return;
          bounds.push([lat, lng]);
          const isUrgent = d.urgence === "Urgent";
          const etatMeta = DI_ETATS[d.statut] || { col: COLORS.intervention.col };
          const m = L.divIcon({
            html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${COLORS.intervention.col},${COLORS.intervention.col}cc);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;border:3px solid ${etatMeta.col};box-shadow:0 3px 10px rgba(0,0,0,.4)"><i class="ti ${COLORS.intervention.ic}"></i></div>`,
            className: "tv-marker " + (isUrgent ? "tv-marker-urgent" : ""),
            iconSize: [32, 32], iconAnchor: [16, 16],
          });
          const marker = L.marker([lat, lng], { icon: m }).addTo(markersLayer.current);
          marker.bindPopup(`
            <div style="font-family:Quicksand,sans-serif;min-width:220px">
              <div style="background:${COLORS.intervention.col};color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-weight:700;font-size:13px">
                <i class="ti ${COLORS.intervention.ic}"></i> DI ${d.numero || ""} ${isUrgent ? '<span style="background:#fff;color:'+COLORS.intervention.col+';padding:1px 6px;border-radius:10px;font-size:10px;margin-left:6px">URGENT</span>' : ""}
              </div>
              <div style="padding:10px 12px;font-size:12px">
                ${d.patients ? `<div style="font-weight:700;color:#142131;font-size:13px">${d.patients.nom} ${d.patients.prenom || ""}</div>` : ""}
                ${d.materiels?.libelle ? `<div style="color:#5a6878;margin-top:3px"><i>${d.materiels.libelle}</i></div>` : ""}
                ${d.patients?.ville ? `<div style="color:#8a98a8;margin-top:3px">📍 ${d.patients.ville}</div>` : ""}
                <div style="color:#5a6878;margin-top:6px;font-size:11px">
                  <b>État:</b> <span style="background:${etatMeta.col}22;color:${etatMeta.col};padding:1px 6px;border-radius:8px;font-weight:700">${d.statut || "?"}</span>
                </div>
                <div style="color:#8a98a8;margin-top:3px;font-size:11px"><b>Type:</b> ${d.type || "?"}</div>
              </div>
            </div>
          `);
        });
      }

      if (bounds.length > 0) {
        try {
          mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 11 });
        } catch {}
      }
    }

    // Top 5 récents pour mini-feed à droite
    setRecent(dis.slice(0, 5));
  }

  useEffect(() => { if (!auth.ready) return; load(); timerRef.current = setInterval(load, refreshSec * 1000); return () => clearInterval(timerRef.current); }, [auth.ready, auth.structureId, leafletReady, magasinId, activeFilters, refreshSec, advFilters]);
  useEffect(() => { clockRef.current = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(clockRef.current); }, []);

  function tryFullscreen() { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen(); }
  function toggleFilter(k) { setActiveFilters(prev => ({ ...prev, [k]: !prev[k] })); }

  if (auth.ready && !auth.structureId) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>Authentification requise</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#142131", color: "#fff", fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif", padding: 0, overflow: "hidden", position: "relative" }}>

      {/* Header flottant */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000,
        padding: "16px 110px 12px",
        background: "linear-gradient(180deg, rgba(20,33,49,.95), rgba(20,33,49,.6) 80%, transparent)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            AVEHO — TV DE SERVICE
            <TVMagasinFilter onChange={setMagasinId} />
            <TVFiltersBar pageKey="carte-had" onChange={setAdvFilters} />
            <TVCastButton refreshSec={refreshSec} />
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Carte HAD & Domicile</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace" }}>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: 12, color: "#bfe6e6" }}>{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {/* Carte plein écran */}
      <div ref={mapRef} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} />

      {/* Panel filtres + compteurs (gauche) */}
      <div style={{
        position: "absolute", top: 90, left: 16, zIndex: 1000,
        background: "rgba(20,33,49,.85)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,.15)",
        borderRadius: 14,
        padding: 12,
        minWidth: 220,
        boxShadow: "0 6px 24px rgba(0,0,0,.5)",
      }}>
        <div style={{ fontSize: 10.5, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>Filtres + Compteurs</div>
        {[
          { k: "had",          meta: COLORS.had,          c: counters.had },
          { k: "livraison",    meta: COLORS.livraison,    c: counters.livraisons },
          { k: "intervention", meta: COLORS.intervention, c: counters.di },
        ].map(s => (
          <button key={s.k}
            onClick={() => toggleFilter(s.k)}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px",
              background: activeFilters[s.k] ? s.meta.col + "22" : "rgba(255,255,255,.04)",
              border: `1.5px solid ${activeFilters[s.k] ? s.meta.col + "66" : "rgba(255,255,255,.1)"}`,
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 6,
              transition: "all 200ms",
              opacity: activeFilters[s.k] ? 1 : 0.5,
              fontFamily: "inherit",
              color: "#fff",
            }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${s.meta.col}, ${s.meta.col}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", flexShrink: 0 }}>
              <i className={`ti ${s.meta.ic}`} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "Consolas, monospace" }}>{s.c}</div>
              <div style={{ fontSize: 10, color: s.meta.col, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginTop: 2 }}>{s.meta.lbl}</div>
            </div>
            <i className={`ti ${activeFilters[s.k] ? "ti-eye" : "ti-eye-off"}`} style={{ color: s.meta.col, fontSize: 14 }} />
          </button>
        ))}
      </div>

      {/* Panel DI récentes (droite) */}
      {recent.length > 0 && (
        <div style={{
          position: "absolute",
          top: 90, right: 16, zIndex: 1000,
          background: "rgba(20,33,49,.85)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,.15)",
          borderRadius: 14,
          padding: 12,
          width: 290,
          maxHeight: "calc(100vh - 200px)",
          overflowY: "auto",
          boxShadow: "0 6px 24px rgba(0,0,0,.5)",
        }}>
          <div style={{ fontSize: 10.5, color: "#e35d5b", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
            DI récentes ({recent.length})
          </div>
          {recent.map(d => {
            const etat = DI_ETATS[d.statut] || { col: "#8a98a8" };
            return (
              <div key={d.id} style={{
                padding: "8px 10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderLeft: `3px solid ${etat.col}`,
                borderRadius: 8,
                marginBottom: 6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{d.numero}</div>
                    {d.patients && <div style={{ fontSize: 11, color: "#bfe6e6", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.patients.nom} {d.patients.prenom || ""}</div>}
                    {d.materiels?.libelle && <div style={{ fontSize: 10, color: "#9bb5b5", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><i className="ti ti-armchair-2" /> {d.materiels.libelle}</div>}
                  </div>
                  <span style={{
                    fontSize: 8.5,
                    padding: "1px 6px",
                    background: etat.col + "22",
                    color: etat.col,
                    borderRadius: 8,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>{d.statut}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(191,230,230,.5)", zIndex: 1001 }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}Refresh {refreshSec}s
      </div>

      <style>{`
        .tv-marker { background: transparent !important; border: none !important; }
        .tv-marker-urgent { animation: tv-urgent-pulse 1.5s ease-in-out infinite; }
        .tv-marker-live { animation: tv-live-pulse 2s ease-in-out infinite; }
        @keyframes tv-urgent-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes tv-live-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(239,159,39,.6)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 12px rgba(239,159,39,.9)); }
        }
      `}</style>

      <TVScreenNav currentScreen="/presentation/carte-had" />
    </div>
  );
}
