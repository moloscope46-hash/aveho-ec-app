"use client";
// =============================================================
//  /familles-articles — Familles / sous-familles / sous-sous-familles (0.62.20)
//  Côté EC et magasin : hiérarchie 3 niveaux pour ranger les articles
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useMagasinContext } from "../../lib/useMagasinContext";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, Modal } from "../ui";
import BackButton from "../components/BackButton";

const ICONES = ["ti-folder", "ti-package", "ti-pill", "ti-stethoscope", "ti-bandage", "ti-droplet", "ti-air-conditioning", "ti-tool", "ti-armchair", "ti-bed", "ti-test-pipe", "ti-shield", "ti-shopping-bag", "ti-truck", "ti-receipt"];
const COULEURS = ["#185FA5", "#7CC8C8", "#EF9F27", "#7a6fb0", "#5aa05a", "#e35d5b", "#5a4a90", "#5a8f8f", "#C9867F"];

export default function FamillesArticlesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  // 0.62.21 : Si user magasin → familles filtrées par magasin_id
  const magasinCtx = useMagasinContext();
  const [familles, setFamilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [tableMissing, setTableMissing] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    reload();
  }, [auth.ready, auth.structureId]);

  async function reload() {
    setLoading(true);
    setTableMissing(false);
    try {
      // 0.62.21 : Filtre par magasin si user magasin
      let q = supabase.from("familles_articles").select("*").eq("structure_id", auth.structureId);
      if (magasinCtx.isUserMagasin && magasinCtx.magasinId) {
        q = q.or(`magasin_id.eq.${magasinCtx.magasinId},magasin_id.is.null`);
      }
      q = q.order("ordre").order("nom");
      const r = await q;
      if (r.error) {
        if (r.error.code === "42P01") setTableMissing(true);
        setFamilles([]);
      } else {
        setFamilles(r.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function openNew(parentId = null, niveau = 1) {
    setForm({
      parent_id: parentId,
      niveau,
      nom: "", code: "", description: "",
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
      icone: "ti-folder",
      actif: true,
    });
    setErr("");
    setModal("new");
  }

  function openEdit(f) {
    setForm({ ...f });
    setErr("");
    setModal(f);
  }

  async function save() {
    setErr("");
    if (!form.nom?.trim()) { setErr("Nom obligatoire"); return; }
    try {
      const payload = {
        structure_id: auth.structureId,
        // 0.62.21 : Si user magasin → famille rattachée au magasin
        magasin_id: magasinCtx.isUserMagasin ? (magasinCtx.magasinId || null) : null,
        parent_id: form.parent_id || null,
        niveau: form.niveau || 1,
        nom: form.nom.trim(),
        code: form.code || null,
        description: form.description || null,
        couleur: form.couleur || "#185FA5",
        icone: form.icone || "ti-folder",
        ordre: form.ordre || 0,
        actif: form.actif !== false,
      };
      let r;
      if (modal === "new") {
        r = await supabase.from("familles_articles").insert({ ...payload, created_by: auth.user?.id });
      } else {
        r = await supabase.from("familles_articles").update(payload).eq("id", modal.id);
      }
      if (r.error) throw r.error;
      setModal(null);
      reload();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function del(f) {
    const enfants = familles.filter(x => x.parent_id === f.id);
    if (enfants.length > 0) {
      if (!confirm(`Cette famille a ${enfants.length} sous-famille(s) qui seront aussi supprimées. Confirmer ?`)) return;
    } else {
      if (!confirm(`Supprimer "${f.nom}" ?`)) return;
    }
    await supabase.from("familles_articles").delete().eq("id", f.id);
    reload();
  }

  // Construire l'arbre
  const racines = familles.filter(f => !f.parent_id);
  const childrenOf = (id) => familles.filter(f => f.parent_id === id);

  function renderNode(f, depth = 0) {
    const children = childrenOf(f.id);
    const isExpanded = expanded[f.id] !== false;
    return (
      <div key={f.id} style={{ marginLeft: depth * 20 }}>
        <div style={{
          background: "#fff", border: `1px solid ${f.couleur}33`,
          borderLeft: `4px solid ${f.couleur}`,
          borderRadius: 8, padding: 10, marginBottom: 6,
          display: "flex", alignItems: "center", gap: 10,
          opacity: f.actif === false ? 0.5 : 1,
        }}>
          {children.length > 0 && (
            <button onClick={() => setExpanded({ ...expanded, [f.id]: !isExpanded })} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, color: f.couleur, fontSize: 16 }}>
              <i className={isExpanded ? "ti ti-chevron-down" : "ti ti-chevron-right"} />
            </button>
          )}
          <div style={{ width: 32, height: 32, background: `${f.couleur}1A`, color: f.couleur, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className={`ti ${f.icone || "ti-folder"}`} />
          </div>
          <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => openEdit(f)}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>
              {f.nom}
              {f.code && <span style={{ marginLeft: 6, fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8", padding: "1px 5px", background: "#f0f3f6", borderRadius: 3 }}>{f.code}</span>}
            </div>
            {f.description && <div style={{ fontSize: 10.5, color: "#5a6878", marginTop: 1 }}>{f.description}</div>}
            <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 2 }}>
              Niveau {f.niveau} · {children.length} sous-famille(s)
            </div>
          </div>
          {f.niveau < 3 && (
            <button onClick={() => openNew(f.id, f.niveau + 1)} title={`Ajouter sous-${f.niveau === 1 ? "famille" : "sous-famille"}`}
              style={{ background: `${f.couleur}15`, color: f.couleur, border: `1px solid ${f.couleur}40`, borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 700 }}>
              <i className="ti ti-plus" /> {f.niveau === 1 ? "Sous-fam." : "S/S-fam."}
            </button>
          )}
          <button onClick={() => del(f)} title="Supprimer" style={{ background: "transparent", color: "#e35d5b", border: "1px solid #cfd8e0", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
            <i className="ti ti-trash" />
          </button>
        </div>
        {isExpanded && children.map(c => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="page-content" style={{ padding: "20px 24px", maxWidth: 1000 }}>
        <BackButton />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <PageHead icon="ti-categories" title="Familles d'articles" subtitle="Hiérarchie 3 niveaux pour ranger ton catalogue" />
          <Btn variant="primary" icon="ti-plus" onClick={() => openNew(null, 1)} disabled={tableMissing}>Nouvelle famille</Btn>
        </div>

        {tableMissing && (
          <Panel style={{ marginTop: 12, borderLeft: "4px solid #e35d5b", background: "rgba(227,93,91,.06)" }}>
            <div style={{ color: "#c0392b", fontSize: 13, lineHeight: 1.6 }}>
              ⚠ La table <code>familles_articles</code> n'existe pas encore.<br/>
              Applique <a href="/sql/migration-0.62.20-familles-articles-garages-magasin.sql" target="_blank" style={{ color: "#185FA5", fontWeight: 700 }}>migration-0.62.20-familles-articles-garages-magasin.sql</a> dans Supabase SQL Editor.
            </div>
          </Panel>
        )}

        <Panel style={{ marginTop: 12 }}>
          {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
            : racines.length === 0 && !tableMissing ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
              <i className="ti ti-folder-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
              Aucune famille. Click "Nouvelle famille" pour commencer.
            </div>
          ) : (
            <div>{racines.map(f => renderNode(f, 0))}</div>
          )}
        </Panel>

        {/* Modal */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal === "new" ? `Nouvelle ${form.niveau === 1 ? "famille" : form.niveau === 2 ? "sous-famille" : "sous-sous-famille"}` : `Éditer ${modal.nom}`}
            actions={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={save}>Enregistrer</Btn>
              </>
            }>
            {err && <div style={{ padding: 10, background: "rgba(227,93,91,.10)", borderLeft: "3px solid #e35d5b", borderRadius: 6, color: "#e35d5b", fontSize: 12, marginBottom: 12 }}>❌ {err}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}><b>Nom *</b>
                <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Perfusion, Nutrition, Cicatrisation…" style={inp} autoFocus />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Code (court)
                <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PERF" style={{ ...inp, fontFamily: "Consolas,monospace" }} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Niveau
                <input value={form.niveau || 1} disabled style={{ ...inp, background: "#f4f7fa" }} />
              </label>
              <label style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5a6878" }}>Description
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inp, minHeight: 50 }} />
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Couleur
                <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                  {COULEURS.map(c => (
                    <div key={c} onClick={() => setForm({ ...form, couleur: c })}
                      style={{ width: 28, height: 28, background: c, borderRadius: 6, cursor: "pointer", border: form.couleur === c ? "3px solid #142131" : "1px solid #cfd8e0" }} />
                  ))}
                </div>
              </label>
              <label style={{ fontSize: 12, color: "#5a6878" }}>Icône
                <select value={form.icone || "ti-folder"} onChange={(e) => setForm({ ...form, icone: e.target.value })} style={inp}>
                  {ICONES.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
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
