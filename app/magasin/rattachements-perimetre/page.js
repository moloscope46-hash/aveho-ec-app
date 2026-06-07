"use client";
// =============================================================
//  /magasin/rattachements-perimetre — Gestion rattachements magasin ↔ étab/bât/svc/dépôt (0.62.11)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";
import { MagasinRattachementCheck } from "../../components/MagasinRattachementCheck";

export default function RattachementsPerimetrePage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [rattachements, setRattachements] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    if (!magasinCtx.magasinId) { setLoading(false); return; }
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [r, e, b, s, d] = await Promise.all([
      tryFetch(supabase.from("magasins_rattachements").select("*").eq("magasin_id", magasinCtx.magasinId).order("created_at", { ascending: false })),
      tryFetch(supabase.from("etablissements").select("id, nom, ville").order("nom")),
      tryFetch(supabase.from("batiments").select("id, nom, etablissement_id").order("nom")),
      tryFetch(supabase.from("services").select("id, nom, batiment_id").order("nom")),
      tryFetch(supabase.from("depots").select("id, nom, etablissement_id").order("nom")),
    ]);
    setRattachements(r); setEtabs(e); setBatiments(b); setServices(s); setDepots(d);
    setLoading(false);
  }

  function openNew() {
    setForm({ etablissement_id: "", batiment_id: "", service_id: "", depot_id: "", actif: true, notes: "" });
    setModal({ mode: "create" });
  }

  function openEdit(r) {
    setForm({ ...r });
    setModal({ mode: "edit", data: r });
  }

  async function save() {
    if (!form.etablissement_id && !form.depot_id) {
      alert("Choisis au moins un établissement ou un dépôt");
      return;
    }
    try {
      const payload = {
        magasin_id: magasinCtx.magasinId,
        etablissement_id: form.etablissement_id || null,
        batiment_id: form.batiment_id || null,
        service_id: form.service_id || null,
        depot_id: form.depot_id || null,
        actif: form.actif !== false,
        notes: form.notes || null,
      };
      if (modal?.mode === "edit") {
        const r = await supabase.from("magasins_rattachements").update(payload).eq("id", modal.data.id);
        if (r.error) throw r.error;
      } else {
        payload.created_by = auth.user?.id;
        const r = await supabase.from("magasins_rattachements").insert(payload);
        if (r.error) throw r.error;
      }
      setModal(null);
      await reload();
    } catch (e) {
      console.error("[rattachement save]", e);
      alert("❌ Erreur : " + (e.message || JSON.stringify(e)));
    }
  }

  async function del(r) {
    if (!confirm("Supprimer ce rattachement ?")) return;
    await supabase.from("magasins_rattachements").delete().eq("id", r.id);
    reload();
  }

  async function toggleActif(r) {
    await supabase.from("magasins_rattachements").update({ actif: !r.actif }).eq("id", r.id);
    reload();
  }

  const batsForEtab = form.etablissement_id ? batiments.filter(b => b.etablissement_id === form.etablissement_id) : [];
  const svcsForBat = form.batiment_id ? services.filter(s => s.batiment_id === form.batiment_id) : [];
  const depotsForEtab = form.etablissement_id ? depots.filter(d => d.etablissement_id === form.etablissement_id) : depots;

  const etabName = (id) => etabs.find(e => e.id === id)?.nom || "—";
  const batName = (id) => batiments.find(b => b.id === id)?.nom || "—";
  const svcName = (id) => services.find(s => s.id === id)?.nom || "—";
  const depotName = (id) => depots.find(d => d.id === id)?.nom || "—";

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <MagasinRattachementCheck />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-link" title="Rattachements périmètre" subtitle="À quels étabs / bât / services / dépôts mon magasin intervient" />
            <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouveau rattachement</Btn>
          </div>

          <Panel style={{ marginTop: 14, background: "rgba(122,111,176,.06)", borderLeft: "4px solid #7a6fb0", padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "#5a6878", lineHeight: 1.5 }}>
              <b>💡 À quoi ça sert :</b> définir où ton magasin intervient (étab partenaire entier, ou bâtiment précis, ou service précis, ou un dépôt). La <b>TopBar du user magasin filtre automatiquement</b> les bâtiments/services en fonction. Tu peux laisser le bâtiment/service vide pour rattacher l'étab entier.
            </div>
          </Panel>

          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>Mes rattachements ({rattachements.length})</h3>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
              : rattachements.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-link-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                Aucun rattachement encore.<br/>
                <span style={{ fontSize: 11 }}>Click sur "Nouveau rattachement" pour commencer.</span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {rattachements.map(r => (
                  <div key={r.id} style={{
                    background: "#fff", border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${r.actif ? "#5aa05a" : "#cfd8e0"}`,
                    borderRadius: 10, padding: 14,
                    opacity: r.actif ? 1 : 0.6,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        {r.etablissement_id && (
                          <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>
                            <i className="ti ti-building-hospital" style={{ color: "#185FA5", marginRight: 4 }} />
                            {etabName(r.etablissement_id)}
                          </div>
                        )}
                        {r.batiment_id && (
                          <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 3 }}>
                            <i className="ti ti-building" style={{ color: "#7a6fb0", marginRight: 4 }} />
                            {batName(r.batiment_id)}
                          </div>
                        )}
                        {r.service_id && (
                          <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 3 }}>
                            <i className="ti ti-stethoscope" style={{ color: "#7CC8C8", marginRight: 4 }} />
                            {svcName(r.service_id)}
                          </div>
                        )}
                        {r.depot_id && (
                          <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 3 }}>
                            <i className="ti ti-building-warehouse" style={{ color: "#5a8f8f", marginRight: 4 }} />
                            Dépôt : {depotName(r.depot_id)}
                          </div>
                        )}
                        {r.notes && <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 6, fontStyle: "italic" }}>{r.notes}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f3f6" }}>
                      <button onClick={() => toggleActif(r)} style={{ flex: 1, padding: "5px 8px", background: r.actif ? "rgba(94,160,90,.15)" : "rgba(207,216,224,.3)", color: r.actif ? "#5aa05a" : "#5a6878", border: "1px solid", borderColor: r.actif ? "rgba(94,160,90,.3)" : "#cfd8e0", borderRadius: 5, fontSize: 10.5, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                        {r.actif ? "✓ Actif" : "⊘ Inactif"}
                      </button>
                      <button onClick={() => openEdit(r)} style={{ padding: "5px 10px", background: "transparent", color: "#185FA5", border: "1px solid #cfd8e0", borderRadius: 5, cursor: "pointer", fontSize: 10.5, fontFamily: "inherit" }}>
                        <i className="ti ti-edit" />
                      </button>
                      <button onClick={() => del(r)} style={{ padding: "5px 10px", background: "transparent", color: "#e35d5b", border: "1px solid #cfd8e0", borderRadius: 5, cursor: "pointer", fontSize: 10.5, fontFamily: "inherit" }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Modal création/édition */}
          {modal && (
            <Modal open={!!modal} onClose={() => setModal(null)} kind="patient" title={modal.mode === "edit" ? "Modifier rattachement" : "Nouveau rattachement"} actions={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={save}>Enregistrer</Btn>
              </>
            }>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Établissement *</b>
                  <select value={form.etablissement_id || ""} onChange={(e) => setForm({ ...form, etablissement_id: e.target.value, batiment_id: "", service_id: "" })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                    <option value="">— Choisir étab —</option>
                    {etabs.map(e => <option key={e.id} value={e.id}>{e.nom} {e.ville ? `· ${e.ville}` : ""}</option>)}
                  </select>
                </label>

                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Bâtiment</b> <span style={{ fontWeight: 400 }}>(optionnel — laisse vide pour rattacher l'étab entier)</span>
                  <select value={form.batiment_id || ""} onChange={(e) => setForm({ ...form, batiment_id: e.target.value, service_id: "" })} disabled={!form.etablissement_id} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                    <option value="">— Tous les bâtiments —</option>
                    {batsForEtab.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </label>

                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Service</b> <span style={{ fontWeight: 400 }}>(optionnel)</span>
                  <select value={form.service_id || ""} onChange={(e) => setForm({ ...form, service_id: e.target.value })} disabled={!form.batiment_id} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                    <option value="">— Tous les services —</option>
                    {svcsForBat.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </label>

                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Dépôt</b> <span style={{ fontWeight: 400 }}>(rattachement direct à un dépôt précis)</span>
                  <select value={form.depot_id || ""} onChange={(e) => setForm({ ...form, depot_id: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                    <option value="">— Aucun dépôt —</option>
                    {depotsForEtab.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </label>

                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Notes</b>
                  <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Précision sur le périmètre, contact, conditions…" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4, minHeight: 60 }} />
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5a6878" }}>
                  <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                  Actif (si décoché, ce rattachement n'apparaîtra plus dans les filtres TopBar)
                </label>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}
