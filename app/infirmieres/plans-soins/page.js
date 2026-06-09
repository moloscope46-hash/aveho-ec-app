"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /infirmieres/plans-soins — Plans de soins IDE
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#7a6fb0";

const STATUTS = {
  brouillon: { c: "#888",    l: "Brouillon",  ic: "ti-edit" },
  actif:     { c: "#5aa05a", l: "Actif",      ic: "ti-check" },
  suspendu:  { c: "#EF9F27", l: "Suspendu",   ic: "ti-pause" },
  termine:   { c: "#7CC8C8", l: "Terminé",    ic: "ti-flag-check" },
  annule:    { c: "#D45E5E", l: "Annulé",     ic: "ti-x" },
};

const TYPES_PLAN = {
  standard:    { l: "Standard",      c: "#7a6fb0" },
  palliatif:   { l: "Palliatif",     c: "#5e4a8c" },
  post_op:     { l: "Post-opératoire",c: "#185FA5" },
  chronique:   { l: "Chronique",     c: "#EF9F27" },
  aigu:        { l: "Aigu",          c: "#D45E5E" },
  dependance:  { l: "Dépendance",    c: "#C9867F" },
};

const GIR_LIBELLES = {
  1: "GIR 1 (très dépendant)", 2: "GIR 2", 3: "GIR 3",
  4: "GIR 4", 5: "GIR 5", 6: "GIR 6 (autonome)",
};

export default function PlansSoinsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [infirmieres, setInfirmieres] = useState([]);
  const [search, setSearch] = useState("");
  const [fStatut, setFStatut] = useState("");
  const [fType, setFType] = useState("");
  const [tableMissing, setTableMissing] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    const r = await supabase.from("plans_soins").select("*").eq("structure_id", auth.structureId).order("date_debut", { ascending: false });
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setPlans(r.data || []);

    const [pa, i] = await Promise.all([
      supabase.from("patients").select("id, nom, prenom").eq("structure_id", auth.structureId).order("nom"),
      supabase.from("infirmieres").select("id, nom, prenom, type_infirmiere").eq("structure_id", auth.structureId),
    ]);
    setPatients(pa.data || []);
    setInfirmieres(i.data || []);
  }

  async function savePlan() {
    const payload = {
      structure_id: auth.structureId,
      patient_id: form.patient_id,
      infirmiere_referente_id: form.infirmiere_referente_id,
      prescripteur_nom: form.prescripteur_nom,
      prescripteur_rpps: form.prescripteur_rpps,
      numero: form.numero || `PS-${Date.now()}`,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      duree_jours: form.duree_jours ? parseInt(form.duree_jours) : null,
      type_plan: form.type_plan || "standard",
      niveau_dependance: form.niveau_dependance,
      diagnostic_ide: form.diagnostic_ide,
      objectifs_soins: form.objectifs_soins,
      notes_medicales: form.notes_medicales,
      notes_ide: form.notes_ide,
      statut: form.statut || "actif",
    };
    if (form.id) await supabase.from("plans_soins").update(payload).eq("id", form.id);
    else await supabase.from("plans_soins").insert(payload);
    setModal(null); setForm({}); reload();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return plans.filter(p => {
      if (s && !(`${p.numero || ""} ${p.diagnostic_ide || ""}`).toLowerCase().includes(s)) return false;
      if (fStatut && p.statut !== fStatut) return false;
      if (fType && p.type_plan !== fType) return false;
      return true;
    });
  }, [plans, search, fStatut, fType]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-clipboard-list" title="Plans de soins" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Table manquante">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-infirmieres-erp.sql</strong>.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  return (
    <PermissionGate require="plan_soins_lire">
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-clipboard-list"
        title="Plans de soins"
        subtitle="Suivi des prises en charge infirmières"
        badge={`${plans.length} plans`}
        actions={
          <button onClick={() => { setForm({ date_debut: new Date().toISOString().substring(0, 10), type_plan: "standard", statut: "actif" }); setModal("new"); }}
            style={btnPrim}>
            <i className="ti ti-plus" /> Nouveau plan
          </button>
        }
      >
        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="N° plan, diagnostic..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={inp} />
            <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} style={inp}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            <select value={fType} onChange={(e) => setFType(e.target.value)} style={inp}>
              <option value="">Tous types</option>
              {Object.entries(TYPES_PLAN).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </ModernCard>

        {/* Cards plans */}
        {filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucun plan">
            <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée un premier plan de soins.</p>
          </ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
            {filtered.map(p => {
              const sCfg = STATUTS[p.statut] || STATUTS.actif;
              const tCfg = TYPES_PLAN[p.type_plan] || TYPES_PLAN.standard;
              const patient = patients.find(x => x.id === p.patient_id);
              const inf = infirmieres.find(x => x.id === p.infirmiere_referente_id);
              return (
                <ModernCard key={p.id} color={tCfg.c} variant="default" padding={0} hoverable
                  onClick={() => { setForm(p); setModal("new"); }}>
                  <div style={{ padding: "12px 14px", background: `linear-gradient(135deg, ${tCfg.c}20, ${tCfg.c}05)`, borderBottom: `1px solid ${tCfg.c}30`, display: "flex", alignItems: "center", gap: 10 }}>
                    <HiTechIconBox name="ti-clipboard-list" color={tCfg.c} variant="gradient" size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{p.numero}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>{tCfg.l} · {patient?.nom} {patient?.prenom}</div>
                    </div>
                    <span style={{ background: `${sCfg.c}30`, color: sCfg.c, border: `1px solid ${sCfg.c}60`, padding: "3px 9px", borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                      <i className={`ti ${sCfg.ic}`} /> {sCfg.l}
                    </span>
                  </div>
                  <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                    <Detail l="IDE référente" v={inf ? `${inf.nom} ${inf.prenom}` : "—"} />
                    <Detail l="Prescripteur" v={p.prescripteur_nom || "—"} />
                    <Detail l="Du" v={p.date_debut ? new Date(p.date_debut).toLocaleDateString("fr-FR") : "—"} />
                    <Detail l="Au" v={p.date_fin ? new Date(p.date_fin).toLocaleDateString("fr-FR") : "—"} />
                    {p.niveau_dependance && <Detail l="Dépendance" v={p.niveau_dependance} full />}
                    {p.diagnostic_ide && <Detail l="Dx IDE" v={p.diagnostic_ide.substring(0, 80)} full />}
                  </div>
                  <div style={{ padding: "10px 14px", borderTop: `1px solid ${tCfg.c}20`, display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                    <span><i className="ti ti-calendar-check" /> {p.nb_visites_realisees || 0} réalisées</span>
                    <span style={{ flex: 1 }}><i className="ti ti-calendar" /> {p.nb_visites_planifiees || 0} planifiées</span>
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL création/édition */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-clipboard-list"
          title={form.id ? "Modifier plan de soins" : "Nouveau plan de soins"}
          size="lg"
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={savePlan} disabled={!form.patient_id || !form.date_debut}>
                Enregistrer
              </ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="N° plan"><input value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="PS-2026-..." /></Field>
            <Field label="Type">
              <select value={form.type_plan || "standard"} onChange={(e) => setForm({ ...form, type_plan: e.target.value })}>
                {Object.entries(TYPES_PLAN).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </Field>
            <Field label="Patient *" full>
              <select value={form.patient_id || ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
              </select>
            </Field>
            <Field label="IDE référente">
              <select value={form.infirmiere_referente_id || ""} onChange={(e) => setForm({ ...form, infirmiere_referente_id: e.target.value })}>
                <option value="">—</option>
                {infirmieres.map(i => <option key={i.id} value={i.id}>{i.nom} {i.prenom} ({i.type_infirmiere})</option>)}
              </select>
            </Field>
            <Field label="Niveau dépendance">
              <select value={form.niveau_dependance || ""} onChange={(e) => setForm({ ...form, niveau_dependance: e.target.value })}>
                <option value="">—</option>
                {Object.entries(GIR_LIBELLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Prescripteur"><input value={form.prescripteur_nom || ""} onChange={(e) => setForm({ ...form, prescripteur_nom: e.target.value })} /></Field>
            <Field label="RPPS prescripteur"><input value={form.prescripteur_rpps || ""} onChange={(e) => setForm({ ...form, prescripteur_rpps: e.target.value })} /></Field>
            <Field label="Date début *"><input type="date" value={form.date_debut || ""} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></Field>
            <Field label="Date fin"><input type="date" value={form.date_fin || ""} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></Field>
            <Field label="Diagnostic IDE principal" full>
              <textarea value={form.diagnostic_ide || ""} onChange={(e) => setForm({ ...form, diagnostic_ide: e.target.value })} rows={2} />
            </Field>
            <Field label="Objectifs de soins" full>
              <textarea value={form.objectifs_soins || ""} onChange={(e) => setForm({ ...form, objectifs_soins: e.target.value })} rows={2} />
            </Field>
            <Field label="Statut">
              <select value={form.statut || "actif"} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </Field>
          </div>
        </ModernModal>
      </PageShell>
    </PermissionGate>
  );
}

const btnPrim = { padding: "10px 18px", borderRadius: 10, background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`, color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50` };
const inp = { padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13, minWidth: 180 };

function Detail({ l, v, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>{l}</div>
      <div style={{ color: "#fff" }}>{v}</div>
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
