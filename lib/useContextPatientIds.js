"use client";
// =============================================================
//  lib/useContextPatientIds.js (0.58.54)
//
//  Hook qui retourne la liste des patient_ids correspondant au
//  contexte bâtiment/service actif dans la TopBar.
//
//  Pattern réutilisé dans /materiels, /commandes, /achats,
//  /transferts, /signalements, /interventions, /maintenance.
//
//  Retour :
//   - patientIds: Set<string> | null
//     - null = ctx inactif → pas de filtrage
//     - Set vide = ctx actif mais aucun patient dans ce périmètre
//     - Set non vide = liste des patient_ids à conserver
//   - loading: bool
// =============================================================
import { useEffect, useState } from "react";
import { useCurrentContext } from "./useCurrentContext";
import { createClient } from "./supabase";

export function useContextPatientIds() {
  const ctx = useCurrentContext();
  const [patientIds, setPatientIds] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ctx.active || (!ctx.batimentId && !ctx.serviceId)) {
      setPatientIds(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const supabase = createClient();
        // 1) chambres dans le périmètre
        let query = supabase.from("chambres").select("id, service_id, batiment_id");
        if (ctx.serviceId) query = query.eq("service_id", ctx.serviceId);
        else if (ctx.batimentId) query = query.eq("batiment_id", ctx.batimentId);
        const { data: chambres } = await query;
        if (!alive) return;
        const chambreIds = (chambres || []).map(c => c.id);
        if (chambreIds.length === 0) {
          setPatientIds(new Set());
          setLoading(false);
          return;
        }
        // 2) patients liés à ces chambres
        const { data: pats } = await supabase.from("patients").select("id").in("chambre_id", chambreIds);
        if (!alive) return;
        setPatientIds(new Set((pats || []).map(p => p.id)));
        setLoading(false);
      } catch {
        if (alive) {
          setPatientIds(null);
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [ctx.active, ctx.batimentId, ctx.serviceId]);

  return { patientIds, loading, ctx };
}
