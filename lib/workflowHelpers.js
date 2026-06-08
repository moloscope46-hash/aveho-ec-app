"use client";
// =============================================================
//  lib/workflowHelpers.js (0.62.132)
//
//  Helpers pour déclencher un workflow d'approbation à partir
//  d'un template sauvegardé en DB.
// =============================================================

import { createClient } from "./supabase";

// Liste les templates disponibles pour un type de ressource
export async function listTemplatesForResource(resourceType, structureId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .or(`structure_id.eq.${structureId},structure_id.is.null`)
    .or(`resource_type.eq.${resourceType},resource_type.eq.*`)
    .order("created_at");
  if (error) return [];
  return data || [];
}

// Récupère les rôles structurés (pour matcher role_label → role_id)
async function getRoles(structureId) {
  const supabase = createClient();
  const { data } = await supabase
    .from("roles")
    .select("id, nom")
    .eq("structure_id", structureId);
  return data || [];
}

// Applique un template sur une ressource : crée les workflow_steps
export async function applyTemplate({ template, resourceType, resourceId, structureId, userId }) {
  if (!template || !resourceId) return { ok: false, error: "Template ou resource_id manquant" };
  const supabase = createClient();

  try {
    // Récupère les rôles pour matcher role_label → role_id
    const roles = await getRoles(structureId);

    // Construit les steps à insérer
    const steps = (template.steps_json || []).map((step, i) => {
      const matchedRole = roles.find(r => r.nom?.toLowerCase() === (step.role_label || "").toLowerCase());
      return {
        structure_id: structureId,
        resource_type: resourceType,
        resource_id: resourceId,
        step_order: step.step_order || (i + 1),
        role_label: step.role_label,
        approver_role_id: matchedRole?.id || null,
        approver_user_id: step.approver_user_id || null,
        status: "pending",
      };
    });

    if (steps.length === 0) return { ok: false, error: "Aucune étape dans le template" };

    // Supprime d'abord les anciens steps de cette ressource (pour éviter doublons)
    await supabase
      .from("workflow_steps")
      .delete()
      .eq("resource_type", resourceType)
      .eq("resource_id", resourceId);

    // Insère les nouveaux
    const { error } = await supabase.from("workflow_steps").insert(steps);
    if (error) throw error;

    return { ok: true, stepsCreated: steps.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
