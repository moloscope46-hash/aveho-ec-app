// supabase/functions/send-notifications-queue/index.ts
// =============================================================
//  Edge Function — Traite la queue notifications_log
//  Envoie les emails via Resend API + push via web-push
//  À déclencher via cron Supabase (toutes les 1 min)
//
//  ENV requis :
//   - RESEND_API_KEY (https://resend.com)
//   - VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (npx web-push generate-vapid-keys)
//   - VAPID_SUBJECT = "mailto:contact@aveho.fr"
//
//  Déploiement :
//   supabase functions deploy send-notifications-queue
//   supabase secrets set RESEND_API_KEY=xxx VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=xxx
// =============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@aveho.fr";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EMAIL_TEMPLATE_WRAPPER = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:'Quicksand','Segoe UI',sans-serif;color:#142131;background:#f4f6f8;padding:0;margin:0}
.container{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(20,33,49,.10)}
.header{background:linear-gradient(135deg,#142131,#1c3548);padding:24px;text-align:center;color:#fff}
.logo{font-size:32px;font-weight:600;letter-spacing:3px}
.logo span{color:#7CC8C8}
.body{padding:28px 24px;font-size:14px;line-height:1.6}
.footer{background:#fafbfc;padding:14px 24px;font-size:11px;color:#8a98a8;text-align:center;border-top:1px solid #e3e9ee}
a.btn{display:inline-block;background:#5a8f8f;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:12px}
</style></head><body>
<div class="container">
  <div class="header"><div class="logo">a<span>v</span>eho</div></div>
  <div class="body">__CONTENT__</div>
  <div class="footer">Notification envoyée par Aveho · <a href="__PREFS_URL__" style="color:#5a8f8f">Préférences notifs</a></div>
</div>
</body></html>`;

serve(async (req) => {
  try {
    // 1. Récupère toutes les notifs en queue (non envoyées)
    const { data: queue, error } = await supabase
      .from("notifications_log")
      .select("*")
      .eq("envoye", false)
      .in("canal", ["email", "push"])
      .limit(100);

    if (error) throw error;
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    let sent = 0, failed = 0;
    for (const notif of queue) {
      try {
        if (notif.canal === "email" && RESEND_API_KEY) {
          const html = EMAIL_TEMPLATE_WRAPPER
            .replace("__CONTENT__", notif.corps || "")
            .replace("__PREFS_URL__", `${SUPABASE_URL.replace(".supabase.co", "")}.aveho.fr/parametres/notifications`);
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Aveho <noreply@aveho.fr>",
              to: notif.destinataire,
              subject: notif.sujet || "Notification Aveho",
              html,
            }),
          });
          if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
        }
        else if (notif.canal === "push" && VAPID_PUBLIC_KEY) {
          // Récupère la subscription du user
          const { data: prefs } = await supabase.from("notifications_preferences")
            .select("push_subscription")
            .eq("user_id", notif.user_id).maybeSingle();
          if (prefs?.push_subscription) {
            await webpush.sendNotification(prefs.push_subscription, JSON.stringify({
              title: notif.sujet || "Aveho",
              body: notif.corps?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
              url: "/notifications",
            }));
          }
        }
        // Marquer comme envoyé
        await supabase.from("notifications_log").update({
          envoye: true,
          envoye_at: new Date().toISOString(),
        }).eq("id", notif.id);
        sent++;
      } catch (e: any) {
        failed++;
        await supabase.from("notifications_log").update({
          erreur: e.message?.slice(0, 500) || "Erreur inconnue",
        }).eq("id", notif.id);
      }
    }

    return new Response(JSON.stringify({ processed: queue.length, sent, failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
