"use client";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

export default function WidgetPharmacieAlertes() {
  const supabase = createClient();
  const auth = useAuth();
  const [alertes, setAlertes] = useState([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      const r = await supabase.from("v_pharmacie_alertes_perimees").select("*").eq("structure_id", auth.structureId).order("date_peremption").limit(20);
      if (r.error?.code === "42P01") { setMissing(true); return; }
      setAlertes(r.data || []);
    })();
  }, [auth.ready]);

  if (missing || alertes.length === 0) return null;

  const perimes = alertes.filter(a => a.niveau_alerte === "perime").length;
  const critiques = alertes.filter(a => a.niveau_alerte === "critique").length;
  const attentions = alertes.filter(a => a.niveau_alerte === "attention").length;

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(212,94,94,.10), rgba(239,159,39,.05))",
      border: "1px solid rgba(212,94,94,.30)",
      fontFamily: "Quicksand, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <i className="ti ti-pill-off" style={{ color: "#D45E5E", fontSize: 22 }} />
        <h3 style={{ color: "#fff", margin: 0, fontSize: 14, fontWeight: 800 }}>Alertes pharmacie</h3>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Counter c="#D45E5E" l="Périmés" n={perimes} />
        <Counter c="#EF9F27" l="Critiques (7j)" n={critiques} />
        <Counter c="#7CC8C8" l="Attention (30j)" n={attentions} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {alertes.slice(0, 5).map(a => (
          <div key={a.stock_id} style={{ padding: "6px 8px", background: "rgba(255,255,255,.04)", borderRadius: 6, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#fff" }}>{a.nom_commercial} <span style={{ color: "rgba(255,255,255,.5)" }}>· lot {a.numero_lot}</span></span>
            <span style={{ color: a.jours_restants < 0 ? "#D45E5E" : a.jours_restants < 7 ? "#EF9F27" : "#7CC8C8", fontWeight: 700 }}>
              {a.jours_restants < 0 ? "Périmé" : `${a.jours_restants}j`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Counter({ c, l, n }) {
  return (
    <div style={{ flex: 1, padding: 8, background: `${c}15`, border: `1px solid ${c}40`, borderRadius: 8, textAlign: "center" }}>
      <div style={{ color: c, fontSize: 20, fontWeight: 800 }}>{n}</div>
      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 9, textTransform: "uppercase" }}>{l}</div>
    </div>
  );
}
