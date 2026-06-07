"use client";
// Page Etablissement — Plan + arbre 5 niveaux, KPIs, filtres croisés (lecture)
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg, Btn, Modal } from "../ui";
import { flatten, computeRows, kpisFromRows } from "./lib";
import { logger } from "../../lib/logger";
// 0.58.87 : popup articles dépôt avec recherche vocale + ajout panier
import DepotArticlesModal from "../components/DepotArticlesModal";

export default function Etablissement() {
  const supabase = createClient();
  const router = useRouter();
  const auth = useAuth();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();
  const [tree, setTree] = useState([]);
  const [patients, setPatients] = useState([]);
  const [materiels, setMateriels] = useState([]);
  const [dis, setDis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("plan");
  const [list, setList] = useState("patients");
  const [st, setSt] = useState({ bat: "", etage: "", service: "", chambre: "", patient: "", materiel: "" });
  // 0.58.86 : onglets sur la page établissement
  const [tab, setTab] = useState("apercu");
  const [vehs, setVehs] = useState([]);
  const [depots, setDepots] = useState([]);
  // 0.58.87 : modal articles du dépôt
  const [depotModal, setDepotModal] = useState(null);
  // 0.62.15 : modal création bât/svc/chambre/lit
  const [createModal, setCreateModal] = useState(null);
  const [createForm, setCreateForm] = useState({});
  const [creating, setCreating] = useState(false);

  // 0.62.15 : Reset form quand on ouvre le modal de création
  useEffect(() => {
    if (createModal) {
      setCreateForm({
        nom: "",
        batiment_id: createModal.batiment_id || "",
        service_id: createModal.service_id || "",
        chambre_id: createModal.chambre_id || "",
        nb_lits: 1,
      });
    }
  }, [createModal]);

  // 0.62.15 : Recharger l'arbre après création
  async function reloadTree() {
    if (!auth.etabId) return;
    const [b, s, c, l] = await Promise.all([
      supabase.from("batiments").select("*").eq("etablissement_id", auth.etabId).order("nom"),
      supabase.from("services").select("*").order("nom"),
      supabase.from("chambres").select("*").order("nom"),
      supabase.from("lits").select("*").order("nom"),
    ]);
    const lits = l.data || [];
    const chambres = (c.data || []).map((ch) => ({ ...ch, lits: lits.filter((x) => x.chambre_id === ch.id) }));
    const services = (s.data || []).map((sv) => ({ ...sv, chambres: chambres.filter((x) => x.service_id === sv.id) }));
    const servicesOrphelins = services.filter(sv => !sv.batiment_id);
    const bats = (b.data || []).map((ba, idx) => {
      let svcsBat = services.filter((x) => x.batiment_id === ba.id);
      if (idx === 0 && servicesOrphelins.length > 0) svcsBat = [...svcsBat, ...servicesOrphelins];
      return { ...ba, etages: [{ id: `${ba.id}-default`, nom: "—", services: svcsBat }] };
    });
    if (bats.length === 0 && services.length > 0) {
      bats.push({ id: "virtual-bat", nom: "📍 Établissement (sans bâtiment)", etages: [{ id: "virtual-etage", nom: "—", services }] });
    }
    setTree(bats);
  }

  // 0.62.15 : Créer bâtiment / service / chambre / lit
  async function createEntity() {
    if (!createForm.nom?.trim()) { alert("Nom obligatoire"); return; }
    setCreating(true);
    try {
      const type = createModal.type;
      let payload = { nom: createForm.nom.trim(), structure_id: auth.structureId };
      if (type === "batiment") payload.etablissement_id = auth.etabId;
      if (type === "service") {
        if (!createForm.batiment_id) { alert("Choisis un bâtiment"); setCreating(false); return; }
        payload.batiment_id = createForm.batiment_id;
        payload.etablissement_id = auth.etabId;
      }
      if (type === "chambre") {
        if (!createForm.service_id) { alert("Choisis un service"); setCreating(false); return; }
        payload.service_id = createForm.service_id;
      }
      if (type === "lit") {
        if (!createForm.chambre_id) { alert("Choisis une chambre"); setCreating(false); return; }
        payload.chambre_id = createForm.chambre_id;
      }
      const table = type === "batiment" ? "batiments" : type === "service" ? "services" : type === "chambre" ? "chambres" : "lits";
      const r = await supabase.from(table).insert(payload);
      if (r.error) throw r.error;
      // Si chambre + nb_lits > 0 → créer les lits associés
      if (type === "chambre" && createForm.nb_lits > 0) {
        const created = await supabase.from("chambres").select("id").eq("nom", createForm.nom.trim()).eq("service_id", createForm.service_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (created.data?.id) {
          const litsPayload = [];
          for (let i = 1; i <= createForm.nb_lits; i++) {
            litsPayload.push({ chambre_id: created.data.id, nom: `Lit ${i}`, structure_id: auth.structureId });
          }
          await supabase.from("lits").insert(litsPayload);
        }
      }
      setCreateModal(null);
      await reloadTree();
    } catch (e) {
      console.error("[create entity]", e);
      alert("❌ Erreur : " + (e.message || JSON.stringify(e)));
    } finally {
      setCreating(false);
    }
  }

  // 0.58.86 : chargement véhicules + dépôts au mount
  useEffect(() => {
    if (!auth.ready || !auth.etabId) return;
    let mounted = true;
    (async () => {
      try {
        const [v, d] = await Promise.all([
          supabase.from("vehicules").select("*").eq("etablissement_id", auth.etabId).order("nom").then(r => r).catch(() => ({ data: [] })),
          supabase.from("depots").select("*").eq("etablissement_id", auth.etabId).order("nom").then(r => r).catch(() => ({ data: [] })),
        ]);
        if (mounted) {
          setVehs(v.data || []);
          setDepots(d.data || []);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [auth.ready, auth.etabId]);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const [b, s, c, l, pa, ma, di] = await Promise.all([
          supabase.from("batiments").select("*").eq("etablissement_id", auth.etabId).order("nom"),
          supabase.from("services").select("*").order("nom"),
          supabase.from("chambres").select("*").order("nom"),
          supabase.from("lits").select("*").order("nom"),
          supabase.from("patients").select("*").eq("etablissement_id", auth.etabId),
          supabase.from("materiels").select("*").eq("etablissement_id", auth.etabId),
          supabase.from("interventions").select("id,patient_id,materiel_id,type,urgence,statut,numero,description,created_at").eq("etablissement_id", auth.etabId),
        ]);
        // 0.62.15 : reconstruire l'arbre SANS les étages (table supprimée en 0.58.85)
        // Services rattachés DIRECTEMENT aux bâtiments via services.batiment_id
        const lits = l.data || [];
        const chambres = (c.data || []).map((ch) => ({ ...ch, lits: lits.filter((x) => x.chambre_id === ch.id) }));
        const services = (s.data || []).map((sv) => ({ ...sv, chambres: chambres.filter((x) => x.service_id === sv.id) }));
        // Services orphelins (sans batiment_id)
        const servicesOrphelins = services.filter(sv => !sv.batiment_id);
        // Bâtiments → services rattachés via batiment_id
        const bats = (b.data || []).map((ba, idx) => {
          let svcsBat = services.filter((x) => x.batiment_id === ba.id);
          // 0.62.15 : Si premier bâtiment ET il y a des services orphelins → on les ajoute ici
          // (cas DB pas migrée : services sans batiment_id mais qu'on veut quand même afficher)
          if (idx === 0 && servicesOrphelins.length > 0) {
            svcsBat = [...svcsBat, ...servicesOrphelins];
          }
          return {
            ...ba,
            // pseudo-étage "—" pour garder la structure attendue par PlanView/TreeView
            etages: [{ id: `${ba.id}-default`, nom: "—", services: svcsBat }],
          };
        });
        // Si aucun bâtiment mais on a des services, créer un bâtiment virtuel
        if (bats.length === 0 && services.length > 0) {
          bats.push({
            id: "virtual-bat",
            nom: "📍 Établissement (sans bâtiment)",
            etages: [{ id: "virtual-etage", nom: "—", services }],
          });
        }
        // Diagnostic console
        console.info("[Etab] Bâtiments:", b.data?.length, "Services:", services.length,
          "Orphelins (sans batiment_id):", servicesOrphelins.length,
          "Chambres:", chambres.length, "Lits:", lits.length);
        setTree(bats); setPatients(pa.data || []); setMateriels(ma.data || []); setDis(di.data || []);
      } catch (e) {
        // 0.57.5 : try/catch englobant pour pas crasher la page
        logger.error("[Etablissement] load failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.ready, auth.etabId]);

  const rowsAll = useMemo(() => flatten(tree), [tree]);
  const rows = useMemo(() => computeRows(rowsAll, st, materiels), [rowsAll, st, materiels]);
  const kpis = useMemo(() => kpisFromRows(rows, materiels, dis), [rows, materiels, dis]);

  const pName = (id) => { const p = patients.find((x) => x.id === id); return p ? `${p.nom} ${p.prenom || ""}` : "—"; };
  const matsOf = (pid) => materiels.filter((m) => m.patient_id === pid);
  const diOfChambre = (ch) => { const ps = ch.lits.filter((l) => l.patient_id).map((l) => l.patient_id); return dis.filter((d) => d.statut !== "Clôturée" && ps.includes(d.patient_id)); };

  function setFilter(k, v) {
    setSt((p) => {
      const n = { ...p, [k]: v };
      if (k === "bat") { n.etage = ""; n.service = ""; n.chambre = ""; }
      if (k === "etage") { n.service = ""; n.chambre = ""; }
      if (k === "service") { n.chambre = ""; }
      return n;
    });
  }

  // options dépendantes pour les filtres
  const visiblePatIds = new Set(rows.filter((r) => r.patientId).map((r) => r.patientId));
  const opts = {
    bat: tree.map((b) => ({ v: b.id, l: b.nom })),
    etage: tree.filter((b) => !st.bat || b.id === st.bat).flatMap((b) => b.etages).map((e) => ({ v: e.id, l: e.nom })),
    service: tree.flatMap((b) => b.etages).filter((e) => !st.etage || e.id === st.etage).flatMap((e) => e.services).map((s) => ({ v: s.id, l: s.nom })),
    chambre: tree.flatMap((b) => b.etages).flatMap((e) => e.services).filter((s) => !st.service || s.id === st.service).flatMap((s) => s.chambres).map((c) => ({ v: c.id, l: `Ch. ${c.nom}` })),
    patient: patients.filter((p) => visiblePatIds.has(p.id)).map((p) => ({ v: p.id, l: `${p.nom} ${p.prenom || ""}` })),
    materiel: materiels.filter((m) => visiblePatIds.has(m.patient_id)).map((m) => ({ v: m.id, l: `${m.libelle}${m.num_serie ? ` (${m.num_serie})` : ""}` })),
  };

  if (!auth.ready) return null;

  const tiles = [
    { l: "Lits (occ./total)", v: `${kpis.occ} / ${kpis.lits}`, ic: "ti-bed", c: "#7CC8C8" },
    { l: "Taux d'occupation", v: `${kpis.taux}%`, ic: "ti-chart-pie", c: "#5a8f8f" },
    { l: "Patients présents", v: kpis.patients, ic: "ti-users", c: "#7a6fb0" },
    { l: "Matériel posé", v: kpis.mat, ic: "ti-armchair-2", c: "#142131" },
    { l: "DI en cours", v: kpis.di, ic: "ti-tools", c: "#e35d5b" },
  ];

  // chambres à afficher selon filtres (réutilise rows pour cohérence)
  const visibleChambreIds = new Set(rows.map((r) => r.chambre.id));

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <PageHead eyebrow="CENTRE DE SOIN" title="Mon établissement" />
          <button className="btn-ghost" onClick={() => router.push("/patients")}><i className="ti ti-arrow-left" /> Retour patients</button>
        </div>

        {loading ? <Panel><StateMsg>Chargement…</StateMsg></Panel> : (
          <>
            <div className="kpi-grid" style={{ marginTop: 8 }}>
              {tiles.map((t) => (
                <div className="kpi-tile" key={t.l} style={{ cursor: "default" }}>
                  <span className="kpi-ic" style={{ background: t.c + "22", color: t.c }}><i className={`ti ${t.ic}`} /></span>
                  <span className="kpi-val">{t.v}</span><span className="kpi-lbl">{t.l}</span>
                </div>
              ))}
            </div>

            {/* 0.58.86 : Onglets */}
            <div style={{ display: "flex", gap: 4, marginTop: 18, marginBottom: 8, flexWrap: "wrap", background: "rgba(20,33,49,.04)", padding: 6, borderRadius: 14, border: "1px solid #e3e9ee" }}>
              {[
                { k: "apercu",    lbl: "Aperçu",   ic: "ti-layout-grid", c: "#185FA5" },
                { k: "vehicules", lbl: `Véhicules (${vehs.length})`, ic: "ti-ambulance", c: "#e35d5b" },
                { k: "depots",    lbl: `Dépôts (${depots.length})`,    ic: "ti-building-warehouse", c: "#EF9F27" },
                { k: "magasins",  lbl: `Magasins rattachés`, ic: "ti-link", c: "#5a8f8f" },
                // 0.62.17 : onglets manquants
                { k: "garages",       lbl: "Garages",        ic: "ti-parking",      c: "#185FA5" },
                { k: "equipes",       lbl: "Équipes",        ic: "ti-users-group",  c: "#5a4a90" },
                { k: "collaborateurs", lbl: "Collaborateurs", ic: "ti-users",       c: "#7CC8C8" },
                { k: "patients",      lbl: "Patients",       ic: "ti-heart",        c: "#e35d5b" },
                { k: "materiels",     lbl: "Matériels",      ic: "ti-package",      c: "#7a6fb0" },
              ].map(t => {
                const active = tab === t.k;
                return (
                  <button key={t.k} onClick={() => setTab(t.k)} style={{
                    background: active ? "#fff" : "transparent",
                    color: active ? t.c : "#5a6878",
                    border: active ? `1px solid ${t.c}33` : "1px solid transparent",
                    borderLeft: active ? `3px solid ${t.c}` : "1px solid transparent",
                    padding: "9px 14px", borderRadius: 10,
                    fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    transition: "all .15s",
                    boxShadow: active ? `0 4px 10px ${t.c}22` : "none",
                  }}>
                    <i className={`ti ${t.ic}`} style={{ marginRight: 5 }} /> {t.lbl}
                  </button>
                );
              })}
            </div>

            {/* === ONGLET APERÇU (existant) === */}
            {tab === "apercu" && (<>
            <Panel style={{ marginTop: 18 }}>
              <div className="etab-bar">
                <div className="etab-filters">
                  {["bat", "etage", "service", "chambre", "patient", "materiel"].map((k) => (
                    <select key={k} value={st[k]} onChange={(e) => setFilter(k, e.target.value)}>
                      <option value="">{{ bat: "Bâtiment", etage: "Étage", service: "Service", chambre: "Chambre", patient: "Patient", materiel: lbl("materiel", "Matériel") }[k]}</option>
                      {opts[k].map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ))}
                </div>
                <div className="seg" style={{ marginLeft: "auto" }}>
                  <button className={view === "plan" ? "on" : ""} onClick={() => setView("plan")}><i className="ti ti-layout-grid" /> Plan</button>
                  <button className={view === "tree" ? "on" : ""} onClick={() => setView("tree")}><i className="ti ti-binary-tree" /> Arbre</button>
                </div>
              </div>

              {/* 0.62.15 : Boutons rapides création structure (modal local, pas redirect) */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, alignSelf: "center", marginRight: 4 }}>+ Créer :</span>
                <button onClick={() => setCreateModal({ type: "batiment" })} style={btnQuick("#185FA5")}>
                  <i className="ti ti-building" /> Bâtiment
                </button>
                <button onClick={() => setCreateModal({ type: "service", batiment_id: st.bat })} style={btnQuick("#7CC8C8")}>
                  <i className="ti ti-stethoscope" /> Service
                </button>
                <button onClick={() => setCreateModal({ type: "chambre", service_id: st.service })} style={btnQuick("#7a6fb0")}>
                  <i className="ti ti-door" /> Chambre
                </button>
                <button onClick={() => setCreateModal({ type: "lit", chambre_id: st.chambre })} style={btnQuick("#EF9F27")}>
                  <i className="ti ti-bed" /> Lit
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                {Object.entries(st).filter(([, v]) => v).map(([k, v]) => {
                  const label = k === "patient" ? `Patient : ${pName(v)}` : k === "materiel" ? `Matériel` : k === "chambre" ? `Chambre` : k;
                  return <span className="active-flt" key={k}>{label} <i className="ti ti-x x" onClick={() => setFilter(k, "")} /></span>;
                })}
              </div>

              {view === "plan" ? (
                <PlanView tree={tree} st={st} setFilter={setFilter} visibleChambreIds={visibleChambreIds} pName={pName} matsOf={matsOf} diOfChambre={diOfChambre} />
              ) : (
                <TreeView tree={tree} st={st} setFilter={setFilter} visibleChambreIds={visibleChambreIds} pName={pName} diOfChambre={diOfChambre} />
              )}
            </Panel>

            {/* 0.62.9 : Panneau détail chambre sélectionnée — MAX d'infos */}
            {st.chambre && (() => {
              // Retrouver la chambre dans le tree
              let chambreSel = null, serviceSel = null, batSel = null;
              for (const b of tree) {
                for (const e of b.etages) {
                  for (const sv of e.services) {
                    const ch = sv.chambres.find(c => c.id === st.chambre);
                    if (ch) { chambreSel = ch; serviceSel = sv; batSel = b; break; }
                  }
                  if (chambreSel) break;
                }
                if (chambreSel) break;
              }
              if (!chambreSel) return null;
              const patientsChambre = chambreSel.lits.filter(l => l.patient_id).map(l => ({ lit: l, patient: patients.find(p => p.id === l.patient_id) }));
              const materielsChambre = materiels.filter(m =>
                // 0.62.11 : materiels.chambre_id peut ne pas exister, on prend les materiels rattachés aux patients de la chambre
                (m.chambre_id && m.chambre_id === chambreSel.id) ||
                patientsChambre.some(p => p.patient && m.patient_id === p.patient.id)
              );
              const disChambre = dis.filter(d => {
                // 0.62.11 : pas de chambre_id direct sur interventions, on passe via patient/materiel
                if (patientsChambre.some(p => p.patient && d.patient_id === p.patient.id)) return true;
                if (materielsChambre.some(m => d.materiel_id === m.id)) return true;
                return false;
              });
              const occ = chambreSel.lits.filter(l => l.patient_id).length;
              return (
                <Panel style={{ marginTop: 14, borderLeft: "4px solid #185FA5" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, color: "#142131" }}>
                        <i className="ti ti-door" style={{ color: "#185FA5", marginRight: 6 }} />
                        Chambre {chambreSel.nom}
                      </h3>
                      <div style={{ fontSize: 11.5, color: "#5a6878", marginTop: 2 }}>
                        {batSel.nom} · {serviceSel.nom} · {occ}/{chambreSel.lits.length} lits occupés
                      </div>
                    </div>
                    <button onClick={() => setFilter("chambre", "")} style={{ background: "transparent", border: "1px solid #cfd8e0", padding: "5px 12px", borderRadius: 6, cursor: "pointer", color: "#5a6878", fontFamily: "inherit", fontSize: 12 }}>
                      <i className="ti ti-x" /> Désélectionner
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                    {/* Lits + Patients */}
                    <div>
                      <h4 style={{ margin: "0 0 8px", fontSize: 12, color: "#185FA5", textTransform: "uppercase", letterSpacing: 1 }}>🛏 Lits & Patients</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {chambreSel.lits.map(l => {
                          const p = l.patient_id ? patients.find(x => x.id === l.patient_id) : null;
                          return (
                            <div key={l.id} style={{
                              padding: "8px 10px", background: l.patient_id ? "#eaf6ee" : "#f4f7fa",
                              borderRadius: 6, border: `1px solid ${l.patient_id ? "#b5dcc1" : "#e3e9ee"}`,
                              fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <i className="ti ti-bed" style={{ color: l.patient_id ? "#1D9E75" : "#8a98a8" }} />
                              <span style={{ flex: 1 }}>
                                <b>{l.nom}</b> · {p ? `${p.nom} ${p.prenom || ""}` : <span style={{ color: "#8a98a8" }}>Libre</span>}
                              </span>
                              {p && <button onClick={() => router.push(`/patient/${p.id}`)} style={{ background: "transparent", border: "none", color: "#185FA5", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Fiche →</button>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Matériels */}
                    <div>
                      <h4 style={{ margin: "0 0 8px", fontSize: 12, color: "#7CC8C8", textTransform: "uppercase", letterSpacing: 1 }}>🛠 Matériels ({materielsChambre.length})</h4>
                      {materielsChambre.length === 0 ? (
                        <div style={{ padding: 14, color: "#8a98a8", fontSize: 12, textAlign: "center", background: "#fafbfc", borderRadius: 6 }}>Aucun matériel</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                          {materielsChambre.slice(0, 20).map(m => {
                            const meta = getEtatMeta ? getEtatMeta(m.etat) : { col: "#5a6878" };
                            return (
                              <div key={m.id} onClick={() => router.push(`/materiel/${m.id}`)} style={{
                                padding: "6px 10px", background: "#fff",
                                borderLeft: `3px solid ${meta.col || "#7CC8C8"}`,
                                borderRadius: 4, fontSize: 11.5, cursor: "pointer",
                                border: "1px solid #e3e9ee",
                              }}>
                                <div style={{ fontWeight: 600, color: "#142131" }}>{m.libelle || "Matériel"}</div>
                                <div style={{ fontSize: 10, color: "#8a98a8" }}>
                                  {m.num_serie && <>S/N: {m.num_serie} · </>}
                                  {m.num_parc && <>Parc: {m.num_parc} · </>}
                                  <span style={{ color: meta.col || "#5a6878", fontWeight: 700 }}>{m.etat || "—"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Demandes d'intervention */}
                    <div>
                      <h4 style={{ margin: "0 0 8px", fontSize: 12, color: "#EF9F27", textTransform: "uppercase", letterSpacing: 1 }}>🔧 Interventions ({disChambre.length})</h4>
                      {disChambre.length === 0 ? (
                        <div style={{ padding: 14, color: "#8a98a8", fontSize: 12, textAlign: "center", background: "#fafbfc", borderRadius: 6 }}>Aucune DI</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                          {disChambre.map(d => {
                            const statutCol = d.statut === "Clôturée" ? "#5aa05a" : d.statut === "En cours" ? "#EF9F27" : d.urgence === "Urgent" ? "#e35d5b" : "#185FA5";
                            return (
                              <div key={d.id} onClick={() => router.push(`/interventions?id=${d.id}`)} style={{
                                padding: "6px 10px", background: "#fff",
                                borderLeft: `3px solid ${statutCol}`,
                                borderRadius: 4, fontSize: 11.5, cursor: "pointer",
                                border: "1px solid #e3e9ee",
                              }}>
                                <div style={{ fontWeight: 600, color: "#142131", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                  <span>{d.numero || `DI-${d.id?.substring(0, 8)}`}</span>
                                  <span style={{ fontSize: 9, background: statutCol, color: "#fff", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>{d.statut || "Nouvelle"}</span>
                                </div>
                                <div style={{ fontSize: 10, color: "#8a98a8" }}>
                                  {d.type} · {d.urgence}
                                </div>
                                {d.description && <div style={{ fontSize: 10.5, color: "#5a6878", marginTop: 2 }}>{d.description.slice(0, 80)}{d.description.length > 80 ? "…" : ""}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #e3e9ee", flexWrap: "wrap" }}>
                    <button onClick={() => router.push(`/interventions?new=1&chambre=${chambreSel.id}`)} style={{ background: "#EF9F27", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
                      <i className="ti ti-plus" /> Nouvelle DI
                    </button>
                    <button onClick={() => router.push(`/materiels?chambre=${chambreSel.id}`)} style={{ background: "#7CC8C8", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
                      <i className="ti ti-tools" /> Voir tout matériel
                    </button>
                    {patientsChambre.length > 0 && (
                      <button onClick={() => router.push(`/patient/${patientsChambre[0].patient.id}`)} style={{ background: "transparent", color: "#185FA5", border: "1px solid #185FA5", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
                        <i className="ti ti-user" /> Fiche patient
                      </button>
                    )}
                  </div>
                </Panel>
              );
            })()}

            <Panel style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 17 }}>{{ patients: lbl("patients", "Patients"), materiels: lbl("materiel", "Matériel"), di: "DI en cours" }[list]}</h2>
                <div className="seg">
                  <button className={list === "patients" ? "on" : ""} onClick={() => setList("patients")}>Patients</button>
                  <button className={list === "materiels" ? "on" : ""} onClick={() => setList("materiels")}>Matériel</button>
                  <button className={list === "di" ? "on" : ""} onClick={() => setList("di")}>DI en cours</button>
                </div>
              </div>
              <ListView list={list} rows={rows} patients={patients} materiels={materiels} dis={dis} pName={pName} matsOf={matsOf} st={st} setFilter={setFilter} />
            </Panel>
            </>)}

            {/* === ONGLET VÉHICULES === */}
            {tab === "vehicules" && (
              <Panel style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, flex: 1, fontSize: 16 }}>
                    <i className="ti ti-ambulance" style={{ color: "#e35d5b" }} /> Véhicules rattachés
                  </h2>
                  <button onClick={() => router.push(`/vehicules?new=1&etablissement_id=${auth.etabId}`)} className="btn-primary"
                    style={{ background: "linear-gradient(135deg,#e35d5b,#c0494a)", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5 }}>
                    <i className="ti ti-plus" /> Nouveau véhicule
                  </button>
                </div>
                {vehs.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: "#5a6878" }}>
                    <i className="ti ti-ambulance" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Aucun véhicule rattaché</div>
                    <div style={{ fontSize: 12 }}>Crée un véhicule sanitaire, ambulance, VSL, taxi ou utilitaire avec le bouton ci-dessus.</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                    {vehs.map(v => <VehiculeCard key={v.id} v={v} router={router} />)}
                  </div>
                )}
              </Panel>
            )}

            {/* === ONGLET DÉPÔTS === */}
            {tab === "depots" && (
              <Panel style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, flex: 1, fontSize: 16 }}>
                    <i className="ti ti-building-warehouse" style={{ color: "#EF9F27" }} /> Dépôts rattachés
                  </h2>
                  <button onClick={() => router.push(`/depots?new=1&etablissement_id=${auth.etabId}`)}
                    style={{ background: "linear-gradient(135deg,#EF9F27,#d48820)", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5 }}>
                    <i className="ti ti-plus" /> Nouveau dépôt
                  </button>
                  <button onClick={() => router.push("/depots")}
                    style={{ background: "rgba(255,255,255,.06)", color: "#142131", border: "1px solid #cfd8e0", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5 }}>
                    <i className="ti ti-external-link" /> Voir tous les dépôts
                  </button>
                </div>
                {depots.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: "#5a6878" }}>
                    <i className="ti ti-building-warehouse" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Aucun dépôt rattaché</div>
                    <div style={{ fontSize: 12 }}>Crée un dépôt (réserve, pharmacie, dépôt mobile sur véhicule, etc.).</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                    {depots.map(d => <DepotCard key={d.id} d={d} vehs={vehs} router={router} onOpenArticles={() => setDepotModal(d)} />)}
                  </div>
                )}
              </Panel>
            )}
            {/* === 0.62.12 : ONGLET MAGASINS RATTACHÉS === */}
            {tab === "magasins" && (
              <MagasinsRattachesPanel etabId={auth.etabId} auth={auth} supabase={supabase} />
            )}

            {/* 0.62.17 : Onglets raccourcis (redirect vers les pages dédiées) */}
            {tab === "garages" && <RedirectTab icon="ti-parking" color="#185FA5" title="Garages & parkings" desc="Lieux de stationnement et d'entretien des véhicules de cet étab" href="/garages" router={router} />}
            {tab === "equipes" && <RedirectTab icon="ti-users-group" color="#5a4a90" title="Équipes & services" desc="Équipes terrain rattachées à cet établissement" href="/equipes" router={router} />}
            {tab === "collaborateurs" && <RedirectTab icon="ti-users" color="#7CC8C8" title="Collaborateurs" desc="Personnel et intervenants de l'établissement" href="/collaborateurs" router={router} />}
            {tab === "patients" && <RedirectTab icon="ti-heart" color="#e35d5b" title="Patients" desc="Patients pris en charge dans cet étab" href="/patients" router={router} />}
            {tab === "materiels" && <RedirectTab icon="ti-package" color="#7a6fb0" title="Matériels" desc="Équipements rattachés à cet étab — fiches de traçabilité" href="/materiels" router={router} />}
          </>
        )}
        {/* 0.58.87 : Modal articles du dépôt sélectionné */}
        {depotModal && <DepotArticlesModal depot={depotModal} onClose={() => setDepotModal(null)} />}

        {/* 0.62.15 : Modal création bât/svc/chambre/lit */}
        {createModal && (
          <Modal open={!!createModal} onClose={() => setCreateModal(null)} kind="patient"
            title={`Créer ${createModal.type === "batiment" ? "un bâtiment" : createModal.type === "service" ? "un service" : createModal.type === "chambre" ? "une chambre" : "un lit"}`}
            actions={
              <>
                <Btn variant="ghost" onClick={() => setCreateModal(null)}>Annuler</Btn>
                <Btn variant="primary" onClick={createEntity} disabled={creating}>{creating ? "Création..." : "Créer"}</Btn>
              </>
            }>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 12, color: "#5a6878" }}>
                <b>Nom *</b>
                <input value={createForm.nom || ""} onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                  placeholder={createModal.type === "batiment" ? "Bâtiment A" : createModal.type === "service" ? "Cardiologie" : createModal.type === "chambre" ? "101" : "Lit 1"}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}
                  autoFocus
                />
              </label>

              {/* Pour service : sélecteur bâtiment */}
              {createModal.type === "service" && (
                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Bâtiment *</b>
                  <select value={createForm.batiment_id || ""} onChange={(e) => setCreateForm({ ...createForm, batiment_id: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                    <option value="">— Choisir un bâtiment —</option>
                    {tree.filter(b => !b.id.startsWith("virtual")).map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </label>
              )}

              {/* Pour chambre : sélecteur service + nb lits */}
              {createModal.type === "chambre" && (
                <>
                  <label style={{ fontSize: 12, color: "#5a6878" }}>
                    <b>Service *</b>
                    <select value={createForm.service_id || ""} onChange={(e) => setCreateForm({ ...createForm, service_id: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                      <option value="">— Choisir un service —</option>
                      {tree.flatMap(b => b.etages.flatMap(e => e.services)).map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: "#5a6878" }}>
                    <b>Créer combien de lits ?</b>
                    <input type="number" min="0" max="20" value={createForm.nb_lits || 0} onChange={(e) => setCreateForm({ ...createForm, nb_lits: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}
                    />
                    <div style={{ fontSize: 10, color: "#8a98a8", marginTop: 4 }}>0 = aucun lit (vide). Les lits seront créés automatiquement (Lit 1, Lit 2, ...)</div>
                  </label>
                </>
              )}

              {/* Pour lit : sélecteur chambre */}
              {createModal.type === "lit" && (
                <label style={{ fontSize: 12, color: "#5a6878" }}>
                  <b>Chambre *</b>
                  <select value={createForm.chambre_id || ""} onChange={(e) => setCreateForm({ ...createForm, chambre_id: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                    <option value="">— Choisir une chambre —</option>
                    {tree.flatMap(b => b.etages.flatMap(e => e.services.flatMap(s => s.chambres))).map(c => <option key={c.id} value={c.id}>Ch. {c.nom}</option>)}
                  </select>
                </label>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function litColor(occ) { return occ ? "#1D9E75" : "#cfd6dd"; }

function PlanView({ tree, st, setFilter, visibleChambreIds, pName, matsOf, diOfChambre }) {
  const bats = tree.filter((b) => !st.bat || b.id === st.bat);
  if (!bats.length) return <StateMsg>Aucune chambre pour ces filtres.</StateMsg>;
  return bats.map((b) => {
    const etages = b.etages.filter((e) => !st.etage || e.id === st.etage);
    const content = etages.map((e) => {
      const services = e.services.filter((s) => !st.service || s.id === st.service);
      const svHtml = services.map((s) => {
        const chambres = s.chambres.filter((c) => (!st.chambre || c.id === st.chambre) && visibleChambreIds.has(c.id));
        if (!chambres.length) return null;
        return (
          <div className="plan-service" key={s.id}>
            <div className="plan-service-h">{s.nom}</div>
            <div className="chambres">
              {chambres.map((c) => {
                const occ = c.lits.filter((l) => l.patient_id).length;
                const di = diOfChambre(c).length;
                return (
                  <div className={`chambre${st.chambre === c.id ? " sel" : ""}`} key={c.id} onClick={() => setFilter("chambre", st.chambre === c.id ? "" : c.id)}>
                    <div className="chambre-h">Ch. {c.nom}{di ? <span className="badge-di">{di} DI</span> : null}
                      <span className="occ" style={{ background: occ === c.lits.length ? "#E1F5EE" : occ ? "#FFF3E0" : "#eef1f4", color: occ === c.lits.length ? "#0F6E56" : occ ? "#8a5300" : "#5a6776" }}>{occ}/{c.lits.length}</span>
                    </div>
                    <div className="lits">
                      {c.lits.map((l) => {
                        const m = l.patient_id ? matsOf(l.patient_id).length : 0;
                        return (
                          <div className={`lit ${l.patient_id ? "occupe" : "libre"}`} key={l.id}>
                            <span className="dot" style={{ background: litColor(!!l.patient_id) }} />
                            <i className="ti ti-bed" /> {l.nom} · {l.patient_id ? pName(l.patient_id) : "libre"}
                            {m ? <span className="lmat"><i className="ti ti-armchair-2" /> {m}</span> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }).filter(Boolean);
      return svHtml.length ? <div className="plan-etage" key={e.id}><div className="plan-etage-h"><i className="ti ti-stairs" /> {e.nom}</div>{svHtml}</div> : null;
    }).filter(Boolean);
    return content.length ? <div className="plan-bat" key={b.id}><div className="plan-bat-h"><i className="ti ti-building" /> {b.nom}</div>{content}</div> : null;
  }).filter(Boolean);
}

function TreeView({ tree, st, setFilter, visibleChambreIds, pName, diOfChambre }) {
  return (
    <div className="tree"><ul>
      {tree.filter((b) => !st.bat || b.id === st.bat).map((b) => (
        <li key={b.id}><span className="node n-bat"><i className="ti ti-building" /> {b.nom}</span>
          <ul>{b.etages.filter((e) => !st.etage || e.id === st.etage).map((e) => (
            <li key={e.id}><span className="node"><i className="ti ti-stairs" /> {e.nom}</span>
              <ul>{e.services.filter((s) => !st.service || s.id === st.service).map((s) => (
                <li key={s.id}><span className="node"><i className="ti ti-stethoscope" /> {s.nom}</span>
                  <ul>{s.chambres.filter((c) => (!st.chambre || c.id === st.chambre) && visibleChambreIds.has(c.id)).map((c) => {
                    const di = diOfChambre(c).length;
                    return (
                      <li key={c.id}><span className={`node${st.chambre === c.id ? " sel" : ""}`} onClick={() => setFilter("chambre", st.chambre === c.id ? "" : c.id)}><i className="ti ti-door" /> Ch. {c.nom}{di ? <span className="badge-di">{di} DI</span> : null}</span>
                        <ul>{c.lits.map((l) => (
                          <li key={l.id}><span className="node n-lit"><span className="dot" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: litColor(!!l.patient_id) }} /> Lit {l.nom} — {l.patient_id ? pName(l.patient_id) : "libre"}</span></li>
                        ))}</ul>
                      </li>
                    );
                  })}</ul>
                </li>
              ))}</ul>
            </li>
          ))}</ul>
        </li>
      ))}
    </ul></div>
  );
}

function ListView({ list, rows, patients, materiels, dis, pName, matsOf, st, setFilter }) {
  const patIds = new Set(rows.filter((r) => r.patientId).map((r) => r.patientId));
  if (list === "patients") {
    const ps = patients.filter((p) => patIds.has(p.id));
    if (!ps.length) return <StateMsg>Aucun élément pour ces filtres.</StateMsg>;
    return <div className="panel-table"><table><thead><tr><th>Patient</th><th>Chambre</th><th>Matériel</th><th>DI</th></tr></thead><tbody>
      {ps.map((p) => { const r = rows.find((x) => x.patientId === p.id); const nbd = dis.filter((d) => d.patient_id === p.id && d.statut !== "Clôturée").length;
        return <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setFilter("patient", st.patient === p.id ? "" : p.id)}>
          <td>{p.nom} {p.prenom}</td><td>ch. {r?.chambre.nom || p.chambre || "—"}</td><td>{matsOf(p.id).length}</td><td>{nbd ? <span className="badge-di">{nbd}</span> : "0"}</td></tr>; })}
    </tbody></table></div>;
  }
  if (list === "materiels") {
    const ms = materiels.filter((m) => patIds.has(m.patient_id));
    if (!ms.length) return <StateMsg>Aucun élément pour ces filtres.</StateMsg>;
    const cls = (e) => e === "En location" ? "s-livree" : e === "Maintenance" ? "s-encours2" : "s-validee";
    return <div className="panel-table"><table><thead><tr><th>Article</th><th>N° série</th><th>N° parc</th><th>N° lot</th><th>Patient</th><th>État</th></tr></thead><tbody>
      {ms.map((m) => <tr key={m.id} style={{ cursor: "pointer" }} onClick={() => setFilter("materiel", st.materiel === m.id ? "" : m.id)}>
        <td>{m.libelle}</td><td>{m.num_serie || "—"}</td><td>{m.num_parc || "—"}</td><td>{m.num_lot || "—"}</td><td>{pName(m.patient_id)}</td><td><span className={`statut ${cls(m.etat)}`}>{m.etat}</span></td></tr>)}
    </tbody></table></div>;
  }
  const ds = dis.filter((d) => d.statut !== "Clôturée" && patIds.has(d.patient_id));
  if (!ds.length) return <StateMsg>Aucun élément pour ces filtres.</StateMsg>;
  return <div className="panel-table"><table><thead><tr><th>N°</th><th>Type</th><th>Urgence</th><th>Patient</th><th>Statut</th></tr></thead><tbody>
    {ds.map((d) => <tr key={d.id}><td style={{ fontWeight: 600 }}>{d.numero}</td><td><span className="tag-type">{d.type}</span></td><td><span className={`urg ${d.urgence === "Urgent" ? "urg-urgent" : "urg-normal"}`}>{d.urgence}</span></td><td>{pName(d.patient_id)}</td><td><span className="statut s-validee">{d.statut}</span></td></tr>)}
  </tbody></table></div>;
}

// 0.58.86 : composants pour les nouveaux onglets Véhicules et Dépôts
const VEHICULE_TYPES = {
  sanitaire:  { c: "#185FA5", i: "ti-ambulance",  lbl: "Sanitaire" },
  ambulance:  { c: "#e35d5b", i: "ti-ambulance",  lbl: "Ambulance" },
  vsl:        { c: "#7CC8C8", i: "ti-car",        lbl: "VSL" },
  taxi:       { c: "#EF9F27", i: "ti-cab",        lbl: "Taxi" },
  utilitaire: { c: "#5aa05a", i: "ti-truck",      lbl: "Utilitaire" },
  autre:      { c: "#8a98a8", i: "ti-car-suv",    lbl: "Autre" },
};
const VEHICULE_STATUTS = {
  disponible:     { c: "#5aa05a", lbl: "Disponible" },
  en_mission:     { c: "#185FA5", lbl: "En mission" },
  en_maintenance: { c: "#EF9F27", lbl: "Maintenance" },
  hors_service:   { c: "#e35d5b", lbl: "Hors service" },
};

function VehiculeCard({ v, router }) {
  const t = VEHICULE_TYPES[v.type] || VEHICULE_TYPES.autre;
  const s = VEHICULE_STATUTS[v.statut] || VEHICULE_STATUTS.disponible;
  return (
    <div onClick={() => router.push(`/vehicules/${v.id}`)} style={{
      background: "#fff", border: `1px solid ${t.c}33`, borderLeft: `4px solid ${v.couleur || t.c}`,
      borderRadius: 12, padding: "14px 16px", cursor: "pointer",
      transition: "all .15s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 16px ${t.c}33`; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ width: 38, height: 38, background: `${v.couleur || t.c}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className={`ti ${v.icone || t.i}`} style={{ color: v.couleur || t.c, fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{v.nom}</div>
          <div style={{ fontSize: 10.5, color: "#5a6878" }}>{t.lbl}{v.immatriculation ? <> · <span style={{ fontFamily: "Consolas, monospace" }}>{v.immatriculation}</span></> : null}</div>
        </div>
        <span style={{ background: `${s.c}22`, color: s.c, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{s.lbl}</span>
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#5a6878", flexWrap: "wrap" }}>
        {v.marque && <span>{v.marque} {v.modele}</span>}
        {v.kilometrage != null && <span><i className="ti ti-route" /> {v.kilometrage.toLocaleString()} km</span>}
        {v.capacite_personnes && <span><i className="ti ti-users" /> {v.capacite_personnes} pers</span>}
        {v.capacite_brancards > 0 && <span><i className="ti ti-bed" /> {v.capacite_brancards} bran.</span>}
        {v.numero_agrement && <span style={{ fontFamily: "Consolas, monospace", color: "#185FA5" }}>{v.numero_agrement}</span>}
      </div>
      {v.prochaine_revision && (
        <div style={{ marginTop: 8, padding: "4px 8px", background: "rgba(239,159,39,.10)", border: "1px solid rgba(239,159,39,.30)", borderRadius: 6, fontSize: 10.5, color: "#d48820" }}>
          <i className="ti ti-calendar" /> Prochaine révision : {new Date(v.prochaine_revision).toLocaleDateString("fr-FR")}
        </div>
      )}
    </div>
  );
}

function DepotCard({ d, vehs, router, onOpenArticles }) {
  const vehAttache = vehs.find(v => v.id === d.vehicule_id);
  const couleur = d.couleur || "#7CC8C8";
  return (
    <div style={{
      background: "#fff", border: `1px solid ${couleur}33`, borderLeft: `4px solid ${couleur}`,
      borderRadius: 12, padding: "14px 16px", transition: "all .15s",
    }}>
      <div onClick={() => router.push(`/depots/${d.id}`)} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, background: `${couleur}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className={`ti ${d.icone || "ti-building-warehouse"}`} style={{ color: couleur, fontSize: 20 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#142131" }}>{d.nom}</div>
            {d.code && <div style={{ fontSize: 10.5, color: "#5a6878", fontFamily: "Consolas, monospace" }}>{d.code}</div>}
          </div>
          {d.actif === false && (
            <span style={{ background: "#e35d5b22", color: "#e35d5b", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Inactif</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#5a6878", flexWrap: "wrap" }}>
          {d.type && <span><i className="ti ti-tag" /> {d.type}</span>}
          {d.adresse && <span><i className="ti ti-map-pin" /> {d.adresse}</span>}
          {d.responsable && <span><i className="ti ti-user" /> {d.responsable}</span>}
        </div>
        {vehAttache && (
          <div style={{ marginTop: 8, padding: "5px 10px", background: "rgba(227,93,91,.08)", border: "1px solid rgba(227,93,91,.20)", borderRadius: 6, fontSize: 11, color: "#142131" }}>
            <i className="ti ti-ambulance" style={{ color: "#e35d5b" }} /> Dépôt mobile sur véhicule : <b>{vehAttache.nom}</b>
          </div>
        )}
        {d.inventaire_dernier && (
          <div style={{ marginTop: 6, fontSize: 10.5, color: "#5a6878" }}>
            <i className="ti ti-clipboard-check" /> Dernier inventaire : {new Date(d.inventaire_dernier).toLocaleDateString("fr-FR")}
            {d.inventaire_ecarts_count > 0 && <span style={{ color: "#e35d5b", marginLeft: 4 }}>· {d.inventaire_ecarts_count} écarts</span>}
          </div>
        )}
      </div>
      {/* 0.58.87 : Bouton voir articles disponibles */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e3e9ee", display: "flex", gap: 6 }}>
        <button onClick={(e) => { e.stopPropagation(); onOpenArticles && onOpenArticles(); }} style={{
          flex: 1, background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)`,
          color: "#142131", border: "none",
          padding: "8px 12px", borderRadius: 8,
          fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 2px 6px ${couleur}33`,
        }}>
          <i className="ti ti-package" /> Voir les articles
        </button>
        <button onClick={(e) => { e.stopPropagation(); router.push(`/inventaire/${d.id}`); }} style={{
          background: "rgba(20,33,49,.04)", color: "#142131",
          border: "1px solid #cfd8e0",
          padding: "8px 12px", borderRadius: 8,
          fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }} title="Faire un inventaire">
          <i className="ti ti-clipboard-check" />
        </button>
      </div>
    </div>
  );
}

// =============================================================
// 0.62.12 : Composant MagasinsRattachesPanel
// Liste les magasins qui interviennent dans cet établissement
// + permet d'ajouter/retirer des rattachements
// =============================================================
function MagasinsRattachesPanel({ etabId, auth, supabase }) {
  const [rattachements, setRattachements] = useState([]);
  const [magasinsDispo, setMagasinsDispo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAdd, setModalAdd] = useState(false);
  const [form, setForm] = useState({ magasin_id: "", notes: "" });

  useEffect(() => {
    if (!etabId) return;
    reload();
  }, [etabId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    const [r, m] = await Promise.all([
      tryFetch(supabase.from("magasins_rattachements")
        .select("*, magasins(nom, ville, code), batiments(nom), services(nom), depots(nom)")
        .eq("etablissement_id", etabId)),
      tryFetch(supabase.from("magasins").select("id, nom, ville").order("nom")),
    ]);
    setRattachements(r);
    setMagasinsDispo(m);
    setLoading(false);
  }

  async function ajouter() {
    if (!form.magasin_id) { alert("Choisis un magasin"); return; }
    try {
      const r = await supabase.from("magasins_rattachements").insert({
        magasin_id: form.magasin_id,
        etablissement_id: etabId,
        actif: true,
        notes: form.notes || null,
        created_by: auth.user?.id,
      });
      if (r.error) throw r.error;
      // 0.62.12 : Notification au magasin
      try {
        const membres = await supabase.from("membres_structure").select("user_id").eq("magasin_fournisseur_id", form.magasin_id);
        const mag = magasinsDispo.find(m => m.id === form.magasin_id);
        const notifs = (membres.data || []).map(m => ({
          user_id: m.user_id,
          type: "rattachement_magasin",
          titre: `🔗 Nouveau rattachement étab → magasin`,
          message: `L'établissement vient de te rattacher. Tu peux maintenant intervenir chez eux.`,
          url: `/magasin/rattachements-perimetre`,
          lue: false,
        }));
        if (notifs.length > 0) await supabase.from("notifications").insert(notifs);
      } catch (e) { console.warn("[notif rattachement]", e); }
      setModalAdd(false); setForm({ magasin_id: "", notes: "" });
      await reload();
    } catch (e) { alert("❌ " + e.message); }
  }

  async function retirer(r) {
    if (!confirm(`Retirer le rattachement avec ${r.magasins?.nom || "ce magasin"} ?`)) return;
    await supabase.from("magasins_rattachements").delete().eq("id", r.id);
    reload();
  }

  // Magasins déjà rattachés (pour éviter doublons)
  const dejaRattaches = new Set(rattachements.map(r => r.magasin_id));
  const dispoFiltres = magasinsDispo.filter(m => !dejaRattaches.has(m.id));

  return (
    <Panel style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 16 }}>
          <i className="ti ti-link" style={{ color: "#5a8f8f" }} /> Magasins rattachés ({rattachements.length})
        </h2>
        <button onClick={() => setModalAdd(true)}
          style={{ background: "linear-gradient(135deg,#5a8f8f,#3a6f6f)", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5 }}>
          <i className="ti ti-plus" /> Rattacher un magasin
        </button>
      </div>

      <Panel style={{ background: "rgba(94,143,143,.06)", borderLeft: "4px solid #5a8f8f", padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#5a6878", lineHeight: 1.5 }}>
          💡 <b>À quoi ça sert :</b> liste les magasins (PSAD/FBM) qui interviennent dans cet établissement. À l'ajout, une notification est envoyée à tous les membres du magasin.
        </div>
      </Panel>

      {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
        : rattachements.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: "#8a98a8" }}>
          <i className="ti ti-link-off" style={{ fontSize: 40, color: "#e3e9ee", display: "block", marginBottom: 8 }} />
          Aucun magasin rattaché à cet établissement.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {rattachements.map(r => (
            <div key={r.id} style={{
              background: "#fff", border: "1px solid #e3e9ee",
              borderLeft: `4px solid ${r.actif ? "#5a8f8f" : "#cfd8e0"}`,
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ fontWeight: 700, color: "#142131", fontSize: 13 }}>
                <i className="ti ti-building-warehouse" style={{ color: "#5a8f8f", marginRight: 4 }} />
                {r.magasins?.nom || "Magasin"}
              </div>
              {r.magasins?.ville && <div style={{ fontSize: 11, color: "#8a98a8", marginTop: 2 }}>{r.magasins.ville}</div>}
              {r.batiments?.nom && <div style={{ fontSize: 11.5, color: "#7a6fb0", marginTop: 5 }}><i className="ti ti-building" /> {r.batiments.nom}</div>}
              {r.services?.nom && <div style={{ fontSize: 11.5, color: "#7CC8C8", marginTop: 3 }}><i className="ti ti-stethoscope" /> {r.services.nom}</div>}
              {r.depots?.nom && <div style={{ fontSize: 11.5, color: "#EF9F27", marginTop: 3 }}><i className="ti ti-building-warehouse" /> Dépôt : {r.depots.nom}</div>}
              {r.notes && <div style={{ fontSize: 10.5, color: "#8a98a8", marginTop: 6, fontStyle: "italic" }}>{r.notes}</div>}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f3f6", display: "flex", gap: 5 }}>
                <span style={{ flex: 1, fontSize: 10.5, color: r.actif ? "#5aa05a" : "#8a98a8", fontWeight: 700 }}>{r.actif ? "✓ Actif" : "⊘ Inactif"}</span>
                <button onClick={() => retirer(r)} style={{ background: "transparent", border: "1px solid #cfd8e0", color: "#e35d5b", padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'ajout */}
      {modalAdd && (
        <Modal open={modalAdd} onClose={() => setModalAdd(false)} kind="patient" title="Rattacher un magasin" actions={
          <>
            <Btn variant="ghost" onClick={() => setModalAdd(false)}>Annuler</Btn>
            <Btn variant="primary" onClick={ajouter}>Rattacher</Btn>
          </>
        }>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, color: "#5a6878" }}>
              <b>Magasin *</b>
              <select value={form.magasin_id} onChange={(e) => setForm({ ...form, magasin_id: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4 }}>
                <option value="">— Choisir un magasin —</option>
                {dispoFiltres.map(m => <option key={m.id} value={m.id}>{m.nom} {m.ville ? `· ${m.ville}` : ""}</option>)}
              </select>
              {dispoFiltres.length === 0 && <div style={{ fontSize: 11, color: "#e35d5b", marginTop: 4 }}>Tous les magasins sont déjà rattachés.</div>}
            </label>
            <label style={{ fontSize: 12, color: "#5a6878" }}>
              <b>Notes</b>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Périmètre, contact, conditions…" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cfd8e0", fontFamily: "inherit", fontSize: 13, marginTop: 4, minHeight: 60 }} />
            </label>
            <div style={{ padding: 10, background: "rgba(122,111,176,.10)", borderRadius: 6, fontSize: 11.5, color: "#5a6878" }}>
              ℹ Une notification sera envoyée aux membres du magasin pour les prévenir.
            </div>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

// 0.62.15 : helper bouton création rapide
function btnQuick(color) {
  return {
    background: `${color}15`,
    color,
    border: `1px solid ${color}40`,
    padding: "5px 12px",
    borderRadius: 6,
    fontFamily: "inherit",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
}

// 0.62.17 : composant RedirectTab — onglet simple qui redirige vers une page dédiée
function RedirectTab({ icon, color, title, desc, href, router }) {
  return (
    <Panel style={{ marginTop: 12 }}>
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <i className={`ti ${icon}`} style={{ fontSize: 56, color, display: "block", marginBottom: 12 }} />
        <h3 style={{ margin: "0 0 8px", color: "#142131" }}>{title}</h3>
        <p style={{ color: "#5a6878", fontSize: 13, marginBottom: 18, maxWidth: 480, margin: "0 auto 18px" }}>{desc}</p>
        <button onClick={() => router.push(href)} style={{
          background: `linear-gradient(135deg,${color},${color}cc)`,
          color: "#fff", border: "none",
          padding: "10px 22px", borderRadius: 10,
          fontFamily: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer",
          boxShadow: `0 4px 12px ${color}4D`,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-arrow-right" /> Ouvrir la page
        </button>
      </div>
    </Panel>
  );
}
