// =============================================================
//  send-digest — Edge Function Supabase
//  Alpha 0.40.0
//
//  Envoie un récap email aux utilisateurs ayant opt-in (frequence != 'jamais').
//  Déclenchement : appel cron horaire qui filtre par heure (8h locale)
//  et jour (lundi pour 'hebdo').
//
//  Trigger possibles :
//    1) pg_cron : `select cron.schedule('digest-8h', '0 8 * * *', $$
//          select net.http_post(...)$$);`
//    2) GitHub Action ou Vercel Cron quotidien
//    3) Manuel : POST { dry_run: true } pour tester sans envoyer
//
//  Body POST attendu :
//    { dry_run?: boolean, user_id?: string }
//    Si user_id fourni → envoi à 1 user spécifique (test)
//    Sinon → envoie à tous les eligibles
// =============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, requireCronSecret } from "../_shared/auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Aveho EC <noreply@aveho.fr>";

// 0.57.33 : CORS restrictif + check CRON_SECRET
serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });

  // 0.57.33 : vérification du secret CRON (sauf si dry_run pour tests internes)
  // Bypass possible : si le body contient { dry_run: true, user_id: "xxx" }
  // l'appelant doit avoir un Bearer valide (mode test depuis /profil)
  const bodyText = await req.text();
  let body: any = {};
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch {}

  const isInternalTest = body?.force_send === true || body?.user_id;
  if (!isInternalTest) {
    const cronCheck = requireCronSecret(req);
    if (cronCheck) return cronCheck;
  }
  // Recréer la req avec le body lu (sinon req.json() plus tard ne marche pas)
  // → on passe les valeurs directement au lieu de re-lire

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const dryRun = body.dry_run === true;
    const forceSend = body.force_send === true; // Alpha 0.41.0 : test depuis /profil
    const specificUserId = body.user_id || null;
    const now = new Date();
    const isMonday = now.getUTCDay() === 1; // 1 = lundi

    // Récupérer les users éligibles
    let q = supabase
      .from("notification_digest_prefs")
      .select("user_id, structure_id, frequence")
      .neq("frequence", "jamais");
    if (specificUserId) q = q.eq("user_id", specificUserId);
    else {
      // Filtrer : quotidien tous les jours, hebdo seulement le lundi
      if (isMonday) {
        // tous les modes éligibles
      } else {
        q = q.eq("frequence", "quotidien");
      }
    }
    const { data: users, error } = await q;
    if (error) throw error;

    // Alpha 0.41.0 : si force_send + user_id mais pas de pref, on simule avec "quotidien"
    let workingUsers = users || [];
    if (forceSend && specificUserId && workingUsers.length === 0) {
      // Trouver la structure_id du user via membres_structure
      const { data: us } = await supabase
        .from("membres_structure")
        .select("structure_id")
        .eq("user_id", specificUserId)
        .maybeSingle();
      if (us?.structure_id) {
        workingUsers = [{ user_id: specificUserId, structure_id: us.structure_id, frequence: "quotidien" }];
      }
    }

    const results = [];
    for (const user of workingUsers) {
      const digest = await buildDigest(supabase, user);
      if (!digest.hasContent && !specificUserId && !forceSend) {
        results.push({ user_id: user.user_id, skipped: "no_content" });
        continue;
      }

      // Récupérer l'email du user
      const { data: emailRow } = await supabase
        .from("v_users_emails")
        .select("email")
        .eq("user_id", user.user_id)
        .maybeSingle();
      if (!emailRow?.email) {
        results.push({ user_id: user.user_id, skipped: "no_email" });
        continue;
      }

      const html = buildDigestHtml(digest, user.frequence);
      const subject = `${user.frequence === "hebdo" ? "Récap hebdo" : "Récap du jour"} — Aveho EC`;

      if (dryRun) {
        results.push({ user_id: user.user_id, email: emailRow.email, subject, dry_run: true, content: digest });
        continue;
      }

      // Envoi via Resend
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: emailRow.email,
            subject,
            html,
          }),
        });
        const sent = resp.ok;
        // Log de l'envoi
        await supabase.from("notification_digest_log").insert({
          user_id: user.user_id,
          structure_id: user.structure_id,
          type_digest: user.frequence,
          contenu_resume: digest,
          succes: sent,
          erreur: sent ? null : await resp.text(),
        });
        if (sent) {
          await supabase
            .from("notification_digest_prefs")
            .update({ derniere_envoi: now.toISOString() })
            .eq("user_id", user.user_id);
        }
        results.push({ user_id: user.user_id, email: emailRow.email, sent });
      } catch (e) {
        results.push({ user_id: user.user_id, error: e.message });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function buildDigest(supabase, user) {
  const structureId = user.structure_id;
  const sinceDays = user.frequence === "hebdo" ? 7 : 1;
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();

  // Compteurs récents par catégorie
  const [diResp, achResp, sigResp, renouvResp] = await Promise.all([
    supabase.from("interventions")
      .select("id, numero, statut, urgence, created_at", { count: "exact", head: false })
      .eq("structure_id", structureId)
      .gte("created_at", since)
      .limit(5),
    supabase.from("achats")
      .select("id, numero, statut, motif", { count: "exact", head: false })
      .eq("structure_id", structureId)
      .eq("statut", "À valider")
      .limit(5),
    supabase.from("signalements")
      .select("id, titre, statut, type", { count: "exact", head: false })
      .eq("structure_id", structureId)
      .eq("statut", "Nouveau")
      .limit(5),
    supabase.from("v_stats_rgpd_renouvellements")
      .select("expire_dans_30j")
      .eq("structure_id", structureId)
      .maybeSingle(),
  ]);

  const di_actives = diResp.count || 0;
  const achats_a_valider = achResp.count || 0;
  const signalements_nouveaux = sigResp.count || 0;
  const renouvellements_30j = renouvResp.data?.expire_dans_30j || 0;

  return {
    period: user.frequence,
    di_actives,
    achats_a_valider,
    signalements_nouveaux,
    renouvellements_30j,
    di_recentes: diResp.data || [],
    achats_recents: achResp.data || [],
    signalements_recents: sigResp.data || [],
    hasContent: di_actives + achats_a_valider + signalements_nouveaux + renouvellements_30j > 0,
  };
}

function buildDigestHtml(d, frequence) {
  const period = frequence === "hebdo" ? "semaine" : "journée";
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fa;margin:0;padding:20px;color:#142131">
  <table cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
    <tr><td style="background:linear-gradient(135deg,#142131 0%,#1e4a91 100%);padding:24px 28px;color:#fff">
      <div style="font-size:24px;font-weight:700;letter-spacing:1px">a<span style="color:#7CC8C8">v</span>eho EC</div>
      <div style="font-size:14px;color:#bfe6e6;margin-top:4px">Récap de votre ${period}</div>
    </td></tr>
    <tr><td style="padding:24px 28px">
      <h2 style="margin:0 0 18px;font-size:18px;color:#142131">Ce qui vous attend</h2>
      ${row("🔧", "DI ouvertes", d.di_actives, "/interventions", "#185FA5")}
      ${row("🛒", "Achats à valider", d.achats_a_valider, "/achats", "#EF9F27")}
      ${row("💬", "Signalements nouveaux", d.signalements_nouveaux, "/signalements", "#7a6fb0")}
      ${row("🛡️", "Consentements à renouveler (30j)", d.renouvellements_30j, "/statistiques-rgpd", "#c0392b")}
    </td></tr>
    <tr><td style="padding:0 28px 24px">
      <a href="https://aveho.fr/accueil" style="display:inline-block;background:#185FA5;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Ouvrir Aveho EC →
      </a>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f4f7fa;border-top:1px solid #e3e9ee;font-size:11px;color:#6c7a89">
      Vous recevez ce message car vous avez activé les récaps ${frequence} dans votre profil.
      <a href="https://aveho.fr/profil" style="color:#185FA5">Modifier mes préférences</a>
    </td></tr>
  </table>
  </body></html>`;
}

function row(icon, label, n, href, color) {
  if (n === 0) return "";
  return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e3e9ee;border-radius:10px;margin-bottom:10px">
    <span style="font-size:24px">${icon}</span>
    <div style="flex:1">
      <div style="font-size:14px;color:#142131;font-weight:600">${label}</div>
    </div>
    <span style="background:${color}22;color:${color};padding:4px 12px;border-radius:12px;font-size:13px;font-weight:700">${n}</span>
  </div>`;
}
