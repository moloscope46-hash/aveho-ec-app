"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /agenda — Agenda complet avec filtres + tous événements
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../components/ui-premium";

const COLOR = "#7CC8C8";

const SOURCES = {
  rdv:          { l: "RDV",          c: "#7CC8C8", ic: "ti-calendar-event" },
  intervention: { l: "Intervention", c: "#e35d5b", ic: "ti-tools" },
  visite_inf:   { l: "Visite IDE",   c: "#C9867F", ic: "ti-stethoscope" },
  livraison:    { l: "Livraison",    c: "#185FA5", ic: "ti-truck" },
  tournee:      { l: "Tournée",      c: "#EF9F27", ic: "ti-route" },
  formation:    { l: "Formation",    c: "#5e4a8c", ic: "ti-school" },
  reunion:      { l: "Réunion",      c: "#5aa05a", ic: "ti-users" },
};

export default function AgendaPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [events, setEvents] = useState([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [view, setView] = useState("semaine");  // semaine / mois / jour / liste
  const [dateRef, setDateRef] = useState(new Date());
  const [filterSources, setFilterSources] = useState(Object.keys(SOURCES));
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) load(); }, [auth.ready, dateRef, view]);

  async function load() {
    const start = new Date(dateRef);
    const end = new Date(dateRef);
    if (view === "semaine") {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 7);
    } else if (view === "mois") {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 1);
    } else if (view === "jour") {
      end.setDate(end.getDate() + 1);
    } else {
      end.setDate(end.getDate() + 30);
    }
    
    const r = await supabase.from("v_agenda_complet").select("*")
      .eq("structure_id", auth.structureId)
      .gte("date_debut", start.toISOString())
      .lt("date_debut", end.toISOString())
      .order("date_debut")
      .limit(500);
    
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setEvents(r.data || []);
  }

  async function createRdv() {
    const payload = {
      structure_id: auth.structureId,
      etablissement_id: auth.etabId,
      type_rdv: form.type_rdv || "manuel",
      titre: form.titre,
      description: form.description,
      date_debut: form.date_debut,
      date_fin: form.date_fin || form.date_debut,
      lieu: form.lieu,
      adresse: form.adresse,
      ville: form.ville,
      patient_id: form.patient_id,
      couleur: form.couleur || COLOR,
      icone: form.icone || "ti-calendar-event",
      statut: "planifie",
      cree_par: auth.userId,
    };
    const r = await supabase.from("rendez_vous").insert(payload);
    if (r.error) { alert(r.error.message); return; }
    setModal(null); setForm({}); load();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return events.filter(e => {
      if (!filterSources.includes(e.source)) return false;
      if (s && !((e.titre || "") + " " + (e.description || "")).toLowerCase().includes(s)) return false;
      return true;
    });
  }, [events, filterSources, search]);

  // Stats
  const stats = useMemo(() => {
    return Object.keys(SOURCES).reduce((acc, src) => {
      acc[src] = events.filter(e => e.source === src).length;
      return acc;
    }, {});
  }, [events]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-calendar" title="Agenda" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Tables manquantes">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-agenda-tournees-pharmacie.sql</strong> dans Supabase.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-calendar"
        title="Agenda"
        subtitle="Tous les événements de l'établissement"
        badge={`${filtered.length} événements`}
        actions={
          <button onClick={() => { setForm({ date_debut: new Date().toISOString().substring(0, 16), type_rdv: "manuel" }); setModal("new"); }} style={{
            padding: "10px 18px", borderRadius: 10,
            background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`,
            color: "#fff", border: "none",
            fontFamily: "Quicksand", fontWeight: 700, fontSize: 13,
            cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50`,
          }}>
            <i className="ti ti-plus" /> Nouveau RDV
          </button>
        }
      >
        {/* Toolbar */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {["jour", "semaine", "mois", "liste"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "6px 12px", borderRadius: 8,
                  background: view === v ? COLOR : "rgba(255,255,255,.06)",
                  color: "#fff", border: "1px solid " + (view === v ? COLOR : "rgba(255,255,255,.10)"),
                  fontFamily: "Quicksand", fontWeight: 700, fontSize: 11, cursor: "pointer",
                  textTransform: "uppercase",
                }}>{v}</button>
              ))}
            </div>
            <button onClick={() => { const d = new Date(dateRef); d.setDate(d.getDate() - (view==="mois"?30:view==="semaine"?7:1)); setDateRef(d); }} style={navBtn}>
              <i className="ti ti-chevron-left" />
            </button>
            <button onClick={() => setDateRef(new Date())} style={{ ...navBtn, width: "auto", padding: "6px 14px" }}>Aujourd'hui</button>
            <button onClick={() => { const d = new Date(dateRef); d.setDate(d.getDate() + (view==="mois"?30:view==="semaine"?7:1)); setDateRef(d); }} style={navBtn}>
              <i className="ti ti-chevron-right" />
            </button>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, padding: "0 10px" }}>
              {dateRef.toLocaleDateString("fr-FR", { year: "numeric", month: "long", ...(view === "jour" ? { day: "numeric" } : {}) })}
            </div>
            <input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13 }} />
          </div>

          {/* Filtres sources */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {Object.entries(SOURCES).map(([k, v]) => {
              const active = filterSources.includes(k);
              return (
                <button key={k} onClick={() => setFilterSources(s => active ? s.filter(x => x !== k) : [...s, k])} style={{
                  padding: "5px 10px", borderRadius: 16,
                  background: active ? `${v.c}25` : "rgba(255,255,255,.04)",
                  color: active ? v.c : "rgba(255,255,255,.4)",
                  border: `1px solid ${active ? v.c + "50" : "rgba(255,255,255,.08)"}`,
                  fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <i className={`ti ${v.ic}`} /> {v.l} ({stats[k] || 0})
                </button>
              );
            })}
          </div>
        </ModernCard>

        {/* Liste événements */}
        {filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucun événement">
            <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Pas d'événement dans cette période.</p>
          </ModernCard>
        ) : view === "liste" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(e => <EventRow key={`${e.source}-${e.event_id}`} e={e} />)}
          </div>
        ) : (
          // Vue par jour
          <DaysView events={filtered} dateRef={dateRef} view={view} />
        )}

        {/* MODAL Nouveau RDV */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-calendar-plus"
          title="Nouveau rendez-vous"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={createRdv} disabled={!form.titre || !form.date_debut}>Créer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Titre *" full><input value={form.titre || ""} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></Field>
            <Field label="Type">
              <select value={form.type_rdv || "manuel"} onChange={(e) => setForm({ ...form, type_rdv: e.target.value })}>
                <option value="manuel">Manuel</option>
                <option value="visite_patient">Visite patient</option>
                <option value="visite_inf">Visite IDE</option>
                <option value="livraison">Livraison</option>
                <option value="reunion">Réunion</option>
                <option value="formation">Formation</option>
              </select>
            </Field>
            <Field label="Couleur">
              <input type="color" value={form.couleur || COLOR} onChange={(e) => setForm({ ...form, couleur: e.target.value })} style={{ height: 40 }} />
            </Field>
            <Field label="Début *"><input type="datetime-local" value={form.date_debut || ""} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></Field>
            <Field label="Fin"><input type="datetime-local" value={form.date_fin || ""} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></Field>
            <Field label="Lieu" full><input value={form.lieu || ""} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></Field>
            <Field label="Description" full><textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
          </div>
        </ModernModal>
      </PageShell>
    </>
  );
}

const navBtn = { width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.08)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 };

function EventRow({ e }) {
  const cfg = SOURCES[e.source] || SOURCES.rdv;
  return (
    <ModernCard color={e.couleur || cfg.c} variant="default" padding={12}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
        <HiTechIconBox name={e.icone || cfg.ic} color={e.couleur || cfg.c} variant="gradient" size={36} />
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{e.titre}</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>
            <i className="ti ti-clock" /> {new Date(e.date_debut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            {e.lieu && <> · <i className="ti ti-map-pin" /> {e.lieu}</>}
          </div>
        </div>
        <span style={{ background: `${cfg.c}30`, color: cfg.c, padding: "3px 10px", borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{cfg.l}</span>
      </div>
    </ModernCard>
  );
}

function DaysView({ events, dateRef, view }) {
  const days = [];
  const start = new Date(dateRef);
  const nbDays = view === "jour" ? 1 : view === "semaine" ? 7 : 30;
  if (view === "semaine") start.setDate(start.getDate() - start.getDay());
  if (view === "mois") start.setDate(1);

  for (let i = 0; i < nbDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dStr = d.toISOString().substring(0, 10);
    const dayEvents = events.filter(e => e.date_debut?.substring(0, 10) === dStr);
    days.push({ date: d, events: dayEvents });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: view === "jour" ? "1fr" : view === "semaine" ? "repeat(7, 1fr)" : "repeat(7, 1fr)", gap: 6 }}>
      {days.map((day, i) => (
        <div key={i} style={{
          minHeight: 100,
          padding: 8,
          background: day.events.length > 0 ? "rgba(124,200,200,.08)" : "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 8,
        }}>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, fontWeight: 700, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <span>{day.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</span>
            {day.events.length > 0 && <span style={{ background: "#7CC8C825", color: "#7CC8C8", padding: "1px 6px", borderRadius: 6 }}>{day.events.length}</span>}
          </div>
          {day.events.slice(0, 4).map(e => {
            const cfg = SOURCES[e.source] || SOURCES.rdv;
            return (
              <div key={`${e.source}-${e.event_id}`} style={{
                padding: "3px 6px", marginBottom: 3,
                background: `${e.couleur || cfg.c}20`, color: e.couleur || cfg.c,
                border: `1px solid ${e.couleur || cfg.c}40`,
                borderRadius: 4, fontSize: 10, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }} title={e.titre}>
                <i className={`ti ${e.icone || cfg.ic}`} /> {e.titre?.substring(0, 30)}
              </div>
            );
          })}
          {day.events.length > 4 && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9 }}>+{day.events.length - 4}</div>}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
