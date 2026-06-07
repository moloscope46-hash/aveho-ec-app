"use client";
// =============================================================
//  /magasin/analytics-tournees — Dashboard KPI tournées (0.62.0)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import { useMagasinContext } from "../../../lib/useMagasinContext";
import TopBar from "../../TopBar";
import { useCart } from "../../useCart";
import { PageHead, Panel, Btn } from "../../ui";
import { MagasinSidebar } from "../../components/MagasinSidebar";

export default function AnalyticsTourneesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [stats, setStats] = useState({ total: 0, en_cours: 0, terminees: 0, planifiees: 0 });
  const [parChauffeur, setParChauffeur] = useState([]);
  const [parJour, setParJour] = useState([]);
  const [periode, setPeriode] = useState("30j");
  // 0.62.3 : Filtres + listes de référence
  const [filterChauffeur, setFilterChauffeur] = useState("");
  const [filterVehicule, setFilterVehicule] = useState("");
  const [chauffeursListe, setChauffeursListe] = useState([]);
  const [vehiculesListe, setVehiculesListe] = useState([]);
  const [tourneesRaw, setTourneesRaw] = useState([]);  // pour export CSV
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId, periode, filterChauffeur, filterVehicule]);

  async function reload() {
    setLoading(true);
    const days = periode === "7j" ? 7 : periode === "30j" ? 30 : periode === "90j" ? 90 : 365;
    const dateMin = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    try {
      let q = supabase.from("tournees").select("*").gte("date_tournee", dateMin);
      if (magasinCtx.isUserMagasin && magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
      // 0.62.3 : Filtres
      if (filterChauffeur) q = q.eq("chauffeur_user_id", filterChauffeur);
      if (filterVehicule) q = q.eq("vehicule_id", filterVehicule);
      const r = await q;
      const trns = r.data || [];
      setTourneesRaw(trns);

      const newStats = {
        total: trns.length,
        en_cours: trns.filter(t => t.statut === "en_cours").length,
        terminees: trns.filter(t => t.statut === "terminee").length,
        planifiees: trns.filter(t => t.statut === "planifiee").length,
        distance_totale: trns.reduce((s, t) => s + (parseFloat(t.distance_reelle_km || t.distance_estimee_km) || 0), 0),
        duree_totale_min: trns.reduce((s, t) => s + (t.duree_reelle_min || t.duree_estimee_min || 0), 0),
        etapes_totales: trns.reduce((s, t) => s + (t.nb_completees || 0), 0),
      };
      newStats.distance_moy = newStats.total ? (newStats.distance_totale / newStats.total).toFixed(1) : 0;
      newStats.duree_moy = newStats.total ? Math.round(newStats.duree_totale_min / newStats.total) : 0;
      setStats(newStats);

      // Regroupement par chauffeur
      const map = {};
      const chauffeurIds = [...new Set(trns.map(t => t.chauffeur_user_id).filter(Boolean))];
      let chauffeursData = [];
      if (chauffeurIds.length > 0) {
        const r2 = await supabase.from("membres_structure").select("user_id, prenom, nom").in("user_id", chauffeurIds);
        chauffeursData = r2.data || [];
      }
      trns.forEach(t => {
        const cid = t.chauffeur_user_id || "_aucun";
        if (!map[cid]) {
          const c = chauffeursData.find(x => x.user_id === cid);
          map[cid] = { id: cid, nom: c ? `${c.prenom || ""} ${c.nom || ""}`.trim() || "—" : "Sans chauffeur",
            nb: 0, distance: 0, duree: 0, etapes: 0, terminees: 0 };
        }
        map[cid].nb++;
        map[cid].distance += parseFloat(t.distance_reelle_km || t.distance_estimee_km || 0);
        map[cid].duree += t.duree_reelle_min || t.duree_estimee_min || 0;
        map[cid].etapes += t.nb_completees || 0;
        if (t.statut === "terminee") map[cid].terminees++;
      });
      setParChauffeur(Object.values(map).sort((a, b) => b.nb - a.nb));

      // Regroupement par jour
      const jourMap = {};
      trns.forEach(t => {
        const j = t.date_tournee || t.created_at?.slice(0, 10);
        if (!j) return;
        if (!jourMap[j]) jourMap[j] = { date: j, nb: 0, distance: 0 };
        jourMap[j].nb++;
        jourMap[j].distance += parseFloat(t.distance_reelle_km || t.distance_estimee_km || 0);
      });
      setParJour(Object.values(jourMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-30));

      // 0.62.3 : Charger listes pour les select de filtre (uniquement la première fois)
      if (chauffeursListe.length === 0 && chauffeurIds.length > 0) {
        setChauffeursListe(chauffeursData);
      }
      if (vehiculesListe.length === 0) {
        let qv = supabase.from("vehicules_magasin").select("id, immatriculation, marque, modele").eq("actif", true).order("immatriculation");
        if (magasinCtx.isUserMagasin && magasinCtx.magasinId) qv = qv.eq("magasin_id", magasinCtx.magasinId);
        const rv = await qv;
        setVehiculesListe(rv.data || []);
      }
    } catch (e) { console.error("[analytics]", e); }
    finally { setLoading(false); }
  }

  // 0.62.3 : Export CSV des tournées filtrées
  function exporterCSV() {
    if (!tourneesRaw.length) { alert("Rien à exporter"); return; }
    const headers = ["Numéro", "Nom", "Date", "Statut", "Véhicule", "Chauffeur", "Distance estimée (km)", "Distance réelle (km)", "Durée estimée (min)", "Durée réelle (min)", "Étapes prévues", "Étapes complétées"];
    const rows = tourneesRaw.map(t => {
      const chau = chauffeursListe.find(c => c.user_id === t.chauffeur_user_id);
      const veh = t.vehicules_magasin;
      return [
        t.numero || "", t.nom || "", t.date_tournee || "", t.statut || "",
        veh ? `${veh.immatriculation || ""} ${veh.marque || ""} ${veh.modele || ""}`.trim() : "",
        chau ? `${chau.prenom || ""} ${chau.nom || ""}`.trim() : "",
        t.distance_estimee_km || 0, t.distance_reelle_km || 0,
        t.duree_estimee_min || 0, t.duree_reelle_min || 0,
        t.nb_etapes || 0, t.nb_completees || 0,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-tournees-${periode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-chart-line" title="Analytics tournées" subtitle="KPI distance, durée, performances chauffeurs" />
            <div style={{ display: "flex", gap: 6 }}>
              {["7j", "30j", "90j", "365j"].map(p => (
                <button key={p} onClick={() => setPeriode(p)} style={{
                  padding: "6px 14px", border: "1px solid #cfd8e0",
                  background: periode === p ? "#185FA5" : "#fff",
                  color: periode === p ? "#fff" : "#5a6878",
                  borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* 0.62.3 : Filtres chauffeur + véhicule + export CSV */}
          <Panel style={{ marginTop: 10, padding: "10px 14px" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#5a6878", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Filtres :</span>
              <select value={filterChauffeur} onChange={(e) => setFilterChauffeur(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12 }}>
                <option value="">Tous chauffeurs</option>
                {chauffeursListe.map(c => <option key={c.user_id} value={c.user_id}>{c.prenom} {c.nom}</option>)}
              </select>
              <select value={filterVehicule} onChange={(e) => setFilterVehicule(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #cfd8e0", borderRadius: 6, fontFamily: "inherit", fontSize: 12 }}>
                <option value="">Tous véhicules</option>
                {vehiculesListe.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque} {v.modele}</option>)}
              </select>
              {(filterChauffeur || filterVehicule) && (
                <button onClick={() => { setFilterChauffeur(""); setFilterVehicule(""); }} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #cfd8e0", borderRadius: 6, color: "#e35d5b", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                  ✕ Réinitialiser
                </button>
              )}
              <span style={{ flex: 1 }} />
              <Btn variant="ghost" icon="ti-file-export" onClick={exporterCSV}>📊 Export CSV</Btn>
            </div>
          </Panel>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,220px))", gap: 12, marginTop: 16, justifyContent: "start" }}>
            {[
              { ic: "🗓", lbl: "Tournées totales", val: stats.total, col: "#185FA5" },
              { ic: "🚛", lbl: "En cours", val: stats.en_cours, col: "#EF9F27" },
              { ic: "✅", lbl: "Terminées", val: stats.terminees, col: "#5aa05a" },
              { ic: "📍", lbl: "Distance totale", val: `${(stats.distance_totale || 0).toFixed(0)} km`, col: "#5a8f8f" },
              { ic: "📏", lbl: "Distance moy.", val: `${stats.distance_moy} km`, col: "#7CC8C8" },
              { ic: "⏱", lbl: "Durée moy.", val: `${Math.floor((stats.duree_moy || 0) / 60)}h${(stats.duree_moy || 0) % 60}`, col: "#7a6fb0" },
              { ic: "📦", lbl: "Étapes livrées", val: stats.etapes_totales, col: "#e35d5b" },
            ].map((k, i) => (
              <div key={i} style={{
                background: "#fff", border: `1px solid ${k.col}33`, borderLeft: `4px solid ${k.col}`,
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ fontSize: 22 }}>{k.ic}</div>
                <div style={{ fontSize: 11, color: "#8a98a8", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{k.lbl}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.col, marginTop: 4 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Par chauffeur */}
          <Panel style={{ marginTop: 16 }}>
            <h3 style={{ margin: "0 0 14px", color: "#185FA5" }}>👤 Performance par chauffeur</h3>
            {parChauffeur.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#8a98a8" }}>Aucune donnée</div>
            : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e3e9ee" }}>
                    <th style={th}>Chauffeur</th>
                    <th style={th2}>Tournées</th>
                    <th style={th2}>Terminées</th>
                    <th style={th2}>Distance</th>
                    <th style={th2}>Durée</th>
                    <th style={th2}>Étapes</th>
                    <th style={th2}>Distance moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {parChauffeur.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f0f4f7" }}>
                      <td style={td}><b>{c.nom}</b></td>
                      <td style={td2}>{c.nb}</td>
                      <td style={{ ...td2, color: "#5aa05a", fontWeight: 700 }}>{c.terminees}</td>
                      <td style={{ ...td2, fontFamily: "Consolas,monospace" }}>{c.distance.toFixed(0)} km</td>
                      <td style={{ ...td2, fontFamily: "Consolas,monospace" }}>{Math.floor(c.duree / 60)}h{c.duree % 60}</td>
                      <td style={td2}>{c.etapes}</td>
                      <td style={{ ...td2, fontFamily: "Consolas,monospace", color: "#185FA5" }}>{c.nb ? (c.distance / c.nb).toFixed(1) : 0} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {/* Histogramme par jour */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 14px", color: "#5a8f8f" }}>📅 Activité par jour ({parJour.length} jours)</h3>
            {parJour.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#8a98a8" }}>Aucune donnée</div>
            : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200, padding: "10px 0", overflowX: "auto" }}>
                {(() => {
                  const max = Math.max(...parJour.map(j => j.nb), 1);
                  return parJour.map(j => (
                    <div key={j.date} title={`${j.date} : ${j.nb} tournées · ${j.distance.toFixed(0)} km`} style={{
                      flex: 1, minWidth: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    }}>
                      <div style={{ fontSize: 10, color: "#5a6878", fontWeight: 700 }}>{j.nb}</div>
                      <div style={{
                        width: "100%", height: `${(j.nb / max) * 100}%`,
                        background: "linear-gradient(180deg, #5a8f8f, #7CC8C8)",
                        borderRadius: "4px 4px 0 0", minHeight: 4,
                      }} />
                      <div style={{ fontSize: 8, color: "#8a98a8", whiteSpace: "nowrap" }}>{j.date.slice(5)}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </Panel>

        </div>
      </div>
    </div>
  );
}

const th = { textAlign: "left", padding: 8, fontSize: 11, color: "#5a6878", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 };
const th2 = { ...th, textAlign: "center" };
const td = { padding: 8 };
const td2 = { ...td, textAlign: "center" };
