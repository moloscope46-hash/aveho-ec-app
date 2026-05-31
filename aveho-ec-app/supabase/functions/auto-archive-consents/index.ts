// Edge Function : auto-archive-consents (Alpha 0.24.0)
//
// Fonction à déployer dans Supabase et à appeler une fois par mois
// (le 1er du mois à 4h UTC = nuit calme).
//
// Rôle :
// Archive automatiquement les consentements signés dont la date d'expiration
// est passée depuis plus de N jours (par défaut 180 jours = 6 mois).
// N est configurable par structure dans parametres.auto_archive_apres_jours.
//
// L'archivage ajoute "Auto-archivé le ..." aux notes du consentement.
// Le consentement reste consultable mais n'apparaît plus dans les listes actives.
//
// Notification : push à tous les membres + email DPO si configuré.
//
// Déploiement :
//   supabase functions deploy auto-archive-consents
//
// Programmation (Supabase SQL Editor, une seule fois) :
//   select cron.schedule(
//     'auto-archive-consents',
//     '0 4 1 * *',   -- le 1er du mois à 4h UTC
//     $$ select net.http_post(
//          url := 'https://VOTRE_PROJET.supabase.co/functions/v1/auto-archive-consents',
//          headers := jsonb_build_object('Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY')
//        ); $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Preview : combien va-t-on archiver (pour les logs et la notif)
    const { data: aArchiver, error: e1 } = await admin
      .from("v_consents_a_auto_archiver")
      .select("structure_id, collectivite_nom");
    if (e1) throw e1;

    if (!aArchiver || aArchiver.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun consentement à auto-archiver ce mois", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Comptage par structure pour les notifications
    const countByStructure: Record<string, { collectivite_nom: string; count: number }> = {};
    for (const item of aArchiver) {
      if (!countByStructure[item.structure_id]) {
        countByStructure[item.structure_id] = { collectivite_nom: item.collectivite_nom || "", count: 0 };
      }
      countByStructure[item.structure_id].count += 1;
    }

    // 2) Exécution de l'archivage via RPC
    const { data: results, error: e2 } = await admin.rpc("auto_archive_consents_expires");
    if (e2) throw e2;

    const totalArchives = (results || []).reduce((sum: number, r: any) => sum + (r.count_archives || 0), 0);

    // 3) Notification aux structures concernées (push uniquement, pas d'email pour ne pas
    //    saturer les DPO — ils ont déjà été notifiés des renouvellements à temps)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let pushSent = 0;
    const errors: string[] = [];

    for (const [structureId, info] of Object.entries(countByStructure)) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            structure_id: structureId,
            title: `${info.count} consentement${info.count > 1 ? "s" : ""} auto-archivé${info.count > 1 ? "s" : ""}`,
            body: `Maintenance mensuelle : ${info.count} consentement${info.count > 1 ? "s" : ""} expiré${info.count > 1 ? "s" : ""} depuis plus de 6 mois ${info.count > 1 ? "ont été" : "a été"} archivé${info.count > 1 ? "s" : ""} automatiquement.`,
            url: "/consentements?filter=archives",
            event_type: "consent_auto_archive",
            tag: "consent_auto_archive",
          }),
        });
        if (r.ok) pushSent += 1;
      } catch (e: any) {
        errors.push(`Push structure ${structureId}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_archives: totalArchives,
        structures_concernees: Object.keys(countByStructure).length,
        push_sent: pushSent,
        detail: results,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("auto-archive-consents error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
