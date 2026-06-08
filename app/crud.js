"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { Panel, StateMsg } from "./ui";

/**
 * Bloc CRUD générique réutilisable (anti-doublon).
 * props:
 *  - table : nom de la table Supabase
 *  - structureId : pour insert + filtre
 *  - columns : [{key,label,render?}] colonnes du tableau
 *  - fields : [{key,label,type,options?,required?}] champs du formulaire
 *  - title : titre du bouton "Nouveau X"
 *  - select : colonnes à charger (avec jointures éventuelles)
 *  - relations : { key: [{value,label}] } pour les selects (ex. articles, patients)
 */
export default function Crud({ structureId, etabId, table, columns, fields, title, select = "*", relations = {}, onData }) {
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {} (new) | row (edit)
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    let q = supabase.from(table).select(select).order("created_at", { ascending: false });
    if (etabId) q = q.eq("etablissement_id", etabId);
    const { data } = await q;
    setRows(data || []);
    if (onData) onData(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [etabId]);

  function openNew() { setForm({}); setModal({}); setErr(""); }
  function openEdit(r) { setForm({ ...r }); setModal(r); setErr(""); }

  async function save() {
    setErr("");
    for (const f of fields) if (f.required && !form[f.key]) { setErr(`Champ requis : ${f.label}`); return; }
    setBusy(true);
    try {
      const payload = {};
      fields.forEach((f) => { payload[f.key] = form[f.key] ?? null; });
      if (modal.id) {
        const { error } = await supabase.from(table).update(payload).eq("id", modal.id);
        if (error) throw error;
      } else {
        const insertPayload = { ...payload, structure_id: structureId };
        if (etabId) insertPayload.etablissement_id = etabId;
        const { error } = await supabase.from(table).insert(insertPayload);
        if (error) throw error;
      }
      setModal(null); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function del(r) {
    if (!confirm("Supprimer cet élément ?")) return;
    await supabase.from(table).delete().eq("id", r.id);
    await load();
  }

  return (
    <Panel>
      <div className="di-toolbar">
        <button className="btn-new" onClick={openNew} disabled={!structureId}><i className="ti ti-plus" /> {title}</button>
      </div>

      {loading ? <StateMsg>Chargement…</StateMsg>
        : rows.length === 0 ? <StateMsg>Aucun élément. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={openNew}>Créer le premier</a></StateMsg>
        : (
          <table>
            <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>)}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", marginRight: 12 }} onClick={() => openEdit(r)} />
                    <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer" }} onClick={() => del(r)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {modal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(null)}>
          <div className="modal">
            <div className="modal-head">{modal.id ? "Modifier" : title} <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setModal(null)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              {fields.map((f) => (
                <div className="fld" key={f.key}>
                  <label>{f.label}{f.required ? " *" : ""}</label>
                  {f.type === "select" ? (
                    <select value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                      <option value="">— Aucun —</option>
                      {(f.options || relations[f.key] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  ) : (
                    <input type={f.type || "text"} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-save" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
