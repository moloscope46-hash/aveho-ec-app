"use client";
// Page Étiquettes — Gérer les étiquettes (marqueurs colorés) appliquées aux patients.
// Définies par collectivité, réutilisables dans toute l'app.
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from "../ui";

import { dialogs } from "../dialogs";
import { safeUpdate, safeInsert, safeDelete } from "../../lib/safeWrite";
// 0.58.47 : sélecteur d'icône
import IconPicker, { DEFAULT_ICON } from "../components/IconPicker";
// Palette suggérée pour la sélection
const PALETTE = ["#7CC8C8", "#7a6fb0", "#5aa05a", "#e35d5b", "#EF9F27", "#C9867F", "#185FA5", "#2a5a5a", "#142131"];

export default function EtiquettesPage() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);     // null | {} (new) | row (edit)
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");

  async function load() {
    if (!auth.structureId) return;
    const { data } = await supabase.from("etiquettes").select("*").order("libelle");
    setRows(data || []);
    setLoading(false);
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
      // 0.58.47 : icône Tabler personnalisée
      icone: form.icone || null,
      description: form.description || null,
    };
    if (modal?.id) {
      await safeUpdate(supabase, "etiquettes", payload, { id: modal.id }, { userId: auth.user?.id });
    } else {
      await safeInsert(supabase, "etiquettes", payload, { userId: auth.user?.id });
    }
    setModal(null); await load();
  }

  async function del(r) {
    if (!await dialogs.confirm({ title: `Supprimer l'étiquette "${r.libelle}" ?\nElle sera retirée de tous les patients qui la portent.`, variant: "danger" })) return;
    await safeDelete(supabase, "etiquettes", { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  if (!auth.ready) return null;

  // Garde-fou : admin uniquement pour la gestion
  if (!auth.can("gerer_roles") && auth.role?.nom !== "Administrateur") {
    return (
      <div className="bg-dark">
        <TopBar cartCount={cart.count} auth={auth} />
        <div className="wrap">
          <PageHead small title="Étiquettes patients" sub="Accès restreint" />
          <Panel><StateMsg>Ton rôle n'autorise pas la gestion des étiquettes.</StateMsg></Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="ADMINISTRATION" icon="ti-tags" title="Étiquettes" accent="patients"
          sub="Marqueurs colorés personnalisables pour catégoriser les patients" />
        <Panel>
          <div className="di-toolbar">
            <Btn variant="new" icon="ti-plus" onClick={openNew}>Nouvelle étiquette</Btn>
          </div>
          {loading ? <StateMsg>Chargement…</StateMsg>
            : rows.length === 0 ? <StateMsg>Aucune étiquette. <a style={{ color: "#2a5a5a", fontWeight: 600, cursor: "pointer" }} onClick={openNew}>Créer la première</a></StateMsg>
            : (
              <table>
                <thead><tr><th>Étiquette</th><th>Description</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="etq-tag" style={{ background: r.couleur + "22", color: r.couleur, border: `1px solid ${r.couleur}44` }}>
                          <i className={`ti ${r.icone || DEFAULT_ICON}`} /> {r.libelle}
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

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        kind="patient"
        title={modal?.id ? "Modifier l'étiquette" : "Nouvelle étiquette"}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
          <Btn variant="primary" onClick={save}>Enregistrer</Btn>
        </>}
      >
        {err && <div className="err">{err}</div>}
        <div className="fld">
          <label>Libellé *</label>
          <input value={form.libelle || ""} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="ex: Chronique, Sortie prévue…" autoFocus />
        </div>
        <div className="fld">
          <label>Couleur</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, couleur: c })}
                style={{
                  width: 36, height: 36, borderRadius: 10, background: c, cursor: "pointer",
                  border: form.couleur === c ? "3px solid #142131" : "2px solid transparent",
                  outline: "none", transition: "transform .15s",
                  transform: form.couleur === c ? "scale(1.1)" : "scale(1)",
                }}
                title={c} />
            ))}
          </div>
          {/* Aperçu */}
          {form.libelle && form.couleur && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginRight: 8 }}>Aperçu :</span>
              <span className="etq-tag" style={{ background: form.couleur + "22", color: form.couleur, border: `1px solid ${form.couleur}44` }}>
                <i className={`ti ${form.icone || DEFAULT_ICON}`} /> {form.libelle}
              </span>
            </div>
          )}
        </div>
        {/* 0.58.47 : sélecteur d'icône */}
        <div className="fld">
          <label>Icône <span style={{ fontWeight: 400, fontSize: 11, color: "#8a98a8" }}>(optionnel — par défaut ti-tag)</span></label>
          <IconPicker
            value={form.icone}
            onChange={(icon) => setForm({ ...form, icone: icon })}
            color={form.couleur || "#7CC8C8"}
            suggestFor={form.libelle}
          />
        </div>
        <div className="fld">
          <label>Description (optionnelle)</label>
          <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="À quoi sert cette étiquette ?" rows={2} />
        </div>
      </Modal>
    </div>
  );
}
