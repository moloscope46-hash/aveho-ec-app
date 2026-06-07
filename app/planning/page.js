"use client";
// =============================================================
//  /planning — Planning Aveho hi-tech super beau
//
//  Vue agenda moderne avec :
//   - 3 modes : Mois / Semaine / Jour
//   - Évenements : interventions, maintenances, DI, livraisons, RDV
//   - Drag&drop (TODO), filtres par type/technicien
//   - Couleurs par catégorie, mini-cards événements
//   - Densité ajustable
//   - Time-grid heure par heure en mode semaine/jour
// =============================================================
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn } from "../ui";

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_COURTS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const JOURS_LONGS  = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

// Couleurs par type d'événement
const COULEURS = {
  intervention:  { bg: "#185FA5", icon: "ti-route" },
  maintenance:   { bg: "#7a6fb0", icon: "ti-tools" },
  di:            { bg: "#EF9F27", icon: "ti-clipboard-list" },
  commande:      { bg: "#5aa05a", icon: "ti-shopping-bag" },
  transfert:     { bg: "#7CC8C8", icon: "ti-transfer" },
  sav:           { bg: "#e35d5b", icon: "ti-alert-triangle" },
  rdv:           { bg: "#C9867F", icon: "ti-calendar-event" },
};

export default function Planning() {
  return (
    <>
      <TopBar />
      <PlanningInner />
    </>
  );
}

function PlanningInner() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();
  const [mode, setMode] = useState("semaine"); // mois | semaine | jour
  const [refDate, setRefDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    intervention: true, maintenance: true, di: true,
    commande: true, transfert: true, sav: true, rdv: true,
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    reload();
  }, [auth.ready, refDate, mode]);

  async function reload() {
    if (!auth.structureId) return;
    setLoading(true);
    const start = startOfRange();
    const end = endOfRange();
    const all = [];

    // 1. Interventions
    try {
      const { data } = await supabase
        .from("interventions")
        .select("id, type, date_prevue, technicien_nom, statut, patient_id")
        .eq("structure_id", auth.structureId)
        .gte("date_prevue", start.toISOString())
        .lte("date_prevue", end.toISOString())
        .limit(200);
      (data || []).forEach(i => all.push({
        id: i.id, kind: "intervention",
        title: i.type || "Intervention",
        sub: i.technicien_nom || "",
        date: new Date(i.date_prevue),
        status: i.statut,
        href: `/intervention/${i.id}`,
      }));
    } catch {}

    // 2. Maintenances
    try {
      const { data } = await supabase
        .from("maintenances")
        .select("id, type, date_prevue, technicien_nom, statut, vehicule_id, description")
        .eq("structure_id", auth.structureId)
        .gte("date_prevue", start.toISOString().slice(0, 10))
        .lte("date_prevue", end.toISOString().slice(0, 10))
        .limit(200);
      (data || []).forEach(m => all.push({
        id: m.id, kind: "maintenance",
        title: m.type || "Maintenance",
        sub: m.technicien_nom || m.description || "",
        date: new Date(m.date_prevue),
        status: m.statut,
        href: `/maintenance`,
      }));
    } catch {}

    // 3. DI
    try {
      const { data } = await supabase
        .from("demandes_internes")
        .select("id, numero, objet, statut, priorite, cree_le")
        .eq("structure_id", auth.structureId)
        .gte("cree_le", start.toISOString())
        .lte("cree_le", end.toISOString())
        .limit(200);
      (data || []).forEach(d => all.push({
        id: d.id, kind: "di",
        title: d.objet || d.numero || "DI",
        sub: d.priorite ? `Priorité ${d.priorite}` : "",
        date: new Date(d.cree_le),
        status: d.statut,
        href: `/magasin?tab=di&id=${d.id}`,
      }));
    } catch {}

    setEvents(all);
    setLoading(false);
  }

  function startOfRange() {
    const d = new Date(refDate);
    if (mode === "mois") {
      const dd = new Date(d.getFullYear(), d.getMonth(), 1);
      // Reculer au lundi
      const dow = (dd.getDay() + 6) % 7;
      dd.setDate(dd.getDate() - dow);
      return dd;
    }
    if (mode === "semaine") {
      const dow = (d.getDay() + 6) % 7;
      const dd = new Date(d);
      dd.setDate(d.getDate() - dow);
      dd.setHours(0, 0, 0, 0);
      return dd;
    }
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd;
  }
  function endOfRange() {
    const s = startOfRange();
    const e = new Date(s);
    if (mode === "mois") e.setDate(s.getDate() + 42); // 6 semaines
    else if (mode === "semaine") e.setDate(s.getDate() + 7);
    else e.setDate(s.getDate() + 1);
    e.setHours(23, 59, 59, 999);
    return e;
  }

  function goPrev() {
    const d = new Date(refDate);
    if (mode === "mois") d.setMonth(d.getMonth() - 1);
    else if (mode === "semaine") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setRefDate(d);
  }
  function goNext() {
    const d = new Date(refDate);
    if (mode === "mois") d.setMonth(d.getMonth() + 1);
    else if (mode === "semaine") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setRefDate(d);
  }
  function goToday() { setRefDate(new Date()); }

  const visibleEvents = useMemo(() => {
    return events.filter(e => filters[e.kind]);
  }, [events, filters]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    visibleEvents.forEach(e => {
      const key = e.date.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return map;
  }, [visibleEvents]);

  // Header titre selon mode
  const title = useMemo(() => {
    if (mode === "mois") return `${MOIS[refDate.getMonth()]} ${refDate.getFullYear()}`;
    if (mode === "semaine") {
      const s = startOfRange();
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return `${s.getDate()} ${MOIS[s.getMonth()].slice(0, 3)} → ${e.getDate()} ${MOIS[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
    }
    return `${JOURS_LONGS[(refDate.getDay() + 6) % 7]} ${refDate.getDate()} ${MOIS[refDate.getMonth()]} ${refDate.getFullYear()}`;
  }, [mode, refDate]);

  if (!auth.ready) return null;

  return (
    <main className="container">
      <PageHead icon="ti-calendar-stats" title="Planning agenda" subtitle={`${visibleEvents.length} événements`} color="#5e4a8c" />

      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
        padding: 12, marginBottom: 12,
        background: "linear-gradient(135deg, #fff, #fafbfc)",
        borderRadius: 14, boxShadow: "0 2px 8px rgba(20,33,49,.04)",
      }}>
        {/* Navigation */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={goPrev} style={navBtnStyle("#185FA5")}><i className="ti ti-chevron-left" /></button>
          <button onClick={goToday} style={{ ...navBtnStyle("#7CC8C8"), padding: "0 14px", width: "auto" }}>Aujourd'hui</button>
          <button onClick={goNext} style={navBtnStyle("#185FA5")}><i className="ti ti-chevron-right" /></button>
        </div>

        {/* Titre central */}
        <h2 style={{ flex: 1, margin: 0, fontSize: 18, fontWeight: 700, color: "#142131", textAlign: "center" }}>
          {title}
        </h2>

        {/* Toggle mode */}
        <div style={{ display: "flex", gap: 0, background: "#f4f7fa", borderRadius: 10, padding: 3 }}>
          {["jour", "semaine", "mois"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "6px 14px",
              background: mode === m ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
              color: mode === m ? "#fff" : "#5a6878",
              border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              textTransform: "capitalize",
            }}>{m}</button>
          ))}
        </div>

        {/* Filtres */}
        <button onClick={() => setShowFilters(!showFilters)} style={{
          ...navBtnStyle("#7a6fb0"), width: "auto", padding: "0 12px", gap: 6,
        }}>
          <i className="ti ti-filter" />
          Filtres
          {Object.values(filters).filter(v => !v).length > 0 && (
            <span style={{
              background: "#EF9F27", color: "#fff",
              padding: "1px 6px", borderRadius: 10,
              fontSize: 10, fontWeight: 700,
            }}>{Object.values(filters).filter(v => !v).length}</span>
          )}
        </button>
      </div>

      {/* Filtres panel */}
      {showFilters && (
        <div style={{
          padding: 12, marginBottom: 12,
          background: "linear-gradient(135deg, rgba(122,111,176,.05), rgba(122,111,176,.02))",
          borderRadius: 12, border: "1px solid rgba(122,111,176,.15)",
          display: "flex", flexWrap: "wrap", gap: 8,
        }}>
          {Object.entries(COULEURS).map(([kind, c]) => (
            <button key={kind} onClick={() => setFilters({ ...filters, [kind]: !filters[kind] })}
              style={{
                padding: "6px 12px", borderRadius: 8,
                background: filters[kind] ? `linear-gradient(135deg, ${c.bg}, ${c.bg}cc)` : "#fff",
                color: filters[kind] ? "#fff" : "#5a6878",
                border: `1px solid ${filters[kind] ? c.bg : "#e3e9ee"}`,
                fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
                textTransform: "capitalize",
                display: "inline-flex", alignItems: "center", gap: 5,
                opacity: filters[kind] ? 1 : 0.6,
              }}>
              <i className={`ti ${c.icon}`} />
              {kind}
            </button>
          ))}
        </div>
      )}

      {/* Grille planning */}
      {loading ? (
        <Panel><StateMsg>Chargement…</StateMsg></Panel>
      ) : mode === "mois" ? (
        <MonthGrid refDate={refDate} eventsByDay={eventsByDay} onNav={(d) => { setRefDate(d); setMode("jour"); }} />
      ) : mode === "semaine" ? (
        <WeekGrid refDate={refDate} startOfRange={startOfRange} events={visibleEvents} onClick={(href) => router.push(href)} />
      ) : (
        <DayGrid refDate={refDate} events={visibleEvents} onClick={(href) => router.push(href)} />
      )}
    </main>
  );
}

function navBtnStyle(color) {
  return {
    width: 38, height: 38, borderRadius: 10,
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: "#fff",
    border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontFamily: "inherit", cursor: "pointer",
    boxShadow: `0 3px 8px ${color}40`,
  };
}

// === MOIS : grille 7×6 cases ===
function MonthGrid({ refDate, eventsByDay, onNav }) {
  const cells = useMemo(() => {
    const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const dow = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - dow);
    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [refDate]);

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 12, boxShadow: "0 2px 8px rgba(20,33,49,.04)" }}>
      {/* Header jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {JOURS_COURTS.map(j => (
          <div key={j} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase" }}>{j}</div>
        ))}
      </div>
      {/* Cases */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          const key = d.toISOString().slice(0, 10);
          const evts = eventsByDay.get(key) || [];
          const isCurrentMonth = d.getMonth() === refDate.getMonth();
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div key={i} onClick={() => onNav(d)} style={{
              minHeight: 90,
              padding: 6,
              background: isToday ? "linear-gradient(135deg, rgba(124,200,200,.15), rgba(124,200,200,.05))" : (isCurrentMonth ? "#fafbfc" : "#fff"),
              border: `1px solid ${isToday ? "#7CC8C8" : "#eef1f4"}`,
              borderRadius: 8,
              cursor: "pointer",
              opacity: isCurrentMonth ? 1 : 0.4,
              transition: "all 200ms",
            }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? "#7CC8C8" : "#142131", marginBottom: 4 }}>
                {d.getDate()}
              </div>
              {evts.slice(0, 3).map((e, idx) => (
                <div key={idx} style={{
                  fontSize: 10, padding: "2px 5px", borderRadius: 4,
                  background: COULEURS[e.kind].bg, color: "#fff",
                  marginBottom: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  <i className={`ti ${COULEURS[e.kind].icon}`} /> {e.title}
                </div>
              ))}
              {evts.length > 3 && (
                <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 2, fontWeight: 700 }}>
                  +{evts.length - 3} autres
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === SEMAINE : grille 7 jours + colonnes time-grid ===
function WeekGrid({ refDate, startOfRange, events, onClick }) {
  const days = useMemo(() => {
    const out = [];
    const s = startOfRange();
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      out.push(d);
    }
    return out;
  }, [refDate]);

  const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7h → 18h

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 8, boxShadow: "0 2px 8px rgba(20,33,49,.04)", overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7, minmax(110px, 1fr))", gap: 2, minWidth: 800 }}>
        {/* Header */}
        <div></div>
        {days.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={i} style={{
              padding: "8px 4px", textAlign: "center",
              background: isToday ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
              borderRadius: 6,
              color: isToday ? "#fff" : "#142131",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{JOURS_COURTS[i]}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{d.getDate()}</div>
            </div>
          );
        })}

        {/* Heures + cellules */}
        {HOURS.map(h => (
          <>
            <div key={`h-${h}`} style={{ fontSize: 11, color: "#8a98a8", textAlign: "right", padding: "4px 6px", borderTop: "1px solid #eef1f4" }}>
              {h}:00
            </div>
            {days.map((d, di) => {
              const evtsHour = events.filter(e => {
                if (e.date.toDateString() !== d.toDateString()) return false;
                return e.date.getHours() === h;
              });
              return (
                <div key={`${h}-${di}`} style={{
                  minHeight: 50,
                  borderTop: "1px solid #eef1f4",
                  borderLeft: "1px solid #eef1f4",
                  padding: 2, display: "flex", flexDirection: "column", gap: 2,
                }}>
                  {evtsHour.map((e, idx) => (
                    <div key={idx} onClick={() => onClick(e.href)} style={{
                      padding: "3px 6px", borderRadius: 4,
                      background: `linear-gradient(135deg, ${COULEURS[e.kind].bg}, ${COULEURS[e.kind].bg}cc)`,
                      color: "#fff", fontSize: 10, fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      <i className={`ti ${COULEURS[e.kind].icon}`} /> {e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

// === JOUR : time-grid détaillée + liste ===
function DayGrid({ refDate, events, onClick }) {
  const dayEvents = useMemo(() => {
    return events.filter(e => e.date.toDateString() === refDate.toDateString())
      .sort((a, b) => a.date - b.date);
  }, [events, refDate]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(20,33,49,.04)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#142131", marginBottom: 12 }}>
          <i className="ti ti-list-details" style={{ color: "#5e4a8c" }} /> {dayEvents.length} événements
        </div>
        {dayEvents.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
            <i className="ti ti-calendar-off" style={{ fontSize: 36 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>Aucun événement ce jour</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dayEvents.map(e => (
              <div key={e.id} onClick={() => onClick(e.href)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px",
                background: "#fafbfc",
                borderLeft: `4px solid ${COULEURS[e.kind].bg}`,
                borderRadius: 8,
                cursor: "pointer",
                transition: "transform 200ms",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `linear-gradient(135deg, ${COULEURS[e.kind].bg}, ${COULEURS[e.kind].bg}cc)`,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  <i className={`ti ${COULEURS[e.kind].icon}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#142131", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.title}
                  </div>
                  {e.sub && <div style={{ fontSize: 11, color: "#8a98a8" }}>{e.sub}</div>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COULEURS[e.kind].bg, flexShrink: 0 }}>
                  {e.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
