"use client";
// =============================================================
//  /magasin/tournees — Tournées de livraison (0.61.3)
//  Liste + filtre + bouton "Nouvelle tournée"
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
import { TourneesMap } from "../../components/TourneesMap";

const STATUTS = {
  planifiee: { lbl: "📅 Planifiée", col: "#EF9F27" },
  en_cours: { lbl: "🚛 En cours", col: "#185FA5" },
  terminee: { lbl: "✓ Terminée", col: "#5aa05a" },
  annulee: { lbl: "⊘ Annulée", col: "#e35d5b" },
};

export default function TourneesPage() {
  const router = useRouter();
  const supabase = createClient();
  const auth = useAuth();
  const cart = useCart();
  const magasinCtx = useMagasinContext();

  const [tournees, setTournees] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [chauffeurs, setChauffeurs] = useState([]);
  const [filterStatut, setFilterStatut] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || magasinCtx.loading) return;
    reload();
  }, [auth.ready, magasinCtx.loading, magasinCtx.magasinId]);

  async function reload() {
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };
    let q = supabase.from("tournees").select("*").order("date_tournee", { ascending: false });
    if (magasinCtx.isUserMagasin && magasinCtx.magasinId) q = q.eq("magasin_id", magasinCtx.magasinId);
    const [trn, veh, ch] = await Promise.all([
      tryFetch(q),
      tryFetch(supabase.from("vehicules_magasin").select("id, immatriculation, marque, modele")),
      tryFetch(supabase.from("membres_structure").select("user_id, prenom, nom")),
    ]);
    setTournees(trn);
    setVehicules(veh);
    setChauffeurs(ch);
    setLoading(false);
  }

  const filtered = tournees.filter(t => {
    if (filterStatut && t.statut !== filterStatut) return false;
    if (filterDate && t.date_tournee !== filterDate) return false;
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    aujourdhui: tournees.filter(t => t.date_tournee === today).length,
    planifiees: tournees.filter(t => t.statut === "planifiee").length,
    en_cours: tournees.filter(t => t.statut === "en_cours").length,
    terminees_semaine: tournees.filter(t => t.statut === "terminee" && t.date_tournee > new Date(Date.now() - 7*86400000).toISOString().slice(0,10)).length,
  };

  return (
    <div className="page-shell">
      <TopBar cartCount={cart.count} auth={auth} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <MagasinSidebar />
        <div className="page-content" style={{ flex: 1, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <PageHead icon="ti-route" title="Tournées de livraison" subtitle={`${tournees.length} tournée(s) · ${stats.aujourdhui} aujourd'hui`} />
            <Btn variant="primary" icon="ti-plus" onClick={() => router.push("/magasin/tournees/nouvelle")}>Nouvelle tournée</Btn>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))", gap: 10, marginTop: 12, justifyContent: "start" }}>
            <StatTile color="#185FA5" icon="ti-calendar" lbl="Aujourd'hui" val={stats.aujourdhui} />
            <StatTile color="#EF9F27" icon="ti-clock" lbl="Planifiées" val={stats.planifiees} />
            <StatTile color="#7CC8C8" icon="ti-truck" lbl="En cours" val={stats.en_cours} />
            <StatTile color="#5aa05a" icon="ti-check" lbl="Terminées (7j)" val={stats.terminees_semaine} />
          </div>

          {/* 0.62.8 : Carte tournées en cours + à faire */}
          <Panel style={{ marginTop: 12, padding: 12 }}>
            <h3 style={{ margin: "0 0 10px", color: "#185FA5" }}>🗺 Carte des livraisons</h3>
            <TourneesMap magasinId={magasinCtx.magasinId} height={420} />
          </Panel>

          {/* Filtres */}
          <Panel style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }} />
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #cfd8e0", borderRadius: 8, fontFamily: "inherit", fontSize: 13 }}>
                <option value="">Tous statuts</option>
                {Object.entries(STATUTS).map(([v, s]) => <option key={v} value={v}>{s.lbl}</option>)}
              </select>
              {(filterStatut || filterDate) && (
                <Btn variant="ghost" icon="ti-filter-off" onClick={() => { setFilterStatut(""); setFilterDate(""); }}>Réinitialiser</Btn>
              )}
            </div>
          </Panel>

          {/* Liste tournées */}
          <Panel style={{ marginTop: 12 }}>
            <h3 style={{ margin: "0 0 12px", color: "#185FA5" }}>📋 Liste des tournées ({filtered.length})</h3>
            {loading ? <div style={{ padding: 30, textAlign: "center" }}>Chargement...</div>
            : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a98a8" }}>
                <i className="ti ti-route-off" style={{ fontSize: 48, color: "#e3e9ee", display: "block", marginBottom: 10 }} />
                Aucune tournée.<br/>
                <span style={{ fontSize: 12 }}>Crée ta première tournée pour planifier les livraisons.</span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,360px))", gap: 12, justifyContent: "start" }}>
                {filtered.map(t => {
                  const st = STATUTS[t.statut] || STATUTS.planifiee;
                  const v = vehicules.find(x => x.id === t.vehicule_id);
                  const ch = chauffeurs.find(c => c.user_id === t.chauffeur_user_id);
                  const completionPct = t.nb_etapes > 0 ? Math.round((t.nb_completees / t.nb_etapes) * 100) : 0;
                  return (
                    <div key={t.id} onClick={() => router.push(`/magasin/tournees/${t.id}`)} style={{
                      background: "#fff", border: `1px solid ${st.col}33`, borderLeft: `4px solid ${st.col}`,
                      borderRadius: 10, padding: 14, cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#142131", fontSize: 14 }}>{t.nom || t.numero}</div>
                          <div style={{ fontFamily: "Consolas,monospace", fontSize: 10.5, color: "#8a98a8" }}>{t.numero}</div>
                        </div>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: `${st.col}15`, color: st.col, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" }}>{st.lbl}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 11.5, color: "#5a6878", marginTop: 6 }}>
                        <span>📅 {t.date_tournee ? new Date(t.date_tournee).toLocaleDateString("fr-FR") : "—"}</span>
                        {t.heure_depart && <span>🕐 {t.heure_depart.slice(0, 5)}</span>}
                      </div>
                      {v && <div style={{ fontSize: 11, color: "#5a6878", marginTop: 4 }}>🚛 {v.immatriculation} ({v.marque} {v.modele})</div>}
                      {ch && <div style={{ fontSize: 11, color: "#5a6878" }}>👤 {ch.prenom} {ch.nom}</div>}
                      {/* Barre progression */}
                      {t.nb_etapes > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#8a98a8", marginBottom: 2 }}>
                            <span>{t.nb_completees}/{t.nb_etapes} étapes</span>
                            <span>{completionPct}%</span>
                          </div>
                          <div style={{ height: 4, background: "#e3e9ee", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${completionPct}%`, height: "100%", background: st.col, transition: "width 300ms" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatTile({ color, icon, lbl, val }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}33`, borderLeft: `4px solid ${color}`, borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
      <i className={`ti ${icon}`} style={{ color, fontSize: 24 }} />
      <div>
        <div style={{ fontSize: 10, color, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>{lbl}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#142131", fontFamily: "Consolas,monospace" }}>{val}</div>
      </div>
    </div>
  );
}
