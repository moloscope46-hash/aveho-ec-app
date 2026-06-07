"use client";
// =============================================================
//  EquipeFilter — Filtre par équipe réutilisable (0.62.30)
//
//  Sélecteur d'équipe en pill bar pour filtrer une liste.
//  Charge les équipes de la structure courante et expose
//  le selectedEquipeId via onChange.
//
//  Usage :
//    <EquipeFilter
//      value={equipeFilter}
//      onChange={setEquipeFilter}
//    />
//    // ... puis dans le filter() :
//    .filter(x => !equipeFilter || x.equipe_id === equipeFilter)
// =============================================================
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

export default function EquipeFilter({ value, onChange, compact = false }) {
  const supabase = createClient();
  const auth = useAuth();
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.ready || !auth.structureId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("equipes")
          .select("id, nom, couleur, icone")
          .eq("structure_id", auth.structureId)
          .order("nom");
        setEquipes(data || []);
      } catch (e) { console.warn("[EquipeFilter] load:", e); }
      setLoading(false);
    })();
  }, [auth.ready, auth.structureId]);

  if (loading) return null;
  if (equipes.length === 0) return null;

  return (
    <div style={{
      display: "flex", gap: 4, flexWrap: "wrap",
      border: "1px solid #cfd8e0", borderRadius: 6,
      padding: 3, background: "#fff",
    }}>
      <button
        onClick={() => onChange(null)}
        style={{
          padding: compact ? "3px 8px" : "5px 12px",
          background: !value ? "#185FA5" : "transparent",
          color: !value ? "#fff" : "#5a6878",
          border: "none", borderRadius: 4,
          fontFamily: "inherit", fontSize: compact ? 11 : 12, fontWeight: 700, cursor: "pointer",
        }}
      >
        Toutes équipes
      </button>
      {equipes.map(e => {
        const active = value === e.id;
        const color = e.couleur || "#7a6fb0";
        return (
          <button
            key={e.id}
            onClick={() => onChange(e.id)}
            style={{
              padding: compact ? "3px 8px" : "5px 12px",
              background: active ? color : "transparent",
              color: active ? "#fff" : color,
              border: "none", borderRadius: 4,
              fontFamily: "inherit", fontSize: compact ? 11 : 12, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            {e.icone && <i className={`ti ${e.icone}`} />}
            {e.nom}
          </button>
        );
      })}
    </div>
  );
}
