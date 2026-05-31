"use client";
// Page Statistiques — Tableaux de bord visuels (Alpha 0.7).
// Affiche : interventions par mois, transferts par établissement,
// stock par dépôt, top matériels en DI, évolution des commandes.
// Graphes en SVG natif (pas de lib externe -> bundle léger).
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { useLibelles } from "../../lib/useLibelles";
import TopBar from "../TopBar";
import { useCart } from "../useCart";
import { PageHead, Panel, StateMsg } from "../ui";
import { openPdfPreview } from "../../lib/pdfPreview";
// Alpha 0.19.0 : exportBilan importé dynamiquement à l'appel (économise ~5KB initial)

// Helper : générer les N derniers mois au format "YYYY-MM"
function lastMonths(n) {
  const out = []; const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}
const MOIS_FR = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function labelMois(ym) { const [y, m] = ym.split("-"); return `${MOIS_FR[parseInt(m, 10) - 1]} ${y.slice(2)}`; }

// Graphe en barres verticales (SVG natif)
function BarChart({ data, color = "#7CC8C8", height = 180 }) {
  if (!data.length) return <div style={{ color: "#8a98a8", padding: 20 }}>Aucune donnée.</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 30);
        const x = i * barW + barW * 0.15;
        const w = barW * 0.7;
        const y = height - 22 - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill={color} rx="1" />
            <text x={i * barW + barW / 2} y={height - 8} textAnchor="middle" fontSize="3" fill="#6c7a89">{d.label}</text>
            {d.value > 0 && <text x={i * barW + barW / 2} y={y - 2} textAnchor="middle" fontSize="3.5" fill="#142131" fontWeight="600">{d.value}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// Graphe en donut (camembert simple)
function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ color: "#8a98a8", padding: 20 }}>Aucune donnée.</div>;
  let acc = 0;
  const R = 40, cx = 50, cy = 50, stroke = 14;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#eef1f4" strokeWidth={stroke} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = 2 * Math.PI * R * frac;
          const off = -2 * Math.PI * R * acc;
          acc += frac;
          return <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={d.color}
            strokeWidth={stroke} strokeDasharray={`${len} ${2 * Math.PI * R}`} strokeDashoffset={off}
            transform={`rotate(-90 ${cx} ${cy})`} />;
        })}
        <text x={cx} y={cy + 1} textAnchor="middle" fontSize="11" fontWeight="700" fill="#142131">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="3.5" fill="#6c7a89">total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: d.color, display: "inline-block" }} />
            <span style={{ flex: 1, color: "#142131" }}>{d.label}</span>
            <b style={{ color: "#142131" }}>{d.value}</b>
            <span style={{ color: "#8a98a8", fontSize: 11 }}>({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Statistiques() {
  const supabase = createClient();
  const auth = useAuth();
  const { lbl } = useLibelles(auth.structureId);
  const cart = useCart();
  const [loading, setLoading] = useState(true);

  // Datasets agrégés
  const [interMois, setInterMois] = useState([]);    // [{label,value}]
  const [trfMois, setTrfMois] = useState([]);
  const [statutsDI, setStatutsDI] = useState([]);    // donut
  const [topMateriel, setTopMateriel] = useState([]);
  const [stockDepot, setStockDepot] = useState([]);
  // Alpha 0.9 : comparaison inter-établissements (uniquement si plusieurs étab)
  const [compEtab, setCompEtab] = useState({ interventions: [], transferts: [] });
  // Alpha 0.12 : statistiques maintenance
  const [maintParMois, setMaintParMois] = useState([]);
  const [maintParStatut, setMaintParStatut] = useState([]);
  const [maintParType, setMaintParType] = useState([]);
  // Alpha 0.13 : statistiques signalements
  const [sgParType, setSgParType] = useState([]);
  const [sgParStatut, setSgParStatut] = useState([]);
  const [sgTauxReponse, setSgTauxReponse] = useState({ avec: 0, sans: 0, pct: 0 });

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      // Chargement parallèle de toutes les données nécessaires
      const sixMois = new Date(Date.now() - 6 * 30 * 86400000).toISOString();
      const sixMoisDate = new Date(Date.now() - 6 * 30 * 86400000).toISOString().slice(0, 10);
      const [{ data: interventions }, { data: transferts }, { data: stockA }, { data: maintenances }, { data: signalements }] = await Promise.all([
        supabase.from("interventions").select("created_at, statut, urgence, materiel_id, materiels(libelle)").gte("created_at", sixMois),
        supabase.from("transferts").select("created_at, etablissement_id, etablissements(nom)").gte("created_at", sixMois),
        supabase.from("stock_articles").select("quantite, depots(nom)"),
        supabase.from("maintenances").select("date_prevue, date_realisee, statut, type").gte("date_prevue", sixMoisDate),
        supabase.from("signalements").select("type, statut, reponse, created_at").gte("created_at", sixMois),
      ]);

      // 1) Interventions par mois (6 derniers)
      const mois = lastMonths(6);
      const interParMois = mois.map((ym) => ({
        label: labelMois(ym),
        value: (interventions || []).filter((i) => (i.created_at || "").startsWith(ym)).length,
      }));
      setInterMois(interParMois);

      // 2) Transferts par mois
      const trfParMois = mois.map((ym) => ({
        label: labelMois(ym),
        value: (transferts || []).filter((t) => (t.created_at || "").startsWith(ym)).length,
      }));
      setTrfMois(trfParMois);

      // 3) Statuts DI (donut)
      const statuts = ["Nouvelle", "En cours", "Résolue", "Annulée"];
      const couleurs = ["#e35d5b", "#EF9F27", "#5aa05a", "#8a98a8"];
      const ditatuts = statuts.map((s, i) => ({
        label: s,
        value: (interventions || []).filter((it) => it.statut === s).length,
        color: couleurs[i],
      })).filter((d) => d.value > 0);
      setStatutsDI(ditatuts);

      // 4) Top 5 matériels en DI
      const compte = {};
      (interventions || []).forEach((i) => {
        if (!i.materiels?.libelle) return;
        compte[i.materiels.libelle] = (compte[i.materiels.libelle] || 0) + 1;
      });
      const top = Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
      setTopMateriel(top);

      // 5) Stock par dépôt (top 6)
      const stockParDep = {};
      (stockA || []).forEach((s) => {
        const n = s.depots?.nom || "—";
        stockParDep[n] = (stockParDep[n] || 0) + Number(s.quantite || 0);
      });
      setStockDepot(Object.entries(stockParDep).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })));

      // Alpha 0.12 : statistiques maintenance
      const mntList = maintenances || [];
      // 1) Maintenances par mois (date_prevue)
      const mntParMois = mois.map((ym) => ({
        label: labelMois(ym),
        value: mntList.filter((m) => (m.date_prevue || "").startsWith(ym)).length,
      }));
      setMaintParMois(mntParMois);
      // 2) Répartition par statut (avec calcul "En retard" effectif)
      const auj = new Date().toISOString().slice(0, 10);
      const statutEff = (m) => {
        if (m.statut === "Faite" || m.statut === "Annulée") return m.statut;
        if (m.date_prevue < auj) return "En retard";
        return m.statut;
      };
      const statutsM = ["Planifiée", "À faire", "Faite", "En retard", "Annulée"];
      const couleursM = ["#185FA5", "#EF9F27", "#5aa05a", "#e35d5b", "#8a98a8"];
      const distribStatut = statutsM.map((s, i) => ({
        label: s,
        value: mntList.filter((m) => statutEff(m) === s).length,
        color: couleursM[i],
      })).filter((d) => d.value > 0);
      setMaintParStatut(distribStatut);
      // 3) Maintenances par type (top 5)
      const compteType = {};
      mntList.forEach((m) => { compteType[m.type] = (compteType[m.type] || 0) + 1; });
      setMaintParType(Object.entries(compteType).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })));

      // Alpha 0.13 : statistiques signalements
      const sgList = signalements || [];
      const typesSg = [
        { value: "Problème", color: "#e35d5b" },
        { value: "Idée", color: "#7CC8C8" },
        { value: "Question", color: "#7a6fb0" },
        { value: "Autre", color: "#8a98a8" },
      ];
      const statutsSg = [
        { value: "Nouveau", color: "#185FA5" },
        { value: "En cours", color: "#EF9F27" },
        { value: "Traité", color: "#5aa05a" },
        { value: "Archivé", color: "#8a98a8" },
      ];
      setSgParType(typesSg.map((t) => ({
        label: t.value,
        value: sgList.filter((s) => s.type === t.value).length,
        color: t.color,
      })).filter((d) => d.value > 0));
      setSgParStatut(statutsSg.map((s) => ({
        label: s.value,
        value: sgList.filter((sg) => sg.statut === s.value).length,
        color: s.color,
      })).filter((d) => d.value > 0));
      const avecRep = sgList.filter((s) => s.reponse && s.reponse.trim()).length;
      const sansRep = sgList.length - avecRep;
      setSgTauxReponse({
        avec: avecRep,
        sans: sansRep,
        pct: sgList.length > 0 ? Math.round((avecRep / sgList.length) * 100) : 0,
      });

      // Alpha 0.9 : comparaison inter-établissements (si la collectivité en a au moins 2)
      if ((auth.etablissements || []).length >= 2) {
        const sixMois = new Date(Date.now() - 6 * 30 * 86400000).toISOString();
        const [{ data: interAll }, { data: trfAll }] = await Promise.all([
          supabase.from("interventions").select("etablissement_id, etablissements(nom)").gte("created_at", sixMois),
          supabase.from("transferts").select("etablissement_id, etablissements(nom)").gte("created_at", sixMois),
        ]);
        const countByEtab = (arr) => {
          const m = {};
          (arr || []).forEach((x) => {
            const n = x.etablissements?.nom || "—";
            m[n] = (m[n] || 0) + 1;
          });
          return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
        };
        setCompEtab({
          interventions: countByEtab(interAll),
          transferts: countByEtab(trfAll),
        });
      }

      setLoading(false);
    })();
  }, [auth.ready, auth.structureId, auth.etablissements]);

  if (!auth.ready) return null;

  return (
    <div className="bg-dark">
      <TopBar cartCount={cart.count} auth={auth} />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <PageHead eyebrow="ANALYSE" icon="ti-chart-bar" title="Statistiques" accent={auth.structureNom} sub="Tableaux de bord visuels — 6 derniers mois" />
          {!loading && (
            <button className="btn-ghost" onClick={() => {
              // Alpha 0.8 : sérialiser les SVG actuels dans un HTML d'impression
              const panels = document.querySelectorAll(".wrap .panel");
              const sections = Array.from(panels).map((p) => {
                const titleEl = p.querySelector("h3");
                const titleText = titleEl ? titleEl.textContent : "";
                // On clone le contenu pour ne pas perturber le DOM
                const body = p.innerHTML.replace(/onclick="[^"]*"/g, "");
                return `<div class="stat-block"><h2>${titleText}</h2><div class="stat-content">${body.replace(titleEl ? titleEl.outerHTML : "", "")}</div></div>`;
              }).join("");
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Statistiques Aveho</title>
                <style>
                  @page { margin: 12mm; size: A4; }
                  body{font-family:'Segoe UI',Helvetica,sans-serif;color:#142131;margin:0;padding:0}
                  .head{border-bottom:3px solid #7CC8C8;padding-bottom:10px;margin-bottom:18px}
                  .eyebrow{color:#7CC8C8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
                  h1{margin:6px 0 2px;font-size:20px;font-weight:700}
                  .sub{color:#6c7a89;font-size:12px}
                  .stat-block{break-inside:avoid;margin-bottom:18px;padding:14px;border:1px solid #e3e9ee;border-radius:10px}
                  .stat-block h2{margin:0 0 10px;font-size:14px;color:#142131}
                  .stat-content svg{max-width:100%;height:auto}
                  .foot{margin-top:20px;color:#9aa7b4;font-size:10px;text-align:center;border-top:1px solid #e3e9ee;padding-top:10px}
                </style></head><body>
                <div class="head">
                  <div class="eyebrow">AVEHO — ESPACE COLLECTIVITÉ</div>
                  <h1>Statistiques — ${auth.structureNom || ""}</h1>
                  <div class="sub">Tableaux de bord visuels — 6 derniers mois — Édition du ${new Date().toLocaleString("fr-FR")}</div>
                </div>
                ${sections}
                <div class="foot">Document généré le ${new Date().toLocaleString("fr-FR")} depuis Aveho EC</div>
              </body></html>`;
              // Alpha 0.14 : aperçu avant impression
              openPdfPreview({ titre: "Statistiques — 6 derniers mois", html, filename: "statistiques" });
            }}>
              <i className="ti ti-file-type-pdf" /> Export PDF
            </button>
          )}
          {auth.ready && (
            <button className="btn-ghost" onClick={async () => {
              // Alpha 0.15 : export Excel multi-feuille bilan complet
              setLoading(true);
              try {
                let qPat = supabase.from("patients").select("*");
                let qMat = supabase.from("materiels").select("*, articles(libelle, reference), depots(nom), patients(nom, prenom)");
                let qDi = supabase.from("interventions").select("*, materiels(libelle), patients(nom, prenom)");
                let qMnt = supabase.from("maintenances").select("*, materiels(libelle)");
                let qStock = supabase.from("stock_articles").select("*, articles(libelle, reference), depots(nom)");
                let qAch = supabase.from("achats").select("*");
                if (auth.etabId) {
                  qPat = qPat.eq("etablissement_id", auth.etabId);
                  qMat = qMat.eq("etablissement_id", auth.etabId);
                  qDi = qDi.eq("etablissement_id", auth.etabId);
                  qMnt = qMnt.eq("etablissement_id", auth.etabId);
                  qAch = qAch.eq("etablissement_id", auth.etabId);
                }
                const [pat, mat, di, mnt, stock, ach] = await Promise.all([qPat, qMat, qDi, qMnt, qStock, qAch]);
                // Alpha 0.19.0 : lazy load du module exportExcel
                const { exportBilan } = await import("../../lib/exportExcel");
                await exportBilan({
                  patients: pat.data || [],
                  materiels: mat.data || [],
                  interventions: di.data || [],
                  maintenances: mnt.data || [],
                  stock: stock.data || [],
                  achats: ach.data || [],
                }, {
                  collectiviteNom: auth.structureNom,
                  etabNom: auth.etabNom,
                });
              } catch (e) { alert("Export Excel : " + e.message); }
              finally { setLoading(false); }
            }}>
              <i className="ti ti-file-spreadsheet" /> Export Excel
            </button>
          )}
        </div>

        {loading ? <Panel><StateMsg>Calcul des statistiques…</StateMsg></Panel> : (
          <>
            <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-tools" style={{ color: "#e35d5b" }} /> Interventions par mois
                </h3>
                <BarChart data={interMois} color="#e35d5b" />
              </Panel>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-truck-delivery" style={{ color: "#185FA5" }} /> Transferts par mois
                </h3>
                <BarChart data={trfMois} color="#185FA5" />
              </Panel>
            </div>

            <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-chart-donut" style={{ color: "#7a6fb0" }} /> Répartition des statuts DI
                </h3>
                {statutsDI.length === 0 ? <StateMsg>Aucune DI sur la période.</StateMsg> : <DonutChart data={statutsDI} />}
              </Panel>
              <Panel>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                  <i className="ti ti-trophy" style={{ color: "#EF9F27" }} /> Top {lbl("materiel", "Matériel").toLowerCase()} en DI
                </h3>
                {topMateriel.length === 0 ? <StateMsg>Aucun matériel concerné.</StateMsg> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topMateriel.map((m, i) => {
                      const max = topMateriel[0].value;
                      const pct = (m.value / max) * 100;
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                            <span>{m.label}</span><b>{m.value}</b>
                          </div>
                          <div style={{ background: "#eef1f4", height: 8, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ background: "#EF9F27", height: "100%", width: `${pct}%`, transition: "width .3s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>

            <Panel style={{ marginTop: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                <i className="ti ti-boxes" style={{ color: "#5aa05a" }} /> Stock par dépôt (top 6)
              </h3>
              {stockDepot.length === 0 ? <StateMsg>Aucun stock enregistré.</StateMsg> : <BarChart data={stockDepot} color="#5aa05a" height={140} />}
            </Panel>

            {/* Alpha 0.9 : comparaison inter-établissements */}
            {/* Alpha 0.12 : statistiques maintenance */}
            {(maintParMois.some((m) => m.value > 0) || maintParStatut.length > 0) && (
              <div style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: 16, color: "#142131", margin: "20px 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-tool" style={{ color: "#5a8f8f" }} />
                  Maintenance préventive
                  <span style={{ fontSize: 12, color: "#8a98a8", fontWeight: 400 }}>· 6 derniers mois</span>
                </h2>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-calendar" style={{ color: "#5a8f8f" }} /> Maintenances par mois
                    </h3>
                    {maintParMois.length === 0 ? <StateMsg>Aucune donnée.</StateMsg> : <BarChart data={maintParMois} color="#5a8f8f" />}
                  </Panel>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-chart-donut" style={{ color: "#7a6fb0" }} /> Répartition par statut
                    </h3>
                    {maintParStatut.length === 0 ? <StateMsg>Aucune donnée.</StateMsg> : <DonutChart data={maintParStatut} />}
                  </Panel>
                </div>
                {maintParType.length > 0 && (
                  <Panel style={{ marginTop: 16 }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-trophy" style={{ color: "#EF9F27" }} /> Top 5 types de maintenance
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {maintParType.map((m, i) => {
                        const max = maintParType[0].value;
                        const pct = (m.value / max) * 100;
                        return (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                              <span>{m.label}</span><b>{m.value}</b>
                            </div>
                            <div style={{ background: "#eef1f4", height: 8, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ background: "#5a8f8f", height: "100%", width: `${pct}%`, transition: "width .3s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}
              </div>
            )}

            {/* Alpha 0.13 : statistiques signalements */}
            {(sgParType.length > 0 || sgParStatut.length > 0) && (
              <div style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: 16, color: "#142131", margin: "20px 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-message" style={{ color: "#7CC8C8" }} />
                  Signalements anonymes
                  <span style={{ fontSize: 12, color: "#8a98a8", fontWeight: 400 }}>· 6 derniers mois</span>
                </h2>
                <div className="grid-3-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-chart-pie" style={{ color: "#7a6fb0" }} /> Par type
                    </h3>
                    {sgParType.length === 0 ? <StateMsg>Aucune donnée.</StateMsg> : <DonutChart data={sgParType} />}
                  </Panel>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-chart-pie" style={{ color: "#185FA5" }} /> Par statut
                    </h3>
                    {sgParStatut.length === 0 ? <StateMsg>Aucune donnée.</StateMsg> : <DonutChart data={sgParStatut} />}
                  </Panel>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-message-check" style={{ color: "#5aa05a" }} /> Taux de réponse
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 0" }}>
                      <div style={{ fontSize: 48, fontWeight: 700, color: sgTauxReponse.pct >= 60 ? "#5aa05a" : sgTauxReponse.pct >= 30 ? "#EF9F27" : "#e35d5b" }}>{sgTauxReponse.pct}%</div>
                      <div style={{ fontSize: 12, color: "#6c7a89", marginTop: 4 }}>
                        {sgTauxReponse.avec} avec réponse · {sgTauxReponse.sans} sans
                      </div>
                      <div style={{ width: "100%", marginTop: 14, background: "#eef1f4", height: 8, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ background: sgTauxReponse.pct >= 60 ? "#5aa05a" : sgTauxReponse.pct >= 30 ? "#EF9F27" : "#e35d5b", height: "100%", width: `${sgTauxReponse.pct}%`, transition: "width .3s" }} />
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* Alpha 0.9 : comparaison inter-établissements */}
            {(compEtab.interventions.length > 1 || compEtab.transferts.length > 1) && (
              <div style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: 16, color: "#142131", margin: "20px 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-arrows-left-right" style={{ color: "#185FA5" }} />
                  Comparaison inter-établissements
                  <span style={{ fontSize: 12, color: "#8a98a8", fontWeight: 400 }}>· 6 derniers mois</span>
                </h2>
                <div className="grid-2-mobile-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-tools" style={{ color: "#e35d5b" }} /> Interventions par établissement
                    </h3>
                    {compEtab.interventions.length === 0 ? <StateMsg>Aucune donnée.</StateMsg> : <BarChart data={compEtab.interventions} color="#e35d5b" height={160} />}
                  </Panel>
                  <Panel>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#142131" }}>
                      <i className="ti ti-truck-delivery" style={{ color: "#185FA5" }} /> Transferts par établissement
                    </h3>
                    {compEtab.transferts.length === 0 ? <StateMsg>Aucune donnée.</StateMsg> : <BarChart data={compEtab.transferts} color="#185FA5" height={160} />}
                  </Panel>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
