// supabase/functions/rbeu-renouvellement-cron/index.ts
// =============================================================
//  Edge Function CRON — Détecte les RBEU à renouveler
//  À déclencher quotidiennement via pg_cron Supabase
//
//  Logique :
//  - Pour chaque étab avec dernière déclaration > 11 mois → notif "à renouveler"
//  - Pour chaque étab avec dernière déclaration > 12 mois → notif "dépassée" (URGENT)
//  - Notifie le user créé en premier dans la structure (admin présumé)
//
//  Déploiement :
//   supabase functions deploy rbeu-renouvellement-cron
//   Puis dans le dashboard Supabase :
//     SELECT cron.schedule('rbeu-daily', '0 9 * * *', $$
//       SELECT net.http_post(url := '<edge_url>') ;
//     $$);
// =============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async () => {
  try {
    // Récupère l'état RBEU de tous les étabs
    const { data: etats } = await supabase.from("v_rbeu_etat").select("*");
    if (!etats) return new Response(JSON.stringify({ checked: 0 }), { headers: { "Content-Type": "application/json" } });

    let notifsCreated = 0;
    for (const etat of etats) {
      if (etat.etat_renouvellement === "a_renouveler" || etat.etat_renouvellement === "depasse") {
        // Trouve un admin de la structure (premier user créé)
        const { data: admins } = await supabase.from("membres_structure")
          .select("user_id")
          .eq("structure_id", etat.structure_id)
          .order("created_at", { ascending: true })
          .limit(1);
        const adminUserId = admins?.[0]?.user_id;
        if (!adminUserId) continue;

        // Vérifie si une notif n'a pas déjà été envoyée dans les 7 derniers jours
        const { data: recent } = await supabase.from("notifications_log")
          .select("id")
          .eq("user_id", adminUserId)
          .eq("template_code", "rbeu_renouvellement")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);
        if (recent && recent.length > 0) continue;

        const isUrgent = etat.etat_renouvellement === "depasse";
        const dateRefStr = etat.derniere_declaration
          ? new Date(etat.derniere_declaration).toLocaleDateString("fr-FR")
          : "Jamais";

        // Crée notif in-app
        await supabase.from("notifications").insert({
          user_id: adminUserId,
          structure_id: etat.structure_id,
          type: "rbeu",
          titre: isUrgent ? `🔴 RBEU DÉPASSÉ : ${etat.etablissement_nom}` : `⚠ RBEU à renouveler : ${etat.etablissement_nom}`,
          message: `Dernière déclaration : ${dateRefStr}. Action requise sur le portail INPI.`,
          url: "/rbeu",
          lu: false,
        });

        // Queue email
        await supabase.from("notifications_log").insert({
          user_id: adminUserId,
          template_code: "rbeu_renouvellement",
          canal: "email",
          sujet: isUrgent ? `🔴 RBEU DÉPASSÉ - ${etat.etablissement_nom}` : `⚠ RBEU à renouveler - ${etat.etablissement_nom}`,
          corps: `<p>Bonjour,</p><p>Le RBEU de <b>${etat.etablissement_nom}</b> doit être ${isUrgent ? "renouvelé d'urgence (délai DÉPASSÉ)" : "renouvelé"}.</p><p>Dernière déclaration : <b>${dateRefStr}</b></p><p>Rappel : sanctions encourues en cas de défaut (7500€ + 6 mois prison).</p><p><a href="https://aveho.fr/rbeu" class="btn">Mettre à jour</a></p>`,
          envoye: false,
        });
        notifsCreated++;
      }
    }

    return new Response(JSON.stringify({ checked: etats.length, notifsCreated }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
