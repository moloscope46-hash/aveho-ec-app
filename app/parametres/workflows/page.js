"use client";
// =============================================================
//  app/parametres/workflows/page.js (0.62.131)
//
//  Page admin pour gérer les templates de workflows réutilisables.
//  Création, édition, suppression de templates par type de ressource.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn, IconButton } from "../../ui";
import { NeonButton, EmptyState, toast } from "../../components/ui-premium";
import Modal from "../../components/Modal";

const RESOURCE_TYPES = [
  { v: "achat", l: "Demandes d'achat", ic: "ti-shopping-cart", col: "#7CC8C8" },
  { v: "commande", l: "Commandes", ic: "ti-truck", col: "#185FA5" },
  { v: "transfert", l: "Transferts", ic: "ti-transfer", col: "#5a8f8f" },
  { v: "*", l: "Tous types", ic: "ti-stack-2", col: "#7a6fb0" },
];

export default function WorkflowTemplatesPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  async function load() {
    if (!auth?.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .or(`structure_id.eq.${auth.structureId},structure_id.is.null`)
        .order("created_at");
      if (!error) setTemplates(data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [auth?.structureId]);

  function openNew() {
    setForm({
      nom: "",
      description: "",
      resource_type: "achat",
      icone: "ti-stack-2",
      couleur: "#7a6fb0",
      steps_json: [{ step_order: 1, role_label: "Cadre de santé" }, { step_order: 2, role_label: "Direction" }],
    });
    setModal({});
  }

  function openEdit(t) {
    setForm({
      ...t,
      steps_json: t.steps_json || [],
    });
    setModal(t);
  }

  function addStep() {
    setForm(f => ({
      ...f,
      steps_json: [...(f.steps_json || []), { step_order: (f.steps_json?.length || 0) + 1, role_label: "" }],
    }));
  }

  function removeStep(i) {
    setForm(f => ({
      ...f,
      steps_json: (f.steps_json || []).filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })),
    }));
  }

  async function save() {
    if (!form.nom?.trim()) { toast.error("Nom requis"); return; }
    if (!form.steps_json || form.steps_json.length === 0) { toast.error("Au moins une étape requise"); return; }
    const payload = {
      structure_id: auth.structureId,
      nom: form.nom.trim(),
      description: form.description?.trim() || null,
      resource_type: form.resource_type,
      icone: form.icone,
      couleur: form.couleur,
      steps_json: form.steps_json,
      // 0.62.134 : conditions + auto-trigger
      conditions_json: form.conditions_json || null,
      auto_trigger: !!form.auto_trigger,
      created_by: auth.user?.id,
      updated_at: new Date().toISOString(),
    };
    try {
      if (modal?.id) {
        await supabase.from("workflow_templates").update(payload).eq("id", modal.id);
      } else {
        await supabase.from("workflow_templates").insert(payload);
      }
      toast.success(`Template "${form.nom}" enregistré`);
      setModal(null);
      await load();
    } catch (e) {
      toast.error("Erreur : " + e.message);
    }
  }

  async function del(t) {
    if (!confirm(`Supprimer le template "${t.nom}" ?`)) return;
    await supabase.from("workflow_templates").delete().eq("id", t.id);
    toast.success("Template supprimé");
    await load();
  }

  if (!auth?.user) return <div className="bg-dark"><div style={{ padding: 40, color: "#fff" }}>Authentification…</div></div>;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead
          icon="ti-stack-2"
          title="Templates de workflows"
          accent="violet"
          eyebrow="PARAMÈTRES"
          sub="Configurez des workflows d'approbation réutilisables par type de ressource"
        />

        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#5a6878" }}>
              <i className="ti ti-info-circle" style={{ color: "#185FA5", marginRight: 4 }} />
              Les templates permettent de relancer rapidement le même workflow d'approbation pour différentes demandes.
            </div>
            <NeonButton variant="violet" icon="ti-plus" onClick={openNew}>Nouveau template</NeonButton>
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>Chargement…</div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon="ti-stack-2"
              title="Aucun template"
              message="Créez votre premier template de workflow d'approbation pour automatiser vos validations."
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
              {templates.map(t => {
                const rType = RESOURCE_TYPES.find(r => r.v === t.resource_type) || RESOURCE_TYPES[3];
                return (
                  <div key={t.id} style={{
                    background: "#fff",
                    border: "1px solid #e3e9ee",
                    borderLeft: `4px solid ${t.couleur || rType.col}`,
                    borderRadius: 12,
                    padding: 14,
                    display: "flex", flexDirection: "column",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <i className={`ti ${t.icone || rType.ic}`} style={{ fontSize: 22, color: t.couleur || rType.col }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#142131" }}>{t.nom}</div>
                        <div style={{ fontSize: 10, color: rType.col, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {rType.l}
                        </div>
                      </div>
                      <IconButton icon="ti-edit" color="#EF9F27" onClick={() => openEdit(t)} />
                      <IconButton icon="ti-trash" color="#e35d5b" onClick={() => del(t)} />
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 12, color: "#5a6878", marginBottom: 8 }}>{t.description}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "auto", paddingTop: 6, borderTop: "1px solid #f0f3f6" }}>
                      <span style={{ fontSize: 10, color: "#8a98a8", textTransform: "uppercase", fontWeight: 700, marginRight: 4 }}>
                        Étapes :
                      </span>
                      {(t.steps_json || []).map((s, i) => (
                        <span key={i} style={{
                          fontSize: 10,
                          background: "#eef6fc",
                          color: "#185FA5",
                          padding: "2px 6px",
                          borderRadius: 8,
                          fontWeight: 700,
                        }}>
                          {i + 1}. {s.role_label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {modal && (
        <Modal open={!!modal} onClose={() => setModal(null)} kind="default"
          title={modal?.id ? "Modifier le template" : "Nouveau template de workflow"}
          actions={<>
            <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
            <NeonButton variant="violet" icon="ti-check" onClick={save}>Enregistrer</NeonButton>
          </>}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div className="fld">
              <label>Nom *</label>
              <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Achat standard (>500€)" />
            </div>
            <div className="fld">
              <label>Description</label>
              <input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Validation à 2 niveaux..." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: 8 }}>
              <div className="fld">
                <label>Type de ressource *</label>
                <select value={form.resource_type || "achat"} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}>
                  {RESOURCE_TYPES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Icône</label>
                <input value={form.icone || ""} onChange={(e) => setForm({ ...form, icone: e.target.value })}
                  placeholder="ti-..." />
              </div>
              <div className="fld">
                <label>Couleur</label>
                <input type="color" value={form.couleur || "#7a6fb0"} onChange={(e) => setForm({ ...form, couleur: e.target.value })} />
              </div>
            </div>
            <div className="fld">
              <label>Étapes d'approbation</label>
              <div style={{ display: "grid", gap: 6 }}>
                {(form.steps_json || []).map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: 8, background: "#fafbfc", borderRadius: 8, border: "1px solid #e3e9ee" }}>
                    <span style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #185FA5, #7CC8C8)", color: "#fff", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {i + 1}
                    </span>
                    <input value={step.role_label || ""} placeholder="Ex: Cadre de santé"
                      onChange={(e) => {
                        const newSteps = [...form.steps_json];
                        newSteps[i] = { ...step, role_label: e.target.value };
                        setForm({ ...form, steps_json: newSteps });
                      }}
                      style={{ flex: 1, padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6 }} />
                    <button onClick={() => removeStep(i)}
                      style={{ background: "rgba(227,93,91,.15)", color: "#e35d5b", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                ))}
                <button onClick={addStep}
                  style={{ padding: "8px 12px", background: "rgba(124, 200, 200, .15)", color: "#1c5454", border: "1px dashed rgba(124, 200, 200, .5)", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
                  <i className="ti ti-plus" /> Ajouter une étape
                </button>
              </div>
            </div>

            {/* 0.62.134 : Conditions avancées + auto-trigger */}
            <div className="fld" style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed #e3e9ee" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-bolt" style={{ color: "#EF9F27" }} /> Conditions de déclenchement automatique
              </label>
              <div style={{
                background: "linear-gradient(135deg, rgba(239, 159, 39, .08), #fff)",
                border: "1px solid rgba(239, 159, 39, .3)",
                borderRadius: 10,
                padding: 12,
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.auto_trigger}
                    onChange={(e) => setForm({ ...form, auto_trigger: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#142131" }}>
                    Déclencher automatiquement
                  </span>
                  <span style={{ fontSize: 11, color: "#8a98a8" }}>
                    (si les conditions ci-dessous sont remplies)
                  </span>
                </label>

                {form.auto_trigger && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    {/* Montant min/max */}
                    {form.resource_type === "achat" && (
                      <>
                        <div className="fld">
                          <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
                            <i className="ti ti-currency-euro" /> Montant minimum (€)
                          </label>
                          <input type="number" min="0" step="50"
                            value={form.conditions_json?.montant_min || ""}
                            onChange={(e) => setForm({
                              ...form,
                              conditions_json: { ...(form.conditions_json || {}), montant_min: parseFloat(e.target.value) || undefined },
                            })}
                            placeholder="500"
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13 }} />
                        </div>
                        <div className="fld">
                          <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
                            <i className="ti ti-currency-euro" /> Montant maximum (€)
                          </label>
                          <input type="number" min="0" step="50"
                            value={form.conditions_json?.montant_max || ""}
                            onChange={(e) => setForm({
                              ...form,
                              conditions_json: { ...(form.conditions_json || {}), montant_max: parseFloat(e.target.value) || undefined },
                            })}
                            placeholder="5000"
                            style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13 }} />
                        </div>
                      </>
                    )}

                    {/* Fournisseur spécifique */}
                    <div className="fld" style={{ gridColumn: form.resource_type === "achat" ? "auto" : "span 2" }}>
                      <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
                        <i className="ti ti-building-warehouse" /> Fournisseur (contient...)
                      </label>
                      <input value={form.conditions_json?.fournisseur || ""}
                        onChange={(e) => setForm({
                          ...form,
                          conditions_json: { ...(form.conditions_json || {}), fournisseur: e.target.value || undefined },
                        })}
                        placeholder="Bastide, Philips..."
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13 }} />
                    </div>

                    {/* Catégorie produit */}
                    <div className="fld">
                      <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
                        <i className="ti ti-category" /> Catégorie
                      </label>
                      <input value={form.conditions_json?.categorie || ""}
                        onChange={(e) => setForm({
                          ...form,
                          conditions_json: { ...(form.conditions_json || {}), categorie: e.target.value || undefined },
                        })}
                        placeholder="Médical, EPI..."
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13 }} />
                    </div>

                    {/* Prescripteur (pour ressource liée patient) */}
                    <div className="fld">
                      <label style={{ fontSize: 10, color: "#5a6878", fontWeight: 700, textTransform: "uppercase" }}>
                        <i className="ti ti-prescription" /> Prescripteur (contient)
                      </label>
                      <input value={form.conditions_json?.prescripteur || ""}
                        onChange={(e) => setForm({
                          ...form,
                          conditions_json: { ...(form.conditions_json || {}), prescripteur: e.target.value || undefined },
                        })}
                        placeholder="Dr ..."
                        style={{ width: "100%", padding: "6px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 13 }} />
                    </div>

                    {/* Flag urgent */}
                    <div className="fld" style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "6px 8px", background: "#fff", border: "1px solid #e3e9ee", borderRadius: 6 }}>
                        <input type="checkbox"
                          checked={!!form.conditions_json?.urgent}
                          onChange={(e) => setForm({
                            ...form,
                            conditions_json: { ...(form.conditions_json || {}), urgent: e.target.checked || undefined },
                          })} />
                        <i className="ti ti-alert-triangle" style={{ color: "#EF9F27" }} />
                        <span style={{ fontSize: 12, color: "#142131", fontWeight: 600 }}>Demande marquée urgente</span>
                      </label>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 10.5, color: "#5a6878", padding: 8, background: "#fafbfc", borderRadius: 6 }}>
                  <i className="ti ti-info-circle" style={{ color: "#185FA5", marginRight: 4 }} />
                  Toutes les conditions définies doivent être <strong>simultanément remplies</strong> pour que le workflow soit déclenché automatiquement. Si aucune condition n'est définie, le template sera proposé manuellement.
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
