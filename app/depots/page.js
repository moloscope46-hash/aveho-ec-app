"use client";
// =============================================================
//  /depots — Page complète (0.58.79)
//  Hiérarchie : Bâtiment → Service → Chambre / Magasin
//  Workflow scan : QR dépôt + inventaire + transfert auto
//  Sub-emplacements via parent_depot_id
// =============================================================

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, Btn, IconButton, Modal } from "../ui";
import { EmptyState, SkeletonRow, toast } from "../components/ui-premium";
import BackButton from "../components/BackButton";
import { safeInsert, safeUpdate } from "../../lib/safeWrite";

const NIVEAUX_HIERARCHIQUES = [
  { value: "batiment", lbl: "Bâtiment", icon: "ti-building", color: "#185FA5" },
  { value: "service", lbl: "Service", icon: "ti-stethoscope", color: "#5aa05a" },
  { value: "chambre", lbl: "Chambre", icon: "ti-bed", color: "#EF9F27" },
  { value: "magasin", lbl: "Magasin", icon: "ti-truck", color: "#C9867F" },
  { value: "mobile", lbl: "Mobile", icon: "ti-package", color: "#7a6fb0" },
  { value: "emplacement", lbl: "Emplacement", icon: "ti-map-pin", color: "#5e4a8c" },
];

const TYPES_DEPOT = [
  { value: "general", lbl: "Général EHPAD", icon: "ti-building-warehouse" },
  { value: "deporte", lbl: "Déporté (magasin)", icon: "ti-truck" },
  { value: "pharmacie", lbl: "Pharmacie / PUI", icon: "ti-pill" },
  { value: "infirmerie", lbl: "Infirmerie", icon: "ti-medical-cross" },
  { value: "froid", lbl: "Stock réfrigéré", icon: "ti-snowflake" },
  { value: "stupefiant", lbl: "Stupéfiants", icon: "ti-lock" },
  { value: "emplacement", lbl: "Emplacement précis (étagère, casier)", icon: "ti-map-pin" },
];

function niveauMeta(n) { return NIVEAUX_HIERARCHIQUES.find(x => x.value === n) || NIVEAUX_HIERARCHIQUES[0]; }
function typeMeta(t) { return TYPES_DEPOT.find(x => x.value === t) || TYPES_DEPOT[0]; }

export default function DepotsPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();

  const [batiments, setBatiments] = useState([]);
  const [services, setServices] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [magasins, setMagasins] = useState([]);
  const [depots, setDepots] = useState([]);
  const [stats, setStats] = useState({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");
  const [filterBatiment, setFilterBatiment] = useState("");

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const [inventaire, setInventaire] = useState(null);

  async function loadRefs() {
    if (!auth.ready || !auth.structureId) return;
    const tryFetch = async (q) => {
      try { const r = await q; return r.data || []; }
      catch (e) { if (e.code === "42P01" || e.code === "42703") return []; throw e; }
    };
    try {
      const [b, s, c, m] = await Promise.all([
        tryFetch(supabase.from("batiments").select("id, nom").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("services").select("id, nom, batiment_id").eq("structure_id", auth.structureId)),
        tryFetch(supabase.from("chambres").select("id, nom, service_id").eq("structure_id", auth.structureId).limit(500)),
        tryFetch(supabase.from("magasins").select("id, nom").eq("structure_id", auth.structureId)),
      ]);
      setBatiments(b); setServices(s); setChambres(c); setMagasins(m);
    } catch (err) {
      console.error("[depots] refs:", err);
    }
  }

  async function loadDepots() {
    if (!auth.ready || !auth.structureId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("depots")
        .select("*")
        .eq("structure_id", auth.structureId)
        .order("nom");
      if (error) throw error;
      setDepots(data || []);
      try {
        const { data: mats } = await supabase
          .from("materiels")
          .select("depot_id")
          .eq("structure_id", auth.structureId)
          .not("depot_id", "is", null);
        const counts = {};
        (mats || []).forEach(m => { if (m.depot_id) counts[m.depot_id] = (counts[m.depot_id] || 0) + 1; });
        setStats(counts);
      } catch { /* silent */ }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadRefs(); loadDepots(); }, [auth.ready, auth.structureId]);

  const filtered = useMemo(() => {
    return depots.filter(d => {
      // Par défaut on cache les sous-emplacements (parent_depot_id non null)
      // sauf si on filtre explicitement par niveau=emplacement
      if (filterNiveau !== "emplacement" && d.parent_depot_id) return false;
      if (filterType && d.type !== filterType) return false;
      if (filterNiveau && d.niveau_hierarchique !== filterNiveau) return false;
      if (filterBatiment && d.batiment_id !== filterBatiment) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${d.nom || ""} ${d.code || ""} ${d.ville || ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [depots, search, filterType, filterNiveau, filterBatiment]);

  // Sub-emplacements groupés par depot parent
  const subEmpByParent = useMemo(() => {
    const map = {};
    depots.forEach(d => {
      if (d.parent_depot_id) {
        if (!map[d.parent_depot_id]) map[d.parent_depot_id] = [];
        map[d.parent_depot_id].push(d);
      }
    });
    return map;
  }, [depots]);

  function getHierarchy(d) {
    const path = [];
    if (d.batiment_id) {
      const b = batiments.find(x => x.id === d.batiment_id);
      if (b) path.push({ label: b.nom, icon: "ti-building", color: "#185FA5" });
    }
    if (d.service_id) {
      const s = services.find(x => x.id === d.service_id);
      if (s) path.push({ label: s.nom, icon: "ti-stethoscope", color: "#5aa05a" });
    }
    if (d.chambre_id) {
      const c = chambres.find(x => x.id === d.chambre_id);
      if (c) path.push({ label: `Ch. ${c.nom || ""}`, icon: "ti-bed", color: "#EF9F27" });
    }
    if (d.magasin_id) {
      const m = magasins.find(x => x.id === d.magasin_id);
      if (m) path.push({ label: m.nom, icon: "ti-truck", color: "#C9867F" });
    }
    return path;
  }

  const servicesForBatiment = useMemo(() =>
    !form.batiment_id ? services : services.filter(s => s.batiment_id === form.batiment_id)
  , [services, form.batiment_id]);
  const chambresForService = useMemo(() =>
    !form.service_id ? chambres : chambres.filter(c => c.service_id === form.service_id)
  , [chambres, form.service_id]);

  function openNew(parentId = null) {
    const parent = parentId ? depots.find(d => d.id === parentId) : null;
    setForm({
      type: parent ? "emplacement" : "general",
      niveau_hierarchique: parent ? "emplacement" : "batiment",
      parent_depot_id: parentId,
      couleur: parent ? "#5e4a8c" : "#7CC8C8",
      icone: parent ? "ti-map-pin" : "ti-building-warehouse",
      actif: true,
      securise: false,
      // Pré-remplit le rattachement du parent
      ...(parent && {
        batiment_id: parent.batiment_id,
        service_id: parent.service_id,
        chambre_id: parent.chambre_id,
      }),
    });
    setModal({ mode: "new", parentId });
  }

  function openEdit(d) {
    setForm({ ...d });
    setModal({ mode: "edit", id: d.id });
  }

  async function save() {
    if (!form.nom?.trim()) { toast.error("Nom obligatoire"); return; }
    setBusy(true);
    try {
      const payload = {
        structure_id: auth.structureId,
        etablissement_id: auth.etabId || null,
        nom: form.nom.trim(),
        code: form.code || null,
        type: form.type || "general",
        niveau_hierarchique: form.niveau_hierarchique || null,
        parent_depot_id: form.parent_depot_id || null,
        batiment_id: form.batiment_id || null,
        service_id: form.service_id || null,
        chambre_id: form.chambre_id || null,
        magasin_id: form.magasin_id || null,
        capacite_max: form.capacite_max ? parseInt(form.capacite_max, 10) : null,
        temperature_min: form.temperature_min !== "" && form.temperature_min != null ? parseFloat(form.temperature_min) : null,
        temperature_max: form.temperature_max !== "" && form.temperature_max != null ? parseFloat(form.temperature_max) : null,
        humidite_max: form.humidite_max !== "" && form.humidite_max != null ? parseFloat(form.humidite_max) : null,
        securise: !!form.securise,
        couleur: form.couleur || "#7CC8C8",
        icone: form.icone || "ti-building-warehouse",
        notes: form.notes || null,
        actif: form.actif !== false,
      };
      const userId = auth.user?.id;
      if (modal?.id) {
        const { error } = await safeUpdate(supabase, "depots", payload, { id: modal.id }, { userId });
        if (error) throw error;
        toast.success(`Dépôt "${form.nom}" mis à jour`);
      } else {
        const { error } = await safeInsert(supabase, "depots", payload, { userId });
        if (error) throw error;
        toast.success(`Dépôt "${form.nom}" créé`);
      }
      setModal(null);
      await loadDepots();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startTransfertFrom(d) {
    try {
      localStorage.setItem("av-transfert-source-depot", JSON.stringify({ depot_id: d.id, depot_nom: d.nom }));
      toast.success(`Source "${d.nom}" enregistrée. Scanne le QR du dépôt destination.`);
    } catch {}
    router.push("/scan/quick?mode=transfert-from");
  }

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ marginBottom: 8 }}><BackButton /></div>
        <PageHead
          eyebrow="LOGISTIQUE · DÉPÔTS"
          icon="ti-building-warehouse"
          title="Dépôts"
          accent={`${filtered.length} dépôt${filtered.length > 1 ? "s" : ""}`}
          sub="Hiérarchie Bâtiment → Service → Chambre · Sub-emplacements · QR imprimables · Inventaire scan"
        />

        <Panel style={{ marginBottom: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              placeholder="🔍 Rechercher (nom, code, ville…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, padding: "8px 14px", border: "1px solid #e3e9ee", borderRadius: 18, fontSize: 13, fontFamily: "inherit" }}
            />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
              <option value="">Tous types</option>
              {TYPES_DEPOT.map(t => <option key={t.value} value={t.value}>{t.lbl}</option>)}
            </select>
            <select value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
              <option value="">Tous niveaux</option>
              {NIVEAUX_HIERARCHIQUES.map(n => <option key={n.value} value={n.value}>{n.lbl}</option>)}
            </select>
            {batiments.length > 0 && (
              <select value={filterBatiment} onChange={(e) => setFilterBatiment(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e3e9ee", fontSize: 12.5 }}>
                <option value="">Tous bâtiments</option>
                {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
            )}
            <Btn variant="ghost" icon="ti-scan" onClick={() => router.push("/scan/quick")}>Scan rapide</Btn>
            <Btn variant="primary" icon="ti-plus" onClick={() => openNew(null)}>Nouveau dépôt</Btn>
          </div>
        </Panel>

        {loading ? (
          <Panel><SkeletonRow count={6} /></Panel>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration="package"
            title={depots.length === 0 ? "Aucun dépôt" : "Aucun résultat"}
            message={depots.length === 0 ? "Crée ton premier dépôt." : "Essaie d'élargir tes filtres."}
            actionLabel={depots.length === 0 ? "Créer un dépôt" : null}
            onAction={depots.length === 0 ? () => openNew(null) : null}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
            {filtered.map(d => {
              const niveau = niveauMeta(d.niveau_hierarchique);
              const type = typeMeta(d.type);
              const hierarchy = getHierarchy(d);
              const matCount = stats[d.id] || 0;
              const subEmps = subEmpByParent[d.id] || [];
              return (
                <div key={d.id} style={{
                  background: "#fff", border: "1px solid #e3e9ee", borderRadius: 12,
                  borderLeft: `4px solid ${d.couleur || niveau.color}`,
                  padding: "14px 16px", transition: "all .15s",
                  opacity: d.actif === false ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${d.couleur || niveau.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className={`ti ${d.icone || type.icon}`} style={{ color: d.couleur || niveau.color, fontSize: 22 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#142131", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nom}</h3>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: niveau.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{niveau.lbl}</span>
                        <span style={{ fontSize: 10, color: "#cfd8e0" }}>·</span>
                        <span style={{ fontSize: 10, color: "#5a6878", fontWeight: 600 }}>{type.lbl}</span>
                      </div>
                      {d.code && <div style={{ fontSize: 10.5, color: "#5a6878", fontFamily: "Consolas, monospace", marginTop: 2 }}>{d.code}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      {d.securise && <span title="Accès restreint" style={{ background: "#fde4e1", color: "#c0392b", padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>🔒</span>}
                      {(d.temperature_min != null) && <span style={{ background: "rgba(124,200,200,.18)", color: "#1c5454", padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>❄ {d.temperature_min}/{d.temperature_max}°</span>}
                      {d.inventaire_dernier && <span title={`Dernier inventaire ${new Date(d.inventaire_dernier).toLocaleDateString()}`} style={{ background: "rgba(90,160,90,.15)", color: "#5aa05a", padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>✓ inv.</span>}
                    </div>
                  </div>

                  {hierarchy.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8, padding: "6px 8px", background: "#fafbfc", borderRadius: 6, fontSize: 11 }}>
                      {hierarchy.map((h, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, color: h.color, fontWeight: 600 }}>
                          {i > 0 && <i className="ti ti-chevron-right" style={{ color: "#cfd8e0", fontSize: 10 }} />}
                          <i className={`ti ${h.icon}`} style={{ fontSize: 11 }} />
                          {h.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, padding: "6px 10px", background: matCount > 0 ? "rgba(24,95,165,.08)" : "#fafbfc", borderRadius: 6, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: matCount > 0 ? "#185FA5" : "#cfd8e0", fontFamily: "Consolas, monospace" }}>{matCount}</div>
                      <div style={{ fontSize: 9, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>Matériels</div>
                    </div>
                    {subEmps.length > 0 && (
                      <div style={{ flex: 1, padding: "6px 10px", background: "rgba(94,74,140,.08)", borderRadius: 6, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#5e4a8c", fontFamily: "Consolas, monospace" }}>{subEmps.length}</div>
                        <div style={{ fontSize: 9, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>Emplac.</div>
                      </div>
                    )}
                    {d.capacite_max && (
                      <div style={{ flex: 1, padding: "6px 10px", background: "#fafbfc", borderRadius: 6, textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#142131", fontFamily: "Consolas, monospace" }}>{Math.round((matCount / d.capacite_max) * 100)}%</div>
                        <div style={{ fontSize: 9, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5 }}>Rempl.</div>
                      </div>
                    )}
                  </div>

                  {/* Sub-emplacements visibles */}
                  {subEmps.length > 0 && (
                    <div style={{ marginBottom: 8, padding: "6px 8px", background: "rgba(94,74,140,.06)", borderRadius: 6, fontSize: 11 }}>
                      <div style={{ fontSize: 9.5, color: "#5e4a8c", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                        <i className="ti ti-map-pin" /> Emplacements ({subEmps.length})
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {subEmps.map(sub => (
                          <button key={sub.id} onClick={() => openEdit(sub)} style={{
                            background: "#fff", border: `1px solid ${sub.couleur || "#5e4a8c"}44`,
                            color: sub.couleur || "#5e4a8c", padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                            cursor: "pointer", fontFamily: "inherit"
                          }}>
                            <i className={`ti ${sub.icone || "ti-map-pin"}`} style={{ marginRight: 3 }} />
                            {sub.nom}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions row 1 */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn variant="ghost" icon="ti-clipboard-check" onClick={() => router.push(`/inventaire/${d.id}`)} style={{ flex: 1, fontSize: 11, minWidth: 0 }}>Inventaire</Btn>
                    <Btn variant="ghost" icon="ti-edit" onClick={() => openEdit(d)} style={{ flex: 1, fontSize: 11, minWidth: 0 }}>Éditer</Btn>
                  </div>
                  {/* Actions row 2 */}
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Btn variant="ghost" icon="ti-printer" onClick={() => router.push(`/depots/${d.id}/qr`)} style={{ flex: 1, fontSize: 11, minWidth: 0 }}>Imprimer QR</Btn>
                    <Btn variant="ghost" icon="ti-arrows-right-left" onClick={() => startTransfertFrom(d)} style={{ flex: 1, fontSize: 11, minWidth: 0 }}>Transfert</Btn>
                    {!d.parent_depot_id && (
                      <IconButton icon="ti-plus" color="#5e4a8c" ariaLabel="Créer un emplacement" onClick={() => openNew(d.id)} title="Ajouter un sous-emplacement" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal édition / création */}
        {modal && (
          <Modal open={!!modal} onClose={() => setModal(null)} kind="patient"
            title={
              modal.mode === "new"
                ? (modal.parentId ? "Nouveau sous-emplacement" : "Nouveau dépôt")
                : `Édition · ${form.nom || ""}`
            }
            footer={
              <>
                <Btn variant="ghost" onClick={() => setModal(null)}>Annuler</Btn>
                <Btn variant="primary" icon="ti-check" onClick={save} disabled={busy}>{busy ? "..." : "Enregistrer"}</Btn>
              </>
            }>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld" style={{ gridColumn: "span 2" }}>
                <label>Nom *</label>
                <input value={form.nom || ""} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder={modal.parentId ? "Ex: Étagère A, casier 3..." : "Ex: Dépôt principal Bât. A"} />
              </div>
              <div className="fld">
                <label>Code interne</label>
                <input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DEP-A-001" style={{ fontFamily: "Consolas, monospace" }} />
              </div>
              <div className="fld">
                <label>Type</label>
                <select value={form.type || "general"} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES_DEPOT.map(t => <option key={t.value} value={t.value}>{t.lbl}</option>)}
                </select>
              </div>
              <div className="fld" style={{ gridColumn: "span 2" }}>
                <label>Niveau hiérarchique</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {NIVEAUX_HIERARCHIQUES.map(n => (
                    <button key={n.value} type="button" onClick={() => setForm({ ...form, niveau_hierarchique: n.value })}
                      style={{
                        background: form.niveau_hierarchique === n.value ? n.color : "#fff",
                        color: form.niveau_hierarchique === n.value ? "#fff" : n.color,
                        border: `1px solid ${n.color}`,
                        padding: "5px 10px", borderRadius: 14, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                      <i className={`ti ${n.icon}`} /> {n.lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#7a6fb0", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e3d8f5", paddingBottom: 4 }}>
              <i className="ti ti-hierarchy" /> Rattachement physique
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Bâtiment</label>
                <select value={form.batiment_id || ""} onChange={(e) => setForm({ ...form, batiment_id: e.target.value || null, service_id: null, chambre_id: null })}>
                  <option value="">— Aucun —</option>
                  {batiments.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Service</label>
                <select value={form.service_id || ""} onChange={(e) => setForm({ ...form, service_id: e.target.value || null, chambre_id: null })}>
                  <option value="">— Aucun —</option>
                  {servicesForBatiment.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div className="fld">
                <label>Chambre</label>
                <select value={form.chambre_id || ""} onChange={(e) => setForm({ ...form, chambre_id: e.target.value || null })} disabled={!form.service_id}>
                  <option value="">— Aucune —</option>
                  {chambresForService.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              {form.type === "deporte" && (
                <div className="fld">
                  <label>Magasin</label>
                  <select value={form.magasin_id || ""} onChange={(e) => setForm({ ...form, magasin_id: e.target.value || null })}>
                    <option value="">— Aucun —</option>
                    {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  </select>
                </div>
              )}
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #cfeaea", paddingBottom: 4 }}>
              <i className="ti ti-temperature" /> Capacités
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              <div className="fld">
                <label>Capacité max</label>
                <input type="number" min="0" value={form.capacite_max || ""} onChange={(e) => setForm({ ...form, capacite_max: e.target.value })} placeholder="100" />
              </div>
              <div className="fld">
                <label>T° min (°C)</label>
                <input type="number" step="0.5" value={form.temperature_min ?? ""} onChange={(e) => setForm({ ...form, temperature_min: e.target.value })} placeholder="2" />
              </div>
              <div className="fld">
                <label>T° max (°C)</label>
                <input type="number" step="0.5" value={form.temperature_max ?? ""} onChange={(e) => setForm({ ...form, temperature_max: e.target.value })} placeholder="8" />
              </div>
              <div className="fld">
                <label>Humidité max (%)</label>
                <input type="number" step="1" value={form.humidite_max ?? ""} onChange={(e) => setForm({ ...form, humidite_max: e.target.value })} placeholder="60" />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: form.securise ? "rgba(227,93,91,.10)" : "#fafbfc", border: `1px solid ${form.securise ? "#e35d5b" : "#e3e9ee"}`, borderRadius: 6, cursor: "pointer", fontSize: 12.5, marginTop: 8 }}>
              <input type="checkbox" checked={!!form.securise} onChange={(e) => setForm({ ...form, securise: e.target.checked })} />
              <span><i className="ti ti-lock" /> <b>Accès restreint</b> (médicaments, stupéfiants)</span>
            </label>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e3e9ee", paddingBottom: 4 }}>
              <i className="ti ti-palette" /> Apparence
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="fld">
                <label>Couleur</label>
                <input type="color" value={form.couleur || "#7CC8C8"} onChange={(e) => setForm({ ...form, couleur: e.target.value })} style={{ height: 38, width: "100%" }} />
              </div>
              <div className="fld">
                <label>Icône (Tabler)</label>
                <input value={form.icone || "ti-building-warehouse"} onChange={(e) => setForm({ ...form, icone: e.target.value })} placeholder="ti-building-warehouse" style={{ fontFamily: "Consolas, monospace", fontSize: 12 }} />
              </div>
            </div>

            <h4 style={{ margin: "14px 0 8px", fontSize: 12, color: "#5a6878", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e3e9ee", paddingBottom: 4 }}>
              <i className="ti ti-notes" /> Notes
            </h4>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e3e9ee", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit" }} />

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginTop: 10 }}>
              <input type="checkbox" checked={form.actif !== false} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
              <span>Actif</span>
            </label>
          </Modal>
        )}
      </div>
    </div>
  );
}
