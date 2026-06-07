"use client";
// =============================================================
//  /magasin/catalogue — Catalogue articles propre au magasin (0.61.4)
//  Le magasin gère sa propre liste d'articles
//  Les EC rattachent leurs articles à ceux du magasin
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
import { MagasinRattachementCheck } from "../../components/MagasinRattachementCheck";

const empty = {
  libelle: "", code: "", reference: "", unite: "unité",
  prix_public_ht: "", prix_achat_ht: "", actif: true,
  description: "", famille: "",
};

export default function CatalogueMagasinPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let q = supabase.from("v_catalogue_magasin").select("*").order("libelle");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
    else q = q.eq("structure_id", auth.structureId);
    const data = await tryFetch(q);
    setArticles(data);
    setStats({
      total: data.length,
      actifs: data.filter(a => a.actif !== false).length,
      rattaches: data.filter(a => (a.nb_etabs_rattaches || 0) > 0).length,
      en_mercu: data.filter(a => (a.nb_mercuriales_actives || 0) > 0).length,
    });
    setLoading(false);
  }

  function openCreate() { setForm({ ...empty }); setEditing({ mode: "create" }); }
  function openEdit(a) { setForm({ ...empty, ...a }); setEditing({ mode: "edit", data: a }); }

  async function save() {
    if (!form.libelle.trim()) { alert("Libellé obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        magasin_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        libelle: form.libelle.trim(),
        code: form.code?.trim() || null,
        reference: form.reference?.trim() || null,
        unite: form.unite || "unité",
        prix_public_ht: form.prix_public_ht ? parseFloat(form.prix_public_ht) : null,
        prix_achat_ht: form.prix_achat_ht ? parseFloat(form.prix_achat_ht) : null,
        description: form.description?.trim() || null,
        famille: form.famille?.trim() || null,
        est_catalogue_magasin: true,
        actif: form.actif !== false,
        updated_at: new Date().toISOString(),
      };
      if (editing.mode === "create") {
        payload.created_at = new Date().toISOString();
        const r = await supabase.from("articles").insert(payload);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("articles").update(payload).eq("id", editing.data.id);
        if (r.error) throw r.error;
      }
      setEditing(null);
      await reload();
    } catch (e) {
      console.error("[catalogue save]", e);
      alert("❌ Erreur création article :\n\n" + (e.message || JSON.stringify(e)) + "\n\nDétails console F12.");
    }
    finally { setSaving(false); }
  }

  async function del(a) {
    if (!confirm(`Supprimer "${a.libelle}" du catalogue magasin ?`)) return;
    await supabase.from("articles").delete().eq("id", a.id);
    await reload();
  }

  const filtered = articles.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (a.libelle || "").toLowerCase().includes(s) || (a.code || "").toLowerCase().includes(s);
  });

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <MagasinRattachementCheck />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-package" title="Catalogue magasin" subtitle={`${articles.length} article(s) · ${stats.rattaches} rattachés à des étabs`} />
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouvel article</Btn>
          </div>

          {/* Bandeau info */}
          <Panel style={{ background: "rgba(94,143,143,.08)", borderLeft: "4px solid #5a8f8f" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <i className="ti ti-info-circle" style={{ color: "#5a8f8f", fontSize: 22, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.6 }}>
                <b>Ce catalogue est ton catalogue magasin</b>. Tes articles peuvent être rattachés aux articles propres aux établissements (1 article étab → 1 article magasin via prix de mercuriale).
                <br/>Les <b>mercuriales</b> définissent les prix négociés par établissement.
              </div>
            </div>
          </Panel>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, marginTop: 12, justifyContent: "start" }}>
            <StatTile color="#5a8f8f" icon="ti-package" lbl="Articles total" val={stats.total || 0} />
            <StatTile color="#5aa05a" icon="ti-check" lbl="Actifs" val={stats.actifs || 0} />
            <StatTile color="#185FA5" icon="ti-link" lbl="Rattachés étab" val={stats.rattaches || 0} />
            <StatTile color="#7a6fb0" icon="ti-file-text" lbl="En mercuriale" val={stats.en_mercu || 0} />
          </div>

          {/* Recherche */}
          <Panel style={{ marginTop: 12 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Rechercher article (libellé, code)..." style={{ width: "100%", padding: "10px 14px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13.5 }} />
          </Panel>

          {/* Liste */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#5a8f8f" }}>📦 Articles ({filtered.length})</h3>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-package-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
                Aucun article dans ton catalogue magasin.
                <div style={{ fontSize: 12, marginTop: 6 }}>Crée tes premiers articles pour démarrer.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,340px))", gap: 12, justifyContent: "start" }}>
                {filtered.map(a => (
                  <div key={a.id} onClick={() => openEdit(a)} style={{
                    background: "#fff", border: "1px solid #5a8f8f33", borderLeft: "4px solid #5a8f8f",
                    borderRadius: 10, padding: 14, cursor: "pointer",
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 40, height: 40, background: "rgba(94,143,143,.15)", color: "#5a8f8f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#142131", fontSize: 13.5 }}>{a.libelle}</div>
                        {a.code && <div style={{ fontSize: 11, color: "#8a98a8", fontFamily: "Consolas,monospace" }}>{a.code}</div>}
                      </div>
                      {a.actif === false && <span style={{ padding: "2px 6px", background: "rgba(227,93,91,.15)", color: "#e35d5b", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>INACTIF</span>}
                    </div>
                    {/* Prix + stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10, padding: 6, background: "#fafbfc", borderRadius: 6, fontSize: 11 }}>
                      {a.prix_public_ht && <div>💰 {parseFloat(a.prix_public_ht).toFixed(2)} € HT</div>}
                      {a.prix_achat_ht && <div style={{ color: "#8a98a8" }}>🏷 {parseFloat(a.prix_achat_ht).toFixed(2)} € achat</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 10.5, color: "#5a6878" }}>
                      {a.nb_etabs_rattaches > 0 && <span style={{ padding: "2px 6px", background: "rgba(24,95,165,.10)", color: "#185FA5", borderRadius: 3, fontWeight: 700 }}>🔗 {a.nb_etabs_rattaches} étab(s)</span>}
                      {a.nb_mercuriales_actives > 0 && <span style={{ padding: "2px 6px", background: "rgba(122,111,176,.10)", color: "#7a6fb0", borderRadius: 3, fontWeight: 700 }}>📋 {a.nb_mercuriales_actives} mercu</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {editing && (
            <Modal title={editing.mode === "create" ? "Nouvel article catalogue" : `Éditer ${form.libelle}`}
              onClose={() => setEditing(null)}
              footer={<>
                {editing.mode === "edit" && <Btn variant="ghost" icon="ti-trash" onClick={() => { del(editing.data); setEditing(null); }} style={{ color: "#e35d5b" }}>Supprimer</Btn>}
                <Btn variant="ghost" onClick={() => setEditing(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
              </>}>
              <div className="fld"><label>Libellé *</label><input value={form.libelle} onChange={(e) => setForm({...form, libelle: e.target.value})} autoFocus /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Code</label><input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} style={{ fontFamily: "Consolas,monospace" }} /></div>
                <div className="fld"><label>Référence</label><input value={form.reference} onChange={(e) => setForm({...form, reference: e.target.value})} /></div>
                <div className="fld"><label>Unité</label><select value={form.unite} onChange={(e) => setForm({...form, unite: e.target.value})}><option>unité</option><option>boîte</option><option>kg</option><option>l</option><option>m</option><option>paire</option></select></div>
              </div>
              <div className="fld"><label>Famille / Catégorie</label><input value={form.famille} onChange={(e) => setForm({...form, famille: e.target.value})} placeholder="Ex: Perfusion, Nutrition, PPC..." /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Prix public HT (€)</label><input type="number" step="0.01" value={form.prix_public_ht} onChange={(e) => setForm({...form, prix_public_ht: e.target.value})} /></div>
                <div className="fld"><label>Prix achat HT (€)</label><input type="number" step="0.01" value={form.prix_achat_ht} onChange={(e) => setForm({...form, prix_achat_ht: e.target.value})} /></div>
              </div>
              <div className="fld"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} /></div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({...form, actif: e.target.checked})} />
                Article actif (visible et utilisable par les EC)
              </label>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ color, icon, lbl, val }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      <div>
        <div style={{ fontSize: 10, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
