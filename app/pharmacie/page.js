"use client";
export const dynamic = "force-dynamic";
// =============================================================
//  /pharmacie — Dashboard module Pharmacie ERP
//  KPIs + accès rapides (caisse, dispensation, stock, inventaire, stupé, prép)
// =============================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import TopBar from "../TopBar";
import { PageShell, ModernCard, HiTechIconBox } from "../components/ui-premium";

const COLOR = "#5aa05a";

export default function PharmaciePage() {
  const supabase = createClient();
  const auth = useAuth();
  const router = useRouter();
  const [kpis, setKpis] = useState({
    stock: 0, alertes: 0, dispensations_jour: 0, prescriptions: 0,
    stupefiants: 0, prep_attente: 0, caisse_jour: 0,
  });

  useEffect(() => {
    if (!auth?.structureId) return;
    (async () => {
      const safe = async (q) => { try { const r = await q; return r.error ? 0 : (r.count ?? r.data?.length ?? 0); } catch { return 0; } };
      const today = new Date().toISOString().split("T")[0];
      
      const [stock, alertes, disp, presc, stupe, prep] = await Promise.all([
        safe(supabase.from("pharmacie_stock").select("id", { count: "exact", head: true })),
        safe(supabase.from("pharmacie_stock").select("id", { count: "exact", head: true }).lt("quantite", 5)),
        safe(supabase.from("prescriptions_lignes").select("id", { count: "exact", head: true }).gte("created_at", today)),
        safe(supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("statut", "active")),
        safe(supabase.from("pharmacie_stupefiants_registre").select("id", { count: "exact", head: true })),
        safe(supabase.from("pharmacie_preparations").select("id", { count: "exact", head: true }).eq("statut", "en_attente")),
      ]);
      setKpis({ stock, alertes, dispensations_jour: disp, prescriptions: presc, stupefiants: stupe, prep_attente: prep, caisse_jour: 0 });
    })();
  }, [auth?.structureId]);

  const ACCES = [
    { p: "/pharmacie/caisse",         lbl: "Caisse tactile NF525",   ic: "ti-cash-register",     c: "#EF9F27", desc: "POS avec signature électronique" },
    { p: "/prescriptions",            lbl: "Ordonnances",            ic: "ti-prescription",      c: "#7a6fb0", desc: `${kpis.prescriptions} actives` },
    { p: "/depot",                    lbl: "Dépôts pharmacie",       ic: "ti-building-warehouse",c: "#185FA5", desc: "Rayons / Tiroirs IoT" },
    { p: "/pharmacie/dispensation",   lbl: "Dispensation scan",      ic: "ti-scan",              c: "#5aa05a", desc: `${kpis.dispensations_jour} aujourd'hui` },
    { p: "/pharmacie/stupefiants",    lbl: "Registre stupéfiants",   ic: "ti-shield-lock",       c: "#D45E5E", desc: `${kpis.stupefiants} entrées` },
    { p: "/pharmacie/preparations",   lbl: "Préparations magistrales",ic: "ti-flask",            c: "#7CC8C8", desc: `${kpis.prep_attente} en attente` },
    { p: "/pharmacie/inventaires",    lbl: "Inventaires",            ic: "ti-clipboard-list",    c: "#5e4a8c", desc: "Mensuels + spot" },
    { p: "/pharmacie/interactions",   lbl: "Interactions DMI",       ic: "ti-alert-triangle",    c: "#EF9F27", desc: "Vidal compatible" },
  ];

  return (
    <>
      <TopBar />
      <PageShell
        color={COLOR}
        icon="ti-pill"
        title="Pharmacie ERP"
        subtitle="Module pharmacie : caisse · dispensation · stock · stupéfiants · préparations"
        badge={`${kpis.stock} réf en stock`}
      >
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Kpi label="Articles en stock" value={kpis.stock} ic="ti-package" c="#5aa05a" />
          <Kpi label="Alertes seuil bas" value={kpis.alertes} ic="ti-alert-triangle" c="#D45E5E" />
          <Kpi label="Dispensations aujourd'hui" value={kpis.dispensations_jour} ic="ti-scan" c="#185FA5" />
          <Kpi label="Ordonnances actives" value={kpis.prescriptions} ic="ti-prescription" c="#7a6fb0" />
          <Kpi label="Registre stupéfiants" value={kpis.stupefiants} ic="ti-shield-lock" c="#D45E5E" />
          <Kpi label="Préparations en attente" value={kpis.prep_attente} ic="ti-flask" c="#7CC8C8" />
        </div>

        {/* Accès rapides */}
        <h3 style={{ color: "#fff", margin: "10px 0", fontSize: 14, fontWeight: 800 }}>
          <i className="ti ti-bolt" style={{ color: COLOR }} /> Accès rapides
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {ACCES.map(a => (
            <ModernCard key={a.p} color={a.c} hoverable onClick={() => router.push(a.p)} padding={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <HiTechIconBox name={a.ic} color={a.c} variant="gradient" size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{a.lbl}</div>
                  <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, marginTop: 2 }}>{a.desc}</div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: a.c, fontSize: 16 }} />
              </div>
            </ModernCard>
          ))}
        </div>
      </PageShell>
    </>
  );
}

function Kpi({ label, value, ic, c }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: `linear-gradient(135deg, ${c}25, ${c}05)`,
      border: `1px solid ${c}40`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <i className={`ti ${ic}`} style={{ color: c, fontSize: 18 }} />
        <div style={{ color: "rgba(255,255,255,.6)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: "Quicksand" }}>{value}</div>
    </div>
  );
}
