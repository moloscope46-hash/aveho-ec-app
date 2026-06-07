// =============================================================
// supabase/functions/invite-user-magasin/index.ts
// Edge function Supabase pour envoyer un mail d'invitation
// avec branding MAGASIN custom (au lieu du mail Auth générique)
// =============================================================
// Déploiement :
//   supabase functions deploy invite-user-magasin
// Test :
//   curl -X POST https://<project>.supabase.co/functions/v1/invite-user-magasin \
//     -H "Authorization: Bearer <anon_key>" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"test@example.com","magasin_id":"...","invited_by":"..."}'
// =============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InvitePayload {
  email: string;
  magasin_id: string;
  invited_by?: string;       // user_id qui invite
  prenom?: string;
  nom?: string;
  telephone?: string;
  role_magasin?: string;     // chauffeur_livreur, technicien_sav, etc.
  types_di_geres?: string[]; // ["livraison", "transfert", ...]
  fonction_detail?: string;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: InvitePayload = await req.json();
    if (!payload.email || !payload.magasin_id) {
      return new Response(JSON.stringify({ error: "email + magasin_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Récupérer les infos du magasin pour le branding
    const { data: magasin } = await supabase
      .from("magasins")
      .select("id, nom, ville, structure_id, logo_url, couleur_primaire")
      .eq("id", payload.magasin_id)
      .single();

    if (!magasin) {
      return new Response(JSON.stringify({ error: "magasin introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Récupérer qui invite
    let inviteur = null;
    if (payload.invited_by) {
      const { data } = await supabase
        .from("membres_structure")
        .select("prenom, nom, email")
        .eq("user_id", payload.invited_by)
        .maybeSingle();
      inviteur = data;
    }

    // 3. Créer l'invitation en base
    const { data: invitation, error: invErr } = await supabase
      .from("invitations")
      .insert({
        structure_id: magasin.structure_id,
        email: payload.email.toLowerCase().trim(),
        prenom: payload.prenom || null,
        nom: payload.nom || null,
        telephone: payload.telephone || null,
        fonction_detail: payload.fonction_detail || null,
        magasin_fournisseur_id: payload.magasin_id,
        role_professionnel: "utilisateur_magasin",
        notes_admin: `[ROLE_MAGASIN:${payload.role_magasin || "chauffeur_livreur"}][TYPES_DI:${(payload.types_di_geres || []).join(",")}]`,
      })
      .select()
      .single();

    if (invErr) {
      console.error("[invite-user-magasin] insert error:", invErr);
      return new Response(JSON.stringify({ error: invErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Utilise l'API Auth Supabase pour envoyer un magic link
    const baseUrl = Deno.env.get("APP_URL") || "https://aveho-ec-app.vercel.app";
    const redirectTo = `${baseUrl}/auth/callback?invitation_id=${invitation.id}`;
    const couleurMag = magasin.couleur_primaire || "#5a8f8f";

    // 5. Génère le HTML avec branding magasin
    const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Quicksand', 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f4f7fa; color: #2a3a48; line-height: 1.6; }
  .header { background: linear-gradient(135deg, #142131 0%, ${couleurMag} 100%); color: #fff; padding: 30px 32px; border-radius: 16px 16px 0 0; }
  .logo { font-size: 26px; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px; }
  .logo .v { color: #7CC8C8; }
  h1 { font-size: 22px; font-weight: 700; margin: 8px 0 4px; }
  .body { background: #fff; padding: 28px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 2px 8px rgba(20,33,49,.08); }
  .magasin-card { background: ${couleurMag}11; border-left: 4px solid ${couleurMag}; padding: 14px 18px; border-radius: 8px; margin: 14px 0; }
  .magasin-card b { color: ${couleurMag}; }
  .cta { display: inline-block; padding: 14px 28px; background: ${couleurMag}; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 20px 0; }
  .footer { margin-top: 24px; padding-top: 18px; border-top: 1px solid #e3e9ee; font-size: 12px; color: #6c7a89; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">a<span class="v">v</span>eho</div>
    <h1>🏬 Invitation au magasin ${magasin.nom}</h1>
  </div>
  <div class="body">
    <p>Bonjour${payload.prenom ? ` ${payload.prenom}` : ""},</p>
    <p>${inviteur ? `<b>${inviteur.prenom || ""} ${inviteur.nom || ""}</b>` : "Un administrateur"} t'invite à rejoindre le magasin <b>${magasin.nom}</b>${magasin.ville ? ` (${magasin.ville})` : ""} sur la plateforme Aveho.</p>

    <div class="magasin-card">
      <div><b>🏬 Magasin :</b> ${magasin.nom}</div>
      ${magasin.ville ? `<div><b>📍 Ville :</b> ${magasin.ville}</div>` : ""}
      <div><b>🎓 Ton rôle :</b> ${payload.role_magasin || "Utilisateur magasin"}</div>
      ${payload.types_di_geres && payload.types_di_geres.length > 0 ? `<div><b>📦 Types DI gérés :</b> ${payload.types_di_geres.join(", ")}</div>` : ""}
    </div>

    <p>Click sur le bouton ci-dessous pour activer ton compte et te connecter :</p>
    <a href="${redirectTo}" class="cta">✓ Activer mon compte</a>

    <p style="font-size: 12px; color: #6c7a89;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br/>
    <code style="background: #f4f7fa; padding: 4px 8px; border-radius: 4px; font-size: 11px; word-break: break-all;">${redirectTo}</code></p>

    <div class="footer">
      <p>Aveho Espace Collectivité — Plateforme PSAD / FBM</p>
      <p>Si tu n'attendais pas cette invitation, tu peux ignorer ce mail.</p>
    </div>
  </div>
</body>
</html>`;

    // 6. Envoyer via Resend si configuré, sinon via Supabase Auth.admin.inviteUserByEmail
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    let emailError = null;

    if (resendKey) {
      // Préférence Resend (mail personnalisé)
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${magasin.nom} <noreply@aveho.fr>`,
            to: [payload.email],
            subject: `🏬 Invitation au magasin ${magasin.nom} sur Aveho`,
            html: htmlBody,
          }),
        });
        if (resp.ok) emailSent = true;
        else emailError = `Resend HTTP ${resp.status} : ${await resp.text()}`;
      } catch (e) { emailError = String(e); }
    }

    if (!emailSent) {
      // Fallback : Supabase Auth invite (mail générique)
      const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(payload.email, {
        data: { magasin_id: payload.magasin_id, invitation_id: invitation.id, role_magasin: payload.role_magasin },
        redirectTo,
      });
      if (authErr) emailError = (emailError ? emailError + " | " : "") + "Auth invite : " + authErr.message;
      else emailSent = true;
    }

    return new Response(JSON.stringify({
      ok: emailSent,
      invitation_id: invitation.id,
      email_sent_via: resendKey ? "resend_custom" : "supabase_auth_fallback",
      error: emailError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[invite-user-magasin] FATAL:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
