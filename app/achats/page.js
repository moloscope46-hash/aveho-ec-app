"use client";
// Page Achats — Workflow d'achat matériel/articles fournisseur.
// Demandeur crée Brouillon → soumet À valider → Manager valide/refuse
// → si validée, peut passer à Commandée → Reçue.
// (Distinct du module Commandes existant qui gère le panier vers magasins)
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from "../ui";
import { EmptyState, SkeletonRow } from "../components/ui-premium";
import { fmtDate } from "../../lib/format";
import { logEvent } from "../../lib/events";
import { safeInsert, safeUpdate, safeDelete } from "../../lib/safeWrite";
import AchatPreview from "../AchatPreview";
import { safeFetch } from "../../lib/offlineCache";
import StaleDataBanner from "../StaleDataBanner";
import { useStickyState } from "../../lib/useStickyState";
// 0.58.54 : filtre contexte bât/svc via patient_id
import { useContextPatientIds } from "../../lib/useContextPatientIds";
// 0.58.45 : hook pour les page-actions du Cmd+K
import { usePageAction } from "../../lib/usePageAction";
// 0.58.22 : NeonButton premium pour boutons d'action principaux
import { NeonButton } from "../components/ui-premium";

import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";
const STATUTS = [
  { value: "Brouillon", color: "#8a98a8", icon: "ti-file-pencil" },
  { value: "À valider", color: "#EF9F27", icon: "ti-clock" },
  { value: "Validée", color: "#5aa05a", icon: "ti-check" },
  { value: "Refusée", color: "#e35d5b", icon: "ti-x" },
  { value: "Commandée", color: "#185FA5", icon: "ti-truck" },
  { value: "Reçue", color: "#7a6fb0", icon: "ti-package" },
  { value: "Annulée", color: "#8a98a8", icon: "ti-ban" },
];

// Alpha 0.16.1 : wrapper pour useSearchParams (Suspense requis par Next.js)
export default function AchatsPage() {
  return (
    <Suspense fallback={null}>
      <AchatsInner />
    </Suspense>
  );
}

function AchatsInner() {
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [lignes, setLignes] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [formLignes, setFormLignes] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [fStatut, setFStatut] = useStickyState("", "achats:fStatut");
  const [refusModal, setRefusModal] = useState(null);
  const [motifRefus, setMotifRefus] = useState("");

  const isManager = auth.role?.nom === "Administrateur" || auth.can?.("gerer_roles");

  const [staleData, setStaleData] = useState(false);

  // 0.58.45 : export CSV des achats + page-actions Cmd+K
  async function exportAchatsCsv() {
    try {
      // Respecte le filtre fStatut courant si actif
      const data = fStatut ? (rows || []).filter(r => r.statut === fStatut) : (rows || []);
      const { exportRows } = await import("../../lib/exportExcel");
      await exportRows(data, {
        filename: `achats_${new Date().toISOString().slice(0, 10)}`,
        sheetName: "Achats",
        columns: {
          "Numéro": (r) => r.numero || r.id || "",
          "Date demande": (r) => r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "",
          "Demandeur": (r) => r.demandeur_nom || "",
          "Fournisseur": (r) => r.fournisseur || "",
          "Statut": "statut",
          "Total estimé": (r) => Number(r.total_estime || r.montant || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          "Motif": "motif",
          "Date validation": (r) => r.date_validation || "",
        },
      });
    } catch (e) {
      console.error("Export CSV achats :", e);
    }
  }
  usePageAction("open-new", () => { setForm({}); setFormLignes([]); setModal({}); setErr(""); });
  usePageAction("export-csv", () => exportAchatsCsv());

  async function load() {
    if (!auth.structureId) { setLoading(false); return; }
    const etabKey = auth.etabId || "all";
    // Alpha 0.27.0 : safeFetch pour cache offline
    const result = await safeFetch(
      `achats:etab:${etabKey}`,
      () => {
        let q = supabase.from("achats").select("*").order("created_at", { ascending: false });
        if (auth.etabId) q = q.eq("etablissement_id", auth.etabId);
        return q;
      }
    );
    setStaleData(result.fromCache === true);
    const data = result.data || [];
    setRows(data);
    if (data.length > 0) {
      const ids = data.map((c) => c.id);
      const { data: lg } = await supabase.from("achats_lignes").select("*").in("achat_id", ids);
      const byCmd = {};
      (lg || []).forEach((l) => {
        if (!byCmd[l.achat_id]) byCmd[l.achat_id] = [];
        byCmd[l.achat_id].push(l);
      });
      setLignes(byCmd);
    }
    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  // Alpha 0.16.1 : pré-remplissage depuis query params
  // Exemple : /achats?nouvelle=oui&designation=Lit+Hill-Rom&motif=Remplacement&qte=1&prix=2400
  useEffect(() => {
    if (!auth.ready || loading) return;
    if (searchParams.get("nouvelle") !== "oui") return;
    const designation = searchParams.get("designation") || "";
    const motif = searchParams.get("motif") || "";
    const qte = parseFloat(searchParams.get("qte") || "1");
    const prix = parseFloat(searchParams.get("prix") || "0");
    const fournisseur = searchParams.get("fournisseur") || "";
    const numero = `CMD-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    setForm({
      numero,
      statut: "Brouillon",
      date_souhaitee: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      motif: motif || (designation ? `Remplacement de ${designation}` : ""),
      fournisseur,
    });
    setFormLignes([{ designation, quantite: qte, prix_unitaire: prix }]);
    setModal({});
    setErr("");
    // Nettoie l'URL pour éviter re-trigger au refresh
    router.replace("/achats");
  }, [auth.ready, loading, searchParams]);

  function openNew() {
    const numero = `CMD-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    setForm({ numero, statut: "Brouillon", date_souhaitee: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });
    setFormLignes([{ designation: "", quantite: 1, prix_unitaire: 0 }]);
    setModal({}); setErr("");
  }
  function openEdit(c) {
    setForm({ ...c });
    setFormLignes(lignes[c.id] ? [...lignes[c.id]] : [{ designation: "", quantite: 1, prix_unitaire: 0 }]);
    setModal(c); setErr("");
  }

  function addLigne() { setFormLignes([...formLignes, { designation: "", quantite: 1, prix_unitaire: 0 }]); }
  function delLigne(i) { setFormLignes(formLignes.filter((_, idx) => idx !== i)); }
  function updLigne(i, k, v) { setFormLignes(formLignes.map((l, idx) => idx === i ? { ...l, [k]: v } : l)); }

  const totalForm = formLignes.reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_unitaire) || 0), 0);

  async function save() {
    if (!form.numero?.trim()) { setErr("Le numéro est obligatoire."); return; }
    if (!form.motif?.trim()) { setErr("Le motif est obligatoire."); return; }
    if (formLignes.length === 0 || formLignes.every((l) => !l.designation?.trim())) { setErr("Au moins une ligne avec désignation est obligatoire."); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId,
        numero: form.numero.trim(),
        fournisseur: form.fournisseur || null,
        motif: form.motif.trim(),
        budget_estime: parseFloat(form.budget_estime) || totalForm || null,
        // Alpha 0.50.0 : seuil de double validation
        seuil_double_validation: form.seuil_double_validation ? parseFloat(form.seuil_double_validation) : null,
        statut: form.statut || "Brouillon",
        date_souhaitee: form.date_souhaitee || null,
        notes: form.notes || null,
        demandeur_id: form.demandeur_id || auth.user?.id || null,
        updated_at: new Date().toISOString(),
      };
      let cmdId = modal?.id;
      const userId = auth.user?.id;
      if (modal?.id) {
        // Alpha 0.26.0 : safeUpdate
        await safeUpdate(supabase, "achats", payload, { id: modal.id }, { userId });
      } else {
        // UUID client pour offline + récupération immédiate de l'id
        const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
        const insertPayload = newId ? { id: newId, ...payload } : payload;
        const { data: ins, queued } = await safeInsert(supabase, "achats", insertPayload, { userId, returning: true });
        cmdId = queued ? newId : (ins?.id || newId);
      }
      if (cmdId) {
        // Pour les lignes, on supprime puis recrée (idempotent à la sync)
        await safeDelete(supabase, "achats_lignes", { achat_id: cmdId }, { userId });
        const lignesPayload = formLignes
          .filter((l) => l.designation?.trim())
          .map((l) => ({
            // UUID client pour chaque ligne aussi
            ...(typeof crypto !== "undefined" && crypto.randomUUID ? { id: crypto.randomUUID() } : {}),
            achat_id: cmdId,
            structure_id: auth.structureId,
            designation: l.designation.trim(),
            quantite: parseFloat(l.quantite) || 1,
            prix_unitaire: parseFloat(l.prix_unitaire) || null,
            notes: l.notes || null,
          }));
        if (lignesPayload.length > 0) {
          // Bulk insert : on insère le tableau d'un coup
          await safeInsert(supabase, "achats_lignes", lignesPayload, { userId });
        }
      }
      setModal(null);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function soumettre(c) {
    if (!await dialogs.confirm({ title: `Soumettre ${c.numero} à validation ?`, variant: "danger" })) return;
    await safeUpdate(supabase, "achats",
      { statut: "À valider", updated_at: new Date().toISOString() },
      { id: c.id },
      { userId: auth.user?.id }
    );
    await logEvent(supabase, auth, {
      action: "soumettre", entite: "commande", entite_id: c.id,
      details: { numero: c.numero, montant: c.budget_estime },
      notif: true,
      titre: "Commande à valider",
      message: `${c.numero} en attente de validation.`,
      lien: "/achats",
    });
    // Alpha 0.53.0 (BC) : notifier par email les valideurs
    try {
      const { notifyValideurs } = await import("../../lib/notifyValideurs");
      notifyValideurs(supabase, { 
        structureId: auth.structureId, 
        achat: c, 
        demandeurEmail: auth.user?.email,
      })
        .then(({ sent, errors }) => {
          if (sent > 0) logger.debug(`📧 ${sent} valideur(s) notifié(s) par email`);
          if (errors.length > 0) logger.warn("Erreurs envoi email :", errors);
        })
        .catch((e) => {
          // 0.57.5 : le try ne couvre pas la promise async qui s'exécute plus tard
          logger.warn("notifyValideurs a échoué :", e?.message);
        });
    } catch (e) {
      logger.warn("notifyValideurs non disponible :", e?.message);
    }
    await load();
  }
  async function valider(c) {
    // Alpha 0.50.0 : workflow double validation si budget dépasse le seuil
    const necessiteDoubleValid = c.seuil_double_validation != null && c.budget_estime > c.seuil_double_validation;
    
    if (!await dialogs.confirm({ 
      title: `Valider la commande ${c.numero} ?`, 
      message: necessiteDoubleValid ? `Budget ${c.budget_estime}€ > seuil ${c.seuil_double_validation}€ → une 2ème validation sera requise.` : undefined,
      variant: "danger" 
    })) return;
    
    await safeUpdate(supabase, "achats", {
      statut: necessiteDoubleValid ? "Validée (1/2)" : "Validée",
      valideur_id: auth.user?.id,
      workflow_etape: necessiteDoubleValid ? "double_valid_attente" : "double_valid",
      updated_at: new Date().toISOString(),
    }, { id: c.id }, { userId: auth.user?.id });
    
    await logEvent(supabase, auth, {
      action: necessiteDoubleValid ? "valider_premiere" : "valider",
      entite: "commande", entite_id: c.id,
      details: { numero: c.numero, necessite_double_valid: necessiteDoubleValid },
      notif: true, titre: necessiteDoubleValid ? "1ère validation — 2nde attendue" : "Commande validée",
      message: necessiteDoubleValid 
        ? `${c.numero} validée 1/2 — en attente d'une seconde validation (budget ${c.budget_estime}€).`
        : `${c.numero} validée — prête à être envoyée au fournisseur.`,
      lien: "/achats",
    });
    await load();
  }
  
  // Alpha 0.50.0 : seconde validation
  async function validerSecondeFois(c) {
    if (c.valideur_id === auth.user?.id) {
      await dialogs.alert({ title: "Action impossible", message: "Vous avez déjà donné la première validation. Une autre personne doit valider en seconde lecture." });
      return;
    }
    if (!await dialogs.confirm({ 
      title: `Donner la 2ème validation pour ${c.numero} ?`,
      message: `Budget ${c.budget_estime}€ — première validation par ${c.valideur_id?.slice(0, 8) || "?"}.`,
      variant: "danger" 
    })) return;
    
    await safeUpdate(supabase, "achats", {
      statut: "Validée",
      second_valideur_id: auth.user?.id,
      date_second_validation: new Date().toISOString(),
      workflow_etape: "double_valid",
      updated_at: new Date().toISOString(),
    }, { id: c.id }, { userId: auth.user?.id });
    
    await logEvent(supabase, auth, {
      action: "valider_seconde", entite: "commande", entite_id: c.id,
      details: { numero: c.numero },
      notif: true, titre: "Commande validée (2/2)",
      message: `${c.numero} doublement validée — prête à être envoyée au fournisseur.`,
      lien: "/achats",
    });
    await load();
  }
  async function refuser() {
    if (!motifRefus.trim()) return;
    await safeUpdate(supabase, "achats", {
      statut: "Refusée", valideur_id: auth.user?.id,
      motif_refus: motifRefus, updated_at: new Date().toISOString(),
    }, { id: refusModal.id }, { userId: auth.user?.id });
    await logEvent(supabase, auth, {
      action: "refuser", entite: "commande", entite_id: refusModal.id,
      details: { numero: refusModal.numero, motif: motifRefus },
      notif: true, titre: "Commande refusée",
      message: `${refusModal.numero} refusée — ${motifRefus.slice(0, 80)}`,
      lien: "/achats",
    });
    setRefusModal(null); setMotifRefus("");
    await load();
  }
  async function passerCommande(c) {
    if (!await dialogs.confirm({ title: `Marquer ${c.numero} comme envoyée au fournisseur ?`, variant: "danger" })) return;
    await safeUpdate(supabase, "achats", {
      statut: "Commandée", date_commande: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }, { id: c.id }, { userId: auth.user?.id });
    await load();
  }
  async function recevoir(c) {
    const montant = prompt(`Montant réel à réception (€) ?`, c.budget_estime || "");
    if (montant === null) return;
    await safeUpdate(supabase, "achats", {
      statut: "Reçue",
      date_reception: new Date().toISOString().slice(0, 10),
      budget_reel: parseFloat(montant) || null,
      updated_at: new Date().toISOString(),
    }, { id: c.id }, { userId: auth.user?.id });
    await load();
  }
  async function annuler(c) {
    if (!await dialogs.confirm({ title: `Annuler ${c.numero} ?`, variant: "danger" })) return;
    await safeUpdate(supabase, "achats", { statut: "Annulée", updated_at: new Date().toISOString() }, { id: c.id }, { userId: auth.user?.id });
    await load();
  }
  async function del(c) {
    if (!await dialogs.confirm({ title: `Supprimer définitivement ${c.numero} ?`, variant: "danger" })) return;
    await safeDelete(supabase, "achats", { id: c.id }, { userId: auth.user?.id });
    await load();
  }

  if (!auth.ready) return null;

  // 0.58.54 : filtre ctx (bâtiment/service) via patients liés
  const { patientIds, ctx } = useContextPatientIds();
  const rowsCtxFiltered = ctx.active
    ? rows.filter(r => {
        if (patientIds && r.patient_id && !patientIds.has(r.patient_id)) return false;
        // 0.58.63 : filtre équipe
        if (ctx.equipeId && r.equipe_id !== ctx.equipeId) return false;
        return true;
      })
    : rows;
  const filtered = fStatut ? rowsCtxFiltered.filter((r) => r.statut === fStatut) : rowsCtxFiltered;
  const compteStatuts = {};
  rowsCtxFiltered.forEach((r) => { compteStatuts[r.statut] = (compteStatuts[r.statut] || 0) + 1; });
  const budgetEngage = rowsCtxFiltered
    .filter((r) => ["Validée", "Commandée", "Reçue"].includes(r.statut))
    .reduce((s, r) => s + (parseFloat(r.budget_reel || r.budget_estime) || 0), 0);

  function statutInfo(s) { return STATUTS.find((x) => x.value === s) || STATUTS[0]; }

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <PageHead eyebrow="WORKFLOW" icon="ti-shopping-cart" title="Achats" accent="matériel & consommables"
          sub="Demandes d'achat fournisseur — workflow demandeur → validation → réception" />

        {staleData && <StaleDataBanner />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 14 }}>
          {["À valider", "Validée", "Commandée", "Reçue"].map((s) => {
            const si = statutInfo(s);
            return (
              <button key={s} onClick={() => setFStatut(fStatut === s ? "" : s)} style={{
                padding: "14px 16px", border: `2px solid ${fStatut === s ? si.color : "#e3e9ee"}`,
                background: fStatut === s ? si.color + "1a" : "#fff",
                borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`ti ${si.icon}`} style={{ color: si.color, fontSize: 16 }} />
                  <span style={{ fontSize: 12, color: "#6c7a89", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>{s}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#142131", marginTop: 4 }}>{compteStatuts[s] || 0}</div>
              </button>
            );
          })}
          <div style={{ padding: "14px 16px", border: "2px solid #e3e9ee", borderRadius: 12, background: "linear-gradient(135deg,#142131 0%,#2a5a5a 100%)", color: "#fff" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, opacity: .8 }}>Budget engagé</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{budgetEngage.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</div>
          </div>
        </div>

        <Panel>
          <div className="di-toolbar">
            {/* 0.58.22 : NeonButton variant=amber pour bouton "Nouvelle demande d'achat" */}
            {auth.can("ecrire") && <NeonButton variant="amber" icon="ti-plus" onClick={openNew}>Nouvelle demande d'achat</NeonButton>}
            {fStatut && <Btn variant="ghost" icon="ti-x" onClick={() => setFStatut("")}>Effacer filtre</Btn>}
          </div>
          {loading ? (
            /* 0.58.9 : SkeletonRow x 4 */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3].map((i) => <SkeletonRow key={i} cols={5} />)}
            </div>
          )
            : rows.length === 0 ? (
              <EmptyState
                illustration="folder"
                variant="amber"
                title="Aucune demande d'achat"
                message="Crée ta première demande d'achat pour commander du matériel ou des consommables auprès du fournisseur."
                actionLabel="Créer la première demande"
                onAction={openNew}
              />
            )
            : filtered.length === 0 ? (
              <EmptyState
                illustration="search"
                variant="gray"
                title="Aucun résultat"
                message="Aucune demande d'achat dans ce statut."
                compact
              />
            )
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((c) => {
                  const si = statutInfo(c.statut);
                  const cLignes = lignes[c.id] || [];
                  const total = cLignes.reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_unitaire) || 0), 0);
                  return (
                    <div key={c.id} style={{ padding: "14px 18px", border: "1px solid #e3e9ee", borderRadius: 12, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>
                              {/* Alpha 0.39.0 : preview au hover */}
                              <AchatPreview
                                achat={{
                                  ...c,
                                  montant_total: c.budget_reel || c.budget_estime || total,
                                }}
                              >
                                {c.numero}
                              </AchatPreview>
                            </span>
                            <span style={{ background: si.color + "22", color: si.color, padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, border: `1px solid ${si.color}44`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <i className={`ti ${si.icon}`} /> {c.statut}
                            </span>
                            {c.fournisseur && <span style={{ color: "#6c7a89", fontSize: 12 }}>· {c.fournisseur}</span>}
                          </div>
                          <p style={{ margin: "0 0 6px", fontSize: 13, color: "#2a3a48" }}>{c.motif}</p>
                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#6c7a89" }}>
                            <span>{cLignes.length} ligne(s)</span>
                            <span><b>{(c.budget_reel || c.budget_estime || total).toLocaleString("fr-FR")} €</b>{c.budget_reel ? " réel" : c.budget_estime ? " estimé" : ""}</span>
                            {c.date_souhaitee && <span><i className="ti ti-calendar" /> Souhaitée {fmtDate(c.date_souhaitee)}</span>}
                            {c.date_reception && <span style={{ color: "#5aa05a" }}><i className="ti ti-check" /> Reçue {fmtDate(c.date_reception)}</span>}
                          </div>
                          {c.motif_refus && (
                            <div style={{ marginTop: 8, padding: "8px 12px", background: "#fde0dc", borderLeft: "3px solid #e35d5b", borderRadius: 6, fontSize: 12 }}>
                              <b>Refus :</b> {c.motif_refus}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                          {auth.can("ecrire") && c.statut === "Brouillon" && (
                            <Btn variant="ghost" icon="ti-send" onClick={() => soumettre(c)}>Soumettre</Btn>
                          )}
                          {isManager && c.statut === "À valider" && (
                            <>
                              <Btn variant="ghost" icon="ti-check" onClick={() => valider(c)}>Valider</Btn>
                              <Btn variant="ghost" icon="ti-x" onClick={() => setRefusModal(c)}>Refuser</Btn>
                            </>
                          )}
                          {/* Alpha 0.50.0 : bouton 2nde validation si statut intermédiaire */}
                          {isManager && c.statut === "Validée (1/2)" && (
                            <Btn variant="ghost" icon="ti-check-checks" onClick={() => validerSecondeFois(c)}>Valider en 2nde lecture</Btn>
                          )}
                          {auth.can("ecrire") && c.statut === "Validée" && (
                            <Btn variant="ghost" icon="ti-truck" onClick={() => passerCommande(c)}>Commander</Btn>
                          )}
                          {auth.can("ecrire") && c.statut === "Commandée" && (
                            <Btn variant="ghost" icon="ti-package" onClick={() => recevoir(c)}>Réceptionner</Btn>
                          )}
                          <div style={{ display: "flex", gap: 6 }}>
                            <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", padding: 6 }} onClick={() => openEdit(c)} title="Modifier" />
                            {c.statut !== "Annulée" && c.statut !== "Reçue" && (
                              <i className="ti ti-ban" style={{ color: "#8a98a8", cursor: "pointer", padding: 6 }} onClick={() => annuler(c)} title="Annuler" />
                            )}
                            {isManager && (
                              <i className="ti ti-trash" style={{ color: "#C9867F", cursor: "pointer", padding: 6 }} onClick={() => del(c)} title="Supprimer" />
                            )}
                          </div>
                        </div>
                      </div>
                      {cLignes.length > 0 && (
                        <details style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee" }}>
                          <summary style={{ cursor: "pointer", fontSize: 12, color: "#6c7a89", fontWeight: 600 }}>Voir les {cLignes.length} ligne(s) détaillée(s)</summary>
                          <div className="panel-table"><table style={{ marginTop: 8 }}>
                            <thead><tr><th>Désignation</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>
                            <tbody>
                              {cLignes.map((l) => (
                                <tr key={l.id}>
                                  <td style={{ fontSize: 12 }}>{l.designation}{l.notes && <div style={{ color: "#8a98a8", fontSize: 11 }}>{l.notes}</div>}</td>
                                  <td style={{ fontSize: 12 }}>{l.quantite}</td>
                                  <td style={{ fontSize: 12 }}>{l.prix_unitaire ? `${parseFloat(l.prix_unitaire).toLocaleString("fr-FR")} €` : "—"}</td>
                                  <td style={{ fontSize: 12, fontWeight: 600 }}>{(parseFloat(l.quantite) * parseFloat(l.prix_unitaire || 0)).toLocaleString("fr-FR")} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </Panel>
      </div>

      <Modal open={!!modal} onClose={() => !busy && setModal(null)} kind="materiel"
        title={modal?.id ? `Modifier ${modal.numero}` : "Nouvelle demande d'achat"}
        footer={<>
          <Btn variant="ghost" onClick={() => setModal(null)} disabled={busy}>Annuler</Btn>
          <Btn variant="primary" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</Btn>
        </>}
      >
        {err && <div className="err">{err}</div>}
        <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fld">
            <label>Numéro *</label>
            <input value={form.numero || ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          </div>
          <div className="fld">
            <label>Fournisseur</label>
            <input value={form.fournisseur || ""} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} placeholder="Bastide, Philips, Hartmann…" />
          </div>
        </div>
        <div className="fld">
          <label>Motif *</label>
          <textarea value={form.motif || ""} onChange={(e) => setForm({ ...form, motif: e.target.value })} rows={2} placeholder="Pourquoi cet achat ?" />
        </div>
        <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="fld">
            <label>Budget estimé (€)</label>
            <input type="number" step="0.01" value={form.budget_estime || ""} onChange={(e) => setForm({ ...form, budget_estime: e.target.value })} placeholder={totalForm > 0 ? `Auto : ${totalForm.toFixed(2)}` : "0.00"} />
          </div>
          <div className="fld">
            <label>Date souhaitée</label>
            <input type="date" value={form.date_souhaitee || ""} onChange={(e) => setForm({ ...form, date_souhaitee: e.target.value })} />
          </div>
        </div>
        {/* Alpha 0.50.0 : seuil de double validation (admin uniquement) */}
        {isManager && (
          <div className="fld">
            <label>Seuil double validation (€) <span style={{ fontSize: 11, color: "#8a98a8", fontWeight: 400 }}>— Si le budget dépasse ce seuil, une 2nde validation sera demandée</span></label>
            <input type="number" step="0.01" value={form.seuil_double_validation || ""} onChange={(e) => setForm({ ...form, seuil_double_validation: e.target.value })} placeholder="Laisser vide pour pas de double valid" />
          </div>
        )}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #e3e9ee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: "#142131" }}>Lignes</h3>
            <Btn variant="ghost" icon="ti-plus" onClick={addLigne}>Ajouter</Btn>
          </div>
          {formLignes.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input value={l.designation || ""} onChange={(e) => updLigne(i, "designation", e.target.value)} placeholder="Désignation" />
              <input type="number" step="0.01" value={l.quantite || ""} onChange={(e) => updLigne(i, "quantite", e.target.value)} placeholder="Qté" />
              <input type="number" step="0.01" value={l.prix_unitaire || ""} onChange={(e) => updLigne(i, "prix_unitaire", e.target.value)} placeholder="P.U. €" />
              <IconButton icon="ti-trash" color="#C9867F" ariaLabel="Supprimer" onClick={() => delLigne(i)} />
            </div>
          ))}
          <div style={{ textAlign: "right", marginTop: 8, fontSize: 13, color: "#142131", fontWeight: 600 }}>
            Total estimé : {totalForm.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
        <div className="fld" style={{ marginTop: 14 }}>
          <label>Notes internes</label>
          <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
      </Modal>

      <Modal open={!!refusModal} onClose={() => setRefusModal(null)} kind="patient"
        title={`Refuser ${refusModal?.numero}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setRefusModal(null)}>Annuler</Btn>
          <Btn variant="primary" onClick={refuser} disabled={!motifRefus.trim()}>Confirmer le refus</Btn>
        </>}
      >
        <p style={{ color: "#6c7a89", fontSize: 13, margin: "0 0 12px" }}>
          Pourquoi refuses-tu cette commande ? Le motif sera visible par le demandeur.
        </p>
        <div className="fld">
          <label>Motif du refus *</label>
          <textarea value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} rows={4} placeholder="Budget dépassé, doublon, fournisseur non agréé…" />
        </div>
      </Modal>
    </div>
  );
}
