"use client";
// Page Etablissement — Plan + arbre 5 niveaux, KPIs, filtres croisés (lecture)
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { flatten, computeRows, kpisFromRows } from "./lib";
import { logger } from "../../lib/logger";

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

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      try {
        const [b, e, s, c, l, pa, ma, di] = await Promise.all([
          supabase.from("batiments").select("*").eq("etablissement_id", auth.etabId).order("nom"),
          supabase.from("etages").select("*").order("nom"),
          supabase.from("services").select("*").order("nom"),
          supabase.from("chambres").select("*").order("nom"),
          supabase.from("lits").select("*").order("nom"),
          supabase.from("patients").select("*").eq("etablissement_id", auth.etabId),
          supabase.from("materiels").select("*").eq("etablissement_id", auth.etabId),
          supabase.from("interventions").select("id,patient_id,type,urgence,statut,numero").eq("etablissement_id", auth.etabId),
        ]);
        // reconstruire l'arbre
        const lits = l.data || [];
        const chambres = (c.data || []).map((ch) => ({ ...ch, lits: lits.filter((x) => x.chambre_id === ch.id) }));
        const services = (s.data || []).map((sv) => ({ ...sv, chambres: chambres.filter((x) => x.service_id === sv.id) }));
        const etages = (e.data || []).map((et) => ({ ...et, services: services.filter((x) => x.etage_id === et.id) }));
        const bats = (b.data || []).map((ba) => ({ ...ba, etages: etages.filter((x) => x.batiment_id === ba.id) }));
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
          </>
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
