"use client";
// =============================================================
//  app/components/EquipeSelector.js (0.58.63)
//
//  Petit sélecteur réutilisable pour choisir une équipe.
//  Utilisé dans les formulaires patient / intervention / matériel.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function EquipeSelector({ value, onChange, structureId = null, batimentId = null, label = "Équipe", placeholder = "— Aucune équipe —" }) {
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        let q = supabase.from("equipes").select("id, nom, couleur, batiment_id").order("nom");
        if (batimentId) q = q.eq("batiment_id", batimentId);
        else if (structureId) q = q.eq("structure_id", structureId);
        const { data, error } = await q;
        if (!alive) return;
        if (error) {
          // Fallback : sans filtre
          const fb = await supabase.from("equipes").select("id, nom, couleur").order("nom");
          setEquipes(fb.data || []);
        } else {
          setEquipes(data || []);
        }
      } catch {
        if (alive) setEquipes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [structureId, batimentId]);

  const current = equipes.find(e => e.id === value);

  return (
    <div className="fld">
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ti ti-users-group" style={{ color: current?.couleur || "#7a6fb0" }} />
        {label}
        {loading && <i className="ti ti-loader ti-spin" style={{ fontSize: 11, opacity: 0.6 }} />}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={current ? { borderLeft: `4px solid ${current.couleur || "#7a6fb0"}` } : undefined}
      >
        <option value="">{placeholder}</option>
        {equipes.map(e => (
          <option key={e.id} value={e.id}>{e.nom}</option>
        ))}
      </select>
    </div>
  );
}
