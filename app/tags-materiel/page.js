"use client";
// Page Tags matériel — Marqueurs colorés personnalisables pour le matériel.
// Architecture identique aux étiquettes patients (table tags_materiel + relation n:n).
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from "../ui";

import { dialogs } from "../dialogs";
import { safeUpdate, safeInsert, safeDelete } from "../../lib/safeWrite";
import { logger } from "../../lib/logger";
const PALETTE = ["#7CC8C8", "#7a6fb0", "#5aa05a", "#e35d5b", "#EF9F27", "#C9867F", "#185FA5", "#2a5a5a", "#142131"];

export default function TagsMaterielPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");

  async function load() {
    if (!auth.structureId) return;
    try {
      const { data } = await supabase.from("tags_materiel").select("*").order("libelle");
      setRows(data || []);
    } catch (e) {
      // 0.56.22 : try/catch pour pas planter la page
      logger.error("[TagsMateriel] load failed:", e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  function openNew() { setForm({ libelle: "", couleur: PALETTE[0], description: "" }); setModal({}); setErr(""); }
  function openEdit(r) { setForm({ ...r }); setModal(r); setErr(""); }

  async function save() {
    if (!form.libelle?.trim()) { setErr("Le libellé est obligatoire."); return; }
    const payload = {
      structure_id: auth.structureId,
      libelle: form.libelle.trim(),
      couleur: form.couleur || PALETTE[0],
      description: form.description || null,
    };
    if (modal?.id) {
      await safeUpdate(supabase, "tags_materiel", payload, { id: modal.id }, { userId: auth.user?.id });
    } else {
      await safeInsert(supabase, "tags_materiel", payload, { userId: auth.user?.id });
    }
    setModal(null); await load();
  }

  async function del(r) {
    if (!await dialogs.confirm({ title: `Supprimer le tag "${r.libelle}" ?\nIl sera retiré de tous les matériels qui le portent.`, variant: "danger" })) return;
    await safeDelete(supabase, "tags_materiel", { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  if (!auth.ready) return null;
  if (!auth.can("gerer_roles") && auth.role?.nom !== "Administrateur") {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <PageHead small title="Tags matériel" sub="Accès restreint" />
          <Panel><StateMsg>Ton rôle n'autorise pas la gestion des tags.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="ADMINISTRATION" icon="ti-tags" title="Tags" accent="matériel"
          sub="Marqueurs colorés personnalisables pour catégoriser le matériel" />
        <Panel>
          <div className="di-toolbar">
            <Btn variant="new" icon="ti-plus" onClick={openNew}>Nouveau tag</Btn>
          </div>
          {loading ? <StateMsg>Chargement…</StateMsg>
            : rows.length === 0 ? <StateMsg>Aucun tag. <a style={{ color: "#2a5a5a", fontWeight: 600, cursor: "pointer" }} onClick={openNew}>Créer le premier</a></StateMsg>
            : (
              <table>
                <thead><tr><th>Tag</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="etq-tag" style={{ background: r.couleur + "22", color: r.couleur, border: `1px solid ${r.couleur}44` }}>
                          <i className="ti ti-tag" /> {r.libelle}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "#6c7a89" }}>{r.description || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <IconButton icon="ti-edit" color="#EF9F27" ariaLabel="Modifier" onClick={() => openEdit(r)} />
                        <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => del(r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Panel>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} kind="materiel"
        title={modal?.id ? "Modifier le tag" : "Nouveau tag"}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
          <Btn variant="primary" onClick={save}>Enregistrer</Btn>
        </>}
      >
        {err && <div className="err">{err}</div>}
        <div className="fld">
          <label>Libellé *</label>
          <input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="ex: Critique, Sous garantie…" autoFocus />
        </div>
        <div className="fld">
          <label>Couleur</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, couleur: c })}
                style={{
                  width: 36, height: 36, borderRadius: 10, background: c, cursor: "pointer",
                  border: form.couleur === c ? "3px solid #142131" : "2px solid transparent",
                  transform: form.couleur === c ? "scale(1.1)" : "scale(1)",
                }} title={c} />
            ))}
          </div>
          {form.libelle && form.couleur && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", marginRight: 8 }}>Aperçu :</span>
              <span className="etq-tag" style={{ background: form.couleur + "22", color: form.couleur, border: `1px solid ${form.couleur}44` }}>
                <i className="ti ti-tag" /> {form.libelle}
              </span>
            </div>
          )}
        </div>
        <div className="fld">
          <label>Description</label>
          <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="À quoi sert ce tag ?" rows={2} />
        </div>
      </Modal>
    </div>
  );
}
