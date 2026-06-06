"use client";
// =============================================================
//  /pathologies — CRUD du référentiel des pathologies (0.58.99)
//  Avec icône, couleur, description, protocole, alertes
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const ICONES = [
  "ti-stethoscope", "ti-droplet", "ti-meat", "ti-flask", "ti-wind", "ti-circle",
  "ti-bandage", "ti-armchair-2", "ti-activity", "ti-heartbeat", "ti-pill",
  "ti-syringe", "ti-virus", "ti-lungs", "ti-brain", "ti-bone",
  "ti-eye", "ti-ear", "ti-tooth", "ti-mood-sad", "ti-emergency-bed",
];
const COULEURS = [
  "#185FA5", "#7CC8C8", "#EF9F27", "#5aa05a", "#C9867F",
  "#7a6fb0", "#e35d5b", "#5e4a8c", "#142131", "#8a98a8",
];

export default function PathologiesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState(null); // null | "new" | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    try {
      const r = await supabase.from("pathologies")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("nom");
      if (r.error) {
        if (r.error.code === "42P01") {
          setLoadError("La table 'pathologies' n'existe pas. Applique migration-0.58.99-pathologies-protocoles.sql dans Supabase SQL Editor.");
        } else {
          setLoadError(r.error.message);
        }
        setPaths([]);
      } else {
        setPaths(r.data || []);
        setLoadError("");
      }
    } finally { setLoading(false); }
  }

  function openNew() {
    setForm({
      nom: "",
      code: "",
      description: "",
      icone: "ti-stethoscope",
      couleur: "#185FA5",
      protocole_court: "",
      protocole_detail: "",
      alertes: "",
      actif: true,
    });
    setSaveError("");
    setModal("new");
  }

  function openEdit(p) {
    setForm({ ...p });
    setSaveError("");
    setModal(p);
  }

  async function save() {
    setSaveError("");
    if (!form.nom?.trim()) { setSaveError("Le nom est obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        code: form.code || null,
        nom: form.nom.trim(),
        description: form.description || null,
        icone: form.icone || "ti-stethoscope",
        couleur: form.couleur || "#185FA5",
        protocole_court: form.protocole_court || null,
        protocole_detail: form.protocole_detail || null,
        alertes: form.alertes || null,
        actif: form.actif !== false,
      };
      let r;
      if (modal === "new") {
        r = await supabase.from("pathologies").insert({ ...payload, created_by: auth.user?.id }).select();
      } else {
        r = await supabase.from("pathologies").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", modal.id).select();
      }
      if (r.error) {
        if (r.error.code === "42P01") throw new Error("Table 'pathologies' absente. Applique migration-0.58.99.");
        if (r.error.code === "42501") throw new Error("RLS bloque l'insertion.");
        throw new Error(`${r.error.message} (${r.error.code})`);
      }
      setModal(null);
      reload();
    } catch (e) {
      setSaveError(e.message);
    } finally { setSaving(false); }
  }

  async function del(p) {
    if (!confirm(`Supprimer la pathologie "${p.nom}" ?\nElle sera détachée des services et patients liés.`)) return;
    try {
      await supabase.from("services_pathologies").delete().eq("pathologie_id", p.id);
      await supabase.from("pathologies").delete().eq("id", p.id);
      reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  const searchLow = search.trim().toLowerCase();
  const filtered = searchLow
    ? paths.filter(p =>
        (p.nom || "").toLowerCase().includes(searchLow) ||
        (p.code || "").toLowerCase().includes(searchLow) ||
        (p.description || "").toLowerCase().includes(searchLow)
      )
    : paths;

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content">
        <BackButton />
        <PageHead icon="ti-stethoscope" title="Pathologies & Protocoles" subtitle="Référentiel des pathologies prises en charge — rattachées aux services" />

        {loadError && (
          <Panel style={{ background: "rgba(227,93,91,.08)", borderLeft: "4px solid #e35d5b", marginBottom: 14 }}>
            <div style={{ color: "#c0392b", fontWeight: 600, fontSize: 13.5 }}>
              <i className="ti ti-alert-triangle" /> {loadError}
            </div>
          </Panel>
        )}

        <Panel>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8a98a8" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher pathologie, code..."
                style={{ width: "100%", padding: "10px 12px 10px 36px", background: "#fafbfc", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}
              />
            </div>
            <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouvelle pathologie</Btn>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5a6878" }}>
              <i className="ti ti-stethoscope" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              {paths.length === 0 ? "Aucune pathologie créée. Clique 'Nouvelle pathologie'." : `Aucun résultat pour "${search}"`}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
              {filtered.map(p => (
                <div key={p.id} style={{
                  background: "#fff", border: `1px solid ${p.couleur}33`, borderLeft: `4px solid ${p.couleur}`,
                  borderRadius: 12, padding: 14, position: "relative",
                  opacity: p.actif === false ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, background: `${p.couleur}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className={`ti ${p.icone || "ti-stethoscope"}`} style={{ color: p.couleur, fontSize: 22 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>{p.nom}</div>
                      {p.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{p.code}</div>}
                    </div>
                    {p.actif === false && <span style={{ background: "#e35d5b22", color: "#e35d5b", padding: "1px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>Inactif</span>}
                  </div>
                  {p.description && <div style={{ fontSize: 12, color: "#5a6878", marginBottom: 6 }}>{p.description}</div>}
                  {p.alertes && (
                    <div style={{ background: "rgba(227,93,91,.08)", borderLeft: "3px solid #e35d5b", padding: "5px 8px", fontSize: 11, color: "#c0392b", borderRadius: 4, marginBottom: 6 }}>
                      <i className="ti ti-alert-triangle" /> {p.alertes}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={() => openEdit(p)} style={{ flex: 1, background: "rgba(20,33,49,.04)", color: "#142131", border: "1px solid #cfd8e0", padding: "6px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <i className="ti ti-pencil" /> Éditer
                    </button>
                    <button onClick={() => del(p)} style={{ background: "rgba(227,93,91,.10)", color: "#e35d5b", border: "1px solid rgba(227,93,91,.25)", padding: "6px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {modal && (
          <Modal title={modal === "new" ? "Nouvelle pathologie" : `Éditer ${modal.nom}`} onClose={() => { setModal(null); setSaveError(""); }}
            footer={<>
              <Btn variant="ghost" onClick={() => { setModal(null); setSaveError(""); }}>Annuler</Btn>
              <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
            </>}>
            {saveError && (
              <div style={{ background: "rgba(227,93,91,.10)", border: "1px solid #e35d5b", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#c0392b", fontSize: 13, fontWeight: 600 }}>
                <i className="ti ti-alert-triangle" /> {saveError}
              </div>
            )}
            <div className="fld"><label>Nom *</label><input value={form.nom || ""} onChange={e => setForm({ ...form, nom: e.target.value })} autoFocus /></div>
            <div className="fld" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label>Code</label><input value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PERF, OXY, PPC..." style={{ fontFamily: "Consolas,monospace" }} /></div>
              <div><label>Actif</label><select value={form.actif !== false ? "1" : "0"} onChange={e => setForm({ ...form, actif: e.target.value === "1" })}><option value="1">Actif</option><option value="0">Inactif</option></select></div>
            </div>
            <div className="fld"><label>Description</label><textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

            <div className="fld">
              <label>Icône</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(46px,1fr))", gap: 4 }}>
                {ICONES.map(ic => (
                  <button key={ic} onClick={() => setForm({ ...form, icone: ic })} style={{
                    aspectRatio: "1", border: `2px solid ${form.icone === ic ? form.couleur : "transparent"}`,
                    background: form.icone === ic ? `${form.couleur}22` : "#fafbfc",
                    color: form.icone === ic ? form.couleur : "#5a6878",
                    borderRadius: 8, fontSize: 18, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <i className={`ti ${ic}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="fld">
              <label>Couleur</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COULEURS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, couleur: c })} title={c} style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: c, border: `3px solid ${form.couleur === c ? "#142131" : "transparent"}`,
                    cursor: "pointer",
                  }} />
                ))}
                <input type="color" value={form.couleur || "#185FA5"} onChange={e => setForm({ ...form, couleur: e.target.value })} style={{ width: 34, height: 34, border: "1px solid #cfd8e0", borderRadius: 8, cursor: "pointer" }} />
              </div>
            </div>

            <div className="fld"><label>Protocole court (1-2 lignes)</label><textarea value={form.protocole_court || ""} onChange={e => setForm({ ...form, protocole_court: e.target.value })} rows={2} placeholder="Résumé du protocole" /></div>
            <div className="fld"><label>Protocole détaillé</label><textarea value={form.protocole_detail || ""} onChange={e => setForm({ ...form, protocole_detail: e.target.value })} rows={4} placeholder="Étapes complètes, posologies, fréquences..." /></div>
            <div className="fld"><label>Alertes (point de vigilance)</label><textarea value={form.alertes || ""} onChange={e => setForm({ ...form, alertes: e.target.value })} rows={2} placeholder="⚠ Contre-indications, surveillance particulière..." style={{ borderLeft: "3px solid #e35d5b" }} /></div>
          </Modal>
        )}
      </div>
    </div>
  );
}
