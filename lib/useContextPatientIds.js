"use client";
// =============================================================
//  lib/useContextPatientIds.js (0.58.54, étendu 0.58.62 avec equipeId)
//
//  Hook qui retourne la liste des patient_ids correspondant au
//  contexte bâtiment/service/équipe actif dans la TopBar.
// =============================================================
import { useEffect, useState } from "react";
import { useCurrentContext } from "./useCurrentContext";
import { createClient } from "./supabase";

export function useContextPatientIds() {
  const ctx = useCurrentContext();
  const [patientIds, setPatientIds] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 0.58.62 : active aussi le filtre si une équipe est sélectionnée
    if (!ctx.active || (!ctx.batimentId && !ctx.serviceId && !ctx.equipeId)) {
      setPatientIds(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const supabase = createClient();

        // 0.58.62 : Cas équipe seule → patients filtrés directement par equipe_id
        if (ctx.equipeId && !ctx.serviceId && !ctx.batimentId) {
          const { data: pats } = await supabase.from("patients").select("id").eq("equipe_id", ctx.equipeId);
          if (!alive) return;
          setPatientIds(new Set((pats || []).map(p => p.id)));
          setLoading(false);
          return;
        }

        // Cas batiment/service : chambres puis patients
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

        // 0.58.62 : si équipe + bâtiment/service → intersect les patients
        let patQuery = supabase.from("patients").select("id, equipe_id").in("chambre_id", chambreIds);
        if (ctx.equipeId) patQuery = patQuery.eq("equipe_id", ctx.equipeId);
        const { data: pats } = await patQuery;
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
  }, [ctx.active, ctx.batimentId, ctx.serviceId, ctx.equipeId]);

  return { patientIds, loading, ctx };
}
