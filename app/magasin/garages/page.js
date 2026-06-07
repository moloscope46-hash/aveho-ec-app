"use client";
// =============================================================
//  /magasin/garages — Garages côté magasin (0.62.26)
//  Rattache des garages à des agences/magasins
//  Similar à /garages mais filtré par magasin courant
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

const TYPES_GARAGE = [
  { v: "garage",            l: "🅿️ Garage véhicules",         col: "#185FA5" },
  { v: "parking",           l: "🚗 Parking",                   col: "#5a8f8f" },
  { v: "atelier",           l: "🔧 Atelier maintenance",       col: "#EF9F27" },
  { v: "depot_logistique",  l: "🏬 Dépôt logistique",          col: "#7a6fb0" },
];

export default function MagasinGaragesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [garages, setGarages] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("tous");
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; if (r.error?.code === "42P01") setTableMissing(true); return r.data || []; } catch { return []; } };
    let gq = supabase.from("garages").select("*").eq("structure_id", auth.structureId).order("nom");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      gq = gq.or(`magasin_id.eq.${magasinCtx.magasinId},magasin_id.is.null`);
    }
    const [g, v] = await Promise.all([
      tryFetch(gq),
      tryFetch(supabase.from("vehicules_magasin").select("id, immatriculation, garage_id")),
    ]);
    setGarages(g);
    setVehicules(v);
    setLoading(false);
  }

  function openNew() {
    setForm({
      type: "garage",
      nom: "", adresse: "", ville: "", code_postal: "",
      capacite: 10, responsable: "", telephone: "", horaires: "",
      magasin_id: magasinCtx.magasinId || null,
      actif: true,
    });
    setErr("");
    setModal("new");
  }

  function openEdit(g) { setForm({ ...g }); setErr(""); setModal(g); }

  async function save() {
    setErr("");
    if (!form.nom?.trim()) { setErr("Nom obligatoire"); return; }
    try {
      const payload = {
        structure_id: auth.structureId,
        magasin_id: form.magasin_id || magasinCtx.magasinId || null,
        type: form.type || "garage",
        nom: form.nom.trim(),
        adresse: form.adresse || null,
        ville: form.ville || null,
        code_postal: form.code_postal || null,
        capacite: form.capacite ? parseInt(form.capacite) : null,
        responsable: form.responsable || null,
        telephone: form.telephone || null,
        horaires: form.horaires || null,
        actif: form.actif !== false,
      };
      let r;
      if (modal === "new") r = await supabase.from("garages").insert({ ...payload, created_by: auth.user?.id });
      else r = await supabase.from("garages").update(payload).eq("id", modal.id);
      if (r.error) throw r.error;
      setModal(null);
      reload();
    } catch (e) { setErr(e.message); }
  }

  async function del(g) {
    const nb = vehicules.filter(v => v.garage_id === g.id).length;
    if (nb > 0) {
      if (!confirm(`Ce garage contient ${nb} véhicule(s). Les véhicules ne seront PAS supprimés mais perdront leur rattachement. Confirmer ?`)) return;
    } else {
      if (!confirm(`Supprimer "${g.nom}" ?`)) return;
    }
    await supabase.from("garages").delete().eq("id", g.id);
    reload();
  }

  const filtered = filter === "tous" ? garages : garages.filter(g => g.type === filter);

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-parking" title="Garages magasin" subtitle="Rattachés à mon magasin · Véhicules + ateliers + dépôts" />
            <Btn variant="primary" icon="ti-plus" onClick={openNew} disabled={tableMissing}>Nouveau garage</Btn>
          </div>

          {tableMissing && (
            <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
              <div style={{ color: "#c0392b", fontSize: 13 }}>
                ⚠ Table <code>garages</code> manquante. Applique <a href="/sql/migration-0.62.16-garages.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.16-garages.sql</a>.
              </div>
            </Panel>
          )}

          {/* Filtre type */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 4, border: "1px solid #cfd8e0", borderRadius: 6, overflow: "hidden", width: "fit-content" }}>
              <button onClick={() => setFilter("tous")} style={{
                padding: "6px 14px", background: filter === "tous" ? "#185FA5" : "#fff",
                color: filter === "tous" ? "#fff" : "#5a6878", border: "none",
                fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>Tous ({garages.length})</button>
              {TYPES_GARAGE.map(t => (
                <button key={t.v} onClick={() => setFilter(t.v)} style={{
                  padding: "6px 14px", background: filter === t.v ? t.col : "#fff",
                  color: filter === t.v ? "#fff" : "#5a6878", border: "none",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>{t.l} ({garages.filter(g => g.type === t.v).length})</button>
              ))}
            </div>
          </Panel>

          <Panel style={{ marginTop: 12 }}>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
              : filtered.length === 0 && !tableMissing ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-parking-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucun garage.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                {filtered.map(g => {
                  const meta = TYPES_GARAGE.find(t => t.v === g.type) || TYPES_GARAGE[0];
                  const nbVeh = vehicules.filter(v => v.garage_id === g.id).length;
                  return (
                    <div key={g.id} style={{
                      background: "#fff", border: `1px solid ${meta.col}33`,
                      borderLeft: `4px solid ${meta.col}`,
                      borderRadius: 10, padding: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 40, height: 40, background: `${meta.col}22`, color: meta.col, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          <i className="ti ti-parking" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>{g.nom}</div>
                          <div style={{ fontSize: 11, color: meta.col, fontWeight: 600 }}>{meta.l}</div>
                          {g.ville && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 2 }}>📍 {g.ville}</div>}
                          {g.responsable && <div style={{ fontSize: 11, color: "#5a6878" }}>👤 {g.responsable}</div>}
                          {g.telephone && <div style={{ fontSize: 11, color: "#5a6878" }}>📞 {g.telephone}</div>}
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            {g.capacite && <span style={{ fontSize: 10, color: "#5a6878" }}><b>{g.capacite}</b> places</span>}
                            <span style={{ fontSize: 10, color: meta.col, fontWeight: 700 }}><b>{nbVeh}</b> véhicule(s)</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f3f6" }}>
                            <button onClick={() => openEdit(g)} style={{ flex: 1, background: "#185FA5", color: "#fff", border: "none", borderRadius: 5, padding: "5px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Éditer</button>
                            <button onClick={() => del(g)} style={{ background: "transparent", color: "#e35d5b", border: "1px solid #cfd8e0", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>×</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {modal && (
            <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
              title={modal === "new" ? "Nouveau garage magasin" : `Éditer ${modal.nom}`}
              actions={
                <>
                  <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                  <Btn variant="primary" onClick={save}>Enregistrer</Btn>
                </>
              }>
              {err && <div style={{ padding: 10, background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", borderRadius: 6, color: "#e35d5b", fontSize: 12, marginBottom: 12 }}>❌ {err}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}><b>Nom *</b>
                  <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex: Garage central Lyon" style={inp} autoFocus />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Type
                  <select value={form.type || "garage"} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inp}>
                    {TYPES_GARAGE.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Capacité (places)
                  <input type="number" value={form.capacite || ""} onChange={(e) => setForm({ ...form, capacite: e.target.value })} style={inp} />
                </label>
                <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Adresse
                  <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Code postal
                  <input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Ville
                  <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Responsable
                  <input value={form.responsable || ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })} style={inp} />
                </label>
                <label style={{ fontSize: 12, color: "#5a6878" }}>Téléphone
                  <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inp} />
                </label>
                <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Horaires
                  <input value={form.horaires || ""} onChange={(e) => setForm({ ...form, horaires: e.target.value })} placeholder="Lun-Ven 8h-18h" style={inp} />
                </label>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = {
  width: "100%", padding: "8px 10px", marginTop: 4,
  border: "1px solid #cfd8e0", borderRadius: 6,
  fontFamily: "inherit", fontSize: 13,
};
