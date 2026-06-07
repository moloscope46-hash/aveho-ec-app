"use client";
// =============================================================
//  /magasin/mercuriales — Mercuriales et marchés (0.61.4)
//  Le magasin crée des catalogues de prix et les rattache aux étabs
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

const TYPES = {
  mercuriale: { lbl: "📋 Mercuriale", col: "#7a6fb0" },
  marche: { lbl: "📑 Marché", col: "#185FA5" },
  devis: { lbl: "📄 Devis", col: "#EF9F27" },
  contrat: { lbl: "🤝 Contrat", col: "#5a8f8f" },
};

const STATUTS = {
  brouillon: { lbl: "Brouillon", col: "#8a98a8" },
  en_validation: { lbl: "En validation", col: "#EF9F27" },
  active: { lbl: "✓ Active", col: "#5aa05a" },
  expiree: { lbl: "⏰ Expirée", col: "#e35d5b" },
  archivee: { lbl: "📦 Archivée", col: "#7a6fb0" },
};

const empty = {
  nom: "", type_document: "mercuriale", etablissement_id: "",
  date_debut: "", date_fin: "", statut: "brouillon",
  remise_globale_pct: 0, conditions_paiement: "", conditions_livraison: "", notes: "",
};

export default function MercurialesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [mercus, setMercus] = useState([]);
  const [etabs, setEtabs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [lignes, setLignes] = useState([]);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEtab, setFilterEtab] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let q = supabase.from("mercuriales").select("*").order("date_debut", { ascending: false });
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
    else q = q.eq("structure_id", auth.structureId);
    const [m, e, a] = await Promise.all([
      tryFetch(q),
      tryFetch(supabase.from("etablissements").select("id, nom, ville").order("nom")),
      tryFetch(supabase.from("articles").select("id, libelle, code, prix_public_ht, unite").eq("est_catalogue_magasin", true)),
    ]);
    setMercus(m);
    setEtabs(e);
    setArticles(a);
    setLoading(false);
  }

  async function openCreate() {
    setForm({ ...empty, date_debut: new Date().toISOString().slice(0, 10) });
    setLignes([]);
    setEditing({ mode: "create" });
  }

  async function openEdit(m) {
    setForm({ ...empty, ...m });
    try {
      const r = await supabase.from("mercuriales_lignes").select("*").eq("mercuriale_id", m.id).order("ordre");
      setLignes(r.data || []);
    } catch { setLignes([]); }
    setEditing({ mode: "edit", data: m });
  }

  function ajouterLigne() {
    setLignes([...lignes, {
      _new: true, article_id: "", libelle: "", code: "",
      prix_unitaire_ht: 0, remise_pct: 0, prix_negocie_ht: 0,
      quantite_min: 1, unite: "unité", ordre: lignes.length + 1,
    }]);
  }

  function updateLigne(idx, updates) {
    const newLignes = [...lignes];
    newLignes[idx] = { ...newLignes[idx], ...updates };
    // Calcul prix négocié = prix * (1 - remise%)
    if (updates.prix_unitaire_ht !== undefined || updates.remise_pct !== undefined) {
      const pu = parseFloat(newLignes[idx].prix_unitaire_ht || 0);
      const r = parseFloat(newLignes[idx].remise_pct || 0);
      newLignes[idx].prix_negocie_ht = (pu * (1 - r / 100)).toFixed(2);
    }
    setLignes(newLignes);
  }

  function selectArticle(idx, articleId) {
    const art = articles.find(a => a.id === articleId);
    if (art) {
      updateLigne(idx, {
        article_id: articleId, libelle: art.libelle, code: art.code,
        unite: art.unite, prix_unitaire_ht: art.prix_public_ht || 0,
      });
    } else {
      updateLigne(idx, { article_id: articleId });
    }
  }

  function suppLigne(idx) {
    setLignes(lignes.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!form.nom.trim()) { alert("Nom obligatoire"); return; }
    setSaving(true);
    try {
      const payload = {
        magasin_id: magasinCtx.magasinId || null,
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        type_document: form.type_document,
        etablissement_id: form.etablissement_id || null,
        date_debut: form.date_debut || null,
        date_fin: form.date_fin || null,
        statut: form.statut,
        remise_globale_pct: parseFloat(form.remise_globale_pct) || 0,
        conditions_paiement: form.conditions_paiement?.trim() || null,
        conditions_livraison: form.conditions_livraison?.trim() || null,
        notes: form.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let mercuId = editing.data?.id;
      if (editing.mode === "create") {
        payload.numero = `${form.type_document.toUpperCase().slice(0,5)}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
        payload.created_by = auth.user?.id;
        const r = await supabase.from("mercuriales").insert(payload).select("id").single();
        if (r.error) throw r.error;
        mercuId = r.data.id;
      } else {
        const r = await supabase.from("mercuriales").update(payload).eq("id", mercuId);
        if (r.error) throw r.error;
      }

      // Sauvegarder les lignes (replace all)
      await supabase.from("mercuriales_lignes").delete().eq("mercuriale_id", mercuId);
      if (lignes.length > 0) {
        const lignesPayload = lignes.map((l, i) => ({
          mercuriale_id: mercuId,
          article_id: l.article_id || null,
          libelle: l.libelle || null,
          code: l.code || null,
          prix_unitaire_ht: parseFloat(l.prix_unitaire_ht) || 0,
          remise_pct: parseFloat(l.remise_pct) || 0,
          prix_negocie_ht: parseFloat(l.prix_negocie_ht) || 0,
          quantite_min: parseInt(l.quantite_min) || null,
          quantite_max: parseInt(l.quantite_max) || null,
          unite: l.unite || "unité",
          ordre: i + 1,
          notes: l.notes || null,
        }));
        await supabase.from("mercuriales_lignes").insert(lignesPayload);
      }

      setEditing(null);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function del(m) {
    if (!confirm(`Supprimer la mercuriale "${m.nom}" ?`)) return;
    await supabase.from("mercuriales_lignes").delete().eq("mercuriale_id", m.id);
    await supabase.from("mercuriales").delete().eq("id", m.id);
    await reload();
  }

  const filtered = mercus.filter(m => {
    if (filterStatut && m.statut !== filterStatut) return false;
    if (filterType && m.type_document !== filterType) return false;
    if (filterEtab && m.etablissement_id !== filterEtab) return false;
    return true;
  });

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-file-text" title="Mercuriales & Marchés" subtitle={`${mercus.length} document(s) · ${mercus.filter(m => m.statut === "active").length} actif(s)`} />
            <Btn variant="primary" icon="ti-plus" onClick={openCreate}>Nouvelle mercuriale</Btn>
          </div>

          {/* Bandeau */}
          <Panel style={{ background: "rgba(122,111,176,.08)", borderLeft: "4px solid #7a6fb0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <i className="ti ti-info-circle" style={{ color: "#7a6fb0", fontSize: 22, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: "#5a6878", lineHeight: 1.6 }}>
                Les <b>mercuriales</b> sont des catalogues de prix négociés rattachés à un établissement client.<br/>
                Une fois <b>active</b>, elle s'applique automatiquement aux commandes de cet étab.
              </div>
            </div>
          </Panel>

          {/* Filtres */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Tous types</option>
                {Object.entries(TYPES).map(([v, t]) => <option key={v} value={v}>{t.lbl}</option>)}
              </select>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Tous statuts</option>
                {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}
              </select>
              <select value={filterEtab} onChange={(e) => setFilterEtab(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Tous établissements</option>
                {etabs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
          </Panel>

          {/* Liste */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#7a6fb0" }}>📋 Mercuriales ({filtered.length})</h3>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-file-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
                Aucune mercuriale.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,360px))", gap: 12, justifyContent: "start" }}>
                {filtered.map(m => {
                  const type = TYPES[m.type_document] || TYPES.mercuriale;
                  const st = STATUTS[m.statut] || STATUTS.brouillon;
                  const etab = etabs.find(e => e.id === m.etablissement_id);
                  return (
                    <div key={m.id} onClick={() => openEdit(m)} style={{
                      background: "#fff", border: `1px solid ${type.col}33`, borderLeft: `4px solid ${type.col}`,
                      borderRadius: 10, padding: 14, cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>{m.nom}</div>
                          <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{m.numero}</div>
                        </div>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: `${st.col}15`, color: st.col, fontSize: 10.5, fontWeight: 700 }}>{st.lbl}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#5a6878", flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 6px", background: `${type.col}15`, color: type.col, borderRadius: 3, fontWeight: 700 }}>{type.lbl}</span>
                        {etab && <span>🏥 {etab.nom}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#8a98a8", marginTop: 6 }}>
                        {m.date_debut && <span>📅 {new Date(m.date_debut).toLocaleDateString("fr-FR")}</span>}
                        {m.date_fin && <span>→ {new Date(m.date_fin).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {editing && (
            <Modal title={editing.mode === "create" ? "Nouvelle mercuriale" : `Éditer ${form.nom}`}
              onClose={() => setEditing(null)}
              footer={<>
                {editing.mode === "edit" && <Btn variant="ghost" icon="ti-trash" onClick={() => { del(editing.data); setEditing(null); }} style={{ color: "#e35d5b" }}>Supprimer</Btn>}
                <Btn variant="ghost" onClick={() => setEditing(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
              </>}>
              <h4 style={{ color: "#7a6fb0", margin: "0 0 8px", fontSize: 13 }}>📄 Informations</h4>
              <div className="fld"><label>Nom *</label><input value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} autoFocus placeholder="Ex: Mercuriale Q4 2026 - CHU Lyon" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="fld">
                  <label>Type</label>
                  <select value={form.type_document} onChange={(e) => setForm({...form, type_document: e.target.value})}>
                    {Object.entries(TYPES).map(([v, t]) => <option key={v} value={v}>{t.lbl}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label>Statut</label>
                  <select value={form.statut} onChange={(e) => setForm({...form, statut: e.target.value})}>
                    {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Remise globale %</label><input type="number" step="0.01" value={form.remise_globale_pct} onChange={(e) => setForm({...form, remise_globale_pct: e.target.value})} /></div>
              </div>
              <div className="fld">
                <label>Établissement rattaché</label>
                <select value={form.etablissement_id} onChange={(e) => setForm({...form, etablissement_id: e.target.value})}>
                  <option value="">— Aucun (mercuriale générique) —</option>
                  {etabs.map(e => <option key={e.id} value={e.id}>{e.nom} {e.ville && `(${e.ville})`}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="fld"><label>Date début</label><input type="date" value={form.date_debut} onChange={(e) => setForm({...form, date_debut: e.target.value})} /></div>
                <div className="fld"><label>Date fin</label><input type="date" value={form.date_fin} onChange={(e) => setForm({...form, date_fin: e.target.value})} /></div>
              </div>

              <h4 style={{ color: "#7a6fb0", margin: "16px 0 8px", fontSize: 13 }}>📦 Lignes d'articles ({lignes.length})</h4>
              <div style={{ background: "#fafbfc", borderRadius: 8, padding: 10 }}>
                {lignes.length === 0 ? (
                  <div style={{ padding: 14, textAlign: "center", color: "#8a98a8", fontSize: 12 }}>Aucun article. Clique "Ajouter ligne" ci-dessous.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {lignes.map((l, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 28px", gap: 6, padding: 6, background: "#fff", borderRadius: 6, alignItems: "center" }}>
                        <select value={l.article_id || ""} onChange={(e) => selectArticle(idx, e.target.value)} style={{ padding: "6px 8px", border: "1px solid #cfd8e0", borderRadius: 4, fontSize: 11.5 }}>
                          <option value="">— Article —</option>
                          {articles.map(a => <option key={a.id} value={a.id}>{a.libelle} {a.code && `(${a.code})`}</option>)}
                        </select>
                        <input type="number" step="0.01" value={l.prix_unitaire_ht} onChange={(e) => updateLigne(idx, { prix_unitaire_ht: e.target.value })} placeholder="Prix" style={{ padding: "6px 8px", border: "1px solid #cfd8e0", borderRadius: 4, fontSize: 11.5, fontFamily: "Consolas,monospace" }} />
                        <input type="number" step="0.01" value={l.remise_pct} onChange={(e) => updateLigne(idx, { remise_pct: e.target.value })} placeholder="%" style={{ padding: "6px 8px", border: "1px solid #cfd8e0", borderRadius: 4, fontSize: 11.5 }} />
                        <input type="text" value={l.prix_negocie_ht} readOnly style={{ padding: "6px 8px", border: "1px solid #cfd8e0", borderRadius: 4, fontSize: 11.5, fontFamily: "Consolas,monospace", background: "rgba(94,160,90,.08)", fontWeight: 700, color: "#5aa05a" }} />
                        <button onClick={() => suppLigne(idx)} style={{ background: "transparent", border: "none", color: "#e35d5b", cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <Btn variant="ghost" icon="ti-plus" onClick={ajouterLigne} style={{ marginTop: 8, width: "100%" }}>+ Ajouter ligne</Btn>
              </div>

              <h4 style={{ color: "#7a6fb0", margin: "16px 0 8px", fontSize: 13 }}>📝 Conditions</h4>
              <div className="fld"><label>Conditions paiement</label><input value={form.conditions_paiement} onChange={(e) => setForm({...form, conditions_paiement: e.target.value})} placeholder="Ex: 30j fin de mois" /></div>
              <div className="fld"><label>Conditions livraison</label><input value={form.conditions_livraison} onChange={(e) => setForm({...form, conditions_livraison: e.target.value})} /></div>
              <div className="fld"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} /></div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}
