// Edge Function : goals-snapshot-cron (0.58.65)
//
// Snapshot quotidien des stats objectifs pour chaque user.
// Permet d'afficher la courbe d'évolution 7j/30j même si l'user
// ne s'est pas connecté tous les jours (vs localStorage 0.58.63).
//
// Déploiement :
//   supabase functions deploy goals-snapshot-cron
//
// Programmation (SQL Editor, une seule fois) :
//   select cron.schedule(
//     'goals-snapshot-cron',
//     '30 0 * * *',   -- tous les jours à 00:30 UTC
//     $$ select net.http_post(
//          url := 'https://VOTRE_PROJET.supabase.co/functions/v1/goals-snapshot-cron',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY',
//            'x-cron-secret', 'VOTRE_CRON_SECRET'
//          )
//        ); $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, requireCronSecret } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }

  const cronCheck = requireCronSecret(req);
  if (cronCheck) return cronCheck;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

  try {
    // 1) Récupère tous les goals existants (groupés par user_id)
    const { data: goals, error: goalsErr } = await supabase
      .from("user_goals")
      .select("*");

    if (goalsErr) {
      return new Response(JSON.stringify({ error: goalsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!goals || goals.length === 0) {
      return new Response(JSON.stringify({ ok: true, snapshots: 0, message: "Aucun goal à snapshotter" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Récupère les structure_id par user (jointure membres_structure)
    const userIds = [...new Set(goals.map((g: any) => g.user_id))];
    const { data: membres } = await supabase
      .from("membres_structure")
      .select("user_id, structure_id")
      .in("user_id", userIds);
    const userToStruct: Record<string, string> = {};
    (membres || []).forEach((m: any) => {
      if (!userToStruct[m.user_id]) userToStruct[m.user_id] = m.structure_id;
    });

    // 3) Récupère les équipes pour enrichir teamStats
    const teamIds = [...new Set(goals.map((g: any) => g.team_id).filter(Boolean))];
    let teamsMap: Record<string, any> = {};
    if (teamIds.length > 0) {
      const { data: teams } = await supabase.from("equipes").select("id, nom, couleur").in("id", teamIds);
      teamsMap = Object.fromEntries((teams || []).map((t: any) => [t.id, t]));
    }

    // 4) Groupe les goals par user_id et calcule les stats
    const goalsByUser: Record<string, any[]> = {};
    goals.forEach((g: any) => {
      if (!goalsByUser[g.user_id]) goalsByUser[g.user_id] = [];
      goalsByUser[g.user_id].push(g);
    });

    const snapshots: any[] = [];
    for (const [userId, userGoals] of Object.entries(goalsByUser)) {
      const structureId = userToStruct[userId];
      if (!structureId) continue;  // skip users sans structure rattachée

      const pcts = userGoals.map((g: any) => g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0);
      const avgPct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      const nbAtteints = userGoals.filter((g: any) => g.current >= g.target).length;
      const tauxAtteinte = (nbAtteints / userGoals.length) * 100;

      // Stats par équipe
      const byTeam: Record<string, any> = {};
      userGoals.forEach((g: any) => {
        const tid = g.team_id || "_none";
        if (!byTeam[tid]) byTeam[tid] = { team_id: g.team_id, team_nom: teamsMap[g.team_id]?.nom || "Sans équipe", goals: [], achieved: 0, sumPct: 0 };
        byTeam[tid].goals.push({ id: g.id, label: g.label, current: g.current, target: g.target });
        byTeam[tid].sumPct += g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
        if (g.current >= g.target) byTeam[tid].achieved++;
      });
      const teamStats = Object.values(byTeam).map((t: any) => ({
        team_id: t.team_id,
        team_nom: t.team_nom,
        nb: t.goals.length,
        achieved: t.achieved,
        avgPct: t.goals.length > 0 ? Math.round((t.sumPct / t.goals.length) * 100) / 100 : 0,
        tauxAtteinte: t.goals.length > 0 ? Math.round((t.achieved / t.goals.length) * 10000) / 100 : 0,
      }));

      snapshots.push({
        user_id: userId,
        structure_id: structureId,
        snapshot_date: today,
        avg_pct: Math.round(avgPct * 100) / 100,
        nb_atteints: nbAtteints,
        nb_total: userGoals.length,
        taux_atteinte: Math.round(tauxAtteinte * 100) / 100,
        team_stats: teamStats,
        goals_raw: userGoals.map((g: any) => ({ id: g.id, label: g.label, current: g.current, target: g.target, team_id: g.team_id })),
      });
    }

    // 5) Upsert : remplace si déjà un snapshot du jour
    let inserted = 0;
    if (snapshots.length > 0) {
      const { error: upsertErr } = await supabase
        .from("user_goals_snapshots")
        .upsert(snapshots, { onConflict: "user_id,snapshot_date" });
      if (upsertErr) {
        return new Response(JSON.stringify({ error: upsertErr.message, attempted: snapshots.length }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = snapshots.length;
    }

    // 6) Nettoyage : on garde 90 jours d'historique max
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    await supabase.from("user_goals_snapshots").delete().lt("snapshot_date", cutoffISO);

    return new Response(JSON.stringify({
      ok: true,
      date: today,
      snapshots_inserted: inserted,
      users_with_goals: Object.keys(goalsByUser).length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
