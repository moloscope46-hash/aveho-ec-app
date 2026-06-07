"use client";
// =============================================================
//  /magasin/tournees/[id] — Détail tournée avec carte Leaflet (0.61.3)
//  Affichage des étapes ordonnées + carte points d'intérêt
// =============================================================
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/useAuth";
import { useMagasinContext } from "../../../../lib/useMagasinContext";
import TopBar from "../../../TopBar";
import { useCart } from "../../../useCart";
import { PageHead, Panel, Btn } from "../../../ui";
import { MagasinSidebar } from "../../../components/MagasinSidebar";
// 0.61.8 : Signature par étape + GPS tracking + OSRM routing
import { SignatureCanvas } from "../../../components/SignatureCanvas";
import { useGpsTracking, optimiserTournee } from "../../../../lib/gpsHelpers";

const STATUTS_TOURNEE = {
  planifiee: { lbl: "📅 Planifiée", col: "#EF9F27" },
  en_cours: { lbl: "🚛 En cours", col: "#185FA5" },
  terminee: { lbl: "✓ Terminée", col: "#5aa05a" },
  annulee: { lbl: "⊘ Annulée", col: "#e35d5b" },
};

const STATUTS_ETAPE = {
  a_faire: { lbl: "À faire", col: "#8a98a8", ic: "ti-circle" },
  en_cours: { lbl: "En cours", col: "#EF9F27", ic: "ti-clock" },
  terminee: { lbl: "Terminée", col: "#5aa05a", ic: "ti-check" },
  echec: { lbl: "Échec", col: "#e35d5b", ic: "ti-x" },
  annulee: { lbl: "Annulée", col: "#8a98a8", ic: "ti-ban" },
};

export default function DetailTourneePage() {
  const router = useRouter();
  const { id } = useParams();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const [tournee, setTournee] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [vehicule, setVehicule] = useState(null);
  const [chauffeur, setChauffeur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  // 0.61.8 : signature par étape + optimisation OSRM
  const [signatureEtape, setSignatureEtape] = useState(null); // {etape, base64}
  const [optimisationEnCours, setOptimisationEnCours] = useState(false);
  const [osrmRoute, setOsrmRoute] = useState(null);
  // 0.61.8 : GPS tracking activé quand tournée en_cours
  const gpsActive = tournee?.statut === "en_cours";
  const gps = useGpsTracking({ tourneeId: id, enabled: gpsActive });

  useEffect(() => {
    if (!id || !auth.ready) return;
    reload();
  }, [id, auth.ready]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data; } catch { return null; } };
    const t = await tryFetch(supabase.from("tournees").select("*").eq("id", id).single());
    setTournee(t);
    if (t) {
      const [e, v, c] = await Promise.all([
        (async () => { try { const r = await supabase.from("tournees_etapes").select("*").eq("tournee_id", id).order("ordre"); return r.data || []; } catch { return []; } })(),
        t.vehicule_id ? tryFetch(supabase.from("vehicules_magasin").select("*").eq("id", t.vehicule_id).single()) : null,
        t.chauffeur_user_id ? tryFetch(supabase.from("membres_structure").select("prenom, nom, telephone").eq("user_id", t.chauffeur_user_id).single()) : null,
      ]);
      setEtapes(e);
      setVehicule(v);
      setChauffeur(c);
    }
    setLoading(false);
  }

  // Init carte Leaflet quand les étapes changent
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || etapes.length === 0) return;
    let L;
    (async () => {
      // Lazy load Leaflet
      if (!window.L) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        await new Promise(resolve => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      L = window.L;

      // Initialise une seule fois
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const validEtapes = etapes.filter(e => e.latitude && e.longitude);
      const defaultCenter = validEtapes.length > 0
        ? [parseFloat(validEtapes[0].latitude), parseFloat(validEtapes[0].longitude)]
        : [46.603354, 1.888334];  // Centre France

      const map = L.map(mapRef.current).setView(defaultCenter, 7);
      mapInstance.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd', maxZoom: 19,
      }).addTo(map);

      // Markers numérotés
      const markers = [];
      validEtapes.forEach((e, i) => {
        const stColor = STATUTS_ETAPE[e.statut]?.col || "#5a8f8f";
        const icon = L.divIcon({
          html: `<div style="
            width: 32px; height: 32px; border-radius: 16px;
            background: ${stColor}; color: #fff; display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 14px; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.30);
          ">${e.ordre}</div>`,
          className: "", iconSize: [32, 32], iconAnchor: [16, 16],
        });
        const m = L.marker([parseFloat(e.latitude), parseFloat(e.longitude)], { icon }).addTo(map);
        m.bindPopup(`
          <div style="font-family: Quicksand, sans-serif; min-width: 180px;">
            <div style="font-weight: 700; color: #142131; margin-bottom: 4px;">${e.ordre}. ${e.label}</div>
            ${e.adresse ? `<div style="font-size: 11px; color: #5a6878;">${e.adresse}</div>` : ""}
            ${e.ville ? `<div style="font-size: 11px; color: #5a6878;">${e.ville}</div>` : ""}
            <div style="margin-top: 6px; padding: 3px 6px; background: ${stColor}15; color: ${stColor}; border-radius: 4px; font-size: 10px; font-weight: 700; display: inline-block;">
              ${STATUTS_ETAPE[e.statut]?.lbl || e.statut}
            </div>
          </div>
        `);
        markers.push(m);
      });

      // Polyline entre les étapes
      if (validEtapes.length > 1) {
        const points = validEtapes.map(e => [parseFloat(e.latitude), parseFloat(e.longitude)]);
        L.polyline(points, { color: "#5a8f8f", weight: 3, opacity: 0.6, dashArray: "8, 4" }).addTo(map);
      }

      // Fit bounds
      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.15));
      } else if (markers.length === 1) {
        map.setView(markers[0].getLatLng(), 12);
      }
    })();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [etapes]);

  async function changerStatutEtape(etape, newStatut) {
    // 0.61.8 : si étape passe à "terminée", demande signature
    if (newStatut === "terminee" && !etape.signature_url) {
      setSignatureEtape({ etape, base64: null });
      return;
    }
    setActionInProgress(true);
    const updates = { statut: newStatut };
    const now = new Date().toISOString();
    if (newStatut === "en_cours") updates.arrivee_at = now;
    if (newStatut === "terminee") updates.depart_at = now;
    await supabase.from("tournees_etapes").update(updates).eq("id", etape.id);
    const newNbCompletees = etapes.filter(e => e.id === etape.id ? newStatut === "terminee" : e.statut === "terminee").length;
    await supabase.from("tournees").update({ nb_completees: newNbCompletees }).eq("id", id);
    await reload();
    setActionInProgress(false);
  }

  // 0.61.8 : termine l'étape avec signature client
  async function terminerAvecSignature() {
    if (!signatureEtape) return;
    setActionInProgress(true);
    try {
      let signatureUrl = null;
      if (signatureEtape.base64) {
        const res = await fetch(signatureEtape.base64);
        const blob = await res.blob();
        const fileName = `etape-sig-${signatureEtape.etape.id}-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from("sav-photos").upload(fileName, blob, {
          cacheControl: "3600", upsert: false, contentType: "image/png",
        });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("sav-photos").getPublicUrl(fileName);
          signatureUrl = pub.publicUrl;
        }
      }
      await supabase.from("tournees_etapes").update({
        statut: "terminee",
        depart_at: new Date().toISOString(),
        signature_url: signatureUrl,
      }).eq("id", signatureEtape.etape.id);
      const newNbCompletees = etapes.filter(e => e.id === signatureEtape.etape.id ? true : e.statut === "terminee").length;
      await supabase.from("tournees").update({ nb_completees: newNbCompletees }).eq("id", id);
      setSignatureEtape(null);
      await reload();
    } catch (e) { alert("Erreur signature : " + e.message); }
    finally { setActionInProgress(false); }
  }

  // 0.61.8 : Optimisation OSRM de l'ordre des étapes
  async function optimiserOSRM() {
    const valides = etapes.filter(e => e.latitude && e.longitude && e.statut === "a_faire");
    if (valides.length < 3) { alert("Il faut au moins 3 étapes avec géoloc pour optimiser"); return; }
    setOptimisationEnCours(true);
    try {
      const points = valides.map(e => ({ lat: parseFloat(e.latitude), lng: parseFloat(e.longitude) }));
      const res = await optimiserTournee(points);
      if (!res) { alert("OSRM n'a pas retourné de résultat"); return; }
      // Update ordre dans DB selon res.ordre
      if (!confirm(`Itinéraire optimisé : ${res.distance_km} km / ${res.duree_min} min.\n\nAppliquer le nouvel ordre des ${valides.length} étapes ?`)) return;
      for (let i = 0; i < res.ordre.length; i++) {
        const etape = valides[res.ordre[i]];
        await supabase.from("tournees_etapes").update({ ordre: i + 1 }).eq("id", etape.id);
      }
      await supabase.from("tournees").update({
        distance_estimee_km: res.distance_km,
        duree_estimee_min: res.duree_min,
      }).eq("id", id);
      setOsrmRoute(res);
      alert(`✓ Tournée optimisée. ${res.distance_km} km · ${res.duree_min} min.`);
      await reload();
    } catch (e) { alert("Erreur OSRM : " + e.message); }
    finally { setOptimisationEnCours(false); }
  }

  async function changerStatutTournee(newStatut) {
    if (!confirm(`Passer la tournée en statut "${STATUTS_TOURNEE[newStatut]?.lbl}" ?`)) return;
    setActionInProgress(true);
    const updates = { statut: newStatut };
    const now = new Date().toISOString();
    if (newStatut === "en_cours") updates.demarrage_at = now;
    if (newStatut === "terminee") updates.termine_at = now;
    await supabase.from("tournees").update(updates).eq("id", id);
    await reload();
    setActionInProgress(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>;
  if (!tournee) return <div style={{ padding: 40, textAlign: "center", color: "#e35d5b" }}>Tournée introuvable</div>;

  const st = STATUTS_TOURNEE[tournee.statut] || STATUTS_TOURNEE.planifiee;
  const completionPct = tournee.nb_etapes > 0 ? Math.round((tournee.nb_completees / tournee.nb_etapes) * 100) : 0;

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${st.col}22, ${st.col}08)`,
            borderLeft: `4px solid ${st.col}`,
            borderRadius: 12, padding: 18, marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, background: `${st.col}33`, color: st.col, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                <i className="ti ti-route" />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Tournée · {tournee.numero}</div>
                <h1 style={{ margin: "4px 0", fontSize: 22, color: "#142131" }}>{tournee.nom}</h1>
                <div style={{ display: "flex", gap: 10, fontSize: 12.5, color: "#5a6878", flexWrap: "wrap" }}>
                  <span>📅 {new Date(tournee.date_tournee).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</span>
                  {tournee.heure_depart && <span>🕐 {tournee.heure_depart.slice(0, 5)} → {tournee.heure_retour_prevue?.slice(0, 5) || "?"}</span>}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: st.col, fontFamily: "Consolas,monospace" }}>{completionPct}%</div>
                <div style={{ fontSize: 10.5, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 1 }}>{tournee.nb_completees}/{tournee.nb_etapes}</div>
              </div>
              <span style={{ padding: "6px 14px", borderRadius: 6, background: `${st.col}22`, color: st.col, fontSize: 12, fontWeight: 700 }}>{st.lbl}</span>
            </div>

            {/* Actions tournée */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {tournee.statut === "planifiee" && (
                <Btn variant="primary" icon="ti-truck" onClick={() => changerStatutTournee("en_cours")} disabled={actionInProgress}>🚛 Démarrer la tournée</Btn>
              )}
              {tournee.statut === "en_cours" && (
                <Btn variant="primary" icon="ti-check" onClick={() => changerStatutTournee("terminee")} disabled={actionInProgress}>✓ Terminer la tournée</Btn>
              )}
              {tournee.statut !== "annulee" && tournee.statut !== "terminee" && (
                <Btn variant="ghost" icon="ti-x" onClick={() => changerStatutTournee("annulee")} disabled={actionInProgress} style={{ color: "#e35d5b" }}>Annuler</Btn>
              )}
            </div>
          </div>

          {/* Véhicule + chauffeur */}
          {(vehicule || chauffeur) && (
            <Panel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {vehicule && (
                  <div>
                    <h4 style={{ margin: "0 0 6px", color: "#5a8f8f", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>🚛 Véhicule</h4>
                    <div style={{ fontFamily: "Consolas,monospace", fontWeight: 700, fontSize: 14 }}>{vehicule.immatriculation}</div>
                    <div style={{ fontSize: 12, color: "#5a6878" }}>{vehicule.marque} {vehicule.modele}</div>
                  </div>
                )}
                {chauffeur && (
                  <div>
                    <h4 style={{ margin: "0 0 6px", color: "#5a8f8f", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>👤 Chauffeur</h4>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{chauffeur.prenom} {chauffeur.nom}</div>
                    {chauffeur.telephone && <div style={{ fontSize: 12, color: "#5a6878" }}>📞 {chauffeur.telephone}</div>}
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Carte Leaflet */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <h3 style={{ margin: 0, color: "#5a8f8f" }}>🗺 Carte de la tournée</h3>
              <div style={{ display: "flex", gap: 6 }}>
                {/* 0.61.8 : OSRM optimisation */}
                <Btn variant="ghost" icon="ti-route-2" onClick={optimiserOSRM} disabled={optimisationEnCours}>
                  {optimisationEnCours ? "⏳" : "🧭 Optimiser ordre (OSRM)"}
                </Btn>
              </div>
            </div>
            {/* 0.61.8 : indicateur GPS chauffeur */}
            {gpsActive && (
              <div style={{ marginBottom: 10, padding: 8, background: gps.watching ? "rgba(90,160,90,.12)" : "rgba(239,159,39,.12)", borderRadius: 6, fontSize: 11.5, color: gps.watching ? "#5aa05a" : "#d48820", fontWeight: 600 }}>
                {gps.watching ? `🛰 Tracking GPS actif · position envoyée toutes les 30s` : `⏳ ${gps.error || "En attente position GPS..."}`}
                {gps.position && <span style={{ marginLeft: 10, fontFamily: "Consolas,monospace", fontSize: 10.5, opacity: 0.7 }}>
                  ({gps.position.lat.toFixed(4)}, {gps.position.lng.toFixed(4)})
                </span>}
              </div>
            )}
            {/* 0.61.8 : Distance/durée OSRM si calculées */}
            {osrmRoute && (
              <div style={{ marginBottom: 10, padding: 8, background: "rgba(94,143,143,.12)", borderRadius: 6, fontSize: 11.5, color: "#5a8f8f", fontWeight: 600 }}>
                ✓ Itinéraire OSRM : <b>{osrmRoute.distance_km} km</b> · <b>{osrmRoute.duree_min} min</b>
              </div>
            )}
            <div ref={mapRef} style={{ height: 400, borderRadius: 10, overflow: "hidden", background: "#fafbfc" }} />
            {etapes.filter(e => !e.latitude || !e.longitude).length > 0 && (
              <div style={{ marginTop: 8, padding: 8, background: "rgba(239,159,39,.10)", borderRadius: 6, fontSize: 11.5, color: "#d48820" }}>
                ⚠ {etapes.filter(e => !e.latitude || !e.longitude).length} étape(s) sans géoloc — non affichée(s) sur la carte. Ajoute les lat/lng aux établissements/dépôts.
              </div>
            )}
          </Panel>

          {/* Liste étapes */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>📍 Étapes ordonnées ({etapes.length})</h3>
            {etapes.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
                Aucune étape. Modifie la tournée pour en ajouter.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {etapes.map(e => {
                  const stE = STATUTS_ETAPE[e.statut] || STATUTS_ETAPE.a_faire;
                  const next = e.statut === "a_faire" ? "en_cours" : e.statut === "en_cours" ? "terminee" : null;
                  const nextLbl = next === "en_cours" ? "▶ Démarrer" : next === "terminee" ? "✓ Terminer" : null;
                  return (
                    <div key={e.id} style={{
                      display: "flex", gap: 12, alignItems: "center",
                      padding: 12, background: "#fff", border: `1px solid ${stE.col}33`, borderLeft: `4px solid ${stE.col}`,
                      borderRadius: 10,
                    }}>
                      <div style={{ width: 36, height: 36, background: stE.col, color: "#fff", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {e.ordre}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#142131", fontSize: 13.5 }}>{e.label}</div>
                        {(e.adresse || e.ville) && <div style={{ fontSize: 11, color: "#5a6878" }}>{e.adresse}{e.adresse && e.ville && " · "}{e.ville}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "#8a98a8" }}>
                          <span style={{ padding: "1px 6px", background: "#f0f3f6", borderRadius: 3, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10, fontWeight: 700 }}>{e.type_etape}</span>
                          {e.demande_id && <span onClick={() => router.push(`/demandes-internes/${e.demande_id}`)} style={{ cursor: "pointer", color: "#185FA5", fontWeight: 600 }}>→ Voir DI</span>}
                          {e.duree_estimee_min && <span>⏱ {e.duree_estimee_min} min</span>}
                        </div>
                      </div>
                      <span style={{ padding: "3px 8px", background: `${stE.col}15`, color: stE.col, borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                        <i className={`ti ${stE.ic}`} /> {stE.lbl}
                      </span>
                      {next && tournee.statut === "en_cours" && (
                        <Btn variant="primary" onClick={() => changerStatutEtape(e, next)} disabled={actionInProgress} style={{ fontSize: 11 }}>
                          {nextLbl}
                        </Btn>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
      {/* 0.61.8 : Modal signature pour terminer étape */}
      {signatureEtape && (
        <div onClick={() => setSignatureEtape(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 14, padding: 20, maxWidth: 500, width: "100%",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h3 style={{ margin: "0 0 6px", color: "#5a8f8f" }}>✍ Signature client</h3>
            <div style={{ fontSize: 12.5, color: "#5a6878", marginBottom: 12 }}>
              <b>{signatureEtape.etape.label}</b>
              {signatureEtape.etape.adresse && <div style={{ fontSize: 11, color: "#8a98a8" }}>{signatureEtape.etape.adresse}</div>}
            </div>
            <SignatureCanvas onChange={(base64) => setSignatureEtape({ ...signatureEtape, base64 })} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => setSignatureEtape(null)}>Annuler</Btn>
              <Btn variant="ghost" onClick={() => { setSignatureEtape({ ...signatureEtape, base64: null }); terminerAvecSignature(); }} disabled={actionInProgress}>Sans signature</Btn>
              <Btn variant="primary" icon="ti-check" onClick={terminerAvecSignature} disabled={actionInProgress || !signatureEtape.base64}>✓ Valider</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
