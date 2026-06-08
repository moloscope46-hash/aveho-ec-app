"use client";
// =============================================================
//  components/PlanningCalendar.js (0.62.128)
//
//  Vue calendrier des événements (interventions, tournées, etc.)
//  - Vue Jour / Semaine / Mois
//  - Swim-lanes par équipe / personne
//  - Filtres par type d'événement
// =============================================================

import { useState, useEffect, useMemo } from "react";
import { createClient } from "../../lib/supabase";

const VIEW_MODES = [
  { k: "day", l: "Jour", ic: "ti-calendar-event" },
  { k: "week", l: "Semaine", ic: "ti-calendar-week" },
  { k: "month", l: "Mois", ic: "ti-calendar-month" },
];

const EVENT_TYPES = [
  { k: "intervention", l: "Intervention", col: "#185FA5", ic: "ti-tools" },
  { k: "tournee", l: "Tournée", col: "#7CC8C8", ic: "ti-truck" },
  { k: "formation", l: "Formation", col: "#EF9F27", ic: "ti-school" },
  { k: "rdv", l: "Rendez-vous", col: "#7a6fb0", ic: "ti-clock" },
  { k: "autre", l: "Autre", col: "#5a6878", ic: "ti-bookmark" },
];

export default function PlanningCalendar({ structureId, equipes = [] }) {
  const supabase = createClient();
  const [view, setView] = useState("week");
  const [pivot, setPivot] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState([]);
  const [equipeFilter, setEquipeFilter] = useState("");
  // 0.62.133 : modal d'édition au click
  const [editEvent, setEditEvent] = useState(null);
  // 0.62.134 : modal création nouvel event
  const [createOpen, setCreateOpen] = useState(false);

  // Calcul du range visible
  const range = useMemo(() => {
    const d = new Date(pivot);
    if (view === "day") {
      return { start: startOfDay(d), end: endOfDay(d) };
    } else if (view === "week") {
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: startOfDay(monday), end: endOfDay(sunday) };
    } else {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: startOfDay(first), end: endOfDay(last) };
    }
  }, [pivot, view]);

  useEffect(() => {
    async function load() {
      if (!structureId) return;
      setLoading(true);
      try {
        // 0.62.130 : fetch multi-sources (interventions + planning_events + tournees)
        const queries = [
          // Source 1 : interventions
          supabase
            .from("interventions")
            .select("id, numero, description, date_planifiee, etat, urgence, equipe_id")
            .eq("structure_id", structureId)
            .gte("date_planifiee", range.start.toISOString())
            .lte("date_planifiee", range.end.toISOString())
            .order("date_planifiee"),
          // Source 2 : planning_events génériques (table 0.62.128)
          supabase
            .from("planning_events")
            .select("id, titre, description, type, date_debut, date_fin, equipe_id, couleur, icone, lieu, tout_journee")
            .eq("structure_id", structureId)
            .gte("date_debut", range.start.toISOString())
            .lte("date_debut", range.end.toISOString())
            .order("date_debut"),
          // Source 3 : tournees
          supabase
            .from("tournees")
            .select("id, numero, date_planifiee, chauffeur_user_id, statut")
            .gte("date_planifiee", range.start.toISOString())
            .lte("date_planifiee", range.end.toISOString())
            .order("date_planifiee"),
        ];
        const results = await Promise.allSettled(queries);

        const interventions = results[0].status === "fulfilled" ? (results[0].value.data || []) : [];
        const planningEvts = results[1].status === "fulfilled" ? (results[1].value.data || []) : [];
        const tournees = results[2].status === "fulfilled" ? (results[2].value.data || []) : [];

        const evts = [
          ...interventions.map(i => ({
            id: "intv-" + i.id,
            type: "intervention",
            titre: i.numero,
            desc: i.description,
            date: new Date(i.date_planifiee),
            equipe_id: i.equipe_id,
            urgence: i.urgence,
            col: EVENT_TYPES.find(t => t.k === "intervention").col,
          })),
          ...planningEvts.map(p => {
            const typeMeta = EVENT_TYPES.find(t => t.k === p.type) || EVENT_TYPES.find(t => t.k === "autre");
            return {
              id: "evt-" + p.id,
              type: p.type || "autre",
              titre: p.titre,
              desc: p.description || p.lieu,
              date: new Date(p.date_debut),
              equipe_id: p.equipe_id,
              col: p.couleur || typeMeta.col,
              ic: p.icone || typeMeta.ic,
            };
          }),
          ...tournees.map(t => ({
            id: "tour-" + t.id,
            type: "tournee",
            titre: t.numero || "Tournée",
            desc: `Statut : ${t.statut || "—"}`,
            date: new Date(t.date_planifiee),
            col: EVENT_TYPES.find(t => t.k === "tournee").col,
          })),
        ];

        setEvents(evts);
      } catch {
        setEvents([]);
      } finally { setLoading(false); }
    }
    load();
  }, [supabase, structureId, range]);

  const filtered = events.filter(e => {
    if (typeFilter.length > 0 && !typeFilter.includes(e.type)) return false;
    if (equipeFilter && e.equipe_id !== equipeFilter) return false;
    return true;
  });

  function prev() {
    const d = new Date(pivot);
    if (view === "day") d.setDate(d.getDate() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setPivot(d);
  }
  function next() {
    const d = new Date(pivot);
    if (view === "day") d.setDate(d.getDate() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setPivot(d);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e3e9ee", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #fafbfc, #fff)",
        borderBottom: "1px solid #e3e9ee",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}>
        <button onClick={prev} style={navBtn}><i className="ti ti-chevron-left" /></button>
        <button onClick={() => setPivot(new Date())} style={{ ...navBtn, padding: "6px 12px", fontWeight: 700 }}>Aujourd'hui</button>
        <button onClick={next} style={navBtn}><i className="ti ti-chevron-right" /></button>

        <div style={{ fontWeight: 700, fontSize: 14, color: "#142131", marginLeft: 4 }}>
          {formatRange(range, view)}
        </div>

        <div style={{ marginLeft: "auto", display: "inline-flex", border: "1px solid #e3e9ee", borderRadius: 8, overflow: "hidden" }}>
          {VIEW_MODES.map(m => (
            <button key={m.k} onClick={() => setView(m.k)}
              style={{
                padding: "6px 12px",
                background: view === m.k ? "linear-gradient(135deg, #185FA5, #7CC8C8)" : "transparent",
                color: view === m.k ? "#fff" : "#5a6878",
                border: "none",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
              <i className={`ti ${m.ic}`} /> {m.l}
            </button>
          ))}
        </div>

        {/* 0.62.134 : bouton créer un événement */}
        <button onClick={() => setCreateOpen(true)}
          style={{
            padding: "8px 14px",
            background: "linear-gradient(135deg, #EF9F27, #d48720)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            boxShadow: "0 2px 6px rgba(239, 159, 39, .35)",
          }}>
          <i className="ti ti-plus" /> Nouvel événement
        </button>
      </div>

      {/* Filtres */}
      <div style={{ padding: "8px 16px", background: "#fafbfc", borderBottom: "1px solid #f0f3f6", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "#8a98a8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, marginRight: 4, alignSelf: "center" }}>Types :</span>
        {EVENT_TYPES.map(t => {
          const on = typeFilter.length === 0 || typeFilter.includes(t.k);
          return (
            <span key={t.k} onClick={() => {
              if (typeFilter.length === 0) setTypeFilter([t.k]);
              else if (typeFilter.includes(t.k)) {
                const r = typeFilter.filter(x => x !== t.k);
                setTypeFilter(r);
              } else setTypeFilter([...typeFilter, t.k]);
            }}
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 10,
                background: on ? t.col + "22" : "#f1f3f5",
                color: on ? t.col : "#9aa7b4",
                border: `1px solid ${on ? t.col + "55" : "#e6ebf0"}`,
                cursor: "pointer", fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 3,
              }}>
              <i className={`ti ${t.ic}`} /> {t.l}
            </span>
          );
        })}
        {equipes.length > 0 && (
          <select value={equipeFilter} onChange={(e) => setEquipeFilter(e.target.value)}
            style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11, border: "1px solid #e3e9ee", borderRadius: 8, fontFamily: "inherit" }}>
            <option value="">Toutes les équipes</option>
            {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
          </select>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 12, minHeight: 400 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8a98a8" }}>
            <i className="ti ti-loader-2" style={{ animation: "av-spinner-spin 0.85s linear infinite", fontSize: 24 }} />
          </div>
        ) : view === "month" ? (
          <MonthGrid range={range} events={filtered} pivot={pivot} onEventClick={setEditEvent} />
        ) : view === "week" ? (
          <WeekGrid range={range} events={filtered} onEventClick={setEditEvent} />
        ) : (
          <DayList events={filtered} onEventClick={setEditEvent} />
        )}
      </div>

      {/* 0.62.133 : Modal d'édition au click sur event */}
      {editEvent && (
        <EventEditModal event={editEvent} onClose={() => setEditEvent(null)} />
      )}

      {/* 0.62.134 : Modal création nouvel événement */}
      {createOpen && (
        <EventCreateModal
          structureId={structureId}
          equipes={equipes}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

const navBtn = {
  padding: "6px 8px",
  background: "transparent",
  border: "1px solid #e3e9ee",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  color: "#5a6878",
};

function MonthGrid({ range, events, pivot, onEventClick }) {
  const supabase = (typeof window !== "undefined") ? null : null; // lazy import below
  const first = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
  const startDay = (first.getDay() || 7) - 1;
  const last = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0);
  const totalDays = last.getDate();
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(new Date(pivot.getFullYear(), pivot.getMonth(), i));

  // 0.62.131 : drag&drop handlers
  async function handleDrop(targetDate, evtJson) {
    if (!evtJson || !targetDate) return;
    try {
      const evt = JSON.parse(evtJson);
      // Calcule la nouvelle date en gardant l'heure originale
      const newDate = new Date(targetDate);
      const oldDate = new Date(evt.date);
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

      // Détermine la table à mettre à jour selon le préfixe
      const { createClient } = await import("../../lib/supabase");
      const sb = createClient();
      if (evt.id.startsWith("intv-")) {
        await sb.from("interventions").update({ date_planifiee: newDate.toISOString() }).eq("id", evt.id.replace("intv-", ""));
      } else if (evt.id.startsWith("evt-")) {
        await sb.from("planning_events").update({ date_debut: newDate.toISOString() }).eq("id", evt.id.replace("evt-", ""));
      } else if (evt.id.startsWith("tour-")) {
        await sb.from("tournees").update({ date_planifiee: newDate.toISOString() }).eq("id", evt.id.replace("tour-", ""));
      }
      // Toast + reload
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.(`📅 "${evt.titre}" déplacé au ${newDate.toLocaleDateString("fr-FR")}`);
      } catch {}
      // Force refresh page (simple approach)
      window.location.reload();
    } catch (e) {
      console.warn("[Planning] Drop error:", e);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
          <div key={d} style={{ textAlign: "center", fontWeight: 700, fontSize: 11, color: "#5a6878", padding: 4 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} style={{ minHeight: 70, background: "transparent" }}></div>;
          const dayEvents = events.filter(e =>
            e.date.getDate() === d.getDate() && e.date.getMonth() === d.getMonth()
          );
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={i}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "linear-gradient(135deg, rgba(124, 200, 200, .25), #fff)"; }}
              onDragLeave={(e) => { e.currentTarget.style.background = isToday ? "linear-gradient(135deg, rgba(124, 200, 200, .12), #fff)" : "#fff"; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = isToday ? "linear-gradient(135deg, rgba(124, 200, 200, .12), #fff)" : "#fff";
                handleDrop(d, e.dataTransfer.getData("application/json"));
              }}
              style={{
                minHeight: 70,
                background: isToday ? "linear-gradient(135deg, rgba(124, 200, 200, .12), #fff)" : "#fff",
                border: isToday ? "1.5px solid #7CC8C8" : "1px solid #e3e9ee",
                borderRadius: 8,
                padding: 4,
                fontSize: 11,
                transition: "background 150ms",
              }}>
              <div style={{ fontWeight: 700, color: isToday ? "#185FA5" : "#5a6878", marginBottom: 2 }}>{d.getDate()}</div>
              {dayEvents.slice(0, 3).map(e => (
                <div key={e.id}
                  draggable
                  onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData("application/json", JSON.stringify(e));
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  title={e.desc + " (click pour éditer, drag pour déplacer)"}
                  style={{ fontSize: 9.5, padding: "1px 4px", borderRadius: 4, background: e.col + "22", color: e.col, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700, cursor: "pointer" }}>
                  {e.titre}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 9, color: "#8a98a8", fontWeight: 700 }}>+ {dayEvents.length - 3} autres</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ range, events, onEventClick }) {
  const days = [];
  let cur = new Date(range.start);
  while (cur <= range.end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  // 0.62.132 : drag&drop handlers WeekGrid
  async function handleDrop(targetDate, evtJson) {
    if (!evtJson || !targetDate) return;
    try {
      const evt = JSON.parse(evtJson);
      const newDate = new Date(targetDate);
      const oldDate = new Date(evt.date);
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

      const { createClient } = await import("../../lib/supabase");
      const sb = createClient();
      if (evt.id.startsWith("intv-")) {
        await sb.from("interventions").update({ date_planifiee: newDate.toISOString() }).eq("id", evt.id.replace("intv-", ""));
      } else if (evt.id.startsWith("evt-")) {
        await sb.from("planning_events").update({ date_debut: newDate.toISOString() }).eq("id", evt.id.replace("evt-", ""));
      } else if (evt.id.startsWith("tour-")) {
        await sb.from("tournees").update({ date_planifiee: newDate.toISOString() }).eq("id", evt.id.replace("tour-", ""));
      }
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.(`📅 "${evt.titre}" déplacé au ${newDate.toLocaleDateString("fr-FR")}`);
      } catch {}
      window.location.reload();
    } catch (e) {
      console.warn("[Planning Week] Drop error:", e);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, minHeight: 400 }}>
      {days.map((d, i) => {
        const dayEvents = events.filter(e => e.date.toDateString() === d.toDateString());
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div key={i}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = "linear-gradient(180deg, rgba(124, 200, 200, .25), rgba(124, 200, 200, .12))"; }}
            onDragLeave={(e) => { e.currentTarget.style.background = isToday ? "linear-gradient(180deg, rgba(124, 200, 200, .08), #fff)" : "#fff"; }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.background = isToday ? "linear-gradient(180deg, rgba(124, 200, 200, .08), #fff)" : "#fff";
              handleDrop(d, e.dataTransfer.getData("application/json"));
            }}
            style={{
              background: isToday ? "linear-gradient(180deg, rgba(124, 200, 200, .08), #fff)" : "#fff",
              border: isToday ? "1.5px solid #7CC8C8" : "1px solid #e3e9ee",
              borderRadius: 10,
              padding: 8,
              transition: "background 150ms",
            }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: isToday ? "#185FA5" : "#5a6878", marginBottom: 6 }}>
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(d.getDay() || 7) - 1]} {d.getDate()}
            </div>
            {dayEvents.length === 0 ? (
              <div style={{ fontSize: 10, color: "#cfd8e0", textAlign: "center", padding: 12 }}>—</div>
            ) : dayEvents.map(e => (
              <div key={e.id}
                draggable
                onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                onDragStart={(ev) => {
                  ev.dataTransfer.setData("application/json", JSON.stringify(e));
                  ev.dataTransfer.effectAllowed = "move";
                }}
                title={(e.desc || "") + " (click pour éditer, drag pour déplacer)"}
                style={{
                  padding: "4px 6px", marginBottom: 3,
                  background: e.col + "18", borderLeft: `3px solid ${e.col}`,
                  borderRadius: 4, fontSize: 11,
                  cursor: "pointer",
                }}>
                <div style={{ fontWeight: 700, color: e.col }}>{e.titre}</div>
                {e.desc && <div style={{ color: "#5a6878", fontSize: 10, marginTop: 1 }}>{e.desc.substring(0, 40)}…</div>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function DayList({ events, onEventClick }) {
  if (events.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#8a98a8" }}>
      <i className="ti ti-calendar-off" style={{ fontSize: 30, display: "block", marginBottom: 6 }} />
      Aucun événement ce jour
    </div>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {events.map(e => (
        <div key={e.id}
          onClick={() => onEventClick?.(e)}
          style={{
            padding: "12px 14px",
            background: "#fff", border: "1px solid #e3e9ee",
            borderLeft: `4px solid ${e.col}`, borderRadius: 10,
            display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer",
            transition: "all 200ms",
          }}
          onMouseEnter={(e2) => { e2.currentTarget.style.transform = "translateX(2px)"; e2.currentTarget.style.boxShadow = `0 4px 12px ${e.col}33`; }}
          onMouseLeave={(e2) => { e2.currentTarget.style.transform = "translateX(0)"; e2.currentTarget.style.boxShadow = "none"; }}
        >
          <div style={{ minWidth: 60, fontSize: 12, fontWeight: 700, color: e.col }}>
            {e.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>{e.titre}</div>
            {e.desc && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>{e.desc}</div>}
          </div>
          <i className="ti ti-chevron-right" style={{ color: "#cfd8e0", fontSize: 16 }} />
        </div>
      ))}
    </div>
  );
}

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function formatRange(range, view) {
  const opt = { day: "2-digit", month: "long", year: "numeric" };
  if (view === "day") return range.start.toLocaleDateString("fr-FR", opt);
  if (view === "month") return range.start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return `${range.start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${range.end.toLocaleDateString("fr-FR", opt)}`;
}

// 0.62.133 : Modal d'édition au click sur un event
function EventEditModal({ event, onClose }) {
  const [titre, setTitre] = useState(event.titre || "");
  const [desc, setDesc] = useState(event.desc || "");
  const [date, setDate] = useState(new Date(event.date).toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const { createClient } = await import("../../lib/supabase");
      const sb = createClient();
      const newDate = new Date(date).toISOString();

      if (event.id.startsWith("intv-")) {
        await sb.from("interventions").update({
          description: desc,
          date_planifiee: newDate,
        }).eq("id", event.id.replace("intv-", ""));
      } else if (event.id.startsWith("evt-")) {
        await sb.from("planning_events").update({
          titre,
          description: desc,
          date_debut: newDate,
        }).eq("id", event.id.replace("evt-", ""));
      } else if (event.id.startsWith("tour-")) {
        await sb.from("tournees").update({ date_planifiee: newDate }).eq("id", event.id.replace("tour-", ""));
      }
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.(`✓ "${titre}" mis à jour`);
      } catch {}
      onClose();
      window.location.reload();
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally { setBusy(false); }
  }

  async function del() {
    if (!confirm(`Supprimer "${titre}" ?`)) return;
    setBusy(true);
    try {
      const { createClient } = await import("../../lib/supabase");
      const sb = createClient();
      if (event.id.startsWith("evt-")) {
        await sb.from("planning_events").delete().eq("id", event.id.replace("evt-", ""));
      } else {
        alert("Suppression uniquement disponible pour les événements planning (pas DI/tournées)");
        return;
      }
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.("Événement supprimé");
      } catch {}
      onClose();
      window.location.reload();
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(20, 33, 49, .55)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      animation: "av-fade-in 200ms",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0, 0, 0, .35)",
        width: "100%", maxWidth: 500,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          background: `linear-gradient(135deg, ${event.col || "#185FA5"}, ${event.col || "#185FA5"}cc)`,
          color: "#fff",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`ti ${event.ic || "ti-calendar-event"}`} style={{ fontSize: 20 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Éditer l'événement</div>
            <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {event.type}
            </div>
          </div>
          <i className="ti ti-x" onClick={onClose} style={{ cursor: "pointer", fontSize: 20 }} />
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          <div className="fld" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>
              Titre {event.id.startsWith("intv-") || event.id.startsWith("tour-") ? "(lecture seule)" : ""}
            </label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)}
              disabled={event.id.startsWith("intv-") || event.id.startsWith("tour-")}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
          </div>

          <div className="fld" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>
              Description
            </label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
          </div>

          <div className="fld" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>
              Date et heure
            </label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
          </div>

          {event.id.startsWith("intv-") && (
            <a href="/interventions" style={{
              display: "block",
              padding: 10,
              background: "rgba(24, 95, 165, .12)",
              color: "#185FA5",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 8,
            }}>
              <i className="ti ti-external-link" /> Ouvrir l'intervention complète
            </a>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e3e9ee", background: "#fafbfc", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {event.id.startsWith("evt-") && (
            <button onClick={del} disabled={busy}
              style={{ padding: "8px 14px", background: "transparent", color: "#e35d5b", border: "1px solid #e35d5b", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, marginRight: "auto" }}>
              <i className="ti ti-trash" /> Supprimer
            </button>
          )}
          <button onClick={onClose}
            style={{ padding: "8px 14px", background: "transparent", color: "#5a6878", border: "1px solid #cfd8e0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
            Annuler
          </button>
          <button onClick={save} disabled={busy}
            style={{ padding: "8px 18px", background: "linear-gradient(135deg, #185FA5, #7CC8C8)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
            {busy ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 0.62.134 : Modal création nouvel événement dans planning_events
function EventCreateModal({ structureId, equipes, onClose }) {
  const [titre, setTitre] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("rdv");
  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [dateFin, setDateFin] = useState("");
  const [lieu, setLieu] = useState("");
  const [equipeId, setEquipeId] = useState("");
  const [toutJournee, setToutJournee] = useState(false);
  const [busy, setBusy] = useState(false);

  const typeMeta = EVENT_TYPES.find(t => t.k === type) || EVENT_TYPES.find(t => t.k === "autre");

  async function create() {
    if (!titre.trim()) { alert("Titre requis"); return; }
    setBusy(true);
    try {
      const { createClient } = await import("../../lib/supabase");
      const sb = createClient();
      const payload = {
        structure_id: structureId,
        titre: titre.trim(),
        description: desc.trim() || null,
        type,
        date_debut: new Date(dateDebut).toISOString(),
        date_fin: dateFin ? new Date(dateFin).toISOString() : null,
        lieu: lieu.trim() || null,
        equipe_id: equipeId || null,
        tout_journee: toutJournee,
        couleur: typeMeta.col,
        icone: typeMeta.ic,
      };
      const { error } = await sb.from("planning_events").insert(payload);
      if (error) throw error;
      try {
        const { toast } = await import("./ui-premium");
        toast?.success?.(`📅 "${titre}" créé`);
      } catch {}
      onClose();
      window.location.reload();
    } catch (e) {
      alert("Erreur : " + e.message);
    } finally { setBusy(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(20, 33, 49, .55)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      animation: "av-fade-in 200ms",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0, 0, 0, .35)",
        width: "100%", maxWidth: 540,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          background: `linear-gradient(135deg, ${typeMeta.col}, ${typeMeta.col}cc)`,
          color: "#fff",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`ti ${typeMeta.ic}`} style={{ fontSize: 20 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Nouvel événement</div>
            <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {typeMeta.l}
            </div>
          </div>
          <i className="ti ti-x" onClick={onClose} style={{ cursor: "pointer", fontSize: 20 }} />
        </div>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {/* Type selector chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {EVENT_TYPES.map(t => {
              const isActive = type === t.k;
              return (
                <button key={t.k} onClick={() => setType(t.k)}
                  style={{
                    padding: "5px 10px",
                    background: isActive ? t.col : "#fff",
                    color: isActive ? "#fff" : t.col,
                    border: `1.5px solid ${t.col}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    transition: "all 150ms",
                  }}>
                  <i className={`ti ${t.ic}`} /> {t.l}
                </button>
              );
            })}
          </div>

          <div className="fld" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>Titre *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Réunion équipe technique"
              autoFocus
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
          </div>

          <div className="fld" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              placeholder="Détails optionnels..."
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="fld">
              <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>Date début *</label>
              <input type="datetime-local" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div className="fld">
              <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>Date fin (optionnel)</label>
              <input type="datetime-local" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={toutJournee} onChange={(e) => setToutJournee(e.target.checked)} />
            <span style={{ fontSize: 12, color: "#5a6878" }}>Toute la journée</span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="fld">
              <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>Lieu</label>
              <input value={lieu} onChange={(e) => setLieu(e.target.value)}
                placeholder="Ex: Salle 12, Visio..."
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div className="fld">
              <label style={{ fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4, display: "block" }}>Équipe</label>
              <select value={equipeId} onChange={(e) => setEquipeId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e3e9ee", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
                <option value="">— Aucune —</option>
                {equipes.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e3e9ee", background: "#fafbfc", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 14px", background: "transparent", color: "#5a6878", border: "1px solid #cfd8e0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
            Annuler
          </button>
          <button onClick={create} disabled={busy || !titre.trim()}
            style={{ padding: "8px 18px", background: !titre.trim() ? "#cfd8e0" : `linear-gradient(135deg, ${typeMeta.col}, ${typeMeta.col}cc)`, color: "#fff", border: "none", borderRadius: 8, cursor: busy || !titre.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
            {busy ? "..." : <><i className="ti ti-plus" /> Créer</>}
          </button>
        </div>
      </div>
    </div>
  );
}
