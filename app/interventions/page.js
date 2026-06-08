"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { KpiRow } from "../kpis";

const STATUTS = ["Nouvelle", "Planifiée", "En cours", "Clôturée"];
const TYPES = ["Panne / réparation", "Maintenance préventive", "Livraison", "Reprise matériel"];
const next = (s) => STATUTS[STATUTS.indexOf(s) + 1] || null;
const stCls = (s) => ({ "Nouvelle": "s-nouvelle", "Planifiée": "s-validee", "En cours": "s-encours2", "Clôturée": "s-livree" }[s] || "s-nouvelle");
const typeIcon = (t) => ({ "Panne / réparation": "ti-alert-triangle", "Maintenance préventive": "ti-tool", "Livraison": "ti-truck-delivery", "Reprise matériel": "ti-arrow-back-up" }[t] || "ti-tools");

export default function Interventions() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState({ materiels: [], patients: [], depots: [], zones: [] });
  const [fStatut, setFStatut] = useState("");
  const [fType, setFType] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: "Panne / réparation", urgence: "Normal" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    let q = supabase
      .from("interventions")
      .select("*, materiels(libelle,num_serie,num_parc,num_lot), patients(nom,prenom,chambre), depots(nom), zones(nom)")
      .order("created_at", { ascending: false });
    if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }
  async function loadRefs() {
    const [ma, pa, dp, zn] = await Promise.all([
      supabase.from("materiels").select("id,libelle,num_serie"),
      supabase.from("patients").select("id,nom,prenom,chambre"),
      supabase.from("depots").select("id,nom"),
      supabase.from("zones").select("id,nom"),
    ]);
    setRefs({
      materiels: (ma.data || []).map((m) => ({ value: m.id, label: `${m.libelle}${m.num_serie ? ` (${m.num_serie})` : ""}` })),
      patients: (pa.data || []).map((p) => ({ value: p.id, label: `${p.nom} ${p.prenom || ""}${p.chambre ? ` (ch.${p.chambre})` : ""}` })),
      depots: (dp.data || []).map((d) => ({ value: d.id, label: d.nom })),
      zones: (zn.data || []).map((z) => ({ value: z.id, label: z.nom })),
    });
  }
  useEffect(() => { if (auth.ready) { load(); loadRefs(); } }, [auth.ready, auth.etabId]);

  async function save() {
    setErr("");
    if (!form.type) { setErr("Type requis."); return; }
    setBusy(true);
    try {
      const numero = "DI-" + Math.floor(1000 + Math.random() * 9000);
      const { error } = await supabase.from("interventions").insert({
        structure_id: auth.structureId, etablissement_id: auth.etabId, numero, type: form.type, urgence: form.urgence || "Normal",
        materiel_id: form.materiel_id || null, patient_id: form.patient_id || null,
        depot_id: form.depot_id || null, zone_id: form.zone_id || null,
        description: form.description || null, statut: "Nouvelle", created_by: auth.user.id,
      });
      if (error) throw error;
      setModal(false); setForm({ type: "Panne / réparation", urgence: "Normal" }); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function advance(r) {
    const n = next(r.statut); if (!n) return;
    await supabase.from("interventions").update({ statut: n }).eq("id", r.id);
    await load();
  }

  // génère un transfert depuis une DI (ex : reprise matériel -> dépôt général)
  async function genTransfert(r) {
    if (!r.materiel_id) { alert("Aucun matériel rattaché à cette DI."); return; }
    const depGeneral = refs.depots[0];
    if (!depGeneral) { alert("Aucun dépôt disponible."); return; }
    const numero = "TRF-" + Math.floor(1000 + Math.random() * 9000);
    const matLabel = refs.materiels.find((m) => m.value === r.materiel_id)?.label || "Matériel";
    const srcLabel = r.patients ? `Ch. ${r.patients.chambre || "?"} — ${r.patients.nom}` : "Emplacement";
    const { data: trf, error } = await supabase.from("transferts").insert({
      structure_id: auth.structureId, numero, motif: "Retour", statut: "Demandé",
      src_type: r.patient_id ? "chambre" : "depot", src_id: r.patient_id || r.depot_id, src_label: srcLabel,
      dst_type: "depot", dst_id: depGeneral.value, dst_label: depGeneral.label,
      contenu: "materiel", materiel_id: r.materiel_id, libelle: matLabel, quantite: 1, created_by: auth.user.id,
    }).select().single();
    if (error) { alert(error.message); return; }
    await supabase.from("interventions").update({ transfert_id: trf.id }).eq("id", r.id);
    await load();
    alert(`Transfert ${numero} généré (reprise vers ${depGeneral.label}).`);
  }

  if (!auth.ready) return null;

  const visible = rows.filter((r) => (!fStatut || r.statut === fStatut) && (!fType || r.type === fType));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Mes demandes d'intervention" sub="Panne, maintenance, livraison ou reprise — rattachées au matériel et au patient" />
        <KpiRow tiles={[
          { label: "Demandes", value: rows.length, icon: "ti-tools", color: "#185FA5" },
          { label: "Urgentes", value: rows.filter((r) => r.urgence === "Urgent").length, icon: "ti-alert-triangle", color: "#c0392b" },
          { label: "En cours", value: rows.filter((r) => r.statut === "En cours" || r.statut === "Planifiée").length, icon: "ti-progress", color: "#EF9F27" },
          { label: "Clôturées", value: rows.filter((r) => r.statut === "Clôturée").length, icon: "ti-check", color: "#5aa05a" },
        ]} />
        <Panel>
          <div className="di-toolbar">
            <button className="btn-new" onClick={() => { setErr(""); setModal(true); }} disabled={!auth.structureId}><i className="ti ti-plus" /> Nouvelle demande</button>
            <div className="di-filters">
              <select value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
                <option value="">Tous les statuts</option>{STATUTS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={fType} onChange={(e) => setFType(e.target.value)}>
                <option value="">Tous les types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {loading ? <StateMsg>Chargement…</StateMsg>
            : visible.length === 0 ? <StateMsg>Aucune demande. <a style={{ color: "#2a5a5a", fontWeight: 600 }} onClick={() => setModal(true)}>Créer une demande</a></StateMsg>
            : (
              <table>
                <thead><tr><th>N°</th><th>Date</th><th>Type</th><th>Urgence</th><th>Matériel (série/parc/lot)</th><th>Patient</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.numero}{r.transfert_id && <i className="ti ti-transfer" title="Transfert généré" style={{ marginLeft: 6, color: "#2a5a5a" }} />}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td><span className="tag-type"><i className={`ti ${typeIcon(r.type)}`} /> {r.type}</span></td>
                      <td><span className={`urg ${r.urgence === "Urgent" ? "urg-urgent" : "urg-normal"}`}>{r.urgence}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {r.materiels ? <>{r.materiels.libelle}<br /><span style={{ color: "#8a98a8" }}>
                          {[r.materiels.num_serie && `S/N ${r.materiels.num_serie}`, r.materiels.num_parc && `Parc ${r.materiels.num_parc}`, r.materiels.num_lot && `Lot ${r.materiels.num_lot}`].filter(Boolean).join(" · ") || "—"}
                        </span></> : "—"}
                      </td>
                      <td style={{ fontSize: 12 }}>{r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}${r.patients.chambre ? ` (ch.${r.patients.chambre})` : ""}` : "—"}</td>
                      <td><span className={`statut ${stCls(r.statut)}`}>{r.statut}</span></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {next(r.statut) && <button className="btn-mini" onClick={() => advance(r)} title={`Passer à « ${next(r.statut)} »`}><i className="ti ti-arrow-right" /> {next(r.statut)}</button>}
                        {r.materiel_id && !r.transfert_id && (
                          <button className="btn-mini" style={{ marginLeft: 6 }} onClick={() => genTransfert(r)} title="Générer un transfert (reprise)"><i className="ti ti-transfer" /> Transfert</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Panel>
      </div>

      {modal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(false)}>
          <div className="modal">
            <div className="modal-head">Nouvelle demande d'intervention <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setModal(false)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              <div className="fld"><label>Type de demande</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="fld"><label>Niveau d'urgence</label>
                <div className="seg">
                  <button className={form.urgence === "Normal" ? "on" : ""} onClick={() => setForm({ ...form, urgence: "Normal" })}>Normal</button>
                  <button className={form.urgence === "Urgent" ? "on" : ""} onClick={() => setForm({ ...form, urgence: "Urgent" })}>Urgent</button>
                </div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Matériel concerné</label>
                  <select value={form.materiel_id || ""} onChange={(e) => setForm({ ...form, materiel_id: e.target.value })}>
                    <option value="">— Aucun —</option>{refs.materiels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Patient concerné</label>
                  <select value={form.patient_id || ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
                    <option value="">— Aucun —</option>{refs.patients.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Dépôt (emplacement)</label>
                  <select value={form.depot_id || ""} onChange={(e) => setForm({ ...form, depot_id: e.target.value })}>
                    <option value="">— Aucun —</option>{refs.depots.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Zone</label>
                  <select value={form.zone_id || ""} onChange={(e) => setForm({ ...form, zone_id: e.target.value })}>
                    <option value="">— Aucune —</option>{refs.zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="fld"><label>Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez le problème ou la demande…" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn-save" onClick={save} disabled={busy}>{busy ? "…" : "Envoyer la demande"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
