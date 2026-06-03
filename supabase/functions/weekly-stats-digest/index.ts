// Edge Function : weekly-stats-digest (Alpha 0.45.0)
//
// Envoie chaque dimanche un récap stats par email aux administrateurs
// de chaque structure :
//  - KPIs activité de la semaine
//  - Nouvelles DI / signalements / achats
//  - Top demandeurs DI
//  - Maintenances en retard
//
// Déploiement :
//   supabase functions deploy weekly-stats-digest
//
// Programmation (dans Supabase SQL Editor, une seule fois) :
//   select cron.schedule(
//     'weekly-stats-digest',
//     '0 7 * * 1',   -- tous les lundis à 7h UTC (récap de la semaine passée)
//     $$ select net.http_post(
//          url := 'https://VOTRE_PROJET.supabase.co/functions/v1/weekly-stats-digest',
//          headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY')
//        ); $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, requireCronSecret } from "../_shared/auth.ts";

// 0.57.33 : check CRON_SECRET
Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }

  // 0.57.33 : vérification du secret CRON
  const cronCheck = requireCronSecret(req);
  if (cronCheck) return cronCheck;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("Configuration manquante", { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const aujourdhui = new Date();
  const ilYa7j = new Date(Date.now() - 7 * 86400000);
  const sinceISO = ilYa7j.toISOString();

  let emailsEnvoyes = 0;
  const erreurs = [];

  try {
    // 1) Pour chaque structure, identifier les admins (rôle Administrateur)
    const { data: structures } = await supabase
      .from("structures")
      .select("id, nom");

    for (const structure of structures || []) {
      try {
        // Admins de cette structure
        const { data: membres } = await supabase
          .from("membres_structure")
          .select("user_id, role_id, roles(nom)")
          .eq("structure_id", structure.id);
        const admins = (membres || []).filter(m => m.roles?.nom === "Administrateur");
        if (admins.length === 0) continue;

        // Emails des admins via v_users_emails
        const adminIds = admins.map(a => a.user_id);
        const { data: emails } = await supabase
          .from("v_users_emails")
          .select("user_id, email")
          .in("user_id", adminIds);
        const emailMap = Object.fromEntries((emails || []).map(e => [e.user_id, e.email]));

        // KPIs de la semaine
        const [diResp, signalResp, achatResp, maintResp] = await Promise.all([
          supabase.from("interventions").select("id, urgence, statut", { count: "exact" })
            .eq("structure_id", structure.id).gte("created_at", sinceISO),
          supabase.from("signalements").select("id, type", { count: "exact" })
            .eq("structure_id", structure.id).gte("created_at", sinceISO),
          supabase.from("achats").select("id, statut", { count: "exact" })
            .eq("structure_id", structure.id).gte("created_at", sinceISO),
          supabase.from("maintenances").select("id, statut")
            .eq("structure_id", structure.id).eq("statut", "En retard"),
        ]);
        const nbDi = diResp.count || 0;
        const nbDiUrgent = (diResp.data || []).filter(d => d.urgence === "Urgent").length;
        const nbSignal = signalResp.count || 0;
        const nbAchat = achatResp.count || 0;
        const nbAchatBrouillon = (achatResp.data || []).filter(a => a.statut === "Brouillon").length;
        const nbMaintRetard = (maintResp.data || []).length;

        // Si rien d'intéressant cette semaine, on saute pour ne pas spammer
        if (nbDi === 0 && nbSignal === 0 && nbAchat === 0 && nbMaintRetard === 0) {
          continue;
        }

        // Préparer le HTML
        const html = buildDigestHtml({
          structureNom: structure.nom,
          periode: `du ${ilYa7j.toLocaleDateString("fr-FR")} au ${aujourdhui.toLocaleDateString("fr-FR")}`,
          nbDi, nbDiUrgent, nbSignal, nbAchat, nbAchatBrouillon, nbMaintRetard,
        });

        // Envoi à chaque admin
        for (const adminId of adminIds) {
          const email = emailMap[adminId];
          if (!email) continue;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                to: email,
                subject: `Aveho — Récap hebdo ${structure.nom}`,
                html,
              }),
            });
            emailsEnvoyes++;
          } catch (e) {
            erreurs.push(`Email ${email}: ${e.message}`);
          }

          // Alpha 0.47.0 : push browser best-effort
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                userId: adminId,
                title: `Récap hebdo ${structure.nom}`,
                body: `${nbDi} DI, ${nbSignal} signalements, ${nbAchat} achats cette semaine`,
                url: "/accueil",
              }),
            });
          } catch (e) {
            // Push best-effort
          }
        }
      } catch (e) {
        erreurs.push(`Structure ${structure.id}: ${e.message}`);
      }
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({
    ok: true,
    emailsEnvoyes,
    erreurs,
    timestamp: new Date().toISOString(),
  }), { headers: { "Content-Type": "application/json" } });
});

function buildDigestHtml({ structureNom, periode, nbDi, nbDiUrgent, nbSignal, nbAchat, nbAchatBrouillon, nbMaintRetard }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Récap hebdo Aveho</title></head>
<body style="margin:0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background:#f4f7fa; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(20,33,49,0.1);">
    <div style="background: linear-gradient(135deg, #142131 0%, #185FA5 100%); color:#fff; padding:28px 24px;">
      <div style="font-size:11px; letter-spacing:3px; color:#bfe6e6; font-weight:700;">AVEHO — RÉCAP HEBDO</div>
      <h1 style="margin:8px 0 4px; font-size:22px; font-weight:700;">${structureNom}</h1>
      <p style="margin:0; font-size:13px; color:#bfe6e6;">${periode}</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#2a3a48; font-size:14px; margin:0 0 18px;">Bonjour, voici un récapitulatif des activités sur votre collectivité cette semaine :</p>

      <div style="display:table; width:100%; border-spacing:0 8px;">
        ${buildKpiRow("🛠️ Demandes d'intervention", nbDi, nbDiUrgent > 0 ? `dont <b style="color:#c0392b">${nbDiUrgent} urgentes</b>` : null)}
        ${buildKpiRow("💬 Signalements", nbSignal)}
        ${buildKpiRow("🛒 Demandes d'achat", nbAchat, nbAchatBrouillon > 0 ? `dont ${nbAchatBrouillon} en brouillon` : null)}
        ${buildKpiRow("⏰ Maintenances en retard", nbMaintRetard, null, nbMaintRetard > 0 ? "#c0392b" : "#5aa05a")}
      </div>

      <p style="margin:24px 0 0; font-size:13px; color:#6c7a89; text-align:center;">
        Connectez-vous à <a href="https://aveho-ec-app.vercel.app/accueil" style="color:#185FA5; text-decoration:none; font-weight:600;">Aveho EC</a> pour voir les détails.
      </p>
    </div>
    <div style="background:#f4f7fa; padding:16px 24px; text-align:center; border-top:1px solid #e3e9ee;">
      <p style="margin:0; font-size:11px; color:#8a98a8;">
        Récap envoyé chaque lundi · Pour désactiver, contactez l'administrateur de votre structure.
      </p>
    </div>
  </div>
</body></html>`;
}

function buildKpiRow(label, value, extra = null, color = "#185FA5") {
  return `<div style="display:table-row;">
    <div style="display:table-cell; padding:10px 14px; background:#f4f7fa; border-left:4px solid ${color}; border-radius:6px;">
      <div style="font-size:13px; color:#6c7a89;">${label}</div>
      <div style="font-size:24px; font-weight:700; color:#142131; margin-top:2px;">${value}</div>
      ${extra ? `<div style="font-size:11.5px; color:#6c7a89; margin-top:2px;">${extra}</div>` : ""}
    </div>
  </div>`;
}
