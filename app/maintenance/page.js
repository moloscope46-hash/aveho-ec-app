"use client";
// Page Maintenance — Planification des maintenances préventives du matériel.
// Permet de créer des maintenances datées, voir celles à venir et en retard.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
// 0.58.42 : filtre par contexte bâtiment/service (hook réutilisable depuis 0.58.39)
import { useCurrentContext } from "../../lib/useCurrentContext";
// 0.58.43 : hook pour écouter les page-actions du Cmd+K
import { usePageAction } from "../../lib/usePageAction";
import { useLibelles } from "../../lib/useLibelles";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from "../ui";
import { EmptyState, SkeletonRow, toast, NeonButton } from "../components/ui-premium";
import { fmtDate } from "../../lib/format";
import { logEvent } from "../../lib/events";
import { openPdfPreview } from "../../lib/pdfPreview";
import { safeInsert, safeUpdate, safeDelete } from "../../lib/safeWrite";

import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";
const TYPES_MAINT = ["Révision annuelle", "Contrôle sécurité", "Étalonnage", "Nettoyage approfondi", "Mise à jour firmware", "Remplacement de pièces", "Autre"];

// Alpha 0.11 : récurrences proposées en jours
const RECURRENCES = [
  { value: 0, label: "Pas de récurrence" },
  { value: 30, label: "Tous les mois" },
  { value: 90, label: "Tous les 3 mois" },
  { value: 180, label: "Tous les 6 mois" },
  { value: 365, label: "Tous les ans" },
  { value: 730, label: "Tous les 2 ans" },
];

// Couleurs par statut
const COULEUR_STATUT = {
  "Planifiée": "#185FA5",
  "À faire": "#EF9F27",
  "Faite": "#5aa05a",
  "En retard": "#e35d5b",
  "Annulée": "#8a98a8",
};

// Recalculer statut "En retard" si date passée et pas faite
function statutEffectif(m) {
  if (m.statut === "Faite" || m.statut === "Annulée") return m.statut;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (m.date_prevue < aujourdhui) return "En retard";
  return m.statut;
}

// Alpha 0.12 : export PDF du planning maintenance (pour prestataires externes)
function exportPdfMaintenance(maintenances, auth) {
  const rows = maintenances.map((m) => {
    const st = statutEffectif(m);
    const mat = m.materiels;
    const ids = [mat?.num_serie, mat?.num_parc, mat?.num_lot].filter(Boolean).join(" · ");
    return `<tr>
      <td>${new Date(m.date_prevue).toLocaleDateString("fr-FR")}</td>
      <td>${mat?.libelle || "—"}${ids ? `<br><small>${ids}</small>` : ""}</td>
      <td>${m.type}</td>
      <td>${m.intervenant || "—"}</td>
      <td><span class="st st-${st.replace(/\s+/g, "-").toLowerCase()}">${st}</span></td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Planning Maintenance Aveho</title>
    <style>
      @page { margin: 12mm; size: A4 portrait; }
      body { font-family: 'Segoe UI', Helvetica, sans-serif; color: #142131; margin: 0; }
      .head { border-bottom: 3px solid #7CC8C8; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
      .eyebrow { color: #7CC8C8; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
      h1 { margin: 6px 0 2px; font-size: 20px; font-weight: 700; }
      .sub { color: #6c7a89; font-size: 12px; }
      .meta { text-align: right; font-size: 11px; color: #6c7a89; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f4f7fa; color: #142131; font-weight: 700; padding: 8px 10px; border-bottom: 2px solid #e3e9ee; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #e3e9ee; vertical-align: top; }
      small { color: #8a98a8; font-size: 10px; }
      .st { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .st-planifiée { background: #185FA522; color: #185FA5; }
      .st-à-faire { background: #EF9F2722; color: #EF9F27; }
      .st-faite { background: #5aa05a22; color: #5aa05a; }
      .st-en-retard { background: #e35d5b22; color: #e35d5b; }
      .st-annulée { background: #8a98a822; color: #8a98a8; }
      .foot { margin-top: 20px; color: #9aa7b4; font-size: 10px; text-align: center; border-top: 1px solid #e3e9ee; padding-top: 10px; }
    </style></head><body>
    <div class="head">
      <div>
        <div class="eyebrow">AVEHO — ESPACE COLLECTIVITÉ</div>
        <h1>Planning Maintenance</h1>
        <div class="sub">${auth.structureNom || ""}${auth.etabNom ? ` · ${auth.etabNom}` : ""}</div>
      </div>
      <div class="meta">
        <div>${maintenances.length} maintenance(s)</div>
        <div>Édition du ${new Date().toLocaleString("fr-FR")}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Date prévue</th><th>Matériel</th><th>Type</th><th>Intervenant</th><th>Statut</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#8a98a8;padding:20px">Aucune maintenance dans la sélection.</td></tr>'}</tbody>
    </table>
    <div class="foot">Document généré depuis Aveho EC le ${new Date().toLocaleString("fr-FR")} — à transmettre au prestataire concerné</div>
  </body></html>`;
  // Alpha 0.13 : aperçu avant impression au lieu de window.print direct
  openPdfPreview({
    titre: `Planning Maintenance (${maintenances.length})`,
    html,
    filename: "planning-maintenance",
  });
}

export default function MaintenancePage() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();
  const [rows, setRows] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Filtre statut
  const [fStatut, setFStatut] = useState("");
  // 0.58.42 : filtre par contexte bât/svc (via matériel → patient → chambre)
  const ctx = useCurrentContext();
  const [ctxMaterielIds, setCtxMaterielIds] = useState(null);
  useEffect(() => {
    if (!ctx.batimentId && !ctx.serviceId) {
      setCtxMaterielIds(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // Chambres du contexte → patient_ids → matériel_ids assignés à ces patients
        let chq = supabase.from("chambres").select("id, service_id, batiment_id");
        if (ctx.serviceId) chq = chq.eq("service_id", ctx.serviceId);
        else if (ctx.batimentId) chq = chq.eq("batiment_id", ctx.batimentId);
        const { data: chambres } = await chq;
        if (!alive || !chambres) return;
        const chambreIds = chambres.map(c => c.id);
        if (chambreIds.length === 0) { setCtxMaterielIds(new Set()); return; }
        const { data: pats } = await supabase.from("patients").select("id").in("chambre_id", chambreIds);
        if (!alive) return;
        const patientIds = (pats || []).map(p => p.id);
        if (patientIds.length === 0) { setCtxMaterielIds(new Set()); return; }
        const { data: mats } = await supabase.from("materiels").select("id").in("patient_id", patientIds);
        if (!alive) return;
        setCtxMaterielIds(new Set((mats || []).map(m => m.id)));
      } catch {
        if (alive) setCtxMaterielIds(null);
      }
    })();
    return () => { alive = false; };
  }, [ctx.batimentId, ctx.serviceId]);
  // Alpha 0.41.0 : stats par type
  const [statsParType, setStatsParType] = useState([]);
  // Alpha 0.43.0 : mode d'affichage (liste / calendrier)
  const [vueMode, setVueMode] = useState("liste"); // "liste" | "calendrier"
  const [moisAffiche, setMoisAffiche] = useState(new Date());
  // Alpha 0.43.0 : onglet récurrences + CRUD
  const [tabActive, setTabActive] = useState("planifiees"); // "planifiees" | "recurrences"
  const [recurrences, setRecurrences] = useState([]);
  const [recurModal, setRecurModal] = useState(null);
  const [recurForm, setRecurForm] = useState({});

  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    let q = supabase.from("maintenances")
      .select("*, materiels(libelle, num_serie, num_parc, num_lot)")
      .order("date_prevue", { ascending: true });
    if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
    const { data } = await q;
    const maintenances = data || [];
    setRows(maintenances);
    // Charger les matériels pour le sélecteur
    let qm = supabase.from("materiels").select("id, libelle, num_serie, num_parc, num_lot");
    if (auth.etabId) qm = qm.eq("etablissement_id", auth.etabId);
    const { data: mat } = await qm;
    setMateriels(mat || []);
    // Alpha 0.41.0 : stats par type (silencieux, fallback si vue absente)
    supabase.from("v_stats_maintenances")
      .select("*")
      .eq("structure_id", auth.structureId)
      .order("nb_total", { ascending: false })
      .then(({ data }) => setStatsParType(data || []))
      .catch(() => setStatsParType([]));
    // Alpha 0.43.0 : charger les récurrences
    supabase.from("maintenance_recurrences")
      .select("*, materiels(id, libelle, num_serie, num_parc)")
      .eq("structure_id", auth.structureId)
      .order("prochaine_due", { ascending: true, nullsFirst: false })
      .then(({ data }) => setRecurrences(data || []))
      .catch(() => setRecurrences([]));
    setLoading(false);

    // Alpha 0.11 : automatismes — exécutés en arrière-plan, sans bloquer le rendu
    if (auth.can && auth.can("ecrire")) {
      processAutomatismes(maintenances);
    }
  }

  // Alpha 0.11 : traitements automatiques au chargement
  async function processAutomatismes(maintenances) {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const dansSeptJours = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    for (const m of maintenances) {
      // 1) Maintenance en retard sans DI : créer une DI et lier
      if (m.date_prevue < aujourdhui && m.statut !== "Faite" && m.statut !== "Annulée" && !m.di_id) {
        try {
          // Créer la DI
          const numeroDi = `DI-${Date.now().toString().slice(-6)}`;
          const { data: di } = await supabase.from("interventions").insert({
            structure_id: auth.structureId,
            etablissement_id: auth.etabId,
            materiel_id: m.materiel_id,
            numero: numeroDi,
            type: "Maintenance en retard",
            urgence: "Normal",
            statut: "Nouvelle",
            description: `Maintenance "${m.type}" prévue le ${fmtDate(m.date_prevue)} en retard. Intervenant prévu : ${m.intervenant || "non précisé"}.`,
          }).select().single();
          if (di) {
            await supabase.from("maintenances").update({ di_id: di.id }).eq("id", m.id);
            await logEvent(supabase, auth, {
              action: "creer", entite: "intervention", entite_id: di.id,
              details: { numero: numeroDi, origine: "maintenance_retard", maintenance_id: m.id },
              notif: true,
              titre: "DI auto : maintenance en retard",
              message: `${m.type} sur ${m.materiels?.libelle || "matériel"} est en retard. DI ${numeroDi} créée.`,
              lien: "/interventions",
            });
          }
        } catch (e) { logger.warn("Création DI auto échouée :", e.message); }
      }
      // 2) Maintenance à 7 jours (ou moins) : envoyer notif J-7 si pas déjà fait
      if (m.date_prevue >= aujourdhui && m.date_prevue <= dansSeptJours && m.statut !== "Faite" && m.statut !== "Annulée" && !m.notif_j7_envoyee) {
        try {
          await supabase.from("maintenances").update({ notif_j7_envoyee: true }).eq("id", m.id);
          await logEvent(supabase, auth, {
            action: "alerte", entite: "maintenance", entite_id: m.id,
            details: { type: m.type, date_prevue: m.date_prevue },
            notif: true,
            titre: "Maintenance proche",
            message: `${m.type} sur ${m.materiels?.libelle || "matériel"} prévue le ${fmtDate(m.date_prevue)}.`,
            lien: "/maintenance",
          });
        } catch (e) { logger.warn("Notif J-7 échouée :", e.message); }
      }
    }
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  function openNew() {
    const futur = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setForm({ type: TYPES_MAINT[0], date_prevue: futur, statut: "Planifiée" });
    setModal({}); setErr("");
  }
  function openEdit(r) { setForm({ ...r }); setModal(r); setErr(""); }
  function openMarkDone(r) {
    // Raccourci : marquer comme fait à la date d'aujourd'hui
    setForm({ ...r, statut: "Faite", date_realisee: new Date().toISOString().slice(0, 10) });
    setModal(r); setErr("");
  }

  // 0.58.43 : export CSV des maintenances (filtrées par fStatut + contexte)
  async function exportMaintenancesCsv() {
    try {
      let data = rows;
      if (fStatut) data = data.filter(row => statutEffectif(row) === fStatut);
      if (ctx.active && ctxMaterielIds) {
        data = data.filter(row => row.materiel_id && ctxMaterielIds.has(row.materiel_id));
      }
      const { exportRows } = await import("../../lib/exportExcel");
      await exportRows(data || [], {
        filename: `maintenances_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "Maintenances",
        columns: {
          "Type": "type",
          "Date prévue": (r) => r.date_prevue || "",
          "Date réalisée": (r) => r.date_realisee || "",
          "Statut": (r) => statutEffectif(r),
          "Matériel": (r) => r.materiels?.libelle || "",
          "N° série": (r) => r.materiels?.num_serie || "",
          "N° parc": (r) => r.materiels?.num_parc || "",
          "N° lot": (r) => r.materiels?.num_lot || "",
          "Commentaire": "commentaire",
        },
      });
    } catch (e) {
      console.error("Export CSV maintenances :", e);
    }
  }

  // 0.58.43 : page-actions du Cmd+K
  usePageAction("open-new", () => openNew());
  usePageAction("export-csv", () => exportMaintenancesCsv());
  usePageAction("toggle-ctx-filter", () => ctx.toggle());

  async function save() {
    if (!form.materiel_id) { setErr("Sélectionner un matériel."); return; }
    if (!form.type?.trim()) { setErr("Type de maintenance obligatoire."); return; }
    if (!form.date_prevue) { setErr("Date prévue obligatoire."); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId,
        materiel_id: form.materiel_id,
        type: form.type.trim(),
        date_prevue: form.date_prevue,
        date_realisee: form.date_realisee || null,
        statut: form.statut || "Planifiée",
        intervenant: form.intervenant || null,
        notes: form.notes || null,
        recurrence_jours: form.recurrence_jours ? parseInt(form.recurrence_jours) : null,
        parent_id: form.parent_id || null,
        updated_at: new Date().toISOString(),
      };
      let savedId = modal?.id;
      const userId = auth.user?.id;
      if (modal?.id) {
        await safeUpdate(supabase, "maintenances", payload, { id: modal.id }, { userId });
      } else {
        const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
        const insertPayload = newId ? { id: newId, ...payload } : payload;
        const { data: ins, queued } = await safeInsert(supabase, "maintenances", insertPayload, { userId, returning: true });
        savedId = queued ? newId : (ins?.id || newId);
      }
      // Alpha 0.11 : si la maintenance passe à Faite ET récurrence > 0,
      // créer automatiquement la suivante
      if (payload.statut === "Faite" && payload.recurrence_jours && payload.recurrence_jours > 0) {
        // Vérifier qu'il n'y a pas déjà une suivante (parent_id = celle-ci)
        const { data: suiv } = await supabase.from("maintenances")
          .select("id").eq("parent_id", savedId).limit(1);
        if (!suiv || suiv.length === 0) {
          const base = new Date(payload.date_realisee || payload.date_prevue);
          base.setDate(base.getDate() + payload.recurrence_jours);
          const nextDate = base.toISOString().slice(0, 10);
          const m = materiels.find((x) => x.id === payload.materiel_id);
          const matLabel = m ? m.libelle : "matériel";
          const newNextId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
          await safeInsert(supabase, "maintenances", {
            ...(newNextId ? { id: newNextId } : {}),
            structure_id: auth.structureId,
            etablissement_id: auth.etabId,
            materiel_id: payload.materiel_id,
            type: payload.type,
            date_prevue: nextDate,
            statut: "Planifiée",
            intervenant: payload.intervenant,
            recurrence_jours: payload.recurrence_jours,
            parent_id: savedId,
            notes: `Suivante de ${payload.type} faite le ${payload.date_realisee || payload.date_prevue}`,
          }, { userId });
          // Notification info
          if (logEvent) {
            await logEvent(supabase, auth, {
              action: "creer", entite: "maintenance", entite_id: savedId,
              details: { type: payload.type, suivante: nextDate, recurrence: payload.recurrence_jours },
              notif: true,
              titre: "Maintenance récurrente programmée",
              message: `${payload.type} sur ${matLabel} programmée le ${fmtDate(nextDate)}.`,
              lien: "/maintenance",
            });
          }
        }
      }
      setModal(null); await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function del(r) {
    if (!await dialogs.confirm({ title: `Supprimer cette maintenance "${r.type}" du ${fmtDate(r.date_prevue)} ?`, variant: "danger" })) return;
    await safeDelete(supabase, "maintenances", { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  // Alpha 0.43.0 : CRUD récurrences
  function openRecurNew() {
    setRecurForm({
      type: "Préventive",
      frequence_jours: 90,
      actif: true,
    });
    setRecurModal({});
  }

  function openRecurEdit(r) {
    setRecurForm({ ...r, materiel_id: r.materiel_id });
    setRecurModal(r);
  }

  async function saveRecur() {
    if (!recurForm.materiel_id) { toast.error("Sélectionner un matériel."); return; }
    if (!recurForm.frequence_jours || recurForm.frequence_jours < 1) { toast.error("Fréquence invalide."); return; }
    // Calcul prochaine_due si dernière_realisee renseignée
    let prochaine = recurForm.prochaine_due;
    if (recurForm.derniere_realisee && !prochaine) {
      const t = new Date(recurForm.derniere_realisee).getTime();
      prochaine = new Date(t + recurForm.frequence_jours * 86400000).toISOString().slice(0, 10);
    }
    const payload = {
      structure_id: auth.structureId,
      materiel_id: recurForm.materiel_id,
      type: recurForm.type || "Préventive",
      libelle: recurForm.libelle?.trim() || null,
      frequence_jours: parseInt(recurForm.frequence_jours),
      derniere_realisee: recurForm.derniere_realisee || null,
      prochaine_due: prochaine || null,
      actif: recurForm.actif !== false,
      notes: recurForm.notes?.trim() || null,
    };
    if (recurModal?.id) {
      await safeUpdate(supabase, "maintenance_recurrences", payload, { id: recurModal.id }, { userId: auth.user?.id });
    } else {
      payload.created_by = auth.user?.id;
      await safeInsert(supabase, "maintenance_recurrences", payload, { userId: auth.user?.id });
    }
    setRecurModal(null);
    await load();
  }

  async function delRecur(r) {
    if (!await dialogs.confirm({ title: `Supprimer la récurrence "${r.libelle || r.type}" ?`, variant: "danger" })) return;
    await safeDelete(supabase, "maintenance_recurrences", { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  async function markRecurDone(r) {
    // Marquer comme faite : update derniere_realisee à aujourd'hui + recalcule prochaine_due
    const today = new Date().toISOString().slice(0, 10);
    const t = new Date().getTime();
    const prochaine = new Date(t + r.frequence_jours * 86400000).toISOString().slice(0, 10);
    await safeUpdate(
      supabase,
      "maintenance_recurrences",
      { derniere_realisee: today, prochaine_due: prochaine },
      { id: r.id },
      { userId: auth.user?.id }
    );
    await load();
  }

  if (!auth.ready) return null;

  // Application du filtre statut côté client (calcul du statut effectif)
  const filtered = (() => {
    let r = rows;
    if (fStatut) r = r.filter((row) => statutEffectif(row) === fStatut);
    // 0.58.42 : filtre par contexte bâtiment/service via matériel
    if (ctx.active && ctxMaterielIds) {
      r = r.filter((row) => row.materiel_id && ctxMaterielIds.has(row.materiel_id));
    }
    return r;
  })();

  // KPIs : compte par statut effectif
  const compteStatuts = {};
  rows.forEach((r) => {
    const s = statutEffectif(r);
    compteStatuts[s] = (compteStatuts[s] || 0) + 1;
  });

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="PLANNING" icon="ti-tool" title="Maintenance" accent="préventive"
          sub={`Planification des contrôles périodiques du ${lbl("materiel", "matériel").toLowerCase()}`} />

        {/* Alpha 0.43.0 : onglets Planifiées / Récurrences */}
        <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: "2px solid #e3e9ee" }}>
          {[
            { v: "planifiees", l: "Maintenances planifiées", ic: "ti-calendar-event", count: rows.length },
            { v: "recurrences", l: "Récurrences automatiques", ic: "ti-refresh", count: recurrences.length },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTabActive(t.v)}
              style={{
                padding: "10px 18px",
                background: "transparent",
                border: "none",
                borderBottom: `3px solid ${tabActive === t.v ? "#185FA5" : "transparent"}`,
                color: tabActive === t.v ? "#185FA5" : "#6c7a89",
                fontWeight: tabActive === t.v ? 700 : 500,
                fontFamily: "inherit",
                fontSize: 14,
                cursor: "pointer",
                marginBottom: -2,
                display: "inline-flex", alignItems: "center", gap: 8,
              }}
            >
              <i className={`ti ${t.ic}`} /> {t.l}
              {t.count > 0 && (
                <span style={{ background: tabActive === t.v ? "#185FA5" : "#e3e9ee", color: tabActive === t.v ? "#fff" : "#6c7a89", padding: "1px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Onglet : Récurrences */}
        {tabActive === "recurrences" && (
          <RecurrencesPanel
            recurrences={recurrences}
            materiels={materiels}
            openNew={openRecurNew}
            openEdit={openRecurEdit}
            markDone={markRecurDone}
            del={delRecur}
            canWrite={auth.can("ecrire")}
          />
        )}

        {/* Onglet : Planifiées (vue existante) */}
        {tabActive === "planifiees" && <>

        {/* KPIs par statut */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
          {["En retard", "À faire", "Planifiée", "Faite"].map((s) => (
            <button key={s} onClick={() => setFStatut(fStatut === s ? "" : s)} style={{
              padding: "14px 16px", border: `2px solid ${fStatut === s ? COULEUR_STATUT[s] : "#e3e9ee"}`,
              background: fStatut === s ? COULEUR_STATUT[s] + "1a" : "#fff",
              borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: COULEUR_STATUT[s], display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>{s}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#142131", marginTop: 4 }}>{compteStatuts[s] || 0}</div>
            </button>
          ))}
        </div>

        {/* Alpha 0.41.0 : stats par type de maintenance */}
        {statsParType.length > 0 && (
          <Panel style={{ marginBottom: 18, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#142131", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-chart-pie" style={{ color: "#7a6fb0" }} />
                Stats par type ({statsParType.length})
              </h3>
              <span style={{ fontSize: 11, color: "#8a98a8" }}>Total · 7j · 30j · durée moyenne</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              {statsParType.slice(0, 6).map((s) => (
                <div key={s.type} style={{ background: "#fafbfc", border: "1px solid #e3e9ee", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#142131", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.type || "—"}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 11, color: "#6c7a89" }}>
                    <span><b style={{ color: "#142131", fontSize: 16 }}>{s.nb_total}</b></span>
                    {s.nb_7j > 0 && <span style={{ color: "#5aa05a", fontWeight: 600 }}>+{s.nb_7j} <span style={{ color: "#8a98a8", fontWeight: 400 }}>(7j)</span></span>}
                    {s.duree_moy_jours != null && s.duree_moy_jours > 0 && (
                      <span title="Durée moyenne ouvert → clôturé"><i className="ti ti-clock" /> {Math.round(s.duree_moy_jours)}j moy.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel>
          <div className="di-toolbar">
            {/* 0.58.25 : NeonButton variant=blue pour Planifier une maintenance */}
            {auth.can("ecrire") && <NeonButton variant="blue" icon="ti-plus" onClick={openNew}>Planifier une maintenance</NeonButton>}
            <Btn variant="ghost" icon="ti-file-type-pdf" onClick={() => exportPdfMaintenance(filtered, auth)}>Export PDF planning</Btn>
            {/* 0.58.43 : Export CSV des maintenances filtrées */}
            <Btn variant="ghost" icon="ti-file-spreadsheet" onClick={exportMaintenancesCsv}>Export CSV</Btn>
            {fStatut && <Btn variant="ghost" icon="ti-x" onClick={() => setFStatut("")}>Effacer filtre</Btn>}
            {/* 0.58.42 : toggle filtre contexte bât/svc (apparait si contexte défini) */}
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
                  fontSize: 12.5,
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
            {/* Alpha 0.43.0 : toggle vue */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "#f4f7fa", padding: 3, borderRadius: 8 }}>
              <button
                onClick={() => setVueMode("liste")}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none",
                  background: vueMode === "liste" ? "#fff" : "transparent",
                  color: vueMode === "liste" ? "#185FA5" : "#6c7a89",
                  fontWeight: vueMode === "liste" ? 700 : 500,
                  fontFamily: "inherit", fontSize: 12.5, cursor: "pointer",
                  boxShadow: vueMode === "liste" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <i className="ti ti-list" /> Liste
              </button>
              <button
                onClick={() => setVueMode("calendrier")}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none",
                  background: vueMode === "calendrier" ? "#fff" : "transparent",
                  color: vueMode === "calendrier" ? "#185FA5" : "#6c7a89",
                  fontWeight: vueMode === "calendrier" ? 700 : 500,
                  fontFamily: "inherit", fontSize: 12.5, cursor: "pointer",
                  boxShadow: vueMode === "calendrier" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <i className="ti ti-calendar" /> Calendrier
              </button>
            </div>
          </div>
          {loading ? (
            /* 0.58.9 : SkeletonRow x 4 */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3].map((i) => <SkeletonRow key={i} cols={5} />)}
            </div>
          )
            : rows.length === 0 ? (
              <EmptyState
                illustration="chart"
                variant="blue"
                title="Aucune maintenance planifiée"
                message="Planifie ta première maintenance pour suivre l'entretien régulier de ton parc matériel (révisions, contrôles, étalonnages)."
                actionLabel="Planifier la première"
                onAction={openNew}
              />
            )
            : filtered.length === 0 ? (
              <EmptyState
                illustration="search"
                variant="gray"
                title="Aucun résultat"
                message="Aucune maintenance pour ce statut."
                compact
              />
            )
            : vueMode === "calendrier" ? (
              /* Alpha 0.43.0 : vue calendrier mensuelle */
              <CalendrierMaintenance 
                rows={filtered} 
                mois={moisAffiche} 
                setMois={setMoisAffiche}
                openEdit={openEdit}
                statutEffectif={statutEffectif}
              />
            ) : (
              <table>
                <thead><tr><th>Date prévue</th><th>{lbl("materiel", "Matériel")}</th><th>Type</th><th>Intervenant</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {filtered.map((r) => {
                    const stEff = statutEffectif(r);
                    const m = r.materiels;
                    const ids = [m?.num_serie && `S/N ${m.num_serie}`, m?.num_parc && `Parc ${m.num_parc}`, m?.num_lot && `Lot ${m.num_lot}`].filter(Boolean).join(" · ");
                    return (
                      <tr key={r.id}>
                        <td><b>{fmtDate(r.date_prevue)}</b>{r.date_realisee && <div style={{ fontSize: 11, color: "#5aa05a" }}><i className="ti ti-check" /> Réalisée le {fmtDate(r.date_realisee)}</div>}</td>
                        <td style={{ fontSize: 13 }}>{m?.libelle || "—"}{ids && <div style={{ color: "#8a98a8", fontSize: 11 }}>{ids}</div>}</td>
                        <td>{r.type}</td>
                        <td style={{ fontSize: 13 }}>{r.intervenant || <span style={{ color: "#8a98a8" }}>—</span>}</td>
                        <td>
                          <span style={{ background: COULEUR_STATUT[stEff] + "22", color: COULEUR_STATUT[stEff], padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, border: `1px solid ${COULEUR_STATUT[stEff]}44` }}>
                            {stEff}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {auth.can("ecrire") && stEff !== "Faite" && (
                            <i className="ti ti-circle-check" style={{ color: "#5aa05a", cursor: "pointer", marginRight: 12 }} onClick={() => openMarkDone(r)} title="Marquer comme faite" />
                          )}
                          {auth.can("ecrire") && <IconButton icon="ti-edit" color="#EF9F27" ariaLabel="Modifier" onClick={() => openEdit(r)} />}
                          {auth.can("supprimer") && <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => del(r)} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </Panel>
        </>}
      </div>

      <Modal
        open={!!modal}
        onClose={() => !busy && setModal(null)}
        kind="materiel"
        title={modal?.id ? "Modifier la maintenance" : "Planifier une maintenance"}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)} disabled={busy}>Annuler</Btn>
          <NeonButton variant="blue" icon={busy ? "ti-loader-2" : "ti-device-floppy"} onClick={save} disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </NeonButton>
        </>}
      >
        {err && <div className="err">{err}</div>}
        <div className="fld">
          <label>{lbl("materiel", "Matériel")} *</label>
          <select value={form.materiel_id || ""} onChange={(e) => setForm({ ...form, materiel_id: e.target.value })}>
            <option value="">— Choisir —</option>
            {materiels.map((m) => {
              const ids = [m.num_serie, m.num_parc, m.num_lot].filter(Boolean).join(" · ");
              return <option key={m.id} value={m.id}>{m.libelle}{ids ? ` (${ids})` : ""}</option>;
            })}
          </select>
        </div>
        <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fld">
            <label>Type *</label>
            <select value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES_MAINT.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="fld">
            <label>Statut</label>
            <select value={form.statut || "Planifiée"} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              <option value="Planifiée">Planifiée</option>
              <option value="À faire">À faire</option>
              <option value="Faite">Faite</option>
              <option value="Annulée">Annulée</option>
            </select>
          </div>
        </div>
        <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fld">
            <label>Date prévue *</label>
            <input type="date" value={form.date_prevue || ""} onChange={(e) => setForm({ ...form, date_prevue: e.target.value })} />
          </div>
          <div className="fld">
            <label>Date réalisée</label>
            <input type="date" value={form.date_realisee || ""} onChange={(e) => setForm({ ...form, date_realisee: e.target.value })} disabled={form.statut !== "Faite"} />
          </div>
        </div>
        <div className="fld">
          <label>Intervenant</label>
          <input type="text" value={form.intervenant || ""} onChange={(e) => setForm({ ...form, intervenant: e.target.value })} placeholder="Technicien, prestataire, bureau de contrôle…" />
        </div>
        <div className="fld">
          <label>Récurrence</label>
          <select value={form.recurrence_jours || 0} onChange={(e) => setForm({ ...form, recurrence_jours: parseInt(e.target.value) })}>
            {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {form.recurrence_jours > 0 && (
            <p style={{ fontSize: 12, color: "#5aa05a", marginTop: 4 }}>
              <i className="ti ti-info-circle" /> Quand cette maintenance sera marquée Faite, la suivante sera créée automatiquement à +{form.recurrence_jours} jour(s).
            </p>
          )}
        </div>
        <div className="fld">
          <label>Notes</label>
          <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Détails, prescriptions, références…" />
        </div>
      </Modal>

      {/* Alpha 0.43.0 : Modale CRUD récurrence */}
      <Modal
        open={!!recurModal}
        onClose={() => setRecurModal(null)}
        kind="materiel"
        title={recurModal?.id ? "Modifier la récurrence" : "Nouvelle récurrence automatique"}
        size="lg"
        footer={<>
          <Btn variant="ghost" onClick={() => setRecurModal(null)}>Annuler</Btn>
          <NeonButton variant="blue" icon="ti-device-floppy" onClick={saveRecur}>
            Enregistrer
          </NeonButton>
        </>}
      >
        <p style={{ fontSize: 12.5, color: "#6c7a89", margin: "0 0 14px" }}>
          <i className="ti ti-info-circle" /> Une récurrence définit une maintenance qui revient régulièrement. La prochaine échéance est calculée automatiquement.
        </p>
        <div className="fld">
          <label>Matériel *</label>
          <select
            value={recurForm.materiel_id || ""}
            onChange={(e) => setRecurForm({ ...recurForm, materiel_id: e.target.value })}
          >
            <option value="">— Sélectionner —</option>
            {materiels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.libelle}
                {m.num_parc ? ` (Parc ${m.num_parc})` : ""}
                {m.num_serie ? ` · S/N ${m.num_serie}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="fld-row">
          <div className="fld">
            <label>Type</label>
            <select
              value={recurForm.type || "Préventive"}
              onChange={(e) => setRecurForm({ ...recurForm, type: e.target.value })}
            >
              <option value="Préventive">Préventive</option>
              <option value="Calibration">Calibration</option>
              <option value="Vérification">Vérification</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div className="fld">
            <label>Fréquence (jours) *</label>
            <input
              type="number"
              min="1"
              value={recurForm.frequence_jours || ""}
              onChange={(e) => setRecurForm({ ...recurForm, frequence_jours: e.target.value })}
              placeholder="Ex: 90, 180, 365"
            />
          </div>
        </div>
        <div className="fld">
          <label>Libellé (optionnel)</label>
          <input
            value={recurForm.libelle || ""}
            onChange={(e) => setRecurForm({ ...recurForm, libelle: e.target.value })}
            placeholder="Ex: Révision annuelle constructeur"
          />
        </div>
        <div className="fld-row">
          <div className="fld">
            <label>Dernière réalisée (optionnel)</label>
            <input
              type="date"
              value={recurForm.derniere_realisee ? String(recurForm.derniere_realisee).slice(0, 10) : ""}
              onChange={(e) => setRecurForm({ ...recurForm, derniere_realisee: e.target.value })}
            />
          </div>
          <div className="fld">
            <label>Prochaine due (auto si vide)</label>
            <input
              type="date"
              value={recurForm.prochaine_due ? String(recurForm.prochaine_due).slice(0, 10) : ""}
              onChange={(e) => setRecurForm({ ...recurForm, prochaine_due: e.target.value })}
            />
          </div>
        </div>
        <div className="fld">
          <label>
            <input
              type="checkbox"
              checked={recurForm.actif !== false}
              onChange={(e) => setRecurForm({ ...recurForm, actif: e.target.checked })}
            /> Actif
          </label>
        </div>
        <div className="fld">
          <label>Notes</label>
          <textarea
            value={recurForm.notes || ""}
            onChange={(e) => setRecurForm({ ...recurForm, notes: e.target.value })}
            rows={2}
            placeholder="Référence prestataire, points de vigilance…"
          />
        </div>
      </Modal>
    </div>
  );
}

// Alpha 0.43.0 : composant vue calendrier mensuelle
const MOIS_CAL = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_CAL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function CalendrierMaintenance({ rows, mois, setMois, openEdit, statutEffectif }) {
  const year = mois.getFullYear();
  const m = mois.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  // jour de semaine du 1er (0=dim → on remap à 6, sinon -1 pour démarrer lundi)
  const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  // Group maintenance par jour (date_prevue)
  const byDay = {};
  rows.forEach((r) => {
    if (!r.date_prevue) return;
    const d = r.date_prevue.slice(0, 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  });

  const today = new Date().toISOString().slice(0, 10);

  function prevMois() { setMois(new Date(year, m - 1, 1)); }
  function nextMois() { setMois(new Date(year, m + 1, 1)); }
  function thisMois() { setMois(new Date()); }

  return (
    <div>
      {/* Header navigation mois */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={prevMois} style={{ padding: "6px 12px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-chevron-left" /> Mois précédent
        </button>
        <h3 style={{ margin: 0, fontSize: 18, color: "#142131", fontWeight: 700 }}>
          {MOIS_CAL[m]} {year}
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={thisMois} style={{ padding: "6px 12px", border: "1px solid #185FA5", borderRadius: 6, background: "#fff", color: "#185FA5", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            Aujourd'hui
          </button>
          <button onClick={nextMois} style={{ padding: "6px 12px", border: "1px solid #e3e9ee", borderRadius: 6, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            Mois suivant <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>

      {/* Grille calendrier */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 12 }}>
        {JOURS_CAL.map((j) => (
          <div key={j} style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700, color: "#6c7a89", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", background: "#f4f7fa", borderRadius: 6 }}>
            {j}
          </div>
        ))}
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - offset + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const dateISO = inMonth ? `${year}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}` : null;
          const events = dateISO ? (byDay[dateISO] || []) : [];
          const isToday = dateISO === today;
          return (
            <div
              key={i}
              style={{
                minHeight: 80,
                padding: 6,
                background: !inMonth ? "#fafbfc" : isToday ? "#eef5fc" : "#fff",
                border: isToday ? "2px solid #185FA5" : "1px solid #e3e9ee",
                borderRadius: 6,
                opacity: !inMonth ? 0.4 : 1,
              }}
            >
              {inMonth && (
                <>
                  <div style={{ fontSize: 11, color: isToday ? "#185FA5" : "#6c7a89", fontWeight: isToday ? 700 : 500, marginBottom: 4 }}>
                    {dayNum}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {events.slice(0, 3).map((r) => {
                      const stEff = statutEffectif(r);
                      const col = COULEUR_STATUT[stEff] || "#8a98a8";
                      return (
                        <button
                          key={r.id}
                          onClick={() => openEdit(r)}
                          style={{
                            background: col + "22",
                            border: `1px solid ${col}55`,
                            borderLeft: `3px solid ${col}`,
                            color: col,
                            padding: "3px 5px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "inherit",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={`${r.materiels?.libelle || "?"} — ${r.type}`}
                        >
                          {r.materiels?.libelle?.slice(0, 14) || r.type?.slice(0, 14) || "Maint."}
                        </button>
                      );
                    })}
                    {events.length > 3 && (
                      <span style={{ fontSize: 10, color: "#8a98a8", textAlign: "center" }}>
                        +{events.length - 3}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "#6c7a89" }}>
        {Object.entries(COULEUR_STATUT).map(([s, col]) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: col }} /> {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// Alpha 0.43.0 : panneau Récurrences
function RecurrencesPanel({ recurrences, materiels, openNew, openEdit, markDone, del, canWrite }) {
  const today = new Date().toISOString().slice(0, 10);
  // Catégoriser par urgence d'échéance
  function categoriserRecur(r) {
    if (!r.actif) return "inactif";
    if (!r.prochaine_due) return "sans-date";
    if (r.prochaine_due < today) return "retard";
    const diff = (new Date(r.prochaine_due) - new Date(today)) / 86400000;
    if (diff <= 7) return "imminent";
    if (diff <= 30) return "proche";
    return "ok";
  }
  const cat = {
    retard: recurrences.filter(r => categoriserRecur(r) === "retard"),
    imminent: recurrences.filter(r => categoriserRecur(r) === "imminent"),
    proche: recurrences.filter(r => categoriserRecur(r) === "proche"),
    ok: recurrences.filter(r => categoriserRecur(r) === "ok"),
    sansDate: recurrences.filter(r => categoriserRecur(r) === "sans-date"),
    inactif: recurrences.filter(r => categoriserRecur(r) === "inactif"),
  };

  return (
    <Panel>
      <div className="di-toolbar">
        {canWrite && <NeonButton variant="blue" icon="ti-plus" onClick={openNew}>Nouvelle récurrence</NeonButton>}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6c7a89" }}>
          <i className="ti ti-info-circle" /> Les récurrences génèrent automatiquement des rappels à la prochaine échéance.
        </span>
      </div>

      {recurrences.length === 0 ? (
        <StateMsg>
          Aucune récurrence définie pour cette structure.
          {canWrite && <> <a style={{ color: "#2a5a5a", fontWeight: 600, cursor: "pointer" }} onClick={openNew}>Définir la première</a></>}
        </StateMsg>
      ) : (
        <>
          {/* KPIs catégories */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 14 }}>
            <KpiSmall label="En retard" value={cat.retard.length} color="#c0392b" />
            <KpiSmall label="≤ 7 jours" value={cat.imminent.length} color="#EF9F27" />
            <KpiSmall label="≤ 30 jours" value={cat.proche.length} color="#185FA5" />
            <KpiSmall label="OK" value={cat.ok.length} color="#5aa05a" />
            {cat.sansDate.length > 0 && <KpiSmall label="Sans date" value={cat.sansDate.length} color="#8a98a8" />}
            {cat.inactif.length > 0 && <KpiSmall label="Inactives" value={cat.inactif.length} color="#cfd6dd" />}
          </div>

          {/* Tableau */}
          <div className="panel-table"><table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Matériel</th>
                <th>Type</th>
                <th>Fréquence</th>
                <th>Dernière</th>
                <th>Prochaine</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recurrences.map((r) => {
                const c = categoriserRecur(r);
                const col = c === "retard" ? "#c0392b"
                  : c === "imminent" ? "#EF9F27"
                  : c === "proche" ? "#185FA5"
                  : c === "ok" ? "#5aa05a"
                  : "#8a98a8";
                const labels = { retard: "En retard", imminent: "≤ 7j", proche: "≤ 30j", ok: "OK", "sans-date": "Sans date", inactif: "Inactif" };
                return (
                  <tr key={r.id} style={{ opacity: c === "inactif" ? 0.5 : 1 }}>
                    <td>
                      {r.materiels?.libelle || <span style={{ color: "#c0392b", fontStyle: "italic" }}>Matériel supprimé</span>}
                      {r.materiels?.num_parc && <div style={{ fontSize: 11, color: "#8a98a8" }}>Parc {r.materiels.num_parc}</div>}
                    </td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "#f0edf7", color: "#5e4a8c" }}>{r.type}</span></td>
                    <td style={{ fontSize: 12, color: "#6c7a89" }}>
                      {r.frequence_jours}j
                      {r.libelle && <div style={{ fontSize: 11 }}>{r.libelle}</div>}
                    </td>
                    <td style={{ fontSize: 12 }}>{r.derniere_realisee ? fmtDate(r.derniere_realisee) : "—"}</td>
                    <td style={{ fontSize: 12, fontWeight: c === "retard" || c === "imminent" ? 700 : 400, color: col }}>
                      {r.prochaine_due ? fmtDate(r.prochaine_due) : "—"}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: col + "22", color: col }}>
                        {labels[c]}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {canWrite && r.actif && (
                        <button
                          onClick={() => markDone(r)}
                          style={{ background: "#5aa05a", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, fontWeight: 600, cursor: "pointer", marginRight: 4 }}
                          title="Marquer comme faite aujourd'hui (recalcule la prochaine)"
                        >
                          <i className="ti ti-check" /> Faite
                        </button>
                      )}
                      {canWrite && (
                        <>
                          <button
                            onClick={() => openEdit(r)}
                            style={{ background: "#fff", border: "1px solid #EF9F27", color: "#a06a15", padding: "4px 8px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, cursor: "pointer", marginRight: 4 }}
                            title="Modifier"
                          >
                            <i className="ti ti-edit" />
                          </button>
                          <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => del(r)} />
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </>
      )}
    </Panel>
  );
}

function KpiSmall({ label, value, color }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}44`, borderRadius: 8, padding: "8px 12px", textAlign: "left" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".4px", fontWeight: 600, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
