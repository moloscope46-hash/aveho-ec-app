"use client";
// =============================================================
//  /transferts — Page complète refondue (0.58.75)
//
//  Workflow Demandé → Validé → Reçu, avec :
//   - Multi-source / destination : dépôt, service, chambre, magasin, patient
//   - Scan QR matériel pour identification rapide (lien /scan/quick)
//   - Priorité (basse / normale / haute / urgente)
//   - Préset via URL (?depot=X, ?depot_source=X, ?materiel=X)
//   - Filtres par statut, priorité, source, destination
//   - Indicateurs visuels du chemin source → destination
// =============================================================

import { useEffect, useState, useMemo, Suspense } from "react";
// 0.62.55 : filtre contexte bât/svc via depot_id (TODO 6x)
import { useCurrentContext } from "../../lib/useCurrentContext";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { fmtDate } from "../../lib/format";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, IconButton, Modal } from "../ui";
import { EmptyState, SkeletonRow, toast, NeonButton } from "../components/ui-premium";
import EquipeFilter from "../components/EquipeFilter";
import BackButton from "../components/BackButton";
import { safeInsert, safeUpdate } from "../../lib/safeWrite";

const STATUTS = [
  { value: "Demandé", lbl: "Demandé", icon: "ti-clock", color: "#EF9F27" },
  { value: "Validé", lbl: "Validé", icon: "ti-check", color: "#185FA5" },
  { value: "Reçu", lbl: "Reçu", icon: "ti-check-double", color: "#5aa05a" },
  { value: "Annulé", lbl: "Annulé", icon: "ti-x", color: "#e35d5b" },
];

const PRIORITES = [
  { value: "basse", lbl: "Basse", color: "#8a98a8" },
  { value: "normale", lbl: "Normale", color: "#185FA5" },
  { value: "haute", lbl: "Haute", color: "#EF9F27" },
  { value: "urgente", lbl: "Urgente", color: "#e35d5b" },
];

const MOTIFS = [
  "Réapprovisionnement",
  "Retour location",
  "Prêt inter-service",
  "Échange matériel défectueux",
  "Régularisation inventaire",
  "Mise en quarantaine",
  "Envoi SAV",
  "Retour SAV",
];

function statutMeta(s) { return STATUTS.find(x => x.value === s) || STATUTS[0]; }
function prioriteMeta(p) { return PRIORITES.find(x => x.value === p) || PRIORITES[1]; }

export default function TransfertsPage() {
  return (
    <Suspense fallback={null}>
      <TransfertsInner />
    </Suspense>
  );
}

function TransfertsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetDepot = searchParams?.get("depot");
  const presetDepotSource = searchParams?.get("depot_source");
  const presetMateriel = searchParams?.get("materiel");

  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [transferts, setTransferts] = useState([]);
  const [depots, setDepots] = useState([]);
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [articles, setArticles] = useState([]);

  // 0.62.55 : filtre par contexte bât/svc → on récupère les dépôts du contexte
  const ctx = useCurrentContext();
  const ctxDepotIds = useMemo(() => {
    if (!ctx.active || !depots.length) return null;
    return new Set(depots.filter(d => {
      if (ctx.batimentId && d.batiment_id !== ctx.batimentId) return false;
      if (ctx.serviceId && d.service_id !== ctx.serviceId) return false;
      return true;
    }).map(d => d.id));
  }, [ctx.active, ctx.batimentId, ctx.serviceId, depots]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterPriorite, setFilterPriorite] = useState("");
  const [filterEquipe, setFilterEquipe] = useState(null);  // 0.62.30

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  async function loadRefs() {
    if (!auth.ready || !auth.structureId) return;
    try {
      const tryFetch = async (q) => {
        try { const r = await q; return r.data || []; }
        catch (e) { if (e.code === "42P01") return []; throw e; }
      };
      const [d, s, c, m, a] = await Promise.all([
        tryFetch(supabase.from("depots").select("id, nom, niveau_hierarchique, couleur, icone, type").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("services").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("chambres").select("id, nom").eq("structure_id", auth.structureId).limit(500)),
        tryFetch(supabase.from("magasins").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("articles").select("id, libelle, reference").eq("structure_id", auth.structureId).limit(500)),
      ]);
      setDepots(d); setServices(s); setChambres(c); setMagasins(m); setArticles(a);
    } catch (e) {
      console.error("[transferts] refs:", e);
    }
  }

  async function loadTransferts() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transferts")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setTransferts(data || []);
    } catch (e) {
      console.error("[transferts] load:", e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadRefs(); loadTransferts(); }, [auth.ready, auth.structureId]);

  // Pré-rempli depuis URL
  useEffect(() => {
    if ((presetDepot || presetDepotSource || presetMateriel) && auth.ready && depots.length > 0) {
      const initial = { statut: "Demandé", priorite: "normale", motif: "Réapprovisionnement", scan_source: "manuel" };
      if (presetDepotSource) initial.depot_source_id = presetDepotSource;
      if (presetDepot && !presetDepotSource) initial.depot_destination_id = presetDepot;
      if (presetMateriel) initial.materiel_id = presetMateriel;
      setForm(initial);
      setModal({ mode: "new" });
    }
  }, [presetDepot, presetDepotSource, presetMateriel, auth.ready, depots.length]);

  const filtered = useMemo(() => {
    return transferts.filter(t => {
      if (filterStatut && t.statut !== filterStatut) return false;
      if (filterPriorite && t.priorite !== filterPriorite) return false;
      if (filterEquipe && t.equipe_id !== filterEquipe) return false;
      // 0.62.55 : filtre contexte bât/svc via depot_id source/destination
      if (ctx.active && ctxDepotIds && ctxDepotIds.size > 0) {
        const sourceMatch = t.depot_source_id && ctxDepotIds.has(t.depot_source_id);
        const destMatch = t.depot_destination_id && ctxDepotIds.has(t.depot_destination_id);
        if (!sourceMatch && !destMatch) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${t.motif || ""} ${t.notes || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transferts, search, filterStatut, filterPriorite, filterEquipe, ctx.active, ctxDepotIds]);

  // Stats par statut
  const statsByStatut = useMemo(() => {
    const m = {};
    transferts.forEach(t => { m[t.statut] = (m[t.statut] || 0) + 1; });
    return m;
  }, [transferts]);

  function openNew() {
    setForm({ statut: "Demandé", priorite: "normale", motif: "Réapprovisionnement", scan_source: "manuel", quantite: 1, contenu: "materiel" });
    setModal({ mode: "new" });
  }

  function openEdit(t) {
    setForm({ ...t });
    setModal({ mode: "edit", id: t.id });
  }

  async function save() {
    if (!form.depot_source_id && !form.service_source_id && !form.chambre_source_id) {
      toast.error("Source obligatoire (dépôt, service ou chambre)");
      return;
    }
    if (!form.depot_destination_id && !form.service_destination_id && !form.chambre_destination_id) {
      toast.error("Destination obligatoire");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        statut: form.statut || "Demandé",
        priorite: form.priorite || "normale",
        motif: form.motif || null,
        notes: form.notes || null,
        // Source
        depot_source_id: form.depot_source_id || null,
        service_source_id: form.service_source_id || null,
        chambre_source_id: form.chambre_source_id || null,
        // Destination
        depot_destination_id: form.depot_destination_id || null,
        service_destination_id: form.service_destination_id || null,
        chambre_destination_id: form.chambre_destination_id || null,
        // Contenu
        materiel_id: form.materiel_id || null,
        article_id: form.article_id || null,
        quantite: form.quantite ? parseInt(form.quantite, 10) : 1,
        contenu: form.contenu || "materiel",
        scan_source: form.scan_source || "manuel",
      };
      const userId = auth.user?.id;
      if (modal?.id) {
        const { error } = await safeUpdate(supabase, "transferts", payload, { id: modal.id }, { userId });
        if (error) throw error;
        toast.success("Transfert mis à jour");
      } else {
        const { error } = await safeInsert(supabase, "transferts", payload, { userId });
        if (error) throw error;
        toast.success("Transfert créé");
      }
      setModal(null);
      await loadTransferts();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatut(t, newStatut) {
    setBusy(true);
    try {
      const payload = { statut: newStatut };
      if (newStatut === "Validé") {
        payload.date_validation = new Date().toISOString();
        payload.valide_par = auth.user?.id;
      }
      if (newStatut === "Reçu") {
        payload.date_reception = new Date().toISOString();
        payload.recu_par = auth.user?.id;
      }
      const { error } = await safeUpdate(supabase, "transferts", payload, { id: t.id }, { userId: auth.user?.id });
      if (error) throw error;
      toast.success(`Transfert ${newStatut.toLowerCase()}`);
      await loadTransferts();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function getLocationLabel(depotId, serviceId, chambreId) {
    const parts = [];
    if (depotId) {
      const d = depots.find(x => x.id === depotId);
      if (d) parts.push({ label: d.nom, icon: d.icone || "ti-building-warehouse", color: d.couleur || "#185FA5" });
    }
    if (serviceId) {
      const s = services.find(x => x.id === serviceId);
      if (s) parts.push({ label: s.nom, icon: "ti-stethoscope", color: "#5aa05a" });
    }
    if (chambreId) {
      const c = chambres.find(x => x.id === chambreId);
      if (c) parts.push({ label: `Ch. ${c.nom || ""}`, icon: "ti-bed", color: "#EF9F27" });
    }
    return parts;
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <PageHead
          eyebrow="LOGISTIQUE"
          icon="ti-arrows-exchange"
          title="Transferts"
          accent={`${transferts.length}`}
          sub="Multi-source / destination · Scan QR · Workflow Demandé → Validé → Reçu · Priorités"
        />

        {/* Stats par statut */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 180px))", justifyContent: "start", gap: 10, marginBottom: 14 }}>
          {STATUTS.map(s => {
            const count = statsByStatut[s.value] || 0;
            return (
              <div key={s.value} style={{
                padding: "12px 14px", background: `${s.color}10`, border: `1px solid ${s.color}30`,
                borderRadius: 10, borderLeft: `3px solid ${s.color}`, cursor: "pointer",
                opacity: filterStatut === s.value ? 1 : 0.85, transform: filterStatut === s.value ? "scale(1.02)" : "none",
                transition: "all .15s",
              }} onClick={() => setFilterStatut(filterStatut === s.value ? "" : s.value)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 22 }} />
                  <div>
                    <div style={{ fontSize: 11, color: s.color, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 700 }}>{s.lbl}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#142131" }}>{count}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <Panel style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="🔍 Rechercher (motif, notes...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
            />
            <select value={filterPriorite} onChange={(e) => setFilterPriorite(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
              <option value="">Toutes priorités</option>
              {PRIORITES.map(p => <option key={p.value} value={p.value}>{p.lbl}</option>)}
            </select>
            <EquipeFilter value={filterEquipe} onChange={setFilterEquipe} compact />
            <Btn variant="ghost" icon="ti-scan" onClick={() => router.push("/scan/quick")}>Scanner</Btn>
            <NeonButton variant="teal" icon="ti-plus" onClick={openNew}>Nouveau transfert</NeonButton>
          </div>
        </Panel>

        {/* Liste */}
        {loading ? (
          <Panel><SkeletonRow count={6} /></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration="package"
            title={transferts.length === 0 ? "Aucun transfert" : "Aucun résultat"}
            message={transferts.length === 0 ? "Crée ton premier transfert pour démarrer la traçabilité." : "Essaie d'élargir tes filtres."}
            actionLabel={transferts.length === 0 ? "Créer un transfert" : null}
            onAction={transferts.length === 0 ? openNew : null}
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map(t => {
              const sm = statutMeta(t.statut);
              const pm = prioriteMeta(t.priorite);
              const source = getLocationLabel(t.depot_source_id, t.service_source_id, t.chambre_source_id);
              const dest = getLocationLabel(t.depot_destination_id, t.service_destination_id, t.chambre_destination_id);
              return (
                <div key={t.id} style={{
                  background: "#fff", border: "1px solid #e3e9ee", borderRadius: 10,
                  borderLeft: `4px solid ${sm.color}`,
                  padding: "12px 14px",
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                }}>
                  {/* Icône statut */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: `${sm.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <i className={`ti ${sm.icon}`} style={{ color: sm.color, fontSize: 20 }} />
                  </div>

                  {/* Détails */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ background: sm.color, color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
                        {t.statut}
                      </span>
                      <span style={{ background: pm.color + "22", color: pm.color, padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
                        {pm.lbl.toUpperCase()}
                      </span>
                      {t.scan_source && t.scan_source !== "manuel" && (
                        <span style={{ background: "rgba(122,111,176,.18)", color: "#5a4a90", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                          📱 SCAN
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#5a6878" }}>{t.motif || "—"}</span>
                    </div>
                    {/* Source → Destination */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#142131" }}>
                      {source.length > 0 ? source.map((p, i) => (
                        <span key={`s${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: p.color, fontWeight: 600 }}>
                          {i > 0 && <i className="ti ti-chevron-right" style={{ color: "#cfd8e0", fontSize: 9 }} />}
                          <i className={`ti ${p.icon}`} style={{ fontSize: 11 }} />
                          {p.label}
                        </span>
                      )) : <span style={{ color: "#cfd8e0", fontStyle: "italic" }}>Source ?</span>}

                      <i className="ti ti-arrow-right" style={{ color: "#7CC8C8", fontSize: 14, margin: "0 6px" }} />

                      {dest.length > 0 ? dest.map((p, i) => (
                        <span key={`d${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: p.color, fontWeight: 600 }}>
                          {i > 0 && <i className="ti ti-chevron-right" style={{ color: "#cfd8e0", fontSize: 9 }} />}
                          <i className={`ti ${p.icon}`} style={{ fontSize: 11 }} />
                          {p.label}
                        </span>
                      )) : <span style={{ color: "#cfd8e0", fontStyle: "italic" }}>Destination ?</span>}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#5a6878", marginTop: 3 }}>
                      Qté <b>{t.quantite || 1}</b> · Créé {fmtDate(t.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {t.statut === "Demandé" && (
                      <Btn variant="primary" icon="ti-check" onClick={() => changeStatut(t, "Validé")} disabled={busy} style={{ fontSize: 11 }}>Valider</Btn>
                    )}
                    {t.statut === "Validé" && (
                      <Btn variant="primary" icon="ti-check-double" onClick={() => changeStatut(t, "Reçu")} disabled={busy} style={{ fontSize: 11 }}>Réceptionner</Btn>
                    )}
                    {(t.statut === "Demandé" || t.statut === "Validé") && (
                      <IconButton icon="ti-x" color="#e35d5b" ariaLabel="Annuler" onClick={() => changeStatut(t, "Annulé")} />
                    )}
                    <IconButton icon="ti-edit" color="#185FA5" ariaLabel="Éditer" onClick={() => openEdit(t)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={modal.mode === "new" ? "Nouveau transfert" : "Édition transfert"}
            footer={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
              </>
            }>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Motif *</label>
                <select value={form.motif || ""} onChange={(e) => setForm({ ...form, motif: e.target.value })}>
                  <option value="">— Choisir —</option>
                  {MOTIFS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Priorité</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {PRIORITES.map(p => (
                    <button key={p.value} type="button" onClick={() => setForm({ ...form, priorite: p.value })}
                      style={{
                        flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        background: form.priorite === p.value ? p.color : "#fff",
                        color: form.priorite === p.value ? "#fff" : p.color,
                        border: `1px solid ${p.color}`,
                      }}>{p.lbl}</button>
                  ))}
                </div>
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#7a6fb0", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e3d8f5", paddingBottom: 4 }}>
              <i className="ti ti-arrow-down" /> Source
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Dépôt source</label>
                <select value={form.depot_source_id || ""} onChange={(e) => setForm({ ...form, depot_source_id: e.target.value || null })}>
                  <option value="">—</option>
                  {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Service source</label>
                <select value={form.service_source_id || ""} onChange={(e) => setForm({ ...form, service_source_id: e.target.value || null })}>
                  <option value="">—</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Chambre source</label>
                <select value={form.chambre_source_id || ""} onChange={(e) => setForm({ ...form, chambre_source_id: e.target.value || null })}>
                  <option value="">—</option>
                  {chambres.map(c => <option key={c.id} value={c.id}>Ch. {c.nom || ""}</option>)}
                </select>
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#5aa05a", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #cfeacb", paddingBottom: 4 }}>
              <i className="ti ti-arrow-up" /> Destination
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Dépôt destination</label>
                <select value={form.depot_destination_id || ""} onChange={(e) => setForm({ ...form, depot_destination_id: e.target.value || null })}>
                  <option value="">—</option>
                  {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Service destination</label>
                <select value={form.service_destination_id || ""} onChange={(e) => setForm({ ...form, service_destination_id: e.target.value || null })}>
                  <option value="">—</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Chambre destination</label>
                <select value={form.chambre_destination_id || ""} onChange={(e) => setForm({ ...form, chambre_destination_id: e.target.value || null })}>
                  <option value="">—</option>
                  {chambres.map(c => <option key={c.id} value={c.id}>Ch. {c.nom || ""}</option>)}
                </select>
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #cfeaea", paddingBottom: 4 }}>
              <i className="ti ti-package" /> Contenu
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Type contenu</label>
                <select value={form.contenu || "materiel"} onChange={(e) => setForm({ ...form, contenu: e.target.value })}>
                  <option value="materiel">Matériel précis</option>
                  <option value="article">Article (qté générique)</option>
                </select>
              </div>
              {form.contenu === "article" ? (
                <div className="fld" style={{ gridColumn: "span 2" }}>
                  <label>Article</label>
                  <select value={form.article_id || ""} onChange={(e) => setForm({ ...form, article_id: e.target.value || null })}>
                    <option value="">—</option>
                    {articles.map(a => <option key={a.id} value={a.id}>{a.libelle}{a.reference ? ` (${a.reference})` : ""}</option>)}
                  </select>
                </div>
              ) : (
                <div className="fld" style={{ gridColumn: "span 2" }}>
                  <label>ID Matériel</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={form.materiel_id || ""} onChange={(e) => setForm({ ...form, materiel_id: e.target.value })} placeholder="Scanner ou coller UUID..." style={{ flex: 1, fontFamily: "Consolas, monospace", fontSize: 11 }} />
                    <Btn variant="ghost" icon="ti-scan" onClick={() => router.push("/scan/quick")}>Scan</Btn>
                  </div>
                </div>
              )}
              <div className="fld">
                <label>Quantité</label>
                <input type="number" min="1" value={form.quantite || 1} onChange={(e) => setForm({ ...form, quantite: e.target.value })} style={{ fontFamily: "Consolas, monospace", fontSize: 16, fontWeight: 700 }} />
              </div>
            </div>

            <div className="fld" style={{ marginTop: 12 }}>
              <label>Notes</label>
              <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Commentaire libre..." />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
