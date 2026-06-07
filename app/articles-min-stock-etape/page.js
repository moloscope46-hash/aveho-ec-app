"use client";
// =============================================================
//  /articles-min-stock-etape — Min stock par bâtiment/service/dépôt (0.62.24)
//  Permet de définir des seuils précis selon la localisation
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

export default function ArticlesMinStockEtapePage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [seuils, setSeuils] = useState([]);
  const [articles, setArticles] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; if (r.error?.code === "42P01") setTableMissing(true); return r.data || []; } catch { return []; } };
    const [s, a, e, b, sv, d] = await Promise.all([
      tryFetch(supabase.from("articles_min_stock_etape").select("*").eq("structure_id", auth.structureId).order("created_at", { ascending: false })),
      tryFetch(supabase.from("articles").select("id, libelle, code").eq("structure_id", auth.structureId).order("libelle").limit(500)),
      tryFetch(supabase.from("etablissements").select("id, nom").eq("structure_id", auth.structureId)),
      tryFetch(supabase.from("batiments").select("id, nom, etablissement_id")),
      tryFetch(supabase.from("services").select("id, nom, batiment_id")),
      tryFetch(supabase.from("depots").select("id, nom, etablissement_id")),
    ]);
    setSeuils(s); setArticles(a); setEtabs(e); setBatiments(b); setServices(sv); setDepots(d);
    setLoading(false);
  }

  function openNew() {
    setForm({ article_id: "", etablissement_id: "", batiment_id: "", service_id: "", depot_id: "", stock_min: 0, stock_max: null, notes: "" });
    setModal("new");
  }
  function openEdit(s) { setForm({ ...s }); setModal(s); }

  async function save() {
    if (!form.article_id) { alert("Article obligatoire"); return; }
    const payload = {
      structure_id: auth.structureId,
      article_id: form.article_id,
      etablissement_id: form.etablissement_id || null,
      batiment_id: form.batiment_id || null,
      service_id: form.service_id || null,
      depot_id: form.depot_id || null,
      stock_min: parseInt(form.stock_min) || 0,
      stock_max: form.stock_max ? parseInt(form.stock_max) : null,
      notes: form.notes || null,
      actif: true,
    };
    try {
      let r;
      if (modal === "new") r = await supabase.from("articles_min_stock_etape").insert(payload);
      else r = await supabase.from("articles_min_stock_etape").update(payload).eq("id", modal.id);
      if (r.error) throw r.error;
      setModal(null); reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  async function del(s) {
    if (!confirm("Supprimer ce seuil ?")) return;
    await supabase.from("articles_min_stock_etape").delete().eq("id", s.id);
    reload();
  }

  const articleName = (id) => articles.find(a => a.id === id)?.libelle || "—";
  const batName = (id) => batiments.find(b => b.id === id)?.nom || "—";
  const servName = (id) => services.find(s => s.id === id)?.nom || "—";
  const depotName = (id) => depots.find(d => d.id === id)?.nom || "—";

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px" }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-stack-2" title="Min stock par étape" subtitle="Seuils précis par bâtiment / service / dépôt" />
          <Btn variant="primary" icon="ti-plus" onClick={openNew} disabled={tableMissing}>Nouveau seuil</Btn>
        </div>

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13 }}>
              ⚠ Table <code>articles_min_stock_etape</code> manquante. Applique <a href="/sql/migration-0.62.23-code-etab-stock-reception.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.23-code-etab-stock-reception.sql</a>.
            </div>
          </Panel>
        )}

        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : seuils.length === 0 && !tableMissing ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-stack-pop" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucun seuil configuré. Click "Nouveau seuil" pour en créer un.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {seuils.map(s => (
                <div key={s.id} style={{
                  background: "#fff", border: "1px solid #e3e9ee",
                  borderLeft: "4px solid #5a8f8f",
                  borderRadius: 8, padding: 10,
                  display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 100px 80px", gap: 10, alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{articleName(s.article_id)}</div>
                    <div style={{ fontSize: 10.5, color: "#8a98a8" }}>
                      {s.batiment_id && <>Bât. {batName(s.batiment_id)} · </>}
                      {s.service_id && <>Svc {servName(s.service_id)} · </>}
                      {s.depot_id && <>Dépôt {depotName(s.depot_id)}</>}
                      {!s.batiment_id && !s.service_id && !s.depot_id && "Tout étab"}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#8a98a8" }}>Min</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#e35d5b" }}>{s.stock_min}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#8a98a8" }}>Max</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#5aa05a" }}>{s.stock_max || "—"}</div>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#5a6878", fontStyle: "italic" }}>{s.notes || ""}</div>
                  <button onClick={() => openEdit(s)} style={{ background: "#185FA5", color: "#fff", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Éditer</button>
                  <button onClick={() => del(s)} style={{ background: "transparent", color: "#e35d5b", border: "1px solid #cfd8e0", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>×</button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal === "new" ? "Nouveau seuil min stock" : "Éditer seuil"}
            actions={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={save}>Enregistrer</Btn>
              </>
            }>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}><b>Article *</b>
                <select value={form.article_id || ""} onChange={(e) => setForm({ ...form, article_id: e.target.value })} style={inp}>
                  <option value="">— Choisir —</option>
                  {articles.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Établissement
                <select value={form.etablissement_id || ""} onChange={(e) => setForm({ ...form, etablissement_id: e.target.value })} style={inp}>
                  <option value="">— Tous —</option>
                  {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Bâtiment
                <select value={form.batiment_id || ""} onChange={(e) => setForm({ ...form, batiment_id: e.target.value })} style={inp}>
                  <option value="">— Tous —</option>
                  {batiments.filter(b => !form.etablissement_id || b.etablissement_id === form.etablissement_id).map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Service
                <select value={form.service_id || ""} onChange={(e) => setForm({ ...form, service_id: e.target.value })} style={inp}>
                  <option value="">— Tous —</option>
                  {services.filter(sv => !form.batiment_id || sv.batiment_id === form.batiment_id).map(sv => <option key={sv.id} value={sv.id}>{sv.nom}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Dépôt
                <select value={form.depot_id || ""} onChange={(e) => setForm({ ...form, depot_id: e.target.value })} style={inp}>
                  <option value="">— Aucun —</option>
                  {depots.filter(d => !form.etablissement_id || d.etablissement_id === form.etablissement_id).map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}><b>Stock min *</b>
                <input type="number" min="0" value={form.stock_min || 0} onChange={(e) => setForm({ ...form, stock_min: e.target.value })} style={inp} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Stock max
                <input type="number" min="0" value={form.stock_max || ""} onChange={(e) => setForm({ ...form, stock_max: e.target.value })} style={inp} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Notes
                <input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inp} placeholder="ex: stock critique chirurgie" />
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
