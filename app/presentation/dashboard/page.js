"use client";
// =============================================================
//  /presentation/dashboard (0.64.0)
//  Mode TV : KPIs + barres top par catégorie (BI synthèse)
// =============================================================
import { useEffect, useState, useRef, Suspense } from "react";
import RefreshButton from "../../components/RefreshButton";
import CastButton from "../../components/CastButton";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TVScreenNav from "../../components/TVScreenNav";
import TVMagasinFilter, { getTVMagasinId } from "../../components/TVMagasinFilter";
import ModeTVToolbar from "../../components/ModeTVToolbar";  /* 0.65.0 */

export default function PresentationDashboardPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#bfe6e6", fontSize: 18 }}>Chargement…</div>}>
      <PresentationDashboard />
    </Suspense>
  );
}

function PresentationDashboard() {
  const supabase = createClient();
  const auth = useAuth();
  const params = useSearchParams();
  const refreshSec = parseInt(params.get("refresh") || "60", 10);

  const [data, setData] = useState({ kpis: {}, topMat: [], topTech: [], topPat: [] });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [magasinId, setMagasinId] = useState(() => getTVMagasinId(params));  /* 0.65.0 */
  const timerRef = useRef(null);
  const clockRef = useRef(null);

  async function load() {
    if (!auth.structureId) return;
    setLoading(true);
    const tryFetch = async (q) => { try { const r = await q; return r.data || []; } catch { return []; } };

    const now30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [di30j, sav30j, livr30j, mat, techs, di_today, di_resolved] = await Promise.all([
      tryFetch(supabase.from("interventions").select("id, materiel_id, technicien_nom, created_at, statut, patients(nom, prenom)").eq("structure_id", auth.structureId).gte("created_at", now30)),
      tryFetch(supabase.from("signalements").select("id").eq("structure_id", auth.structureId).gte("created_at", now30)),
      tryFetch(supabase.from("tournees").select("id, nb_etapes").eq("structure_id", auth.structureId).gte("date_tournee", now30.slice(0, 10))),
      tryFetch(supabase.from("materiels").select("id, libelle, code").eq("structure_id", auth.structureId)),
      tryFetch(supabase.from("interventions").select("technicien_nom").eq("structure_id", auth.structureId).gte("created_at", now30).not("technicien_nom", "is", null)),
      tryFetch(supabase.from("interventions").select("id").eq("structure_id", auth.structureId).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString())),
      tryFetch(supabase.from("interventions").select("id").eq("structure_id", auth.structureId).eq("statut", "Validée").gte("created_at", now30)),
    ]);

    // Top matériels SAV
    const matCount = {};
    di30j.forEach(d => { if (d.materiel_id) matCount[d.materiel_id] = (matCount[d.materiel_id] || 0) + 1; });
    const matMap = Object.fromEntries(mat.map(m => [m.id, m]));
    const topMat = Object.entries(matCount).map(([id, c]) => ({ id, c, libelle: matMap[id]?.libelle || "?", code: matMap[id]?.code })).sort((a,b) => b.c - a.c).slice(0, 6);

    // Top techniciens
    const techCount = {};
    techs.forEach(t => { techCount[t.technicien_nom] = (techCount[t.technicien_nom] || 0) + 1; });
    const topTech = Object.entries(techCount).map(([nom, c]) => ({ nom, c })).sort((a,b) => b.c - a.c).slice(0, 5);

    // Top patients (par nombre DI)
    const patCount = {};
    di30j.forEach(d => {
      if (d.patients) {
        const k = `${d.patients.nom || ""} ${d.patients.prenom || ""}`.trim();
        if (k) patCount[k] = (patCount[k] || 0) + 1;
      }
    });
    const topPat = Object.entries(patCount).map(([k, c]) => ({ nom: k, c })).sort((a,b) => b.c - a.c).slice(0, 5);

    // KPIs
    const totalEtapes = livr30j.reduce((s, t) => s + (t.nb_etapes || 0), 0);
    const tauxResol = di30j.length > 0 ? Math.round((di_resolved.length / di30j.length) * 100) : 0;

    setData({
      kpis: {
        di30j: di30j.length,
        sav30j: sav30j.length,
        livr30j: livr30j.length,
        etapes: totalEtapes,
        diToday: di_today.length,
        tauxResol,
      },
      topMat,
      topTech,
      topPat,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (!auth.ready) return;
    load();
    timerRef.current = setInterval(load, refreshSec * 1000);
    return () => clearInterval(timerRef.current);
  }, [auth.ready, auth.structureId, refreshSec]);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  function tryFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  }

  if (auth.ready && !auth.structureId) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#142131", color: "#fff", fontSize: 24 }}>Authentification requise</div>;
  }

  const KPIS = [
    { lbl: "DI ce mois", v: data.kpis.di30j || 0, col: "#EF9F27", ic: "ti-clipboard-list" },
    { lbl: "SAV ce mois", v: data.kpis.sav30j || 0, col: "#e35d5b", ic: "ti-alert-triangle" },
    { lbl: "Tournées 30j", v: data.kpis.livr30j || 0, col: "#C9867F", ic: "ti-truck-delivery" },
    { lbl: "Étapes livrées", v: data.kpis.etapes || 0, col: "#7a6fb0", ic: "ti-package" },
    { lbl: "DI aujourd'hui", v: data.kpis.diToday || 0, col: "#7CC8C8", ic: "ti-flash" },
    { lbl: "Taux résolution", v: `${data.kpis.tauxResol || 0}%`, col: "#5aa05a", ic: "ti-check" },
  ];

  const maxMat = Math.max(...data.topMat.map(m => m.c), 1);
  const maxTech = Math.max(...data.topTech.map(t => t.c), 1);
  const maxPat = Math.max(...data.topPat.map(p => p.c), 1);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #142131 0%, #1c5454 100%)",
      color: "#fff",
      fontFamily: "Segoe UI, Quicksand, Helvetica, Arial, sans-serif",
      padding: "24px 110px",
      overflow: "auto",
    }}>
      <ModeTVToolbar onRefresh={() => (typeof load === "function" ? load() : location.reload())} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: "#7CC8C8", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>AVEHO — TV DE SERVICE<TVMagasinFilter onChange={setMagasinId} /></div>
          <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>Tableau de bord (30 jours)</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#7CC8C8", fontFamily: "Consolas, monospace", letterSpacing: 2 }}>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ fontSize: 14, color: "#bfe6e6", marginTop: 2 }}>{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, fontSize: 20, color: "#bfe6e6" }}>Chargement…</div>
      ) : (
        <>
          {/* KPIs gros chiffres */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 24 }}>
            {KPIS.map(k => (
              <div key={k.lbl} style={{
                background: `linear-gradient(135deg, ${k.col}33, ${k.col}11)`,
                border: `1px solid ${k.col}55`,
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 14,
                boxShadow: `0 4px 16px ${k.col}22`,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: `linear-gradient(135deg, ${k.col}, ${k.col}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                  <i className={`ti ${k.ic}`} />
                </div>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, fontFamily: "Consolas, monospace" }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: "#bfe6e6", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{k.lbl}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 3 colonnes : top materiels / top techs / top patients */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 18 }}>
            {/* Top Matériels SAV */}
            <Panel title="Top matériels (SAV 30j)" icon="ti-trophy" col="#EF9F27">
              {data.topMat.length === 0 ? (
                <Empty />
              ) : data.topMat.map((m, i) => (
                <BarRow key={m.id} rank={i + 1} label={m.libelle} sub={m.code} value={m.c} max={maxMat} col="#EF9F27" />
              ))}
            </Panel>

            {/* Top Techniciens */}
            <Panel title="Top techniciens" icon="ti-medal" col="#7CC8C8">
              {data.topTech.length === 0 ? (
                <Empty />
              ) : data.topTech.map((t, i) => (
                <BarRow key={t.nom} rank={i + 1} label={t.nom} value={t.c} max={maxTech} col="#7CC8C8" />
              ))}
            </Panel>

            {/* Top Patients */}
            <Panel title="Top patients DI" icon="ti-user-star" col="#7a6fb0">
              {data.topPat.length === 0 ? (
                <Empty />
              ) : data.topPat.map((p, i) => (
                <BarRow key={p.nom} rank={i + 1} label={p.nom} value={p.c} max={maxPat} col="#7a6fb0" />
              ))}
            </Panel>
          </div>
        </>
      )}

      <div style={{ position: "fixed", bottom: 8, right: 12, fontSize: 11, color: "rgba(191,230,230,0.5)" }}>
        <button onClick={tryFullscreen} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
          <i className="ti ti-maximize" /> Plein écran
        </button>
        {" · "}Refresh {refreshSec}s
      </div>

      <TVScreenNav currentScreen="/presentation/dashboard" />
    </div>
  );
}

function Panel({ title, icon, col, children }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${col}1a, rgba(255,255,255,0.04))`,
      border: `1px solid ${col}33`,
      borderRadius: 14,
      padding: "18px 20px",
    }}>
      <h2 style={{ fontSize: 16, color: col, textTransform: "uppercase", letterSpacing: 2, margin: 0, marginBottom: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20 }} />
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

function BarRow({ rank, label, sub, value, max, col }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 14, minWidth: 30 }}>{medal}</span>
        <span style={{ flex: 1, fontSize: 14, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}{sub && <span style={{ color: "#9bb5b5", fontSize: 11, marginLeft: 6, fontFamily: "Consolas, monospace" }}>{sub}</span>}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: col, fontFamily: "Consolas, monospace" }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 3, overflow: "hidden", marginLeft: 38 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${col}, ${col}cc)`, borderRadius: 3, transition: "width 600ms" }} />
      </div>
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", color: "rgba(191,230,230,.4)", padding: 20, fontSize: 13, fontStyle: "italic" }}>Aucune donnée</div>;
}
