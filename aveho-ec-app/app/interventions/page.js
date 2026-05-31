"use client";
// Page Interventions — Demandes d'intervention (DI) liées au matériel et patients
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn } from "../ui";
import { KpiRow } from "../kpis";
import DIPreview from "../DIPreview";
import PatientPreview from "../PatientPreview";
import { logEvent } from "../../lib/events";
import { safeInsert, safeUpdate } from "../../lib/safeWrite";
import { safeFetch } from "../../lib/offlineCache";
import StaleDataBanner from "../StaleDataBanner";
import { useStickyState } from "../../lib/useStickyState";

const STATUTS = ["Nouvelle", "Planifiée", "En cours", "Clôturée"];
const TYPES = ["Panne / réparation", "Maintenance préventive", "Livraison", "Reprise matériel"];
const next = (s) => STATUTS[STATUTS.indexOf(s) + 1] || null;
const stCls = (s) => ({ "Nouvelle": "s-nouvelle", "Planifiée": "s-validee", "En cours": "s-encours2", "Clôturée": "s-livree" }[s] || "s-nouvelle");
const typeIcon = (t) => ({ "Panne / réparation": "ti-alert-triangle", "Maintenance préventive": "ti-tool", "Livraison": "ti-truck-delivery", "Reprise matériel": "ti-arrow-back-up" }[t] || "ti-tools");

export default function Interventions() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState({ materiels: [], patients: [], depots: [], zones: [] });
  // Alpha 0.29.0 : filtres persistés en localStorage par utilisateur
  const [fStatut, setFStatut] = useStickyState("", "interventions:fStatut");
  const [fType, setFType] = useStickyState("", "interventions:fType");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: "Panne / réparation", urgence: "Normal" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Alpha 0.6 : assignation DI
  const [assignModal, setAssignModal] = useState(null);   // {di} ou null
  const [usersList, setUsersList] = useState([]);          // utilisateurs de la collectivité

  // Alpha 0.27.0 : indicateur lecture depuis cache offline
  const [staleData, setStaleData] = useState(false);

  async function load() {
    const etabKey = auth.etabId || "all";
    // Alpha 0.27.0 : safeFetch pour cache offline
    const result = await safeFetch(
      `interventions:etab:${etabKey}`,
      () => {
        let q = supabase
          .from("interventions")
          .select("*, materiels(libelle,num_serie,num_parc,num_lot), patients(id,nom,prenom,chambre,date_naissance,numero_dossier), depots(nom), zones(nom)")
          .order("created_at", { ascending: false });
        if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
        return q;
      }
    );
    setStaleData(result.fromCache === true);
    setRows(result.data || []);
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
      const userId = auth.user?.id;
      const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
      const insertPayload = {
        ...(newId ? { id: newId } : {}),
        structure_id: auth.structureId, etablissement_id: auth.etabId, numero, type: form.type, urgence: form.urgence || "Normal",
        materiel_id: form.materiel_id || null, patient_id: form.patient_id || null,
        depot_id: form.depot_id || null, zone_id: form.zone_id || null,
        description: form.description || null, statut: "Nouvelle", created_by: auth.user.id,
        due_date: form.due_date || null,
      };
      // Alpha 0.26.0 : safeInsert
      const { data, error, queued } = await safeInsert(supabase, "interventions", insertPayload, { userId, returning: !queued });
      if (error) throw error;
      const intervId = queued ? newId : (data?.id || newId);
      // Alpha 0.4 : trace audit + notif si urgence "Urgent"
      const urgent = (form.urgence || "Normal") === "Urgent";
      await logEvent(supabase, auth, {
        action: "creer", entite: "intervention", entite_id: intervId,
        details: { numero, type: form.type, urgence: form.urgence },
        notif: urgent,
        notifType: "di",
        titre: urgent ? "DI urgente créée" : null,
        message: urgent ? `${numero} - ${form.type} (urgence ${form.urgence}).` : null,
        lien: "/interventions",
      });
      setModal(false); setForm({ type: "Panne / réparation", urgence: "Normal" }); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function advance(r) {
    const n = next(r.statut); if (!n) return;
    await safeUpdate(supabase, "interventions", { statut: n }, { id: r.id }, { userId: auth.user?.id });
    // Alpha 0.4 : trace audit
    await logEvent(supabase, auth, {
      action: "modifier", entite: "intervention", entite_id: r.id,
      details: { numero: r.numero, ancien_statut: r.statut, nouveau_statut: n },
    });
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
    await safeUpdate(supabase, "interventions", { transfert_id: trf.id }, { id: r.id }, { userId: auth.user?.id });
    await load();
    alert(`Transfert ${numero} généré (reprise vers ${depGeneral.label}).`);
  }

  // Alpha 0.6 : ouvrir la modale d'assignation
  async function openAssign(di) {
    if (!usersList.length && auth.structureId) {
      // On charge les membres de la collectivité (1 fois)
      const { data } = await supabase.from("membres_structure")
        .select("user_id, role, roles(nom)")
        .eq("structure_id", auth.structureId);
      // Pas d'accès direct aux emails sans admin RLS — on affiche les IDs raccourcis
      setUsersList((data || []).map((m) => ({
        id: m.user_id,
        label: m.user_id === auth.user.id ? "Moi" : `Membre ${m.user_id.slice(0, 8)}`,
        role: m.roles?.nom || m.role || "",
      })));
    }
    setAssignModal({ di });
  }
  async function saveAssign(userId) {
    const di = assignModal.di;
    const user = usersList.find((u) => u.id === userId);
    await safeUpdate(supabase, "interventions",
      { assignee_id: userId || null, assignee_email: user ? user.label : null },
      { id: di.id },
      { userId: auth.user?.id }
    );
    // Trace audit + notif ciblée à l'assigné
    await logEvent(supabase, auth, {
      action: "modifier", entite: "intervention", entite_id: di.id,
      details: { numero: di.numero, assignee: user?.label || null },
      notif: !!userId, notifUserId: userId, notifType: "di",
      titre: "DI qui t'est assignée",
      message: `${di.numero} - ${di.type} (urgence ${di.urgence}) t'a été assignée.`,
      lien: "/interventions",
    });
    setAssignModal(null);
    await load();
  }

  if (!auth.ready) return null;

  const visible = rows.filter((r) => (!fStatut || r.statut === fStatut) && (!fType || r.type === fType));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead small title="Mes demandes d'intervention" sub="Panne, maintenance, livraison ou reprise — rattachées au matériel et au patient" />
        {staleData && <StaleDataBanner />}
        <KpiRow tiles={[
          { label: "Demandes", value: rows.length, icon: "ti-tools", color: "#185FA5" },
          { label: "Urgentes", value: rows.filter((r) => r.urgence === "Urgent").length, icon: "ti-alert-triangle", color: "#c0392b" },
          { label: "En cours", value: rows.filter((r) => r.statut === "En cours" || r.statut === "Planifiée").length, icon: "ti-progress", color: "#EF9F27" },
          { label: "Clôturées", value: rows.filter((r) => r.statut === "Clôturée").length, icon: "ti-check", color: "#5aa05a" },
        ]} />
        <Panel>
          <div className="di-toolbar">
            <button className="btn-new" onClick={() => { setErr(""); setModal(true); }} disabled={!auth.structureId}><i className="ti ti-plus" /> Nouvelle demande</button>
            <button className="btn-ghost" onClick={() => router.push("/interventions/kanban")}><i className="ti ti-layout-kanban" /> Vue Kanban</button>
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
              <div className="panel-table"><table>
                <thead><tr><th>N°</th><th>Date</th><th>Type</th><th>Urgence</th><th>Matériel (série/parc/lot)</th><th>Patient</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>
                        {/* Alpha 0.39.0 : preview au hover */}
                        <DIPreview
                          di={r}
                          patient={r.patients}
                          materiel={r.materiels}
                        >
                          {r.numero}
                        </DIPreview>
                        {r.transfert_id && <i className="ti ti-transfer" title="Transfert généré" style={{ marginLeft: 6, color: "#2a5a5a" }} />}
                      </td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td><span className="tag-type"><i className={`ti ${typeIcon(r.type)}`} /> {r.type}</span></td>
                      <td><span className={`urg ${r.urgence === "Urgent" ? "urg-urgent" : "urg-normal"}`}>{r.urgence}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {r.materiels ? <>{r.materiels.libelle}<br /><span style={{ color: "#8a98a8" }}>
                          {[r.materiels.num_serie && `S/N ${r.materiels.num_serie}`, r.materiels.num_parc && `Parc ${r.materiels.num_parc}`, r.materiels.num_lot && `Lot ${r.materiels.num_lot}`].filter(Boolean).join(" · ") || "—"}
                        </span></> : "—"}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {r.patients ? (
                          <PatientPreview patient={r.patients} extras={{}}>
                            <span>{r.patients.nom} {r.patients.prenom || ""}{r.patients.chambre ? ` (ch.${r.patients.chambre})` : ""}</span>
                          </PatientPreview>
                        ) : "—"}
                      </td>
                      <td><span className={`statut ${stCls(r.statut)}`}>{r.statut}</span></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {next(r.statut) && <button className="btn-mini" onClick={() => advance(r)} title={`Passer à « ${next(r.statut)} »`}><i className="ti ti-arrow-right" /> {next(r.statut)}</button>}
                        {auth.can("ecrire") && <button className="btn-mini" style={{ marginLeft: 6 }} onClick={() => openAssign(r)} title="Assigner à un utilisateur"><i className="ti ti-user-check" /> {r.assignee_id ? "Réassigner" : "Assigner"}</button>}
                        {r.materiel_id && !r.transfert_id && (
                          <button className="btn-mini" style={{ marginLeft: 6 }} onClick={() => genTransfert(r)} title="Générer un transfert (reprise)"><i className="ti ti-transfer" /> Transfert</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
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
              <div className="fld-row">
                <div className="fld"><label>Niveau d'urgence</label>
                  <div className="seg">
                    <button className={form.urgence === "Normal" ? "on" : ""} onClick={() => setForm({ ...form, urgence: "Normal" })}>Normal</button>
                    <button className={form.urgence === "Urgent" ? "on" : ""} onClick={() => setForm({ ...form, urgence: "Urgent" })}>Urgent</button>
                  </div>
                </div>
                {/* Alpha 0.17.0 : échéance optionnelle */}
                <div className="fld"><label>Échéance souhaitée</label>
                  <input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
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

      {/* Alpha 0.6 : modale d'assignation de DI */}
      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        kind="di"
        title={assignModal?.di ? `Assigner ${assignModal.di.numero}` : "Assigner"}
        footer={<>
          <Btn variant="ghost" onClick={() => setAssignModal(null)}>Fermer</Btn>
          <Btn variant="danger" onClick={() => saveAssign(null)}>Désassigner</Btn>
        </>}
      >
        <p style={{ fontSize: 13, color: "#6c7a89", marginTop: 0 }}>
          Choisis le membre de la collectivité à qui assigner cette DI. Il recevra une notification ciblée.
        </p>
        {usersList.length === 0
          ? <div style={{ padding: 12, color: "#8a98a8" }}>Aucun utilisateur trouvé dans cette collectivité.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {usersList.map((u) => (
                <button
                  key={u.id}
                  onClick={() => saveAssign(u.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", border: "1px solid #e3e9ee", borderRadius: 10,
                    background: assignModal?.di?.assignee_id === u.id ? "#eaf7f7" : "#fff",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left", fontSize: 13.5,
                  }}
                >
                  <span><b>{u.label}</b> {u.role && <span style={{ color: "#8a98a8", marginLeft: 6 }}>· {u.role}</span>}</span>
                  {assignModal?.di?.assignee_id === u.id && <i className="ti ti-check" style={{ color: "#5aa05a" }} />}
                </button>
              ))}
            </div>
          )}
      </Modal>
    </div>
  );
}
