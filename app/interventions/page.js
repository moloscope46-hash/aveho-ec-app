"use client";
// =============================================================
//  /interventions — Demandes d'intervention (0.58.80)
//  Refonte ultra-pro avec :
//   - Hero stats par statut (5 tuiles cliquables)
//   - Toggle Liste / Kanban
//   - Filtres urgence/équipe/dépôt/statut
//   - Workflow scan : DI pré-remplie depuis ?depot=X ou ?materiel=X
//   - Cards visuelles, actions rapides selon statut
// =============================================================

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import { EmptyState, SkeletonRow, toast, NeonButton } from "../components/ui-premium";
import { fmtDate } from "../../lib/format";
import { safeInsert, safeUpdate } from "../../lib/safeWrite";
import BackButton from "../components/BackButton";

const STATUTS = [
  { value: "Nouvelle",  color: "#e35d5b", icon: "ti-alert-circle",   bg: "rgba(227,93,91,.10)",   order: 0 },
  { value: "Planifiée", color: "#EF9F27", icon: "ti-calendar-clock", bg: "rgba(239,159,39,.10)",  order: 1 },
  { value: "En cours",  color: "#185FA5", icon: "ti-progress-bolt",  bg: "rgba(24,95,165,.10)",   order: 2 },
  { value: "Résolue",   color: "#5aa05a", icon: "ti-check",          bg: "rgba(90,160,90,.10)",   order: 3 },
  { value: "Clôturée",  color: "#8a98a8", icon: "ti-archive",        bg: "rgba(138,152,168,.10)", order: 4 },
];

const URGENCES = [
  { value: "Normal",   color: "#5a6878", icon: "ti-circle",         bg: "rgba(90,104,120,.10)" },
  { value: "Urgent",   color: "#EF9F27", icon: "ti-alert-triangle", bg: "rgba(239,159,39,.15)" },
  { value: "Critique", color: "#c0392b", icon: "ti-urgent",         bg: "rgba(192,57,43,.18)"  },
];

const TYPES_DI = [
  { value: "Panne / réparation",        icon: "ti-tools",         color: "#e35d5b" },
  { value: "Maintenance préventive",    icon: "ti-shield-check",  color: "#5aa05a" },
  { value: "Nettoyage / désinfection",  icon: "ti-spray",         color: "#7CC8C8" },
  { value: "Remplacement / changement", icon: "ti-replace",       color: "#7a6fb0" },
  { value: "Vérification / contrôle",   icon: "ti-checklist",     color: "#185FA5" },
  { value: "Autre",                      icon: "ti-question-mark", color: "#8a98a8" },
];

function statutMeta(s) { return STATUTS.find(x => x.value === s) || STATUTS[0]; }
function urgenceMeta(u) { return URGENCES.find(x => x.value === u) || URGENCES[0]; }
function typeMeta(t) { return TYPES_DI.find(x => x.value === t) || TYPES_DI[5]; }

export default function InterventionsPage() {
  return (
    <Suspense fallback={<div className="bg-dark"><div className="wrap"><Panel>Chargement...</Panel></div></div>}>
      <InterventionsInner />
    </Suspense>
  );
}

function InterventionsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [rows, setRows] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [depots, setDepots] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState("liste");
  const [fStatut, setFStatut] = useState("");
  const [fUrgence, setFUrgence] = useState("");
  const [fEquipe, setFEquipe] = useState("");
  const [fDepot, setFDepot] = useState("");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    const depotId = searchParams.get("depot");
    const materielId = searchParams.get("materiel");
    const newFlag = searchParams.get("new");
    if (depotId || materielId || newFlag) {
      openNew({ depot_id: depotId || null, materiel_id: materielId || null, cree_par_scan: !!(depotId || materielId) });
    }
  }, [auth.ready, searchParams]);

  async function loadAll() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    const tryFetch = async (q) => {
      try { const r = await q; return r.data || []; }
      catch (e) {
        if (e.code === "42P01" || e.code === "42703") return [];
        throw e;
      }
    };
    try {
      let q = supabase.from("interventions")
        .select("*, materiels(libelle, num_serie), depots(nom, couleur), equipes(nom)")
        .eq("structure_id", auth.structureId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
      const [r, e, d, m] = await Promise.all([
        tryFetch(q),
        tryFetch(supabase.from("equipes").select("id, nom, couleur").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("depots").select("id, nom, couleur").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("materiels").select("id, libelle, num_serie").eq("structure_id", auth.structureId).limit(500)),
      ]);
      setRows(r); setEquipes(e); setDepots(d); setMateriels(m);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, [auth.ready, auth.structureId, auth.etabId]);

  const stats = useMemo(() => {
    const s = { total: rows.length };
    STATUTS.forEach(st => { s[st.value] = rows.filter(r => r.statut === st.value).length; });
    s.urgentes = rows.filter(r => r.urgence === "Urgent" || r.urgence === "Critique").length;
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (fStatut && r.statut !== fStatut) return false;
      if (fUrgence && r.urgence !== fUrgence) return false;
      if (fEquipe && r.equipe_id !== fEquipe) return false;
      if (fDepot && r.depot_id !== fDepot) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.numero || ""} ${r.type || ""} ${r.description || ""} ${r.materiels?.libelle || ""} ${r.depots?.nom || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, fStatut, fUrgence, fEquipe, fDepot, search]);

  function nextNumero() {
    const year = new Date().getFullYear();
    const maxNum = rows.reduce((max, r) => {
      const m = (r.numero || "").match(new RegExp(`DI-${year}-(\\d+)`));
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `DI-${year}-${String(maxNum + 1).padStart(3, "0")}`;
  }

  function openNew(preset = {}) {
    setForm({
      numero: nextNumero(),
      type: "Panne / réparation",
      urgence: "Normal",
      statut: "Nouvelle",
      ...preset,
    });
    setModal({ mode: "new" });
  }

  function openEdit(r) {
    setForm({ ...r });
    setModal({ mode: "edit", id: r.id });
  }

  async function save() {
    if (!form.description?.trim()) { toast.error("Description obligatoire"); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        numero: form.numero,
        type: form.type || "Autre",
        urgence: form.urgence || "Normal",
        statut: form.statut || "Nouvelle",
        description: form.description.trim(),
        emplacement: form.emplacement || null,
        materiel_id: form.materiel_id || null,
        depot_id: form.depot_id || null,
        equipe_id: form.equipe_id || null,
        assigne_a: form.assigne_a || null,
        cree_par_scan: !!form.cree_par_scan,
        resolution: form.resolution || null,
        duree_estimee_min: form.duree_estimee_min ? parseInt(form.duree_estimee_min, 10) : null,
      };
      const userId = auth.user?.id;
      if (modal?.id) {
        const { error } = await safeUpdate(supabase, "interventions", payload, { id: modal.id }, { userId });
        if (error) throw error;
        toast.success(`${form.numero} mis à jour`);
      } else {
        payload.created_by = auth.user?.id;
        const { error } = await safeInsert(supabase, "interventions", payload, { userId });
        if (error) throw error;
        toast.success(`DI ${form.numero} créée`);
      }
      setModal(null);
      await loadAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatut(r, newStatut) {
    try {
      const updates = { statut: newStatut };
      const now = new Date().toISOString();
      if (newStatut === "Planifiée" && !r.date_assignation) updates.date_assignation = now;
      if (newStatut === "En cours" && !r.date_demarrage) updates.date_demarrage = now;
      if (newStatut === "Résolue" && !r.date_resolution) updates.date_resolution = now;
      if (newStatut === "Clôturée") { updates.date_cloture = now; updates.cloture_par = auth.user?.id; }
      const { error } = await safeUpdate(supabase, "interventions", updates, { id: r.id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success(`${r.numero} → ${newStatut}`);
      await loadAll();
    } catch (e) { toast.error(e.message); }
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <BackButton />
        <PageHead
          eyebrow="MAINTENANCE · DEMANDES D'INTERVENTION"
          icon="ti-tools"
          title="Demandes d'intervention"
          accent={`${stats.total} DI · ${stats.urgentes} urgentes`}
          sub="Workflow scan-driven · Pré-remplissage depuis QR dépôt/matériel · Vue Liste ou Kanban"
        />

        {/* Hero stats — 5 tuiles cliquables par statut */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
          {STATUTS.map(s => {
            const count = stats[s.value] || 0;
            const active = fStatut === s.value;
            return (
              <button key={s.value} onClick={() => setFStatut(active ? "" : s.value)} style={{
                padding: "14px 16px",
                border: `2px solid ${active ? s.color : "#e3e9ee"}`,
                background: active ? s.bg : "#fff",
                borderLeft: `4px solid ${s.color}`,
                borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all .15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
                  <span style={{ fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{s.value}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "Consolas, monospace" }}>{count}</div>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <Panel style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="🔍 Recherche (numéro, description, matériel, dépôt…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
            />
            <select value={fUrgence} onChange={(e) => setFUrgence(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
              <option value="">Urgences</option>
              {URGENCES.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
            </select>
            {equipes.length > 0 && (
              <select value={fEquipe} onChange={(e) => setFEquipe(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
                <option value="">Toutes équipes</option>
                {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
              </select>
            )}
            {depots.length > 0 && (
              <select value={fDepot} onChange={(e) => setFDepot(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
                <option value="">Tous dépôts</option>
                {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            )}
            {(fStatut || fUrgence || fEquipe || fDepot || search) && (
              <Btn variant="ghost" icon="ti-x" onClick={() => { setFStatut(""); setFUrgence(""); setFEquipe(""); setFDepot(""); setSearch(""); }}>Reset</Btn>
            )}
            <div style={{ display: "inline-flex", border: "1px solid #e3e9ee", borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => setView("liste")} style={{ background: view === "liste" ? "#142131" : "#fff", color: view === "liste" ? "#fff" : "#5a6878", border: "none", padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
                <i className="ti ti-list" /> Liste
              </button>
              <button onClick={() => setView("kanban")} style={{ background: view === "kanban" ? "#142131" : "#fff", color: view === "kanban" ? "#fff" : "#5a6878", border: "none", padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
                <i className="ti ti-layout-kanban" /> Kanban
              </button>
            </div>
            <NeonButton variant="teal" icon="ti-plus" onClick={() => openNew()}>Nouvelle DI</NeonButton>
          </div>
        </Panel>

        {loading ? (
          <Panel><SkeletonRow count={6} /></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration="folder"
            variant="terra"
            title={rows.length === 0 ? "Aucune DI" : "Aucun résultat"}
            message={rows.length === 0 ? "Crée ta première demande d'intervention, ou scanne le QR d'un dépôt pour démarrer." : "Élargis tes filtres."}
            actionLabel={rows.length === 0 ? "Créer la 1ère DI" : null}
            onAction={rows.length === 0 ? () => openNew() : null}
          />
        ) : view === "kanban" ? (
          <KanbanView filtered={filtered} onCardClick={openEdit} />
        ) : (
          <ListeView filtered={filtered} onClick={openEdit} onChangeStatut={changeStatut} />
        )}

        {/* Modal create/edit */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="materiel"
            title={modal.mode === "new" ? "Nouvelle demande d'intervention" : `Édition · ${form.numero}`}
            footer={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
              </>
            }>
            {form.cree_par_scan && (
              <div style={{ padding: "8px 12px", background: "rgba(124,200,200,.12)", borderLeft: "3px solid #7CC8C8", borderRadius: 6, fontSize: 12, color: "#1c5454", marginBottom: 12 }}>
                <i className="ti ti-scan" /> <b>DI créée depuis le scan d'un QR</b> · Les rattachements sont pré-remplis automatiquement
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Numéro</label>
                <input value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} style={{ fontFamily: "Consolas, monospace", fontWeight: 700 }} />
              </div>
              <div className="fld">
                <label>Type</label>
                <select value={form.type || "Panne / réparation"} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES_DI.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                </select>
              </div>
            </div>

            <div className="fld" style={{ marginTop: 8 }}>
              <label>Description du problème *</label>
              <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                placeholder="Décris précisément le problème observé, les conditions, les symptômes…" />
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#e35d5b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #ffd5d2", paddingBottom: 4 }}>
              <i className="ti ti-flame" /> Urgence
            </h4>
            <div style={{ display: "flex", gap: 6 }}>
              {URGENCES.map(u => (
                <button key={u.value} type="button" onClick={() => setForm({ ...form, urgence: u.value })}
                  style={{
                    flex: 1, background: form.urgence === u.value ? u.color : "#fff",
                    color: form.urgence === u.value ? "#fff" : u.color,
                    border: `1px solid ${u.color}`,
                    padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                  <i className={`ti ${u.icon}`} /> {u.value}
                </button>
              ))}
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#185FA5", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #cfe1f5", paddingBottom: 4 }}>
              <i className="ti ti-map-pin" /> Rattachements
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Dépôt concerné</label>
                <select value={form.depot_id || ""} onChange={(e) => setForm({ ...form, depot_id: e.target.value || null })}>
                  <option value="">— Aucun —</option>
                  {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Matériel concerné</label>
                <select value={form.materiel_id || ""} onChange={(e) => setForm({ ...form, materiel_id: e.target.value || null })}>
                  <option value="">— Aucun —</option>
                  {materiels.slice(0, 200).map(m => <option key={m.id} value={m.id}>{m.libelle}{m.num_serie ? ` (${m.num_serie})` : ""}</option>)}
                </select>
              </div>
              <div className="fld" style={{ gridColumn: "span 2" }}>
                <label>Emplacement précis (texte libre)</label>
                <input value={form.emplacement || ""} onChange={(e) => setForm({ ...form, emplacement: e.target.value })} placeholder="Ex: Étagère 3, casier B / Chambre 204, derrière le lit…" />
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#5aa05a", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #d5ecd5", paddingBottom: 4 }}>
              <i className="ti ti-users" /> Assignation
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Équipe</label>
                <select value={form.equipe_id || ""} onChange={(e) => setForm({ ...form, equipe_id: e.target.value || null })}>
                  <option value="">— Non assigné —</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Durée estimée (min)</label>
                <input type="number" min="0" step="15" value={form.duree_estimee_min || ""} onChange={(e) => setForm({ ...form, duree_estimee_min: e.target.value })} placeholder="30" />
              </div>
            </div>

            {modal.mode === "edit" && (
              <>
                <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e3e9ee", paddingBottom: 4 }}>
                  <i className="ti ti-progress-check" /> Statut & résolution
                </h4>
                <select value={form.statut || "Nouvelle"} onChange={(e) => setForm({ ...form, statut: e.target.value })} style={{ width: "100%", padding: 8, fontSize: 13, fontFamily: "inherit", border: "1px solid #e3e9ee", borderRadius: 6 }}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                </select>
                {(form.statut === "Résolue" || form.statut === "Clôturée") && (
                  <div className="fld" style={{ marginTop: 10 }}>
                    <label>Résolution / Compte-rendu</label>
                    <textarea value={form.resolution || ""} onChange={(e) => setForm({ ...form, resolution: e.target.value })} rows={2}
                      placeholder="Décris ce qui a été fait, pièces changées, temps passé…" />
                  </div>
                )}
              </>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Vue Liste
// ============================================================
function ListeView({ filtered, onClick, onChangeStatut }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {filtered.map(r => {
        const st = statutMeta(r.statut);
        const ur = urgenceMeta(r.urgence);
        const ty = typeMeta(r.type);
        return (
          <div key={r.id} style={{
            background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12,
            borderLeft: `4px solid ${st.color}`,
            padding: "14px 18px", transition: "all .15s", cursor: "pointer",
          }}
          onClick={() => onClick(r)}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 16px ${st.color}22`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${ty.color}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${ty.icon}`} style={{ color: ty.color, fontSize: 22 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontFamily: "Consolas, monospace", fontWeight: 700, color: "#142131", fontSize: 13 }}>{r.numero}</span>
                  <span style={{ background: st.bg, color: st.color, padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, border: `1px solid ${st.color}44`, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <i className={`ti ${st.icon}`} /> {st.value}
                  </span>
                  {r.urgence !== "Normal" && (
                    <span style={{ background: ur.bg, color: ur.color, padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, border: `1px solid ${ur.color}44`, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <i className={`ti ${ur.icon}`} /> {r.urgence}
                    </span>
                  )}
                  {r.cree_par_scan && <span style={{ background: "rgba(124,200,200,.18)", color: "#1c5454", padding: "2px 7px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}><i className="ti ti-scan" /> SCAN</span>}
                  <span style={{ fontSize: 11.5, color: "#8a98a8" }}>{r.type}</span>
                </div>
                <div style={{ fontSize: 13.5, color: "#142131", marginBottom: 6, lineHeight: 1.4 }}>{r.description}</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "#5a6878" }}>
                  {r.materiels?.libelle && <span><i className="ti ti-package" style={{ color: "#185FA5" }} /> {r.materiels.libelle}{r.materiels.num_serie ? ` (${r.materiels.num_serie})` : ""}</span>}
                  {r.depots?.nom && <span style={{ color: r.depots.couleur || "#7CC8C8" }}><i className="ti ti-building-warehouse" /> {r.depots.nom}</span>}
                  {r.equipes?.nom && <span><i className="ti ti-users" style={{ color: "#5aa05a" }} /> {r.equipes.nom}</span>}
                  {r.emplacement && <span style={{ color: "#7a6fb0", fontWeight: 600 }}><i className="ti ti-map-pin" /> {r.emplacement}</span>}
                  <span style={{ marginLeft: "auto", color: "#8a98a8" }}><i className="ti ti-clock" /> {fmtDate(r.created_at)}</span>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                {r.statut === "Nouvelle" && (
                  <Btn variant="ghost" icon="ti-calendar-plus" onClick={() => onChangeStatut(r, "Planifiée")} style={{ fontSize: 11 }}>Planifier</Btn>
                )}
                {r.statut === "Planifiée" && (
                  <Btn variant="ghost" icon="ti-player-play" onClick={() => onChangeStatut(r, "En cours")} style={{ fontSize: 11 }}>Démarrer</Btn>
                )}
                {r.statut === "En cours" && (
                  <Btn variant="ghost" icon="ti-check" onClick={() => onChangeStatut(r, "Résolue")} style={{ fontSize: 11 }}>Résolue</Btn>
                )}
                {r.statut === "Résolue" && (
                  <Btn variant="ghost" icon="ti-archive" onClick={() => onChangeStatut(r, "Clôturée")} style={{ fontSize: 11 }}>Clôturer</Btn>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Vue Kanban
// ============================================================
function KanbanView({ filtered, onCardClick }) {
  const byStatut = useMemo(() => {
    const map = {};
    STATUTS.forEach(s => map[s.value] = []);
    filtered.forEach(r => {
      if (map[r.statut]) map[r.statut].push(r);
    });
    return map;
  }, [filtered]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUTS.length}, 1fr)`, gap: 10, overflowX: "auto" }}>
      {STATUTS.map(st => {
        const cards = byStatut[st.value] || [];
        return (
          <div key={st.value} style={{
            minWidth: 220, background: st.bg, borderRadius: 12, padding: 10,
            borderTop: `3px solid ${st.color}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className={`ti ${st.icon}`} style={{ color: st.color, fontSize: 14 }} />
                <span style={{ fontSize: 11.5, color: st.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{st.value}</span>
              </div>
              <span style={{ background: "#fff", color: st.color, fontFamily: "Consolas, monospace", fontWeight: 700, padding: "1px 8px", borderRadius: 10, fontSize: 11, border: `1px solid ${st.color}33` }}>{cards.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "70vh", overflowY: "auto" }}>
              {cards.map(r => {
                const ur = urgenceMeta(r.urgence);
                const ty = typeMeta(r.type);
                return (
                  <div key={r.id} onClick={() => onCardClick(r)} style={{
                    background: "#fff", border: `1px solid ${ty.color}22`, borderRadius: 8,
                    padding: "8px 10px", cursor: "pointer", transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 10px ${ty.color}33`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <i className={`ti ${ty.icon}`} style={{ color: ty.color, fontSize: 13 }} />
                      <span style={{ fontFamily: "Consolas, monospace", fontWeight: 700, fontSize: 10.5, color: "#142131" }}>{r.numero}</span>
                      {r.urgence !== "Normal" && <span style={{ marginLeft: "auto", background: ur.bg, color: ur.color, padding: "0 5px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{r.urgence.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#142131", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.description}</div>
                    {(r.materiels?.libelle || r.depots?.nom) && (
                      <div style={{ marginTop: 4, fontSize: 10, color: "#5a6878", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {r.materiels?.libelle && <span><i className="ti ti-package" /> {r.materiels.libelle.slice(0, 20)}</span>}
                        {r.depots?.nom && <span style={{ color: r.depots.couleur || "#7CC8C8" }}>● {r.depots.nom}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {cards.length === 0 && <div style={{ textAlign: "center", color: "#8a98a8", fontSize: 11, padding: 20, fontStyle: "italic" }}>Aucune</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
