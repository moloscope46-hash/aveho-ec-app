// Edge Function : send-renouvellement-rappels (Alpha 0.23.0)
//
// Fonction à déployer dans Supabase et à appeler une fois par jour
// (via pg_cron, comme maintenance-daily-cron).
//
// Rôle :
// Pour chaque consentement de la vue v_consents_a_notifier :
//   - envoyer un push notif à tous les membres de la structure
//   - envoyer un webhook Teams/Slack si configurés
//   - envoyer un email au DPO si structures.parametres.dpo_email défini
//   - marquer notification_30j_envoyee = true pour ne pas spammer
//
// Déploiement :
//   supabase functions deploy send-renouvellement-rappels
//
// Programmation (Supabase SQL Editor, une seule fois) :
//   select cron.schedule(
//     'send-renouvellement-rappels',
//     '0 7 * * *',   -- tous les jours à 7h UTC (9h Paris)
//     $$ select net.http_post(
//          url := 'https://VOTRE_PROJET.supabase.co/functions/v1/send-renouvellement-rappels',
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

    // 1) Lire les consentements à notifier
    const { data: consents, error: e1 } = await admin
      .from("v_consents_a_notifier")
      .select("*");
    if (e1) throw e1;

    if (!consents || consents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun consentement à notifier aujourd'hui", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Grouper par structure pour optimiser (1 notif par structure avec compteur)
    const byStructure: Record<string, any[]> = {};
    for (const c of consents) {
      if (!byStructure[c.structure_id]) byStructure[c.structure_id] = [];
      byStructure[c.structure_id].push(c);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let totalPushSent = 0;
    let totalEmailsSent = 0;
    let totalWebhooks = 0;
    const errors: string[] = [];

    for (const [structureId, items] of Object.entries(byStructure)) {
      const n = items.length;
      const first = items[0];

      // Construit message clair selon nombre
      const title = `${n} consentement${n > 1 ? "s" : ""} à renouveler`;
      const body = n === 1
        ? `Le consentement de ${first.patient_nom_prenom} expire le ${formatDate(first.date_expiration)} (dans ${first.jours_restants} jour${first.jours_restants > 1 ? "s" : ""}).`
        : `${n} patients ont un consentement expirant dans les 30 prochains jours. Voir la liste.`;

      // a) Push à tous les membres de la structure
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            structure_id: structureId,
            title,
            body,
            url: "/consentements?filter=a_renouveler",
            event_type: "consent_a_renouveler",
            tag: "consent_a_renouveler",
          }),
        });
        if (r.ok) totalPushSent += 1;
        else errors.push(`Push structure ${structureId}: ${r.status}`);
      } catch (e: any) {
        errors.push(`Push structure ${structureId}: ${e.message}`);
      }

      // b) Webhook Teams/Slack si configuré
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/send-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            structure_id: structureId,
            title,
            message: body,
            event_type: "consent_a_renouveler",
            url: "/consentements?filter=a_renouveler",
          }),
        });
        if (r.ok) totalWebhooks += 1;
      } catch {
        // Webhook optionnel, on ignore les erreurs silencieuses
      }

      // c) Email au DPO si configuré
      const dpoEmail = first.dpo_email;
      if (dpoEmail) {
        try {
          const subject = `[Aveho RGPD] ${n} consentement${n > 1 ? "s" : ""} à renouveler — ${first.collectivite_nom}`;
          const html = buildEmailHtml({
            title,
            collectiviteNom: first.collectivite_nom,
            count: n,
            items,
            link: `${Deno.env.get("APP_BASE_URL") || "https://aveho-ec.vercel.app"}/consentements?filter=a_renouveler`,
          });

          // Alpha 0.24.0 : envoi via Resend API
          // Configuration : secret RESEND_API_KEY + secret RESEND_FROM_EMAIL
          // Si pas configuré, on log et on continue (mode dégradé).
          const resendKey = Deno.env.get("RESEND_API_KEY");
          const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Aveho RGPD <rgpd@aveho.fr>";

          if (resendKey) {
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [dpoEmail],
                subject,
                html,
                // Tags Resend pour analytics
                tags: [
                  { name: "type", value: "consent_renouvellement" },
                  { name: "structure_id", value: structureId },
                ],
              }),
            });
            if (resendRes.ok) {
              totalEmailsSent += 1;
            } else {
              const errBody = await resendRes.text();
              errors.push(`Resend ${dpoEmail}: ${resendRes.status} ${errBody.slice(0, 200)}`);
            }
          } else {
            // Mode dégradé : pas de clé Resend → log uniquement
            console.warn(`[Resend non configuré] Email DPO à envoyer à ${dpoEmail} : ${subject}`);
            errors.push(`Resend non configuré (RESEND_API_KEY manquante) — email vers ${dpoEmail} non envoyé`);
          }
        } catch (e: any) {
          errors.push(`Email DPO ${structureId}: ${e.message}`);
        }
      }
    }

    // 3) Marquer tous les consentements comme notifiés
    const allIds = consents.map((c: any) => c.id);
    if (allIds.length > 0) {
      const { error: e2 } = await admin.rpc("mark_consent_notified", { consent_ids: allIds });
      if (e2) errors.push(`mark_notified: ${e2.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: consents.length,
        structures: Object.keys(byStructure).length,
        push_sent: totalPushSent,
        webhooks_sent: totalWebhooks,
        emails_sent: totalEmailsSent,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-renouvellement-rappels error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatDate(d: string | Date): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR");
}

function buildEmailHtml(opts: {
  title: string;
  collectiviteNom: string;
  count: number;
  items: any[];
  link: string;
}): string {
  const itemsHtml = opts.items
    .map(
      (c) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eef2f5"><b>${escapeHtml(c.patient_nom_prenom)}</b></td><td style="padding:8px 12px;border-bottom:1px solid #eef2f5">${formatDate(c.date_expiration)}</td><td style="padding:8px 12px;border-bottom:1px solid #eef2f5;color:${c.jours_restants <= 7 ? "#c0392b" : "#EF9F27"}">dans ${c.jours_restants} j</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Segoe UI,Helvetica,sans-serif;max-width:640px;margin:30px auto;padding:0 24px;color:#142131;line-height:1.5">
  <div style="background:linear-gradient(135deg,#142131,#1e4a91);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
    <div style="font-size:22px;font-weight:600;letter-spacing:1px">a<span style="color:#7CC8C8">v</span>eho</div>
    <div style="font-size:11px;letter-spacing:2px;color:#bfe6e6;margin-top:4px">RAPPEL DPO — RENOUVELLEMENT RGPD</div>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e3e9ee;border-top:none;border-radius:0 0 12px 12px">
    <h2 style="margin-top:0;color:#142131">${escapeHtml(opts.title)}</h2>
    <p>Bonjour,</p>
    <p>Conformément à la politique de renouvellement RGPD de <b>${escapeHtml(opts.collectiviteNom)}</b>, <b>${opts.count}</b> consentement${opts.count > 1 ? "s" : ""} approchent de leur échéance dans les 30 prochains jours.</p>
    <p>Il est recommandé de prendre contact avec les patients concernés pour procéder à un renouvellement de leur consentement.</p>
    <h3 style="color:#185FA5;margin-top:24px">Liste des renouvellements</h3>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead><tr style="background:#f4f7fa">
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e3e9ee">Patient</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e3e9ee">Expire le</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #e3e9ee">Échéance</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:24px;text-align:center">
      <a href="${opts.link}" style="display:inline-block;background:#185FA5;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir dans Aveho</a>
    </div>
    <p style="font-size:11px;color:#8a98a8;margin-top:32px;padding-top:16px;border-top:1px solid #eef2f5">
      Email automatique généré par le système Aveho EC. Cette notification a été envoyée car votre email est configuré comme DPO dans les paramètres de la collectivité.
      <br>Pour ne plus recevoir ces rappels, modifiez le champ <i>dpo_email</i> dans <i>Paramètres → RGPD</i> de votre Espace Collectivité.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
