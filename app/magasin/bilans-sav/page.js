"use client";
// =============================================================
//  /magasin/bilans-sav — Gestion bilans SAV côté magasin (0.60.0)
//  CRUD bilans + points de contrôle + rattachement articles
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import { MagasinSidebar } from "../../components/MagasinSidebar";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, Modal } from "../../ui";
import BackButton from "../../components/BackButton";

const TYPES_CONTROLE = [
  { v: "oui_non", l: "✓/✗ Oui/Non",     ic: "ti-checks" },
  { v: "mesure",  l: "📏 Mesure",         ic: "ti-ruler-measure" },
  { v: "texte",   l: "📝 Texte libre",    ic: "ti-note" },
  { v: "photo",   l: "📷 Photo",          ic: "ti-camera" },
];

export default function BilansSavPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const magasinCtx = useMagasinContext();
  const cart = useCart();

  const [bilans, setBilans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);  // bilan en cours d'édition
  const [points, setPoints] = useState([]);      // points du bilan en cours
  const [articles, setArticles] = useState([]);
  const [linkedArticles, setLinkedArticles] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    // 0.60.4 : Filtrage par magasin du user
    let q = supabase.from("bilans_sav").select("*").eq("structure_id", auth.structureId).order("nom");
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
      q = q.eq("magasin_id", magasinCtx.magasinId);
    }
    const data = await tryFetch(q);
    setBilans(data);
    setLoading(false);
  }

  async function openEdit(b) {
    setEditing(b);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [pts, arts, links] = await Promise.all([
      tryFetch(supabase.from("bilans_sav_points").select("*").eq("bilan_id", b.id).order("ordre")),
      tryFetch(supabase.from("articles").select("id, libelle, code, reference").eq("est_catalogue_magasin", true).limit(200)),
      tryFetch(supabase.from("bilans_sav_articles").select("article_id").eq("bilan_id", b.id)),
    ]);
    setPoints(pts.length > 0 ? pts : Array.from({ length: 5 }, (_, i) => ({ ordre: i + 1, libelle: "", type_controle: "oui_non", est_obligatoire: true })));
    setArticles(arts);
    setLinkedArticles(new Set(links.map(x => x.article_id)));
  }

  function newBilan() {
    setEditing({ nom: "", code: "", description: "", duree_estimee_min: 15, icone: "ti-clipboard-check", couleur: "#5a8f8f", actif: true });
    setPoints(Array.from({ length: 5 }, (_, i) => ({ ordre: i + 1, libelle: "", type_controle: "oui_non", est_obligatoire: true })));
    setLinkedArticles(new Set());
    // Charger articles
    (async () => {
      try {
        const r = await supabase.from("articles").select("id, libelle, code, reference").eq("est_catalogue_magasin", true).limit(200);
        setArticles(r.data || []);
      } catch {}
    })();
  }

  async function save() {
    if (!editing?.nom?.trim()) { alert("Le nom du bilan est obligatoire"); return; }
    setSaving(true);
    try {
      let bilanId = editing.id;
      if (bilanId) {
        await supabase.from("bilans_sav").update({
          nom: editing.nom, code: editing.code, description: editing.description,
          duree_estimee_min: editing.duree_estimee_min, icone: editing.icone, couleur: editing.couleur,
          actif: editing.actif !== false,
          updated_at: new Date().toISOString(),
        }).eq("id", bilanId);
      } else {
        const r = await supabase.from("bilans_sav").insert({
          structure_id: auth.structureId,
          // 0.60.4 : rattache au magasin du user
          magasin_id: magasinCtx.magasinId || null,
          nom: editing.nom, code: editing.code, description: editing.description,
          duree_estimee_min: editing.duree_estimee_min, icone: editing.icone, couleur: editing.couleur,
          actif: editing.actif !== false,
          created_by: auth.user?.id,
        }).select("id").single();
        if (r.error) throw r.error;
        bilanId = r.data.id;
      }

      // Sauvegarde points (delete + reinsert pour simplicité)
      await supabase.from("bilans_sav_points").delete().eq("bilan_id", bilanId);
      const validPoints = points.filter(p => p.libelle?.trim());
      if (validPoints.length > 0) {
        await supabase.from("bilans_sav_points").insert(
          validPoints.map((p, i) => ({
            bilan_id: bilanId,
            ordre: i + 1,
            libelle: p.libelle.trim(),
            description: p.description || null,
            type_controle: p.type_controle || "oui_non",
            unite: p.unite || null,
            valeur_min: p.valeur_min ?? null,
            valeur_max: p.valeur_max ?? null,
            est_obligatoire: p.est_obligatoire !== false,
          }))
        );
      }

      // Rattachements articles
      await supabase.from("bilans_sav_articles").delete().eq("bilan_id", bilanId);
      const linkedArr = Array.from(linkedArticles);
      if (linkedArr.length > 0) {
        await supabase.from("bilans_sav_articles").insert(
          linkedArr.map(articleId => ({ bilan_id: bilanId, article_id: articleId }))
        );
      }

      setEditing(null);
      await reload();
      alert("✓ Bilan SAV enregistré");
    } catch (e) { alert("Erreur : " + e.message); }
    finally { setSaving(false); }
  }

  async function delBilan(b) {
    if (!confirm(`Supprimer le bilan "${b.nom}" ?`)) return;
    try {
      await supabase.from("bilans_sav_points").delete().eq("bilan_id", b.id);
      await supabase.from("bilans_sav_articles").delete().eq("bilan_id", b.id);
      await supabase.from("bilans_sav").delete().eq("id", b.id);
      await reload();
    } catch (e) { alert("Erreur : " + e.message); }
  }

  function updatePoint(i, key, val) {
    const newPts = [...points];
    newPts[i] = { ...newPts[i], [key]: val };
    setPoints(newPts);
  }

  function addPoint() {
    setPoints([...points, { ordre: points.length + 1, libelle: "", type_controle: "oui_non", est_obligatoire: true }]);
  }

  function removePoint(i) {
    setPoints(points.filter((_, idx) => idx !== i));
  }

  function toggleArticle(id) {
    const newSet = new Set(linkedArticles);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setLinkedArticles(newSet);
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <BackButton />
        <PageHead icon="ti-clipboard-check" title="Bilans SAV" subtitle="Templates de contrôles techniques rattachés aux articles" />

        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: "#5a8f8f" }}>Mes bilans ({bilans.length})</h3>
            <Btn variant="primary" icon="ti-plus" onClick={newBilan}>Nouveau bilan</Btn>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
          ) : bilans.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-clipboard-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucun bilan SAV créé.<br/>
              <span style={{ fontSize: 12 }}>Crée un bilan pour définir tes points de contrôle (généralement 5 points) à rattacher à tes articles.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
              {bilans.map(b => (
                <div key={b.id} onClick={() => openEdit(b)} style={{
                  background: "#fff", border: `1px solid ${b.couleur || "#5a8f8f"}33`, borderLeft: `4px solid ${b.couleur || "#5a8f8f"}`,
                  borderRadius: 10, padding: 14, cursor: "pointer", opacity: b.actif === false ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, background: `${b.couleur || "#5a8f8f"}22`, color: b.couleur || "#5a8f8f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      <i className={`ti ${b.icone || "ti-clipboard-check"}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#142131" }}>{b.nom}</div>
                      {b.code && <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{b.code}</div>}
                    </div>
                  </div>
                  {b.description && <div style={{ fontSize: 12, color: "#5a6878", marginTop: 6 }}>{b.description}</div>}
                  <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 6 }}>
                    {b.duree_estimee_min ? `⏱ ${b.duree_estimee_min} min` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Modal édition */}
        {editing && (
          <Modal title={editing.id ? `Éditer ${editing.nom}` : "Nouveau bilan SAV"}
            onClose={() => setEditing(null)}
            footer={<>
              <Btn variant="ghost" onClick={() => setEditing(null)}>Annuler</Btn>
              {editing.id && <Btn variant="ghost" icon="ti-trash" onClick={() => delBilan(editing)} style={{ color: "#e35d5b" }}>Supprimer</Btn>}
              <Btn variant="primary" icon="ti-device-floppy" onClick={save}>{saving ? "..." : "Enregistrer"}</Btn>
            </>}>
            <div className="fld">
              <label>Nom du bilan *</label>
              <input value={editing.nom || ""} onChange={(e) => setEditing({ ...editing, nom: e.target.value })}
                placeholder="Bilan annuel concentrateur O2..." autoFocus />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld"><label>Code</label><input value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="BSV-001" style={{ fontFamily: "Consolas,monospace" }} /></div>
              <div className="fld"><label>Durée (min)</label><input type="number" value={editing.duree_estimee_min || ""} onChange={(e) => setEditing({ ...editing, duree_estimee_min: parseInt(e.target.value) || null })} /></div>
            </div>
            <div className="fld"><label>Description</label><textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>

            {/* Points de contrôle */}
            <div className="fld">
              <label>
                Points de contrôle ({points.filter(p => p.libelle?.trim()).length}/{points.length})
                <button type="button" onClick={addPoint} style={{ marginLeft: 10, background: "#5a8f8f", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>
                  <i className="ti ti-plus" /> Ajouter
                </button>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", padding: 4 }}>
                {points.map((p, i) => (
                  <div key={i} style={{ background: "#fafbfc", border: "1px solid #e3e9ee", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ width: 24, height: 24, background: "#5a8f8f", color: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                      <input value={p.libelle} onChange={(e) => updatePoint(i, "libelle", e.target.value)} placeholder="Libellé du point..." style={{ flex: 1, padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5 }} />
                      <button type="button" onClick={() => removePoint(i)} style={{ background: "transparent", border: "none", color: "#e35d5b", cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", paddingLeft: 32 }}>
                      <select value={p.type_controle} onChange={(e) => updatePoint(i, "type_controle", e.target.value)} style={{ padding: "4px 8px", fontSize: 11, fontFamily: "inherit", border: "1px solid #cfd8e0", borderRadius: 6 }}>
                        {TYPES_CONTROLE.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                      {p.type_controle === "mesure" && (
                        <>
                          <input value={p.unite || ""} onChange={(e) => updatePoint(i, "unite", e.target.value)} placeholder="Unité (bar, %...)" style={{ width: 90, padding: "4px 8px", fontSize: 11, border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit" }} />
                          <input type="number" value={p.valeur_min ?? ""} onChange={(e) => updatePoint(i, "valeur_min", parseFloat(e.target.value) || null)} placeholder="Min" style={{ width: 60, padding: "4px 8px", fontSize: 11, border: "1px solid #cfd8e0", borderRadius: 6 }} />
                          <input type="number" value={p.valeur_max ?? ""} onChange={(e) => updatePoint(i, "valeur_max", parseFloat(e.target.value) || null)} placeholder="Max" style={{ width: 60, padding: "4px 8px", fontSize: 11, border: "1px solid #cfd8e0", borderRadius: 6 }} />
                        </>
                      )}
                      <label style={{ fontSize: 11, color: "#5a6878", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <input type="checkbox" checked={p.est_obligatoire !== false} onChange={(e) => updatePoint(i, "est_obligatoire", e.target.checked)} /> Obligatoire
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Articles rattachés */}
            {articles.length > 0 && (
              <div className="fld">
                <label>Articles rattachés ({linkedArticles.size}/{articles.length})</label>
                <div style={{ maxHeight: 200, overflowY: "auto", padding: 4, background: "#fafbfc", border: "1px solid #e3e9ee", borderRadius: 8 }}>
                  {articles.map(a => {
                    const isLinked = linkedArticles.has(a.id);
                    return (
                      <div key={a.id} onClick={() => toggleArticle(a.id)} style={{
                        padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                        background: isLinked ? "rgba(94,143,143,.10)" : "transparent",
                        borderRadius: 4,
                      }}>
                        <input type="checkbox" checked={isLinked} readOnly />
                        <div style={{ flex: 1, fontSize: 12 }}>
                          <span style={{ color: "#142131", fontWeight: 600 }}>{a.libelle}</span>
                          {(a.reference || a.code) && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#8a98a8", fontFamily: "Consolas,monospace" }}>{a.reference || a.code}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 4 }}>
                  Les EC pourront sélectionner ce bilan quand ils demandent un SAV sur un de ces articles.
                </div>
              </div>
            )}
          </Modal>
        )}
        </div>
      </div>
    </div>
  );
}
