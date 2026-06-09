"use client";
// =============================================================
//  /presentation/planning (0.64.0)
//  Mode TV : planning du jour avec interventions + tournées + maintenances
//  + équipes affectées. Affichage swim-lane par technicien/équipe.
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import RefreshButton from "../../components/RefreshButton";
import CastButton from "../../components/CastButton";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";
import ModeTVToolbar from "../../components/ModeTVToolbar";  /* 0.65.0 */

export default function PresentationPlanningPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationPlanning />
    </Suspense>
  );
}

const TYPE_META = {
  intervention: { col: "#EF9F27", bg: "rgba(239, 159, 39, .15)", border: "rgba(239, 159, 39, .5)", ic: "ti-tools", lbl: "DI" },
  tournee: { col: "#C9867F", bg: "rgba(201, 134, 127, .15)", border: "rgba(201, 134, 127, .5)", ic: "ti-truck-delivery", lbl: "Tournée" },
  maintenance: { col: "#7a6fb0", bg: "rgba(122, 111, 176, .15)", border: "rgba(122, 111, 176, .5)", ic: "ti-tool", lbl: "Maint." },
  formation: { col: "#7CC8C8", bg: "rgba(124, 200, 200, .15)", border: "rgba(124, 200, 200, .5)", ic: "ti-school", lbl: "Formation" },
  rdv: { col: "#5aa05a", bg: "rgba(90, 160, 90, .15)", border: "rgba(90, 160, 90, .5)", ic: "ti-calendar-event", lbl: "RDV" },
  autre: { col: "#8a98a8", bg: "rgba(138, 152, 168, .15)", border: "rgba(138, 152, 168, .5)", ic: "ti-circle-dot", lbl: "Autre" },
};

function PresentationPlanning() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "60", 10);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));  /* 0.65.0 */
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const ymd = todayStart.toISOString().slice(0, 10);

    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    // Sources parallèles
    const [interventions, tournees, maintenances, planEvts] = await Promise.all([
      tryFetch(supabase.from("interventions")
        .select("id, numero, type, urgence, date_planifiee, statut, technicien_nom, equipe_id, materiels(libelle), patients(nom, prenom, chambre)")
        .eq("structure_id", auth.structureId)
        .gte("date_planifiee", todayStart.toISOString())
        .lte("date_planifiee", todayEnd.toISOString())
        .order("date_planifiee")),
      tryFetch(supabase.from("tournees")
        .select("id, numero, nom, statut, heure_depart, date_tournee, chauffeur_user_id, nb_etapes")
        .eq("structure_id", auth.structureId)
        .eq("date_tournee", ymd)
        .order("heure_depart")),
      tryFetch(supabase.from("maintenances")
        .select("id, libelle, type, statut, date_prevue, materiels(libelle, code)")
        .eq("structure_id", auth.structureId)
        .gte("date_prevue", todayStart.toISOString())
        .lte("date_prevue", todayEnd.toISOString())
        .order("date_prevue")),
      tryFetch(supabase.from("planning_events")
        .select("id, titre, type, date_debut, date_fin, lieu, tout_journee, equipe_id")
        .eq("structure_id", auth.structureId)
        .gte("date_debut", todayStart.toISOString())
        .lte("date_debut", todayEnd.toISOString())
        .order("date_debut")),
    ]);

    // Normaliser en événements unifiés
    const evts = [];
    interventions.forEach(d => evts.push({
      id: "di-" + d.id,
      type: "intervention",
      titre: `${d.numero} · ${d.type}`,
      sub: d.materiels?.libelle ? `${d.materiels.libelle} ${d.patients?.nom ? "· " + d.patients.nom + " " + (d.patients.prenom || "") : ""}` : "",
      chambre: d.patients?.chambre || null,
      heure: d.date_planifiee ? new Date(d.date_planifiee).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "?",
      time_ms: d.date_planifiee ? new Date(d.date_planifiee).getTime() : 0,
      assignee: d.technicien_nom || "Non assigné",
      statut: d.statut,
      urgent: d.urgence === "Urgent",
    }));
    tournees.forEach(t => evts.push({
      id: "trn-" + t.id,
      type: "tournee",
      titre: t.nom || t.numero,
      sub: `${t.nb_etapes || 0} étape${(t.nb_etapes || 0) > 1 ? "s" : ""}`,
      heure: t.heure_depart ? t.heure_depart.slice(0, 5) : "?",
      time_ms: t.heure_depart ? new Date(`2000-01-01T${t.heure_depart}`).getTime() : 0,
      assignee: "Chauffeur",
      statut: t.statut,
    }));
    maintenances.forEach(m => evts.push({
      id: "mnt-" + m.id,
      type: "maintenance",
      titre: m.libelle || `Maintenance ${m.type || ""}`,
      sub: m.materiels?.libelle || "",
      heure: m.date_prevue ? new Date(m.date_prevue).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "Journée",
      time_ms: m.date_prevue ? new Date(m.date_prevue).getTime() : 0,
      assignee: "Technicien",
      statut: m.statut,
    }));
    planEvts.forEach(e => evts.push({
      id: "evt-" + e.id,
      type: e.type || "autre",
      titre: e.titre,
      sub: e.lieu || "",
      heure: e.tout_journee ? "Journée" : (e.date_debut ? new Date(e.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "?"),
      time_ms: e.date_debut ? new Date(e.date_debut).getTime() : 0,
      assignee: e.equipe_id ? "Équipe" : "—",
    }));

    // Tri par heure
    evts.sort((a, b) => (a.time_ms || 9999999999999) - (b.time_ms || 9999999999999));
    setEvents(evts);
    setLoading(false);
  }

  useEffect(() => {
    if (!auth.ready) return;
    load();
    timerRef.current = setInterval(load, refreshSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [auth.ready, auth.structureId, refreshSec]);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  function tryFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  // Compteurs par type
  const counts = events.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {});

  // Grouper par tranche horaire
  const tranches = [
    { label: "Matin",   icon: "ti-sun-low",  range: [0, 12], col: "#7CC8C8" },
    { label: "Après-midi", icon: "ti-sun", range: [12, 18], col: "#EF9F27" },
    { label: "Soir/Nuit", icon: "ti-moon", range: [18, 24], col: "#7a6fb0" },
  ];

  function inTranche(evt, [start, end]) {
    if (!evt.time_ms) return start === 0;
    const h = new Date(evt.time_ms).getHours();
    return h >= start && h < end;
  }

  if (auth.ready && !auth.structureId) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>
      <ModeTVToolbar onRefresh={() => (typeof load === "function" ? load() : location.reload())} />

        Authentification requise
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1c5454 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
      padding: "24px 110px",
      overflow: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
        paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>AVEHO — TV DE SERVICE<TVMagasinFilter onChange={setMagasinId} /></div>
          <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>
            Planning du jour
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ fontSize: 14, color: "#bfe6e6", marginTop: 2 }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      {/* Compteurs par type */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        {["intervention", "tournee", "maintenance", "formation", "rdv", "autre"].map(t => {
          const meta = TYPE_META[t];
          const v = counts[t] || 0;
          return (
            <div key={t} style={{
              background: `linear-gradient(135deg, ${meta.col}33, ${meta.col}11)`,
              border: `1px solid ${meta.col}55`,
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `linear-gradient(135deg, ${meta.col}, ${meta.col}cc)`,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>
                <i className={`ti ${meta.ic}`} />
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "Consolas, monospace" }}>
                  {v}
                </div>
                <div style={{ fontSize: 11, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                  {meta.lbl}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 80, color: "#7CC8C8" }} />
          <div style={{ fontSize: 32, color: "#bfe6e6", marginTop: 16, fontWeight: 600 }}>Aucun évènement planifié aujourd'hui</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {tranches.map(tr => {
            const list = events.filter(e => inTranche(e, tr.range));
            return (
              <div key={tr.label}>
                <h2 style={{
                  fontSize: 18,
                  color: tr.col,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  marginBottom: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  background: `${tr.col}1a`,
                  borderRadius: 10,
                  borderLeft: `4px solid ${tr.col}`,
                }}>
                  <i className={`ti ${tr.icon}`} style={{ fontSize: 22 }} />
                  {tr.label}
                  <span style={{ marginLeft: "auto", background: tr.col, color: "#142131", padding: "2px 10px", borderRadius: 12, fontSize: 12 }}>
                    {list.length}
                  </span>
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {list.length === 0 ? (
                    <div style={{
                      padding: 14, textAlign: "center", color: "rgba(191,230,230,.4)",
                      fontSize: 13, fontStyle: "italic",
                      border: "1.5px dashed rgba(255,255,255,.1)",
                      borderRadius: 10,
                    }}>
                      Aucun
                    </div>
                  ) : list.map(e => {
                    const meta = TYPE_META[e.type] || TYPE_META.autre;
                    return (
                      <div key={e.id} style={{
                        background: meta.bg,
                        border: `1.5px solid ${meta.border}`,
                        borderLeft: `5px solid ${meta.col}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                        animation: e.urgent ? "pulse-urgent 2.5s ease-in-out infinite" : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <i className={`ti ${meta.ic}`} style={{ color: meta.col, fontSize: 14 }} />
                              <span style={{ fontSize: 10, color: meta.col, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{meta.lbl}</span>
                              {e.urgent && <span style={{ fontSize: 9, background: "#ff8b80", color: "#fff", padding: "1px 5px", borderRadius: 6, fontWeight: 800 }}>URGENT</span>}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{e.titre}</div>
                            {e.sub && <div style={{ fontSize: 11.5, color: "#bfe6e6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.sub}</div>}
                            {e.chambre && <div style={{ fontSize: 10.5, color: "#9bb5b5", marginTop: 2 }}><i className="ti ti-bed" /> Ch. {e.chambre}</div>}
                            {e.assignee && e.assignee !== "—" && (
                              <div style={{ fontSize: 10.5, color: meta.col, marginTop: 3 }}>
                                <i className="ti ti-user-check" /> {e.assignee}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontSize: 16, fontWeight: 800, color: meta.col,
                            fontFamily: "Consolas, monospace",
                            background: `rgba(20, 33, 49, .4)`,
                            padding: "3px 8px",
                            borderRadius: 6,
                            flexShrink: 0,
                          }}>
                            {e.heure}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        position: "fixed", bottom: 8, right: 12,
        fontSize: 11, color: "rgba(191,230,230,0.5)",
      }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}
        Refresh {refreshSec}s
      </div>

      <style>{`
        @keyframes pulse-urgent {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,159,39,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239,159,39,0); }
        }
      `}</style>

      <TVScreenNav currentScreen="/presentation/planning" />
    </div>
  );
}
