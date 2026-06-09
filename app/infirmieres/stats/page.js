"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";
import TopBar from "../../TopBar";
import { PageShell, ModernCard, HiTechIconBox } from "../../components/ui-premium";
import PermissionGate from "../../components/PermissionGate";

const COLOR = "#7CC8C8";

export default function StatsIDEPage() {
  const supabase = createClient();
  const auth = useAuth();
  const [stats, setStats] = useState([]);
  const [actes, setActes] = useState([]);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => { if (auth.ready) load(); }, [auth.ready]);

  async function load() {
    const r = await supabase.from("v_infirmiere_stats").select("*").eq("structure_id", auth.structureId);
    if (r.error?.code === "42P01") { setTableMissing(true); return; }
    setStats(r.data || []);

    const a = await supabase.from("actes_ngap").select("*").order("code").limit(50);
    setActes(a.data || []);
  }

  if (tableMissing) {
    return (
      <>
        <TopBar />
        <PageShell color={COLOR} icon="ti-chart-bar" title="Stats IDE" subtitle="Module non installé">
          <ModernCard color={COLOR} variant="accent" icon="ti-alert-triangle" title="Vue manquante">
            <p style={{ color: "rgba(255,255,255,.8)" }}>Exécute <strong>aveho-MODULE-infirmieres-erp.sql</strong>.</p>
          </ModernCard>
        </PageShell>
      </>
    );
  }

  const totalCa = stats.reduce((a, s) => a + (parseFloat(s.ca_30j) || 0), 0);
  const totalVisites = stats.reduce((a, s) => a + (s.nb_visites_30j || 0), 0);
  const totalPatients = stats.reduce((a, s) => a + (s.nb_patients_30j || 0), 0);
  const totalBSI = stats.reduce((a, s) => a + (s.nb_bsi_30j || 0), 0);

  return (
    <PermissionGate require="lire">
      <TopBar />
      <PageShell color={COLOR} icon="ti-chart-bar" title="Statistiques activité infirmière" subtitle="30 derniers jours" badge={`${stats.length} IDE`}>
        {/* KPIs globaux */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
          <Kpi ic="ti-currency-euro" c="#5aa05a" v={`${totalCa.toFixed(2)} €`} l="CA total 30j" />
          <Kpi ic="ti-calendar-event" c="#185FA5" v={totalVisites} l="Visites 30j" />
          <Kpi ic="ti-users" c="#7a6fb0" v={totalPatients} l="Patients 30j" />
          <Kpi ic="ti-clipboard-check" c="#5e4a8c" v={totalBSI} l="BSI 30j" />
        </div>

        {/* Stats par IDE */}
        <ModernCard color={COLOR} variant="default" padding={16} style={{ marginBottom: 18 }}>
          <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
            <i className="ti ti-users" style={{ color: COLOR, marginRight: 8 }} />
            Performance par infirmière
          </h3>
          {stats.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,.5)" }}>Aucune donnée</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stats.sort((a, b) => (b.ca_30j || 0) - (a.ca_30j || 0)).map(s => (
                <div key={s.infirmiere_id} style={{ padding: 12, background: "rgba(255,255,255,.04)", borderRadius: 10, display: "grid", gridTemplateColumns: "auto 1fr repeat(5, 1fr)", gap: 10, alignItems: "center" }}>
                  <HiTechIconBox name="ti-stethoscope" color={COLOR} variant="gradient" size={34} />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{s.prenom} {s.nom}</div>
                    <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11 }}>{s.type_infirmiere}</div>
                  </div>
                  <Mini ic="ti-calendar-event" v={s.nb_visites_30j || 0} l="visites" />
                  <Mini ic="ti-calendar-week" v={s.nb_visites_7j || 0} l="cette sem." />
                  <Mini ic="ti-users" v={s.nb_patients_30j || 0} l="patients" />
                  <Mini ic="ti-clipboard-check" v={s.nb_bsi_30j || 0} l="BSI" />
                  <Mini ic="ti-currency-euro" v={`${(parseFloat(s.ca_30j) || 0).toFixed(0)}€`} l="CA" highlight />
                </div>
              ))}
            </div>
          )}
        </ModernCard>

        {/* Référentiel NGAP */}
        <ModernCard color="#5aa05a" variant="default" padding={16}>
          <h3 style={{ color: "#fff", margin: "0 0 14px", fontSize: 15, fontWeight: 800 }}>
            <i className="ti ti-book" style={{ color: "#5aa05a", marginRight: 8 }} />
            Référentiel NGAP (actes infirmiers)
          </h3>
          {actes.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,.5)" }}>Aucun acte (exécute le SQL pour seeder)</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
              {actes.map(a => (
                <div key={a.id} style={{ padding: 10, background: "rgba(90,160,90,.10)", borderRadius: 8, border: "1px solid rgba(90,160,90,.30)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#5aa05a", fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{a.code}</span>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{a.tarif_calcule?.toFixed(2)} €</span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11 }}>{a.libelle}</div>
                  {a.categorie && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9, marginTop: 3, textTransform: "uppercase" }}>{a.categorie}</div>}
                </div>
              ))}
            </div>
          )}
        </ModernCard>
      </PageShell>
    </PermissionGate>
  );
}

function Kpi({ ic, c, v, l }) {
  return (
    <ModernCard color={c} variant="accent" padding={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <HiTechIconBox name={ic} color={c} variant="gradient" size={38} />
        <div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 10, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
        </div>
      </div>
    </ModernCard>
  );
}

function Mini({ ic, v, l, highlight }) {
  return (
    <div style={{ textAlign: "center", padding: "4px 6px", background: highlight ? "rgba(90,160,90,.15)" : "transparent", borderRadius: 6 }}>
      <div style={{ color: highlight ? "#5aa05a" : "#fff", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ color: "rgba(255,255,255,.4)", fontSize: 9 }}>{l}</div>
    </div>
  );
}
