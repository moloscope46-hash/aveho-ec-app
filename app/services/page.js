"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /services — Gestion services + collaborateurs
//  Rattachement bâtiment + chef + équipe
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { PageShell, ModernCard, ModernModal, ModalBtn, HiTechIconBox } from "../components/ui-premium";

const COLOR = "#7CC8C8";

const TYPES_SERVICE = {
  soins:          { l: "Soins infirmiers",  c: "#C9867F", ic: "ti-stethoscope" },
  medical:        { l: "Médecine",          c: "#185FA5", ic: "ti-medical-cross" },
  pharmacie:      { l: "Pharmacie",         c: "#5aa05a", ic: "ti-pill" },
  restauration:   { l: "Restauration",      c: "#EF9F27", ic: "ti-tools-kitchen-2" },
  technique:      { l: "Technique",         c: "#7a6fb0", ic: "ti-tool" },
  administration: { l: "Administration",    c: "#142131", ic: "ti-shield-check" },
  logistique:     { l: "Logistique",        c: "#185FA5", ic: "ti-truck" },
  reeducation:    { l: "Rééducation",       c: "#5e4a8c", ic: "ti-yoga" },
  laboratoire:    { l: "Laboratoire",       c: "#7CC8C8", ic: "ti-microscope" },
  imagerie:       { l: "Imagerie",          c: "#5e4a8c", ic: "ti-camera" },
};

export default function ServicesPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [services, setServices] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [users, setUsers] = useState([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [search, setSearch] = useState("");
  const [fEtab, setFEtab] = useState("");
  const [fBat, setFBat] = useState("");
  const [fType, setFType] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [collaborateurs, setCollabs] = useState([]);

  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function load() {
    // Vue complète d'abord, fallback sur table services
    let r = await supabase.from("v_services_complete").select("*").eq("structure_id", auth.structureId).order("nom");
    if (r.error) {
      r = await supabase.from("services").select("*").eq("structure_id", auth.structureId).order("nom");
    }
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setServices(r.data || []);

    const [b, e, u] = await Promise.all([
      supabase.from("batiments").select("id, nom, etablissement_id").eq("structure_id", auth.structureId).limit(100),
      supabase.from("etablissements").select("id, nom").eq("structure_id", auth.structureId).order("nom"),
      supabase.from("v_users_complete").select("user_id, nom_complet, email").eq("structure_id", auth.structureId).limit(200)
        .then(r => r.error ? supabase.from("membres_etablissements").select("user_id, email, nom_complet").eq("structure_id", auth.structureId).limit(200) : r),
    ]);
    setBatiments(b.data || []);
    setEtablissements(e.data || []);
    setUsers(u.data || []);
  }

  async function saveService() {
    const payload = {
      structure_id: auth.structureId,
      etablissement_id: form.etablissement_id,
      batiment_id: form.batiment_id || null,
      nom: form.nom,
      code_service: form.code_service,
      type_service: form.type_service || "soins",
      couleur: form.couleur || (TYPES_SERVICE[form.type_service]?.c || COLOR),
      icone: form.icone || (TYPES_SERVICE[form.type_service]?.ic || "ti-stethoscope"),
      chef_service_nom: form.chef_service_nom,
      capacite_lits: form.capacite_lits ? parseInt(form.capacite_lits) : 0,
    };
    if (form.id) await supabase.from("services").update(payload).eq("id", form.id);
    else await supabase.from("services").insert(payload);
    setModal(null); setForm({}); load();
  }

  async function deleteService(id) {
    if (!confirm("Supprimer ce service ?")) return;
    await supabase.from("services").delete().eq("id", id);
    load();
  }

  async function openCollabs(service) {
    setForm(service);
    const r = await supabase.from("membres_services")
      .select("*")
      .eq("service_id", service.id);
    setCollabs(r.data || []);
    setModal("collabs");
  }

  async function addCollab(userId, isChef = false) {
    if (!form.id || !userId) return;
    const user = users.find(u => (u.user_id || u.id) === userId);
    await supabase.from("membres_services").insert({
      service_id: form.id,
      user_id: userId,
      structure_id: auth.structureId,
      role: user?.role || "collaborateur",
      est_chef: isChef,
    });
    openCollabs(form);
  }

  async function removeCollab(msId) {
    await supabase.from("membres_services").delete().eq("id", msId);
    openCollabs(form);
  }

  async function setChef(msId, est) {
    await supabase.from("membres_services").update({ est_chef: est }).eq("id", msId);
    openCollabs(form);
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return services.filter(srv => {
      if (s && !((srv.nom || "") + " " + (srv.code_service || "")).toLowerCase().includes(s)) return false;
      if (fEtab && srv.etablissement_id !== fEtab) return false;
      if (fBat && srv.batiment_id !== fBat) return false;
      if (fType && srv.type_service !== fType) return false;
      return true;
    });
  }, [services, search, fEtab, fBat, fType]);

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-building-cottage" title="Services" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Table manquante">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-services-batiments.sql</strong>.</p>
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
        icon="ti-building-cottage"
        title="Services & collaborateurs"
        subtitle="Services rattachés aux bâtiments + équipes"
        badge={`${services.length} services`}
        actions={
          <button onClick={() => { setForm({ type_service: "soins", capacite_lits: 0 }); setModal("new"); }} style={btnPrim}>
            <i className="ti ti-plus" /> Nouveau service
          </button>
        }
      >
        {/* Filtres */}
        <ModernCard color={COLOR} variant="default" padding={14} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Rechercher nom, code..." value={search} onChange={(e) => setSearch(e.target.value)} style={inp} />
            <select value={fEtab} onChange={(e) => { setFEtab(e.target.value); setFBat(""); }} style={inp}>
              <option value="">Tous établissements</option>
              {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
            <select value={fBat} onChange={(e) => setFBat(e.target.value)} style={inp} disabled={!fEtab}>
              <option value="">Tous bâtiments</option>
              {batiments.filter(b => !fEtab || b.etablissement_id === fEtab).map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
            <select value={fType} onChange={(e) => setFType(e.target.value)} style={inp}>
              <option value="">Tous types</option>
              {Object.entries(TYPES_SERVICE).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </ModernCard>

        {/* Cards services */}
        {filtered.length === 0 ? (
          <ModernCard color={COLOR} variant="accent" icon="ti-info-circle" title="Aucun service">
            <p style={{ color: "rgba(255,255,255,.7)", margin: 0 }}>Crée un premier service ou exécute le SQL de seeds.</p>
          </ModernCard>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {filtered.map(s => {
              const t = TYPES_SERVICE[s.type_service] || { l: s.type_service || "Service", c: s.couleur || COLOR, ic: s.icone || "ti-stethoscope" };
              return (
                <ModernCard key={s.id} color={t.c} variant="default" padding={0} hoverable>
                  <div style={{ padding: "12px 14px", background: `linear-gradient(135deg, ${t.c}20, ${t.c}05)`, borderBottom: `1px solid ${t.c}30`, display: "flex", alignItems: "center", gap: 10 }}>
                    <HiTechIconBox name={t.ic} color={t.c} variant="gradient" size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{s.nom}</div>
                      <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, fontFamily: "monospace" }}>{s.code_service || "—"}</div>
                    </div>
                    <span style={{ background: `${t.c}30`, color: t.c, padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{t.l}</span>
                  </div>
                  <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                    <Detail l="Établissement" v={s.etablissement_nom || "—"} full />
                    <Detail l="Bâtiment" v={s.batiment_nom || "—"} />
                    <Detail l="Lits" v={s.capacite_lits || 0} />
                    {s.chef_service_nom && <Detail l="Chef" v={s.chef_service_nom} full />}
                  </div>
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${t.c}20`, display: "flex", gap: 6 }}>
                    <button onClick={() => openCollabs(s)} style={{ flex: 1, padding: "6px 10px", background: `${t.c}25`, color: "#fff", border: `1px solid ${t.c}50`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand" }}>
                      <i className="ti ti-users" /> {s.nb_collaborateurs || 0} collab
                    </button>
                    <button onClick={() => { setForm(s); setModal("new"); }} style={{ padding: "6px 10px", background: "rgba(255,255,255,.06)", color: "#fff", border: "1px solid rgba(255,255,255,.10)", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "Quicksand" }}>
                      <i className="ti ti-edit" />
                    </button>
                    <button onClick={() => deleteService(s.id)} style={{ padding: "6px 10px", background: "rgba(212,94,94,.10)", color: "#D45E5E", border: "1px solid rgba(212,94,94,.30)", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "Quicksand" }}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* MODAL Création/édition service */}
        <ModernModal
          open={modal === "new"}
          onClose={() => { setModal(null); setForm({}); }}
          color={COLOR} icon="ti-building-cottage"
          title={form.id ? "Modifier service" : "Nouveau service"}
          actions={
            <>
              <ModalBtn variant="secondary" onClick={() => { setModal(null); setForm({}); }}>Annuler</ModalBtn>
              <ModalBtn variant="primary" color={COLOR} icon="ti-check" onClick={saveService} disabled={!form.nom || !form.etablissement_id}>Enregistrer</ModalBtn>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nom *" full><input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
            <Field label="Code service"><input value={form.code_service || ""} onChange={(e) => setForm({ ...form, code_service: e.target.value })} placeholder="SI-01..." /></Field>
            <Field label="Type">
              <select value={form.type_service || "soins"} onChange={(e) => setForm({ ...form, type_service: e.target.value })}>
                {Object.entries(TYPES_SERVICE).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
              </select>
            </Field>
            <Field label="Établissement *">
              <select value={form.etablissement_id || ""} onChange={(e) => setForm({ ...form, etablissement_id: e.target.value })}>
                <option value="">— Sélectionner —</option>
                {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </Field>
            <Field label="Bâtiment">
              <select value={form.batiment_id || ""} onChange={(e) => setForm({ ...form, batiment_id: e.target.value })}>
                <option value="">— Aucun —</option>
                {batiments.filter(b => !form.etablissement_id || b.etablissement_id === form.etablissement_id).map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
            </Field>
            <Field label="Chef de service"><input value={form.chef_service_nom || ""} onChange={(e) => setForm({ ...form, chef_service_nom: e.target.value })} /></Field>
            <Field label="Capacité (lits)"><input type="number" value={form.capacite_lits || 0} onChange={(e) => setForm({ ...form, capacite_lits: e.target.value })} /></Field>
            <Field label="Couleur"><input type="color" value={form.couleur || COLOR} onChange={(e) => setForm({ ...form, couleur: e.target.value })} style={{ height: 40 }} /></Field>
            <Field label="Icône (Tabler)"><input value={form.icone || "ti-stethoscope"} onChange={(e) => setForm({ ...form, icone: e.target.value })} /></Field>
          </div>
        </ModernModal>

        {/* MODAL Collaborateurs */}
        <ModernModal
          open={modal === "collabs"}
          onClose={() => { setModal(null); setForm({}); setCollabs([]); }}
          color={COLOR} icon="ti-users"
          title={`Collaborateurs · ${form.nom || ""}`}
          subtitle={`${collaborateurs.length} personnes rattachées`}
          size="lg"
          actions={<ModalBtn variant="primary" color={COLOR} onClick={() => { setModal(null); setForm({}); setCollabs([]); }}>Fermer</ModalBtn>}
        >
          {/* Liste collaborateurs actuels */}
          <h4 style={{ color: "#142131", margin: "0 0 10px", fontSize: 13, fontWeight: 800 }}>
            <i className="ti ti-users" /> Équipe ({collaborateurs.length})
          </h4>
          {collaborateurs.length === 0 ? (
            <div style={{ padding: 14, background: "#f4f7fa", borderRadius: 8, color: "#5a6878", fontSize: 12, textAlign: "center" }}>
              Aucun collaborateur. Ajoute le premier ci-dessous ↓
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              {collaborateurs.map(c => {
                const u = users.find(x => (x.user_id || x.id) === c.user_id);
                return (
                  <div key={c.id} style={{ padding: 10, background: c.est_chef ? "#fff5e6" : "#f4f7fa", border: `1px solid ${c.est_chef ? "#EF9F2750" : "#e3e9ee"}`, borderRadius: 8, display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: c.est_chef ? "#EF9F27" : "#7CC8C8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                      {(u?.nom_complet || u?.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#142131", fontWeight: 700, fontSize: 13 }}>{u?.nom_complet || u?.email || c.user_id?.substring(0, 8)}</div>
                      <div style={{ color: "#5a6878", fontSize: 10 }}>{c.role || "collaborateur"}</div>
                    </div>
                    {c.est_chef && <span style={{ background: "#EF9F27", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>👑 Chef</span>}
                    <button onClick={() => setChef(c.id, !c.est_chef)} style={{ padding: "4px 8px", background: c.est_chef ? "transparent" : "#EF9F2725", color: "#EF9F27", border: "1px solid #EF9F2750", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Quicksand" }}>
                      {c.est_chef ? "Retirer chef" : "Définir chef"}
                    </button>
                    <button onClick={() => removeCollab(c.id)} style={{ width: 32, height: 32, background: "rgba(212,94,94,.10)", color: "#D45E5E", border: "1px solid rgba(212,94,94,.30)", borderRadius: 6, cursor: "pointer" }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ajouter un collaborateur */}
          <h4 style={{ color: "#142131", margin: "16px 0 8px", fontSize: 13, fontWeight: 800 }}>
            <i className="ti ti-plus" /> Ajouter un collaborateur
          </h4>
          <select onChange={(e) => { if (e.target.value) { addCollab(e.target.value); e.target.value = ""; } }} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d3dce5", fontFamily: "Quicksand", fontSize: 13 }}>
            <option value="">— Sélectionner un collaborateur —</option>
            {users
              .filter(u => !collaborateurs.some(c => c.user_id === (u.user_id || u.id)))
              .map(u => <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.nom_complet || u.email}</option>)}
          </select>
        </ModernModal>
      </PageShell>
    </>
  );
}

const btnPrim = { padding: "10px 18px", borderRadius: 10, background: `linear-gradient(135deg, ${COLOR}, ${COLOR}cc)`, color: "#fff", border: "none", fontFamily: "Quicksand", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: `0 4px 12px ${COLOR}50` };
const inp = { padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.10)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", fontFamily: "Quicksand", fontSize: 13, minWidth: 180 };

function Detail({ l, v, full }) {
  return <div style={{ gridColumn: full ? "1 / -1" : undefined }}><div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, textTransform: "uppercase" }}>{l}</div><div style={{ color: "#fff" }}>{v}</div></div>;
}
function Field({ label, children, full }) {
  return <div style={{ gridColumn: full ? "1 / -1" : undefined, marginBottom: 4 }}><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>{children}</div>;
}
