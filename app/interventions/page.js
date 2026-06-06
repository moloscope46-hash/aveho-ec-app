"use client";
// Page Interventions — Demandes d'intervention (DI) liées au matériel et patients
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { selectChambresContexte } from "../../lib/chambres";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
// 0.58.39 : hook réutilisable pour le contexte bâtiment/service de la TopBar
import { useCurrentContext } from "../../lib/useCurrentContext";
// 0.58.42 : hook pour écouter les page-actions du Cmd+K
import { usePageAction } from "../../lib/usePageAction";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn } from "../ui";
import { EmptyState, toast, SkeletonRow, Avatar, Select, DatePicker, BulkToolbar, Tooltip, ProgressBar, Drawer } from "../components/ui-premium";
import EquipeSelector from "../components/EquipeSelector";  // 0.58.63
import { Dialog } from "../components/ui-premium";
import { KpiRow } from "../kpis";
import DIPreview from "../DIPreview";
import PatientPreview from "../PatientPreview";
import { logEvent } from "../../lib/events";
import { safeInsert, safeUpdate } from "../../lib/safeWrite";
import { safeFetch } from "../../lib/offlineCache";
import StaleDataBanner from "../StaleDataBanner";
import { useStickyState } from "../../lib/useStickyState";
// 0.58.22 : NeonButton premium pour boutons d'action principaux
import { NeonButton } from "../components/ui-premium";

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
  // 0.58.39 : filtre par contexte bâtiment/service (utilise hook + chargement des patient_ids du contexte)
  const ctx = useCurrentContext();
  const [ctxPatientIds, setCtxPatientIds] = useState(null); // null = pas chargé, Set = patients dans le contexte
  useEffect(() => {
    if (!ctx.batimentId && !ctx.serviceId) {
      setCtxPatientIds(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // Charge les chambres du contexte → patient_id assignés
        // 0.58.70 : helper avec fallback batiment_id absent
        const { data: chambres } = await selectChambresContexte(supabase, {
          serviceId: ctx.serviceId, batimentId: ctx.batimentId,
        });
        if (!alive || !chambres) return;
        const chambreIds = chambres.map(c => c.id);
        if (chambreIds.length === 0) { setCtxPatientIds(new Set()); return; }
        // Charge les patients qui occupent ces chambres
        const { data: pats } = await supabase.from("patients").select("id").in("chambre_id", chambreIds);
        if (!alive) return;
        setCtxPatientIds(new Set((pats || []).map(p => p.id)));
      } catch {
        if (alive) setCtxPatientIds(null);
      }
    })();
    return () => { alive = false; };
  }, [ctx.batimentId, ctx.serviceId]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: "Panne / réparation", urgence: "Normal" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // 0.58.42 : page-actions du Cmd+K
  usePageAction("open-new", () => { setErr(""); setModal(true); });
  usePageAction("toggle-ctx-filter", () => { ctx.toggle(); });
  // 0.58.43 : export CSV global de toutes les DI visibles (filtrées)
  async function exportInterventionsCsv() {
    try {
      // Utilise `visible` (rows filtrés par fStatut/fType/ctx) — défini plus bas, accessible via closure
      const data = rows.filter((r) => {
        if (fStatut && r.statut !== fStatut) return false;
        if (fType && r.type !== fType) return false;
        if (ctx.active && ctxPatientIds) {
          if (!r.patient_id || !ctxPatientIds.has(r.patient_id)) return false;
        }
        return true;
      });
      const { exportRows } = await import("../../lib/exportExcel");
      await exportRows(data || [], {
        filename: `interventions_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "Interventions",
        columns: {
          "Numéro": "numero",
          "Date": (r) => r.date_demande ? new Date(r.date_demande).toLocaleDateString("fr-FR") : "",
          "Type": "type",
          "Urgence": "urgence",
          "Statut": "statut",
          "Matériel": (r) => r.materiels?.libelle || "",
          "Patient": (r) => r.patients ? `${r.patients.nom} ${r.patients.prenom || ""}`.trim() : "",
          "Chambre": (r) => r.patients?.chambre || "",
          "Description": "description",
        },
      });
    } catch (e) {
      toast.error("Erreur export CSV : " + (e?.message || e));
    }
  }
  usePageAction("export-csv", () => exportInterventionsCsv());
  // Alpha 0.6 : assignation DI
  const [assignModal, setAssignModal] = useState(null);   // {di} ou null
  const [usersList, setUsersList] = useState([]);          // utilisateurs de la collectivité

  // Alpha 0.27.0 : indicateur lecture depuis cache offline
  const [staleData, setStaleData] = useState(false);

  // 0.58.14 : multi-sélection bulk
  const [selected, setSelected] = useState(new Set());
  // 0.58.15 : Drawer de détail intervention (vue complète + historique)
  const [detailDi, setDetailDi] = useState(null);
  // 0.58.15 : progress bar pour export lourd (>100 lignes)
  const [exportProgress, setExportProgress] = useState(null); // null | { value, total }
  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelected() { setSelected(new Set()); }
  async function bulkClose() {
    const ok = await Dialog.confirm({
      title: `Marquer ${selected.size} intervention${selected.size > 1 ? "s" : ""} comme résolue${selected.size > 1 ? "s" : ""} ?`,
      message: "Le statut sera mis à 'Clôturée' pour toutes les DI sélectionnées.",
    });
    if (!ok) return;
    try {
      const { error } = await supabase
        .from("interventions")
        .update({ statut: "Clôturée" })
        .in("id", Array.from(selected));
      if (error) throw error;
      toast.success(`${selected.size} intervention${selected.size > 1 ? "s clôturées" : " clôturée"}`);
      clearSelected();
      load();
    } catch (e) {
      toast.error("Erreur clôture groupée : " + e.message);
    }
  }
  async function bulkExportCsv() {
    try {
      const ids = Array.from(selected);
      const subset = rows.filter(r => ids.includes(r.id));
      const total = subset.length;
      const headers = ["N°", "Date", "Type", "Urgence", "Statut", "Assigné"];
      const lines = [headers.join(";")];
      // 0.58.15 : pour les exports lourds (>100 lignes), affiche une ProgressBar
      const useProgress = total > 100;
      if (useProgress) setExportProgress({ value: 0, total });
      const BATCH = 50; // yield au DOM tous les 50 items pour ne pas freezer
      for (let i = 0; i < total; i++) {
        const r = subset[i];
        lines.push([
          r.numero || "",
          r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "",
          (r.type || "").replace(/;/g, ","),
          r.urgence || "",
          r.statut || "",
          (r.assignee_email || "—").replace(/;/g, ","),
        ].join(";"));
        if (useProgress && (i + 1) % BATCH === 0) {
          setExportProgress({ value: i + 1, total });
          // yield au navigateur pour re-paint
          await new Promise((res) => setTimeout(res, 0));
        }
      }
      if (useProgress) setExportProgress({ value: total, total });
      const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interventions-bulk-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${selected.size} intervention${selected.size > 1 ? "s exportées" : " exportée"}`);
      // Hide progress après un court délai pour laisser le user voir "100%"
      if (useProgress) setTimeout(() => setExportProgress(null), 800);
    } catch (e) {
      toast.error("Erreur export CSV : " + e.message);
      setExportProgress(null);
    }
  }
  async function bulkDelete() {
    const ok = await Dialog.confirm({
      title: `Supprimer ${selected.size} intervention${selected.size > 1 ? "s" : ""} ?`,
      message: "Cette action est irréversible.",
      danger: true,
    });
    if (!ok) return;
    try {
      const { error } = await supabase
        .from("interventions")
        .delete()
        .in("id", Array.from(selected));
      if (error) throw error;
      toast.success(`${selected.size} intervention${selected.size > 1 ? "s supprimées" : " supprimée"}`);
      clearSelected();
      load();
    } catch (e) {
      toast.error("Erreur suppression groupée : " + e.message);
    }
  }

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
        // 0.58.63 : équipe en charge (filtre TopBar)
        equipe_id: form.equipe_id || null,
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
    if (!r.materiel_id) { toast.error("Aucun matériel rattaché à cette DI."); return; }
    const depGeneral = refs.depots[0];
    if (!depGeneral) { toast.error("Aucun dépôt disponible."); return; }
    const numero = "TRF-" + Math.floor(1000 + Math.random() * 9000);
    const matLabel = refs.materiels.find((m) => m.value === r.materiel_id)?.label || "Matériel";
    const srcLabel = r.patients ? `Ch. ${r.patients.chambre || "?"} — ${r.patients.nom}` : "Emplacement";
    const { data: trf, error } = await supabase.from("transferts").insert({
      structure_id: auth.structureId, numero, motif: "Retour", statut: "Demandé",
      src_type: r.patient_id ? "chambre" : "depot", src_id: r.patient_id || r.depot_id, src_label: srcLabel,
      dst_type: "depot", dst_id: depGeneral.value, dst_label: depGeneral.label,
      contenu: "materiel", materiel_id: r.materiel_id, libelle: matLabel, quantite: 1, created_by: auth.user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await safeUpdate(supabase, "interventions", { transfert_id: trf.id }, { id: r.id }, { userId: auth.user?.id });
    await load();
    toast.success(`Transfert ${numero} généré (reprise vers ${depGeneral.label}).`);
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

  const visible = rows.filter((r) => {
    if (fStatut && r.statut !== fStatut) return false;
    if (fType && r.type !== fType) return false;
    // 0.58.39 : filtre par contexte bâtiment/service si activé
    if (ctx.active && ctxPatientIds) {
      if (!r.patient_id || !ctxPatientIds.has(r.patient_id)) return false;
    }
    // 0.58.62 : filtre par équipe si une équipe est sélectionnée
    if (ctx.active && ctx.equipeId && r.equipe_id !== ctx.equipeId) return false;
    return true;
  });

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
              {/* 0.58.11 : Select premium sur les filtres */}
              <Select
                value={fStatut}
                onChange={setFStatut}
                size="sm"
                options={[
                  { value: "", label: "Tous les statuts", icon: "ti-list" },
                  ...STATUTS.map((s) => ({ value: s, label: s, icon: "ti-progress-check" })),
                ]}
              />
              <Select
                value={fType}
                onChange={setFType}
                size="sm"
                options={[
                  { value: "", label: "Tous les types", icon: "ti-category" },
                  ...TYPES.map((t) => ({ value: t, label: t, icon: "ti-tag" })),
                ]}
              />
              {/* 0.58.39 : toggle filtre contexte bât/svc (apparait si contexte défini) */}
              {(ctx.batimentId || ctx.serviceId) && (
                <button
                  onClick={ctx.toggle}
                  title="Filtre selon le bâtiment/service courant choisi dans la TopBar"
                  style={{
                    borderColor: ctx.active ? "#7CC8C8" : "#e3e9ee",
                    background: ctx.active ? "rgba(124,200,200,.12)" : "#fff",
                    color: ctx.active ? "#1c5454" : "#6c7a89",
                    border: "1px solid",
                    padding: "5px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 600,
                  }}
                >
                  <i className={`ti ${ctx.active ? "ti-eye" : "ti-eye-off"}`} />
                  {ctx.active ? "Contexte ON" : "Filtrer par contexte"}
                  {ctx.active && <span style={{ background: "#7CC8C8", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, marginLeft: 4 }}>●</span>}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            /* 0.58.8 : SkeletonRow x 5 au lieu du "Chargement…" */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3,4].map((i) => <SkeletonRow key={i} cols={5} />)}
            </div>
          )
            : visible.length === 0 ? (
              <EmptyState
                illustration="clipboard"
                variant="terra"
                title="Aucune demande d'intervention"
                message="Crée ta première demande pour démarrer le suivi des interventions sur ton parc matériel."
                actionLabel="Créer une demande"
                onAction={() => setModal(true)}
              />
            )
            : (
              <div className="panel-table"><table>
                <thead><tr>
                  <th style={{ width: 32, textAlign: "center", padding: "8px 6px" }}>
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && visible.every(r => selected.has(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(visible.map(r => r.id)));
                        } else {
                          clearSelected();
                        }
                      }}
                      aria-label="Tout sélectionner"
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                    />
                  </th>
                  <th>N°</th><th>Date</th><th>Type</th><th>Urgence</th><th>Matériel (série/parc/lot)</th><th>Patient</th><th>Statut</th><th>Assigné</th><th></th>
                </tr></thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} style={selected.has(r.id) ? { background: "rgba(124,200,200,.08)" } : null}>
                      <td style={{ textAlign: "center", padding: "8px 6px" }}>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleSelected(r.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Sélectionner ${r.numero}`}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {/* Alpha 0.39.0 : preview au hover */}
                        <DIPreview
                          di={r}
                          patient={r.patients}
                          materiel={r.materiels}
                        >
                          {r.numero}
                        </DIPreview>
                        {r.transfert_id && (
                          <Tooltip content="Un transfert (reprise matériel) a déjà été généré pour cette intervention" position="top">
                            <i className="ti ti-transfer" style={{ marginLeft: 6, color: "#2a5a5a", cursor: "help" }} />
                          </Tooltip>
                        )}
                      </td>
                      <td>
                        {/* 0.58.15 : Tooltip avec date+heure complète au hover */}
                        <Tooltip
                          content={r.created_at ? new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }) : "—"}
                          position="top"
                          delay={300}
                        >
                          <span style={{ cursor: "help", textDecoration: "underline dotted", textUnderlineOffset: 3, textDecorationColor: "#cfd8e0" }}>
                            {fmtDate(r.created_at)}
                          </span>
                        </Tooltip>
                      </td>
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
                      {/* 0.58.9 : Avatar de l'assigné dans une colonne dédiée */}
                      <td>
                        {r.assignee_email ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#4a5868" }} title={r.assignee_email}>
                            <Avatar name={r.assignee_email} size={26} />
                            <span style={{ maxWidth: 110, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.assignee_email}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#8a98a8", fontStyle: "italic" }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {/* 0.58.15 : bouton Détails ouvre le Drawer */}
                        <Tooltip content="Voir tous les détails dans un panneau latéral" position="left">
                          <button
                            className="btn-mini"
                            onClick={() => setDetailDi(r)}
                            aria-label={`Détails ${r.numero}`}
                          >
                            <i className="ti ti-layout-sidebar-right-expand" /> Détails
                          </button>
                        </Tooltip>
                        {next(r.statut) && <button className="btn-mini" style={{ marginLeft: 6 }} onClick={() => advance(r)} title={`Passer à « ${next(r.statut)} »`}><i className="ti ti-arrow-right" /> {next(r.statut)}</button>}
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
                {/* 0.58.12 : Select premium avec icons */}
                <Select
                  value={form.type}
                  onChange={(v) => setForm({ ...form, type: v })}
                  fullWidth
                  options={TYPES.map((t) => ({ value: t, label: t, icon: "ti-tag" }))}
                />
              </div>
              <div className="fld-row">
                <div className="fld"><label>Niveau d'urgence</label>
                  <div className="seg">
                    <button className={form.urgence === "Normal" ? "on" : ""} onClick={() => setForm({ ...form, urgence: "Normal" })}>Normal</button>
                    <button className={form.urgence === "Urgent" ? "on" : ""} onClick={() => setForm({ ...form, urgence: "Urgent" })}>Urgent</button>
                  </div>
                </div>
                {/* 0.58.12 : DatePicker premium au lieu de input natif */}
                <div className="fld"><label>Échéance souhaitée</label>
                  <DatePicker
                    value={form.due_date || ""}
                    onChange={(v) => setForm({ ...form, due_date: v })}
                    fullWidth
                    placeholder="Choisir une date…"
                  />
                </div>
              </div>
              <div className="fld-row">
                {/* 0.58.12 : Select premium avec searchable pour matériel (souvent long) */}
                <div className="fld"><label>Matériel concerné</label>
                  <Select
                    value={form.materiel_id || ""}
                    onChange={(v) => setForm({ ...form, materiel_id: v })}
                    fullWidth
                    searchable
                    placeholder="— Aucun —"
                    options={[
                      { value: "", label: "— Aucun —", icon: "ti-circle-dashed" },
                      ...refs.materiels.map((m) => ({ value: m.value, label: m.label, icon: "ti-tool" })),
                    ]}
                  />
                </div>
                {/* 0.58.12 : Select premium avec searchable pour patient (liste souvent longue) */}
                <div className="fld"><label>Patient concerné</label>
                  <Select
                    value={form.patient_id || ""}
                    onChange={(v) => setForm({ ...form, patient_id: v })}
                    fullWidth
                    searchable
                    placeholder="— Aucun —"
                    options={[
                      { value: "", label: "— Aucun —", icon: "ti-circle-dashed" },
                      ...refs.patients.map((p) => ({ value: p.value, label: p.label, icon: "ti-user" })),
                    ]}
                  />
                </div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Dépôt (emplacement)</label>
                  <Select
                    value={form.depot_id || ""}
                    onChange={(v) => setForm({ ...form, depot_id: v })}
                    fullWidth
                    placeholder="— Aucun —"
                    options={[
                      { value: "", label: "— Aucun —", icon: "ti-circle-dashed" },
                      ...refs.depots.map((d) => ({ value: d.value, label: d.label, icon: "ti-building-warehouse" })),
                    ]}
                  />
                </div>
                <div className="fld"><label>Zone</label>
                  <Select
                    value={form.zone_id || ""}
                    onChange={(v) => setForm({ ...form, zone_id: v })}
                    fullWidth
                    placeholder="— Aucune —"
                    options={[
                      { value: "", label: "— Aucune —", icon: "ti-circle-dashed" },
                      ...refs.zones.map((z) => ({ value: z.value, label: z.label, icon: "ti-map-pin" })),
                    ]}
                  />
                </div>
              </div>
              <div className="fld"><label>Description</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez le problème ou la demande…" />
              </div>
              {/* 0.58.63 : équipe en charge */}
              <EquipeSelector
                value={form.equipe_id}
                onChange={(eqId) => setForm({ ...form, equipe_id: eqId })}
                structureId={auth.structureId}
                label="Équipe en charge"
              />
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setModal(false)}>Annuler</button>
              {/* 0.58.22 : NeonButton variant=blue pour le bouton principal */}
              <NeonButton variant="blue" icon={busy ? "ti-loader-2" : "ti-send"} onClick={save} disabled={busy}>
                {busy ? "Envoi en cours…" : "Envoyer la demande"}
              </NeonButton>
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

      {/* 0.58.14 : BulkToolbar contextuelle multi-sélection */}
      <BulkToolbar
        count={selected.size}
        onClear={clearSelected}
        itemName="intervention"
        itemNamePlural="interventions"
        actions={[
          { id: "close",  label: "Marquer résolue", icon: "ti-circle-check", onClick: bulkClose },
          { id: "export", label: "Exporter CSV",   icon: "ti-download",     onClick: bulkExportCsv },
          { id: "delete", label: "Supprimer",      icon: "ti-trash",        onClick: bulkDelete, variant: "danger" },
        ]}
      />

      {/* 0.58.15 : ProgressBar floating pour les exports lourds (>100 lignes) */}
      {exportProgress && (
        <div style={{
          position: "fixed",
          bottom: 90,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 75,
          background: "#fff",
          border: "1px solid #e3e9ee",
          borderRadius: 12,
          padding: "14px 18px",
          minWidth: 360,
          boxShadow: "0 20px 50px rgba(20,33,49,.30), 0 8px 20px rgba(20,33,49,.18)",
          animation: "av-bulk-toolbar-in 350ms cubic-bezier(.2,.8,.2,1)",
        }}>
          <ProgressBar
            value={(exportProgress.value / exportProgress.total) * 100}
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-download" style={{ color: "#185FA5" }} />
                Export en cours… ({exportProgress.value} / {exportProgress.total})
              </span>
            }
            showPercent
            variant="default"
            size="md"
          />
        </div>
      )}

      {/* 0.58.15 : Drawer de détail intervention — vue complète + historique */}
      <Drawer
        open={!!detailDi}
        onClose={() => setDetailDi(null)}
        title={detailDi ? `Intervention ${detailDi.numero}` : "Détails"}
        subtitle={detailDi ? `${detailDi.type} · ${detailDi.urgence}` : ""}
        icon="ti-tools"
        color="#142131"
        side="right"
        size="md"
        footer={
          <>
            <button
              className="btn-ghost"
              onClick={() => setDetailDi(null)}
            >
              Fermer
            </button>
            {detailDi && next(detailDi.statut) && (
              <button
                className="btn-save"
                onClick={() => { advance(detailDi); setDetailDi(null); }}
              >
                <i className="ti ti-arrow-right" /> Passer à « {next(detailDi.statut)} »
              </button>
            )}
          </>
        }
      >
        {detailDi && (() => {
          const r = detailDi;
          const dStatut = stCls(r.statut);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Numéro + statut */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#142131",
                  letterSpacing: "-.02em",
                }}>
                  {r.numero}
                </div>
                <span className={`tag-statut ${dStatut}`} style={{ fontSize: 12 }}>
                  {r.statut}
                </span>
                <span className={`urg ${r.urgence === "Urgent" ? "urg-urgent" : "urg-normal"}`} style={{ marginLeft: "auto" }}>
                  {r.urgence}
                </span>
              </div>

              {/* Informations clés */}
              <div style={{
                padding: 14,
                background: "#f9fbfc",
                border: "1px solid #e3e9ee",
                borderRadius: 10,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Type</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#142131", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className={`ti ${typeIcon(r.type)}`} />
                    {r.type}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Créée le</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </div>
                </div>
                {r.due_date && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Échéance</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#142131" }}>
                      {fmtDate(r.due_date)}
                    </div>
                  </div>
                )}
                {r.assignee_email && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Assigné à</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#142131", display: "flex", alignItems: "center", gap: 6 }}>
                      <Avatar name={r.assignee_email} size={22} />
                      {r.assignee_email}
                    </div>
                  </div>
                )}
              </div>

              {/* Matériel concerné */}
              {r.materiels && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#185FA5", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-tool" /> Matériel concerné
                  </div>
                  <div style={{
                    padding: 12,
                    background: "linear-gradient(135deg, rgba(24,95,165,.06), transparent)",
                    border: "1px solid rgba(24,95,165,.20)",
                    borderRadius: 10,
                  }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#142131" }}>
                      {r.materiels.libelle}
                    </div>
                    {(r.materiels.numero_serie || r.materiels.numero_parc) && (
                      <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 4, fontFamily: "monospace" }}>
                        {r.materiels.numero_serie && <span>SN: {r.materiels.numero_serie}</span>}
                        {r.materiels.numero_parc && <span style={{ marginLeft: 12 }}>Parc: {r.materiels.numero_parc}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Patient concerné */}
              {r.patients && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7a6fb0", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-user" /> Patient concerné
                  </div>
                  <div style={{
                    padding: 12,
                    background: "linear-gradient(135deg, rgba(122,111,176,.06), transparent)",
                    border: "1px solid rgba(122,111,176,.20)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <Avatar name={`${r.patients.prenom || ""} ${r.patients.nom || ""}`.trim()} size={36} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#142131" }}>
                        {r.patients.prenom} {r.patients.nom}
                      </div>
                      {r.patients.chambre && (
                        <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 2 }}>
                          Chambre {r.patients.chambre}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {r.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
                    Description
                  </div>
                  <div style={{
                    padding: 12,
                    background: "#f4f7fa",
                    border: "1px solid #e3e9ee",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "#4a5868",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}>
                    {r.description}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{
                paddingTop: 12,
                borderTop: "1px solid #e3e9ee",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8a98a8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                  Actions disponibles
                </div>
                {auth.can("ecrire") && (
                  <button
                    className="btn-mini"
                    onClick={() => { openAssign(r); setDetailDi(null); }}
                    style={{ justifyContent: "flex-start" }}
                  >
                    <i className="ti ti-user-check" /> {r.assignee_id ? "Réassigner" : "Assigner à un utilisateur"}
                  </button>
                )}
                {r.materiel_id && !r.transfert_id && (
                  <button
                    className="btn-mini"
                    onClick={() => { genTransfert(r); setDetailDi(null); }}
                    style={{ justifyContent: "flex-start" }}
                  >
                    <i className="ti ti-transfer" /> Générer un transfert (reprise)
                  </button>
                )}
                {r.transfert_id && (
                  <div style={{
                    fontSize: 12,
                    color: "#2a5a5a",
                    padding: "8px 12px",
                    background: "rgba(124,200,200,.10)",
                    border: "1px solid rgba(124,200,200,.30)",
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <i className="ti ti-circle-check" /> Un transfert a déjà été généré pour cette intervention
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}
