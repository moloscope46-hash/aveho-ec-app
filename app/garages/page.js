"use client";
// =============================================================
//  /garages — Gestion des garages (parkings, ateliers, dépôts logistiques) — 0.62.16
//  Côté EC : créer/lister/éditer ses garages où sont stationnés les véhicules
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const TYPES = [
  { v: "garage",           l: "🏠 Garage",            col: "#185FA5" },
  { v: "parking",          l: "🅿️ Parking",           col: "#7CC8C8" },
  { v: "atelier",          l: "🔧 Atelier mécanique", col: "#EF9F27" },
  { v: "depot_logistique", l: "📦 Dépôt logistique",  col: "#5e4a8c" },
];

export default function GaragesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [garages, setGarages] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    setTableMissing(false);
    try {
      const r = await supabase.from("garages").select("*").eq("structure_id", auth.structureId).order("nom");
      if (r.error) {
        if (r.error.code === "42P01" || /relation.*does not exist/i.test(r.error.message || "")) {
          setTableMissing(true);
        }
        setGarages([]);
      } else {
        setGarages(r.data || []);
      }
      const rv = await supabase.from("vehicules").select("id, nom, immatriculation, garage_id, statut").eq("structure_id", auth.structureId);
      setVehicules(rv.data || []);
    } catch (e) {
      console.error("[garages]", e);
    }
    setLoading(false);
  }

  function openNew() {
    setForm({ type: "garage", actif: true });
    setModal("new");
    setErr("");
  }
  function openEdit(g) {
    setForm({ ...g });
    setModal(g);
    setErr("");
  }

  async function save() {
    setErr("");
    if (!form.nom?.trim()) { setErr("Nom obligatoire"); return; }
    try {
      const payload = {
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        capacite: form.capacite ? parseInt(form.capacite, 10) : null,
        type: form.type || "garage",
        telephone: form.telephone || null,
        responsable: form.responsable || null,
        horaires: form.horaires || null,
        notes: form.notes || null,
        actif: form.actif !== false,
        etablissement_id: form.etablissement_id || null,
        magasin_id: form.magasin_id || null,
      };
      let r;
      if (modal === "new") {
        r = await supabase.from("garages").insert({ ...payload, created_by: auth.user?.id });
      } else {
        r = await supabase.from("garages").update({ ...payload, updated_by: auth.user?.id, updated_at: new Date().toISOString() }).eq("id", modal.id);
      }
      if (r.error) throw r.error;
      setModal(null);
      reload();
    } catch (e) {
      console.error("[garage save]", e);
      setErr(e.message || JSON.stringify(e));
    }
  }

  async function del(g) {
    if (!confirm(`Supprimer le garage "${g.nom}" ?`)) return;
    // Détacher les véhicules d'abord
    await supabase.from("vehicules").update({ garage_id: null }).eq("garage_id", g.id);
    await supabase.from("garages").delete().eq("id", g.id);
    reload();
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-parking" title="Garages & parkings" subtitle="Lieux de stationnement et d'entretien des véhicules" />
          <Btn variant="primary" icon="ti-plus" onClick={openNew} disabled={tableMissing}>Nouveau garage</Btn>
        </div>

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13, lineHeight: 1.6 }}>
              ⚠ La table <code>garages</code> n'existe pas encore dans ta base.<br/>
              Applique <a href="/sql/migration-0.62.16-garages.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.16-garages.sql</a> dans Supabase SQL Editor puis rafraîchis cette page.
            </div>
          </Panel>
        )}

        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : garages.length === 0 && !tableMissing ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-parking" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucun garage encore.<br/>
              <span style={{ fontSize: 11 }}>Click "Nouveau garage" pour commencer.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
              {garages.map(g => {
                const typeMeta = TYPES.find(t => t.v === g.type) || TYPES[0];
                const vehsCount = vehicules.filter(v => v.garage_id === g.id).length;
                return (
                  <div key={g.id} onClick={() => openEdit(g)} style={{
                    background: "#fff", border: `1px solid ${typeMeta.col}33`,
                    borderLeft: `4px solid ${typeMeta.col}`,
                    borderRadius: 10, padding: 14, cursor: "pointer",
                    opacity: g.actif === false ? 0.6 : 1,
                  }}>
                    <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>
                      <i className="ti ti-parking" style={{ color: typeMeta.col, marginRight: 6 }} />
                      {g.nom}
                    </div>
                    <div style={{ fontSize: 11.5, color: typeMeta.col, fontWeight: 600, marginTop: 2 }}>{typeMeta.l}</div>
                    {g.ville && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 5 }}>📍 {g.ville}{g.code_postal ? ` (${g.code_postal})` : ""}</div>}
                    {g.adresse && <div style={{ fontSize: 10.5, color: "#8a98a8" }}>{g.adresse}</div>}
                    {g.telephone && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 3 }}>📞 {g.telephone}</div>}
                    {g.responsable && <div style={{ fontSize: 11, color: "#5a6878" }}>👤 {g.responsable}</div>}
                    {g.horaires && <div style={{ fontSize: 10.5, color: "#5a6878", fontStyle: "italic", marginTop: 2 }}>🕐 {g.horaires}</div>}
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f3f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#5a6878" }}>
                        🚗 <b style={{ color: "#142131" }}>{vehsCount}</b> véhicule(s)
                        {g.capacite && <span style={{ color: "#8a98a8" }}> / {g.capacite}</span>}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); del(g); }} style={{ background: "transparent", color: "#e35d5b", border: "1px solid #cfd8e0", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Modal création/édition */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal === "new" ? "Nouveau garage" : `Éditer ${modal.nom}`}
            actions={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={save}>Enregistrer</Btn>
              </>
            }>
            {err && <div style={{ padding: 10, background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", borderRadius: 6, color: "#e35d5b", fontSize: 12, marginBottom: 12 }}>❌ {err}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}><b>Nom *</b>
                <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Garage central, Atelier mécanique..." style={inp} autoFocus />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Type
                <select value={form.type || "garage"} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inp}>
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Capacité
                <input type="number" value={form.capacite || ""} onChange={(e) => setForm({ ...form, capacite: e.target.value })} placeholder="Nb véhicules" style={inp} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Adresse
                <input value={form.adresse || ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="12 rue de l'industrie" style={inp} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Code postal
                <input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} style={inp} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Ville
                <input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} style={inp} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Téléphone
                <input value={form.telephone || ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inp} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Responsable
                <input value={form.responsable || ""} onChange={(e) => setForm({ ...form, responsable: e.target.value })} style={inp} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Horaires
                <input value={form.horaires || ""} onChange={(e) => setForm({ ...form, horaires: e.target.value })} placeholder="Lun-Ven 8h-18h, Sam 9h-12h" style={inp} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Notes
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inp, minHeight: 60 }} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878", display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                Actif
              </label>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

const inp = {
  width: "100%", padding: "8px 10px", marginTop: 4,
  border: "1px solid #cfd8e0", borderRadius: 6,
  fontFamily: "inherit", fontSize: 13,
};
