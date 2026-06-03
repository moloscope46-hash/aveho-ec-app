// Edge Function Supabase — Envoi d'emails workflow via Resend
// Alpha 0.33.0
//
// Déploiement : supabase functions deploy send-email
// Secrets requis :
//   RESEND_API_KEY      (clé API Resend)
//   RESEND_FROM_EMAIL   (ex: "Aveho EC <no-reply@aveho.fr>")
//   SUPABASE_SERVICE_ROLE_KEY
//
// Appel depuis l'app :
//   await supabase.functions.invoke("send-email", {
//     body: {
//       structure_id: "...",
//       target_user_id: "..." OU target_emails: ["...", "..."],
//       event_type: "di",            // pour filtrage prefs
//       subject: "DI urgente assignée",
//       body_html: "<p>...</p>",     // HTML brut (sera enveloppé dans template)
//       body_text: "...",            // fallback texte
//       cta_label: "Voir la DI",     // optionnel
//       cta_url: "https://...",      // optionnel
//     }
//   })
//
// Le filtrage par préférences user est fait : on n'envoie qu'aux users
// qui ont coché "Recevoir aussi par email" pour ce type d'event.

import { buildCorsHeaders, authAndCheckStructure } from "../_shared/auth.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Aveho EC <no-reply@aveho.fr>";

// 0.57.31 : CORS restrictif via _shared/auth.ts
// (avant : Access-Control-Allow-Origin: "*" → appelable depuis n'importe quel site)

// Template HTML brandé Aveho (header navy, footer)
function wrapHtml({ subject, body_html, cta_label, cta_url }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fa;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2a3a48;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f7fa;padding:30px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(20,33,49,.08);">
        <!-- Header navy -->
        <tr><td style="background:linear-gradient(135deg,#142131 0%,#1e4a91 100%);padding:24px 30px;">
          <div style="color:#fff;font-size:24px;font-weight:600;letter-spacing:2px;line-height:1;">
            a<span style="color:#7CC8C8;">v</span>eho
          </div>
          <div style="color:#bfe6e6;font-size:12px;margin-top:4px;">
            Espace Collectivité
          </div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:30px;">
          <h1 style="margin:0 0 16px;color:#142131;font-size:20px;font-weight:600;">${subject}</h1>
          <div style="color:#2a3a48;font-size:14px;line-height:1.6;">
            ${body_html}
          </div>
          ${cta_url && cta_label ? `
          <div style="margin-top:24px;text-align:center;">
            <a href="${cta_url}" style="display:inline-block;background:#185FA5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              ${cta_label}
            </a>
          </div>
          ` : ""}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:18px 30px;background:#f4f7fa;border-top:1px solid #e3e9ee;font-size:11.5px;color:#8a98a8;text-align:center;line-height:1.5;">
          Cet email a été envoyé automatiquement par Aveho EC.<br>
          Tu peux désactiver les notifications email dans ton profil → <a href="https://app.aveho.fr/profil" style="color:#185FA5;text-decoration:none;">Mes notifications</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Mode dégradé : si Resend pas configuré, log + 200 OK
  if (!RESEND_KEY) {
    console.warn("send-email: RESEND_API_KEY non configurée, envoi ignoré");
    return new Response(JSON.stringify({ sent: 0, reason: "resend_not_configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      structure_id,
      target_user_id,
      target_emails,
      event_type,
      subject,
      body_html,
      body_text,
      cta_label,
      cta_url,
    } = body;

    if (!structure_id || !subject || (!body_html && !body_text)) {
      return new Response(JSON.stringify({ error: "structure_id, subject et body_html/body_text requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 0.57.31 : auth + check membership structure_id
    // → empêche un user d'une autre structure de broadcast au nom de structure_id
    const authResult = await authAndCheckStructure(req, structure_id);
    if (authResult.errorResponse) return authResult.errorResponse;
    const admin = authResult.admin!;

    // ----- Résolution des destinataires -----
    let recipients: { email: string; user_id: string | null }[] = [];

    // Cas 1 : target_emails fourni directement (ex: alerte DPO, externe)
    if (Array.isArray(target_emails) && target_emails.length > 0) {
      recipients = target_emails.filter(Boolean).map((e) => ({ email: e, user_id: null }));
    }
    // Cas 2 : target_user_id → résoudre l'email + check prefs
    else if (target_user_id) {
      const { data: user, error: uErr } = await admin
        .from("v_users_emails")
        .select("user_id, email")
        .eq("user_id", target_user_id)
        .maybeSingle();
      // Fallback : si la vue n'existe pas, on tape directement auth.users
      if (uErr || !user?.email) {
        const { data: au } = await admin.auth.admin.getUserById(target_user_id);
        if (au?.user?.email) {
          recipients.push({ email: au.user.email, user_id: target_user_id });
        }
      } else {
        recipients.push({ email: user.email, user_id: target_user_id });
      }
    }
    // Cas 3 : broadcast structure → tous les membres
    else {
      const { data: members } = await admin
        .from("membres_structure")
        .select("user_id")
        .eq("structure_id", structure_id);
      const userIds = (members || []).map((m: any) => m.user_id);
      for (const uid of userIds) {
        const { data: au } = await admin.auth.admin.getUserById(uid);
        if (au?.user?.email) {
          recipients.push({ email: au.user.email, user_id: uid });
        }
      }
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, filtered: 0, reason: "no_recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- Filtrage par préférences user (event_type) -----
    let filteredCount = 0;
    if (event_type && recipients.some((r) => r.user_id)) {
      const userIds = recipients.filter((r) => r.user_id).map((r) => r.user_id as string);
      const { data: prefsList } = await admin
        .from("user_notification_preferences")
        .select("user_id, prefs")
        .in("user_id", userIds);

      const prefsByUser: Record<string, any> = {};
      (prefsList || []).forEach((p: any) => { prefsByUser[p.user_id] = p; });

      recipients = recipients.filter((r) => {
        if (!r.user_id) return true; // emails externes : toujours envoyer
        const pref = prefsByUser[r.user_id];
        if (!pref?.prefs) return true; // pas de pref → reçoit tout par défaut
        // Pref explicite : on cherche "email_{event_type}" (séparé du push)
        const emailKey = `email_${event_type}`;
        if (emailKey in pref.prefs) {
          if (pref.prefs[emailKey] === false) {
            filteredCount++;
            return false;
          }
          return true;
        }
        // Si pas de pref email_X explicite → DÉSACTIVÉ par défaut
        // (l'email est plus intrusif que le push, on opt-in, pas opt-out)
        filteredCount++;
        return false;
      });
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, filtered: filteredCount, reason: "all_filtered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- Construction du HTML enveloppé -----
    const html = wrapHtml({ subject, body_html: body_html || `<p>${body_text}</p>`, cta_label, cta_url });
    const text = body_text || subject;

    // ----- Envoi via Resend (1 appel par destinataire pour éviter le rate limit batch) -----
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [r.email],
            subject,
            html,
            text,
          }),
        });
        if (resendRes.ok) {
          sent++;
        } else {
          failed++;
          const txt = await resendRes.text();
          errors.push(`${r.email}: ${resendRes.status} ${txt.slice(0, 200)}`);
        }
      } catch (e: any) {
        failed++;
        errors.push(`${r.email}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ sent, failed, filtered: filteredCount, errors: errors.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
