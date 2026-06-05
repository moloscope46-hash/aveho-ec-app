"use client";
// =============================================================
//  Page Patients
//  Liste, création, édition, suppression des patients de l'établissement courant
//  + RATTACHEMENT à une chambre via un sélecteur de lit (lit libre OU lit déjà
//    occupé par ce patient). La sauvegarde fait deux choses :
//    1) elle écrit le patient dans la table `patients`
//    2) elle met à jour la table `lits` pour pointer le bon `patient_id`
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import CompactToggle from "../CompactToggle";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Modal, Btn, IconButton } from "../ui";
import { EmptyState, toast, SkeletonRow } from "../components/ui-premium";
import { KpiRow } from "../kpis";
import ConsentementRGPD from "../ConsentementRGPD";
import PatientPreview from "../PatientPreview";
import StaleDataBanner from "../StaleDataBanner";
import { safeInsert, safeUpdate, safeDelete } from "../../lib/safeWrite";
import { safeFetch } from "../../lib/offlineCache";
import { useStickyState } from "../../lib/useStickyState";
import AdresseAutocomplete from "../AdresseAutocomplete";

import { dialogs } from "../dialogs";
import { logger } from "../../lib/logger";
// 0.58.23 : NeonButton premium pour boutons d'action
import { NeonButton } from "../components/ui-premium";
export default function Patients() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();

  // --- état principal ---
  const [rows, setRows] = useState([]);          // patients de l'établissement
  const [chambres, setChambres] = useState([]);  // chambres avec leurs lits
  // Alpha 0.9 : étiquettes
  const [etiquettes, setEtiquettes] = useState([]);         // étiquettes définies dans la collectivité
  const [patEtiquettes, setPatEtiquettes] = useState({});   // {patient_id: [etiquette_id, ...]}
  const [etqModal, setEtqModal] = useState(null);           // patient ouvert pour gérer ses étiquettes
  const [loading, setLoading] = useState(true);
  // Alpha 0.46.0 : sélection bulk
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // --- modale création/édition ---
  const [modal, setModal] = useState(null);      // null | {} (nouveau) | row (édition)
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Alpha 0.7 : filtres avancés
  const [filters, setFilters] = useStickyState({ q: "", service: "", chambre: "", etat: "", etiquette: "" }, "patients:filters");
  const [showFilters, setShowFilters] = useState(false);
  // Alpha 0.21.0 : modale consentement RGPD à la création de patient
  const [consentModal, setConsentModal] = useState(null); // patient pour lequel ouvrir le RGPD
  const [consentStatus, setConsentStatus] = useState({}); // {patient_id: a_consenti}
  // Alpha 0.38.0 : compteurs DI/achats actifs par patient pour preview hover
  const [patStats, setPatStats] = useState({}); // {patient_id: { nbDI, nbAchats }}

  // ---------- CHARGEMENT ----------
  // Alpha 0.27.0 : indicateur lecture depuis cache offline
  const [staleData, setStaleData] = useState(false);

  async function load() {
    if (!auth.etabId) { setRows([]); setLoading(false); return; }
    // Alpha 0.27.0 : safeFetch pour cache offline. Si online → fetch + cache. Si offline → cache.
    const etabId = auth.etabId;
    const pa = await safeFetch(
      `patients:etab:${etabId}`,
      () => supabase.from("patients").select("*").eq("etablissement_id", etabId).order("nom")
    );
    // Indicateur "données potentiellement obsolètes" si on lit depuis cache
    setStaleData(pa.fromCache === true);

    // Pour les référentiels (chambres, services, etc.) on garde le fetch direct ;
    // ils sont chargés rarement et la consistance est moins critique.
    const [ch, sv, et, ba, li] = await Promise.all([
      supabase.from("chambres").select("*"),
      supabase.from("services").select("*"),
      supabase.from("etages").select("*"),
      supabase.from("batiments").select("*").eq("etablissement_id", auth.etabId),
      supabase.from("lits").select("*"),
    ]);
    // on reconstruit le chemin "Bât / Étage / Service / Ch.X — Lit Y"
    // en ne gardant que les éléments rattachés à l'établissement courant (via batiments)
    const batIds = new Set((ba.data || []).map((b) => b.id));
    const etages = (et.data || []).filter((x) => batIds.has(x.batiment_id));
    const etageById = Object.fromEntries(etages.map((e) => [e.id, e]));
    const batById = Object.fromEntries((ba.data || []).map((b) => [b.id, b]));
    const services = (sv.data || []).filter((s) => etageById[s.etage_id]);
    const svcById = Object.fromEntries(services.map((s) => [s.id, s]));
    const chambresVisibles = (ch.data || []).filter((c) => svcById[c.service_id]);
    const chambresWithPath = chambresVisibles.map((c) => {
      const s = svcById[c.service_id];
      const e = etageById[s.etage_id];
      const b = batById[e.batiment_id];
      return { ...c, path: `${b.nom} / ${e.nom} / ${s.nom} / Ch. ${c.nom}`,
        service_nom: s.nom,
        lits: (li.data || []).filter((l) => l.chambre_id === c.id) };
    });
    setRows(pa.data || []);
    setChambres(chambresWithPath);
    // Alpha 0.9 : charger les étiquettes de la collectivité + les liens patient↔étiquette
    const [etqResp, linksResp] = await Promise.all([
      supabase.from("etiquettes").select("*").order("libelle"),
      supabase.from("patient_etiquettes").select("patient_id, etiquette_id"),
    ]);
    setEtiquettes(etqResp.data || []);
    const linksByPat = {};
    (linksResp.data || []).forEach((l) => {
      if (!linksByPat[l.patient_id]) linksByPat[l.patient_id] = [];
      linksByPat[l.patient_id].push(l.etiquette_id);
    });
    setPatEtiquettes(linksByPat);
    // Alpha 0.21.0 : charger les statuts de consentement RGPD
    const { data: consents } = await supabase
      .from("v_patient_consent_status")
      .select("patient_id, a_consenti, derniere_signature, consentements_actifs, consentements_refuses");
    const statusByPat = {};
    (consents || []).forEach((c) => { statusByPat[c.patient_id] = c; });
    setConsentStatus(statusByPat);

    // Alpha 0.38.0 : compteurs DI ouvertes par patient (pour preview hover).
    // Alpha 0.52.8 : retrait de la requête achats — la table achats n'a pas
    // de patient_id (les achats sont rattachés à un établissement, pas à un
    // patient). Le bug renvoyait silencieusement 400 Bad Request depuis la 0.38.
    supabase.from("interventions")
      .select("patient_id, statut")
      .eq("etablissement_id", auth.etabId)
      .not("statut", "in", "(\"Clôturée\",\"Refusée\")")
      .then((diResp) => {
        const stats = {};
        (diResp.data || []).forEach((d) => {
          if (!d.patient_id) return;
          if (!stats[d.patient_id]) stats[d.patient_id] = { nbDI: 0 };
          stats[d.patient_id].nbDI++;
        });
        setPatStats(stats);
      })
      .catch((e) => logger.warn("patStats:", e?.message));

    setLoading(false);
  }
  useEffect(() => { if (auth.ready) load(); }, [auth.ready, auth.etabId]);

  // Alpha 0.9 : basculer une étiquette sur un patient
  async function toggleEtiquette(patientId, etiquetteId) {
    const current = patEtiquettes[patientId] || [];
    if (current.includes(etiquetteId)) {
      // retirer
      await safeDelete(supabase, "patient_etiquettes",
        { patient_id: patientId, etiquette_id: etiquetteId },
        { userId: auth.user?.id }
      );
      setPatEtiquettes({ ...patEtiquettes, [patientId]: current.filter((id) => id !== etiquetteId) });
    } else {
      // ajouter
      await safeInsert(supabase, "patient_etiquettes", {
        patient_id: patientId, etiquette_id: etiquetteId, structure_id: auth.structureId,
      }, { userId: auth.user?.id });
      setPatEtiquettes({ ...patEtiquettes, [patientId]: [...current, etiquetteId] });
    }
  }

  // ---------- HELPERS ----------
  // lit actuellement occupé par un patient (si c'est une édition)
  const litDuPatient = (patientId) => {
    for (const ch of chambres) {
      const l = ch.lits.find((x) => x.patient_id === patientId);
      if (l) return { ...l, chambrePath: ch.path };
    }
    return null;
  };
  // liste des lits "choisissables" : tous les lits libres + le lit actuel du patient (si édition)
  const litsChoisissables = (patientId) => {
    const out = [];
    chambres.forEach((ch) => ch.lits.forEach((l) => {
      if (!l.patient_id || l.patient_id === patientId) {
        out.push({ id: l.id, label: `${ch.path} — Lit ${l.nom}`, libre: !l.patient_id });
      }
    }));
    return out;
  };

  // ---------- ACTIONS ----------
  function openNew() {
    setForm({}); setModal({}); setErr("");
  }
  function openEdit(r) {
    const lit = litDuPatient(r.id);
    setForm({ ...r, lit_id: lit?.id || "" });
    setModal(r); setErr("");
  }
  async function save() {
    setErr("");
    if (!form.nom) { setErr("Le nom est obligatoire."); return; }
    setBusy(true);
    try {
      // 1) on enregistre/met à jour le patient
      const payload = {
        nom: form.nom, prenom: form.prenom || null,
        date_entree: form.date_entree || null,
        // on conserve aussi le champ texte "chambre" pour compat : on y met le nom de la chambre choisie
        chambre: form.lit_id ? (chambres.find((ch) => ch.lits.some((l) => l.id === form.lit_id))?.nom || null) : (form.chambre || null),
        batiment: form.lit_id ? (chambres.find((ch) => ch.lits.some((l) => l.id === form.lit_id))?.path?.split(" / ")[0] || null) : (form.batiment || null),
        // Alpha 0.20.1 : nouveaux champs alignés sur le SQL 0.20.1
        date_naissance: form.date_naissance || null,
        numero_dossier: form.numero_dossier || null,
        medecin_traitant: form.medecin_traitant || null,
        etat: form.etat || "Présent",
        notes: form.notes || null,
        // 0.55.55 : adresse via BAN INSEE (colonnes 0.55.46)
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        ville: form.ville || null,
        code_insee_residence: form.code_insee_residence || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      };
      let patientId = modal.id;
      let isNouveau = false;
      // Alpha 0.25.0 : utilise safeWrite pour supporter le mode hors-ligne
      if (patientId) {
        const { error, queued } = await safeUpdate(supabase, "patients", payload, { id: patientId }, { userId: auth.user?.id });
        if (error) throw error;
        if (queued) { /* mode offline : l'update est en queue */ }
      } else {
        // En offline, on génère un UUID côté client pour pouvoir continuer le flow
        // (rattacher au lit, ouvrir modale RGPD, etc.). À la sync, l'UUID sera persisté.
        const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : null;
        const insertPayload = { ...payload, structure_id: auth.structureId, etablissement_id: auth.etabId };
        if (newId) insertPayload.id = newId;
        const { data, error, queued } = await safeInsert(supabase, "patients", insertPayload, { userId: auth.user?.id, returning: !queued });
        if (error) throw error;
        patientId = queued ? newId : (data?.id || newId);
        isNouveau = true;
      }
      // 2) on met à jour les lits :
      //    a) libérer l'ancien lit du patient s'il y en a un et qu'on a changé
      const ancienLit = litDuPatient(patientId);
      if (ancienLit && ancienLit.id !== form.lit_id) {
        await safeUpdate(supabase, "lits", { patient_id: null }, { id: ancienLit.id }, { userId: auth.user?.id });
      }
      //    b) rattacher le nouveau lit (s'il y en a un de choisi)
      if (form.lit_id && (!ancienLit || ancienLit.id !== form.lit_id)) {
        await safeUpdate(supabase, "lits", { patient_id: patientId }, { id: form.lit_id }, { userId: auth.user?.id });
      }
      setModal(null); 
      await load();
      // Alpha 0.21.0 : si nouveau patient, proposer immédiatement le consentement RGPD
      if (isNouveau) {
        // On récupère les données complètes pour le passer au composant ConsentementRGPD
        const patientComplet = {
          id: patientId,
          nom: payload.nom,
          prenom: payload.prenom,
          date_naissance: payload.date_naissance,
          numero_dossier: payload.numero_dossier,
          etablissement_id: auth.etabId,
        };
        setConsentModal(patientComplet);
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function del(r) {
    if (!await dialogs.confirm({ title: `Supprimer le ${lbl("patient", "patient").toLowerCase()} ${r.nom} ?`, variant: "danger" })) return;
    // on libère son lit avant de supprimer
    const lit = litDuPatient(r.id);
    if (lit) await safeUpdate(supabase, "lits", { patient_id: null }, { id: lit.id }, { userId: auth.user?.id });
    await safeDelete(supabase, "patients", { id: r.id }, { userId: auth.user?.id });
    await load();
  }

  if (!auth.ready) return null;

  // ---------- RENDU ----------
  const kpis = [
    { label: lbl("patients", "Patients"), value: rows.length, icon: "ti-users", color: "#7a6fb0" },
    { label: "Avec chambre", value: rows.filter((r) => !!litDuPatient(r.id)).length, icon: "ti-bed", color: "#5aa05a" },
    { label: "Sans chambre", value: rows.filter((r) => !litDuPatient(r.id)).length, icon: "ti-bed-off", color: "#EF9F27" },
    { label: "Lits libres", value: chambres.reduce((s, c) => s + c.lits.filter((l) => !l.patient_id).length, 0), icon: "ti-bed-flat", color: "#7CC8C8" },
  ];

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <PageHead small title={lbl("patients", "Patients") + " finaux"} sub={auth.etabNom || "—"} />
          <button className="btn-etab" onClick={() => router.push("/etablissement")}><i className="ti ti-building-hospital" /> Mon établissement</button>
        </div>
        <KpiRow tiles={kpis} />
        {/* Alpha 0.27.0 : indicateur "données potentiellement obsolètes" si lecture cache offline */}
        {staleData && <StaleDataBanner />}
        <Panel>
          <div className="di-toolbar">
            {auth.can("ecrire") && (
              /* 0.58.23 : NeonButton variant=teal pour "Nouveau patient" */
              <NeonButton
                variant="teal"
                icon="ti-plus"
                onClick={openNew}
                disabled={!auth.etabId}
              >
                {lbl("patient", "Patient") === "Patient" ? "Nouveau patient" : `Nouveau ${lbl("patient", "Patient").toLowerCase()}`}
              </NeonButton>
            )}
            <button className="btn-ghost" onClick={() => setShowFilters(!showFilters)}>
              <i className={`ti ${showFilters ? "ti-filter-off" : "ti-filter"}`} /> Filtres avancés
              {(filters.q || filters.service || filters.chambre || filters.etat || filters.etiquette) && <span style={{ background: "#7CC8C8", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, marginLeft: 4 }}>●</span>}
            </button>
            {/* 0.55.11 (AI) : Export CSV */}
            <button
              className="btn-ghost"
              onClick={async () => {
                const { exportRows } = await import("../../lib/exportExcel");
                await exportRows(rows || [], {
                  filename: `patients_${new Date().toISOString().slice(0,10)}`,
                  sheetName: "Patients",
                  columns: {
                    "Nom": "nom",
                    "Prénom": "prenom",
                    "Date naissance": (r) => r.date_naissance || "",
                    "Chambre": (r) => r.chambre || "",
                    "Service": (r) => r.services?.nom || "",
                    "Étage": (r) => r.etages?.nom || "",
                    "État": (r) => r.etat || "",
                    "Téléphone": (r) => r.telephone || "",
                    "Email": (r) => r.email || "",
                    "Référent": (r) => r.referent_nom || "",
                  },
                });
              }}
              title="Exporter la liste en CSV (ouvrable dans Excel/Calc)"
            >
              <i className="ti ti-file-spreadsheet" /> Excel
            </button>
            <CompactToggle />
          </div>
          {showFilters && (
            <div className="adv-filters">
              <div className="fld">
                <label>Nom / Prénom</label>
                <input type="text" placeholder="Recherche…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
              </div>
              <div className="fld">
                <label>Service</label>
                <select value={filters.service} onChange={(e) => setFilters({ ...filters, service: e.target.value, chambre: "" })}>
                  <option value="">Tous</option>
                  {Array.from(new Set(chambres.map((c) => c.service_nom).filter(Boolean))).sort().map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Chambre</label>
                <select value={filters.chambre} onChange={(e) => setFilters({ ...filters, chambre: e.target.value })}>
                  <option value="">Toutes</option>
                  {chambres.filter((c) => !filters.service || c.service_nom === filters.service).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>État</label>
                <select value={filters.etat} onChange={(e) => setFilters({ ...filters, etat: e.target.value })}>
                  <option value="">Tous</option>
                  <option value="Présent">Présent</option>
                  <option value="Sorti">Sorti</option>
                </select>
              </div>
              {etiquettes.length > 0 && (
                <div className="fld">
                  <label>Étiquette</label>
                  <select value={filters.etiquette} onChange={(e) => setFilters({ ...filters, etiquette: e.target.value })}>
                    <option value="">Toutes</option>
                    {etiquettes.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
                  </select>
                </div>
              )}
              {(filters.q || filters.service || filters.chambre || filters.etat || filters.etiquette) && (
                <div className="fld" style={{ alignSelf: "end" }}>
                  <button className="btn-ghost" onClick={() => setFilters({ q: "", service: "", chambre: "", etat: "", etiquette: "" })}>
                    <i className="ti ti-x" /> Effacer
                  </button>
                </div>
              )}
            </div>
          )}
          {loading ? (
            /* 0.58.8 : SkeletonRow x 5 au lieu du "Chargement…" */
            <div style={{ background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12, padding: 6 }}>
              {[0,1,2,3,4].map((i) => <SkeletonRow key={i} cols={6} />)}
            </div>
          )
            : (() => {
                // Appliquer les filtres avancés sur la liste rows
                const filtered = rows.filter((r) => {
                  if (filters.q) {
                    const q = filters.q.toLowerCase();
                    if (!(`${r.nom || ""} ${r.prenom || ""}`.toLowerCase().includes(q))) return false;
                  }
                  if (filters.chambre && r.chambre_id !== filters.chambre) return false;
                  if (filters.service) {
                    const ch = chambres.find((c) => c.id === r.chambre_id);
                    if (!ch || ch.service_nom !== filters.service) return false;
                  }
                  if (filters.etat && r.etat !== filters.etat) return false;
                  if (filters.etiquette) {
                    const tagsDuPatient = patEtiquettes[r.id] || [];
                    if (!tagsDuPatient.includes(filters.etiquette)) return false;
                  }
                  return true;
                });
                if (filtered.length === 0) {
                  if (rows.length === 0) return (
                    <EmptyState
                      illustration="users"
                      variant="teal"
                      title="Aucun patient pour le moment"
                      message="Crée ton premier patient pour commencer à suivre ses interventions, son matériel et ses consentements RGPD."
                      actionLabel="Créer le premier patient"
                      onAction={openNew}
                    />
                  );
                  return (
                    <EmptyState
                      illustration="search"
                      variant="gray"
                      title="Aucun résultat"
                      message="Aucun patient ne correspond aux filtres actuels. Essaie de les ajuster ou de les réinitialiser."
                      compact
                    />
                  );
                }
                return (
                  <>
                    {filtered.length !== rows.length && <p style={{ fontSize: 12, color: "#6c7a89", margin: "0 0 10px" }}><i className="ti ti-info-circle" /> {filtered.length} sur {rows.length} {lbl("patients", "patients").toLowerCase()} affichés (filtres actifs).</p>}
                    
                    {/* Alpha 0.46.0 : bandeau actions bulk si sélection */}
                    {selectedIds.size > 0 && (
                      <div style={{
                        position: "sticky", top: 8, zIndex: 5,
                        background: "linear-gradient(135deg, #185FA5, #2a5a5a)",
                        color: "#fff",
                        padding: "10px 14px",
                        borderRadius: 8,
                        marginBottom: 10,
                        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                      }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                          <i className="ti ti-checks" /> {selectedIds.size} {lbl("patients", "patient").toLowerCase()}{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
                        </span>
                        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            onClick={async () => {
                              setBulkBusy(true);
                              try {
                                const ids = Array.from(selectedIds);
                                const csvRows = rows
                                  .filter(r => selectedIds.has(r.id))
                                  .map(r => [r.nom, r.prenom || "", r.chambre || "", r.batiment || "", r.date_entree || ""]
                                    .map(v => `"${String(v).replace(/"/g, '""')}"`)
                                    .join(";")
                                  );
                                const csv = "\uFEFFNom;Prénom;Chambre;Bâtiment;Date d'entrée\r\n" + csvRows.join("\r\n");
                                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `patients-export-${new Date().toISOString().slice(0, 10)}.csv`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              } finally { setBulkBusy(false); }
                            }}
                            disabled={bulkBusy}
                            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: bulkBusy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                            aria-label="Exporter la sélection en CSV"
                          >
                            <i className="ti ti-file-spreadsheet" /> Export CSV
                          </button>
                          <button
                            onClick={async () => {
                              if (!auth.can("supprimer")) { toast.error("Vous n'avez pas le droit de supprimer."); return; }
                              if (!window.confirm(`Supprimer définitivement ${selectedIds.size} ${lbl("patients", "patient").toLowerCase()}${selectedIds.size > 1 ? "s" : ""} ?\n\nCette action est irréversible.`)) return;
                              setBulkBusy(true);
                              try {
                                const { error } = await supabase
                                  .from("patients")
                                  .delete()
                                  .in("id", Array.from(selectedIds));
                                if (error) throw error;
                                setSelectedIds(new Set());
                                await load();
                                toast.success(`${selectedIds.size} patient(s) supprimé(s).`);
                              } catch (e) {
                                toast.error("Erreur suppression : " + e.message);
                              } finally { setBulkBusy(false); }
                            }}
                            disabled={bulkBusy || !auth.can("supprimer")}
                            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,139,128,0.6)", color: "#ffd6d2", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: bulkBusy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                            aria-label="Supprimer la sélection"
                          >
                            <i className="ti ti-trash" /> Supprimer
                          </button>
                          <button
                            onClick={() => setSelectedIds(new Set())}
                            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12.5, cursor: "pointer" }}
                            aria-label="Désélectionner tout"
                          >
                            <i className="ti ti-x" /> Tout désél.
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="panel-table"><table>
                      <thead><tr>
                        <th style={{ width: 32 }}>
                          <input
                            type="checkbox"
                            checked={filtered.length > 0 && filtered.every(r => selectedIds.has(r.id))}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) {
                                filtered.forEach(r => next.add(r.id));
                              } else {
                                filtered.forEach(r => next.delete(r.id));
                              }
                              setSelectedIds(next);
                            }}
                            aria-label="Sélectionner tous les patients affichés"
                          />
                        </th>
                        <th>Patient</th><th>Emplacement</th><th>Entrée</th><th></th>
                      </tr></thead>
                      <tbody>
                        {filtered.map((r) => {
                    const lit = litDuPatient(r.id);
                    return (
                      <tr key={r.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(r.id);
                              else next.delete(r.id);
                              setSelectedIds(next);
                            }}
                            aria-label={`Sélectionner ${r.nom} ${r.prenom || ""}`}
                          />
                        </td>
                        <td>
                          {/* Alpha 0.38.0 : aperçu rapide au hover desktop, navigation directe sur tap mobile */}
                          <PatientPreview
                            patient={r}
                            extras={{
                              lit,
                              consentStatus: consentStatus[r.id],
                              etiquettes: (patEtiquettes[r.id] || []).map((eid) => etiquettes.find((x) => x.id === eid)).filter(Boolean),
                              nbDI: patStats[r.id]?.nbDI || 0,
                              nbAchats: patStats[r.id]?.nbAchats || 0,
                            }}
                          >
                            <span style={{ color: "#142131" }}>
                              <b>{r.nom}</b> {r.prenom || ""}
                            </span>
                          </PatientPreview>
                          {/* Alpha 0.21.0 : badge statut RGPD */}
                          {(() => {
                            const cs = consentStatus[r.id];
                            if (cs?.a_consenti) {
                              return <span title={`Consentement RGPD signé${cs.derniere_signature ? " le " + fmtDate(cs.derniere_signature) : ""}`} style={{ marginLeft: 8, fontSize: 10, color: "#5aa05a", background: "#eef9ef", border: "1px solid #bfe2bf", padding: "1px 7px", borderRadius: 8, fontWeight: 600 }}>
                                <i className="ti ti-shield-check" /> RGPD
                              </span>;
                            }
                            if (cs?.consentements_refuses > 0) {
                              return <span title="Consentement RGPD refusé" style={{ marginLeft: 8, fontSize: 10, color: "#c0392b", background: "#fef0ee", border: "1px solid #f0c4be", padding: "1px 7px", borderRadius: 8, fontWeight: 600 }}>
                                <i className="ti ti-shield-x" /> RGPD refusé
                              </span>;
                            }
                            return <span title="Consentement RGPD à recueillir" style={{ marginLeft: 8, fontSize: 10, color: "#EF9F27", background: "#fff8ec", border: "1px solid #f0d59f", padding: "1px 7px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setConsentModal({ id: r.id, nom: r.nom, prenom: r.prenom, date_naissance: r.date_naissance, numero_dossier: r.numero_dossier, etablissement_id: r.etablissement_id }); }}>
                              <i className="ti ti-shield-off" /> RGPD à recueillir
                            </span>;
                          })()}
                          {/* Alpha 0.9 : affichage des étiquettes du patient */}
                          {(patEtiquettes[r.id] || []).length > 0 && (
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                              {(patEtiquettes[r.id] || []).map((eid) => {
                                const e = etiquettes.find((x) => x.id === eid);
                                if (!e) return null;
                                return (
                                  <span key={eid} className="etq-tag" style={{ background: e.couleur + "22", color: e.couleur, border: `1px solid ${e.couleur}44` }}>
                                    <i className="ti ti-tag" /> {e.libelle}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {lit ? <span><i className="ti ti-bed" style={{ color: "#5aa05a" }} /> {lit.chambrePath} — Lit {lit.nom}</span>
                               : <span style={{ color: "#8a98a8" }}><i className="ti ti-alert-circle" /> Sans chambre</span>}
                        </td>
                        <td>{fmtDate(r.date_entree)}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {/* Alpha 0.21.0 : icône RGPD */}
                          {auth.can("ecrire") && (
                            <i className="ti ti-shield-lock" style={{ color: consentStatus[r.id]?.a_consenti ? "#5aa05a" : "#EF9F27", cursor: "pointer", marginRight: 12 }} onClick={() => setConsentModal({ id: r.id, nom: r.nom, prenom: r.prenom, date_naissance: r.date_naissance, numero_dossier: r.numero_dossier, etablissement_id: r.etablissement_id })} title="Consentement RGPD" />
                          )}
                          {auth.can("ecrire") && etiquettes.length > 0 && (
                            <i className="ti ti-tag" style={{ color: "#7a6fb0", cursor: "pointer", marginRight: 12 }} onClick={() => setEtqModal(r)} title="Étiquettes" />
                          )}
                          {auth.can("ecrire") && <i className="ti ti-edit" style={{ color: "#2a5a5a", cursor: "pointer", marginRight: 12 }} onClick={() => openEdit(r)} />}
                          {auth.can("supprimer") && <IconButton icon="ti-trash" color="#C9867F" ariaLabel={`Supprimer ${r.nom || "patient"}`} onClick={() => del(r)} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
                  </>
                );
              })()}
        </Panel>
      </div>

      {/* ---------- MODALE création / édition ---------- */}
      {modal && (
        <div className="modal-bg" onClick={(e) => e.target.classList.contains("modal-bg") && setModal(null)}>
          <div className="modal">
            <div className="modal-head">{modal.id ? `Modifier le ${lbl("patient", "patient").toLowerCase()}` : `Nouveau ${lbl("patient", "patient").toLowerCase()}`} <i className="ti ti-x" style={{ cursor: "pointer" }} onClick={() => setModal(null)} /></div>
            <div className="modal-body">
              {err && <div className="err">{err}</div>}
              <div className="fld-row">
                <div className="fld"><label>Nom *</label><input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                <div className="fld"><label>Prénom</label><input value={form.prenom || ""} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              </div>
              {/* Alpha 0.20.1 : champs alignés avec le schéma 0.20.1 */}
              <div className="fld-row">
                <div className="fld"><label>Date de naissance</label><input type="date" value={form.date_naissance || ""} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} /></div>
                <div className="fld"><label>Date d'entrée</label><input type="date" value={form.date_entree || ""} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} /></div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>N° de dossier</label><input value={form.numero_dossier || ""} onChange={(e) => setForm({ ...form, numero_dossier: e.target.value })} placeholder="2024-0142" /></div>
                <div className="fld"><label>État</label>
                  <select value={form.etat || "Présent"} onChange={(e) => setForm({ ...form, etat: e.target.value })}>
                    <option value="Présent">Présent</option>
                    <option value="Sorti">Sorti</option>
                    <option value="Hospitalisé">Hospitalisé</option>
                    <option value="Décédé">Décédé</option>
                  </select>
                </div>
              </div>
              <div className="fld"><label>Médecin traitant</label><input value={form.medecin_traitant || ""} onChange={(e) => setForm({ ...form, medecin_traitant: e.target.value })} placeholder="Dr Lambert" /></div>
              {/* 0.55.55 : adresse du patient avec autocomplete BAN INSEE */}
              <div className="fld">
                <label>Adresse (recherche BAN)</label>
                <AdresseAutocomplete
                  value={form.adresse || ""}
                  onChange={(v) => setForm({ ...form, adresse: v })}
                  onSelect={(a) => setForm({
                    ...form,
                    adresse: a.adresse,
                    code_postal: a.code_postal,
                    ville: a.ville,
                    code_insee_residence: a.code_insee,
                    latitude: a.latitude,
                    longitude: a.longitude,
                  })}
                  placeholder="Tape une adresse — auto cp + ville + INSEE"
                />
                <small style={{ color: "#8a98a8", fontSize: 12 }}>
                  <i className="ti ti-info-circle" /> Pour l'adresse complète + adresses de livraison, va dans <b>Édition complète</b> de la fiche.
                </small>
              </div>
              <div className="row-2" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div className="fld"><label>Code postal</label><input value={form.code_postal || ""} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} placeholder="75011" style={{ fontFamily: "Consolas, monospace" }} /></div>
                <div className="fld"><label>Ville</label><input value={form.ville || ""} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Paris" /></div>
              </div>
              <div className="fld">
                <label>Chambre / Lit</label>
                <select value={form.lit_id || ""} onChange={(e) => setForm({ ...form, lit_id: e.target.value })}>
                  <option value="">— Sans chambre —</option>
                  {litsChoisissables(modal.id).map((l) => (
                    <option key={l.id} value={l.id}>{l.label}{!l.libre && " (actuel)"}</option>
                  ))}
                </select>
                <small style={{ color: "#8a98a8", fontSize: 12 }}>
                  <i className="ti ti-info-circle" /> Seuls les lits libres sont proposés (et le lit actuel en édition). Pour gérer les chambres, va dans <b>Mon établissement</b>.
                </small>
              </div>
              <div className="fld"><label>Notes</label>
                <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Informations complémentaires (régime, allergies, contexte familial…)" style={{ width:"100%", padding:9, border:"1px solid #e1e6eb", borderRadius:8, fontFamily:"inherit", fontSize:13, resize:"vertical" }} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setModal(null)}>Annuler</button>
              <NeonButton variant="teal" icon={busy ? "ti-loader-2" : "ti-device-floppy"} onClick={save} disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {/* Alpha 0.9 : modale d'application des étiquettes */}
      <Modal
        open={!!etqModal}
        onClose={() => setEtqModal(null)}
        kind="patient"
        title={etqModal ? `Étiquettes — ${etqModal.nom} ${etqModal.prenom || ""}` : "Étiquettes"}
        footer={<Btn variant="primary" onClick={() => setEtqModal(null)}>Fermer</Btn>}
      >
        {etiquettes.length === 0 ? (
          <p style={{ color: "#6c7a89", fontSize: 13 }}>
            Aucune étiquette définie dans cette collectivité.{" "}
            <a href="/etiquettes" style={{ color: "#2a5a5a", fontWeight: 600 }}>Créer une étiquette →</a>
          </p>
        ) : (
          <>
            <p style={{ color: "#6c7a89", fontSize: 13, marginTop: 0 }}>
              Clique pour basculer une étiquette. Les changements sont enregistrés immédiatement.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {etiquettes.map((e) => {
                const active = etqModal && (patEtiquettes[etqModal.id] || []).includes(e.id);
                return (
                  <button key={e.id} onClick={() => toggleEtiquette(etqModal.id, e.id)} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", border: `2px solid ${active ? e.couleur : "#e3e9ee"}`,
                    background: active ? e.couleur + "1a" : "#fff",
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    transition: "all .15s",
                  }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="etq-tag" style={{ background: e.couleur + "22", color: e.couleur, border: `1px solid ${e.couleur}44` }}>
                        <i className="ti ti-tag" /> {e.libelle}
                      </span>
                      {e.description && <span style={{ color: "#8a98a8", fontSize: 12 }}>{e.description}</span>}
                    </span>
                    {active && <i className="ti ti-check" style={{ color: e.couleur, fontSize: 18, fontWeight: 700 }} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      {/* Alpha 0.21.0 : Modale de consentement RGPD */}
      {consentModal && (
        <ConsentementRGPD
          patient={consentModal}
          auth={auth}
          onClose={() => setConsentModal(null)}
          onSaved={() => { load(); }}
        />
      )}
    </div>
  );
}
