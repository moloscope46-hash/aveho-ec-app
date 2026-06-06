"use client";
// =============================================================
//  /collaborateurs — Gestion des collaborateurs (0.59.0)
//  Rôles : infirmier, docteur, pharmacien, aide_soignant, kiné
//  Pharmacien → rattaché à une pharmacie
//  Tous → rattaché à étab/service possible
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const ROLES_PRO = [
  { v: "infirmier",     l: "Infirmier·ère",    ic: "ti-nurse",          col: "#7CC8C8" },
  { v: "docteur",       l: "Docteur / Médecin", ic: "ti-stethoscope",   col: "#185FA5" },
  { v: "pharmacien",    l: "Pharmacien·ne",    ic: "ti-prescription",  col: "#5aa05a" },
  { v: "aide_soignant", l: "Aide-soignant·e",   ic: "ti-heart-handshake", col: "#C9867F" },
  { v: "kine",          l: "Kinésithérapeute", ic: "ti-massage",        col: "#7a6fb0" },
  { v: "secretaire",    l: "Secrétaire",       ic: "ti-keyboard",       col: "#8a98a8" },
  { v: "logistique",    l: "Logistique",       ic: "ti-truck",          col: "#EF9F27" },
  { v: "admin",         l: "Administratif",    ic: "ti-briefcase",      col: "#5e4a8c" },
  { v: "autre",         l: "Autre",            ic: "ti-user",           col: "#142131" },
];

const ROLES_APPLI = [
  { v: "admin",    l: "Admin",       col: "#e35d5b" },
  { v: "manager",  l: "Manager",     col: "#EF9F27" },
  { v: "member",   l: "Collaborateur", col: "#185FA5" },
  { v: "readonly", l: "Lecture seule", col: "#8a98a8" },
];

export default function CollaborateursPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [collabs, setCollabs] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterService, setFilterService] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    setLoadError("");
    try {
      // Tente vue v_collaborateurs d'abord
      let collabData = [];
      let r = await supabase.from("v_collaborateurs").select("*").eq("structure_id", auth.structureId);
      if (r.error) {
        // Fallback : table membres_structure brute avec jointures simples
        console.warn("[Collab] vue v_collaborateurs absente, fallback :", r.error?.message);
        const r2 = await supabase.from("membres_structure").select("*").eq("structure_id", auth.structureId);
        if (r2.error) {
          if (r2.error.code === "42P01") {
            setLoadError("Table 'membres_structure' inaccessible. Vérifie ton SQL.");
          } else {
            setLoadError(r2.error.message);
          }
          collabData = [];
        } else {
          collabData = r2.data || [];
        }
      } else {
        collabData = r.data || [];
      }
      setCollabs(collabData);

      // Pharmacies
      try {
        const rp = await supabase.from("pharmacies").select("id, nom").eq("structure_id", auth.structureId).order("nom");
        setPharmacies(rp.data || []);
      } catch {}

      // Etabs & services
      try {
        const re = await supabase.from("etablissements").select("id, nom").eq("structure_id", auth.structureId).order("nom");
        setEtabs(re.data || []);
      } catch {}
      try {
        const rs = await supabase.from("services").select("id, nom, batiment_id").order("nom");
        setServices(rs.data || []);
      } catch {}
    } finally { setLoading(false); }
  }

  function openEdit(c) {
    setForm({ ...c });
    setSaveError("");
    setModal(c);
  }

  async function save() {
    setSaveError("");
    setSaving(true);
    try {
      const payload = {
        role_professionnel: form.role_professionnel || null,
        specialite: form.specialite || null,
        numero_adeli: form.numero_adeli || null,
        numero_rpps: form.numero_rpps || null,
        pharmacie_id: form.role_professionnel === "pharmacien" ? (form.pharmacie_id || null) : null,
        etablissement_id: form.etablissement_id || null,
        service_id: form.service_id || null,
        prenom: form.prenom || null,
        nom: form.nom || null,
        telephone: form.telephone || null,
        notes: form.notes || null,
      };
      console.log("[Collab] Update payload:", payload);
      const r = await supabase.from("membres_structure")
        .update(payload)
        .eq("user_id", modal.user_id)
        .eq("structure_id", auth.structureId)
        .select();
      if (r.error) {
        console.error("[Collab] Erreur update:", r.error);
        if (r.error.code === "42703") throw new Error(`Colonne absente : ${r.error.message}. Applique migration-0.59.0-collaborateurs-roles.sql`);
        if (r.error.code === "42501") throw new Error("RLS bloque l'update.");
        throw new Error(`${r.error.message} (${r.error.code})`);
      }
      setModal(null);
      reload();
    } catch (e) {
      setSaveError(e.message);
    } finally { setSaving(false); }
  }

  const searchLow = search.trim().toLowerCase();
  const filtered = collabs.filter(c => {
    if (filterRole && c.role_professionnel !== filterRole) return false;
    if (filterService && c.service_id !== filterService) return false;
    if (searchLow) {
      const text = `${c.nom||""} ${c.prenom||""} ${c.specialite||""} ${c.numero_adeli||""} ${c.numero_rpps||""}`.toLowerCase();
      if (!text.includes(searchLow)) return false;
    }
    return true;
  });

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-users" title="Collaborateurs" subtitle="Équipe de la structure — rôles, rattachements établissement / service / pharmacie" />

        {loadError && (
          <Panel style={{ background: "rgba(227,93,91,.08)", borderLeft: "4px solid #e35d5b", marginBottom: 14 }}>
            <div style={{ color: "#c0392b", fontWeight: 600, fontSize: 13.5 }}>
              <i className="ti ti-alert-triangle" /> {loadError}
            </div>
            {loadError.includes("migration") && (
              <pre style={{ background: "#142131", color: "#bfe6e6", padding: 10, borderRadius: 6, fontSize: 11, marginTop: 6 }}>
                {`-- Dans Supabase SQL Editor :\n-- migration-0.59.0-collaborateurs-roles.sql`}
              </pre>
            )}
          </Panel>
        )}

        {/* Filtres */}
        <Panel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a98a8" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, ADELI, RPPS..." style={{ width: "100%", padding: "10px 12px 10px 36px", background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }} />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={selectStyle}>
              <option value="">Tous les rôles</option>
              {ROLES_PRO.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
            <select value={filterService} onChange={(e) => setFilterService(e.target.value)} style={selectStyle}>
              <option value="">Tous les services</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
            <Btn variant="ghost" icon="ti-refresh" onClick={reload}>Actualiser</Btn>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#5a6878" }}>
            {filtered.length} collaborateur{filtered.length > 1 ? "s" : ""} {filterRole || filterService || searchLow ? "(filtré)" : ""} · {collabs.length} au total
          </div>
        </Panel>

        {/* Stats par rôle */}
        {!loading && collabs.length > 0 && (
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
              {ROLES_PRO.map(r => {
                const n = collabs.filter(c => c.role_professionnel === r.v).length;
                if (n === 0) return null;
                return (
                  <div key={r.v} onClick={() => setFilterRole(filterRole === r.v ? "" : r.v)} style={{
                    background: filterRole === r.v ? `${r.col}22` : "#fafbfc",
                    border: `2px solid ${filterRole === r.v ? r.col : "#e3e9ee"}`,
                    borderRadius: 10, padding: "8px 12px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <i className={`ti ${r.ic}`} style={{ color: r.col, fontSize: 18 }} />
                    <div style={{ flex: 1, fontSize: 11.5 }}>
                      <div style={{ fontWeight: 700, color: "#142131" }}>{r.l}</div>
                      <div style={{ color: "#5a6878" }}>{n}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Liste */}
        <Panel style={{ marginTop: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>
              <i className="ti ti-users-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucun collaborateur.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
              {filtered.map(c => {
                const role = ROLES_PRO.find(r => r.v === c.role_professionnel) || ROLES_PRO[8]; // 'autre'
                return (
                  <div key={c.user_id} style={{
                    background: "#fff", border: `1px solid ${role.col}33`, borderLeft: `4px solid ${role.col}`,
                    borderRadius: 12, padding: 14, cursor: "pointer",
                  }} onClick={() => openEdit(c)}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        width: 44, height: 44, background: `${role.col}22`, color: role.col,
                        borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                      }}>
                        <i className={`ti ${role.ic}`} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>
                          {c.prenom || c.nom ? `${c.prenom || ""} ${c.nom || ""}`.trim() : <em style={{ color: "#8a98a8" }}>Sans nom</em>}
                        </div>
                        <div style={{ fontSize: 11.5, color: role.col, fontWeight: 600 }}>{role.l}</div>
                        {c.specialite && <div style={{ fontSize: 11, color: "#5a6878" }}>{c.specialite}</div>}
                        {c.role_professionnel === "pharmacien" && c.pharmacie_nom && (
                          <div style={{ fontSize: 11, color: "#5aa05a", marginTop: 3 }}>
                            <i className="ti ti-pill" /> {c.pharmacie_nom}
                          </div>
                        )}
                        {c.etablissement_nom && (
                          <div style={{ fontSize: 11, color: "#5a6878", marginTop: 3 }}>
                            <i className="ti ti-building" /> {c.etablissement_nom}
                            {c.service_nom && <span> · {c.service_nom}</span>}
                          </div>
                        )}
                        {(c.numero_adeli || c.numero_rpps) && (
                          <div style={{ fontSize: 10, color: "#8a98a8", fontFamily: "Consolas,monospace", marginTop: 3 }}>
                            {c.numero_adeli && <>ADELI: {c.numero_adeli} </>}
                            {c.numero_rpps && <>RPPS: {c.numero_rpps}</>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Modal édition */}
        {modal && (
          <Modal title={`Éditer ${modal.prenom || ""} ${modal.nom || ""}`.trim() || "Collaborateur"}
            onClose={() => { setModal(null); setSaveError(""); }}
            footer={<>
              <Btn variant="ghost" onClick={() => { setModal(null); setSaveError(""); }}>Annuler</Btn>
              <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
            </>}>
            {saveError && (
              <div style={{ background: "rgba(227,93,91,.10)", border: "1px solid #e35d5b", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#c0392b", fontSize: 13, fontWeight: 600 }}>
                <i className="ti ti-alert-triangle" /> {saveError}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="fld"><label>Prénom</label><input value={form.prenom || ""} onChange={e => setForm({ ...form, prenom: e.target.value })} /></div>
              <div className="fld"><label>Nom</label><input value={form.nom || ""} onChange={e => setForm({ ...form, nom: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="fld">
              <label>Rôle professionnel</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>
                {ROLES_PRO.map(r => (
                  <button key={r.v} type="button" onClick={() => setForm({ ...form, role_professionnel: r.v })} style={{
                    padding: "8px 10px",
                    background: form.role_professionnel === r.v ? `${r.col}22` : "#fff",
                    border: `2px solid ${form.role_professionnel === r.v ? r.col : "#e3e9ee"}`,
                    color: form.role_professionnel === r.v ? r.col : "#5a6878",
                    borderRadius: 8, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <i className={`ti ${r.ic}`} /> {r.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="fld"><label>Spécialité</label><input value={form.specialite || ""} onChange={e => setForm({ ...form, specialite: e.target.value })} placeholder="Cardiologue, Diabéto..." /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className="fld"><label>N° ADELI</label><input value={form.numero_adeli || ""} onChange={e => setForm({ ...form, numero_adeli: e.target.value })} style={{ fontFamily: "Consolas,monospace" }} /></div>
              <div className="fld"><label>N° RPPS</label><input value={form.numero_rpps || ""} onChange={e => setForm({ ...form, numero_rpps: e.target.value })} style={{ fontFamily: "Consolas,monospace" }} /></div>
            </div>
            <div className="fld"><label>Téléphone</label><input value={form.telephone || ""} onChange={e => setForm({ ...form, telephone: e.target.value })} type="tel" /></div>

            {/* Si pharmacien → pharmacie */}
            {form.role_professionnel === "pharmacien" && (
              <div className="fld" style={{ background: "rgba(90,160,90,.08)", padding: 12, borderRadius: 8, borderLeft: "3px solid #5aa05a" }}>
                <label><i className="ti ti-pill" style={{ color: "#5aa05a" }} /> Pharmacie rattachée</label>
                <select value={form.pharmacie_id || ""} onChange={e => setForm({ ...form, pharmacie_id: e.target.value })}>
                  <option value="">— Choisir une pharmacie —</option>
                  {pharmacies.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
                {pharmacies.length === 0 && (
                  <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>
                    Aucune pharmacie créée. <a href="/pharmacies" style={{ color: "#5aa05a" }}>Créer une pharmacie</a>
                  </div>
                )}
              </div>
            )}

            <div className="fld">
              <label>Établissement de rattachement</label>
              <select value={form.etablissement_id || ""} onChange={e => setForm({ ...form, etablissement_id: e.target.value, service_id: "" })}>
                <option value="">— Aucun —</option>
                {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div className="fld">
              <label>Service de rattachement</label>
              <select value={form.service_id || ""} onChange={e => setForm({ ...form, service_id: e.target.value })}>
                <option value="">— Aucun —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div className="fld"><label>Notes</label><textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </Modal>
        )}
      </div>
    </div>
  );
}

const selectStyle = { padding: "9px 12px", background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, minWidth: 160 };
