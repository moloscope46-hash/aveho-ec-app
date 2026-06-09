"use client";
// =============================================================
//  lib/useRealtimeNotifs.js (0.62.131)
//
//  Écoute en realtime les événements clés et déclenche des
//  notifications natives + sons :
//    - DI urgentes nouvelles
//    - Workflow approbations à valider (mon rôle concerné)
//    - Signalements critiques
//
//  À monter une fois dans la TopBar.
// =============================================================

import { useEffect, useRef } from "react";
import { createClient } from "./supabase";
import { useAuth } from "./useAuth";

export function useRealtimeNotifs(enabled = true) {
  const supabase = createClient();
  const auth = useAuth();
  const lastChecksRef = useRef({ interventions: null, workflow: null, signalements: null, workflowDecided: null });

  useEffect(() => {
    if (!enabled || !auth?.user?.id || !auth?.structureId) return;
    let alive = true;

    // Initial baseline
    lastChecksRef.current = {
      interventions: new Date().toISOString(),
      workflow: new Date().toISOString(),
      signalements: new Date().toISOString(),
      // 0.62.134 : timestamp pour détecter les acquittements (approved/rejected)
      workflowDecided: new Date().toISOString(),
    };

    async function check() {
      if (!alive) return;
      const now = new Date().toISOString();

      try {
        // === 1. DI urgentes nouvelles ===
        const { data: urgentes } = await supabase
          .from("interventions")
          .select("id, numero, description, urgence")
          .eq("structure_id", auth.structureId)
          .gt("created_at", lastChecksRef.current.interventions)
          .in("urgence", ["Critique", "Élevée"]);
        if (urgentes && urgentes.length > 0) {
          const { notify } = await import("../lib/notifSounds");
          for (const u of urgentes) {
            const level = u.urgence === "Critique" ? "urgent" : "warning";
            notify(
              `🚨 DI ${u.urgence === "Critique" ? "CRITIQUE" : "urgente"}`,
              `${u.numero} — ${(u.description || "").substring(0, 80)}`,
              { type: level, link: "/interventions" }
            );
            // 0.62.132 : log dans notifs_log
            try {
              await supabase.from("notifs_log").insert({
                structure_id: auth.structureId,
                user_id: auth.user.id,
                type: "di_urgente",
                titre: `DI ${u.urgence === "Critique" ? "CRITIQUE" : "urgente"}`,
                message: `${u.numero} — ${(u.description || "").substring(0, 200)}`,
                resource_type: "intervention",
                resource_id: u.id,
                link: "/interventions",
                level,
              });
            } catch {}
          }
        }

        // === 2. Workflow steps en attente pour moi ===
        const { data: workflow } = await supabase
          .from("workflow_steps")
          .select("id, resource_type, resource_id, role_label, approver_role_id, approver_user_id")
          .eq("status", "pending")
          .gt("created_at", lastChecksRef.current.workflow);

        if (workflow && workflow.length > 0) {
          const myItems = workflow.filter(w =>
            w.approver_user_id === auth.user.id ||
            (w.approver_role_id && auth.role?.id === w.approver_role_id) ||
            auth.role?.nom === "Administrateur"
          );
          if (myItems.length > 0) {
            const { notify } = await import("../lib/notifSounds");
            notify(
              `✅ ${myItems.length} approbation${myItems.length > 1 ? "s" : ""} en attente`,
              `Vous devez valider ${myItems[0].resource_type}${myItems.length > 1 ? ` et ${myItems.length - 1} autre${myItems.length - 1 > 1 ? "s" : ""}` : ""}`,
              { type: "info" }
            );
          }
        }

        // === 3. Signalements critiques ===
        const { data: signs } = await supabase
          .from("signalements")
          .select("id, titre, criticite")
          .eq("structure_id", auth.structureId)
          .gt("created_at", lastChecksRef.current.signalements)
          .in("criticite", ["Critique", "Haute"]);
        if (signs && signs.length > 0) {
          const { notify } = await import("../lib/notifSounds");
          signs.forEach(s => {
            notify(
              `⚠️ Signalement ${s.criticite}`,
              s.titre || "Nouveau signalement",
              { type: "warning", link: "/signalements" }
            );
          });
        }

        // === 4. Acquittements de workflow (0.62.134) ===
        // Détecte les workflow_steps approved/rejected récents pour les ressources que j'ai créées
        const { data: decided } = await supabase
          .from("workflow_steps")
          .select("id, resource_type, resource_id, role_label, status, decided_at, comment, decided_by")
          .in("status", ["approved", "rejected"])
          .gt("decided_at", lastChecksRef.current.workflowDecided);

        if (decided && decided.length > 0) {
          // Pour chaque step décidé, vérifier que je suis le créateur de la ressource
          const { notify } = await import("../lib/notifSounds");
          for (const d of decided) {
            try {
              // Fetch la ressource pour vérifier le created_by
              const { data: res } = await supabase
                .from(d.resource_type === "achat" ? "achats" : d.resource_type === "transfert" ? "transferts" : "commandes")
                .select("created_by, numero")
                .eq("id", d.resource_id)
                .maybeSingle();
              if (!res || res.created_by !== auth.user.id) continue;

              const isOk = d.status === "approved";
              const titre = isOk
                ? `✅ ${d.role_label} a approuvé`
                : `❌ ${d.role_label} a refusé`;
              const msg = `${res.numero || "Demande"}${d.comment ? " — " + d.comment.substring(0, 100) : ""}`;
              const level = isOk ? "info" : "warning";
              notify(titre, msg, {
                type: level,
                link: `/${d.resource_type === "achat" ? "achats" : d.resource_type === "transfert" ? "transferts" : "commandes"}`,
              });

              // Log dans notifs_log
              try {
                await supabase.from("notifs_log").insert({
                  structure_id: auth.structureId,
                  user_id: auth.user.id,
                  type: "workflow",
                  titre,
                  message: msg,
                  resource_type: d.resource_type,
                  resource_id: d.resource_id,
                  link: `/${d.resource_type === "achat" ? "achats" : d.resource_type === "transfert" ? "transferts" : "commandes"}`,
                  level,
                });
              } catch {}
            } catch {}
          }
        }

        // Update baseline timestamps
        lastChecksRef.current = {
          interventions: now,
          workflow: now,
          signalements: now,
          workflowDecided: now,
        };
      } catch {}
    }

    // 0.62.135 : Check SLA dépassement (toutes les 5 min)
    const SLA_HEURES = { "Critique": 4, "Élevée": 24, "Normale": 72, "Faible": 168 };
    const escaladesAlerteesRef = new Set();
    async function checkSLA() {
      if (!alive) return;
      try {
        const { data: intervs } = await supabase
          .from("interventions")
          .select("id, numero, description, urgence, etat, created_at, technicien_user_id")
          .eq("structure_id", auth.structureId)
          .neq("etat", "Résolue")
          .neq("etat", "Annulée");
        if (!intervs || intervs.length === 0) return;

        const { notify } = await import("../lib/notifSounds");
        const now = Date.now();
        for (const i of intervs) {
          const slaHours = SLA_HEURES[i.urgence] || 72;
          const ageHours = (now - new Date(i.created_at).getTime()) / 3600000;
          if (ageHours > slaHours && !escaladesAlerteesRef.has(i.id)) {
            const isTech = i.technicien_user_id === auth.user.id;
            const isAdminUnassigned = !i.technicien_user_id && auth.role?.nom === "Administrateur";
            if (isTech || isAdminUnassigned) {
              const tauxDepassement = Math.round(((ageHours - slaHours) / slaHours) * 100);
              const level = tauxDepassement > 100 ? "urgent" : "warning";
              notify(
                `⏰ SLA dépassé : ${i.urgence}`,
                `${i.numero} en retard de ${tauxDepassement}% (${Math.round(ageHours)}h pour SLA ${slaHours}h)`,
                { type: level, link: "/interventions" }
              );
              escaladesAlerteesRef.add(i.id);
              try {
                await supabase.from("notifs_log").insert({
                  structure_id: auth.structureId,
                  user_id: auth.user.id,
                  type: "sla_depasse",
                  titre: `SLA dépassé : ${i.urgence}`,
                  message: `${i.numero} en retard de ${tauxDepassement}%`,
                  resource_type: "intervention",
                  resource_id: i.id,
                  link: "/interventions",
                  level,
                });
              } catch {}
            }
          }
        }
      } catch {}
    }

    // Check realtime immédiat puis toutes 60s
    check();
    const interval = setInterval(check, 60 * 1000);
    // Check SLA à +30s puis toutes 5 min
    const slaTimeout = setTimeout(checkSLA, 30 * 1000);
    const slaInterval = setInterval(checkSLA, 5 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(interval);
      clearTimeout(slaTimeout);
      clearInterval(slaInterval);
    };
  }, [enabled, auth?.user?.id, auth?.structureId, auth?.role?.id, auth?.role?.nom, supabase]);
}
