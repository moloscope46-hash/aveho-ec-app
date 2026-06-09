"use client";
// =============================================================
//  /had — Liste des HAD (Hospitalisation À Domicile) (0.62.68)
//  Mode tuiles / liste + CRUD + lien vers fiche
// =============================================================
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import { EmptyState } from "../components/PremiumKpi";
import PageToolbar from "../components/PageToolbar";
import BackButton from "../components/BackButton";
import ViewModeToggle, { useViewMode } from "../components/ViewModeToggle";
import PatientMultiSelectActions from "../components/PatientMultiSelectActions";

const TYPES = [
  { v: "had_generaliste", l: "Généraliste",    c: "#185FA5", ic: "ti-stethoscope" },
  { v: "had_pediatrique", l: "Pédiatrique",    c: "#7CC8C8", ic: "ti-baby-bottle" },
  { v: "had_perinatale",  l: "Périnatale",     c: "#EF9F27", ic: "ti-mood-kid" },
  { v: "had_oncologie",   l: "Oncologie",      c: "#7a6fb0", ic: "ti-medical-cross" },
];

export default function HadListPage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const cart = useCart();

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fActif, setFActif] = useState(true);
  const [viewMode, setViewMode] = useViewMode("had-list", "tiles");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (auth.ready) reload(); }, [auth.ready]);

  async function reload() {
    setLoading(true);
    try {
      const [r, sR] = await Promise.all([
        supabase.from("had").select("*").order("nom"),
        supabase.from("v_had_stats").select("*"),
      ]);
      if (r.error?.code === "42P01") setTableMissing(true);
      setRows(r.data || []);
      const m = {};
      (sR.data || []).forEach(s => { m[s.id] = s; });
      setStats(m);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (fActif !== null && r.actif !== fActif) return false;
    if (fType && r.type !== fType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.nom || ""} ${r.code || ""} ${r.ville || ""} ${r.finess || ""} ${r.zone_intervention || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [rows, search, fType, fActif]);

  const totals = useMemo(() => ({
    total: rows.length,
    actifs: rows.filter(r => r.actif).length,
    lits: rows.reduce((s, r) => s + (r.capacite_lits || 0), 0),
    collaborateurs: Object.values(stats).reduce((s, st) => s + (st.nb_collaborateurs || 0), 0),
  }), [rows, stats]);

  function openNew() {
    setForm({
      nom: "", code: "", finess: "", type: "had_generaliste",
      adresse: "", cp: "", ville: "", pays: "France",
      telephone: "", email: "",
      responsable_nom: "", responsable_telephone: "", responsable_email: "",
      capacite_lits: 20, zone_intervention: "", rayon_intervention_km: 30,
      latitude: null, longitude: null,
      notes: "", actif: true,
    });
    setModal("new");
  }

  function openEdit(r) { setForm({ ...r }); setModal("edit"); }

  async function save() {
    if (!form.nom?.trim()) { alert("Nom requis"); return; }
    setBusy(true);
    try {
      const payload = {
        ...form,
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        capacite_lits: parseInt(form.capacite_lits) || null,
        rayon_intervention_km: parseInt(form.rayon_intervention_km) || 30,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      delete payload.id; delete payload.cree_le; delete payload.modifie_le;
      if (modal === "edit") {
        await supabase.from("had").update(payload).eq("id", form.id);
      } else {
        await supabase.from("had").insert(payload);
      }
      setModal(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    setBusy(false);
  }

  async function toggleActif(r) {
    await supabase.from("had").update({ actif: !r.actif }).eq("id", r.id);
    await reload();
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1300 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-home-heart" title="HAD" subtitle={`${totals.total} structure${totals.total > 1 ? "s" : ""} d'Hospitalisation À Domicile · ${totals.lits} lits · ${totals.collaborateurs} collaborateurs`}
            color="#185FA5" />
          <div style={{ display: "flex", gap: 8 }}>
            <ViewModeToggle value={viewMode} onChange={setViewMode} accentColor="#185FA5" />
            <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouvelle HAD</Btn>
          </div>
        </div>

        {tableMissing && (
          <Panel style={{ borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>⚠ Applique <code>migration-0.62.68-had-module-complet.sql</code></div>
          </Panel>
        )}

        <PageToolbar
          search={search} onSearch={setSearch}
          placeholder="Nom, code, FINESS, ville, zone..."
          totalCount={rows.length} filteredCount={filtered.length}
          accentColor="#185FA5"
          filters={[
            { key: "type", label: "Type", value: fType, onChange: setFType, type: "buttongroup",
              options: TYPES.map(t => ({ v: t.v, l: t.l, c: t.c, ic: t.ic })) },
            { key: "actif", label: "Actifs", value: fActif === true, onChange: () => setFActif(fActif === true ? false : true), type: "toggle", color: "#5aa05a", icon: "ti-check" },
          ]}
          onReset={() => { setSearch(""); setFType(""); setFActif(true); }}
        />

        {loading ? (
          <Panel><div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState icon="ti-home-off" title="Aucune HAD" desc="Crée ta première structure HAD pour démarrer." />
        ) : viewMode === "tiles" ? (
          <div className="av-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 14 }}>
            {filtered.map(r => {
              const type = TYPES.find(t => t.v === r.type) || TYPES[0];
              const st = stats[r.id] || {};
              return (
                <div key={r.id} data-3d="true" style={{
                  background: "#fff",
                  border: `1px solid ${r.actif ? `${type.c}30` : "#f4f7fa"}`,
                  borderLeft: `4px solid ${r.actif ? type.c : "#c0d0d8"}`,
                  borderRadius: 14, padding: 16,
                  opacity: r.actif ? 1 : 0.7,
                  cursor: "pointer",
                }}
                  onClick={() => router.push(`/had/${r.id}`)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: `linear-gradient(135deg, ${type.c}, ${type.c}cc)`,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      boxShadow: `0 4px 12px ${type.c}40`, flexShrink: 0,
                    }}>
                      <i className={`ti ${type.ic}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#142131" }}>{r.nom}</h3>
                      <div style={{ fontSize: 11, color: "#8a98a8", fontFamily: "Consolas, monospace", marginTop: 2 }}>
                        {r.code || ""}{r.finess ? ` · FINESS ${r.finess}` : ""}
                      </div>
                    </div>
                    <span style={{ background: `${type.c}1A`, color: type.c, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                      {type.l}
                    </span>
                  </div>

                  {r.ville && (
                    <div style={{ fontSize: 12, color: "#5a6878", marginBottom: 6 }}>
                      <i className="ti ti-map-pin" /> {[r.cp, r.ville].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {r.zone_intervention && (
                    <div style={{ fontSize: 11.5, color: "#5a6878", lineHeight: 1.4, marginBottom: 6 }}>
                      <i className="ti ti-map-2" /> {r.zone_intervention} · {r.rayon_intervention_km || 30}km
                    </div>
                  )}
                  {r.responsable_nom && (
                    <div style={{ fontSize: 11.5, color: "#5a6878" }}>
                      <i className="ti ti-user-check" /> {r.responsable_nom}
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f4f7fa" }}>
                    <StatPill icon="ti-bed-flat" label="Lits" value={r.capacite_lits || 0} color="#185FA5" />
                    <StatPill icon="ti-users" label="Collab." value={st.nb_collaborateurs || 0} color="#7CC8C8" />
                    <StatPill icon="ti-car" label="Véhic." value={st.nb_vehicules || 0} color="#5aa05a" />
                    <StatPill icon="ti-building" label="Étabs" value={st.nb_etablissements || 0} color="#EF9F27" />
                  </div>

                  <div style={{ display: "flex", gap: 5, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => router.push(`/had/${r.id}`)} style={btnStyle(type.c, true)}>
                      <i className="ti ti-eye" /> Fiche
                    </button>
                    <button onClick={() => openEdit(r)} style={btnStyle("#8a98a8")}>
                      <i className="ti ti-edit" />
                    </button>
                    <button onClick={() => toggleActif(r)} style={btnStyle(r.actif ? "#e35d5b" : "#5aa05a")}>
                      <i className={`ti ${r.actif ? "ti-eye-off" : "ti-eye"}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ===== MODE LISTE COMPACTE =====
          <Panel style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Nom</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Code / FINESS</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "10px 12px" }}>Ville</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>Lits</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>Collab.</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>Véhic.</th>
                    <th style={{ textAlign: "center", padding: "10px 12px" }}>Étabs</th>
                    <th style={{ textAlign: "right", padding: "10px 12px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const type = TYPES.find(t => t.v === r.type) || TYPES[0];
                    const st = stats[r.id] || {};
                    return (
                      <tr key={r.id} style={{ opacity: r.actif ? 1 : 0.6, cursor: "pointer" }} onClick={() => router.push(`/had/${r.id}`)}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#142131" }}>{r.nom}</td>
                        <td style={{ padding: "10px 12px", fontFamily: "Consolas, monospace", fontSize: 11.5, color: "#8a98a8" }}>
                          {r.code || "—"}{r.finess ? ` / ${r.finess}` : ""}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: `${type.c}1A`, color: type.c, padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>{type.l}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#5a6878" }}>{r.ville || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700 }}>{r.capacite_lits || 0}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{st.nb_collaborateurs || 0}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{st.nb_vehicules || 0}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>{st.nb_etablissements || 0}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEdit(r)} style={iconBtn("#185FA5")}><i className="ti ti-edit" /></button>
                          <button onClick={() => toggleActif(r)} style={iconBtn(r.actif ? "#e35d5b" : "#5aa05a")}><i className={`ti ${r.actif ? "ti-eye-off" : "ti-eye"}`} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Modal create/edit */}
        <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)}
          title={modal === "edit" ? "Modifier la HAD" : "Nouvelle HAD"} kind="default" size="md"
          footer={<>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
          </>}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <label>Nom * <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inputStyle()} /></label>
              <label>Code <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="HAD-46" style={inputStyle()} /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>FINESS <input value={form.finess || ""} onChange={(e) => setForm({ ...form, finess: e.target.value })} style={inputStyle()} /></label>
              <label>Type
                <select value={form.type || "had_generaliste"} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle()}>
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </label>
            </div>
            <label>Adresse <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} style={inputStyle()} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <label>CP <input value={form.cp || ""} onChange={(e) => setForm({ ...form, cp: e.target.value })} style={inputStyle()} /></label>
              <label>Ville <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inputStyle()} /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>Téléphone <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inputStyle()} /></label>
              <label>Email <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle()} /></label>
            </div>
            <fieldset style={{ border: "1px solid #e3e9ee", borderRadius: 8, padding: 10 }}>
              <legend style={{ padding: "0 6px", fontSize: 12, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Responsable HAD</legend>
              <div style={{ display: "grid", gap: 8 }}>
                <label>Nom <input value={form.responsable_nom || ""} onChange={(e) => setForm({ ...form, responsable_nom: e.target.value })} placeholder="Dr. MARTIN Claire" style={inputStyle()} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <label>Téléphone <input value={form.responsable_telephone || ""} onChange={(e) => setForm({ ...form, responsable_telephone: e.target.value })} style={inputStyle()} /></label>
                  <label>Email <input type="email" value={form.responsable_email || ""} onChange={(e) => setForm({ ...form, responsable_email: e.target.value })} style={inputStyle()} /></label>
                </div>
              </div>
            </fieldset>
            <fieldset style={{ border: "1px solid #e3e9ee", borderRadius: 8, padding: 10 }}>
              <legend style={{ padding: "0 6px", fontSize: 12, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>Capacité & Zone</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label>Capacité (lits) <input type="number" value={form.capacite_lits || ""} onChange={(e) => setForm({ ...form, capacite_lits: e.target.value })} style={inputStyle()} /></label>
                <label>Rayon intervention (km) <input type="number" value={form.rayon_intervention_km || ""} onChange={(e) => setForm({ ...form, rayon_intervention_km: e.target.value })} style={inputStyle()} /></label>
              </div>
              <label>Zone d'intervention <input value={form.zone_intervention || ""} onChange={(e) => setForm({ ...form, zone_intervention: e.target.value })} placeholder="Lot et causses limitrophes" style={inputStyle()} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <label>Latitude <input type="number" step="0.000001" value={form.latitude || ""} onChange={(e) => setForm({ ...form, latitude: e.target.value })} style={inputStyle()} /></label>
                <label>Longitude <input type="number" step="0.000001" value={form.longitude || ""} onChange={(e) => setForm({ ...form, longitude: e.target.value })} style={inputStyle()} /></label>
              </div>
            </fieldset>
            <label>Notes <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={inputStyle()} /></label>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <div style={{ textAlign: "center", padding: "4px 0" }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 14 }} />
      <div style={{ fontSize: 15, fontWeight: 800, color: "#142131", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

function btnStyle(color, primary = false) {
  return {
    flex: primary ? 1 : "0 0 auto",
    padding: "6px 10px",
    background: primary ? `linear-gradient(135deg, ${color}, ${color}dd)` : `${color}12`,
    color: primary ? "#fff" : color,
    border: primary ? "none" : `1px solid ${color}30`,
    borderRadius: 6, fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
  };
}

function iconBtn(color) {
  return { padding: 6, marginLeft: 4, background: `${color}12`, color, border: `1px solid ${color}30`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" };
}

function inputStyle() {
  return { width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", marginTop: 4 };
}
