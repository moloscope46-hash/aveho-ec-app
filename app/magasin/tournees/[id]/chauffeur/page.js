"use client";
// =============================================================
//  /magasin/tournees/[id]/chauffeur — Vue chauffeur tracking GPS (0.62.36)
//  Tracking position temps réel · OSRM routing · signature étape · PDF feuille route
// =============================================================
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase";
import { useAuth } from "../../../../../lib/useAuth";
import TopBar from "../../../../TopBar";
import { useCart } from "../../../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../../../ui";
import BackButton from "../../../../components/BackButton";
import { cacheTournee, getCachedTournee, smartWrite } from "../../../../../lib/offlineSync";  /* 0.62.79 */
import { isOnline } from "../../../../../lib/offlineQueue";  /* 0.62.79 */

let leafletLoading = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((res, rej) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => res(window.L);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return leafletLoading;
}

let jspdfLoading = null;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  if (jspdfLoading) return jspdfLoading;
  jspdfLoading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => res(window.jspdf);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return jspdfLoading;
}

export default function ChauffeurTrackingPage({ params }) {
  const p = use(params);
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const positionMarkerRef = useRef(null);
  const etapesMarkersRef = useRef([]);

  const [tournee, setTournee] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [gpsTrack, setGpsTrack] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signatureEtape, setSignatureEtape] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  useEffect(() => {
    // Init map après reload
    if (!loading && tournee && mapRef.current && !mapInstanceRef.current) {
      initMap();
    }
  }, [loading, tournee]);

  // Cleanup tracking au unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function reload() {
    setLoading(true);
    try {
      // 0.62.79 : Si offline, charger depuis le cache local IndexedDB
      if (!isOnline()) {
        const cached = await getCachedTournee(p.id);
        if (cached) {
          setTournee(cached.tournee || null);
          setEtapes(cached.etapes || []);
          setGpsTrack(cached.gpsTrack || []);
          setLoading(false);
          return;
        }
      }

      const [t, e, g] = await Promise.all([
        supabase.from("tournees").select("*").eq("id", p.id).maybeSingle(),
        supabase.from("tournees_etapes").select("*").eq("tournee_id", p.id).order("ordre"),
        supabase.from("tournees_gps_track").select("latitude, longitude, recorded_at, speed_kmh").eq("tournee_id", p.id).order("recorded_at"),
      ]);
      setTournee(t.data || null);
      setEtapes(e.data || []);
      setGpsTrack(g.data || []);

      // 0.62.79 : Cacher en local pour mode offline
      if (t.data) {
        try {
          await cacheTournee({
            id: p.id,
            tournee: t.data,
            etapes: e.data || [],
            gpsTrack: g.data || [],
          });
        } catch (cacheErr) { console.warn("[chauffeur] cache fail:", cacheErr); }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function initMap() {
    const L = await loadLeaflet();
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView([45.5, 4.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    drawEtapes();
    drawHistorique();
  }

  async function drawEtapes() {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    // Clear markers
    etapesMarkersRef.current.forEach(m => m.remove());
    etapesMarkersRef.current = [];

    const points = [];
    etapes.forEach((e, idx) => {
      if (!e.latitude || !e.longitude) return;
      const isDone = !!e.completed_at;
      const icon = L.divIcon({
        className: "av-etape-marker",
        html: `<div style="background:${isDone ? "#5aa05a" : "#185FA5"};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${idx + 1}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      const m = L.marker([e.latitude, e.longitude], { icon }).addTo(mapInstanceRef.current);
      m.bindPopup(`<b>Étape ${idx + 1}</b><br>${e.adresse || ""}<br>${isDone ? "✅ Livrée" : "⏳ En attente"}`);
      etapesMarkersRef.current.push(m);
      points.push([e.latitude, e.longitude]);
    });

    // Fit bounds sur les étapes
    if (points.length > 0) {
      mapInstanceRef.current.fitBounds(points, { padding: [40, 40] });
    }

    // Calcul OSRM routing si on a au moins 2 étapes
    if (points.length >= 2) {
      try {
        const coordsStr = points.map(p => `${p[1]},${p[0]}`).join(";");
        const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
        const data = await resp.json();
        if (data.routes?.[0]?.geometry?.coordinates) {
          const latlngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          L.polyline(latlngs, { color: "#7a6fb0", weight: 4, opacity: 0.7, dashArray: "5,8" }).addTo(mapInstanceRef.current);
          // Stocker distance/duration sur la tournée si pas déjà fait
          const km = (data.routes[0].distance / 1000).toFixed(1);
          const min = Math.round(data.routes[0].duration / 60);
          console.log(`[OSRM] Trajet ${km} km · ${min} min`);
        }
      } catch (e) { console.warn("[OSRM] failed:", e); }
    }
  }

  function drawHistorique() {
    const L = window.L;
    if (!L || !mapInstanceRef.current || gpsTrack.length < 2) return;
    if (polylineRef.current) polylineRef.current.remove();
    const latlngs = gpsTrack.map(p => [p.latitude, p.longitude]);
    polylineRef.current = L.polyline(latlngs, { color: "#e35d5b", weight: 5, opacity: 0.85 }).addTo(mapInstanceRef.current);
  }

  function startTracking() {
    if (!navigator.geolocation) { alert("Géolocalisation non supportée"); return; }
    setTracking(true);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading, altitude } = pos.coords;
        setCurrentPos({ latitude, longitude, accuracy, speed_kmh: speed ? speed * 3.6 : null });
        // Update marker
        const L = window.L;
        if (L && mapInstanceRef.current) {
          if (positionMarkerRef.current) positionMarkerRef.current.remove();
          const icon = L.divIcon({
            className: "av-pos-marker",
            html: `<div style="background:#e35d5b;color:#fff;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(227,93,91,.3);animation:pulse 1.5s infinite"><i class="ti ti-truck" style="font-size:14px;display:flex;align-items:center;justify-content:center;height:100%"></i></div>`,
            iconSize: [24, 24], iconAnchor: [12, 12],
          });
          positionMarkerRef.current = L.marker([latitude, longitude], { icon }).addTo(mapInstanceRef.current);
        }
        // Insert en base
        try {
          await supabase.from("tournees_gps_track").insert({
            tournee_id: p.id,
            chauffeur_user_id: auth.user?.id,
            latitude, longitude,
            accuracy_m: accuracy,
            speed_kmh: speed ? speed * 3.6 : null,
            heading,
            altitude_m: altitude,
          });
        } catch (e) { console.warn("GPS insert failed:", e); }
      },
      (err) => { console.warn("Geoloc error:", err); alert("Erreur géoloc : " + err.message); setTracking(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    watchIdRef.current = id;
  }

  function stopTracking() {
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    reload();  // refresh polyline
  }

  async function markEtapeArrived(etape) {
    await supabase.from("tournees_etapes").update({ arrived_at: new Date().toISOString() }).eq("id", etape.id);
    reload();
  }

  async function exportFeuilleRoute() {
    try {
      const { jsPDF } = await loadJsPDF();
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      // Header navy
      doc.setFillColor(20, 33, 49);
      doc.rect(0, 0, 210, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("AVEHO — Feuille de Route Chauffeur", 14, 11);
      doc.setTextColor(0, 0, 0);

      let y = 28;
      doc.setFontSize(16);
      doc.text(tournee?.numero || "Tournée", 14, y); y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Date : ${tournee?.date_tournee ? new Date(tournee.date_tournee).toLocaleDateString("fr-FR") : "—"}`, 14, y); y += 5;
      doc.text(`Chauffeur : ${tournee?.chauffeur_nom || "—"}`, 14, y); y += 5;
      doc.text(`Véhicule : ${tournee?.vehicule_immatriculation || "—"}`, 14, y); y += 5;
      doc.text(`Étapes : ${etapes.length}`, 14, y); y += 10;

      // Liste des étapes
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Étapes (dans l'ordre)", 14, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      etapes.forEach((e, idx) => {
        const status = e.completed_at ? "✓" : e.arrived_at ? "📍" : "○";
        const color = e.completed_at ? [90, 160, 90] : e.arrived_at ? [239, 159, 39] : [138, 152, 168];
        doc.setTextColor(...color);
        doc.text(`${idx + 1}. ${status}`, 14, y);
        doc.setTextColor(0, 0, 0);
        doc.text(e.etablissement_nom || e.adresse || `Étape ${idx + 1}`, 26, y); y += 5;
        if (e.adresse) {
          doc.setFontSize(8);
          doc.setTextColor(108, 122, 137);
          doc.text("   " + e.adresse.substring(0, 70), 14, y); y += 4;
        }
        if (e.heure_prevue) {
          doc.setFontSize(9);
          doc.setTextColor(24, 95, 165);
          doc.text(`   ⏰ Prévu : ${e.heure_prevue}`, 14, y); y += 4;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        y += 2;
        if (y > 270) { doc.addPage(); y = 18; }
      });

      // 0.62.124 : Footer PDF premium via lib/pdfFooter
      try {
        const { addPdfFooter, getStructureFooterInfo } = await import("../../../../../lib/pdfFooter");
        const { createClient } = await import("../../../../../lib/supabase");
        const supabase = createClient();
        const structureInfo = await getStructureFooterInfo(supabase, tournee?.structure_id);
        addPdfFooter(doc, {
          type: "Feuille de route",
          numero: tournee?.numero || p.id.substring(0, 8),
          structure: structureInfo,
          showLegal: false,
        });
      } catch (e) {
        // Fallback
        doc.setFontSize(8);
        doc.setTextColor(140, 152, 168);
        doc.text(`Généré le ${new Date().toLocaleString("fr-FR")} · ${gpsTrack.length} points GPS enregistrés`, 14, 285);
      }

      doc.save(`feuille-route-${tournee?.numero || p.id.substring(0, 8)}.pdf`);
    } catch (e) {
      alert("Erreur PDF : " + e.message);
    }
  }

  if (loading) return <div className="bg-dark"><TopBar cartCount={cart.count} auth={auth} /><div style={{ padding: 40, textAlign: "center" }}>Chargement…</div></div>;

  if (!tournee) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="page-content" style={{ padding: 24 }}>
          <BackButton />
          <PageHead icon="ti-truck" title="Tournée introuvable" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-route" title={`Tournée ${tournee.numero || "—"}`} subtitle={tournee.date_tournee ? new Date(tournee.date_tournee).toLocaleDateString("fr-FR") : ""} />
          <div style={{ display: "flex", gap: 8 }}>
            {!tracking ? (
              <Btn variant="primary" icon="ti-broadcast" onClick={startTracking}>Démarrer tracking GPS</Btn>
            ) : (
              <Btn variant="danger" icon="ti-stop" onClick={stopTracking}>Arrêter tracking</Btn>
            )}
            <Btn variant="ghost" icon="ti-printer" onClick={exportFeuilleRoute}>Feuille de route PDF</Btn>
          </div>
        </div>

        {tracking && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #5aa05a", background: "rgba(94,160,90,.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#5aa05a", animation: "pulse 1.2s infinite" }} />
              <strong style={{ color: "#5aa05a" }}>Tracking GPS actif</strong>
              {currentPos && (
                <span style={{ fontSize: 12, color: "#5a6878" }}>
                  · 📍 {currentPos.latitude.toFixed(5)}, {currentPos.longitude.toFixed(5)}
                  {currentPos.speed_kmh != null && <span> · 🚗 {Math.round(currentPos.speed_kmh)} km/h</span>}
                  {currentPos.accuracy != null && <span> · ±{Math.round(currentPos.accuracy)}m</span>}
                </span>
              )}
            </div>
          </Panel>
        )}

        {/* Carte avec étapes + polyline OSRM + historique GPS */}
        <Panel style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
          <div ref={mapRef} style={{ width: "100%", height: 420, background: "#e3e9ee" }} />
        </Panel>

        {/* Liste étapes avec signature */}
        <Panel style={{ marginTop: 12 }}>
          <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>📋 Étapes ({etapes.length})</h3>
          {etapes.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#8a98a8" }}>Aucune étape configurée</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {etapes.map((e, idx) => {
                const isDone = !!e.completed_at;
                const isArrived = !!e.arrived_at;
                return (
                  <div key={e.id} style={{
                    background: "#fff",
                    border: `2px solid ${isDone ? "#5aa05a" : isArrived ? "#EF9F27" : "#e3e9ee"}`,
                    borderRadius: 8, padding: 12,
                    display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 10, alignItems: "center",
                  }}>
                    <div style={{ width: 34, height: 34, background: isDone ? "#5aa05a" : isArrived ? "#EF9F27" : "#185FA5", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.etablissement_nom || e.adresse || `Étape ${idx + 1}`}</div>
                      {e.adresse && <div style={{ fontSize: 11, color: "#5a6878" }}>📍 {e.adresse}</div>}
                      {e.heure_prevue && <div style={{ fontSize: 11, color: "#185FA5" }}>⏰ Prévu : {e.heure_prevue}</div>}
                      {e.signature_nom && <div style={{ fontSize: 11, color: "#5aa05a", fontWeight: 700 }}>✍ Signée par {e.signature_nom}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {!isArrived && (
                        <button onClick={() => markEtapeArrived(e)} style={{ background: "#EF9F27", color: "#fff", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📍 Arrivé</button>
                      )}
                      {isArrived && !isDone && (
                        <button onClick={() => setSignatureEtape(e)} style={{ background: "#5aa05a", color: "#fff", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✍ Signer</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {signatureEtape && (
          <SignatureEtapeModal etape={signatureEtape} auth={auth} onClose={() => setSignatureEtape(null)} onDone={() => { setSignatureEtape(null); reload(); }} />
        )}
      </div>
    </div>
  );
}

function SignatureEtapeModal({ etape, auth, onClose, onDone }) {
  const supabase = createClient();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [nom, setNom] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);

  function startDraw(e) {
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function draw(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#142131";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function stopDraw() { drawingRef.current = false; }
  function clearSign() {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
  }
  async function sauvegarder() {
    setSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      await supabase.from("tournees_etapes").update({
        signature_url: dataUrl,
        signature_nom: nom,
        signature_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        commentaire_livraison: commentaire || null,
      }).eq("id", etape.id);
      onDone();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={true} onClose={onClose} title={`✍ Signer la livraison · ${etape.etablissement_nom || "Étape"}`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" onClick={sauvegarder} disabled={saving || !nom}>{saving ? "..." : "Valider la livraison"}</Btn>
        </>
      }>
      <label style={{ fontSize: 12, color: "#5a6878" }}><b>Nom du signataire *</b>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom du réceptionniste" style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }} />
      </label>
      <label style={{ fontSize: 12, color: "#5a6878", display: "block", marginTop: 12 }}><b>Signature</b>
        <div style={{ marginTop: 4, border: "2px dashed #cfd8e0", borderRadius: 8, background: "#fafbfc", position: "relative" }}>
          <canvas ref={canvasRef} width={460} height={140}
            style={{ width: "100%", height: 140, cursor: "crosshair", touchAction: "none" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          <button onClick={clearSign} style={{ position: "absolute", top: 6, right: 6, background: "#fff", border: "1px solid #cfd8e0", borderRadius: 4, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>↺ Effacer</button>
        </div>
      </label>
      <label style={{ fontSize: 12, color: "#5a6878", display: "block", marginTop: 12 }}>Commentaire (optionnel)
        <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Anomalie, réserve, etc." style={{ width: "100%", padding: "8px 10px", marginTop: 4, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 13, minHeight: 60 }} />
      </label>
    </Modal>
  );
}
