"use client";
// =============================================================
//  /templates-signalements — Page admin templates signalements
//  Alpha 0.53.0 (BM)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useCart } from "../useCart";
import TopBar from "../TopBar";
import { PageHead, Panel, Btn, StateMsg } from "../ui";
import { dialogs } from "../dialogs";

const TYPES = [
  { value: "Problème", color: "#e35d5b", icon: "ti-alert-triangle" },
  { value: "Idée", color: "#7CC8C8", icon: "ti-bulb" },
  { value: "Question", color: "#7a6fb0", icon: "ti-help-circle" },
  { value: "Autre", color: "#8a98a8", icon: "ti-message-circle" },
];

export default function TemplatesSignalementsPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  // Vérif droit admin
  const isAdmin = auth?.roleNom === "Administrateur" || 
                  (auth?.droits && JSON.stringify(auth.droits).includes("manage_roles"));

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const { data } = await supabase
      .from("signalement_templates")
      .select("*")
      .eq("structure_id", auth.structureId)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.structureId]);

  function openNew() {
    setForm({
      nom: "",
      type: "Problème",
      titre_modele: "",
      description_modele: "",
      icone: "ti-template",
      ordre: 100,
      actif: true,
    });
    setModal({});
  }
  function openEdit(r) { setForm({ ...r }); setModal(r); }

  async function save() {
    if (!form.nom?.trim()) {
      await dialogs.alert({ title: "Le nom du template est obligatoire" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        nom: form.nom.trim(),
        type: form.type || "Problème",
        titre_modele: form.titre_modele?.trim() || null,
        description_modele: form.description_modele?.trim() || null,
        icone: form.icone || "ti-template",
        ordre: parseInt(form.ordre) || 100,
        actif: form.actif !== false,
        cree_par: auth.user.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = modal.id
        ? await supabase.from("signalement_templates").update(payload).eq("id", modal.id)
        : await supabase.from("signalement_templates").insert(payload);
      if (error) throw error;
      setModal(null);
      await load();
    } catch (e) {
      await dialogs.alert({ title: "Erreur", message: e.message });
    }
    setBusy(false);
  }

  async function remove(r) {
    if (!await dialogs.confirm({ 
      title: `Supprimer le template "${r.nom}" ?`,
      variant: "danger"
    })) return;
    await supabase.from("signalement_templates").delete().eq("id", r.id);
    await load();
  }

  async function toggleActif(r) {
    await supabase.from("signalement_templates")
      .update({ actif: !r.actif })
      .eq("id", r.id);
    await load();
  }

  if (!isAdmin) {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <Panel><StateMsg>
            <i className="ti ti-lock" style={{ fontSize: 32, color: "#c0392b" }} /><br/>
            Accès réservé aux administrateurs.
          </StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          eyebrow="ADMIN"
          icon="ti-template"
          title="Templates de signalements"
          accent="Aveho"
          sub="Définis des modèles pré-remplis pour aider les utilisateurs à signaler plus rapidement."
        />

        <Panel style={{ marginBottom: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, color: "#6c7a89" }}>
            {rows.length} template{rows.length > 1 ? "s" : ""} 
            {rows.filter(r => !r.actif).length > 0 && (
              <span style={{ marginLeft: 6, color: "#8a98a8" }}>
                ({rows.filter(r => r.actif).length} actif{rows.filter(r => r.actif).length > 1 ? "s" : ""})
              </span>
            )}
          </div>
          <Btn variant="primary" icon="ti-plus" onClick={openNew}>Nouveau template</Btn>
        </Panel>

        {loading ? (
          <Panel><StateMsg>Chargement…</StateMsg></Panel>
        ) : rows.length === 0 ? (
          <Panel><StateMsg>
            <i className="ti ti-template" style={{ fontSize: 32, color: "#8a98a8" }} /><br/>
            Aucun template pour l'instant.<br/>
            <a style={{ color: "#185FA5", fontWeight: 600, cursor: "pointer" }} onClick={openNew}>Créer le premier</a>
          </StateMsg></Panel>
        ) : (
          <Panel>
            <div className="panel-table">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Titre modèle</th>
                    <th>Ordre</th>
                    <th>État</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const t = TYPES.find(t => t.value === r.type) || TYPES[0];
                    return (
                      <tr key={r.id} style={{ opacity: r.actif ? 1 : 0.5 }}>
                        <td>
                          <i className={`ti ${r.icone || "ti-template"}`} style={{ marginRight: 6, color: t.color }} />
                          <b>{r.nom}</b>
                        </td>
                        <td>
                          <span style={{ background: t.color + "22", color: t.color, padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                            <i className={`ti ${t.icon}`} style={{ marginRight: 3 }} /> {r.type}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "#6c7a89", maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.titre_modele || <i style={{ color: "#bbb" }}>—</i>}
                        </td>
                        <td style={{ fontSize: 12, color: "#6c7a89", textAlign: "center" }}>{r.ordre}</td>
                        <td>
                          <button onClick={() => toggleActif(r)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, fontFamily: "inherit" }}>
                            {r.actif 
                              ? <span style={{ color: "#5aa05a", fontSize: 11, fontWeight: 700 }}><i className="ti ti-toggle-right" style={{ fontSize: 18 }} /> Actif</span>
                              : <span style={{ color: "#8a98a8", fontSize: 11, fontWeight: 700 }}><i className="ti ti-toggle-left" style={{ fontSize: 18 }} /> Inactif</span>
                            }
                          </button>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button onClick={() => openEdit(r)} style={{ background: "transparent", border: "none", color: "#185FA5", cursor: "pointer", padding: 4, marginRight: 4 }} aria-label="Modifier">
                            <i className="ti ti-edit" style={{ fontSize: 16 }} />
                          </button>
                          <button onClick={() => remove(r)} style={{ background: "transparent", border: "none", color: "#c0392b", cursor: "pointer", padding: 4 }} aria-label="Supprimer">
                            <i className="ti ti-trash" style={{ fontSize: 16 }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {modal && (
          <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(null)}>
            <div className="modal" style={{ maxWidth: 540 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 17 }}>
                <i className="ti ti-template" style={{ color: "#7a6fb0", marginRight: 6 }} />
                {modal.id ? "Modifier le template" : "Nouveau template"}
              </h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Nom court *</label>
                  <input 
                    value={form.nom || ""} 
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Ex : Matériel défectueux, Suggestion d'amélioration…"
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }}
                  />
                </div>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Type</label>
                    <select value={form.type || "Problème"} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }}>
                      {TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>Ordre</label>
                    <input 
                      type="number"
                      value={form.ordre || 100} 
                      onChange={(e) => setForm({ ...form, ordre: e.target.value })}
                      style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>
                    Titre pré-rempli <span style={{ fontSize: 10.5, fontWeight: 400 }}>(optionnel)</span>
                  </label>
                  <input 
                    value={form.titre_modele || ""} 
                    onChange={(e) => setForm({ ...form, titre_modele: e.target.value })}
                    placeholder="Ex : Imprimante hors service salle X"
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6c7a89", fontWeight: 600, marginBottom: 4 }}>
                    Description pré-remplie <span style={{ fontSize: 10.5, fontWeight: 400 }}>(optionnel)</span>
                  </label>
                  <textarea 
                    value={form.description_modele || ""} 
                    onChange={(e) => setForm({ ...form, description_modele: e.target.value })}
                    rows={4}
                    placeholder="Modèle de description que l'utilisateur pourra ensuite éditer…"
                    style={{ width: "100%", padding: 8, border: "1px solid #e3e9ee", borderRadius: 6, fontFamily: "inherit", resize: "vertical" }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
                  Actif (visible dans le dropdown des signalements)
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
