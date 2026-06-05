"use client";
// =============================================================
//  app/components/UserAttachmentsInfo.js (0.58.36)
//
//  Affiche sous le nom de l'utilisateur (dans UserMenu) les bâtiments
//  et services auxquels il est rattaché (via membres_equipe → equipes).
//
//  Chargement silencieux : si erreur ou aucune équipe, n'affiche rien.
//  L'user peut être membre de plusieurs équipes → on agrège les uniques.
// =============================================================

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function UserAttachmentsInfo({ userId, etabId }) {
  const supabase = createClient();
  const [batiments, setBatiments] = useState([]);
  const [equipes, setEquipes] = useState([]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        // 1) Trouve les équipes de l'user via membres_equipe
        const { data: memb, error: e1 } = await supabase
          .from("membres_equipe")
          .select("equipe_id, equipes(id, nom, couleur, batiment_id, batiments(id, nom, etablissement_id))")
          .eq("user_id", userId);
        if (e1 || !memb) return;

        // 2) Filtre par établissement courant si défini (pour éviter de tout afficher)
        const rawEqs = (memb || []).map(m => m.equipes).filter(Boolean);
        const eqs = etabId
          ? rawEqs.filter(eq => eq.batiments?.etablissement_id === etabId || !eq.batiment_id)
          : rawEqs;

        if (!alive) return;
        setEquipes(eqs);

        // 3) Bâtiments uniques (via batiments lié à l'équipe)
        const batMap = {};
        eqs.forEach(eq => {
          if (eq.batiments) batMap[eq.batiments.id] = eq.batiments;
        });
        setBatiments(Object.values(batMap));
      } catch {
        // silencieux : si schéma différent, on n'affiche rien
      }
    })();
    return () => { alive = false; };
  }, [userId, etabId]);

  // Rien à afficher si aucune équipe trouvée
  if (equipes.length === 0 && batiments.length === 0) return null;

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5 }}>
      {/* Bâtiments rattachés */}
      {batiments.length > 0 && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          color: "#5a8888",
        }}>
          <i className="ti ti-building" style={{ color: "#7CC8C8", fontSize: 13 }} />
          <span style={{ fontWeight: 600, color: "#142131" }}>
            {batiments.map(b => b.nom).join(" · ")}
          </span>
        </div>
      )}

      {/* Équipes rattachées (proxy pour services) */}
      {equipes.length > 0 && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          color: "#7a4f15",
          flexWrap: "wrap",
        }}>
          <i className="ti ti-users" style={{ color: "#7a6fb0", fontSize: 13 }} />
          <span style={{ fontWeight: 600, color: "#142131" }}>
            {equipes.map(eq => eq.nom).slice(0, 3).join(" · ")}
            {equipes.length > 3 && <span style={{ opacity: 0.6 }}> +{equipes.length - 3}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
