// Edge Function Supabase — Envoi de notifications push VAPID
// Déploiement : supabase functions deploy send-push
// Secrets requis :
//   VAPID_PUBLIC_KEY  (clé publique générée via `npx web-push generate-vapid-keys`)
//   VAPID_PRIVATE_KEY (clé privée correspondante)
//   VAPID_SUBJECT     (mailto:contact@example.com)
//   SUPABASE_SERVICE_ROLE_KEY
//
// Appel depuis l'app :
//   await supabase.functions.invoke("send-push", {
//     body: {
//       structure_id: "...",
//       title: "DI urgente",
//       body: "DI-1234 — Lit médicalisé en panne",
//       url: "/interventions",
//       target_user_id: "..." // optionnel : sinon broadcast à tous les membres
//     }
//   })

import * as webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@aveho.fr";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

import { buildCorsHeaders, authAndCheckStructure } from "../_shared/auth.ts";

// 0.57.31 : CORS restrictif via _shared/auth.ts

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Garde-fou : si pas de clés VAPID configurées, on log et on retourne succès silencieux
  // (l'app continue de marcher, juste sans envoyer de push)
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("send-push: VAPID keys non configurées, envoi ignoré");
    return new Response(JSON.stringify({ sent: 0, reason: "vapid_not_configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { structure_id, title, body, url, target_user_id, event_type, tag } = await req.json();
    if (!structure_id || !title || !body) {
      return new Response(JSON.stringify({ error: "structure_id, title et body requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 0.57.31 : auth + check membership structure_id (anti-spam push autres structures)
    const authResult = await authAndCheckStructure(req, structure_id);
    if (authResult.errorResponse) return authResult.errorResponse;
    const admin = authResult.admin!;

    // Récupérer les subscriptions cibles
    let q = admin.from("v_push_targets").select("*").eq("structure_id", structure_id);
    if (target_user_id) q = q.eq("user_id", target_user_id);
    const { data: targets, error } = await q;
    if (error) throw error;

    // Alpha 0.29.0 : filtrer selon les préférences notif de chaque utilisateur
    // Si event_type fourni : on appelle user_accepts_notif(user_id, event_type) pour chaque user
    // Si pas d'event_type : on envoie à tous (broadcast classique)
    let acceptedTargets = targets || [];
    let filteredCount = 0;
    if (event_type && acceptedTargets.length > 0) {
      const userIds = [...new Set(acceptedTargets.map((t: any) => t.user_id))];
      // Bulk fetch des préférences pour éviter N appels RPC
      const { data: prefsList } = await admin
        .from("user_notification_preferences")
        .select("user_id, prefs, quiet_hours")
        .in("user_id", userIds);

      const prefsByUser: Record<string, any> = {};
      (prefsList || []).forEach((p: any) => { prefsByUser[p.user_id] = p; });

      // Heure actuelle pour quiet hours
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      acceptedTargets = acceptedTargets.filter((t: any) => {
        const pref = prefsByUser[t.user_id];
        // Pas de pref enregistrée → accepte tout par défaut
        if (!pref) return true;
        // Pref explicite false pour ce type → refuse
        if (pref.prefs && event_type in pref.prefs && pref.prefs[event_type] === false) {
          filteredCount++;
          return false;
        }
        return true;
      });

      // Quiet hours : ajouter un marqueur "silent" dans le payload pour les users concernés
      // (on envoie quand même, mais le SW peut décider de ne pas faire de son)
      // Pour l'instant on log juste, l'app SW gère via les préférences silent du navigateur
    }

    // Alpha 0.20.0 : tag de groupement
    const groupTag = tag || event_type || "aveho-notif";

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/accueil",
      timestamp: Date.now(),
      tag: groupTag,
    });

    let sent = 0;
    let failed = 0;
    const failedEndpoints: string[] = [];

    for (const t of acceptedTargets) {
      const sub = {
        endpoint: t.endpoint,
        keys: { p256dh: t.p256dh, auth: t.auth_key },
      };
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
        // Mettre à jour last_used_at
        await admin.from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("endpoint", t.endpoint);
      } catch (e: any) {
        failed++;
        // Si l'endpoint est invalide (410 Gone / 404), on le supprime
        if (e.statusCode === 410 || e.statusCode === 404) {
          failedEndpoints.push(t.endpoint);
        }
        console.error("Push failed:", e.statusCode, e.body);
      }
    }

    // Nettoyer les subscriptions mortes
    if (failedEndpoints.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
    }

    return new Response(JSON.stringify({ sent, failed, cleaned: failedEndpoints.length, filtered: filteredCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
